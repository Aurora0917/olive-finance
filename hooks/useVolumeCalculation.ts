import { useState, useCallback, useEffect } from "react";
import { Position } from "@/lib/data/Positions";
import { Transaction, FuturePos } from "@/lib/data/WalletActivity";
import { TradingUtils } from "@/utils/optionsPricing";

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

interface PoolUtilization {
  tokenLocked: number;
  tokenOwned: number;
  utilizationPercent: number;
  borrowRate: number;
}

/**
 * Hook for calculating and managing volume data
 */
export const useVolumeCalculation = (
  positions: Position[],
  perpPositions: FuturePos[],
  donePositions: Transaction[],
  currentPrice: number,
  getPoolUtilization: (asset: "SOL" | "USDC") => PoolUtilization | null
) => {
  const [volumeData, setVolumeData] = useState<VolumeData | null>(null);

  /**
   * Calculates volume data from positions
   */
  const calculateVolumeData = useCallback((): VolumeData => {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    let volume24h = 0;
    let optionsCount24h = 0;
    let perpsCount24h = 0;
    let callCount = 0;
    let putCount = 0;
    let longCount = 0;
    let shortCount = 0;
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
        optionsCount24h++;

        // Calculate option premium for volume
        try {
          const timeToExpiry = (new Date(position.expiry).getTime() - now) / (365.25 * 24 * 60 * 60 * 1000);
          const utilization = getPoolUtilization(isCall ? 'SOL' : 'USDC');
          
          if (utilization && currentPrice > 0) {
            const premium = TradingUtils.blackScholesWithBorrowRate(
              currentPrice,
              position.strikePrice,
              Math.max(timeToExpiry, 0.001),
              isCall,
              utilization.tokenLocked,
              utilization.tokenOwned,
              isCall,
            );

            const optionValue = (premium || 0) * position.size;
            optionVolume24h += optionValue;
            volume24h += optionValue;
          }
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
      const isLong = perpPosition.position === 'long';
      if (isLong) longCount++;
      else shortCount++;
      
      const purchaseTime = new Date(perpPosition.purchaseDate).getTime();
      if (purchaseTime >= oneDayAgo) {
        // Perp volume = position size * current price
        const perpValue = perpPosition.size * (currentPrice || 0);
        perpsCount24h++;
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
          
          if (utilization && currentPrice > 0) {
            const premium = TradingUtils.blackScholesWithBorrowRate(
              currentPrice,
              donePosition.strikePrice,
              timeToExpiry,
              isCall,
              utilization.tokenLocked,
              utilization.tokenOwned,
              isCall,
            );

            const completedValue = premium * donePosition.quantity;
            volume24h += completedValue;
          }
        } catch (error) {
          // Fallback for completed options
          const estimatedValue = donePosition.quantity * donePosition.strikePrice * 0.1; // 10% of notional
          volume24h += estimatedValue;
        }
      }
    });

    return {
      volume24h: Math.round(volume24h * 100) / 100, // Round to 2 decimals
      optionsCount24h,
      perpsCount24h,
      callCount,
      putCount,
      longCount,
      shortCount,
      callCount24h,
      putCount24h,
      optionVolume24h: Math.round(optionVolume24h * 100) / 100,
      perpVolume24h: Math.round(perpVolume24h * 100) / 100,
      lastUpdated: now
    };
  }, [positions, perpPositions, donePositions, currentPrice, getPoolUtilization]);

  /**
   * Refreshes volume data
   */
  const refreshVolumeData = useCallback(async () => {
    try {
      const newVolumeData = calculateVolumeData();
      setVolumeData(newVolumeData);
      console.log("Updated volume data:", newVolumeData);
    } catch (error) {
      console.error("Error calculating volume data:", error);
    }
  }, [calculateVolumeData]);

  /**
   * Gets current volume data
   */
  const getVolumeData = useCallback((): VolumeData | null => {
    return volumeData;
  }, [volumeData]);

  // Auto-refresh volume data when price changes significantly
  useEffect(() => {
    if (volumeData && currentPrice) {
      const lastUpdate = volumeData.lastUpdated;
      const timeSinceUpdate = Date.now() - lastUpdate;

      // Refresh every 5 minutes or when price changes significantly
      if (timeSinceUpdate > 5 * 60 * 1000) {
        refreshVolumeData();
      }
    }
  }, [currentPrice, volumeData, refreshVolumeData]);

  // Initial calculation when positions change
  useEffect(() => {
    if (positions.length > 0 || perpPositions.length > 0 || donePositions.length > 0) {
      refreshVolumeData();
    }
  }, [positions, perpPositions, donePositions, refreshVolumeData]);

  return {
    volumeData,
    getVolumeData,
    refreshVolumeData,
    calculateVolumeData,
  };
};