"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { io, Socket } from 'socket.io-client';
import apiService, { Position, Option, Transaction, UserStats, PoolMetrics, PriceData } from '@/services/apiService';
import { BackendTpSlOrder } from '@/types/trading';

interface DataContextType {
  // User Data
  positions: Position[];
  options: Option[];
  transactions: Transaction[];
  userStats: UserStats | null;
  tpSlOrders: { orders: BackendTpSlOrder[] };

  // Market Data
  poolMetrics: PoolMetrics;
  priceData: PriceData[];
  volumeMetrics: any;

  // Loading States
  isLoadingPositions: boolean;
  isLoadingOptions: boolean;
  isLoadingTransactions: boolean;
  isLoadingUserStats: boolean;
  isLoadingMarketData: boolean;

  // Connection Status
  isWebSocketConnected: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting' | 'failed';

  // Actions
  refreshUserData: () => Promise<void>;
  refreshMarketData: () => Promise<void>;
  refreshAll: () => Promise<void>;

  // Data Subscriptions
  subscribeToRealTimeUpdates: () => void;
  unsubscribeFromRealTimeUpdates: () => void;
  forceReconnect: () => void;
  
  // Debug
  getDebugInfo: () => any;
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
  const [tpSlOrders, setTpSlOrders] = useState<{ orders: BackendTpSlOrder[] }>({ orders: [] });

  const [poolMetrics, setPoolMetrics] = useState<PoolMetrics>({
    address: '',
    name: '',
    aumUsd: 0,
    utilizationRatio: 0,
    borrowRate: 0,
    lendingRate: 0,
    solCustody: {
      address: '',
      tokenLocked: 0,
      tokenOwned: 0,
      utilization: 0,
      borrowRate: 0,
      availableLiquidity: 0,
      totalBorrowed: 0,
    },
    usdcCustody: {
      address: '',
      tokenLocked: 0,
      tokenOwned: 0,
      utilization: 0,
      borrowRate: 0,
      availableLiquidity: 0,
      totalBorrowed: 0,
    },
    metrics: {
      totalVolume24h: 0,
      totalFees24h: 0,
      activeLongPositions: 0,
      activeShortPositions: 0,
      totalOpenInterest: 0,
      trades24h: 0,
      averageTradeSize: 0,
    },
    lastUpdated: new Date(0),
    blockHeight: 0,
  });
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [volumeMetrics, setVolumeMetrics] = useState<any>({});

  // Loading states
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [isLoadingUserStats, setIsLoadingUserStats] = useState(false);
  const [isLoadingMarketData, setIsLoadingMarketData] = useState(false);

  // Connection status
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting' | 'failed'>('disconnected');
  
  // Refs for managing connection state and intervals
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelay = useRef(1000);
  const isReconnectingRef = useRef(false);
  const userPollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const marketPollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimes = useRef({ userData: 0, marketData: 0 });
  const currentUserKey = useRef<string | null>(null);

  // ===== API DATA FETCHING =====

