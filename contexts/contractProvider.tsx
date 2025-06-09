"use client";

import { getPythPrice, usePythPrice } from "@/hooks/usePythPrice";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
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
  onOpenOption: Function;
  onCloseOption: Function;
  onClaimOption: Function;
  onExerciseOption: Function;
  onAddLiquidity: Function;
  onRemoveLiquidity: Function;
  getOptionDetailAccount: Function;
}

export const ContractContext = createContext<ContractContextType>({
  program: undefined,
  pub: undefined,
  getCustodies: () => { },
  getDetailInfos: () => { },
  onOpenOption: async () => { },
  onCloseOption: () => { },
  onClaimOption: () => { },
  onExerciseOption: () => { },
  onAddLiquidity: () => { },
  onRemoveLiquidity: () => { },
  getOptionDetailAccount: () => { },
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
        [Buffer.from("pool"), Buffer.from("SOL-USDC-V2")],
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
      [Buffer.from("pool"), Buffer.from("SOL-USDC-V2")],
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
          optionSize = detail.amount.toNumber() / (10 ** WSOL_DECIMALS);
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

        // console.log(`Option ${i} Analysis:`, {
        //   optionType,
        //   lockedAsset: detail.lockedAsset.toBase58(),
        //   premiumAsset: detail.premiumAsset.toBase58(),
        //   paidWith: token,
        //   solCustody: solCustody.toBase58(),
        //   usdcCustody: usdcCustody.toBase58(),
        //   optionSize,
        //   strikePrice,
        //   currentPrice,
        //   pnl
        // });

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
            size: detail.amount.toNumber() / (10 ** WSOL_DECIMALS),                // Size in SOL units (underlying asset)
            pnl: pnl,
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
          detail?.valid
        ) {
          // Expired options
          const expiryPrice = await getPythPrice(
            "Crypto.SOL/USD",
            detail?.expiredDate.toNumber()
          );

          // Calculate profit at expiry in USD
          let profitAtExpiry;
          if (isCallOption) {
            // Call profit: max(expiryPrice - strikePrice, 0) * size
            profitAtExpiry = Math.max((expiryPrice || 0) - strikePrice, 0) * optionSize;
          } else {
            // Put profit: max(strikePrice - expiryPrice, 0) * size  
            profitAtExpiry = Math.max(strikePrice - (expiryPrice || 0), 0) * optionSize;
          }

          expiredpinfo.push({
            index: detail.index.toNumber(),
            token: token,                    // What user PAID with
            iconPath: logo,                  // Logo matches payment currency
            symbol: symbol,                  // Symbol matches payment currency
            strikePrice: strikePrice,
            qty: 100, // You might want to adjust this to optionSize * 100
            expiryPrice: expiryPrice || 0,
            transaction: optionType,         // "Call" or "Put"
            tokenAmount: optionSize,         // Size in SOL units
            dollarAmount: profitAtExpiry,    // Profit in USD
          });
        } else {
          // Exercised/closed options
          doneInfo.push({
            transactionID: `SOL-${formatDate(
              new Date(detail.exercised * 1000)
            )}-${strikePrice}-${optionType.charAt(0)}`,
            token: coins[0],
            transactionType: optionType,
            optionType: "American",
            strikePrice: strikePrice,
            expiry: format(new Date(detail.exercised), "dd MMM, yyyy HH:mm:ss"),
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
      [Buffer.from("pool"), Buffer.from("SOL-USDC-V2")],
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
        poolName: "SOL-USDC-V2",
      })
      .accountsPartial({
        owner: publicKey,
        fundingAccount: fundingAccount,
        custodyMint: WSOL_MINT,
        payCustodyMint: paySol ? WSOL_MINT : USDC_MINT,
        custodyOracleAccount: new PublicKey(
          "J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix"
        ),
        payCustodyOracleAccount: paySol
          ? new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix")
          : new PublicKey("5SSkXsEKQepHHAewytPVwdej4epN1nxgLVM84L4KXgy7"),
        lockedCustodyMint: isCall ? WSOL_MINT : USDC_MINT,
        optionDetail: optionDetailAccount,
        payCustodyTokenAccount: paycustodyData.tokenAccount,
      })
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
    // } catch (e) {
    //   console.log("error", e);
    //   return false;
    // }
  };

  const onCloseOption = async (optionIndex: number) => {
    try {
      if (!program || !publicKey || !connected || !wallet) return;
      const [pool] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from("SOL-USDC-V2")],
        program.programId
      );
      const [custody] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), pool.toBuffer(), WSOL_MINT.toBuffer()],
        program.programId
      );
      const [lockedCustody] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), pool.toBuffer(), WSOL_MINT.toBuffer()],
        program.programId
      );
      const [payCustody] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), pool.toBuffer(), WSOL_MINT.toBuffer()],
        program.programId
      );
      const [payCustodyTokenAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("custody_token_account"),
          pool.toBuffer(),
          WSOL_MINT.toBuffer(),
        ],
        program.programId
      );

      const [wsolCustody] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), pool.toBuffer(), WSOL_MINT.toBuffer()],
        program.programId
      );
      const [optionDetail] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("option"),
          publicKey.toBuffer(),
          new BN(optionIndex).toArrayLike(Buffer, "le", 8),
          pool.toBuffer(),
          wsolCustody.toBuffer(),
        ],
        program.programId
      );

      const optionDetailAccount = getOptionDetailAccount(
        optionIndex,
        pool,
        custody
      );
      if (!optionDetailAccount) return;
      const optionDetailAccountData = await program.account.optionDetail.fetch(
        optionDetailAccount
      );

      const fundingAccount = getAssociatedTokenAddressSync(
        optionDetailAccountData.premiumAsset.equals(custody)
          ? WSOL_MINT
          : USDC_MINT,
        wallet.publicKey
      );

      const custodyData = await program.account.custody.fetch(custody);
      const payCustodyData = await program.account.custody.fetch(payCustody);

      const custodyOracleAccount = custodyData.oracle;
      const payCustodyOracleAccount = payCustodyData.oracle;

      const transaction = await program.methods
        .closeOption({ optionIndex: new BN(optionIndex), poolName: "SOL-USDC-V2" })
        .accountsPartial({
          owner: publicKey,
          fundingAccount,
          custodyMint: WSOL_MINT,
          payCustodyMint: WSOL_MINT,
          payCustodyTokenAccount: payCustodyTokenAccount,
          optionDetail: optionDetail,
          lockedCustody: lockedCustody,
          payCustody: payCustody,
          custodyOracleAccount: custodyOracleAccount,
          payCustodyOracleAccount: payCustodyOracleAccount,
        })
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

  const onClaimOption = async (optionIndex: number, solPrice: number) => {
    try {
      if (!program || !publicKey || !connected || !wallet) return;
      const [pool] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from("SOL-USDC-V2")],
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
      return true;
    } catch (e) {
      console.log("Error", e);
      return false;
    }
  };

  const onExerciseOption = async (optionIndex: number) => {
    if (!program || !optionIndex || !publicKey || !connected || !wallet) return;
    const [pool] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), Buffer.from("SOL-USDC-V2")],
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
      .exerciseOption(new BN(optionIndex))
      .accountsPartial({
        owner: publicKey,
      })
      .transaction();
    const latestBlockHash = await connection.getLatestBlockhash();
    // transaction.feePayer = publicKey;
    // let result = await connection.simulateTransaction(transaction);
    //   console.log("result", result)
    const signature = await sendTransaction(transaction, connection);
    await connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: signature,
    });
    return true;
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
        [Buffer.from("pool"), Buffer.from("SOL-USDC-V2")],
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
          poolName: "SOL-USDC-V2",
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
        [Buffer.from("pool"), Buffer.from("SOL-USDC-V2")],
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
        [Buffer.from("pool"), Buffer.from("SOL-USDC-V2")],
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
        [Buffer.from("lp_token_mint"), Buffer.from("SOL-USDC-V2")],
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
          poolName: "SOL-USDC-V2",
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
      }
    })();
  }, [wallet]);

  return (
    <ContractContext.Provider
      value={{
        program,
        pub,
        getCustodies,
        getDetailInfos,
        onOpenOption,
        onCloseOption,
        onClaimOption,
        onExerciseOption,
        onAddLiquidity,
        onRemoveLiquidity,
        getOptionDetailAccount,
      }}
    >
      {children}
    </ContractContext.Provider>
  );
};
