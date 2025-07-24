import { BackendTpSlOrder } from '@/types/trading';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

// API Response interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface Position {
  index: number,
  positionId: string;
  user: string;
  contractType: 'perp' | 'option';
  orderType: 'market' | 'limit';
  positionSide: 'long' | 'short';
  poolName: string;
  custody: string;
  entryPrice: number;
  currentPrice: number;
  positionSize: number;
  collateralUSD: number;
  collateralAmount: number;
  leverage: number;
  liquidationPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  triggerPrice?: number;
  fees: number;
  executionTime: Date;
  openedAt: Date;
  isActive: boolean;
  side: boolean; // true = long, false = short
  takeProfitPrice?: number;
  stopLossPrice?: number;
}

export interface Option {
  signature: string;
  index: number;
  owner: string;
  pool: string;
  amount: number;
  quantity: number;
  entryPrice: number;
  strikePrice: number;
  period: number;
  expiredDate: number;
  optionType: 'call' | 'put';
  premium: number;
  profit: number;
  claimed: number;
  executed: boolean;
  timestamp: Date;
}

export interface Transaction {
  signature: string;
  user: string;
  transactionType: string;
  
  poolName: string;

  collateral?: number;
  addedCollateral?: number;
  removedCollateral?: number;
  nativeCollateral?: number;
  positionSize?: number;
  price: number;
  fees?: number;
  tradeFees?: number;
  borrowFees?: number;
  leverage?: number;
  percent?: number;
  pnl?: number;
  lpTokens?: number;
  profit?: number;
  
  positionId: string;
  
  blockHeight: number;
  timestamp: Date;
  status: string;
  
