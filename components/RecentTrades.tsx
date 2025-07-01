"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";

import {
  clusterUrl,
  Option_Program_Address,
  USDC_DECIMALS,
  USDC_MINT,
  WSOL_DECIMALS,
  WSOL_MINT,
} from "@/utils/const";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { AvatarIcon, CallIconDark, PutIconDark } from "@/public/svgs/icons";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";

import { OptionContract } from "@/lib/idl/option_contract";
import * as idl from "../lib/idl/option_contract.json";
import { AnchorProvider, getProvider, Program } from "@coral-xyz/anchor";
import { connection } from "@/utils/const";
import { Keypair, PublicKey } from "@solana/web3.js";
import { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";

import { pools } from "@/lib/data/pools";
import { toast, ToastContainer } from "react-toastify";

import { getPythPrice } from "@/hooks/usePythPrice";
import { formatAddress, formatAmount, formatPrice } from "@/utils/formatter";
import { USDC } from "@/lib/data/tokenlist";
import {
  usePythMarketData,
  type MarketDataState,
} from "@/hooks/usePythMarketData";
import { usePythPrice, type PythPriceState } from "@/hooks/usePythPrice";
import { black_scholes } from "@/utils/optionsPricing";
import { useOptionsPricing } from "@/hooks/useOptionsPricing";

interface OptionDetail {
  profile: string;
  quantity: string;
  amount: string;
  boughtBack: string;
  claimed: string;
  custody: string;
  exercised: string;
  expiredDate: string;
  index: string;
  lockedAsset: string;
  period: string;
  pool: string;
  premium: string;
  premiumAsset: string;
  profit: string;
  strikePrice: string;
  valid: string;
  tx: string;
  type: string;
  executedDate: string;
  purchaseDate: string;
  purchasedPrice: string;
}

// Update interface to match Anchor's actual return type
interface AnchorProgramAccount {
  publicKey: PublicKey; // Note: publicKey, not pubkey
  account: {
    index: any;
    owner: PublicKey;
    amount: any;
    quantity: any;
    strikePrice: number;
    period: any;
    expiredDate: any;
    purchaseDate: any;
    optionType: number;
    premium: any;
    premiumAsset: PublicKey;
    profit: any;
    lockedAsset: PublicKey;
    custody: PublicKey;
    pool: PublicKey;
    valid: boolean;
    boughtBack: any;
    claimed: any;
    exercised: any;
    bump: number;
  };
}

export default function RecentTrades() {
  const [optionDetails, setOptionDetails] = useState<OptionDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [program, setProgram] = useState<Program<OptionContract>>();
  const selectedSymbol = "Crypto.SOL/USD";

  const { priceData, loading: priceLoading } = usePythPrice(selectedSymbol);

  const initializeProvider = useCallback(() => {
    const dummyKeypair = Keypair.generate();
    const dummyWallet: Wallet = {
      publicKey: dummyKeypair.publicKey,
      signTransaction: async (tx: any) => tx,
      signAllTransactions: async (txs: any) => txs,
    };

    try {
      return getProvider();
    } catch {
      return new AnchorProvider(connection, dummyWallet, {});
    }
  }, []);

  // Update function signature to match Anchor's return type
  const processOptionAccount = async (
    account: AnchorProgramAccount,
    program: Program<OptionContract>
  ): Promise<OptionDetail | null> => {
    try {
      // Use account.account instead of fetching again (data is already available)
      const optionDetailAccount = account.account;

      const poolInfo = pools.find(
        (pool) => pool.programId === optionDetailAccount.pool.toString()
      );

      const [pool] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from("SOL/USDC")],
        program.programId
      );

      const purchaseTimestamp =
        parseInt(optionDetailAccount.expiredDate.toString()) * 1000 -
        parseInt(optionDetailAccount.period.toString()) * 86400 * 1000 -
        86400000;

      console.log(optionDetailAccount);

      // const priceData = await getPythPrice(selectedSymbol, purchaseTimestamp);

      const [solCustody] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), pool.toBuffer(), WSOL_MINT.toBuffer()],
        program.programId
      );

      const [usdcCustody] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), pool.toBuffer(), USDC_MINT.toBuffer()],
        program.programId
      );

      const isCall = optionDetailAccount.lockedAsset.equals(solCustody);

      const premium = parseFloat(optionDetailAccount.premium.toString());
      const quantity = optionDetailAccount.quantity.toString();
      const profile = optionDetailAccount.owner.toString();
      const tx =
        optionDetailAccount.exercised.toString() != "0"
          ? "Exercised"
          : optionDetailAccount.boughtBack.toString() != "0"
            ? "Sold"
            : "Bought";

      return {
        quantity: quantity,
        profile: profile,
        amount: optionDetailAccount.amount.toString(),
        boughtBack: optionDetailAccount.bought_back.toString(),
        claimed: optionDetailAccount.claimed.toString(),
        custody: optionDetailAccount.custody.toString(),
        exercised: optionDetailAccount.exercised.toString(),
        expiredDate: new Date(
          parseInt(optionDetailAccount.expiredDate.toString()) * 1000
        ).toLocaleString(),
        index: optionDetailAccount.index.toString(),
        lockedAsset: optionDetailAccount.locked_asset.toString(),
        period: optionDetailAccount.period.toString(),
        pool: poolInfo?.name || "",
        premium: optionDetailAccount.premium.toString(),
        premiumAsset: optionDetailAccount.premium_asset.toString(),
        profit: optionDetailAccount.profit.toString(),
        strikePrice: optionDetailAccount.strike_price.toString(),
        valid: optionDetailAccount.valid.toString(),
        tx: tx,
        type: isCall ? "Call" : "Put",
        executedDate:
          tx === "Exercised"
            ? `${parseInt(optionDetailAccount.exercised)}`
            : tx === "Sold"
              ? `${parseInt(optionDetailAccount.boughtBack)}`
              : `${parseInt(optionDetailAccount.purchaseDate)}`,
        purchaseDate: optionDetailAccount.purchaseDate.toString(),
        purchasedPrice: priceData.price?.toString() || '160',
      };
    } catch (error) {
      console.error("Error processing option account:", error);
      return null;
    }
  };

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        setIsLoading(true);
        toast.info("Fetching trades...", {
          position: "bottom-right",
        });

        const provider = initializeProvider();
        const program = new Program<OptionContract>(
          idl as OptionContract,
          provider
        );
        setProgram(program);

        // Get accounts with correct typing
        const optionAccounts = await program.account.optionDetail.all([
          {
            dataSize: 276
          }
        ]);
        const _optionDetails: OptionDetail[] = [];

        // Process accounts and filter out null results
        const results = await Promise.allSettled(
          optionAccounts.map((account: AnchorProgramAccount) =>
            processOptionAccount(account, program)
          )
        );

        // Filter successful results and remove null values
        const validResults = results
          .filter(
            (result): result is PromiseFulfilledResult<OptionDetail> =>
              result.status === "fulfilled" && result.value !== null
          )
          .map((result) => result.value);

        console.log("Valid results:", validResults);
        _optionDetails.push(...validResults);

        // Process sold or exercised options
        const _solOrexcise = _optionDetails.filter((detail) => {
          return detail.tx != "Bought";
        });

        for (const detail of _solOrexcise) {
          _optionDetails.push({
            ...detail,
            executedDate:
              detail.executedDate == "0"
                ? detail.executedDate
                : detail.purchaseDate,
            tx: "Bought",
          });
        }

        _optionDetails.sort((a, b) => {
          return parseInt(b.executedDate) - parseInt(a.executedDate);
        });

        setOptionDetails(_optionDetails);
      } catch (error) {
        console.error("Error fetching trades:", error);
        toast.error("Failed to fetch trades. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrades();
  }, [initializeProvider]);

  const memoizedTableContent = useMemo(
    () => (
      <TableBody className="w-full">
        {optionDetails.map((row, idx) => (
          <TableRow key={idx} className="border-none w-full">
            <TableCell className="text-sm text-foreground font-normal text-justify pl-5 pr-3 py-3">
              <div className="flex gap-[10px] items-center">
                <AvatarIcon />
                {formatAddress(row.profile)}
              </div>
            </TableCell>
            <TableCell className="text-sm text-foreground font-normal text-justify px-3 py-[14px]">
              {row.tx === "Bought" ? (
                <span className="px-2 py-[6px] bg-[#A3BFFB]/20 text-[#A3BFFB] rounded-[8px]">
                  {row.tx}
                </span>
              ) : row.tx === "Sold" ? (
                <span className="px-2 py-[6px] bg-[#FFD08E]/20 text-[#FFD08E] rounded-[8px]">
                  {row.tx}
                </span>
              ) : (
                <span className="px-2 py-[6px] bg-[#A5F3C0]/20 text-[#A5F3C0] rounded-[8px]">
                  {row.tx}
                </span>
              )}
            </TableCell>
            <TableCell className="text-sm text-foreground font-normal text-justify px-3 py-[14px]">
              {row.quantity}
            </TableCell>
            <TableCell className="text-sm text-foreground font-normal text-justify px-3 py-[14px]">
              collateral
              {/* todo add collateral value */}
            </TableCell>
            <TableCell className="text-sm text-foreground font-normal text-justify px-3 py-[14px]">
              {row.tx == "Bought"
                ? (
                  parseFloat(row.amount) /
                  10 ** (row.type == "Call" ? (row.lockedAsset == row.premiumAsset ? WSOL_DECIMALS : USDC_DECIMALS) : (row.lockedAsset == row.premiumAsset ? USDC_DECIMALS : WSOL_DECIMALS))
                ).toFixed(2)
                : row.tx == "Sold"
                  ? (
                    ((parseFloat(row.amount) / 10) * 9) /
                    10 ** (row.type == "Call" ? (row.lockedAsset == row.premiumAsset ? WSOL_DECIMALS : USDC_DECIMALS) : (row.lockedAsset == row.premiumAsset ? USDC_DECIMALS : WSOL_DECIMALS))
                  ).toFixed(2)
                  : row.tx == "Exercised"
                    ? row.claimed != "0"
                      ? row.claimed
                      : (parseFloat(row.profit) / 10 ** (row.type == "Call" ? WSOL_DECIMALS : USDC_DECIMALS)).toFixed(2)
                    : "0"}{" "}
              {(row.type == "Call" ? (row.lockedAsset == row.premiumAsset ? "SOL" : "USDC") : (row.lockedAsset == row.premiumAsset ? "USDC" : "SOL"))}
            </TableCell>
            <TableCell className="text-sm text-foreground font-normal text-justify px-3 py-[14px]">
              {row.tx == "Sold"
                ? (
                  parseFloat(row.amount) /
                  10 /
                  (row.type == "Call"
                    ? 10 ** WSOL_DECIMALS
                    : 10 ** USDC_DECIMALS)
                ).toFixed(2)
                : "0"}{" "}
              {row.type == "Call" ? "SOL" : "USDC"}
            </TableCell>
            <TableCell className="text-sm text-foreground font-normal text-justify px-3 py-[14px]">
              {row.pool}
            </TableCell>
            <TableCell className="text-sm text-foreground font-normal text-justify px-3 py-[14px]">
              <div className="flex gap-2 items-center">
                {row.type === "Call" ? (
                  <CallIconDark width="14" height="14" />
                ) : (
                  <PutIconDark width="14" height="14" />
                )}
                {row.type}
              </div>
            </TableCell>
            <TableCell className="text-sm text-foreground font-normal text-justify px-3 py-[14px]">
              {row.strikePrice}
            </TableCell>
            <TableCell className="text-sm text-foreground font-normal text-justify px-3 py-[14px]">
              {row.expiredDate}
            </TableCell>
            <TableCell className="text-sm text-foreground font-normal text-justify px-3 py-[14px]">
              $
              {row.purchasedPrice
                ? (
                  (Number(row.amount) * Number(row.purchasedPrice)) /
                  (row.type == "Call"
                    ? 10 ** WSOL_DECIMALS
                    : 10 ** USDC_DECIMALS)
                ).toFixed(2)
                : "0"}{" "}
              USD
            </TableCell>
            <TableCell className="text-sm text-foreground font-normal text-justify pl-3 pr-5 py-[14px]">
              <span className="whitespace-nowrap">
                {new Date(parseInt(row.executedDate) * 1000).toLocaleString()}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    ),
    [optionDetails]
  );

  return (
    <div className="border-none border-t-0 w-full h-full rounded-b-sm flex flex-col justify-between">
      <ScrollArea className="h-full rounded-b-sm w-full">
        <Table className="whitespace-nowrap overflow-hidden">
          <TableHeader className="w-full">
            <TableRow className="p-0">
              <TableHead className="text-xs text-secondary-foreground font-medium text-justify pl-5 pr-3 py-4">
                Profile
              </TableHead>
              <TableHead className="text-xs text-secondary-foreground font-medium text-justify px-3 py-4">
                Bought/Sold/Exercised
              </TableHead>
              <TableHead className="text-xs text-secondary-foreground font-medium text-justify px-3 py-4">
                Quantity
              </TableHead>
              <TableHead className="text-xs text-secondary-foreground font-medium text-justify px-3 py-4">
                Collateral
              </TableHead>
              <TableHead className="text-xs text-secondary-foreground font-medium text-justify px-3 py-4">
                Paid/Received
              </TableHead>
              <TableHead className="text-xs text-secondary-foreground font-medium text-justify px-3 py-4">
                Fees
              </TableHead>
              <TableHead className="text-xs text-secondary-foreground font-medium text-justify px-3 py-4">
                Pool
              </TableHead>
              <TableHead className="text-xs text-secondary-foreground font-medium text-justify px-3 py-4">
                Call/Put
              </TableHead>
              <TableHead className="text-xs text-secondary-foreground font-medium text-justify px-3 py-4">
                Strike Price
              </TableHead>
              <TableHead className="text-xs text-secondary-foreground font-medium text-justify px-3 py-4">
                Expiry Date
              </TableHead>
              <TableHead className="text-xs text-secondary-foreground font-medium text-justify px-3 py-4">
                Trade Size
              </TableHead>
              <TableHead className="text-xs text-secondary-foreground font-medium text-justify pr-5 pl-3 py-4 bg-primary/10">
                Purchase Date
              </TableHead>
            </TableRow>
          </TableHeader>
          {memoizedTableContent}
        </Table>
        <ToastContainer theme="dark" />
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}