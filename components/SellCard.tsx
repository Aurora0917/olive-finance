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
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import { ContractContext } from "@/contexts/contractProvider";
import { Position } from "@/lib/data/Positions";

// Type guard to check if value is a BigNumber-like object
const isBigNumber = (value: any): value is { toNumber: () => number } => {
  return value && typeof value === 'object' && typeof value.toNumber === 'function';
};

// Helper function to safely convert BigNumber or number to JavaScript number
const toNumber = (value: any): number => {
  if (isBigNumber(value)) {
    return value.toNumber();
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return parseFloat(value);
  }
  return 0;
};

export default function SellCard() {
  const { connected } = useWallet();
  const wallet = useAnchorWallet();
  const [selectedOption, setSelectedOption] = useState<Position | null>(null);
  const [closeQuantity, setCloseQuantity] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { onCloseOption, onCloseLimitOption } = useContext(ContractContext);

  // Reset close quantity when option changes
  useEffect(() => {
    if (selectedOption) {
      const quantity = toNumber(selectedOption.quantity);
      console.log(selectedOption);
      setCloseQuantity(quantity.toString());
    }
  }, [selectedOption]);

  const formatPrice = (price: any): string => {
    const num = toNumber(price);
    return `$${num.toLocaleString()}`;
  };

  const validateCloseQuantity = (): { isValid: boolean; error?: string } => {
    if (!selectedOption) return { isValid: false, error: "No option selected" };

    const quantity = parseFloat(closeQuantity);
    const maxQuantity = toNumber(selectedOption.quantity);

    if (isNaN(quantity) || quantity <= 0) {
      return { isValid: false, error: "Quantity must be a positive number" };
    }

    if (quantity > maxQuantity) {
      return { isValid: false, error: `Cannot close more than ${maxQuantity} calls` };
    }

    if (!Number.isInteger(quantity)) {
      return { isValid: false, error: "Quantity must be a whole number" };
    }

    return { isValid: true };
  };

  const onSellOptionHandler = async (): Promise<void> => {
    if (!selectedOption) return;

    const validation = validateCloseQuantity();
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    setIsSubmitting(true);
    try {
      console.log("Closing option:", selectedOption.index, "Quantity:", closeQuantity);
      let success;
      if (selectedOption.limitPrice === 0) {
        success = await onCloseOption(selectedOption.index, parseInt(closeQuantity));
      } else {
        success = await onCloseLimitOption(selectedOption.index, parseInt(closeQuantity));
      }

      if (success) {
        // Reset to list view after successful close
        setSelectedOption(null);
        setCloseQuantity("");
      }
    } catch (error) {
      console.error("Error closing option:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuantityChange = (value: string): void => {
    // Only allow numbers
    const sanitized = value.replace(/[^0-9]/g, '');
    setCloseQuantity(sanitized);
  };

  const setMaxQuantity = (): void => {
    if (selectedOption) {
      const maxQuantity = toNumber(selectedOption.quantity);
      setCloseQuantity(maxQuantity.toString());
    }
  };

  const validation = validateCloseQuantity();
  const currentQuantity = selectedOption ? toNumber(selectedOption.quantity) : 0;
  const isPartialClose = selectedOption && parseFloat(closeQuantity) < currentQuantity;

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
          className={`px-4 py-2 rounded-md bg-secondary ${(selectedOption.limitPrice != 0 && !selectedOption.executed)? 'text-red-500' : 'text-emerald-500'}`}
        >
          {selectedOption.limitPrice != 0 && selectedOption.executed == false ? 'Not Executed' : 'Active'}
        </div>
      </div>

      {/* Strike Price */}
      <div className="space-y-2">
        <label className="text-secondary-foreground text-sm">
          Strike price
        </label>
        <div className="grid grid-cols-1 gap-2">
          <div className="w-full flex items-center px-4 py-2 rounded-sm bg-backgroundSecondary text-primary">
            {formatPrice(selectedOption.strikePrice)}
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

      {/* Total Position Size */}
      <div className="space-y-2">
        <label className="text-secondary-foreground text-sm">Total Position</label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
            <Image src={selectedOption.logo} alt={selectedOption.token} width={20} height={20} className="w-6 h-6 rounded-full" />
          </div>
          <div className="pl-12 py-2 pr-2 border border-border rounded-sm bg-backgroundSecondary text-foreground flex items-center">
            {currentQuantity} Contracts
          </div>
        </div>
      </div>

      {/* Close Quantity */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-secondary-foreground text-sm">
            Quantity to Close
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={setMaxQuantity}
            className="text-xs text-blue-500 hover:text-blue-600 h-auto p-1"
          >
            Max
          </Button>
        </div>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
            <Image src={selectedOption.logo} alt={selectedOption.token} width={20} height={20} className="w-6 h-6 rounded-full" />
          </div>
          <Input
            type="text"
            value={closeQuantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
            placeholder="Enter quantity"
            className={`pl-12 py-2 pr-2 border-border text-foreground ${!validation.isValid && closeQuantity ? 'border-red-500' : ''
              }`}
          />
        </div>
        {!validation.isValid && closeQuantity && (
          <p className="text-red-500 text-xs">{validation.error}</p>
        )}
        {isPartialClose && validation.isValid && (
          <p className="text-blue-500 text-xs">
            Partial close: {parseFloat(closeQuantity)} of {currentQuantity} Contracts
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-4">
        <Button
          className="w-full"
          size="lg"
          onClick={onSellOptionHandler}
          disabled={!validation.isValid || isSubmitting}
        >
          {isSubmitting
            ? "Processing..."
            : isPartialClose
              ? `Partially Close Position (${closeQuantity}/${currentQuantity})`
              : "Close Full Position"
          }
        </Button>
      </div>
    </div>
  ) : (
    <div className="w-full flex flex-col flex-grow bg-card rounded-sm rounded-t-none p-6 space-y-6 border border-t-0">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Options</h2>
      </div>

      {/* {positions.length > 0 ? (
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
                    <span className="text-xs text-secondary-foreground">
                      {toNumber(option.quantity)} Contracts
                    </span>
                    <span
                      className={`font-medium ${(option.limitPrice != 0 && !option.executed)? 'text-red-500' : 'text-emerald-500'}`}
                    >
                      {option.limitPrice != 0 && option.executed == false ? 'Not Executed' : 'Active'}
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
      )} */}
    </div>
  );
}