  priorityFee?: number;
  slippageTolerance?: number;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface UserStats {
  user: string;
  totalVolume: number;
  totalTrades: number;
  totalProfit: number;
  winRate: number;
  activePositions: number;
  optionsTraded: number;
  perpetualsTraded: number;
  liquidationCount: number;
  lastTradeAt: Date;
}

export interface PoolMetrics {
  poolName: string;
  totalValueLocked: number;
  volume24h: number;
  trades24h: number;
  activePositions: number;
  utilizationRate: number;
  fundingRate: number;
  interestRate: number;
}

export interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  timestamp: Date;
}

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://148.135.138.199:5555/api/v1/public',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NEXT_PUBLIC_API_KEY || '',
      },
    });

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // ===== POSITION MANAGEMENT =====

  async getUserPositions(userPublicKey: string): Promise<Position[]> {
    try {
      const response = await this.api.get(`/positions/${userPublicKey}`);
      return response.data.data.positions || [];
    } catch (error) {
      console.error('Failed to fetch user positions:', error);
      return [];
    }
  }

  async getPosition(positionId: string): Promise<Position | null> {
    try {
      const response = await this.api.get(`/positions/detail/${positionId}`);
      return response.data.data || null;
    } catch (error) {
      console.error('Failed to fetch position:', error);
      return null;
    }
  }

  async getUserOptions(userPublicKey: string): Promise<Option[]> {
    try {
      const response = await this.api.get(`/options/${userPublicKey}`);
      return response.data.data.options || [];
    } catch (error) {
      console.error('Failed to fetch user options:', error);
      return [];
    }
  }

  // ===== TP/SL MANAGEMENT =====

  async getTpSlOrders(userPublicKey: string): Promise<{ orders: BackendTpSlOrder[] }> {
    try {
      const response = await this.api.get(`/trading/tpsl/${userPublicKey}`);
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch TP/SL orders:', error);
      return { orders: [] };
    }
  }

  async createTpSlOrder(orderData: {
    user: string;
    positionId: string;
    contractType: 'perp' | 'option';
    takeProfitPrice?: number;
    stopLossPrice?: number;
    poolName: string;
  }): Promise<boolean> {
    try {
      const response = await this.api.post('/trading/tpsl', orderData);
      return response.data.success || false;
    } catch (error) {
      console.error('Failed to create TP/SL order:', error);
      return false;
    }
  }

  async updateTpSlOrder(
    userPublicKey: string, 
    positionId: string, 
    updates: {
      takeProfitPrice?: number;
      stopLossPrice?: number;
    }
  ): Promise<boolean> {
    try {
      const response = await this.api.put(`/trading/tpsl/${userPublicKey}/${positionId}`, updates);
      return response.data.success || false;
    } catch (error) {
      console.error('Failed to update TP/SL order:', error);
      return false;
    }
  }

  async deleteTpSlOrder(userPublicKey: string, positionId: string): Promise<boolean> {
    try {
      const response = await this.api.delete(`/trading/tpsl/${userPublicKey}/${positionId}`);
      return response.data.success || false;
    } catch (error) {
      console.error('Failed to delete TP/SL order:', error);
      return false;
    }
  }

  // ===== TRANSACTION HISTORY =====

  async getUserTransactions(
    userPublicKey: string, 
    options?: {
      limit?: number;
      offset?: number;
      transactionType?: string;
      poolName?: string;
    }
  ): Promise<Transaction[]> {
    try {
      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.offset) params.append('offset', options.offset.toString());
      if (options?.transactionType) params.append('type', options.transactionType);
      if (options?.poolName) params.append('pool', options.poolName);

      const response = await this.api.get(`/users/${userPublicKey}/transactions?${params}`);
      return response.data.data.transactions || [];
    } catch (error) {
      console.error('Failed to fetch user transactions:', error);
      return [];
    }
  }

  // ===== USER ANALYTICS =====

  async getUserStats(userPublicKey: string): Promise<UserStats | null> {
    try {
      const response = await this.api.get(`/users/${userPublicKey}/stats`);
      return response.data.data || null;
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
      return null;
    }
  }

  async getLeaderboard(options?: {
    metric?: 'profit' | 'volume' | 'winRate';
    limit?: number;
    timeframe?: '24h' | '7d' | '30d' | 'all';
  }): Promise<UserStats[]> {
    try {
      const params = new URLSearchParams();
      if (options?.metric) params.append('metric', options.metric);
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.timeframe) params.append('timeframe', options.timeframe);

      const response = await this.api.get(`/leaderboard?${params}`);
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      return [];
    }
  }

  // ===== MARKET DATA =====

  async getPoolMetrics(poolName?: string): Promise<PoolMetrics[]> {
    try {
      const url = poolName ? `/pools/${poolName}` : '/pools';
      const response = await this.api.get(url);
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch pool metrics:', error);
      return [];
    }
  }

  async getPriceHistory(
    symbol: string, 
    timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' = '1h',
    limit: number = 100
  ): Promise<any[]> {
    try {
      const response = await this.api.get(`/markets/${symbol}/ohlcv`, {
        params: { timeframe, limit }
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch price history:', error);
      return [];
    }
  }

  async getCurrentPrices(): Promise<PriceData[]> {
    try {
      const response = await this.api.get('/markets');
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch current prices:', error);
      return [];
    }
  }

  // ===== MARKET ANALYTICS =====

  async getVolumeMetrics(timeframe: '24h' | '7d' | '30d' = '24h'): Promise<any> {
    try {
      const response = await this.api.get(`/stats/volume?timeframe=${timeframe}`);
      return response.data.data || {};
    } catch (error) {
      console.error('Failed to fetch volume metrics:', error);
      return {};
    }
  }

  async getTradeMetrics(poolName?: string): Promise<any> {
    try {
      const url = poolName ? `/markets/${poolName}/trades` : '/stats';
      const response = await this.api.get(url);
      return response.data.data || {};
    } catch (error) {
      console.error('Failed to fetch trade metrics:', error);
      return {};
    }
  }

  // ===== SYSTEM STATUS =====

  async getSystemHealth(): Promise<any> {
    try {
      const response = await this.api.get('/health');
      return response.data || {};
    } catch (error) {
      console.error('Failed to fetch system health:', error);
      return { status: 'unknown' };
    }
  }

  // ===== UTILITY METHODS =====

  setApiKey(apiKey: string): void {
    this.api.defaults.headers['x-api-key'] = apiKey;
  }

  setBaseURL(baseURL: string): void {
    this.api.defaults.baseURL = baseURL;
  }

  // Get raw axios instance for custom requests
  getAxiosInstance(): AxiosInstance {
    return this.api;
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;
export { ApiService };