/* eslint-disable @typescript-eslint/no-unsafe-function-type */
"use client";

import { getPythPrice, usePythPrice } from "@/hooks/usePythPrice";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import {
  AnchorProvider,
  BN,
  getProvider,
  Program,
  Provider,
} from "@coral-xyz/anchor";
import { Position } from "@/lib/data/Positions";
import { formatDate, Transaction, FuturePos } from "@/lib/data/WalletActivity";
import { coins } from "@/lib/data/coins";
import { format } from "date-fns";
import { OptionContract } from "@/lib/idl/option_contract";
import * as idl from "../lib/idl/option_contract.json";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import {
  USDC_DECIMALS,
  USDC_MINT,
  USDC_ORACLE,
  WSOL_DECIMALS,
  WSOL_MINT,
  WSOL_ORACLE,
} from "@/utils/const";

import { OptionDetailUtils } from "@/utils/optionsPricing";
import { Token } from "@/lib/data/tokenlist";

interface PoolUtilization {
  tokenLocked: number;
  tokenOwned: number;
  utilizationPercent: number;
  borrowRate: number;
}

interface PoolData {
  sol: PoolUtilization;
  usdc: PoolUtilization;
  lastUpdated: number;
}

interface VolumeData {
  volume24h: number;           // Total USD volume in last 24h
  callCount: number;           // Active call options count
  putCount: number;            // Active put options count
  callCount24h: number;        // Call options created in last 24h
  putCount24h: number;         // Put options created in last 24h
  optionVolume24h: number;     // Option premiums volume in last 24h
  perpVolume24h: number;       // Perp position volume in last 24h
  lastUpdated: number;
}

interface ContractContextType {
  program: Program<OptionContract> | undefined;
  pub: PublicKey | undefined;
  getCustodies: Function;
  getDetailInfos: Function;
  onOpenLimitOption: Function;
  onCloseLimitOption: Function;
  onOpenOption: Function;
  onEditOption: Function;
  onCloseOption: Function;
  onClaimOption: Function;
  onExerciseOption: Function;
  onOpenPerp: Function;
  onClosePerp: Function,
  onAddCollateral: Function,
  onRemoveCollateral: Function,
  onAddLiquidity: Function;
  onRemoveLiquidity: Function;
  getOptionDetailAccount: Function;
  getPoolFees: () => Promise<{
    ratioMultiplier: string;
    addLiquidityFee: string;
    removeLiquidityFee: string;
  } | null>;
  positions: Position[];
  expiredPositions: ExpiredOption[];
  donePositions: Transaction[];
  perpPositions: FuturePos[];
  refreshPositions: () => Promise<void>;
  refreshPerpPositions: () => Promise<void>;
  positionsLoading: boolean;
  poolData: PoolData | null;
  getPoolUtilization: (asset: "SOL" | "USDC") => PoolUtilization | null;
  volumeData: VolumeData | null;
  getVolumeData: () => VolumeData | null;
  refreshVolumeData: () => Promise<void>;
}

export const ContractContext = createContext<ContractContextType>({
  program: undefined,
  pub: undefined,
  getCustodies: () => { },
  getDetailInfos: () => { },
  onOpenLimitOption: async () => { },
  onCloseLimitOption: () => { },
  onOpenOption: async () => { },
  onEditOption: async () => { },
  onCloseOption: () => { },
  onClaimOption: () => { },
  onExerciseOption: () => { },
  onOpenPerp: async () => { },
  onClosePerp: async () => { },
  onAddCollateral: async () => { },
  onRemoveCollateral: async () => { },
  onAddLiquidity: () => { },
  onRemoveLiquidity: () => { },
  getOptionDetailAccount: () => { },
  getPoolFees: async () => null,
  positions: [],
  expiredPositions: [],
  donePositions: [],
  perpPositions: [],
  refreshPositions: async () => { },
  refreshPerpPositions: async () => { },
  positionsLoading: false,
  poolData: null,
  getPoolUtilization: () => null,
  volumeData: null,
  getVolumeData: () => null,
  refreshVolumeData: async () => { },
});

export const clusterUrl = "https://api.devnet.solana.com";
export const connection = new Connection(clusterUrl, "confirmed");
export type ExpiredOption = {
  index: any;
  token: any;
  transaction: any;
  strikePrice: any;
  qty: any;
  expiryPrice: any;
  tokenAmount: any;
  dollarAmount: any;
  iconPath: any;
};

// Token list for perp positions (you may need to adjust this import path)
const tokenList = [
  {
    name: "Solana",
    symbol: "SOL",
    iconPath: "/images/solana.png",
  },
  // Add other tokens as needed
];

