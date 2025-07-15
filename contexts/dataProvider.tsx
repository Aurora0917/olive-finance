"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import apiService, { Position, Option, Transaction, UserStats, PoolMetrics, PriceData } from '@/services/apiService';
import { usePythPrice } from '@/hooks/usePythPrice';

interface DataContextType {
  // User Data
  positions: Position[];
  options: Option[];
  transactions: Transaction[];
  userStats: UserStats | null;
  tpSlOrders: any[];
  
  // Market Data
  poolMetrics: PoolMetrics[];
  priceData: PriceData[];
  volumeMetrics: any;
  
  // Loading States
  isLoadingPositions: boolean;
  isLoadingOptions: boolean;
  isLoadingTransactions: boolean;
  isLoadingUserStats: boolean;
  isLoadingMarketData: boolean;
  
  // Actions
  refreshUserData: () => Promise<void>;
  refreshMarketData: () => Promise<void>;
  refreshAll: () => Promise<void>;
  
  // TP/SL Data (read-only - managed onchain)
  // Note: TP/SL operations now trigger onchain transactions directly
  // Backend automatically indexes these changes
  
  // Data Subscriptions
  subscribeToRealTimeUpdates: () => void;
  unsubscribeFromRealTimeUpdates: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: React.ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const { publicKey, connected } = useWallet();
  
