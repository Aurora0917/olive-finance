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
import { formatDate, Transaction } from "@/lib/data/WalletActivity";
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

interface ContractContextType {
  program: Program<OptionContract> | undefined;
  pub: PublicKey | undefined;
  getCustodies: Function;
  getDetailInfos: Function;
  onOpenLimitOption: Function;
  onCloseLimitOption: Function;
  onOpenOption: Function;
  onCloseOption: Function;
  onClaimOption: Function;
  onExerciseOption: Function;
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
  refreshPositions: () => Promise<void>;
  positionsLoading: boolean;
}

export const ContractContext = createContext<ContractContextType>({
  program: undefined,
  pub: undefined,
  getCustodies: () => { },
  getDetailInfos: () => { },
  onOpenLimitOption: async () => { },
  onCloseLimitOption: () => { },
  onOpenOption: async () => { },
  onCloseOption: () => { },
  onClaimOption: () => { },
  onExerciseOption: () => { },
  onAddLiquidity: () => { },
  onRemoveLiquidity: () => { },
  getOptionDetailAccount: () => { },
  getPoolFees: async () => null,
  positions: [],
  expiredPositions: [],
  donePositions: [],
  refreshPositions: async () => { },
  positionsLoading: false,
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
  const [positionsLoading, setPositionsLoading] = useState<boolean>(false);

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
      return [custodies, ratios];
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

    for (let i = 1; i <= optionIndex; i++) {
      try {
        // Try to find option detail with both possible custodies
        let optionDetailAccount;
        let detail;
        let actualCustody;

        // First try SOL custody
        try {
          const solOptionDetail = getOptionDetailAccount(i, pool, solCustody);
          if (solOptionDetail) {
            detail = await program.account.optionDetail.fetch(solOptionDetail);
            optionDetailAccount = solOptionDetail;
            actualCustody = solCustody;
          }
        } catch (e) {
          // If SOL fails, try USDC custody
          try {
            const usdcOptionDetail = getOptionDetailAccount(i, pool, usdcCustody);
            if (usdcOptionDetail) {
              detail = await program.account.optionDetail.fetch(usdcOptionDetail);
              optionDetailAccount = usdcOptionDetail;
              actualCustody = usdcCustody;
            }
          } catch (e2) {
            console.log(`Failed to fetch option ${i} with both custodies:`, e2);
            continue;
          }
        }

        if (!detail || !optionDetailAccount) continue;

        // 1. Option type is determined by what's locked by the protocol
        const isCallOption = detail.lockedAsset.equals(solCustody);   // SOL locked = Call
        const isPutOption = detail.lockedAsset.equals(usdcCustody);   // USDC locked = Put
        const optionType = isCallOption ? "Call" : "Put";

        // 2. Token/symbol/logo is determined by what the USER PAID (premiumAsset)
        const isPremiumSOL = detail.premiumAsset.equals(solCustody);
        const isPremiumUSDC = detail.premiumAsset.equals(usdcCustody);

        const token = isPremiumSOL ? "SOL" : "USDC";
        const symbol = isPremiumSOL ? "SOL" : "USDC";
        const logo = isPremiumSOL ? "/images/solana.png" : "/images/usdc.png";

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
            custodyUsed: actualCustody!.toBase58(),
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
        console.log(`Error processing option index ${i}:`, e);
        continue;
      }
    }

    console.log("Final results:", {
      activeOptions: pinfo.length,
      expiredOptions: expiredpinfo.length,
      doneOptions: doneInfo.length
    });

    return [pinfo, expiredpinfo, doneInfo];
  };

  const refreshPositions = useCallback(async () => {
    if (program && publicKey) {
      setPositionsLoading(true);
      try {
        const [pinfo, expiredpinfo, doneinfo] = await getDetailInfos(
          program,
          publicKey
        );
        setPositions(pinfo);
        setExpiredPositions(expiredpinfo);
        setDonePositions(doneinfo);
      } catch (error) {
        console.error("Error refreshing positions:", error);
      } finally {
        setPositionsLoading(false);
      }
    }
  }, [program, publicKey]);

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
    // } catch (e) {
    //   console.log("error", e);
    //   return false;
    // }
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
          console.error(`Failed to fetch option ${optionIndex} with both custodies:`, e2);
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
          console.error(`Failed to fetch option ${optionIndex} with both custodies:`, e2);
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
          console.error(`Failed to fetch option ${optionIndex} with both custodies:`, e2);
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
      }
    })();
  }, [wallet, publicKey]);

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
        onCloseOption,
        onClaimOption,
        onExerciseOption,
        onAddLiquidity,
        onRemoveLiquidity,
        getOptionDetailAccount,
        getPoolFees,
        positions,
        expiredPositions,
        donePositions,
        refreshPositions,
        positionsLoading,
      }}
    >
      {children}
    </ContractContext.Provider>
  );
};