export const ContractProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { priceData } = usePythPrice("Crypto.SOL/USD");
  const { connected, publicKey, sendTransaction } = useWallet();
  const wallet = useAnchorWallet();
  const [program, setProgram] = useState<Program<OptionContract>>();
  const [pub, setPubKey] = useState<PublicKey>();
  const [positions, setPositions] = useState<any>([]);
  const [expiredPositions, setExpiredPositions] = useState<any>([]);
  const [donePositions, setDonePositions] = useState<any>([]);
  const [perpPositions, setPerpPositions] = useState<FuturePos[]>([]);
  const [positionsLoading, setPositionsLoading] = useState<boolean>(false);
  // Add state for pool utilization data
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  // Add new state for volume data
  const [volumeData, setVolumeData] = useState<VolumeData | null>(null);

  const getOptionDetailAccount = (
    index: number,
    pool: PublicKey,
    custody: PublicKey
  ) => {
    if (connected && publicKey != null && program && wallet != undefined) {
      const [optionDetail] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("option"),
          wallet.publicKey.toBuffer(),
          new BN(index).toArrayLike(Buffer, "le", 8),
          pool.toBuffer(),
          custody.toBuffer(),
        ],
        program.programId
      );
      return optionDetail;
    }
  };

  // Helper function to calculate pool utilization
  const calculateUtilization = (
    custodyData: any,
    decimals: number,
    isSol: boolean
  ): PoolUtilization => {
    const tokenLocked = custodyData.tokenLocked.toNumber();
    const tokenOwned = custodyData.tokenOwned.toNumber();

    // Calculate utilization percentage
    const utilizationPercent = tokenOwned > 0 ? (tokenLocked / tokenOwned) * 100 : 0;

    // Calculate borrow rate using the existing utility
    const borrowRate = OptionDetailUtils.calculateBorrowRate(
      tokenLocked,
      tokenOwned,
      isSol
    );

    return {
      tokenLocked,
      tokenOwned,
      utilizationPercent,
      borrowRate,
    };
  };

  const calculateVolumeData = useCallback((): VolumeData => {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const currentPrice = priceData.price || 0;

    let volume24h = 0;
    let callCount = 0;
    let putCount = 0;
    let callCount24h = 0;
    let putCount24h = 0;
    let optionVolume24h = 0;
    let perpVolume24h = 0;

    // Calculate from active positions
    positions.forEach((position: any) => {
      const isCall = position.type === 'Call';
      const isPut = position.type === 'Put';

      // Count active positions
      if (isCall) callCount++;
      if (isPut) putCount++;

      // Check if created in last 24h
      const purchaseTime = new Date(position.purchaseDate).getTime();
      if (purchaseTime >= oneDayAgo) {
        if (isCall) callCount24h++;
        if (isPut) putCount24h++;

        // Calculate option premium for volume
        try {
          const timeToExpiry = (new Date(position.expiry).getTime() - now) / (365.25 * 24 * 60 * 60 * 1000);
          const utilization = getPoolUtilization(isCall ? 'SOL' : 'USDC');
          const premium = OptionDetailUtils.blackScholesWithBorrowRate(
            currentPrice,
            position.strikePrice,
            Math.max(timeToExpiry, 0.001),
            isCall,
            utilization?.tokenLocked || 0,
            utilization?.tokenOwned || 0,
            isCall,
          );

          const optionValue = (premium || 0) * position.size;
          optionVolume24h += optionValue;
          volume24h += optionValue;
        } catch (error) {
          console.warn("Error calculating option premium:", error);
          // Fallback: use intrinsic value
          const intrinsicValue = isCall ?
            Math.max(0, currentPrice - position.strikePrice) :
            Math.max(0, position.strikePrice - currentPrice);
          const fallbackValue = intrinsicValue * position.size;
          optionVolume24h += fallbackValue;
          volume24h += fallbackValue;
        }
      }
    });

    // Calculate from perp positions (created in last 24h)
    perpPositions.forEach((perpPosition: FuturePos) => {
      const purchaseTime = new Date(perpPosition.purchaseDate).getTime();
      if (purchaseTime >= oneDayAgo) {
        // Perp volume = position size * current price
        const perpValue = perpPosition.size * currentPrice;
        perpVolume24h += perpValue;
        volume24h += perpValue;
      }
    });

    // Calculate from done positions (completed in last 24h)
    donePositions.forEach((donePosition: any) => {
      const completedTime = new Date(donePosition.timestamp).getTime();
      if (completedTime >= oneDayAgo) {
        // Add completed option values to volume
        try {
          const timeToExpiry = 0.001; // Minimal time for completed options
          const isCall = donePosition.transactionType === "Call";
          const utilization = getPoolUtilization(isCall ? 'SOL' : 'USDC');
          const premium = OptionDetailUtils.blackScholesWithBorrowRate(
            currentPrice,
            donePosition.strikePrice,
            timeToExpiry,
            isCall,
            utilization?.tokenLocked || 0,
            utilization?.tokenOwned || 0,
            isCall,
          );

          const completedValue = premium * donePosition.quantity;
          volume24h += completedValue;
        } catch (error) {
          // Fallback for completed options
          const estimatedValue = donePosition.quantity * donePosition.strikePrice * 0.1; // 10% of notional
          volume24h += estimatedValue;
        }
      }
    });

    return {
      volume24h: Math.round(volume24h * 100) / 100, // Round to 2 decimals
      callCount,
      putCount,
      callCount24h,
      putCount24h,
      optionVolume24h: Math.round(optionVolume24h * 100) / 100,
      perpVolume24h: Math.round(perpVolume24h * 100) / 100,
      lastUpdated: now
    };
  }, [positions, perpPositions, donePositions, priceData.price]);

  // Function to refresh volume data
  const refreshVolumeData = useCallback(async () => {
    try {
      const newVolumeData = calculateVolumeData();
      setVolumeData(newVolumeData);
      console.log("Updated volume data:", newVolumeData);
    } catch (error) {
      console.error("Error calculating volume data:", error);
    }
  }, [calculateVolumeData]);

  // Function to get current volume data
  const getVolumeData = useCallback((): VolumeData | null => {
    return volumeData;
  }, [volumeData]);

  // Update the refreshPositions function to also refresh volume data
  const refreshPositions = useCallback(async () => {
    if (program && publicKey) {
      setPositionsLoading(true);
      try {
        // Fetch both options and perp positions
        const [pinfo, expiredpinfo, doneinfo] = await getDetailInfos(program, publicKey);
        const perpPos = await getPerpPositions(program, publicKey);

        setPositions(pinfo);
        setExpiredPositions(expiredpinfo);
        setDonePositions(doneinfo);
        setPerpPositions(perpPos);

        console.log(`Loaded ${pinfo.length} options, ${perpPos.length} perp positions`);

        // Calculate and update volume data after positions are updated
        await refreshVolumeData();
      } catch (error) {
        console.error("Error refreshing positions:", error);
      } finally {
        setPositionsLoading(false);
      }
    }
  }, [program, publicKey, priceData, refreshVolumeData]);

  // Auto-refresh volume data when price changes significantly
  useEffect(() => {
    if (volumeData && priceData.price) {
      const lastUpdate = volumeData.lastUpdated;
      const timeSinceUpdate = Date.now() - lastUpdate;

      // Refresh every 5 minutes or when price changes significantly
      if (timeSinceUpdate > 5 * 60 * 1000) {
        refreshVolumeData();
      }
    }
  }, [priceData.price, volumeData, refreshVolumeData]);

  // Enhanced getCustodies function that also updates pool data
  const getCustodies = async (program: Program<OptionContract>) => {
    if (connected && publicKey != null && program) {
      const [pool] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from("SOL/USDC")],
        program.programId
      );

      const custodies = new Map<string, any>();
      const ratios = new Map<string, any>();
      const poolData = await program.account.pool.fetch(pool);

      for await (let custody of poolData.custodies) {
        let c = await program.account.custody.fetch(new PublicKey(custody));
        let mint = c.mint;
        custodies.set(mint.toBase58(), c);
        ratios.set(
          mint.toBase58(),
          poolData.ratios[
          poolData.custodies.findIndex((e) => e.equals(custody))
          ]
        );
      }

      // Update pool utilization data
      const solCustodyData = custodies.get(WSOL_MINT.toBase58());
      const usdcCustodyData = custodies.get(USDC_MINT.toBase58());

      if (solCustodyData && usdcCustodyData) {
        const newPoolData: PoolData = {
          sol: calculateUtilization(solCustodyData, WSOL_DECIMALS, true),
          usdc: calculateUtilization(usdcCustodyData, USDC_DECIMALS, false),
          lastUpdated: Date.now(),
        };

        setPoolData(newPoolData);
        console.log("Updated pool utilization data:", newPoolData);
      }

      return [custodies, ratios];
    }
  };

  // Function to get pool utilization for specific asset
  const getPoolUtilization = useCallback((asset: "SOL" | "USDC"): PoolUtilization | null => {
    if (!poolData) return null;
    return asset === "SOL" ? poolData.sol : poolData.usdc;
  }, [poolData]);

  // Function to fetch perpetual positions
  const getPerpPositions = async (
    program: Program<OptionContract>,
    publicKey: PublicKey
  ): Promise<FuturePos[]> => {
    const perpPositions: FuturePos[] = [];

    const [pool] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), Buffer.from("SOL/USDC")],
      program.programId
    );

    const [userPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), publicKey.toBuffer()],
      program.programId
    );

    try {
      // Get user info to know how many perp positions they have
      const userInfo = await program.account.user.fetch(userPDA).catch(() => null);

      if (!userInfo || userInfo.perpPositionCount.toNumber() === 0) {
        return [];
      }

      const perpPositionCount = userInfo.perpPositionCount.toNumber();
      console.log(`User has ${perpPositionCount} perp positions`);

      // Fetch all perp position accounts for this user
      const userPerpAccounts = await program.account.perpPosition.all([
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

          // Calculate position size in SOL (convert from lamports)
          const positionSizeSOL = position.positionSize.toNumber() / (10 ** WSOL_DECIMALS);

          const [solCustody] = PublicKey.findProgramAddressSync(
            [Buffer.from("custody"), pool.toBuffer(), WSOL_MINT.toBuffer()],
            program.programId
          );

          // Calculate collateral in USD (convert from micro-USDC)
          const collateralUSD = position.collateralAmount.toNumber() / (position.collateralAsset.toBase58() == solCustody.toBase58() ? 10 ** WSOL_DECIMALS : 10 ** USDC_DECIMALS);

          // Calculate unrealized PnL
          const entryPrice = position.entryPrice;
          const liquidationPrice = position.liquidationPrice;

          let unrealizedPnl = 0;
          if (currentPrice > 0) {
            const isLong = position.side.hasOwnProperty("long");
            const priceDiff = isLong
              ? currentPrice - entryPrice  // Long: profit when price goes up
              : entryPrice - currentPrice; // Short: profit when price goes down

            const pnlRatio = priceDiff / entryPrice;
            unrealizedPnl = pnlRatio * positionSizeSOL;
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
            token: (tokenList.find(t => t.symbol === 'SOL') || tokenList[0]) as Token,
            symbol: 'SOL',
            futureType: 'perps', // All your positions are perpetuals
            position: position.side.hasOwnProperty("long") ? "long" : "short",
            entryPrice: Number(entryPrice.toFixed(2)),
            LiqPrice: Number(liquidationPrice.toFixed(2)),
            size: Number(positionSizeSOL.toFixed(6)),
            collateral: Number(collateralUSD.toFixed(2)),
            TPSL: Number(tpsl.toFixed(2)),
            logo: '/images/solana.png',
            leverage: Number(position.leverage.toFixed(2)),
            purchaseDate: formattedPurchaseDate,
            // Additional fields for debugging/tracking
            unrealizedPnl: Number(unrealizedPnl.toFixed(2)),
            marginRatio: Number((position.marginRatio * 100).toFixed(2)),
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

      // Fallback: try without memcmp filter
      try {
        console.log("Trying fallback method...");
        const allPerpAccounts = await program.account.perpPosition.all();
        const userPerps = allPerpAccounts.filter(account =>
          account.account.owner.equals(publicKey)
        );

        console.log(`Fallback found ${userPerps.length} perp accounts`);
        // Would process with same logic as above if needed

      } catch (fallbackError) {
        console.error("Fallback method also failed:", fallbackError);
      }

      return [];
    }
  };

  const getDetailInfos = async (
    program: Program<OptionContract>,
    publicKey: PublicKey
  ) => {
    const pinfo = [];
    const expiredpinfo = [];
    const doneInfo = [];

    const [pool] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), Buffer.from("SOL/USDC")],
      program.programId
    );

    // Get both custody addresses
    const [solCustody] = PublicKey.findProgramAddressSync(
      [Buffer.from("custody"), pool.toBuffer(), WSOL_MINT.toBuffer()],
      program.programId
    );

    const [usdcCustody] = PublicKey.findProgramAddressSync(
      [Buffer.from("custody"), pool.toBuffer(), USDC_MINT.toBuffer()],
      program.programId
    );

    const [userPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), publicKey.toBuffer()],
      program.programId
    );

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
          const isPremiumSOL = detail.premiumAsset.equals(solCustody);
          const isPremiumUSDC = detail.premiumAsset.equals(usdcCustody);

          // const token = isPremiumSOL ? "SOL" : "USDC";
          // const symbol = isPremiumSOL ? "SOL" : "USDC";
          // const logo = isPremiumSOL ? "/images/solana.png" : "/images/usdc.png";
          const token = "SOL";
          const symbol = "SOL";
          const logo = "/images/solana.png";

          // 3. Size calculation based on what was locked by protocol
          let optionSize;
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

          console.log(detail);

          if (
            detail?.expiredDate.toNumber() > Math.round(Date.now() / 1000) &&
            detail?.valid
          ) {
            // Active options
            pinfo.push({
              index: detail.index.toNumber(),
              token: token,                    // What user PAID with (SOL or USDC)
              logo: logo,                      // Logo matches payment currency
              symbol: symbol,                  // Symbol matches payment currency  
              strikePrice: strikePrice,
              type: optionType,                // "Call" or "Put" (based on locked asset)
              expiry: new Date(detail.expiredDate.toNumber() * 1000).toString(),
              size: detail.amount.toNumber() / (10 ** (isPremiumSOL ? WSOL_DECIMALS : USDC_DECIMALS)),                // Size in SOL units (underlying asset)
              pnl: pnl,
              entryPrice: detail.boughtBack,
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
              // Debug info
              rawAmount: detail.amount.toString(),
              lockedAsset: detail.lockedAsset.toBase58(),
              premiumAsset: detail.premiumAsset.toBase58(),
              accountAddress: optionDetailAccount.toBase58(),
            });
          } else if (
            detail?.expiredDate.toNumber() < Math.round(Date.now() / 1000) &&
            detail?.claimed != 0
          ) {
            expiredpinfo.push({
              index: detail.index.toNumber(),
              token: token,                    // What user PAID with
              iconPath: logo,                  // Logo matches payment currency
              symbol: symbol,                  // Symbol matches payment currency
              strikePrice: strikePrice,
              quantity: detail.quantity,
              expiryPrice: 0,
              transaction: optionType,         // "Call" or "Put"
              tokenAmount: optionSize,         // Size in SOL units
              dollarAmount: detail.profit,    // Profit in USD
            });
          } else {
            // Exercised/closed options
            doneInfo.push({
              transactionID: `SOL-${formatDate(
                new Date(detail.exercised * 1000)
              )}-${strikePrice}-${optionType.charAt(0)}`,
              token: coins[0],
              transactionType: optionType,
              quantity: detail.quantity,
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

      // Fallback: if memcmp filter fails, try without filter and manually filter
      try {
        console.log("Trying fallback method without memcmp filter...");
        const allOptionAccounts = await program.account.optionDetail.all();
        const userOptions = allOptionAccounts.filter(account =>
          account.account.owner.equals(publicKey)
        );

        console.log(`Fallback found ${userOptions.length} option accounts for user`);

        // Process userOptions with the same logic as above...
        // [Same processing code would go here]

      } catch (fallbackError) {
        console.error("Fallback method also failed:", fallbackError);
      }
    }

    console.log("Final results:", {
      activeOptions: pinfo.length,
      expiredOptions: expiredpinfo.length,
      doneOptions: doneInfo.length
    });

    return [pinfo, expiredpinfo, doneInfo];
  };

  // Separate function to refresh only perp positions
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
  }, [program, publicKey, priceData]);

  const onOpenOption = async (
    amount: number,
    strike: number,
    period: number,
    expiredTime: number,
    isCall: boolean,
    paySol: boolean
  ) => {
    // try {
    if (!program || !publicKey || !connected || !wallet) return false;
    const [pool] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), Buffer.from("SOL/USDC")],
      program.programId
    );
    const [custody] = PublicKey.findProgramAddressSync(
      [Buffer.from("custody"), pool.toBuffer(), WSOL_MINT.toBuffer()],
      program.programId
    );
    const [userPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), publicKey.toBuffer()],
      program.programId
    );
    let optionIndex;
    try {
      const userInfo = await program.account.user.fetch(userPDA);
      optionIndex = userInfo.optionIndex.toNumber() + 1;
    } catch {
      optionIndex = 1;
    }

    console.log("optionIndex", optionIndex);

    const optionDetailAccount = getOptionDetailAccount(
      optionIndex,
      pool,
      custody
    );

    if (!optionDetailAccount) return false;
    const fundingAccount = getAssociatedTokenAddressSync(
      paySol ? WSOL_MINT : USDC_MINT,
      wallet.publicKey
    );

    const [paycustody] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("custody"),
        pool.toBuffer(),
        paySol ? WSOL_MINT.toBuffer() : USDC_MINT.toBuffer(),
      ],
      program.programId
    );

    const paycustodyData = await program.account.custody.fetch(paycustody);

    const transaction = await program.methods
      .openOption({
        amount: new BN(amount),
        strike: strike,
        period: new BN(period),
        expiredTime: new BN(expiredTime),
        poolName: "SOL/USDC",
      })
      .accountsPartial({
        owner: publicKey,
        fundingAccount: fundingAccount,
        custodyMint: WSOL_MINT,
        payCustodyMint: paySol ? WSOL_MINT : USDC_MINT,
        custodyOracleAccount: new PublicKey(
          WSOL_ORACLE
        ),
        payCustodyOracleAccount: paySol
          ? new PublicKey(WSOL_ORACLE)
          : new PublicKey(USDC_ORACLE),
        lockedCustodyMint: isCall ? WSOL_MINT : USDC_MINT,
        optionDetail: optionDetailAccount,
        payCustodyTokenAccount: paycustodyData.tokenAccount,
        payCustody: paycustody,
      })
      .transaction();
    const latestBlockHash = await connection.getLatestBlockhash();
    transaction.feePayer = publicKey;
    let result = await connection.simulateTransaction(transaction);
    console.log("result", result);
    const signature = await sendTransaction(transaction, connection);
    await connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: signature,
    });

    // Refresh positions after successful transaction
    await refreshPositions();
    return true;
  };

  const onEditOption = async (params: {
    optionIndex: number;
    poolName: string;
    newSize?: number;
    newStrike?: number;
    newExpiry?: number; // Unix timestamp
    maxAdditionalPremium?: number;
    minRefundAmount?: number;
  }) => {
    try {
      if (!program || !publicKey || !connected || !wallet) return false;

      console.log("Editing option with params:", params);

      // Find pool PDA
      const [pool] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from("SOL/USDC")],
        program.programId
      );

      // Find contract PDA
      const [contract] = PublicKey.findProgramAddressSync(
        [Buffer.from("contract")],
        program.programId
      );

      // Find transfer authority PDA
      const [transferAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("transfer_authority")],
        program.programId
      );

      // Find user PDA
      const [userPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), publicKey.toBuffer()],
        program.programId
      );

      // Find both custodies (SOL and USDC)
      const [solCustody] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), pool.toBuffer(), WSOL_MINT.toBuffer()],
        program.programId
      );

      const [usdcCustody] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), pool.toBuffer(), USDC_MINT.toBuffer()],
        program.programId
      );

      // Try to find the option detail account with both custodies
      let optionDetailAccount;
      let optionDetailData;
      let custody;

      // First try with SOL custody
      try {
        const solOptionDetail = getOptionDetailAccount(params.optionIndex, pool, solCustody);
        if (solOptionDetail) {
          optionDetailData = await program.account.optionDetail.fetch(solOptionDetail);
          optionDetailAccount = solOptionDetail;
          custody = solCustody;
          console.log("Found option with SOL custody");
        }
      } catch (e) {
        // If SOL fails, try with USDC custody
        try {
          const usdcOptionDetail = getOptionDetailAccount(params.optionIndex, pool, usdcCustody);
          if (usdcOptionDetail) {
            optionDetailData = await program.account.optionDetail.fetch(usdcOptionDetail);
            optionDetailAccount = usdcOptionDetail;
            custody = usdcCustody;
            console.log("Found option with USDC custody");
          }
        } catch (e2) {
          console.error("Option detail not found with either custody");
          return false;
        }
      }

      if (!optionDetailAccount || !optionDetailData) {
        console.error("Option detail not found");
        return false;
      }

      console.log("Using custody:", custody.toBase58());
      console.log("Option detail account:", optionDetailAccount.toBase58());

      // Determine custodies based on option data
      const premiumAsset = optionDetailData.premiumAsset; // What user paid with
      const lockedAsset = optionDetailData.lockedAsset; // What's locked by protocol

      // Get pay custody (for premium payments/refunds)
      const payCustody = premiumAsset;
      const payCustodyData = await program.account.custody.fetch(payCustody);

      // Get locked custody (for collateral management)
      const lockedCustody = lockedAsset;
      const lockedCustodyData = await program.account.custody.fetch(lockedCustody);

      // Determine mint types
      const isPremiumSOL = premiumAsset.equals(solCustody);
      const isLockedSOL = lockedAsset.equals(solCustody);

      const payCustodyMint = isPremiumSOL ? WSOL_MINT : USDC_MINT;
      const lockedCustodyMint = isLockedSOL ? WSOL_MINT : USDC_MINT;
      const custodyMint = custody?.equals(solCustody) ? WSOL_MINT : USDC_MINT;

      // Get custody token accounts
      const [payCustodyTokenAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("custody_token_account"),
          pool.toBuffer(),
          payCustodyMint.toBuffer(),
        ],
        program.programId
      );

      // User token accounts for payments and refunds
      const fundingAccount = getAssociatedTokenAddressSync(
        payCustodyMint, // User pays/receives in the same asset they originally paid with
        wallet.publicKey
      );

      const refundAccount = getAssociatedTokenAddressSync(
        payCustodyMint, // Refunds also in the same asset
        wallet.publicKey
      );

      // Get oracle accounts
      const custodyOracleAccount = custody?.equals(solCustody)
        ? new PublicKey(WSOL_ORACLE)
        : new PublicKey(USDC_ORACLE);

      const payCustodyOracleAccount = isPremiumSOL
        ? new PublicKey(WSOL_ORACLE)
        : new PublicKey(USDC_ORACLE);

      console.log("Edit option accounts:", {
        optionIndex: params.optionIndex,
        poolName: params.poolName,
        optionDetailAccount: optionDetailAccount.toBase58(),
        custody: custody.toBase58(),
        payCustody: payCustody.toBase58(),
        lockedCustody: lockedCustody.toBase58(),
        fundingAccount: fundingAccount.toBase58(),
        refundAccount: refundAccount.toBase58(),
        newStrike: params.newStrike,
        newExpiry: params.newExpiry,
      });

      // Build the transaction
      const transaction = await program.methods
        .editOption({
          optionIndex: new BN(params.optionIndex),
          poolName: params.poolName,
          newStrike: params.newStrike ? params.newStrike : null,
          newExpiry: params.newExpiry ? new BN(params.newExpiry) : null,
          maxAdditionalPremium: new BN(Math.floor((params.maxAdditionalPremium || 0) * 1_000_000)), // Convert to microUSDC
          minRefundAmount: new BN(Math.floor((params.minRefundAmount || 0) * 1_000_000)), // Convert to microUSDC
        })
        .accountsPartial({
          owner: publicKey,
          fundingAccount: fundingAccount,
          refundAccount: refundAccount,
          pool: pool,
          custodyMint: WSOL_MINT,
          payCustodyMint: payCustodyMint,
          lockedCustodyMint: lockedCustodyMint,
          payCustody: payCustody,
          lockedCustody: lockedCustody,
          custodyOracleAccount: custodyOracleAccount,
          payCustodyOracleAccount: payCustodyOracleAccount,
        })
        .transaction();

      const latestBlockHash = await connection.getLatestBlockhash();
      transaction.feePayer = publicKey;

      // Simulate transaction first
      let result = await connection.simulateTransaction(transaction);
      console.log("Edit option simulation result:", result);

      if (result.value.err) {
        console.error("Edit option simulation failed:", result.value.err);
        return false;
      }

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });

      console.log("Option edited successfully:", signature);

      // Refresh positions after successful transaction
      await refreshPositions();
      return true;

    } catch (error) {
      console.error("Error editing option:", error);
      return false;
    }
  };

  const getPositionIndexFromAccount = async (accountAddress: string, owner: PublicKey, pool: PublicKey) => {
    // Try different position indices until we find the matching account

    const [userPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), owner.toBuffer()],
      program!.programId
    );

    const userInfo = await program!.account.user.fetch(userPDA).catch((e) => {
      return null;
    });

    if (!userInfo) return [[], [], []];
    const positionCount = userInfo.perpPositionCount;

    for (let i = 1; i <= positionCount; i++) {
      const [derivedAddress] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("perp_position"),
          owner.toBuffer(),
          new BN(i).toArrayLike(Buffer, "le", 8),
          pool.toBuffer()
        ],
        program!.programId
      );

      if (derivedAddress.toString() === accountAddress) {
        return i;
      }
    }
    throw new Error("Position index not found");
  };

  // Close perpetual position function
  const onClosePerp = async (
    accountAddress: string,
    closePercentage: number = 100, // 1-100: 100 = full close, <100 = partial close
    receiveAsset: "SOL" | "USDC" = "USDC", // Which asset user wants to receive
    minPrice: number = 0, // Minimum acceptable price for slippage protection
  ) => {
    try {
      if (!program || !publicKey || !connected || !wallet) return false;

      // Find contract account (required by smart contract)
      const [contract] = PublicKey.findProgramAddressSync(
        [Buffer.from("contract")],
        program.programId
      );

      // Find pool account (same as open)
      const [pool] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from("SOL/USDC")],
        program.programId
      );

      // Find transfer authority (required by smart contract)
      const [transferAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("transfer_authority")],
        program.programId
      );

      const positionIndex = await getPositionIndexFromAccount(
        accountAddress,
        publicKey,
        pool
      );

      // Find the perp position account
      const [position] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("perp_position"),
          publicKey.toBuffer(),
          new BN(positionIndex).toArrayLike(Buffer, "le", 8),
          pool.toBuffer()
        ],
        program.programId
      );

      // Get custody accounts (same as open)
      const [solCustody] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), pool.toBuffer(), WSOL_MINT.toBuffer()],
        program.programId
      );

      const [usdcCustody] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), pool.toBuffer(), USDC_MINT.toBuffer()],
        program.programId
      );

      // Get custody token accounts (both required by smart contract)
      const [solCustodyTokenAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("custody_token_account"),
          pool.toBuffer(),
          WSOL_MINT.toBuffer()
        ],
        program.programId
      );

      const [usdcCustodyTokenAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("custody_token_account"),
          pool.toBuffer(),
          USDC_MINT.toBuffer()
        ],
        program.programId
      );

      // User's receiving accounts (both required by smart contract)
      const userSolAccount = getAssociatedTokenAddressSync(
        WSOL_MINT,
        wallet.publicKey
      );

      const userUsdcAccount = getAssociatedTokenAddressSync(
        USDC_MINT,
        wallet.publicKey
      );

      console.log("Closing perp position with params:", {
        positionIndex,
        closePercentage,
        minPrice,
        receiveAsset,
        poolName: "SOL/USDC"
      });

      const transaction = await program.methods
        .closePerpPosition({
          positionIndex: new BN(positionIndex),
          poolName: "SOL/USDC",
          closePercentage: closePercentage,
          minPrice: minPrice,
          receiveSol: receiveAsset === "SOL", // Convert to boolean for smart contract
        })
        .accountsPartial({
          owner: publicKey,
          userSolAccount: userSolAccount,      // Required: matches contract account name
          userUsdcAccount: userUsdcAccount,    // Required: matches contract account name
          transferAuthority: transferAuthority, // Required: matches contract account name
          contract: contract,                  // Required: matches contract account name
          pool: pool,
          position: position,
          solCustody: solCustody,
          usdcCustody: usdcCustody,
          solCustodyTokenAccount: solCustodyTokenAccount,   // Required: matches contract account name
          usdcCustodyTokenAccount: usdcCustodyTokenAccount, // Required: matches contract account name
          solOracleAccount: new PublicKey(WSOL_ORACLE),     // Required: matches contract account name
          usdcOracleAccount: new PublicKey(USDC_ORACLE),    // Required: matches contract account name
          solMint: WSOL_MINT,                  // Required: matches contract account name
          usdcMint: USDC_MINT,                 // Required: matches contract account name
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .transaction();

      const latestBlockHash = await connection.getLatestBlockhash();
      transaction.feePayer = publicKey;

      // Simulate transaction first
      let result = await connection.simulateTransaction(transaction);
      console.log("Close simulation result:", result);

      if (result.value.err) {
        console.error("Close transaction simulation failed:", result.value.err);
        return false;
      }

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });

      console.log(`Perp position ${closePercentage === 100 ? 'fully' : 'partially'} closed successfully:`, signature);
      console.log(`Settlement received as: ${receiveAsset}`);
      await refreshPerpPositions(); // Refresh positions
      return true;

    } catch (e) {
      console.error("Error closing perp position:", e);
      return false;
    }
  };

  // Updated onOpenPerp function to support multi-collateral
  const onOpenPerp = async (
    collateralAmount: number,
    positionSize: number,
    side: "long" | "short",
    maxSlippage: number = 100,
    paySol: boolean = false,
    payAmount: number,
  ) => {
    try {
      if (!program || !publicKey || !connected || !wallet) return false;

      const [pool] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from("SOL/USDC")],
        program.programId
      );

      const [userPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), publicKey.toBuffer()],
        program.programId
      );

      let perpPositionCount;
      try {
        const userInfo = await program.account.user.fetch(userPDA);
        perpPositionCount = userInfo.perpPositionCount.toNumber();
      } catch {
        perpPositionCount = 0;
      }

      const [position] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("perp_position"),
          publicKey.toBuffer(),
          new BN(perpPositionCount + 1).toArrayLike(Buffer, "le", 8),
          pool.toBuffer()
        ],
        program.programId
      );

      // Get custody accounts
      const [solCustody] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), pool.toBuffer(), WSOL_MINT.toBuffer()],
        program.programId
      );

      const [usdcCustody] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), pool.toBuffer(), USDC_MINT.toBuffer()],
        program.programId
      );

      // Get custody token accounts
      const [solCustodyTokenAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("custody_token_account"),
          pool.toBuffer(),
          WSOL_MINT.toBuffer()
        ],
        program.programId
      );

      const [usdcCustodyTokenAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("custody_token_account"),
          pool.toBuffer(),
          USDC_MINT.toBuffer()
        ],
        program.programId
      );

      // User's funding account based on payment type
      const fundingAccount = getAssociatedTokenAddressSync(
        paySol ? WSOL_MINT : USDC_MINT,
        wallet.publicKey
      );

      // Convert side to enum format
      const perpSide = side === "long" ? { long: {} } : { short: {} };

      console.log("Opening perp position with params:", {
        collateralAmount,
        positionSize,
        side: perpSide,
        maxSlippage,
        paySol,
        paymentAsset: paySol ? "SOL" : "USDC",
        payAmount,
      });

      const transaction = await program.methods
        .openPerpPosition({
          collateralAmount: new BN(collateralAmount),
          positionSize: new BN(positionSize),
          side: perpSide,
          maxSlippage: new BN(maxSlippage),
          poolName: "SOL/USDC",
          paySol: paySol,
          payAmount: new BN(payAmount),
        })
        .accountsPartial({
          owner: publicKey,
          fundingAccount: fundingAccount,
          pool: pool,
          user: userPDA,
          position: position,
          solCustody: solCustody,
          usdcCustody: usdcCustody,
          solCustodyTokenAccount: solCustodyTokenAccount,
          usdcCustodyTokenAccount: usdcCustodyTokenAccount,
          solOracleAccount: new PublicKey(WSOL_ORACLE),
          usdcOracleAccount: new PublicKey(USDC_ORACLE),
          solMint: WSOL_MINT,
          usdcMint: USDC_MINT,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      const latestBlockHash = await connection.getLatestBlockhash();
      transaction.feePayer = publicKey;

      let result = await connection.simulateTransaction(transaction);
      console.log("Simulation result:", result);

      if (result.value.err) {
        console.error("Transaction simulation failed:", result.value.err);
        return false;
      }

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });

      console.log("Multi-collateral perp position opened successfully:", signature);
      await refreshPositions();
      return true;

    } catch (e) {
      console.error("Error opening multi-collateral perp position:", e);
      return false;
    }
  };

  // Add collateral to existing perpetual position
  const onAddCollateral = async (
    accountAddress: string,  // The position account address
    collateralAmount: number,
    paySol: boolean,         // true = add SOL, false = add USDC
  ) => {
    try {
      if (!program || !publicKey || !connected || !wallet) return false;

      console.log("Adding collateral with params:", {
        accountAddress,
        collateralAmount,
        paySol,
        paymentAsset: paySol ? "SOL" : "USDC"
      });

      // Find contract account
      const [contract] = PublicKey.findProgramAddressSync(
        [Buffer.from("contract")],
        program.programId
      );

      // Find pool account
      const [pool] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from("SOL/USDC")],
        program.programId
      );

      // Get position index from account address
      const positionIndex = await getPositionIndexFromAccount(
        accountAddress,
        publicKey,
        pool
      );

      // Find the perp position account
      const [position] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("perp_position"),
          publicKey.toBuffer(),
          new BN(positionIndex).toArrayLike(Buffer, "le", 8),
          pool.toBuffer()
        ],
        program.programId
      );

      // Get custody accounts
      const [solCustody] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), pool.toBuffer(), WSOL_MINT.toBuffer()],
        program.programId
      );

      const [usdcCustody] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), pool.toBuffer(), USDC_MINT.toBuffer()],
        program.programId
      );

      // Get custody token accounts
      const [solCustodyTokenAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("custody_token_account"),
          pool.toBuffer(),
          WSOL_MINT.toBuffer()
        ],
        program.programId
      );

      const [usdcCustodyTokenAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("custody_token_account"),
          pool.toBuffer(),
          USDC_MINT.toBuffer()
        ],
        program.programId
      );

      // User's funding accounts (both required by smart contract)
      const solFundingAccount = getAssociatedTokenAddressSync(
        WSOL_MINT,
        wallet.publicKey
      );

      const usdcFundingAccount = getAssociatedTokenAddressSync(
        USDC_MINT,
        wallet.publicKey
      );

      const transaction = await program.methods
        .addCollateral({
          positionIndex: new BN(positionIndex),
          poolName: "SOL/USDC",
          collateralAmount: new BN(collateralAmount * (10 ** (paySol ? WSOL_DECIMALS : USDC_DECIMALS))),
          paySol: paySol,
        })
        .accountsPartial({
          owner: publicKey,
          solFundingAccount: solFundingAccount,
          usdcFundingAccount: usdcFundingAccount,
          contract: contract,
          pool: pool,
          position: position,
          solCustody: solCustody,
          usdcCustody: usdcCustody,
          solCustodyTokenAccount: solCustodyTokenAccount,
          usdcCustodyTokenAccount: usdcCustodyTokenAccount,
          solOracleAccount: new PublicKey(WSOL_ORACLE),
          usdcOracleAccount: new PublicKey(USDC_ORACLE),
          solMint: WSOL_MINT,
          usdcMint: USDC_MINT,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .transaction();

      const latestBlockHash = await connection.getLatestBlockhash();
      transaction.feePayer = publicKey;

      // Simulate transaction first
      let result = await connection.simulateTransaction(transaction);
      console.log("Add collateral simulation result:", result);

      if (result.value.err) {
        console.error("Add collateral simulation failed:", result.value.err);
        return false;
      }

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });

      console.log("Collateral added successfully:", signature);
      await refreshPerpPositions(); // Refresh positions
      return true;

    } catch (e) {
      console.error("Error adding collateral:", e);
      return false;
    }
  };

  // Remove collateral from existing perpetual position
  const onRemoveCollateral = async (
    accountAddress: string,   // The position account address
    collateralAmount: number,
    receiveSol: boolean,      // true = receive SOL, false = receive USDC
  ) => {
    try {
      if (!program || !publicKey || !connected || !wallet) return false;

      console.log("Removing collateral with params:", {
        accountAddress,
        collateralAmount,
        receiveSol,
        receiveAsset: receiveSol ? "SOL" : "USDC"
      });

      // Find contract account
      const [contract] = PublicKey.findProgramAddressSync(
        [Buffer.from("contract")],
        program.programId
      );

      // Find pool account
      const [pool] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from("SOL/USDC")],
        program.programId
      );

      // Find transfer authority
      const [transferAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("transfer_authority")],
        program.programId
      );

      // Get position index from account address
      const positionIndex = await getPositionIndexFromAccount(
        accountAddress,
        publicKey,
        pool
      );

      // Find the perp position account
      const [position] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("perp_position"),
          publicKey.toBuffer(),
          new BN(positionIndex).toArrayLike(Buffer, "le", 8),
          pool.toBuffer()
        ],
        program.programId
      );

      // Get custody accounts
      const [solCustody] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), pool.toBuffer(), WSOL_MINT.toBuffer()],
        program.programId
      );

      const [usdcCustody] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), pool.toBuffer(), USDC_MINT.toBuffer()],
        program.programId
      );

      // Get custody token accounts
      const [solCustodyTokenAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("custody_token_account"),
          pool.toBuffer(),
          WSOL_MINT.toBuffer()
        ],
        program.programId
      );

      const [usdcCustodyTokenAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("custody_token_account"),
          pool.toBuffer(),
          USDC_MINT.toBuffer()
        ],
        program.programId
      );

      // User's receiving accounts (both required by smart contract)
      const userSolAccount = getAssociatedTokenAddressSync(
        WSOL_MINT,
        wallet.publicKey
      );

      const userUsdcAccount = getAssociatedTokenAddressSync(
        USDC_MINT,
        wallet.publicKey
      );

      const transaction = await program.methods
        .removeCollateral({
          positionIndex: new BN(positionIndex),
          poolName: "SOL/USDC",
          collateralAmount: new BN(collateralAmount * (10 ** (receiveSol ? WSOL_DECIMALS : USDC_DECIMALS))),
          receiveSol: receiveSol,
        })
        .accountsPartial({
          owner: publicKey,
          userSolAccount: userSolAccount,
          userUsdcAccount: userUsdcAccount,
          transferAuthority: transferAuthority,
          contract: contract,
          pool: pool,
          position: position,
          solCustody: solCustody,
          usdcCustody: usdcCustody,
          solCustodyTokenAccount: solCustodyTokenAccount,
          usdcCustodyTokenAccount: usdcCustodyTokenAccount,
          solOracleAccount: new PublicKey(WSOL_ORACLE),
          usdcOracleAccount: new PublicKey(USDC_ORACLE),
          solMint: WSOL_MINT,
          usdcMint: USDC_MINT,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .transaction();

      const latestBlockHash = await connection.getLatestBlockhash();
      transaction.feePayer = publicKey;

      // Simulate transaction first
      let result = await connection.simulateTransaction(transaction);
      console.log("Remove collateral simulation result:", result);

      if (result.value.err) {
        console.error("Remove collateral simulation failed:", result.value.err);
        return false;
      }

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });

      console.log("Collateral removed successfully:", signature);
      console.log(`Received as: ${receiveSol ? "SOL" : "USDC"}`);
      await refreshPerpPositions(); // Refresh positions
      return true;

    } catch (e) {
      console.error("Error removing collateral:", e);
      return false;
    }
  };

  const onCloseOption = async (optionIndex: number, closeQuantity: number) => {
    try {
      if (!program || !publicKey || !connected || !wallet) return false;

      const [pool] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from("SOL/USDC")],
        program.programId
      );

      // Get both custody addresses
      const [solCustody] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), pool.toBuffer(), WSOL_MINT.toBuffer()],
        program.programId
      );

      const [usdcCustody] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), pool.toBuffer(), USDC_MINT.toBuffer()],
        program.programId
      );

      // First, find the option detail account and fetch its data
      let optionDetailAccount;
      let optionDetailData;
      let custody; // The custody used for the option detail PDA

      // Try to find option detail with both possible custodies
      try {
        const solOptionDetail = getOptionDetailAccount(optionIndex, pool, solCustody);
        if (solOptionDetail) {
          optionDetailData = await program.account.optionDetail.fetch(solOptionDetail);
          optionDetailAccount = solOptionDetail;
          custody = solCustody;
        }
      } catch (e) {
        // If SOL fails, try USDC custody
        try {
          const usdcOptionDetail = getOptionDetailAccount(optionIndex, pool, usdcCustody);
          if (usdcOptionDetail) {
            optionDetailData = await program.account.optionDetail.fetch(usdcOptionDetail);
            optionDetailAccount = usdcOptionDetail;
            custody = usdcCustody;
          }
        } catch (e2) {
          return false;
        }
      }

      if (!optionDetailData || !optionDetailAccount) {
        console.error("Option detail not found");
        return false;
      }

      // Validate close quantity
      if (closeQuantity <= 0 || closeQuantity > optionDetailData.quantity.toNumber()) {
        throw new Error("Invalid close quantity");
      }

      // Determine custodies based on option data
      const lockedAsset = optionDetailData.lockedAsset; // What's locked by protocol
      const premiumAsset = optionDetailData.premiumAsset; // What user paid with

      // Determine if this is a call or put
      const isCallOption = lockedAsset.equals(solCustody);  // SOL locked = Call
      const isPutOption = lockedAsset.equals(usdcCustody); // USDC locked = Put

      // Set locked custody based on what's actually locked
      const lockedCustody = lockedAsset;

      // Set pay custody based on what the user paid with (premium asset)
      const payCustody = premiumAsset;

      // Determine the mint types
      const lockedCustodyMint = isCallOption ? WSOL_MINT : USDC_MINT;
      const isPremiumSOL = premiumAsset.equals(solCustody);
      const payCustodyMint = isPremiumSOL ? WSOL_MINT : USDC_MINT;

      console.log("Option details:", {
        optionIndex,
        isCallOption,
        isPutOption,
        lockedAsset: lockedAsset.toBase58(),
        premiumAsset: premiumAsset.toBase58(),
        lockedCustodyMint: lockedCustodyMint.toBase58(),
        payCustodyMint: payCustodyMint.toBase58()
      });

      // Get locked custody token account (where refund comes from)
      const [lockedCustodyTokenAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("custody_token_account"),
          pool.toBuffer(),
          lockedCustodyMint.toBuffer(),
        ],
        program.programId
      );

      // Create closed option detail account PDA
      const [closedOptionDetail] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("option"),
          publicKey.toBuffer(),
          new BN(optionIndex).toArrayLike(Buffer, "le", 8),
          pool.toBuffer(),
          custody!.toBuffer(),
          Buffer.from("closed"),
        ],
        program.programId
      );

      // Create funding account for the locked asset (where refund will be sent)
      // Call option = get WSOL back, Put option = get USDC back
      const fundingAccount = getAssociatedTokenAddressSync(
        lockedCustodyMint,
        wallet.publicKey
      );

      // Get custody data for oracles
      const custodyData = await program.account.custody.fetch(custody!);
      const payCustodyData = await program.account.custody.fetch(payCustody);
      const lockedCustodyData = await program.account.custody.fetch(lockedCustody);

      const custodyOracleAccount = custodyData.oracle;
      const payCustodyOracleAccount = payCustodyData.oracle;
      const lockedOracleAccount = lockedCustodyData.oracle;

      const transaction = await program.methods
        .closeOption({
          optionIndex: new BN(optionIndex),
          poolName: "SOL/USDC",
          closeQuantity: new BN(closeQuantity)
        })
        .accountsPartial({
          owner: publicKey,
          fundingAccount,
          custodyMint: custody!.equals(solCustody) ? WSOL_MINT : USDC_MINT,
          payCustodyMint: payCustodyMint,
          lockedCustodyMint: lockedCustodyMint,
          lockedCustodyTokenAccount: lockedCustodyTokenAccount,
          optionDetail: optionDetailAccount,
          closedOptionDetail: closedOptionDetail,
          lockedCustody: lockedCustody,
          payCustody: payCustody,
          custodyOracleAccount: custodyOracleAccount,
          payCustodyOracleAccount: payCustodyOracleAccount,
          lockedOracle: lockedOracleAccount,
        })
        .transaction();

      const latestBlockHash = await connection.getLatestBlockhash();

      // Optional: Simulate transaction for debugging
      transaction.feePayer = publicKey;
      let result = await connection.simulateTransaction(transaction);
      console.log("Simulation result:", result);

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });

      console.log("Option closed successfully, signature:", signature);

      // Refresh positions after successful transaction
      await refreshPositions();
      return true;
    } catch (e) {
      console.log("Error closing option:", e);
      return false;
    }
  };

  const onOpenLimitOption = async (
    amount: number,
    strike: number,
    period: number,
    expiredTime: number,
    isCall: boolean,
    paySol: boolean,
    limitPrice: number
  ) => {
    // try {
    if (!program || !publicKey || !connected || !wallet) return false;
    const [pool] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), Buffer.from("SOL/USDC")],
      program.programId
    );
    const [custody] = PublicKey.findProgramAddressSync(
      [Buffer.from("custody"), pool.toBuffer(), WSOL_MINT.toBuffer()],
      program.programId
    );
    const [userPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), publicKey.toBuffer()],
      program.programId
    );
    let optionIndex;
    try {
      const userInfo = await program.account.user.fetch(userPDA);
      optionIndex = userInfo.optionIndex.toNumber() + 1;
    } catch {
      optionIndex = 1;
    }

    console.log("optionIndex", optionIndex);

    const optionDetailAccount = getOptionDetailAccount(
      optionIndex,
      pool,
      custody
    );

    if (!optionDetailAccount) return false;
    const fundingAccount = getAssociatedTokenAddressSync(
      paySol ? WSOL_MINT : USDC_MINT,
      wallet.publicKey
    );

    const [paycustody] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("custody"),
        pool.toBuffer(),
        paySol ? WSOL_MINT.toBuffer() : USDC_MINT.toBuffer(),
      ],
      program.programId
    );

    const paycustodyData = await program.account.custody.fetch(paycustody);

    const transaction = await program.methods
      .openLimitOption({
        amount: new BN(amount),
        strike: strike,
        period: new BN(period),
        expiredTime: new BN(expiredTime),
        poolName: "SOL/USDC",
        limitPrice: limitPrice,
      })
      .accountsPartial({
        owner: publicKey,
        fundingAccount: fundingAccount,
        custodyMint: WSOL_MINT,
        payCustodyMint: paySol ? WSOL_MINT : USDC_MINT,
        custodyOracleAccount: new PublicKey(
          WSOL_ORACLE
        ),
        payCustodyOracleAccount: paySol
          ? new PublicKey(WSOL_ORACLE)
          : new PublicKey(USDC_ORACLE),
        lockedCustodyMint: isCall ? WSOL_MINT : USDC_MINT,
        optionDetail: optionDetailAccount,
        payCustodyTokenAccount: paycustodyData.tokenAccount,
        payCustody: paycustody,
      })
      .transaction();
    const latestBlockHash = await connection.getLatestBlockhash();
    transaction.feePayer = publicKey;
    let result = await connection.simulateTransaction(transaction);
    console.log("result", result);
    const signature = await sendTransaction(transaction, connection);
    await connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: signature,
    });

    // Refresh positions after successful transaction
    await refreshPositions();
    return true;
    // } catch (e) {
    //   console.log("error", e);
    //   return false;
    // }
  };

  const onCloseLimitOption = async (optionIndex: number, closeQuantity: number) => {
    try {
      if (!program || !publicKey || !connected || !wallet) return false;

      const [pool] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from("SOL/USDC")],
        program.programId
      );

      // Get both custody addresses
      const [solCustody] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), pool.toBuffer(), WSOL_MINT.toBuffer()],
        program.programId
      );

      const [usdcCustody] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), pool.toBuffer(), USDC_MINT.toBuffer()],
        program.programId
      );

      // First, find the option detail account and fetch its data
      let optionDetailAccount;
      let optionDetailData;
      let custody; // The custody used for the option detail PDA

      // Try to find option detail with both possible custodies
      try {
        const solOptionDetail = getOptionDetailAccount(optionIndex, pool, solCustody);
        if (solOptionDetail) {
          optionDetailData = await program.account.optionDetail.fetch(solOptionDetail);
          optionDetailAccount = solOptionDetail;
          custody = solCustody;
        }
      } catch (e) {
        // If SOL fails, try USDC custody
        try {
          const usdcOptionDetail = getOptionDetailAccount(optionIndex, pool, usdcCustody);
          if (usdcOptionDetail) {
            optionDetailData = await program.account.optionDetail.fetch(usdcOptionDetail);
            optionDetailAccount = usdcOptionDetail;
            custody = usdcCustody;
          }
        } catch (e2) {
          return false;
        }
      }

      if (!optionDetailData || !optionDetailAccount) {
        console.error("Option detail not found");
        return false;
      }

      // Validate close quantity
      if (closeQuantity <= 0 || closeQuantity > optionDetailData.quantity.toNumber()) {
        throw new Error("Invalid close quantity");
      }

      // Determine custodies based on option data
      const lockedAsset = optionDetailData.lockedAsset; // What's locked by protocol
      const premiumAsset = optionDetailData.premiumAsset; // What user paid with

      // Determine if this is a call or put
      const isCallOption = lockedAsset.equals(solCustody);  // SOL locked = Call
      const isPutOption = lockedAsset.equals(usdcCustody); // USDC locked = Put

      // Set locked custody based on what's actually locked
      const lockedCustody = lockedAsset;

      // Set pay custody based on what the user paid with (premium asset)
      const payCustody = premiumAsset;

      // Determine the mint types
      const lockedCustodyMint = isCallOption ? WSOL_MINT : USDC_MINT;
      const isPremiumSOL = premiumAsset.equals(solCustody);
      const payCustodyMint = isPremiumSOL ? WSOL_MINT : USDC_MINT;

      console.log("Option details:", {
        optionIndex,
        isCallOption,
        isPutOption,
        lockedAsset: lockedAsset.toBase58(),
        premiumAsset: premiumAsset.toBase58(),
        lockedCustodyMint: lockedCustodyMint.toBase58(),
        payCustodyMint: payCustodyMint.toBase58()
      });

      // Get locked custody token account (where refund comes from)
      const [lockedCustodyTokenAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("custody_token_account"),
          pool.toBuffer(),
          lockedCustodyMint.toBuffer(),
        ],
        program.programId
      );

      // Create closed option detail account PDA
      const [closedOptionDetail] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("option"),
          publicKey.toBuffer(),
          new BN(optionIndex).toArrayLike(Buffer, "le", 8),
          pool.toBuffer(),
          custody!.toBuffer(),
          Buffer.from("closed"),
        ],
        program.programId
      );

      // Create funding account for the locked asset (where refund will be sent)
      // Call option = get WSOL back, Put option = get USDC back
      const fundingAccount = getAssociatedTokenAddressSync(
        lockedCustodyMint,
        wallet.publicKey
      );

      // Get custody data for oracles
      const custodyData = await program.account.custody.fetch(custody!);
      const payCustodyData = await program.account.custody.fetch(payCustody);
      const lockedCustodyData = await program.account.custody.fetch(lockedCustody);

      const custodyOracleAccount = custodyData.oracle;
      const payCustodyOracleAccount = payCustodyData.oracle;
      const lockedOracleAccount = lockedCustodyData.oracle;

      const transaction = await program.methods
        .closeLimitOption({
          optionIndex: new BN(optionIndex),
          poolName: "SOL/USDC",
          closeQuantity: new BN(closeQuantity)
        })
        .accountsPartial({
          owner: publicKey,
          fundingAccount,
          custodyMint: custody!.equals(solCustody) ? WSOL_MINT : USDC_MINT,
          payCustodyMint: payCustodyMint,
          lockedCustodyMint: lockedCustodyMint,
          lockedCustodyTokenAccount: lockedCustodyTokenAccount,
          optionDetail: optionDetailAccount,
          closedOptionDetail: closedOptionDetail,
          lockedCustody: lockedCustody,
          payCustody: payCustody,
          custodyOracleAccount: custodyOracleAccount,
          payCustodyOracleAccount: payCustodyOracleAccount,
          lockedOracle: lockedOracleAccount,
        })
        .transaction();

      const latestBlockHash = await connection.getLatestBlockhash();

      // Optional: Simulate transaction for debugging
      transaction.feePayer = publicKey;
      let result = await connection.simulateTransaction(transaction);
      console.log("Simulation result:", result);

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });

      console.log("Option closed successfully, signature:", signature);

      // Refresh positions after successful transaction
      await refreshPositions();
      return true;
    } catch (e) {
      console.log("Error closing option:", e);
      return false;
    }
  };

  const onClaimOption = async (optionIndex: number, solPrice: number) => {
    try {
      if (!program || !publicKey || !connected || !wallet) return;
      const [pool] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from("SOL/USDC")],
        program.programId
      );
      const [custody] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("custody_token_account"),
          pool.toBuffer(),
          WSOL_MINT.toBuffer(),
        ],
        program.programId
      );
      const optionDetailAccount = getOptionDetailAccount(
        optionIndex,
        pool,
        custody
      );
      if (!optionDetailAccount) return;
      const transaction = await program.methods
        .claimOption(new BN(optionIndex), solPrice)
        .accountsPartial({
          owner: publicKey,
          custodyMint: WSOL_MINT,
        })
        .transaction();
      const latestBlockHash = await connection.getLatestBlockhash();
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });

      // After successful transaction
      await refreshPositions();
      return true;
    } catch (e) {
      console.log("Error", e);
      return false;
    }
  };

  const onExerciseOption = async (optionIndex: number) => {
    try {
      if (!program || !optionIndex || !publicKey || !connected || !wallet) return false;

      // Find pool PDA
      const [pool] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from("SOL/USDC")],
        program.programId
      );

      // Find contract PDA
      const [contract] = PublicKey.findProgramAddressSync(
        [Buffer.from("contract")],
        program.programId
      );

      // Find transfer authority PDA
      const [transferAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("transfer_authority")],
        program.programId
      );

      // Find user PDA
      const [user] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), publicKey.toBuffer()],
        program.programId
      );

      // Find both custodies (SOL and USDC)
      const [solCustody] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), pool.toBuffer(), WSOL_MINT.toBuffer()],
        program.programId
      );

      const [usdcCustody] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), pool.toBuffer(), USDC_MINT.toBuffer()],
        program.programId
      );

      // Try to find the option detail account with both custodies
      let optionDetailAccount;
      let optionDetailData;
      let custody;

      // First try with SOL custody
      try {
        const solOptionDetail = getOptionDetailAccount(optionIndex, pool, solCustody);
        if (solOptionDetail) {
          optionDetailData = await program.account.optionDetail.fetch(solOptionDetail);
          optionDetailAccount = solOptionDetail;
          custody = solCustody;
        }
      } catch (e) {
        // If SOL fails, try with USDC custody
        try {
          const usdcOptionDetail = getOptionDetailAccount(optionIndex, pool, usdcCustody);
          if (usdcOptionDetail) {
            optionDetailData = await program.account.optionDetail.fetch(usdcOptionDetail);
            optionDetailAccount = usdcOptionDetail;
            custody = usdcCustody;
          }
        } catch (e2) {
          return false;
        }
      }

      if (!optionDetailAccount || !optionDetailData) {
        console.error("Option detail not found");
        return false;
      }

      console.log("Option detail data:", {
        index: optionDetailData.index.toNumber(),
        lockedAsset: optionDetailData.lockedAsset.toBase58(),
        amount: optionDetailData.amount.toString(),
        strikePrice: optionDetailData.strikePrice,
        expiredDate: new Date(optionDetailData.expiredDate.toNumber() * 1000),
        valid: optionDetailData.valid
      });

      // Determine locked custody and custody mint based on option detail
      const lockedCustody = optionDetailData.lockedAsset;
      const isCallOption = lockedCustody.equals(solCustody);

      const [lockedCustodyTokenAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody_token_account"), pool.toBuffer(), isCallOption ? WSOL_MINT.toBuffer() : USDC_MINT.toBuffer()],
        program.programId
      );

      console.log("Option type:", isCallOption ? "Call" : "Put");
      console.log("Locked custody:", lockedCustody.toBase58());
      console.log("SOL custody:", solCustody.toBase58());
      console.log("USDC custody:", usdcCustody.toBase58());

      // Get locked custody data to find oracle
      const lockedCustodyData = await program.account.custody.fetch(lockedCustody);
      const solCustodyData = await program.account.custody.fetch(solCustody);
      const lockedOracle = lockedCustodyData.oracle;
      const solOracle = solCustodyData.oracle;
      console.log("Locked oracle:", lockedOracle.toBase58());

      // Determine custody mint and locked custody mint
      const custodyMint = custody?.equals(solCustody) ? WSOL_MINT : USDC_MINT;
      const lockedCustodyMint = lockedCustody.equals(solCustody) ? WSOL_MINT : USDC_MINT;

      console.log("Custody mint:", custodyMint.toBase58());
      console.log("Locked custody mint:", lockedCustodyMint.toBase58());
      console.log("WSOL_MINT:", WSOL_MINT.toBase58());
      console.log("USDC_MINT:", USDC_MINT.toBase58());

      // Create funding account for the locked asset (where profits will be sent)
      const fundingAccount = getAssociatedTokenAddressSync(
        lockedCustodyMint,
        wallet.publicKey
      );

      console.log("Funding account:", fundingAccount.toBase58());
      console.log("Funding account owner:", wallet.publicKey.toBase58());

      // Check if funding account exists and create if needed
      const fundingAccountInfo = await connection.getAccountInfo(fundingAccount);
      let preInstructions = [];

      if (!fundingAccountInfo) {
        // Create the associated token account if it doesn't exist
        const createATAInstruction = createAssociatedTokenAccountInstruction(
          wallet.publicKey, // payer
          fundingAccount,   // ata
          wallet.publicKey, // owner
          lockedCustodyMint // mint
        );
        preInstructions.push(createATAInstruction);
        console.log("Creating funding account for mint:", lockedCustodyMint.toBase58());
      } else {
        console.log("Funding account already exists");
      }

      // Build the transaction
      const transaction = await program.methods
        .exerciseOption({
          optionIndex: new BN(optionIndex),
          poolName: "SOL/USDC"
        })
        .accountsPartial({
          owner: publicKey,
          fundingAccount: fundingAccount,
          transferAuthority: transferAuthority,
          contract: contract,
          pool: pool,
          custody: custody,
          user: user,
          optionDetail: optionDetailAccount,
          lockedCustody: lockedCustody,
          lockedOracle: lockedOracle,
          custodyOracle: solOracle,
          lockedCustodyTokenAccount: lockedCustodyTokenAccount,
          custodyMint: custodyMint,
          lockedCustodyMint: lockedCustodyMint,
        })
        .transaction();

      // Add pre-instructions if any (like creating ATA)
      if (preInstructions.length > 0) {
        transaction.instructions = [...preInstructions, ...transaction.instructions];
      }

      const latestBlockHash = await connection.getLatestBlockhash();

      // Optional: Simulate transaction for debugging
      transaction.feePayer = publicKey;
      const result = await connection.simulateTransaction(transaction);
      console.log("Simulation result:", result);

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });

      console.log("Option exercised successfully, signature:", signature);

      // After successful transaction
      await refreshPositions();
      return true;

    } catch (error) {
      console.error("Error exercising option:", error);
      return false;
    }
  };

  const onAddLiquidity = async (
    amount: number,
    program: Program<OptionContract>,
    asset: PublicKey
  ) => {
    try {
      if (!program || !publicKey) return;
      if (!wallet) return;

      const [pool] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from("SOL/USDC")],
        program.programId
      );
      const [custody] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), pool.toBuffer(), asset.toBuffer()],
        program.programId
      );
      const poolData = await program.account.pool.fetch(pool);
      const custodyData = await program.account.custody.fetch(custody);
      const fundingAccount = getAssociatedTokenAddressSync(
        asset,
        wallet.publicKey
      );
      let custodies = [];
      let oracles = [];
      for await (let custody of poolData.custodies) {
        let c = await program.account.custody.fetch(new PublicKey(custody));
        let ora = c.oracle;
        custodies.push({ pubkey: custody, isSigner: false, isWritable: true });
        oracles.push({ pubkey: ora, isSigner: false, isWritable: true });
      }

      const remainingAccounts = custodies.concat(oracles);

      const transaction = await program.methods
        .addLiquidity({
          amountIn: new BN(amount),
          minLpAmountOut: new BN(1),
          poolName: "SOL/USDC",
        })
        .accountsPartial({
          owner: publicKey,
          fundingAccount: fundingAccount,
          custodyMint: asset,
          custodyOracleAccount: custodyData.oracle,
        })
        .remainingAccounts(remainingAccounts)
        .transaction();
      const latestBlockHash = await connection.getLatestBlockhash();
      // transaction.feePayer = publicKey;
      // let result = await connection.simulateTransaction(transaction);
      // console.log("result", result);
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });
      return true;
    } catch (e) {
      console.log("Error", e);
      return false;
    }
  };

  const onRemoveLiquidity = async (
    amount: number,
    program: Program<OptionContract>,
    asset: PublicKey
  ) => {
    try {
      if (!program || !publicKey) return;
      if (!wallet) return;

      const [pool] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from("SOL/USDC")],
        program.programId
      );
      const [custody] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), pool.toBuffer(), asset.toBuffer()],
        program.programId
      );
      const poolData = await program.account.pool.fetch(pool);

      const custodyData = await program.account.custody.fetch(custody);
      const receivingAccount = getAssociatedTokenAddressSync(
        asset,
        wallet.publicKey
      );
      let custodies = [];
      let oracles = [];
      for await (let custody of poolData.custodies) {
        let c = await program.account.custody.fetch(new PublicKey(custody));
        let ora = c.oracle;
        custodies.push({ pubkey: custody, isSigner: false, isWritable: true });
        oracles.push({ pubkey: ora, isSigner: false, isWritable: true });
      }
      const [poolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from("SOL/USDC")],
        program.programId
      );
      const [contract] = PublicKey.findProgramAddressSync(
        [Buffer.from("contract")],
        program.programId
      );
      const [transferAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("transfer_authority")],
        program.programId
      );
      const [CustodyPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), pool.toBuffer(), asset.toBuffer()],
        program.programId
      );
      const [custodyTokenAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("custody_token_account"),
          pool.toBuffer(),
          asset.toBuffer(),
        ],
        program.programId
      );
      const [lpTokenMint] = PublicKey.findProgramAddressSync(
        [Buffer.from("lp_token_mint"), Buffer.from("SOL/USDC")],
        program.programId
      );
      const lpTokenAccount = getAssociatedTokenAddressSync(
        lpTokenMint,
        wallet.publicKey
      );
      const remainingAccounts = custodies.concat(oracles);

      const transaction = await program.methods
        .removeLiquidity({
          lpAmountIn: new BN(amount),
          minAmountOut: new BN(0),
          poolName: "SOL/USDC",
        })
        .accountsPartial({
          owner: publicKey,
          receivingAccount: receivingAccount,
          transferAuthority: transferAuthority,
          contract: contract,
          pool: poolPDA,
          custody: CustodyPDA,
          custodyOracleAccount: WSOL_ORACLE,
          custodyTokenAccount: custodyTokenAccount,
          lpTokenMint: lpTokenMint,
          lpTokenAccount: lpTokenAccount,
          custodyMint: asset,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .remainingAccounts(remainingAccounts)
        .transaction();
      const latestBlockHash = await connection.getLatestBlockhash();
      // transaction.feePayer = publicKey;
      // let result = await connection.simulateTransaction(transaction);
      // console.log("result", result);
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });
      return true;
    } catch (e) {
      console.log("Error", e);
      return false;
    }
  };

  const getPoolFees = async () => {
    try {
      if (!program || !publicKey) return null;

      const [pool] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from("SOL/USDC")],
        program.programId
      );

      const [custody] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), pool.toBuffer(), WSOL_MINT.toBuffer()],
        program.programId
      );

      const custodyData = await program.account.custody.fetch(custody);

      // The fees are stored in the contract as basis points (1 basis point = 0.01%)
      // We need to convert them to percentages for display
      const fees = {
        ratioMultiplier: custodyData.fees.ratioMult.toString(),
        addLiquidityFee: custodyData.fees.addLiquidity.toString(),
        removeLiquidityFee: custodyData.fees.removeLiquidity.toString()
      };

      return fees;
    } catch (error) {
      console.error("Error fetching pool fees:", error);
      return null;
    }
  };

  useEffect(() => {
    (async () => {
      let provider: Provider;
      if (wallet && publicKey) {
        try {
          provider = getProvider();
        } catch {
          provider = new AnchorProvider(connection, wallet, {});
        }

        const program = new Program<OptionContract>(
          idl as OptionContract,
          provider
        );
        setProgram(program);
        setPubKey(publicKey);

        // Initial refresh only when wallet/provider changes
        await refreshPositions();
        await getCustodies(program);
      }
    })();
  }, [wallet, publicKey]);

  useEffect(() => {
    (async () => {
      await refreshVolumeData();
    })();
  }, [perpPositions, positions]);

  return (
    <ContractContext.Provider
      value={{
        program,
        pub,
        getCustodies,
        getDetailInfos,
        onOpenLimitOption,
        onCloseLimitOption,
        onOpenOption,
        onEditOption,
        onCloseOption,
        onClaimOption,
        onExerciseOption,
        onOpenPerp,
        onClosePerp,
        onAddCollateral,
        onRemoveCollateral,
        onAddLiquidity,
        onRemoveLiquidity,
        getOptionDetailAccount,
        getPoolFees,
        positions,
        expiredPositions,
        donePositions,
        perpPositions,
        refreshPositions,
        refreshPerpPositions,
        positionsLoading,
        poolData,
        getPoolUtilization,
        volumeData,
        getVolumeData,
        refreshVolumeData
      }}
    >
      {children}
    </ContractContext.Provider>
  );
};