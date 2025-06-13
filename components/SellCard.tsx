"use client";

import { useContext, useEffect, useState } from "react";
import Image from "next/image";
import {
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, setDefaultOptions } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import {
  AnchorProvider,
  getProvider,
  Program,
  Provider,
} from "@coral-xyz/anchor";
import { connection, WSOL_MINT } from "@/utils/const";
import { OptionContract } from "@/lib/idl/option_contract";
import * as idl from "../lib/idl/option_contract.json";
import { ContractContext } from "@/contexts/contractProvider";
import { PublicKey } from "@solana/web3.js";
import { Position } from "@/lib/data/Positions";

interface Option {
  id: number;
  type: "Call" | "Put";
  strikePrice: number;
  expiration: Date;
  size: number;
  purchaseDate: Date;
  status: "Active" | "Expired" | "Exercised" | string;
}

export default function SellCard() {
  const { connected } = useWallet();
  const wallet = useAnchorWallet();
  const [selectedOption, setSelectedOption] = useState<Position | null>(null);
  const { positions, onCloseOption } = useContext(ContractContext);

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return `$${num.toLocaleString()}`;
  };

  // const getStatusColor = (status: Option["status"]) => {
  //   switch (status) {
  //     case "Active":
  //       return "text-emerald-500";
  //     case "Expired":
  //       return "text-red-500";
  //     case "Exercised":
  //       return "text-blue-500";
  //     default:
  //       return "text-red-400";
  //   }
  // };

  const onSellOptionHandler = async () => {
    console.log(1)
    if (selectedOption) {
      console.log(2, selectedOption)

      await onCloseOption(selectedOption.index);
    }
  }

  return selectedOption ? (
    <div className="w-full flex flex-col flex-grow bg-card rounded-sm rounded-t-none p-6 space-y-5 border border-t-0">
      {/* Token Selection */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-foreground">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedOption(null)}
            className="mr-2 -ml-2 px-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <Image src={selectedOption.logo} alt={selectedOption.token} width={20} height={20} className="w-6 h-6 rounded-full" />
          <span className="font-semibold">{selectedOption.symbol}</span>
          <span className="text-sm text-secondary-foreground">
            {selectedOption.purchaseDate
              ? format(selectedOption.purchaseDate, "dd MMM yyyy")
              : "No Date Available"}
          </span>
        </div>
      </div>

      {/* Trading Direction and Status */}
      <div className="flex items-center space-x-3">
        <div
          className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md border ${selectedOption.type === "Call"
            ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
            : "border-red-500 bg-red-500/10 text-red-500"
            }`}
        >
          {selectedOption.type === "Call" ? (
            <>
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Call
            </>
          ) : (
            <>
              <ArrowDownRight className="w-4 h-4 mr-2" />
              Put
            </>
          )}
        </div>
        <div
          className={`px-4 py-2 rounded-md bg-secondary text-emerald-500`}
        >
          Active
        </div>
      </div>

      {/* Strike Price */}
      <div className="space-y-2">
        <label className="text-secondary-foreground text-sm">
          Strike price
        </label>
        <div className="grid grid-cols-1 gap-2">
          <div className="w-full flex items-center px-4 py-2 rounded-sm bg-backgroundSecondary text-primary">
            {formatPrice(`${selectedOption.strikePrice}`)}
          </div>
        </div>
      </div>

      {/* Expiration */}
      <div className="space-y-2">
        <label className="text-secondary-foreground text-sm">Expiration</label>
        <div className="grid grid-cols-1 gap-2">
          <div className="w-full flex items-center px-4 py-2 rounded-sm bg-backgroundSecondary text-primary">
            {format(selectedOption.expiry, "dd MMM yyyy")}
          </div>
        </div>
      </div>

      {/* Option Size */}
      <div className="space-y-2">
        <label className="text-secondary-foreground text-sm">Option Size</label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
            <Image src={selectedOption.logo} alt={selectedOption.token} width={20} height={20} className="w-6 h-6 rounded-full" />
          </div>
          <Input
            type="text"
            value={selectedOption.size}
            readOnly
            className="pl-12 py-2 pr-2 border-border text-foreground"
          />
        </div>
      </div>

      {/* Action Buttons */}

      <div className="pt-4">
        <Button className="w-full" size="lg" onClick={onSellOptionHandler}>
          Sell Option
        </Button>
      </div>
    </div>
  ) : (
    <div className="w-full flex flex-col flex-grow bg-card rounded-sm rounded-t-none p-6 space-y-6 border border-t-0">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Options</h2>
      </div>

      {positions.length > 0 ? (
        <ScrollArea className="h-[395px] w-full">
          <div className="space-y-2">
            {positions.map((option) => (
              <Button
                key={option.index}
                variant="outline"
                className="w-full h-auto p-4 border-border rounded-sm hover:text-secondary-foreground"
                onClick={() => setSelectedOption(option)}
              >
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {option.type === "Call" ? (
                      <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-500" />
                    )}
                    <span>{option.type}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span>{format(option.expiry, "MMM dd")}</span>
                    <span
                      className={`font-medium text-emerald-500`}
                    >
                      active
                    </span>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center py-8 text-secondary-foreground">
          No options found. Start trading to see your options here.
        </div>
      )}
    </div>
  );
}
