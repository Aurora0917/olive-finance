/* eslint-disable @typescript-eslint/no-unsafe-function-type */
"use client";

import { usePythPrice } from "@/hooks/usePythPrice";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  createContext,
  useCallback,
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
import { Transaction, FuturePos } from "@/lib/data/WalletActivity";
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

import { PerpTPSL } from "@/types/trading";
import { PDAs } from "@/utils/pdas";
import { TransactionBuilder } from "@/utils/transactionBuilder";

// Import your existing toast hook
import { useToastActions } from "@/components/ToastSystem"; // Adjust path as needed

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
  volume24h: number;
  optionsCount24h: number;
  perpsCount24h: number;
  callCount: number;
  putCount: number;
  longCount: number;
  shortCount: number;
  callCount24h: number;
  putCount24h: number;
  optionVolume24h: number;
  perpVolume24h: number;
  lastUpdated: number;
}

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

interface ContractContextType {
  program: Program<OptionContract> | undefined;
  pub: PublicKey | undefined;
  onOpenLimitOption: Function;
  onCloseLimitOption: Function;
  onOpenOption: Function;
  onEditOption: Function;
  onCloseOption: Function;
  onClaimOption: Function;
  onExerciseOption: Function;
  onOpenPerp: Function;
  onClosePerp: Function;
  onCancelLimitPerp: Function;
  onAddCollateral: Function;
  onRemoveCollateral: Function;
  onAddLiquidity: Function;
  onRemoveLiquidity: Function;
  onSetTpSl: Function;
  onUpdateTpSl: Function;
  onRemoveTpSl: Function;
  getOptionDetailAccount: Function;
}

export const ContractContext = createContext<ContractContextType>({
  program: undefined,
  pub: undefined,
  onOpenLimitOption: async () => { },
  onCloseLimitOption: () => { },
  onOpenOption: async () => { },
  onEditOption: async () => { },
  onCloseOption: () => { },
  onClaimOption: () => { },
  onExerciseOption: () => { },
  onOpenPerp: async () => { },
  onClosePerp: async () => { },
  onCancelLimitPerp: async () => { },
  onAddCollateral: async () => { },
  onRemoveCollateral: async () => { },
  onAddLiquidity: () => { },
  onRemoveLiquidity: () => { },
  onSetTpSl: async () => false,
  onUpdateTpSl: async () => false,
  onRemoveTpSl: async () => false,
  getOptionDetailAccount: () => { },
});

export const clusterUrl = "https://api.devnet.solana.com";
export const connection = new Connection(clusterUrl, "confirmed");

