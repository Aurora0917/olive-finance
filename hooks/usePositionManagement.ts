import { useState, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { OptionContract } from "@/lib/idl/option_contract";
import { Position } from "@/lib/data/Positions";
import { Transaction, FuturePos } from "@/lib/data/WalletActivity";
import { PDAs } from "@/utils/pdas";
import { format } from "date-fns";
import { formatDate } from "@/lib/data/WalletActivity";
import { coins } from "@/lib/data/coins";
import {
  USDC_DECIMALS,
  USDC_MINT,
  WSOL_DECIMALS,
  WSOL_MINT,
} from "@/utils/const";
import { ExpiredOption } from "@/types/contractTypes";
import { PythPriceState } from "./usePythPrice";

/**
 * Hook for managing position data and operations
 */
export const usePositionManagement = (
  program: Program<OptionContract> | undefined,
  publicKey: PublicKey | null,
  priceData: PythPriceState
) => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [expiredPositions, setExpiredPositions] = useState<ExpiredOption[]>([]);
  const [donePositions, setDonePositions] = useState<Transaction[]>([]);
  const [perpPositions, setPerpPositions] = useState<FuturePos[]>([]);
  const [positionsLoading, setPositionsLoading] = useState<boolean>(false);

  // Token list for perp positions
  const tokenList = [
    {
      name: "Solana",
      symbol: "SOL",
      iconPath: "/images/solana.png",
    },
  ];

  /**
   * Fetches perpetual positions for the user
   */
  const getPerpPositions = useCallback(async (
    program: Program<OptionContract>,
    publicKey: PublicKey
  ): Promise<FuturePos[]> => {
    const perpPositions: FuturePos[] = [];

    const pool = PDAs.getPool("SOL/USDC", program.programId);
    const userPDA = PDAs.getUser(publicKey, program.programId);

    try {
      // Get user info to know how many perp positions they have
      const userInfo = await program.account.user.fetch(userPDA).catch(() => null);

      if (!userInfo || userInfo.perpPositionCount.toNumber() === 0) {
        return [];
      }

      const perpPositionCount = userInfo.perpPositionCount.toNumber();
      console.log(`User has ${perpPositionCount} perp positions`);

      // Fetch all perp position accounts for this user
      const userPerpAccounts = await program.account.position.all([
        {
          memcmp: {
            offset: 8, // Skip discriminator to get to owner field
            bytes: publicKey.toBase58(),
          },
        },
      ]);

      console.log(`Found ${userPerpAccounts.length} perp accounts for user`);

      // Get current SOL price for PnL calculation
      const currentPrice = priceData.price || 0;

      for (const perpAccount of userPerpAccounts) {
        try {
          const position = perpAccount.account;

          if (!position || position.isLiquidated) {
            continue; // Skip liquidated positions
          }

          // Calculate position size in SOL (convert from USD using price)
          const positionSizeUSD = position.sizeUsd.toNumber();
          const collateralUSD = position.collateralUsd.toNumber();

          // Calculate unrealized PnL
          const entryPrice = position.price;
          const liquidationPrice = position.liquidationPrice;

          let unrealizedPnl = 0;
          if (currentPrice > 0) {
            const isLong = position.side.hasOwnProperty("long");
            const priceDiff = isLong
              ? currentPrice - entryPrice  // Long: profit when price goes up
              : entryPrice - currentPrice; // Short: profit when price goes down

            const pnlRatio = priceDiff / entryPrice;
            unrealizedPnl = pnlRatio * positionSizeUSD;
          }

          // Calculate TPSL (Take Profit / Stop Loss) - simplified version
          let tpsl = liquidationPrice; // Default to liquidation price

          if (position.side.hasOwnProperty("long")) {
            // Long position: TP is higher than entry
            const buffer = entryPrice - liquidationPrice;
            tpsl = entryPrice + (buffer * 2);
          } else {
            // Short position: TP is lower than entry
            const buffer = liquidationPrice - entryPrice;
            tpsl = entryPrice - (buffer * 2);
          }

          // Convert timestamps
          const purchaseDate = new Date(position.openTime.toNumber() * 1000);
          const formattedPurchaseDate = format(purchaseDate, 'dd MMM, yyyy HH:mm:ss');

          // Create the position object
          const futurePos: FuturePos = {
            index: position.index,
            token: (tokenList.find(t => t.symbol === 'SOL') || tokenList[0]) as any,
            symbol: 'SOL',
            futureType: 'perps',
            position: position.side.hasOwnProperty("long") ? "long" : "short",
            entryPrice: Number(entryPrice.toFixed(2)),
            LiqPrice: Number(liquidationPrice.toFixed(2)),
            size: Number(positionSizeUSD.toFixed(6)),
            collateral: Number(collateralUSD.toFixed(2)),
            TPSL: Number(tpsl.toFixed(2)),
            logo: '/images/solana.png',
            leverage: Number((positionSizeUSD / collateralUSD).toFixed(2)),
            purchaseDate: formattedPurchaseDate,
            // Additional fields for debugging/tracking
            unrealizedPnl: Number(unrealizedPnl.toFixed(2)),
            marginRatio: Number((100 / (positionSizeUSD / collateralUSD)).toFixed(2)),
            accountAddress: perpAccount.publicKey.toBase58(),
          };

          perpPositions.push(futurePos);

        } catch (e) {
          console.log(`Error processing perp position ${perpAccount.publicKey.toBase58()}:`, e);
          continue;
        }
      }

      console.log(`Successfully processed ${perpPositions.length} perp positions`);
      return perpPositions;

    } catch (error) {
      console.error("Error fetching perp positions:", error);
      return [];
    }
  }, [priceData.price, tokenList]);

  /**
   * Fetches option details for the user
   */
  const getDetailInfos = useCallback(async (
    program: Program<OptionContract>,
    publicKey: PublicKey
  ): Promise<[Position[], ExpiredOption[], Transaction[]]> => {
    const pinfo: Position[] = [];
    const expiredpinfo: ExpiredOption[] = [];
    const doneInfo: Transaction[] = [];

    const pool = PDAs.getPool("SOL/USDC", program.programId);
    const solCustody = PDAs.getCustody(pool, WSOL_MINT, program.programId);
    const usdcCustody = PDAs.getCustody(pool, USDC_MINT, program.programId);
    const userPDA = PDAs.getUser(publicKey, program.programId);

    const userInfo = await program.account.user.fetch(userPDA).catch((e) => {
      return null;
    });

    if (!userInfo) return [[], [], []];
    const optionIndex = userInfo.optionIndex.toNumber();

    if (optionIndex == 0) return [[], [], []];

    try {
      // Fetch all option details for the current user
      const userOptionAccounts = await program.account.optionDetail.all([
        {
          memcmp: {
            offset: 8 + 8, // Skip discriminator (8 bytes) + index (8 bytes) to get to owner field
            bytes: publicKey.toBase58(), // Filter by user's public key
          },
        },
        {
          dataSize: 292
        }
      ]);

      console.log(`Found ${userOptionAccounts.length} option accounts for user`);

      for (const optionAccount of userOptionAccounts) {
        try {
          const detail = optionAccount.account;
          const optionDetailAccount = optionAccount.publicKey;

          if (!detail) continue;

          // 1. Option type is determined by what's locked by the protocol
          const isCallOption = detail.lockedAsset.equals(solCustody);   // SOL locked = Call
          const isPutOption = detail.lockedAsset.equals(usdcCustody);   // USDC locked = Put
          const optionType = isCallOption ? "Call" : "Put";

          // 2. Token/symbol/logo is determined by what the USER PAID (premiumAsset)
          const token = "SOL";
          const symbol = "SOL";
          const logo = "/images/solana.png";

          // 3. Size calculation based on what was locked by protocol
          let optionSize;
          const isPremiumSOL = detail.premiumAsset.equals(solCustody);
          if (isCallOption) {
            // Call: locked SOL amount represents the option size
            optionSize = detail.amount.toNumber() / (10 ** (isPremiumSOL ? WSOL_DECIMALS : USDC_DECIMALS));
          } else {
            // Put: locked USDC amount, convert to SOL equivalent using strike
            const usdcAmount = detail.amount.toNumber() / (10 ** USDC_DECIMALS);
            optionSize = detail.strikePrice > 0 ? usdcAmount / detail.strikePrice : 0;
          }

          // 4. PnL calculation (always based on SOL price movement)
          const currentPrice = priceData.price || 0;
          const strikePrice = detail.strikePrice || 0;

          let pnl;
          if (isCallOption) {
            // Call PnL: profit when current price > strike price
            pnl = currentPrice - strikePrice;
          } else {
            // Put PnL: profit when current price < strike price  
            pnl = strikePrice - currentPrice;
          }

          if (
            detail?.expiredDate.toNumber() > Math.round(Date.now() / 1000) &&
            detail?.valid
          ) {
            // Active options
            pinfo.push({
              index: detail.index.toNumber(),
              token: token,
              logo: logo,
              symbol: symbol,
              strikePrice: strikePrice,
              type: optionType,
              expiry: new Date(detail.expiredDate.toNumber() * 1000).toString(),
              size: detail.amount.toNumber() / (10 ** (isPremiumSOL ? WSOL_DECIMALS : USDC_DECIMALS)),
              pnl: pnl,
              entryPrice: detail.entryPrice,
              executed: detail.executed,
              quantity: detail.quantity,
              purchaseDate: new Date(detail.purchaseDate * 1000).toString(),
              limitPrice: detail.limitPrice ? detail.limitPrice / 100.0 : 0,
              greeks: {
                delta: 0.6821,
                gamma: 0.0415,
                theta: -0.2113,
                vega: 0.0619,
              },
            });
          } else if (
            detail?.expiredDate.toNumber() < Math.round(Date.now() / 1000) &&
            detail?.claimed != 0
          ) {
            expiredpinfo.push({
              index: detail.index.toNumber(),
              token: token,
              iconPath: logo,
              symbol: symbol,
              strikePrice: strikePrice,
              qty: detail.quantity,
              expiryPrice: 0,
              transaction: optionType,
              tokenAmount: optionSize,
              dollarAmount: detail.profit,
            });
          } else {
            // Exercised/closed options
            doneInfo.push({
              transactionID: `SOL-${formatDate(
                new Date(detail.exercised * 1000)
              )}-${strikePrice}-${optionType.charAt(0)}`,
              token: coins[0],
              transactionType: optionType,
              qty: detail.quantity,
              optionType: "American",
              strikePrice: strikePrice,
              expiry: format(new Date(detail.expiredDate.toNumber() * 1000), "dd MMM, yyyy HH:mm:ss"),
              timestamp: detail.exercised != "0" ? detail.exercised * 1000 : detail.purchaseDate * 1000
            });
          }
        } catch (e) {
          console.log(`Error processing option account ${optionAccount.publicKey.toBase58()}:`, e);
          continue;
        }
      }
    } catch (error) {
      console.error("Error fetching option details:", error);
    }

    console.log("Final results:", {
      activeOptions: pinfo.length,
      expiredOptions: expiredpinfo.length,
      doneOptions: doneInfo.length
    });

    return [pinfo, expiredpinfo, doneInfo];
  }, [priceData.price]);

  /**
   * Refreshes all positions (options and perps)
   */
  const refreshPositions = useCallback(async () => {
    if (program && publicKey) {
      setPositionsLoading(true);
      try {
        console.log("Refreshing positions");
        
        // Fetch both options and perp positions
        const [pinfo, expiredpinfo, doneinfo] = await getDetailInfos(program, publicKey);
        const perpPos = await getPerpPositions(program, publicKey);

        setPositions(pinfo);
        setExpiredPositions(expiredpinfo);
        setDonePositions(doneinfo);
        setPerpPositions(perpPos);

        console.log(`Loaded ${pinfo.length} options, ${perpPos.length} perp positions`);
      } catch (error) {
        console.error("Error refreshing positions:", error);
      } finally {
        setPositionsLoading(false);
      }
    }
  }, [program, publicKey, getDetailInfos, getPerpPositions]);

  /**
   * Refreshes only perpetual positions
   */
  const refreshPerpPositions = useCallback(async () => {
    if (program && publicKey) {
      try {
        const perpPos = await getPerpPositions(program, publicKey);
        setPerpPositions(perpPos);
        console.log(`Refreshed ${perpPos.length} perp positions`);
      } catch (error) {
        console.error("Error refreshing perp positions:", error);
      }
    }
  }, [program, publicKey, getPerpPositions]);

  return {
    positions,
    expiredPositions,
    donePositions,
    perpPositions,
    positionsLoading,
    setPositions,
    setExpiredPositions,
    setDonePositions,
    setPerpPositions,
    setPositionsLoading,
    refreshPositions,
    refreshPerpPositions,
    getDetailInfos,
    getPerpPositions,
  };
};