  const fetchUserData = useCallback(async (userKey: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const callStack = new Error().stack?.split('\n')[2]?.trim() || 'unknown';
    console.log(`🔄 [${timestamp}] fetchUserData called for: ${userKey.slice(0, 8)}... from: ${callStack}`);

    setIsLoadingPositions(true);
    setIsLoadingOptions(true);
    setIsLoadingTransactions(true);
    setIsLoadingUserStats(true);

    try {
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
        console.log('✅ Positions updated:', userPositions.value.length);
      }

      if (userOptions.status === 'fulfilled') {
        setOptions(userOptions.value);
        console.log('✅ Options updated:', userOptions.value.length);
      }

      if (userTransactions.status === 'fulfilled') {
        setTransactions(userTransactions.value);
        console.log('✅ Transactions updated:', userTransactions.value.length);
      }

      if (userStatsData.status === 'fulfilled') {
        setUserStats(userStatsData.value);
        console.log('✅ User stats updated');
      }

      if (userTpSlOrders.status === 'fulfilled') {
        setTpSlOrders(userTpSlOrders.value);
        console.log('✅ TP/SL orders updated:', userTpSlOrders.value.orders.length);
      }

      lastUpdateTimes.current.userData = Date.now();
      console.log(`✅ [${timestamp}] User data fetch completed`);
    } catch (error) {
      console.error('❌ Failed to fetch user data:', error);
    } finally {
      setIsLoadingPositions(false);
      setIsLoadingOptions(false);
      setIsLoadingTransactions(false);
      setIsLoadingUserStats(false);
    }
  }, []);

  const fetchMarketData = useCallback(async () => {
    console.log('🔄 Fetching market data...');
    setIsLoadingMarketData(true);

    try {
      const [
        poolMetricsData,
        priceDataResponse,
        volumeMetricsData
      ] = await Promise.allSettled([
        apiService.getPoolMetrics("SOL/USDC"),
        apiService.getCurrentPrices(),
        apiService.getVolumeMetrics('24h')
      ]);

      if (poolMetricsData.status === 'fulfilled') {
        setPoolMetrics(poolMetricsData.value);
        console.log('✅ Pool metrics updated');
      }

      if (priceDataResponse.status === 'fulfilled') {
        setPriceData(priceDataResponse.value);
        console.log('✅ Price data updated:', priceDataResponse.value.length);
      }

      if (volumeMetricsData.status === 'fulfilled') {
        setVolumeMetrics(volumeMetricsData.value);
        console.log('✅ Volume metrics updated');
      }

      lastUpdateTimes.current.marketData = Date.now();
    } catch (error) {
      console.error('❌ Failed to fetch market data:', error);
    } finally {
      setIsLoadingMarketData(false);
    }
  }, []);

  // ===== PUBLIC API METHODS =====

  const refreshUserData = useCallback(async () => {
    const userKey = currentUserKey.current;
    if (!userKey) return;

    // Check socket state at runtime to avoid dependency issues
    const socketConnected = socketRef.current?.connected || false;
    
    // Skip if socket is providing recent updates
    if (socketConnected && Date.now() - lastUpdateTimes.current.userData < 5000) {
      console.log('Skipping user data refresh - Socket providing updates');
      return;
    }

    await fetchUserData(userKey);
  }, [fetchUserData]); // Removed isWebSocketConnected dependency

  const refreshMarketData = useCallback(async () => {
    // Check socket state at runtime to avoid dependency issues
    const socketConnected = socketRef.current?.connected || false;
    
    // Skip if socket is providing recent updates
    if (socketConnected && Date.now() - lastUpdateTimes.current.marketData < 10000) {
      console.log('Skipping market data refresh - Socket providing updates');
      return;
    }

    await fetchMarketData();
  }, [fetchMarketData]); // Removed isWebSocketConnected dependency

  const refreshAll = useCallback(async () => {
    console.log('🔄 Refreshing all data...');
    await Promise.all([
      refreshUserData(),
      refreshMarketData()
    ]);
    console.log('✅ All data refresh completed');
  }, [refreshUserData, refreshMarketData]);

  // ===== POLLING MANAGEMENT =====

  const startUserDataPolling = useCallback(() => {
    // Always clear existing interval first
    if (userPollingIntervalRef.current) {
      console.log('⚠️ Clearing existing user data polling interval');
      clearInterval(userPollingIntervalRef.current);
      userPollingIntervalRef.current = null;
    }

    console.log('🔄 Starting user data polling (every 15s)');
    // userPollingIntervalRef.current = setInterval(() => {
    //   // Check socket state at runtime, not during callback creation
    //   const socketConnected = socketRef.current?.connected || false;
    //   console.log(`📊 User polling check: socket=${socketConnected}, user=${currentUserKey.current?.slice(0, 8)}...`);
      
    //   if (!socketConnected && currentUserKey.current) {
    //     console.log('📊 Executing user data fetch (socket disconnected)');
    //     fetchUserData(currentUserKey.current);
    //   } else if (socketConnected) {
    //     console.log('📊 Skipping user data fetch (socket connected)');
    //   } else {
    //     console.log('📊 Skipping user data fetch (no user key)');
    //   }
    // }, 15000);
  }, [fetchUserData]); // Removed isWebSocketConnected dependency

  const startMarketDataPolling = useCallback(() => {
    // Always clear existing interval first
    if (marketPollingIntervalRef.current) {
      console.log('⚠️ Clearing existing market data polling interval');
      clearInterval(marketPollingIntervalRef.current);
      marketPollingIntervalRef.current = null;
    }

    console.log('🔄 Starting market data polling (every 30s)');
    marketPollingIntervalRef.current = setInterval(() => {
      // Check socket state at runtime, not during callback creation
      const socketConnected = socketRef.current?.connected || false;
      console.log(`💰 Market polling check: socket=${socketConnected}`);
      
      if (!socketConnected) {
        console.log('💰 Executing market data fetch (socket disconnected)');
        fetchMarketData();
      } else {
        console.log('💰 Skipping market data fetch (socket connected)');
      }
    }, 30000);
  }, [fetchMarketData]); // Removed isWebSocketConnected dependency

  const stopUserDataPolling = useCallback(() => {
    if (userPollingIntervalRef.current) {
      console.log('🛑 Stopping user data polling');
      clearInterval(userPollingIntervalRef.current);
      userPollingIntervalRef.current = null;
    }
  }, []);

  const stopMarketDataPolling = useCallback(() => {
    if (marketPollingIntervalRef.current) {
      console.log('🛑 Stopping market data polling');
      clearInterval(marketPollingIntervalRef.current);
      marketPollingIntervalRef.current = null;
    }
  }, []);

  // ===== SOCKET MANAGEMENT =====

  const setupSocketEventHandlers = useCallback((socket: Socket) => {
    socket.on('connect', () => {
      console.log('✅ Socket connected - stopping all polling');
      setIsWebSocketConnected(true);
      setConnectionStatus('connected');
      reconnectAttemptsRef.current = 0;
      reconnectDelay.current = 1000;
      isReconnectingRef.current = false;

      // Clear reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Stop all polling immediately
      stopUserDataPolling();
      stopMarketDataPolling();

      // Subscribe to channels
      socket.emit('subscribe_pools', { pools: ['SOL/USDC'] });
      socket.emit('subscribe_system');

      if (currentUserKey.current) {
        socket.emit('subscribe_positions', { user: currentUserKey.current });
        socket.emit('subscribe_options', { user: currentUserKey.current });
        socket.emit('subscribe_transactions', { user: currentUserKey.current });
        socket.emit('subscribe_tpsl', { user: currentUserKey.current });
        console.log('📡 Subscribed to user channels for:', currentUserKey.current.slice(0, 8) + '...');
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason, '- starting polling');
      setIsWebSocketConnected(false);
      setConnectionStatus('disconnected');

      // Start polling only if we have a user and not already polling
      if (currentUserKey.current && !userPollingIntervalRef.current) {
        startUserDataPolling();
      }
      
      // Start market polling if not already polling
      if (!marketPollingIntervalRef.current) {
        startMarketDataPolling();
      }

      // Attempt reconnection
      if (reason !== 'io client disconnect' && reconnectAttemptsRef.current < maxReconnectAttempts) {
        attemptReconnection();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error, '- starting polling');
      setIsWebSocketConnected(false);
      setConnectionStatus('disconnected');

      // Start polling only if not already polling
      if (currentUserKey.current && !userPollingIntervalRef.current) {
        startUserDataPolling();
      }
      
      if (!marketPollingIntervalRef.current) {
        startMarketDataPolling();
      }

      // Attempt reconnection
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        attemptReconnection();
      } else {
        setConnectionStatus('failed');
      }
    });

    // Data event handlers
    socket.on('priceUpdate', (response) => {
      if (response.success && response.data && Array.isArray(response.data)) {
        setPriceData(response.data);
        lastUpdateTimes.current.marketData = Date.now();
      }
    });

    socket.on('positionUpdate', (response) => {
      if (response.success && response.data) {
        const { action, position } = response.data;
        if (position.user === currentUserKey.current) {
          if (action === 'opened') {
            setPositions(prev => [...prev, position]);
          } else if (action === 'closed' || action === 'liquidated') {
            if (position.isActive === false) {
              setPositions(prev => prev.filter(p => p.positionId !== position.positionId));
            } else {
              setPositions(prev => prev.map(p => p.positionId === position.positionId ? position : p));
            }
          }
          lastUpdateTimes.current.userData = Date.now();
        }
      }
    });

    socket.on('optionUpdate', (response) => {
      if (response.success && response.data) {
        const { action, option } = response.data;
        if (option.owner === currentUserKey.current) {
          if (action === 'created') {
            setOptions(prev => [...prev, option]);
          }
          lastUpdateTimes.current.userData = Date.now();
        }
      }
    });

    socket.on('transactionUpdate', (response) => {
      if (response.success && response.data) {
        const { transaction } = response.data;
        if (transaction.user === currentUserKey.current) {
          setTransactions(prev => [transaction, ...prev]);
          lastUpdateTimes.current.userData = Date.now();
        }
      }
    });

    socket.on('tpslUpdate', (response) => {
      if (response.success && response.data) {
        const { action, order } = response.data;
        if (order.user === currentUserKey.current) {
          if (action === 'created') {
            setTpSlOrders(prev => ({ orders: [...prev.orders, order] }));
          } else if (action === 'executed') {
            setTpSlOrders(prev => ({
              orders: prev.orders.map(o => o._id === order._id ? order : o)
            }));
          }
          lastUpdateTimes.current.userData = Date.now();
        }
      }
    });

    socket.on('poolUpdate', (response) => {
      if (response.success && response.data) {
        const { poolName, data } = response.data;
        if (poolName === 'SOL/USDC') {
          setPoolMetrics(data);
          lastUpdateTimes.current.marketData = Date.now();
        }
      }
    });

    socket.on('bulkUpdate', (data) => {
      if (data.user === currentUserKey.current) {
        switch (data.type) {
          case 'positions':
            if (data.data.success && data.data.data) {
              setPositions(data.data.data.positions || []);
              lastUpdateTimes.current.userData = Date.now();
            }
            break;
          case 'options':
            if (data.data.success && data.data.data) {
              setOptions(data.data.data.options || []);
              lastUpdateTimes.current.userData = Date.now();
            }
            break;
          case 'transactions':
            if (data.data.success && data.data.data) {
              setTransactions(data.data.data.transactions || []);
              lastUpdateTimes.current.userData = Date.now();
            }
            break;
          case 'tpsl':
            if (data.data.success && data.data.data) {
              setTpSlOrders({ orders: data.data.data.orders || [] });
              lastUpdateTimes.current.userData = Date.now();
            }
            break;
        }
      }

      if (data.type === 'pools' && data.data.success) {
        if (Array.isArray(data.data.data) && data.data.data.length > 0) {
          const solUsdcPool = data.data.data.find((pool: any) => pool.name === 'SOL/USDC');
          if (solUsdcPool) {
            setPoolMetrics(solUsdcPool);
            lastUpdateTimes.current.marketData = Date.now();
          }
        }
      }
    });
  }, [startUserDataPolling, startMarketDataPolling, stopUserDataPolling, stopMarketDataPolling]);

  const attemptReconnection = useCallback(() => {
    if (isReconnectingRef.current || reconnectAttemptsRef.current >= maxReconnectAttempts) {
      return;
    }

    isReconnectingRef.current = true;
    setConnectionStatus('reconnecting');
    
    console.log(`🔄 Reconnecting (${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts}) in ${reconnectDelay.current}ms...`);

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++;
      subscribeToRealTimeUpdates();
      reconnectDelay.current = Math.min(reconnectDelay.current * 1.5 + Math.random() * 1000, 30000);
      isReconnectingRef.current = false;
    }, reconnectDelay.current);
  }, []);

  const subscribeToRealTimeUpdates = useCallback(() => {
    // Clean up existing socket
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    try {
      const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://148.135.138.199:5005';
      console.log('🔌 Connecting to:', socketUrl);

      const socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
        reconnection: false,
        autoConnect: true,
      });

      setupSocketEventHandlers(socket);
      socketRef.current = socket;
    } catch (error) {
      console.error('❌ Socket connection failed:', error);
      setConnectionStatus('failed');
      if (currentUserKey.current) {
        startUserDataPolling();
      }
      startMarketDataPolling();
    }
  }, [setupSocketEventHandlers, startUserDataPolling, startMarketDataPolling]);

  const unsubscribeFromRealTimeUpdates = useCallback(() => {
    console.log('🔌 Unsubscribing from real-time updates');
    
    // Clear timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }

    // Stop all polling
    stopUserDataPolling();
    stopMarketDataPolling();

    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setIsWebSocketConnected(false);
    setConnectionStatus('disconnected');
    reconnectAttemptsRef.current = 0;
    isReconnectingRef.current = false;
  }, [stopUserDataPolling, stopMarketDataPolling]);

  const forceReconnect = useCallback(() => {
    console.log('🔄 Force reconnecting...');
    reconnectAttemptsRef.current = 0;
    reconnectDelay.current = 1000;
    isReconnectingRef.current = false;
    
    unsubscribeFromRealTimeUpdates();
    
    setTimeout(() => {
      subscribeToRealTimeUpdates();
    }, 1000);
  }, [unsubscribeFromRealTimeUpdates, subscribeToRealTimeUpdates]);

  // Debug function to check current state
  const getDebugInfo = useCallback(() => {
    const debugInfo = {
      socketConnected: socketRef.current?.connected || false,
      isWebSocketConnected,
      connectionStatus,
      currentUserKey: currentUserKey.current,
      userPollingActive: !!userPollingIntervalRef.current,
      marketPollingActive: !!marketPollingIntervalRef.current,
      reconnectAttempts: reconnectAttemptsRef.current,
      isReconnecting: isReconnectingRef.current,
      lastUserDataUpdate: new Date(lastUpdateTimes.current.userData).toLocaleTimeString(),
      lastMarketDataUpdate: new Date(lastUpdateTimes.current.marketData).toLocaleTimeString(),
    };
    
    console.log('🔍 DataProvider Debug Info:', debugInfo);
    return debugInfo;
  }, [isWebSocketConnected, connectionStatus]);

  // Expose debug function globally in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      (window as any).getDataProviderDebugInfo = getDebugInfo;
    }
  }, [getDebugInfo]);

  // ===== EFFECTS =====

  // Handle wallet connection changes
  useEffect(() => {
    const userKey = publicKey?.toString();
    const previousUserKey = currentUserKey.current;
    currentUserKey.current = userKey || null;

    // Only act if the connection state actually changed
    if (connected && userKey && userKey !== previousUserKey) {
      console.log('👛 Wallet connected:', userKey.slice(0, 8) + '...');
      
      // Fetch initial data
      fetchUserData(userKey);
      
      // Connect to socket (socket will handle stopping polling when connected)
      subscribeToRealTimeUpdates();
      
      // Start user polling as fallback (will be stopped if socket connects)
      if (!socketRef.current?.connected) {
        console.log('🔄 Starting user polling as fallback');
        startUserDataPolling();
      }
    } else if (!connected || !userKey) {
      console.log('👛 Wallet disconnected - cleaning up');
      
      // Clear user data
      setPositions([]);
      setOptions([]);
      setTransactions([]);
      setUserStats(null);
      setTpSlOrders({ orders: [] });
      
      // Stop user-specific polling
      stopUserDataPolling();
      
      // Disconnect socket
      unsubscribeFromRealTimeUpdates();
    }
  }, [connected, publicKey?.toString()]); // Minimal dependencies

  // Initialize market data - only run once
  useEffect(() => {
    fetchMarketData();
    startMarketDataPolling();
  }, []); // Empty dependency array - run only once on mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 DataProvider cleanup - stopping all activities');
      
      // Clear all intervals and timeouts
      if (userPollingIntervalRef.current) {
        clearInterval(userPollingIntervalRef.current);
      }
      if (marketPollingIntervalRef.current) {
        clearInterval(marketPollingIntervalRef.current);
      }
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // Disconnect socket
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }
    };
  }, []);

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

    // Connection Status
    isWebSocketConnected,
    connectionStatus,

    // Actions
    refreshUserData,
    refreshMarketData,
    refreshAll,

    // Real-time Updates
    subscribeToRealTimeUpdates,
    unsubscribeFromRealTimeUpdates,
    forceReconnect,
    
    // Debug
    getDebugInfo
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};