  // State
  const [positions, setPositions] = useState<Position[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [tpSlOrders, setTpSlOrders] = useState<any[]>([]);
  
  const [poolMetrics, setPoolMetrics] = useState<PoolMetrics[]>([]);
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [volumeMetrics, setVolumeMetrics] = useState<any>({});
  
  // Loading states
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [isLoadingUserStats, setIsLoadingUserStats] = useState(false);
  const [isLoadingMarketData, setIsLoadingMarketData] = useState(false);
  
  // Real-time updates
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  
  // Refresh intervals
  const refreshIntervals = useRef<{
    userData?: NodeJS.Timeout;
    marketData?: NodeJS.Timeout;
    priceData?: NodeJS.Timeout;
  }>({});

  // ===== USER DATA MANAGEMENT =====
  
  const refreshUserData = useCallback(async () => {
    if (!publicKey || !connected) {
      // Clear user data when wallet disconnected
      setPositions([]);
      setOptions([]);
      setTransactions([]);
      setUserStats(null);
      setTpSlOrders([]);
      return;
    }

    const userKey = publicKey.toString();
    
    try {
      // Fetch all user data in parallel
      const [
        userPositions,
        userOptions,
        userTransactions,
        userStatsData,
        userTpSlOrders
      ] = await Promise.allSettled([
        apiService.getUserPositions(userKey),
        apiService.getUserOptions(userKey),
        apiService.getUserTransactions(userKey, { limit: 50 }),
        apiService.getUserStats(userKey),
        apiService.getTpSlOrders(userKey)
      ]);

      if (userPositions.status === 'fulfilled') {
        setPositions(userPositions.value);
      }
      if (userOptions.status === 'fulfilled') {
        setOptions(userOptions.value);
      }
      if (userTransactions.status === 'fulfilled') {
        setTransactions(userTransactions.value);
      }
      if (userStatsData.status === 'fulfilled') {
        setUserStats(userStatsData.value);
      }
      if (userTpSlOrders.status === 'fulfilled') {
        setTpSlOrders(userTpSlOrders.value);
      }

      console.log('User data refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  }, [publicKey, connected]);

  // ===== MARKET DATA MANAGEMENT =====
  
  const refreshMarketData = useCallback(async () => {
    setIsLoadingMarketData(true);
    
    try {
      // Fetch market data in parallel
      const [
        poolMetricsData,
        priceDataResponse,
        volumeMetricsData
      ] = await Promise.allSettled([
        apiService.getPoolMetrics(),
        apiService.getCurrentPrices(),
        apiService.getVolumeMetrics('24h')
      ]);

      if (poolMetricsData.status === 'fulfilled') {
        setPoolMetrics(poolMetricsData.value);
      }
      if (priceDataResponse.status === 'fulfilled') {
        setPriceData(priceDataResponse.value);
      }
      if (volumeMetricsData.status === 'fulfilled') {
        setVolumeMetrics(volumeMetricsData.value);
      }

      console.log('Market data refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh market data:', error);
    } finally {
      setIsLoadingMarketData(false);
    }
  }, []);

  // ===== REFRESH ALL DATA =====
  
  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshUserData(),
      refreshMarketData()
    ]);
  }, [refreshUserData, refreshMarketData]);

  // ===== TP/SL DATA MANAGEMENT =====
  // TP/SL operations are now handled onchain via contract provider
  // Backend automatically indexes onchain TP/SL changes
  // Data provider only fetches indexed TP/SL data from backend

  // ===== REAL-TIME UPDATES =====
  
  const subscribeToRealTimeUpdates = useCallback(() => {
    if (!publicKey || wsConnection) return;

    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://148.135.138.199:5555';
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Connected to real-time updates');
        
        // Subscribe to user-specific updates
        ws.send(JSON.stringify({
          type: 'subscribe',
          channels: ['prices', 'positions', 'tpsl'],
          user: publicKey.toString()
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'priceUpdate':
              setPriceData(prev => {
                const newData = [...prev];
                const index = newData.findIndex(p => p.symbol === data.symbol);
                if (index >= 0) {
                  newData[index] = { ...newData[index], ...data.data };
                } else {
                  newData.push(data.data);
                }
                return newData;
              });
              break;
              
            case 'positionUpdate':
              if (data.user === publicKey.toString()) {
                setPositions(prev => {
                  const newPositions = [...prev];
                  const index = newPositions.findIndex(p => p.positionId === data.positionId);
                  if (index >= 0) {
                    newPositions[index] = { ...newPositions[index], ...data.updates };
                  }
                  return newPositions;
                });
              }
              break;
              
            case 'tpslUpdate':
              if (data.user === publicKey.toString()) {
                // Refresh TP/SL orders when updated
                apiService.getTpSlOrders(publicKey.toString()).then(setTpSlOrders);
              }
              break;
              
            default:
              console.log('Unknown WebSocket message:', data);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('Disconnected from real-time updates');
        setWsConnection(null);
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (publicKey && connected) {
            subscribeToRealTimeUpdates();
          }
        }, 5000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      setWsConnection(ws);
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
    }
  }, [publicKey, connected, wsConnection]);

  const unsubscribeFromRealTimeUpdates = useCallback(() => {
    if (wsConnection) {
      wsConnection.close();
      setWsConnection(null);
    }
  }, [wsConnection]);

  // ===== EFFECTS =====
  
  // Initial data load and wallet connection handling
  useEffect(() => {
    if (connected && publicKey) {
      refreshUserData();
      subscribeToRealTimeUpdates();
    } else {
      unsubscribeFromRealTimeUpdates();
      // Clear user data when wallet disconnected
      setPositions([]);
      setOptions([]);
      setTransactions([]);
      setUserStats(null);
      setTpSlOrders([]);
    }
  }, [connected, publicKey, refreshUserData, subscribeToRealTimeUpdates, unsubscribeFromRealTimeUpdates]);

  // Market data - load once on mount
  useEffect(() => {
    refreshMarketData();
  }, [refreshMarketData]);

  // Set up refresh intervals
  useEffect(() => {
    // Refresh user data every 30 seconds
    if (connected && publicKey) {
      refreshIntervals.current.userData = setInterval(() => {
        refreshUserData();
      }, 30000);
    }

    // Refresh market data every 60 seconds
    refreshIntervals.current.marketData = setInterval(() => {
      refreshMarketData();
    }, 60000);

    // Cleanup intervals
    return () => {
      if (refreshIntervals.current.userData) {
        clearInterval(refreshIntervals.current.userData);
      }
      if (refreshIntervals.current.marketData) {
        clearInterval(refreshIntervals.current.marketData);
      }
    };
  }, [connected, publicKey, refreshUserData, refreshMarketData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribeFromRealTimeUpdates();
      Object.values(refreshIntervals.current).forEach(interval => {
        if (interval) clearInterval(interval);
      });
    };
  }, [unsubscribeFromRealTimeUpdates]);

  const value: DataContextType = {
    // User Data
    positions,
    options,
    transactions,
    userStats,
    tpSlOrders,
    
    // Market Data
    poolMetrics,
    priceData,
    volumeMetrics,
    
    // Loading States
    isLoadingPositions,
    isLoadingOptions,
    isLoadingTransactions,
    isLoadingUserStats,
    isLoadingMarketData,
    
    // Actions
    refreshUserData,
    refreshMarketData,
    refreshAll,
    
    // TP/SL Data (read-only)
    // Operations handled onchain via contract provider
    
    // Real-time Updates
    subscribeToRealTimeUpdates,
    unsubscribeFromRealTimeUpdates
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};