"use client";

import { black_scholes, OptionDetailUtils } from "@/utils/optionsPricing";
import { differenceInSeconds } from "date-fns";
import { useState, useEffect, useContext } from "react";
import { ContractContext } from "@/contexts/contractProvider";

interface UseOptionsPricingProps {
  type: "Call" | "Put";
  strikePrice: number;
  currentPrice: number;
  expiryDate: Date;
  useEnhancedPricing?: boolean; // Flag to choose between simple and enhanced pricing
  assetType?: "SOL" | "USDC"; // Which asset's borrow rate to use
}

export function useOptionsPricing({
  type,
  strikePrice,
  currentPrice,
  expiryDate,
  useEnhancedPricing = false,
  assetType = "SOL", // Default to SOL
}: UseOptionsPricingProps) {
  const { getPoolUtilization, poolData } = useContext(ContractContext);
  const [premium, setPremium] = useState<number>(0);
  const [borrowRate, setBorrowRate] = useState<number>(0);
  const [utilizationPercent, setUtilizationPercent] = useState<number>(0);

  const seconds = differenceInSeconds(expiryDate, Date.now());
  const time = seconds / (365 * 24 * 60 * 60);

  const isCall = (type: "Call" | "Put") => {
    return type === "Call";
  };

  useEffect(() => {
    if (!strikePrice || !currentPrice || !expiryDate || time <= 0) {
      setPremium(0);
      setBorrowRate(0);
      setUtilizationPercent(0);
      return;
    }

    let calculatedPremium: number;
    let currentBorrowRate: number = 0;
    let currentUtilization: number = 0;

    if (useEnhancedPricing && poolData) {
      // Get pool utilization data from context
      const utilization = getPoolUtilization(assetType);

      if (utilization) {
        currentBorrowRate = utilization.borrowRate;
        currentUtilization = utilization.utilizationPercent;

        // Use enhanced Black-Scholes with dynamic borrow rate
        calculatedPremium = OptionDetailUtils.blackScholesWithBorrowRate(
          currentPrice,
          strikePrice,
          time,
          isCall(type),
          utilization.tokenLocked,
          utilization.tokenOwned,
          assetType === "SOL"
        );
      } else {
        // Fallback to simple pricing if no pool data available
        calculatedPremium = black_scholes(
          currentPrice,
          strikePrice,
          time,
          isCall(type)
        );
      }
    } else {
      // Use simple Black-Scholes
      calculatedPremium = black_scholes(
        currentPrice,
        strikePrice,
        time,
        isCall(type)
      );
    }

    setPremium(Math.max(0, calculatedPremium));
    setBorrowRate(currentBorrowRate);
    setUtilizationPercent(currentUtilization);
  }, [
    type,
    strikePrice,
    currentPrice,
    expiryDate,
    time,
    useEnhancedPricing,
    assetType,
    poolData, // Re-run when pool data updates
    getPoolUtilization
  ]);

  return {
    premium,
    borrowRate,
    utilizationPercent,
    time,
    poolDataAvailable: !!poolData,
    lastPoolUpdate: poolData?.lastUpdated || 0,
  };
}