export const ContractProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { priceData } = usePythPrice("Crypto.SOL/USD");
  const { connected, publicKey, sendTransaction } = useWallet();
  const wallet = useAnchorWallet();
  const [program, setProgram] = useState<Program<OptionContract>>();
  const [pub, setPubKey] = useState<PublicKey>();

  // Initialize toast actions
  const { 
    showSuccess, 
    showError, 
    showInfo, 
    showWarning,
    showTransactionProgress,
    updateTransactionStep,
    hideTransactionProgress 
  } = useToastActions();

  // ===============================
  // UTILITY FUNCTIONS
  // ===============================

  const getOptionDetailAccount = useCallback((
    index: number,
    pool: PublicKey,
    custody: PublicKey
  ) => {
    if (connected && publicKey != null && program && wallet != undefined) {
      return PDAs.getOptionDetail(publicKey, index, pool, custody, program.programId);
    }
  }, [connected, publicKey, program, wallet]);

  const getPoolFees = useCallback(async () => {
    try {
      if (!program || !publicKey) return null;

      const pool = PDAs.getPool("SOL/USDC", program.programId);
      const custody = PDAs.getCustody(pool, WSOL_MINT, program.programId);

      const custodyData = await program.account.custody.fetch(custody);

      return {
        ratioMultiplier: custodyData.fees.ratioMult.toString(),
        addLiquidityFee: custodyData.fees.addLiquidity.toString(),
        removeLiquidityFee: custodyData.fees.removeLiquidity.toString()
      };
    } catch (error) {
      console.error("Error fetching pool fees:", error);
      showError("Failed to fetch pool fees", "Please try again later");
      return null;
    }
  }, [program, publicKey, showError]);

  // ===============================
  // OPTION TRADING FUNCTIONS
  // ===============================

  const onOpenOption = useCallback(async (
    amount: number,
    strike: number,
    period: number,
    expiredTime: number,
    isCall: boolean,
    paySol: boolean
  ) => {
    try {
      if (!program || !publicKey || !connected || !wallet) {
        showError("Wallet not connected", "Please connect your wallet to continue");
        return false;
      }

      showTransactionProgress("Opening Option Position", [
        { id: 'prepare', label: 'Preparing transaction' },
        { id: 'sign', label: 'Waiting for signature' },
        { id: 'execute', label: 'Executing transaction' },
        { id: 'confirm', label: 'Confirming on blockchain' }
      ]);

      updateTransactionStep('prepare', 'loading');

      const pool = PDAs.getPool("SOL/USDC", program.programId);
      const custody = PDAs.getCustody(pool, WSOL_MINT, program.programId);
      const userPDA = PDAs.getUser(publicKey, program.programId);

      let optionIndex;
      try {
        const userInfo = await program.account.user.fetch(userPDA);
        optionIndex = userInfo.optionIndex.toNumber() + 1;
      } catch {
        optionIndex = 1;
      }

      const optionDetailAccount = getOptionDetailAccount(optionIndex, pool, custody);
      if (!optionDetailAccount) {
        updateTransactionStep('prepare', 'error');
        hideTransactionProgress();
        showError("Failed to prepare transaction", "Could not generate option detail account");
        return false;
      }

      const fundingAccount = getAssociatedTokenAddressSync(
        paySol ? WSOL_MINT : USDC_MINT,
        wallet.publicKey
      );

      const paycustody = PDAs.getCustody(pool, paySol ? WSOL_MINT : USDC_MINT, program.programId);
      const paycustodyData = await program.account.custody.fetch(paycustody);

      updateTransactionStep('prepare', 'completed');
      updateTransactionStep('sign', 'loading');

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
          custodyOracleAccount: new PublicKey(WSOL_ORACLE),
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

      updateTransactionStep('sign', 'completed');
      updateTransactionStep('execute', 'loading');

      const signature = await sendTransaction(transaction, connection);
      
      updateTransactionStep('execute', 'completed');
      updateTransactionStep('confirm', 'loading');

      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });

      updateTransactionStep('confirm', 'completed');

      setTimeout(() => {
        hideTransactionProgress();
        showSuccess(
          "Option Position Opened!",
          `${isCall ? 'Call' : 'Put'} option created successfully`,
          {
            label: "View on Solscan",
            onClick: () => window.open(`https://solscan.io/tx/${signature}?cluster=devnet`, '_blank')
          }
        );
      }, 1500);

      return true;
    } catch (e) {
      console.log("Error opening option:", e);
      hideTransactionProgress();
      showError("Option Creation Failed", "Please check your balance and try again");
      return false;
    }
  }, [program, publicKey, connected, wallet, sendTransaction, getOptionDetailAccount, showError, showSuccess, showTransactionProgress, updateTransactionStep, hideTransactionProgress]);

  const onOpenLimitOption = useCallback(async (
    amount: number,
    strike: number,
    period: number,
    expiredTime: number,
    isCall: boolean,
    paySol: boolean,
    limitPrice: number
  ) => {
    try {
      if (!program || !publicKey || !connected || !wallet) {
        showError("Wallet not connected", "Please connect your wallet to continue");
        return false;
      }

      showTransactionProgress("Opening Limit Option Position", [
        { id: 'prepare', label: 'Preparing limit order' },
        { id: 'sign', label: 'Waiting for signature' },
        { id: 'execute', label: 'Executing transaction' },
        { id: 'confirm', label: 'Confirming on blockchain' }
      ]);

      updateTransactionStep('prepare', 'loading');

      const pool = PDAs.getPool("SOL/USDC", program.programId);
      const custody = PDAs.getCustody(pool, WSOL_MINT, program.programId);
      const userPDA = PDAs.getUser(publicKey, program.programId);

      let optionIndex;
      try {
        const userInfo = await program.account.user.fetch(userPDA);
        optionIndex = userInfo.optionIndex.toNumber() + 1;
      } catch {
        optionIndex = 1;
      }

      const optionDetailAccount = getOptionDetailAccount(optionIndex, pool, custody);
      if (!optionDetailAccount) {
        updateTransactionStep('prepare', 'error');
        hideTransactionProgress();
        showError("Failed to prepare transaction", "Could not generate option detail account");
        return false;
      }

      const fundingAccount = getAssociatedTokenAddressSync(
        paySol ? WSOL_MINT : USDC_MINT,
        wallet.publicKey
      );

      const paycustody = PDAs.getCustody(pool, paySol ? WSOL_MINT : USDC_MINT, program.programId);
      const paycustodyData = await program.account.custody.fetch(paycustody);

      updateTransactionStep('prepare', 'completed');
      updateTransactionStep('sign', 'loading');

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
          custodyOracleAccount: new PublicKey(WSOL_ORACLE),
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

      updateTransactionStep('sign', 'completed');
      updateTransactionStep('execute', 'loading');

      const signature = await sendTransaction(transaction, connection);
      
      updateTransactionStep('execute', 'completed');
      updateTransactionStep('confirm', 'loading');

      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });

      updateTransactionStep('confirm', 'completed');

      setTimeout(() => {
        hideTransactionProgress();
        showSuccess(
          "Limit Option Created!",
          `Limit order placed at $${limitPrice}`,
          {
            label: "View on Solscan",
            onClick: () => window.open(`https://solscan.io/tx/${signature}?cluster=devnet`, '_blank')
          }
        );
      }, 1500);

      return true;
    } catch (e) {
      console.log("Error opening limit option:", e);
      hideTransactionProgress();
      showError("Limit Option Creation Failed", "Please check your parameters and try again");
      return false;
    }
  }, [program, publicKey, connected, wallet, sendTransaction, getOptionDetailAccount, showError, showSuccess, showTransactionProgress, updateTransactionStep, hideTransactionProgress]);

  const onEditOption = useCallback(async (params: {
    optionIndex: number;
    poolName: string;
    newSize?: number;
    newStrike?: number;
    newExpiry?: number;
    maxAdditionalPremium?: number;
    minRefundAmount?: number;
    paymentToken?: 'SOL' | 'USDC';
  }) => {
    try {
      if (!program || !publicKey || !connected || !wallet) {
        showError("Wallet not connected", "Please connect your wallet to continue");
        return false;
      }

      showTransactionProgress("Editing Option Position", [
        { id: 'validate', label: 'Validating position' },
        { id: 'prepare', label: 'Preparing edit transaction' },
        { id: 'sign', label: 'Waiting for signature' },
        { id: 'execute', label: 'Executing transaction' },
        { id: 'confirm', label: 'Confirming on blockchain' }
      ]);

      updateTransactionStep('validate', 'loading');

      const pool = PDAs.getPool(params.poolName, program.programId);
      const contract = PDAs.getContract(program.programId);
      const transferAuthority = PDAs.getTransferAuthority(program.programId);
      const user = PDAs.getUser(publicKey, program.programId);
      const solCustody = PDAs.getCustody(pool, WSOL_MINT, program.programId);
      const usdcCustody = PDAs.getCustody(pool, USDC_MINT, program.programId);

      let optionDetailAccount;
      let optionDetailData;
      let custody;

      try {
        const solOptionDetail = PDAs.getOptionDetail(publicKey, params.optionIndex, pool, solCustody, program.programId);
        optionDetailData = await program.account.optionDetail.fetch(solOptionDetail);
        optionDetailAccount = solOptionDetail;
        custody = solCustody;
      } catch (e) {
        try {
          const usdcOptionDetail = PDAs.getOptionDetail(publicKey, params.optionIndex, pool, usdcCustody, program.programId);
          optionDetailData = await program.account.optionDetail.fetch(usdcOptionDetail);
          optionDetailAccount = usdcOptionDetail;
          custody = usdcCustody;
        } catch (e2) {
          updateTransactionStep('validate', 'error');
          hideTransactionProgress();
          showError("Option not found", "Could not find the specified option position");
          return false;
        }
      }

      if (!optionDetailAccount || !optionDetailData || !custody) {
        updateTransactionStep('validate', 'error');
        hideTransactionProgress();
        showError("Option validation failed", "Could not validate option position");
        return false;
      }

      if (!optionDetailData.owner.equals(publicKey)) {
        updateTransactionStep('validate', 'error');
        hideTransactionProgress();
        showError("Permission denied", "You don't own this option position");
        return false;
      }

      updateTransactionStep('validate', 'completed');
      updateTransactionStep('prepare', 'loading');

      const selectedPaymentToken = params.paymentToken || 'USDC';
      const payCustody = selectedPaymentToken === 'SOL' ? solCustody : usdcCustody;
      const payCustodyMint = selectedPaymentToken === 'SOL' ? WSOL_MINT : USDC_MINT;
      const lockedAsset = optionDetailData.lockedAsset;
      const isLockedSOL = lockedAsset.equals(solCustody);
      const lockedCustodyMint = isLockedSOL ? WSOL_MINT : USDC_MINT;
      const custodyMint = custody.equals(solCustody) ? WSOL_MINT : USDC_MINT;

      const payCustodyTokenAccount = PDAs.getCustodyTokenAccount(pool, payCustodyMint, program.programId);
      const fundingAccount = getAssociatedTokenAddressSync(payCustodyMint, publicKey);
      const refundAccount = getAssociatedTokenAddressSync(payCustodyMint, publicKey);

      const isPremiumSOL = selectedPaymentToken === 'SOL';
      const payCustodyOracleAccount = isPremiumSOL
        ? new PublicKey(WSOL_ORACLE)
        : new PublicKey(USDC_ORACLE);
      const custodyOracleAccount = custody.equals(solCustody)
        ? new PublicKey(WSOL_ORACLE)
        : new PublicKey(USDC_ORACLE);

      updateTransactionStep('prepare', 'completed');
      updateTransactionStep('sign', 'loading');

      const transaction = await program.methods
        .editOption({
          optionIndex: new BN(params.optionIndex),
          poolName: params.poolName,
          newStrike: params.newStrike ? params.newStrike : null,
          newExpiry: params.newExpiry ? new BN(params.newExpiry) : null,
          newSize: params.newSize ? params.newSize : null,
          maxAdditionalPremium: new BN(Math.floor(params.maxAdditionalPremium || 0)),
          minRefundAmount: new BN(Math.floor(params.minRefundAmount || 0)),
        })
        .accountsPartial({
          owner: publicKey,
          fundingAccount: fundingAccount,
          refundAccount: refundAccount,
          transferAuthority: transferAuthority,
          contract: contract,
          pool: pool,
          user: user,
          custodyMint: custodyMint,
          payCustodyMint: payCustodyMint,
          lockedCustodyMint: lockedCustodyMint,
          custody: custody,
          payCustody: payCustody,
          lockedCustody: lockedAsset,
          payCustodyTokenAccount: payCustodyTokenAccount,
          optionDetail: optionDetailAccount,
          custodyOracleAccount: custodyOracleAccount,
          payCustodyOracleAccount: payCustodyOracleAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      const latestBlockHash = await connection.getLatestBlockhash();
      transaction.feePayer = publicKey;

      updateTransactionStep('sign', 'completed');
      updateTransactionStep('execute', 'loading');

      const signature = await sendTransaction(transaction, connection);
      
      updateTransactionStep('execute', 'completed');
      updateTransactionStep('confirm', 'loading');

      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });

      updateTransactionStep('confirm', 'completed');

      setTimeout(() => {
        hideTransactionProgress();
        showSuccess(
          "Option Position Edited!",
          "Your option parameters have been updated successfully",
          {
            label: "View on Solscan",
            onClick: () => window.open(`https://solscan.io/tx/${signature}?cluster=devnet`, '_blank')
          }
        );
      }, 1500);

      return true;
    } catch (error) {
      console.error("Error editing option:", error);
      hideTransactionProgress();
      showError("Edit Failed", "Could not edit option position. Please try again.");
      return false;
    }
  }, [program, publicKey, connected, wallet, sendTransaction, showError, showSuccess, showTransactionProgress, updateTransactionStep, hideTransactionProgress]);

  const onCloseOption = useCallback(async (optionIndex: number, closeQuantity: number) => {
    try {
      if (!program || !publicKey || !connected || !wallet) {
        showError("Wallet not connected", "Please connect your wallet to continue");
        return false;
      }

      showTransactionProgress("Closing Option Position", [
        { id: 'validate', label: 'Finding option position' },
        { id: 'prepare', label: 'Preparing close transaction' },
        { id: 'sign', label: 'Waiting for signature' },
        { id: 'execute', label: 'Executing transaction' },
        { id: 'confirm', label: 'Confirming on blockchain' }
      ]);

      updateTransactionStep('validate', 'loading');

      const pool = PDAs.getPool("SOL/USDC", program.programId);
      const solCustody = PDAs.getCustody(pool, WSOL_MINT, program.programId);
      const usdcCustody = PDAs.getCustody(pool, USDC_MINT, program.programId);

      let optionDetailAccount;
      let optionDetailData;
      let custody;

      try {
        const solOptionDetail = getOptionDetailAccount(optionIndex, pool, solCustody);
        if (solOptionDetail) {
          optionDetailData = await program.account.optionDetail.fetch(solOptionDetail);
          optionDetailAccount = solOptionDetail;
          custody = solCustody;
        }
      } catch (e) {
        try {
          const usdcOptionDetail = getOptionDetailAccount(optionIndex, pool, usdcCustody);
          if (usdcOptionDetail) {
            optionDetailData = await program.account.optionDetail.fetch(usdcOptionDetail);
            optionDetailAccount = usdcOptionDetail;
            custody = usdcCustody;
          }
        } catch (e2) {
          updateTransactionStep('validate', 'error');
          hideTransactionProgress();
          showError("Option not found", "Could not find the specified option position");
          return false;
        }
      }

      if (!optionDetailData || !optionDetailAccount) {
        updateTransactionStep('validate', 'error');
        hideTransactionProgress();
        showError("Option validation failed", "Could not validate option position");
        return false;
      }

      if (closeQuantity <= 0 || closeQuantity > optionDetailData.quantity.toNumber()) {
        updateTransactionStep('validate', 'error');
        hideTransactionProgress();
        showError("Invalid quantity", "Close quantity must be between 1 and your position size");
        return false;
      }

      updateTransactionStep('validate', 'completed');
      updateTransactionStep('prepare', 'loading');

      const lockedAsset = optionDetailData.lockedAsset;
      const premiumAsset = optionDetailData.premiumAsset;
      const isCallOption = lockedAsset.equals(solCustody);
      const lockedCustody = lockedAsset;
      const payCustody = premiumAsset;
      const lockedCustodyMint = isCallOption ? WSOL_MINT : USDC_MINT;
      const isPremiumSOL = premiumAsset.equals(solCustody);
      const payCustodyMint = isPremiumSOL ? WSOL_MINT : USDC_MINT;

      const lockedCustodyTokenAccount = PDAs.getCustodyTokenAccount(pool, lockedCustodyMint, program.programId);
      const closedOptionDetail = PDAs.getClosedOptionDetail(publicKey, optionIndex, pool, custody!, program.programId);
      const fundingAccount = getAssociatedTokenAddressSync(lockedCustodyMint, wallet.publicKey);

      const custodyData = await program.account.custody.fetch(custody!);
      const payCustodyData = await program.account.custody.fetch(payCustody);
      const lockedCustodyData = await program.account.custody.fetch(lockedCustody);

      updateTransactionStep('prepare', 'completed');
      updateTransactionStep('sign', 'loading');

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
          custodyOracleAccount: custodyData.oracle,
          payCustodyOracleAccount: payCustodyData.oracle,
          lockedOracle: lockedCustodyData.oracle,
        })
        .transaction();

      const latestBlockHash = await connection.getLatestBlockhash();
      transaction.feePayer = publicKey;

      updateTransactionStep('sign', 'completed');
      updateTransactionStep('execute', 'loading');

      const signature = await sendTransaction(transaction, connection);
      
      updateTransactionStep('execute', 'completed');
      updateTransactionStep('confirm', 'loading');

      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });

      updateTransactionStep('confirm', 'completed');

      setTimeout(() => {
        hideTransactionProgress();
        showSuccess(
          "Option Position Closed!",
          `Successfully closed ${closeQuantity} units`,
          {
            label: "View on Solscan",
            onClick: () => window.open(`https://solscan.io/tx/${signature}?cluster=devnet`, '_blank')
          }
        );
      }, 1500);

      return true;
    } catch (e) {
      console.log("Error closing option:", e);
      hideTransactionProgress();
      showError("Close Failed", "Could not close option position. Please try again.");
      return false;
    }
  }, [program, publicKey, connected, wallet, sendTransaction, getOptionDetailAccount, showError, showSuccess, showTransactionProgress, updateTransactionStep, hideTransactionProgress]);

  const onCloseLimitOption = useCallback(async (optionIndex: number, closeQuantity: number) => {
    try {
      if (!program || !publicKey || !connected || !wallet) {
        showError("Wallet not connected", "Please connect your wallet to continue");
        return false;
      }

      showInfo("Closing Limit Option", "Processing your limit option close request...");

      const pool = PDAs.getPool("SOL/USDC", program.programId);
      const solCustody = PDAs.getCustody(pool, WSOL_MINT, program.programId);
      const usdcCustody = PDAs.getCustody(pool, USDC_MINT, program.programId);

      let optionDetailAccount;
      let optionDetailData;
      let custody;

      try {
        const solOptionDetail = getOptionDetailAccount(optionIndex, pool, solCustody);
        if (solOptionDetail) {
          optionDetailData = await program.account.optionDetail.fetch(solOptionDetail);
          optionDetailAccount = solOptionDetail;
          custody = solCustody;
        }
      } catch (e) {
        try {
          const usdcOptionDetail = getOptionDetailAccount(optionIndex, pool, usdcCustody);
          if (usdcOptionDetail) {
            optionDetailData = await program.account.optionDetail.fetch(usdcOptionDetail);
            optionDetailAccount = usdcOptionDetail;
            custody = usdcCustody;
          }
        } catch (e2) {
          showError("Option not found", "Could not find the specified limit option");
          return false;
        }
      }

      if (!optionDetailData || !optionDetailAccount) {
        showError("Option validation failed", "Could not validate limit option position");
        return false;
      }

      if (closeQuantity <= 0 || closeQuantity > optionDetailData.quantity.toNumber()) {
        showError("Invalid quantity", "Close quantity must be between 1 and your position size");
        return false;
      }

      const lockedAsset = optionDetailData.lockedAsset;
      const premiumAsset = optionDetailData.premiumAsset;
      const isCallOption = lockedAsset.equals(solCustody);
      const lockedCustody = lockedAsset;
      const payCustody = premiumAsset;
      const lockedCustodyMint = isCallOption ? WSOL_MINT : USDC_MINT;
      const isPremiumSOL = premiumAsset.equals(solCustody);
      const payCustodyMint = isPremiumSOL ? WSOL_MINT : USDC_MINT;

      const lockedCustodyTokenAccount = PDAs.getCustodyTokenAccount(pool, lockedCustodyMint, program.programId);
      const closedOptionDetail = PDAs.getClosedOptionDetail(publicKey, optionIndex, pool, custody!, program.programId);
      const fundingAccount = getAssociatedTokenAddressSync(lockedCustodyMint, wallet.publicKey);

      const custodyData = await program.account.custody.fetch(custody!);
      const payCustodyData = await program.account.custody.fetch(payCustody);
      const lockedCustodyData = await program.account.custody.fetch(lockedCustody);

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
          custodyOracleAccount: custodyData.oracle,
          payCustodyOracleAccount: payCustodyData.oracle,
          lockedOracle: lockedCustodyData.oracle,
        })
        .transaction();

      const latestBlockHash = await connection.getLatestBlockhash();
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);
      
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });

      showSuccess(
        "Limit Option Closed!",
        `Successfully closed ${closeQuantity} units`,
        {
          label: "View on Solscan",
          onClick: () => window.open(`https://solscan.io/tx/${signature}?cluster=devnet`, '_blank')
        }
      );

      return true;
    } catch (e) {
      console.log("Error closing limit option:", e);
      showError("Close Failed", "Could not close limit option. Please try again.");
      return false;
    }
  }, [program, publicKey, connected, wallet, sendTransaction, getOptionDetailAccount, showError, showSuccess, showInfo]);

  const onClaimOption = useCallback(async (optionIndex: number, solPrice: number) => {
    try {
      if (!program || !publicKey || !connected || !wallet) {
        showError("Wallet not connected", "Please connect your wallet to continue");
        return false;
      }

      showInfo("Claiming Option", "Processing your option claim...");

      const pool = PDAs.getPool("SOL/USDC", program.programId);
      const custody = PDAs.getCustodyTokenAccount(pool, WSOL_MINT, program.programId);
      const optionDetailAccount = getOptionDetailAccount(optionIndex, pool, custody);

      if (!optionDetailAccount) {
        showError("Option not found", "Could not find the specified option");
        return false;
      }

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

      showSuccess(
        "Option Claimed Successfully!",
        "Your option has been claimed and settled",
        {
          label: "View on Solscan",
          onClick: () => window.open(`https://solscan.io/tx/${signature}?cluster=devnet`, '_blank')
        }
      );

      return true;
    } catch (e) {
      console.log("Error claiming option:", e);
      showError("Claim Failed", "Could not claim option. Please try again.");
      return false;
    }
  }, [program, publicKey, connected, wallet, sendTransaction, getOptionDetailAccount, showError, showSuccess, showInfo]);

  const onExerciseOption = useCallback(async (optionIndex: number) => {
    try {
      if (!program || !optionIndex || !publicKey || !connected || !wallet) {
        showError("Invalid parameters", "Please check your inputs and wallet connection");
        return false;
      }

      showTransactionProgress("Exercising Option", [
        { id: 'validate', label: 'Validating option position' },
        { id: 'prepare', label: 'Preparing exercise transaction' },
        { id: 'sign', label: 'Waiting for signature' },
        { id: 'execute', label: 'Executing transaction' },
        { id: 'confirm', label: 'Confirming on blockchain' }
      ]);

      updateTransactionStep('validate', 'loading');

      const pool = PDAs.getPool("SOL/USDC", program.programId);
      const contract = PDAs.getContract(program.programId);
      const transferAuthority = PDAs.getTransferAuthority(program.programId);
      const user = PDAs.getUser(publicKey, program.programId);
      const solCustody = PDAs.getCustody(pool, WSOL_MINT, program.programId);
      const usdcCustody = PDAs.getCustody(pool, USDC_MINT, program.programId);

      let optionDetailAccount;
      let optionDetailData;
      let custody;

      try {
        const solOptionDetail = getOptionDetailAccount(optionIndex, pool, solCustody);
        if (solOptionDetail) {
          optionDetailData = await program.account.optionDetail.fetch(solOptionDetail);
          optionDetailAccount = solOptionDetail;
          custody = solCustody;
        }
      } catch (e) {
        try {
          const usdcOptionDetail = getOptionDetailAccount(optionIndex, pool, usdcCustody);
          if (usdcOptionDetail) {
            optionDetailData = await program.account.optionDetail.fetch(usdcOptionDetail);
            optionDetailAccount = usdcOptionDetail;
            custody = usdcCustody;
          }
        } catch (e2) {
          updateTransactionStep('validate', 'error');
          hideTransactionProgress();
          showError("Option not found", "Could not find the specified option");
          return false;
        }
      }

      if (!optionDetailAccount || !optionDetailData) {
        updateTransactionStep('validate', 'error');
        hideTransactionProgress();
        showError("Option validation failed", "Could not validate option position");
        return false;
      }

      updateTransactionStep('validate', 'completed');
      updateTransactionStep('prepare', 'loading');

      const lockedCustody = optionDetailData.lockedAsset;
      const isCallOption = lockedCustody.equals(solCustody);
      const lockedCustodyTokenAccount = PDAs.getCustodyTokenAccount(
        pool,
        isCallOption ? WSOL_MINT : USDC_MINT,
        program.programId
      );

      const lockedCustodyData = await program.account.custody.fetch(lockedCustody);
      const solCustodyData = await program.account.custody.fetch(solCustody);
      const lockedOracle = lockedCustodyData.oracle;
      const solOracle = solCustodyData.oracle;

      const custodyMint = custody?.equals(solCustody) ? WSOL_MINT : USDC_MINT;
      const lockedCustodyMint = lockedCustody.equals(solCustody) ? WSOL_MINT : USDC_MINT;

      const fundingAccount = getAssociatedTokenAddressSync(lockedCustodyMint, wallet.publicKey);

      const fundingAccountInfo = await connection.getAccountInfo(fundingAccount);
      let preInstructions = [];

      if (!fundingAccountInfo) {
        const createATAInstruction = createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          fundingAccount,
          wallet.publicKey,
          lockedCustodyMint
        );
        preInstructions.push(createATAInstruction);
      }

      updateTransactionStep('prepare', 'completed');
      updateTransactionStep('sign', 'loading');

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

      if (preInstructions.length > 0) {
        transaction.instructions = [...preInstructions, ...transaction.instructions];
      }

      const latestBlockHash = await connection.getLatestBlockhash();
      transaction.feePayer = publicKey;

      updateTransactionStep('sign', 'completed');
      updateTransactionStep('execute', 'loading');

      const signature = await sendTransaction(transaction, connection);
      
      updateTransactionStep('execute', 'completed');
      updateTransactionStep('confirm', 'loading');

      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });

      updateTransactionStep('confirm', 'completed');

      setTimeout(() => {
        hideTransactionProgress();
        showSuccess(
          "Option Exercised Successfully!",
          "Your option has been exercised and settled",
          {
            label: "View on Solscan",
            onClick: () => window.open(`https://solscan.io/tx/${signature}?cluster=devnet`, '_blank')
          }
        );
      }, 1500);

      return true;
    } catch (error) {
      console.error("Error exercising option:", error);
      hideTransactionProgress();
      showError("Exercise Failed", "Could not exercise option. Please try again.");
      return false;
    }
  }, [program, publicKey, connected, wallet, sendTransaction, getOptionDetailAccount, showError, showSuccess, showTransactionProgress, updateTransactionStep, hideTransactionProgress]);

  // ===============================
  // PERPETUAL TRADING FUNCTIONS
  // ===============================

  const onOpenPerp = useCallback(async (
    collateralAmount: number,
    positionAmount: number,
    side: "long" | "short",
    type: "limit" | "market",
    triggerPrice: number = 0,
    maxSlippage: number = 100,
    triggerAboveThreshold: boolean = false,
    paySol: boolean = false,
  ) => {
    try {
      if (!program || !publicKey || !connected || !wallet) {
        showError("Wallet not connected", "Please connect your wallet to continue");
        return false;
      }

      showTransactionProgress(`Opening ${side.toUpperCase()} Position`, [
        { id: 'prepare', label: 'Preparing position' },
        { id: 'validate', label: 'Validating parameters' },
        { id: 'sign', label: 'Waiting for signature' },
        { id: 'execute', label: 'Executing transaction' },
        { id: 'confirm', label: 'Confirming on blockchain' }
      ]);

      updateTransactionStep('prepare', 'loading');

      const pool = PDAs.getPool("SOL/USDC", program.programId);
      const userPDA = PDAs.getUser(publicKey, program.programId);

      let perpPositionCount;
      try {
        const userInfo = await program.account.user.fetch(userPDA);
        perpPositionCount = userInfo.perpPositionCount.toNumber();
      } catch {
        perpPositionCount = 0;
      }

      const position = PDAs.getPosition(publicKey, perpPositionCount + 1, pool, program.programId);

      updateTransactionStep('prepare', 'completed');
      updateTransactionStep('validate', 'loading');

      const solCustody = PDAs.getCustody(pool, WSOL_MINT, program.programId);
      const usdcCustody = PDAs.getCustody(pool, USDC_MINT, program.programId);

      const solCustodyTokenAccount = PDAs.getCustodyTokenAccount(pool, WSOL_MINT, program.programId);
      const usdcCustodyTokenAccount = PDAs.getCustodyTokenAccount(pool, USDC_MINT, program.programId);

      const fundingAccount = getAssociatedTokenAddressSync(
        paySol ? WSOL_MINT : USDC_MINT,
        wallet.publicKey
      );

      const perpSide = side === "long" ? { long: {} } : { short: {} };
      const orderType = type === "market" ? { market: {} } : { limit: {} };

      updateTransactionStep('validate', 'completed');
      updateTransactionStep('sign', 'loading');

      const transaction = await program.methods
        .openPerpPosition({
          sizeAmount: new BN(positionAmount),
          collateralAmount: new BN(collateralAmount),
          side: perpSide,
          orderType: orderType,
          triggerPrice: triggerPrice === 0 ? null : new BN(triggerPrice),
          triggerAboveThreshold: triggerAboveThreshold,
          maxSlippage: new BN(maxSlippage),
          poolName: "SOL/USDC",
          paySol: paySol,
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

      updateTransactionStep('sign', 'completed');
      updateTransactionStep('execute', 'loading');

      const signature = await sendTransaction(transaction, connection);
      
      updateTransactionStep('execute', 'completed');
      updateTransactionStep('confirm', 'loading');

      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });

      updateTransactionStep('confirm', 'completed');

      setTimeout(() => {
        hideTransactionProgress();
        showSuccess(
          `${side.toUpperCase()} Position Opened!`,
          `${type === 'market' ? 'Market' : 'Limit'} order executed successfully`,
          {
            label: "View on Solscan",
            onClick: () => window.open(`https://solscan.io/tx/${signature}?cluster=devnet`, '_blank')
          }
        );
      }, 1500);

      return true;
    } catch (e) {
      console.error("Error opening perp position:", e);
      hideTransactionProgress();
      showError("Position Opening Failed", "Could not open perpetual position. Please check your balance and try again.");
      return false;
    }
  }, [program, publicKey, connected, wallet, sendTransaction, showError, showSuccess, showTransactionProgress, updateTransactionStep, hideTransactionProgress]);

  const onClosePerp = useCallback(async (
    closePercentage: number = 100,
    receiveAsset: "SOL" | "USDC" = "USDC",
    positionIndex: number,
  ) => {
    try {
      if (!program || !publicKey || !connected || !wallet) {
        showError("Wallet not connected", "Please connect your wallet to continue");
        return false;
      }

      showTransactionProgress("Closing Position", [
        { id: 'prepare', label: 'Preparing close transaction' },
        { id: 'sign', label: 'Waiting for signature' },
        { id: 'execute', label: 'Executing transaction' },
        { id: 'confirm', label: 'Confirming on blockchain' }
      ]);

      updateTransactionStep('prepare', 'loading');

      const contract = PDAs.getContract(program.programId);
      const pool = PDAs.getPool("SOL/USDC", program.programId);
      const transferAuthority = PDAs.getTransferAuthority(program.programId);
      const position = PDAs.getPosition(publicKey, positionIndex, pool, program.programId);

      const solCustody = PDAs.getCustody(pool, WSOL_MINT, program.programId);
      const usdcCustody = PDAs.getCustody(pool, USDC_MINT, program.programId);

      const solCustodyTokenAccount = PDAs.getCustodyTokenAccount(pool, WSOL_MINT, program.programId);
      const usdcCustodyTokenAccount = PDAs.getCustodyTokenAccount(pool, USDC_MINT, program.programId);

      const userSolAccount = getAssociatedTokenAddressSync(WSOL_MINT, wallet.publicKey);
      const userUsdcAccount = getAssociatedTokenAddressSync(USDC_MINT, wallet.publicKey);

      const [tpSlOrderbook] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('tp_sl_orderbook'),
          publicKey.toBuffer(),
          new BN(positionIndex).toArrayLike(Buffer, 'le', 8),
          Buffer.from("SOL/USDC"),
          new BN(0).toArrayLike(Buffer, 'le', 1),
        ],
        program.programId
      );

      updateTransactionStep('prepare', 'completed');
      updateTransactionStep('sign', 'loading');

      const transaction = await program.methods
        .closePerpPosition({
          positionIndex: new BN(positionIndex),
          poolName: "SOL/USDC",
          closePercentage: new BN(closePercentage),
          receiveSol: receiveAsset === "SOL",
        })
        .accountsPartial({
          owner: publicKey,
          receivingAccount: receiveAsset === "SOL" ? userSolAccount : userUsdcAccount,
          transferAuthority: transferAuthority,
          contract: contract,
          pool: pool,
          position: position,
          tpSlOrderbook: tpSlOrderbook,
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

      updateTransactionStep('sign', 'completed');
      updateTransactionStep('execute', 'loading');

      const signature = await sendTransaction(transaction, connection);
      
      updateTransactionStep('execute', 'completed');
      updateTransactionStep('confirm', 'loading');

      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });

      updateTransactionStep('confirm', 'completed');

      setTimeout(() => {
        hideTransactionProgress();
        showSuccess(
          `Position ${closePercentage === 100 ? 'Fully' : 'Partially'} Closed!`,
          `Settlement received as ${receiveAsset}`,
          {
            label: "View on Solscan",
            onClick: () => window.open(`https://solscan.io/tx/${signature}?cluster=devnet`, '_blank')
          }
        );
      }, 1500);

      return true;
    } catch (e) {
      console.error("Error closing perp position:", e);
      hideTransactionProgress();
      showError("Close Failed", "Could not close perpetual position. Please try again.");
      return false;
    }
  }, [program, publicKey, connected, wallet, sendTransaction, showError, showSuccess, showTransactionProgress, updateTransactionStep, hideTransactionProgress]);

  const onCancelLimitPerp = useCallback(async (
    closePercentage: number = 100,
    receiveAsset: "SOL" | "USDC" = "USDC",
    positionIndex: number,
  ) => {
    try {
      if (!program || !publicKey || !connected || !wallet) {
        showError("Wallet not connected", "Please connect your wallet to continue");
        return false;
      }

      showInfo("Cancelling Limit Order", "Processing your limit order cancellation...");

      const contract = PDAs.getContract(program.programId);
      const pool = PDAs.getPool("SOL/USDC", program.programId);
      const transferAuthority = PDAs.getTransferAuthority(program.programId);
      const position = PDAs.getPosition(publicKey, positionIndex, pool, program.programId);

      const solCustody = PDAs.getCustody(pool, WSOL_MINT, program.programId);
      const usdcCustody = PDAs.getCustody(pool, USDC_MINT, program.programId);

      const solCustodyTokenAccount = PDAs.getCustodyTokenAccount(pool, WSOL_MINT, program.programId);
      const usdcCustodyTokenAccount = PDAs.getCustodyTokenAccount(pool, USDC_MINT, program.programId);

      const userSolAccount = getAssociatedTokenAddressSync(WSOL_MINT, wallet.publicKey);
      const userUsdcAccount = getAssociatedTokenAddressSync(USDC_MINT, wallet.publicKey);

      const transaction = await program.methods
        .cancelLimitOrder({
          positionIndex: new BN(positionIndex),
          poolName: "SOL/USDC",
          closePercentage: closePercentage,
          receiveSol: receiveAsset === "SOL",
        })
        .accountsPartial({
          owner: publicKey,
          receivingAccount: receiveAsset === "SOL" ? userSolAccount : userUsdcAccount,
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

      const signature = await sendTransaction(transaction, connection);
      
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });

      showSuccess(
        "Limit Order Cancelled!",
        `Order cancelled and funds returned as ${receiveAsset}`,
        {
          label: "View on Solscan",
          onClick: () => window.open(`https://solscan.io/tx/${signature}?cluster=devnet`, '_blank')
        }
      );

      return true;
    } catch (e) {
      console.error("Error cancelling limit perp position:", e);
      showError("Cancel Failed", "Could not cancel limit order. Please try again.");
      return false;
    }
  }, [program, publicKey, connected, wallet, sendTransaction, showError, showSuccess, showInfo]);

  const onAddCollateral = useCallback(async (
    positionIndex: number,
    collateralAmount: number,
    paySol: boolean,
  ) => {
    try {
      if (!program || !publicKey || !connected || !wallet) {
        showError("Wallet not connected", "Please connect your wallet to continue");
        return false;
      }

      showInfo("Adding Collateral", "Processing collateral addition...");

      const contract = PDAs.getContract(program.programId);
      const pool = PDAs.getPool("SOL/USDC", program.programId);
      const position = PDAs.getPosition(publicKey, positionIndex, pool, program.programId);

      const solCustody = PDAs.getCustody(pool, WSOL_MINT, program.programId);
      const usdcCustody = PDAs.getCustody(pool, USDC_MINT, program.programId);

      const solCustodyTokenAccount = PDAs.getCustodyTokenAccount(pool, WSOL_MINT, program.programId);
      const usdcCustodyTokenAccount = PDAs.getCustodyTokenAccount(pool, USDC_MINT, program.programId);

      const solFundingAccount = getAssociatedTokenAddressSync(WSOL_MINT, wallet.publicKey);
      const usdcFundingAccount = getAssociatedTokenAddressSync(USDC_MINT, wallet.publicKey);

      const transaction = await program.methods
        .addCollateral({
          positionIndex: new BN(positionIndex),
          poolName: "SOL/USDC",
          collateralAmount: new BN(collateralAmount * (10 ** (paySol ? WSOL_DECIMALS : USDC_DECIMALS))),
          paySol: paySol,
        })
        .accountsPartial({
          owner: publicKey,
          fundingAccount: paySol ? solFundingAccount : usdcFundingAccount,
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

      const signature = await sendTransaction(transaction, connection);
      
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });

      showSuccess(
        "Collateral Added Successfully!",
        `Added ${collateralAmount} ${paySol ? 'SOL' : 'USDC'} to your position`,
        {
          label: "View on Solscan",
          onClick: () => window.open(`https://solscan.io/tx/${signature}?cluster=devnet`, '_blank')
        }
      );

      return true;
    } catch (e) {
      console.error("Error adding collateral:", e);
      showError("Add Collateral Failed", "Could not add collateral to position. Please try again.");
      return false;
    }
  }, [program, publicKey, connected, wallet, sendTransaction, showError, showSuccess, showInfo]);

  const onRemoveCollateral = useCallback(async (
    positionIndex: number,
    collateralAmount: number,
    receiveSol: boolean,
  ) => {
    try {
      if (!program || !publicKey || !connected || !wallet) {
        showError("Wallet not connected", "Please connect your wallet to continue");
        return false;
      }

      showInfo("Removing Collateral", "Processing collateral removal...");

      const contract = PDAs.getContract(program.programId);
      const pool = PDAs.getPool("SOL/USDC", program.programId);
      const transferAuthority = PDAs.getTransferAuthority(program.programId);
      const position = PDAs.getPosition(publicKey, positionIndex, pool, program.programId);

      const solCustody = PDAs.getCustody(pool, WSOL_MINT, program.programId);
      const usdcCustody = PDAs.getCustody(pool, USDC_MINT, program.programId);

      const solCustodyTokenAccount = PDAs.getCustodyTokenAccount(pool, WSOL_MINT, program.programId);
      const usdcCustodyTokenAccount = PDAs.getCustodyTokenAccount(pool, USDC_MINT, program.programId);

      const userSolAccount = getAssociatedTokenAddressSync(WSOL_MINT, wallet.publicKey);
      const userUsdcAccount = getAssociatedTokenAddressSync(USDC_MINT, wallet.publicKey);

      const transaction = await program.methods
        .removeCollateral({
          positionIndex: new BN(positionIndex),
          poolName: "SOL/USDC",
          collateralAmount: new BN(collateralAmount * (10 ** (receiveSol ? WSOL_DECIMALS : USDC_DECIMALS))),
          receiveSol: receiveSol,
        })
        .accountsPartial({
          owner: publicKey,
          receivingAccount: receiveSol ? userSolAccount : userUsdcAccount,
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

      const signature = await sendTransaction(transaction, connection);
      
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });

      showSuccess(
        "Collateral Removed Successfully!",
        `Removed ${collateralAmount} ${receiveSol ? 'SOL' : 'USDC'} from your position`,
        {
          label: "View on Solscan",
          onClick: () => window.open(`https://solscan.io/tx/${signature}?cluster=devnet`, '_blank')
        }
      );

      return true;
    } catch (e) {
      console.error("Error removing collateral:", e);
      showError("Remove Collateral Failed", "Could not remove collateral from position. Please try again.");
      return false;
    }
  }, [program, publicKey, connected, wallet, sendTransaction, showError, showSuccess, showInfo]);

  // ===============================
  // TP/SL MANAGEMENT FUNCTIONS
  // ===============================

  const checkOrderbookExists = useCallback(async (
    owner: PublicKey,
    positionIndex: number
  ): Promise<boolean> => {
    if (!program) return false;

    try {
      const tpSlOrderbook = PDAs.getTpSlOrderbook(
        owner,
        positionIndex,
        "SOL/USDC",
        program.programId
      );

      await program.account.tpSlOrderbook.fetch(tpSlOrderbook);
      return true;
    } catch (error) {
      return false;
    }
  }, [program]);

  const onSetTpSl = useCallback(async (
    positionIndex: number,
    takeProfits: PerpTPSL[],
    stopLosses: PerpTPSL[]
  ): Promise<boolean> => {
    try {
      if (!program || !publicKey || !connected || !wallet) {
        showError("Wallet not connected", "Please connect your wallet to continue");
        return false;
      }

      showTransactionProgress("Setting TP/SL Orders", [
        { id: 'validate', label: 'Validating position' },
        { id: 'prepare', label: 'Preparing TP/SL orders' },
        { id: 'sign', label: 'Waiting for signature' },
        { id: 'execute', label: 'Executing transaction' },
        { id: 'confirm', label: 'Confirming on blockchain' }
      ]);

      updateTransactionStep('validate', 'loading');

      const hasOrderbook = await checkOrderbookExists(publicKey, positionIndex);

      const tpSlOrderbook = PDAs.getTpSlOrderbook(
        publicKey,
        positionIndex,
        "SOL/USDC",
        program.programId
      );

      const pool = PDAs.getPool("SOL/USDC", program.programId);
      const position = PDAs.getPosition(publicKey, positionIndex, pool, program.programId);

      updateTransactionStep('validate', 'completed');
      updateTransactionStep('prepare', 'loading');

      const instructions = [];

      if (!hasOrderbook) {
        const initInstruction = await program.methods
          .initTpSlOrderbook({
            orderType: 0,
            positionIndex: new BN(positionIndex),
            poolName: "SOL/USDC",
          })
          .accountsPartial({
            owner: publicKey,
            tpSlOrderbook: tpSlOrderbook,
            pool: pool,
            position: position,
            optionDetail: null,
            systemProgram: SystemProgram.programId,
          })
          .instruction();

        instructions.push(initInstruction);
      }

      const solCustody = PDAs.getCustody(pool, WSOL_MINT, program.programId);
      const usdcCustody = PDAs.getCustody(pool, USDC_MINT, program.programId);

      for (const tp of takeProfits) {
        const tpInstruction = await program.methods
          .manageTpSlOrders({
            contractType: 0,
            positionIndex: new BN(positionIndex),
            poolName: "SOL/USDC",
            action: {
              addTakeProfit: {
                price: new BN(Math.floor(tp.price * 1e6)),
                sizePercent: new BN(Math.floor(tp.sizePercent * 1e6)),
                receiveSol: tp.receiveSol,
              },
            },
          })
          .accountsPartial({
            owner: publicKey,
            tpSlOrderbook: tpSlOrderbook,
            pool: pool,
            position: position,
            optionDetail: null,
            solCustody,
            usdcCustody
          })
          .instruction();

        instructions.push(tpInstruction);
      }

      for (const sl of stopLosses) {
        const slInstruction = await program.methods
          .manageTpSlOrders({
            contractType: 0,
            positionIndex: new BN(positionIndex),
            poolName: "SOL/USDC",
            action: {
              addStopLoss: {
                price: new BN(Math.floor(sl.price * 1e6)),
                sizePercent: new BN(Math.floor(sl.sizePercent * 1e6)),
                receiveSol: sl.receiveSol,
              },
            },
          })
          .accountsPartial({
            owner: publicKey,
            tpSlOrderbook: tpSlOrderbook,
            pool: pool,
            position: position,
            optionDetail: null,
            solCustody,
            usdcCustody
          })
          .instruction();

        instructions.push(slInstruction);
      }

      updateTransactionStep('prepare', 'completed');
      updateTransactionStep('sign', 'loading');

      const transaction = TransactionBuilder.buildTransaction(instructions);
      const latestBlockHash = await connection.getLatestBlockhash();
      transaction.feePayer = publicKey;

      updateTransactionStep('sign', 'completed');
      updateTransactionStep('execute', 'loading');

      const signature = await sendTransaction(transaction, connection);
      
      updateTransactionStep('execute', 'completed');
      updateTransactionStep('confirm', 'loading');

      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });

      updateTransactionStep('confirm', 'completed');

      setTimeout(() => {
        hideTransactionProgress();
        showSuccess(
          "TP/SL Orders Set Successfully!",
          `Added ${takeProfits.length} TP and ${stopLosses.length} SL orders`,
          {
            label: "View on Solscan",
            onClick: () => window.open(`https://solscan.io/tx/${signature}?cluster=devnet`, '_blank')
          }
        );
      }, 1500);

      return true;

    } catch (error) {
      console.error("Error setting TP/SL:", error);
      hideTransactionProgress();
      showError("TP/SL Setup Failed", "Could not set TP/SL orders. Please try again.");
      return false;
    }
  }, [program, publicKey, connected, wallet, sendTransaction, checkOrderbookExists, showError, showSuccess, showTransactionProgress, updateTransactionStep, hideTransactionProgress]);

  const onUpdateTpSl = useCallback(async (
    positionIndex: number,
    updates: {
      updateTPs?: Array<{ index: number; price?: number; sizePercent?: number }>;
      updateSLs?: Array<{ index: number; price?: number; sizePercent?: number }>;
    }
  ): Promise<boolean> => {
    try {
      if (!program || !publicKey || !connected || !wallet) {
        showError("Wallet not connected", "Please connect your wallet to continue");
        return false;
      }

      showInfo("Updating TP/SL Orders", "Modifying your TP/SL orders...");

      const hasOrderbook = await checkOrderbookExists(publicKey, positionIndex);
      if (!hasOrderbook) {
        showError("No TP/SL Orders Found", "No orderbook exists for this position");
        return false;
      }

      const tpSlOrderbook = PDAs.getTpSlOrderbook(
        publicKey,
        positionIndex,
        "SOL/USDC",
        program.programId
      );

      const pool = PDAs.getPool("SOL/USDC", program.programId);
      const position = PDAs.getPosition(publicKey, positionIndex, pool, program.programId);

      const solCustody = PDAs.getCustody(pool, WSOL_MINT, program.programId);
      const usdcCustody = PDAs.getCustody(pool, USDC_MINT, program.programId);

      const instructions = [];

      if (updates.updateTPs) {
        for (const update of updates.updateTPs) {
          const updateInstruction = await program.methods
            .manageTpSlOrders({
              contractType: 0,
              positionIndex: new BN(positionIndex),
              poolName: "SOL/USDC",
              action: {
                updateTakeProfit: {
                  index: update.index,
                  newPrice: update.price ? new BN(Math.floor(update.price * 1e6)) : null,
                  newSizePercent: update.sizePercent ? new BN(Math.floor(update.sizePercent * 1e6)) : null,
                },
              },
            })
            .accountsPartial({
              owner: publicKey,
              tpSlOrderbook: tpSlOrderbook,
              pool: pool,
              position: position,
              optionDetail: null,
              solCustody,
              usdcCustody
            })
            .instruction();

          instructions.push(updateInstruction);
        }
      }

      if (updates.updateSLs) {
        for (const update of updates.updateSLs) {
          const updateInstruction = await program.methods
            .manageTpSlOrders({
              contractType: 0,
              positionIndex: new BN(positionIndex),
              poolName: "SOL/USDC",
              action: {
                updateStopLoss: {
                  index: update.index,
                  newPrice: update.price ? new BN(Math.floor(update.price * 1e6)) : null,
                  newSizePercent: update.sizePercent ? new BN(Math.floor(update.sizePercent * 1e6)) : null,
                },
              },
            })
            .accountsPartial({
              owner: publicKey,
              tpSlOrderbook: tpSlOrderbook,
              pool: pool,
              position: position,
              optionDetail: null,
              solCustody,
              usdcCustody
            })
            .instruction();

          instructions.push(updateInstruction);
        }
      }

      if (instructions.length === 0) {
        showInfo("No Updates", "No updates to perform");
        return true;
      }

      const transaction = TransactionBuilder.buildTransaction(instructions);
      const latestBlockHash = await connection.getLatestBlockhash();
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);
      
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });

      showSuccess(
        "TP/SL Orders Updated!",
        "Your TP/SL orders have been modified successfully",
        {
          label: "View on Solscan",
          onClick: () => window.open(`https://solscan.io/tx/${signature}?cluster=devnet`, '_blank')
        }
      );

      return true;

    } catch (error) {
      console.error("Error updating TP/SL:", error);
      showError("TP/SL Update Failed", "Could not update TP/SL orders. Please try again.");
      return false;
    }
  }, [program, publicKey, connected, wallet, sendTransaction, checkOrderbookExists, showError, showSuccess, showInfo]);

  const onRemoveTpSl = useCallback(async (
    positionIndex: number,
    removals: {
      removeTPs?: number[];
      removeSLs?: number[];
    }
  ): Promise<boolean> => {
    try {
      if (!program || !publicKey || !connected || !wallet) {
        showError("Wallet not connected", "Please connect your wallet to continue");
        return false;
      }

      showInfo("Removing TP/SL Orders", "Cancelling your TP/SL orders...");

      const hasOrderbook = await checkOrderbookExists(publicKey, positionIndex);
      if (!hasOrderbook) {
        showError("No TP/SL Orders Found", "No orderbook exists for this position");
        return false;
      }

      const tpSlOrderbook = PDAs.getTpSlOrderbook(
        publicKey,
        positionIndex,
        "SOL/USDC",
        program.programId
      );

      const pool = PDAs.getPool("SOL/USDC", program.programId);
      const position = PDAs.getPosition(publicKey, positionIndex, pool, program.programId);

      const instructions = [];

      if (removals.removeTPs) {
        for (const index of removals.removeTPs) {
          const removeInstruction = await program.methods
            .manageTpSlOrders({
              contractType: 0,
              positionIndex: new BN(positionIndex),
              poolName: "SOL/USDC",
              action: {
                removeTakeProfit: { index }
              },
            })
            .accountsPartial({
              owner: publicKey,
              tpSlOrderbook: tpSlOrderbook,
              pool: pool,
              position: position,
              optionDetail: null,
            })
            .instruction();

          instructions.push(removeInstruction);
        }
      }

      if (removals.removeSLs) {
        for (const index of removals.removeSLs) {
          const removeInstruction = await program.methods
            .manageTpSlOrders({
              contractType: 0,
              positionIndex: new BN(positionIndex),
              poolName: "SOL/USDC",
              action: {
                removeStopLoss: { index }
              },
            })
            .accountsPartial({
              owner: publicKey,
              tpSlOrderbook: tpSlOrderbook,
              pool: pool,
              position: position,
              optionDetail: null,
            })
            .instruction();

          instructions.push(removeInstruction);
        }
      }

      if (instructions.length === 0) {
        showInfo("No Removals", "No orders to remove");
        return true;
      }

      const transaction = TransactionBuilder.buildTransaction(instructions);
      const latestBlockHash = await connection.getLatestBlockhash();
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);
      
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });

      showSuccess(
        "TP/SL Orders Removed!",
        "Selected TP/SL orders have been cancelled",
        {
          label: "View on Solscan",
          onClick: () => window.open(`https://solscan.io/tx/${signature}?cluster=devnet`, '_blank')
        }
      );

      return true;

    } catch (error) {
      console.error("Error removing TP/SL:", error);
      showError("TP/SL Removal Failed", "Could not remove TP/SL orders. Please try again.");
      return false;
    }
  }, [program, publicKey, connected, wallet, sendTransaction, checkOrderbookExists, showError, showSuccess, showInfo]);

  // ===============================
  // LIQUIDITY FUNCTIONS
  // ===============================

  const onAddLiquidity = useCallback(async (
    amount: number,
    program: Program<OptionContract>,
    asset: PublicKey
  ) => {
    try {
      if (!program || !publicKey || !wallet) {
        showError("Wallet not connected", "Please connect your wallet to continue");
        return false;
      }

      showInfo("Adding Liquidity", "Processing your liquidity addition...");

      const pool = PDAs.getPool("SOL/USDC", program.programId);
      const custody = PDAs.getCustody(pool, asset, program.programId);
      const poolData = await program.account.pool.fetch(pool);
      const custodyData = await program.account.custody.fetch(custody);
      const fundingAccount = getAssociatedTokenAddressSync(asset, wallet.publicKey);

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
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);
      
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });

      showSuccess(
        "Liquidity Added Successfully!",
        `Added ${amount} tokens to the liquidity pool`,
        {
          label: "View on Solscan",
          onClick: () => window.open(`https://solscan.io/tx/${signature}?cluster=devnet`, '_blank')
        }
      );

      return true;
    } catch (e) {
      console.log("Error adding liquidity:", e);
      showError("Add Liquidity Failed", "Could not add liquidity. Please check your balance and try again.");
      return false;
    }
  }, [publicKey, wallet, sendTransaction, showError, showSuccess, showInfo]);

  const onRemoveLiquidity = useCallback(async (
    amount: number,
    program: Program<OptionContract>,
    asset: PublicKey
  ) => {
    try {
      if (!program || !publicKey || !wallet) {
        showError("Wallet not connected", "Please connect your wallet to continue");
        return false;
      }

      showInfo("Removing Liquidity", "Processing your liquidity removal...");

      const pool = PDAs.getPool("SOL/USDC", program.programId);
      const custody = PDAs.getCustody(pool, asset, program.programId);
      const poolData = await program.account.pool.fetch(pool);
      const custodyData = await program.account.custody.fetch(custody);
      const receivingAccount = getAssociatedTokenAddressSync(asset, wallet.publicKey);

      let custodies = [];
      let oracles = [];
      for await (let custody of poolData.custodies) {
        let c = await program.account.custody.fetch(new PublicKey(custody));
        let ora = c.oracle;
        custodies.push({ pubkey: custody, isSigner: false, isWritable: true });
        oracles.push({ pubkey: ora, isSigner: false, isWritable: true });
      }

      const contract = PDAs.getContract(program.programId);
      const transferAuthority = PDAs.getTransferAuthority(program.programId);
      const custodyTokenAccount = PDAs.getCustodyTokenAccount(pool, asset, program.programId);
      const lpTokenMint = PDAs.getLpTokenMint("SOL/USDC", program.programId);
      const lpTokenAccount = getAssociatedTokenAddressSync(lpTokenMint, wallet.publicKey);
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
          pool: pool,
          custody: custody,
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
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);
      
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });

      showSuccess(
        "Liquidity Removed Successfully!",
        `Removed ${amount} LP tokens from the pool`,
        {
          label: "View on Solscan",
          onClick: () => window.open(`https://solscan.io/tx/${signature}?cluster=devnet`, '_blank')
        }
      );

      return true;
    } catch (e) {
      console.log("Error removing liquidity:", e);
      showError("Remove Liquidity Failed", "Could not remove liquidity. Please check your LP token balance and try again.");
      return false;
    }
  }, [publicKey, wallet, sendTransaction, showError, showSuccess, showInfo]);

  // Initialize program
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
  }, [wallet, publicKey]);

  return (
    <ContractContext.Provider
      value={{
        program,
        pub,
        onOpenLimitOption,
        onCloseLimitOption,
        onOpenOption,
        onEditOption,
        onCloseOption,
        onClaimOption,
        onExerciseOption,
        onOpenPerp,
        onClosePerp,
        onCancelLimitPerp,
        onAddCollateral,
        onRemoveCollateral,
        onAddLiquidity,
        onRemoveLiquidity,
        onSetTpSl,
        onUpdateTpSl,
        onRemoveTpSl,
        getOptionDetailAccount,
      }}
    >
      {children}
    </ContractContext.Provider>
  );
};