import { useState, useCallback, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { OptionContract } from "@/lib/idl/option_contract";
import { PDAs } from "@/utils/pdas";
import { OptionDetailUtils } from "@/utils/optionsPricing";
import {
  USDC_DECIMALS,
  USDC_MINT,
  WSOL_DECIMALS,
  WSOL_MINT,
} from "@/utils/const";

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

/**
 * Hook for managing pool data and utilization
 */
export const usePoolData = (
  program: Program<OptionContract> | undefined,
  publicKey: PublicKey | null
) => {
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Helper function to calculate pool utilization
   */
  const calculateUtilization = useCallback((
    custodyData: any,
    decimals: number,
    isSol: boolean
  ): PoolUtilization => {
    const tokenLocked = custodyData.tokenLocked.toNumber() / (isSol ? 10 ** 9 : 10 ** 6);
    const tokenOwned = custodyData.tokenOwned.toNumber() / (isSol ? 10 ** 9 : 10 ** 6);

    // Calculate utilization percentage
    const utilizationPercent = tokenOwned > 0 ? (tokenLocked / tokenOwned) * 100 : 0;

    // Calculate borrow rate using the existing utility
    const borrowRate = OptionDetailUtils.calculateBorrowRate(
      tokenLocked,
      tokenOwned,
      isSol
    );

    const hourlyRate = borrowRate / 365 / 24;

    return {
      tokenLocked,
      tokenOwned,
      utilizationPercent,
      borrowRate: hourlyRate,
    };
  }, []);

  /**
   * Refreshes pool data from the blockchain
   */
  const refreshPoolData = useCallback(async (
    programInstance?: Program<OptionContract>
  ): Promise<[Map<string, any>, Map<string, any>] | undefined> => {
    const prog = programInstance || program;
    
    if (!prog) {
      console.log("No program available for pool data refresh");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("Fetching pool data...");
      const pool = PDAs.getPool("SOL/USDC", prog.programId);
      
      const custodies = new Map<string, any>();
      const ratios = new Map<string, any>();
      
      // Fetch pool data
      const poolAccountData = await prog.account.pool.fetch(pool);
      console.log("Pool account data:", poolAccountData);

      // Fetch custody data for each custody in the pool
      for (const [index, custody] of poolAccountData.custodies.entries()) {
        try {
          const custodyData = await prog.account.custody.fetch(new PublicKey(custody));
          const mint = custodyData.mint;
          
          custodies.set(mint.toBase58(), custodyData);
          ratios.set(mint.toBase58(), poolAccountData.ratios[index]);
          
          console.log(`Loaded custody for mint ${mint.toBase58()}:`, {
            tokenLocked: custodyData.tokenLocked.toString(),
            tokenOwned: custodyData.tokenOwned.toString()
          });
        } catch (custodyError) {
          console.error(`Error fetching custody ${custody}:`, custodyError);
        }
      }

      // Get specific custody data for SOL and USDC
      const solCustodyData = custodies.get(WSOL_MINT.toBase58());
      const usdcCustodyData = custodies.get(USDC_MINT.toBase58());

      if (!solCustodyData || !usdcCustodyData) {
        throw new Error("Missing SOL or USDC custody data");
      }

      // Calculate utilization data
      const newPoolData: PoolData = {
        sol: calculateUtilization(solCustodyData, WSOL_DECIMALS, true),
        usdc: calculateUtilization(usdcCustodyData, USDC_DECIMALS, false),
        lastUpdated: Date.now(),
      };

      console.log("Updated pool utilization data:", newPoolData);
      setPoolData(newPoolData);
      setError(null);

      return [custodies, ratios];
    } catch (error: any) {
      console.error("Error refreshing pool data:", error);
      setError(error.message || "Failed to fetch pool data");
      
      // Don't clear existing data on error, just log it
      if (!poolData) {
        // Only set to empty data if we don't have any data yet
        console.log("Setting fallback pool data due to fetch error");
        setPoolData({
          sol: {
            tokenLocked: 0,
            tokenOwned: 0,
            utilizationPercent: 0,
            borrowRate: 0,
          },
          usdc: {
            tokenLocked: 0,
            tokenOwned: 0,
            utilizationPercent: 0,
            borrowRate: 0,
          },
          lastUpdated: Date.now(),
        });
      }
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [program, calculateUtilization, poolData]);

  /**
   * Function to get pool utilization for specific asset
   */
  const getPoolUtilization = useCallback((asset: "SOL" | "USDC"): PoolUtilization | null => {
    if (!poolData) return null;
    return asset === "SOL" ? poolData.sol : poolData.usdc;
  }, [poolData]);

  /**
   * Gets current pool data
   */
  const getCurrentPoolData = useCallback((): PoolData | null => {
    return poolData;
  }, [poolData]);

  /**
   * Checks if pool data is stale and needs refresh
   */
  const isPoolDataStale = useCallback((maxAgeMs: number = 5 * 60 * 1000): boolean => {
    if (!poolData) return true;
    
    const ageMs = Date.now() - poolData.lastUpdated;
    return ageMs > maxAgeMs;
  }, [poolData]);

  /**
   * Gets pool statistics
   */
  const getPoolStats = useCallback(() => {
    if (!poolData) return null;

    const totalSolLocked = poolData.sol.tokenLocked;
    const totalUsdcLocked = poolData.usdc.tokenLocked;
    const totalSolOwned = poolData.sol.tokenOwned;
    const totalUsdcOwned = poolData.usdc.tokenOwned;

    // Calculate total TVL in USD (assuming SOL price would be passed separately)
    const avgUtilization = (poolData.sol.utilizationPercent + poolData.usdc.utilizationPercent) / 2;
    const avgBorrowRate = (poolData.sol.borrowRate + poolData.usdc.borrowRate) / 2;

    return {
      totalSolLocked,
      totalUsdcLocked,
      totalSolOwned,
      totalUsdcOwned,
      avgUtilization,
      avgBorrowRate,
      lastUpdated: poolData.lastUpdated,
    };
  }, [poolData]);

  // Auto-fetch pool data when program becomes available
  useEffect(() => {
    if (program && !poolData && !isLoading) {
      console.log("Auto-fetching pool data on program load");
      refreshPoolData(program);
    }
  }, [program, poolData, isLoading, refreshPoolData]);

  // Periodic refresh of pool data (every 30 seconds)
  useEffect(() => {
    if (!program) return;

    const interval = setInterval(() => {
      if (isPoolDataStale(30000)) { // 30 seconds
        console.log("Auto-refreshing stale pool data");
        refreshPoolData(program);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [program, refreshPoolData, isPoolDataStale]);

  return {
    poolData,
    isLoading,
    error,
    getPoolUtilization,
    getCurrentPoolData,
    refreshPoolData,
    isPoolDataStale,
    getPoolStats,
    calculateUtilization,
  };
};