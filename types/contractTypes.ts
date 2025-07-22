import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

/**
 * Core contract types and interfaces
 */

// Pool related types
export interface PoolUtilization {
  tokenLocked: number;
  tokenOwned: number;
  utilizationPercent: number;
  borrowRate: number;
}

export interface PoolData {
  sol: PoolUtilization;
  usdc: PoolUtilization;
  lastUpdated: number;
}

export interface PoolStats {
  totalSolLocked: number;
  totalUsdcLocked: number;
  totalSolOwned: number;
  totalUsdcOwned: number;
  avgUtilization: number;
  avgBorrowRate: number;
  lastUpdated: number;
}

// Volume related types
export interface VolumeData {
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

// Trading related types
export interface PerpTPSL {
  price: number;
  sizePercent: number; // 0-100
}

export interface TPSLUpdate {
  updateTPs?: Array<{
    index: number;
    price?: number;
    sizePercent?: number;
  }>;
  updateSLs?: Array<{
    index: number;
    price?: number;
    sizePercent?: number;
  }>;
}

export interface TPSLRemoval {
  removeTPs?: number[];
  removeSLs?: number[];
}

// Position related types
export interface ExpiredOption {
  index: any;
  token: any;
  transaction: any;
  strikePrice: any;
  symbol: any;
  qty: any;
  expiryPrice: any;
  tokenAmount: any;
  dollarAmount: any;
  iconPath: any;
}

// Transaction building types
export interface TransactionParams {
  feePayer: PublicKey;
  recentBlockhash?: string;
}

export interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
}

// Contract method parameter types
export interface OpenOptionParams {
  amount: number;
  strike: number;
  period: number;
  expiredTime: number;
  isCall: boolean;
  paySol: boolean;
  limitPrice?: number;
}

export interface EditOptionParams {
  optionIndex: number;
  poolName: string;
  newSize?: number;
  newStrike?: number;
  newExpiry?: number;
  maxAdditionalPremium?: number;
  minRefundAmount?: number;
  paymentToken?: 'SOL' | 'USDC';
}

export interface OpenPerpParams {
  collateralAmount: number;
  positionAmount: number;
  side: "long" | "short";
  type: "limit" | "market";
  triggerPrice?: number;
  maxSlippage?: number;
  triggerAboveThreshold?: boolean;
  paySol?: boolean;
}

export interface ClosePerpParams {
  positionIndex: number;
  closePercentage?: number; // 1-100
  receiveAsset?: "SOL" | "USDC";
  minPrice?: number;
}

export interface CollateralParams {
  positionIndex: number;
  collateralAmount: number;
  paySol?: boolean; // for add
  receiveSol?: boolean; // for remove
}

export interface LiquidityParams {
  amount: number;
  asset: PublicKey;
  minLpAmountOut?: number; // for add
  minAmountOut?: number; // for remove
}

// Contract account types
export interface OptionDetailAccount {
  index: BN;
  owner: PublicKey;
  amount: BN;
  strikePrice: number;
  expiredDate: BN;
  valid: boolean;
  executed: number;
  exercised: number;
  claimed: number;
  quantity: BN;
  purchaseDate: number;
  limitPrice?: number;
  entryPrice: number;
  profit: number;
  lockedAsset: PublicKey;
  premiumAsset: PublicKey;
}

export interface PositionAccount {
  index: number;
  owner: PublicKey;
  sizeUsd: BN;
  collateralUsd: BN;
  price: number;
  liquidationPrice: number;
  side: { long: {} } | { short: {} };
  openTime: BN;
  isLiquidated: boolean;
}

export interface UserAccount {
  optionIndex: BN;
  perpPositionCount: BN;
}

// Pool and custody account types
export interface PoolAccount {
  custodies: PublicKey[];
  ratios: number[];
}

export interface CustodyAccount {
  mint: PublicKey;
  tokenAccount: PublicKey;
  oracle: PublicKey;
  tokenLocked: BN;
  tokenOwned: BN;
  fees: {
    ratioMult: BN;
    addLiquidity: BN;
    removeLiquidity: BN;
  };
}

// TP/SL orderbook types
export interface TpSlOrderbook {
  owner: PublicKey;
  positionIndex: number;
  takeProfits: TpSlOrder[];
  stopLosses: TpSlOrder[];
}

export interface TpSlOrder {
  price: BN;
  sizePercent: number; // 0-10000 (basis points)
  isActive: boolean;
}

// Error types
export interface ContractError {
  code: number;
  message: string;
  logs?: string[];
}

// Hook return types
export interface PositionManagementHook {
  positions: any[];
  expiredPositions: ExpiredOption[];
  donePositions: any[];
  perpPositions: any[];
  positionsLoading: boolean;
  refreshPositions: () => Promise<void>;
  refreshPerpPositions: () => Promise<void>;
}

export interface VolumeCalculationHook {
  volumeData: VolumeData | null;
  getVolumeData: () => VolumeData | null;
  refreshVolumeData: () => Promise<void>;
}

export interface PoolDataHook {
  poolData: PoolData | null;
  getPoolUtilization: (asset: "SOL" | "USDC") => PoolUtilization | null;
  refreshPoolData: () => Promise<any>;
  isPoolDataStale: (maxAgeMs?: number) => boolean;
  getPoolStats: () => PoolStats | null;
}

// Constants and enums
export enum OrderType {
  Market = "market",
  Limit = "limit"
}

export enum PositionSide {
  Long = "long",
  Short = "short"
}

export enum OptionType {
  Call = "Call",
  Put = "Put"
}

export enum AssetType {
  SOL = "SOL",
  USDC = "USDC"
}

// Utility types
export type PoolName = "SOL/USDC";
export type ContractType = 0 | 1; // 0 for perp, 1 for option

export interface PDASeeds {
  pool: [string, string]; // ["pool", poolName]
  custody: [string, Buffer, Buffer]; // ["custody", pool, mint]
  position: [string, Buffer, Buffer, Buffer]; // ["position", owner, index, pool]
  user: [string, Buffer]; // ["user", owner]
  option: [string, Buffer, Buffer, Buffer, Buffer]; // ["option", owner, index, pool, custody]
  tpSlOrderbook: [string, Buffer, Buffer, string, Buffer]; // ["tp_sl_orderbook", owner, index, poolName, contractType]
}