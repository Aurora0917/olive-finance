"use client";

import { useContext, useEffect, useState } from "react";
import { MoreHorizontal, TrendingUp, TrendingDown, Info, ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import Image from "next/image";
import { Input } from "./ui/input";
import { ExpirationDialog } from "./ExpirationDialog";
import { addWeeks, format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { WalletIcon } from "@/public/svgs/icons";
import CardTokenList from "./CardTokenList";
import { getPythPrice, type PythPriceState } from "@/hooks/usePythPrice";
import type { MarketDataState } from "@/hooks/usePythMarketData"
import { formatPrice } from "@/utils/formatter";
import WalletModal from "./WalletModal";
import { useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import { ContractContext } from "@/contexts/contractProvider";
import { ChevronDown, ChevronUp } from "lucide-react";
import { EXIT_FEE, LIQUIDATION_MARGIN, USDC_DECIMALS, WSOL_DECIMALS } from "@/utils/const";
import { OptionDetailUtils } from "@/utils/optionsPricing";
import { useDataContext } from "@/contexts/dataProvider";
import { tokenList } from "@/lib/data/tokenlist";
import { ScrollArea } from "./ui/scroll-area";
import { Position } from "@/services/apiService";

interface FutureCardProps {
  type: 'open' | 'close';
  orderType: 'market' | 'limit';
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
  onIdxChange: (idx: number) => void;
  active: number;
  priceData: PythPriceState;
  marketData: MarketDataState;
  priceLoading: boolean;
  marketLoading: boolean;
}

export default function FutureCard({ type, orderType, onSymbolChange, onIdxChange, active, selectedSymbol, priceData, marketData, priceLoading, marketLoading }: FutureCardProps) {
  const { connected } = useWallet();
  const wallet = useAnchorWallet();

  // States for open interface
  const [selectedTx, setSelectedTx] = useState("long");
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [leverage, setLeverage] = useState('1.1');
  const [tempLeverage, setTempLeverage] = useState('1.1');
  const [amount, setAmount] = useState("");
  const [payCurrency, setPayCurrency] = useState(selectedSymbol)
  const [limitPrice, setLimitPrice] = useState(0);
  const [showExpirationModal, setShowExpirationModal] = useState(false);
  const [expiration, setExpiration] = useState<Date>(addWeeks(new Date(), 1));
  const [dropDownActive, setDropDownActive] = useState<boolean>(true);

  // States for close interface
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [closePercentage, setClosePercentage] = useState<string>("100");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiveToken, setReceiveToken] = useState<string>("USDC");
  const [tokenPrices, setTokenPrices] = useState<{ [key: string]: number }>({});

  // Context hooks
  const { onOpenPerp, poolData, onClosePerp, onCancelLimitPerp } = useContext(ContractContext);
  const { positions: backendPositions, isLoadingPositions, refreshUserData } = useDataContext();

  // States for dynamic calculations (open interface)
  const [liquidationPrice, setLiquidationPrice] = useState<number | null>(null);
  const [exitFee, setExitFee] = useState<number | null>(null);
  const [borrowRate, setBorrowRate] = useState<number | null>(null);
  const [availableLiquidity, setAvailableLiquidity] = useState<number | null>(null);
  const [collateralUSD, setCollateralUSD] = useState<number>(0);
  const [positionAmount, setPositionAmount] = useState<number>(0);

  const leverageMarks = {
    1.1: '1.1x',
    20: '20x',
    40: '40x',
    60: '60x',
    80: '80x',
    100: '100x'
  };

  const isPositive = marketData.change24h !== null && marketData.change24h > 0;

  const defaultExpirations = [
    { label: '1 week', value: addWeeks(new Date(), 1) },
    { label: '2 weeks', value: addWeeks(new Date(), 2) },
    { label: '3 weeks', value: addWeeks(new Date(), 3) }
  ];

  const isDefaultExpiration = defaultExpirations.some(exp =>
    format(exp.value, 'yyyy-MM-dd') === format(expiration, 'yyyy-MM-dd')
  );

  const getExpirationLabel = (date: Date): string => {
    const matchingDefault = defaultExpirations.find(exp =>
      format(exp.value, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
    return matchingDefault ? matchingDefault.label : format(date, 'dd MMM yyyy');
  };

  function isNotNull<T>(value: T | null): value is T {
    return value !== null;
  }

  // Filter perp positions for close interface
  const perpPositions: Position[] = (backendPositions || [])
    .filter(pos => pos.contractType === 'perp' && pos.isActive === true);

  // Reset close percentage when position changes
  useEffect(() => {
    if (selectedPosition) {
      setClosePercentage("100");
      setReceiveToken("USDC"); // Default to USDC
    }
  }, [selectedPosition]);

  // Load token prices
  useEffect(() => {
    const loadTokenPrices = async () => {
      try {
        const solPrice = await getPythPrice("Crypto.SOL/USD", 0);
        setTokenPrices({
          "SOL": solPrice,
          "USDC": 1.0, // USDC is stable at $1
          "USDT": 1.0, // USDT is stable at $1
        });
      } catch (error) {
        console.error("Error loading token prices:", error);
        setTokenPrices({
          "SOL": priceData.price || 100,
          "USDC": 1.0,
          "USDT": 1.0,
        });
      }
    };
    
    if (type === 'close') {
      loadTokenPrices();
    }
  }, [type, priceData.price]);

  // Dynamic calculations useEffect for open interface
  useEffect(() => {
    if (type === 'open') {
      const calculateValues = async () => {
        if (priceData.price) {
          const solPoolsize = (poolData!.sol.tokenOwned - poolData!.sol.tokenLocked) / 10 ** WSOL_DECIMALS;
          const usdcPoolsize = (poolData!.usdc.tokenOwned - poolData!.usdc.tokenLocked) / 10 ** USDC_DECIMALS;
          const availableLiquidity = solPoolsize * priceData.price + usdcPoolsize;
          setAvailableLiquidity(availableLiquidity);
        }
        if (!amount || !leverage || !priceData.price) {
          setLiquidationPrice(null);
          setExitFee(null);
          setBorrowRate(null);
          setCollateralUSD(0);
          setPositionAmount(0);
          return;
        }

        try {
          const payTokenPrice = await getPythPrice(payCurrency, 0);
          const collateralUSDValue = payTokenPrice * parseFloat(amount);

          if (collateralUSDValue > 10) {
            const leverageNum = parseFloat(leverage);
            const entryPrice = priceData.price;
            const grossPositionSizeValue = collateralUSDValue * leverageNum;

            const exitFeeValue = (grossPositionSizeValue * EXIT_FEE) / (1 + EXIT_FEE * leverageNum);
            setExitFee(exitFeeValue);
            const borrowRateValue = payCurrency === 'Crypto.SOL/USD' ? OptionDetailUtils.getSolBorrowRate(poolData!.sol.tokenLocked, poolData!.sol.tokenOwned) : OptionDetailUtils.getSolBorrowRate(poolData!.usdc.tokenLocked, poolData!.usdc.tokenOwned);
            setBorrowRate(borrowRateValue / 24.0 / 365.0);

            setCollateralUSD(collateralUSDValue);

            const actualPositionAmount = parseFloat(amount) * leverageNum;
            setPositionAmount(actualPositionAmount);

            const liquidationBuffer = LIQUIDATION_MARGIN;

            let liqPrice: number;
            if (selectedTx === "long") {
              const maxDropPercentage = (1 / parseFloat(leverage)) - liquidationBuffer;
              liqPrice = entryPrice * (1 - maxDropPercentage);
            } else {
              const maxRisePercentage = (1 / parseFloat(leverage)) - liquidationBuffer;
              liqPrice = entryPrice * (1 + maxRisePercentage);
            }

            setLiquidationPrice(liqPrice);
          } else {
            setLiquidationPrice(null);
            setExitFee(null);
            setBorrowRate(null);
            setPositionAmount(0);
          }
        } catch (error) {
          console.error("Error calculating values:", error);
          setLiquidationPrice(null);
          setExitFee(null);
          setBorrowRate(null);
          setPositionAmount(0);
        }
      };

      calculateValues();
    }
  }, [amount, leverage, priceData.price, payCurrency, selectedTx, type]);

  const buyFutureHandler = async () => {
    if (isNotNull(priceData.price)) {
      if (orderType === 'limit' && limitPrice === 0 )
        return;
      if (collateralUSD > 10) {
        await onOpenPerp(parseFloat(amount) * (10 ** (payCurrency === "Crypto.SOL/USD" ? WSOL_DECIMALS : USDC_DECIMALS)), 
        positionAmount * (10 ** (payCurrency === "Crypto.SOL/USD" ? WSOL_DECIMALS : USDC_DECIMALS)), 
        selectedTx, 
        orderType,
        limitPrice * (10 ** 6),
        100,
        limitPrice > priceData.price,
        payCurrency === "Crypto.SOL/USD");
      }
    } else {
      console.error("Price data is unavailable.");
    }
  }

  // PnL and token calculation functions
  const calculatePositionPnl = (position: Position, currentPrice: number, closingPercentage: number = 100): number => {
    if (position.orderType === 'limit')
      return 0;
    const closingRatio = closingPercentage / 100;
    const priceDifference = position.positionSide === 'long' 
      ? currentPrice - position.entryPrice 
      : position.entryPrice - currentPrice;
    
    // PnL = (price_difference / entry_price) * position_size * closing_ratio
    return (priceDifference / position.entryPrice) * position.positionSize * closingRatio;
  };

  const calculateFees = (position: Position, closingPercentage: number = 100): { exitFee: number; transactionFee: number; totalFees: number } => {
    const closingAmount = (position.positionSize * closingPercentage) / 100;
    const exitFee = position.orderType === 'market' ? closingAmount * EXIT_FEE : 0; // 0.1% exit fee for market orders
    const transactionFee = 0.01; // Fixed $0.01 transaction fee
    
    return {
      exitFee,
      transactionFee,
      totalFees: exitFee + transactionFee
    };
  };

  const calculateCollateralReturn = (position: Position, closingPercentage: number = 100): number => {
    const closingRatio = closingPercentage / 100;
    return position.collateralUSD * closingRatio;
  };

  const calculateReceiveAmount = (position: Position, closingPercentage: number, receiveTokenSymbol: string): number => {
    if (!position || closingPercentage <= 0) return 0;
    
    const currentPrice = priceData.price || position.currentPrice;
    const pnl = calculatePositionPnl(position, currentPrice, closingPercentage);
    const collateralReturn = calculateCollateralReturn(position, closingPercentage);
    const fees = calculateFees(position, closingPercentage);
    
    // Total USD value = collateral return + PnL - fees
    const totalUSD = collateralReturn + pnl - fees.totalFees;
    const tokenPrice = tokenPrices[receiveTokenSymbol] || 1;
    
    return Math.max(0, totalUSD / tokenPrice); // Can't receive negative amount
  };

  const getTokenPrice = (symbol: string): number => {
    return tokenPrices[symbol] || 1;
  };
  const closePositionHandler = async (): Promise<void> => {
    if (!selectedPosition) return;

    const validation = validateClosePercentage();
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    setIsSubmitting(true);
    try {
      console.log("Closing position:", selectedPosition.index, "Percentage:", closePercentage);
      let success;
      
      const percentageNum = parseFloat(closePercentage);
      const currentPrice = priceData.price || selectedPosition.currentPrice;
      
      if (selectedPosition.orderType === 'market') {
        success = await onClosePerp(percentageNum, receiveToken, currentPrice * (selectedPosition.positionSide ==  'long' ? 0.99 : 1.01), selectedPosition.index);
      } else {
        success = await onCancelLimitPerp(percentageNum, receiveToken, currentPrice * (selectedPosition.positionSide ==  'long' ? 0.99 : 1.01), selectedPosition.index);
      }

      if (success) {
        // Reset to list view after successful close
        setSelectedPosition(null);
        setClosePercentage("100");
        refreshUserData(); // Refresh positions
      }
    } catch (error) {
      console.error("Error closing position:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateClosePercentage = (): { isValid: boolean; error?: string } => {
    if (!selectedPosition) return { isValid: false, error: "No position selected" };

    const percentage = parseFloat(closePercentage);

    if (isNaN(percentage) || percentage <= 0) {
      return { isValid: false, error: "Percentage must be a positive number" };
    }

    if (percentage > 100) {
      return { isValid: false, error: "Cannot close more than 100% of position" };
    }

    return { isValid: true };
  };

  const handlePercentageChange = (value: string): void => {
    // Only allow numbers and decimal point
    const sanitized = value.replace(/[^0-9.]/g, '');
    setClosePercentage(sanitized);
  };

  const setMaxPercentage = (): void => {
    setClosePercentage("100");
  };

  const formatChange = (change: number | null) => {
    if (change === null) return '0.00';
    return Math.abs(change).toFixed(2);
  };

  const formatPriceValue = (price: any): string => {
    const num = typeof price === 'number' ? price : parseFloat(price) || 0;
    return `$${num.toLocaleString()}`;
  };

  const formatDate = (date: Date): string => {
    if (!date) return "No Date Available";
    return format(new Date(date), "dd MMM yyyy");
  };

  const getTokenInfo = (position: Position) => {
    const tokenSymbol = position.poolName.split('/')[0] || 'SOL';
    const foundToken = tokenList.find(t => t.symbol === tokenSymbol) || tokenList[0];
    return foundToken;
  };

  const validation = validateClosePercentage();
  const isPartialClose = selectedPosition && parseFloat(closePercentage) < 100;

  // Calculate position size based on percentage
  const getClosingSize = (): number => {
    if (!selectedPosition) return 0;
    return (selectedPosition.positionSize * parseFloat(closePercentage)) / 100;
  };

  // Helper function to get position side as string
  const getPositionSide = (position: Position): 'long' | 'short' => {
    return position.positionSide;
  };

  // If type is close, show close interface
  if (type === 'close') {
    return selectedPosition ? (
      <div className="w-full flex flex-col flex-grow bg-card rounded-sm rounded-t-none p-6 space-y-5 border border-t-0">
        {/* Token Selection */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-foreground">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPosition(null)}
              className="mr-2 -ml-2 px-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            {(() => {
              const tokenInfo = getTokenInfo(selectedPosition);
              return (
                <>
                  <Image src={tokenInfo.iconPath} alt={tokenInfo.name} width={20} height={20} className="w-6 h-6 rounded-full" />
                  <span className="font-semibold">{selectedPosition.poolName}</span>
                  <span className="text-sm text-secondary-foreground">
                    {formatDate(selectedPosition.openedAt)}
                  </span>
                </>
              );
            })()}
          </div>
        </div>

        {/* Trading Direction and Status */}
        <div className="flex items-center space-x-3">
          <div
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md border ${getPositionSide(selectedPosition) === "long"
              ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
              : "border-red-500 bg-red-500/10 text-red-500"
              }`}
          >
            {getPositionSide(selectedPosition) === "long" ? (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                Long
              </>
            ) : (
              <>
                <TrendingDown className="w-4 h-4 mr-2" />
                Short
              </>
            )}
          </div>
          <div className="px-4 py-2 rounded-md bg-secondary text-emerald-500">
            {selectedPosition.orderType === 'market' ? 'Active' : 'Pending'}
          </div>
        </div>

        {/* Entry Price */}
        <div className="space-y-2">
          <label className="text-secondary-foreground text-sm">
            {selectedPosition.orderType === 'market' ? 'Entry Price' : 'Trigger Price'}
          </label>
          <div className="grid grid-cols-1 gap-2">
            <div className="w-full flex items-center px-4 py-2 rounded-sm bg-backgroundSecondary text-primary">
              {formatPriceValue(selectedPosition.orderType === 'market' ? selectedPosition.entryPrice : selectedPosition.triggerPrice)}
            </div>
          </div>
        </div>

        {/* Leverage */}
        <div className="space-y-2">
          <label className="text-secondary-foreground text-sm">Leverage</label>
          <div className="grid grid-cols-1 gap-2">
            <div className="w-full flex items-center px-4 py-2 rounded-sm bg-backgroundSecondary text-primary">
              {selectedPosition.leverage}x
            </div>
          </div>
        </div>

        {/* Position Size */}
        <div className="space-y-2">
          <label className="text-secondary-foreground text-sm">Position Size</label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
              {(() => {
                const tokenInfo = getTokenInfo(selectedPosition);
                return <Image src={tokenInfo.iconPath} alt={tokenInfo.name} width={20} height={20} className="w-6 h-6 rounded-full" />;
              })()}
            </div>
            <div className="pl-12 py-2 pr-2 border border-border rounded-sm bg-backgroundSecondary text-foreground flex items-center">
              ${selectedPosition.positionSize.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Collateral */}
        <div className="space-y-2">
          <label className="text-secondary-foreground text-sm">Collateral</label>
          <div className="grid grid-cols-1 gap-2">
            <div className="w-full flex items-center px-4 py-2 rounded-sm bg-backgroundSecondary text-primary">
              ${selectedPosition.collateralUSD.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Close Percentage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-secondary-foreground text-sm">
              Percentage to Close
            </label>
            <div className="flex space-x-1">
              {[25, 50, 75, 100].map(percentage => (
                <Button
                  key={percentage}
                  variant="outline"
                  size="sm"
                  onClick={() => setClosePercentage(percentage.toString())}
                  className="text-xs h-6 px-2 text-secondary-foreground hover:text-foreground"
                >
                  {percentage}%
                </Button>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
              <span className="text-sm text-secondary-foreground">%</span>
            </div>
            <Input
              type="text"
              value={closePercentage}
              onChange={(e) => handlePercentageChange(e.target.value)}
              placeholder="Enter percentage"
              className={`pl-12 py-2 pr-2 border-border text-foreground ${!validation.isValid && closePercentage ? 'border-red-500' : ''
                }`}
            />
          </div>
          {!validation.isValid && closePercentage && (
            <p className="text-red-500 text-xs">{validation.error}</p>
          )}
          {isPartialClose && validation.isValid && (
            <p className="text-blue-500 text-xs">
              Partial close: {parseFloat(closePercentage)}% (${getClosingSize().toFixed(2)})
            </p>
          )}
        </div>

        {/* Receive Token Selection */}
        <div className="space-y-2">
          <label className="text-secondary-foreground text-sm">Receive In</label>
          <div className="relative">
            <Select value={receiveToken} onValueChange={setReceiveToken}>
              <SelectTrigger className="w-full">
                <div className="flex items-center space-x-2">
                  {(() => {
                    const selectedTokenInfo = tokenList.find(t => t.symbol === receiveToken) || tokenList[0];
                    return (
                      <>
                        <Image src={selectedTokenInfo.iconPath} alt={selectedTokenInfo.name} width={20} height={20} className="w-5 h-5 rounded-full" />
                        <span>{receiveToken}</span>
                        <span className="text-xs text-secondary-foreground">
                          ${getTokenPrice(receiveToken).toFixed(2)}
                        </span>
                      </>
                    );
                  })()}
                </div>
              </SelectTrigger>
              <SelectContent>
                {["SOL", "USDC"].map(token => {
                  const tokenInfo = tokenList.find(t => t.symbol === token) || tokenList[0];
                  return (
                    <SelectItem key={token} value={token}>
                      <div className="flex items-center space-x-2">
                        <Image src={tokenInfo.iconPath} alt={tokenInfo.name} width={20} height={20} className="w-5 h-5 rounded-full" />
                        <span>{token}</span>
                        <span className="text-xs text-secondary-foreground">
                          ${getTokenPrice(token).toFixed(2)}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          
          <div className="bg-backgroundSecondary rounded px-3 py-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-secondary-foreground">You will receive:</span>
              <div className="text-right">
                <div className="font-medium">
                  {calculateReceiveAmount(selectedPosition, parseFloat(closePercentage), receiveToken).toFixed(6)} {receiveToken}
                </div>
                <div className="text-xs text-secondary-foreground">
                  ≈ ${(calculateReceiveAmount(selectedPosition, parseFloat(closePercentage), receiveToken) * getTokenPrice(receiveToken)).toFixed(2)} USD
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PnL Breakdown */}
        <div className="space-y-2 border-t pt-3">
          <label className="text-secondary-foreground text-sm">Position Summary</label>
          
          {(() => {
            const currentPrice = priceData.price || selectedPosition.currentPrice;
            const closingPercentage = parseFloat(closePercentage) || 0;
            const pnl = calculatePositionPnl(selectedPosition, currentPrice, closingPercentage);
            const collateralReturn = calculateCollateralReturn(selectedPosition, closingPercentage);
            const fees = calculateFees(selectedPosition, closingPercentage);
            const totalReceiveUSD = collateralReturn + pnl - fees.totalFees;
            
            return (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-secondary-foreground">Collateral Return</span>
                  <span className="text-green-500">+${collateralReturn.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-xs">
                  <span className="text-secondary-foreground">PnL</span>
                  <span className={pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                  </span>
                </div>
                
                {selectedPosition.orderType === 'market' && fees.exitFee > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-secondary-foreground">Exit Fee (0.1%)</span>
                    <span className="text-red-500">-${fees.exitFee.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-xs">
                  <span className="text-secondary-foreground">Transaction Fee</span>
                  <span className="text-red-500">-${fees.transactionFee.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-xs font-medium border-t pt-1">
                  <span>Net Receive</span>
                  <span className={totalReceiveUSD >= 0 ? 'text-green-500' : 'text-red-500'}>
                    ${Math.max(0, totalReceiveUSD).toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Unrealized PnL */}
        {/* <div className="space-y-2">
          <label className="text-secondary-foreground text-sm">Unrealized PnL</label>
          <div className="grid grid-cols-1 gap-2">
            <div className={`w-full flex items-center px-4 py-2 rounded-sm bg-backgroundSecondary ${selectedPosition.unrealizedPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {selectedPosition.unrealizedPnl >= 0 ? '+' : '-'}${Math.abs(selectedPosition.unrealizedPnl).toFixed(2)}
            </div>
          </div>
        </div> */}

        {/* Liquidation Price */}
        <div className="space-y-2">
          <label className="text-secondary-foreground text-sm">Liquidation Price</label>
          <div className="grid grid-cols-1 gap-2">
            <div className="w-full flex items-center px-4 py-2 rounded-sm bg-backgroundSecondary text-orange-500">
              ${selectedPosition.liquidationPrice.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4">
          <Button
            className="w-full"
            size="lg"
            onClick={closePositionHandler}
            disabled={!validation.isValid || isSubmitting}
          >
            {isSubmitting
              ? "Processing..."
              : isPartialClose
                ? `Partially Close Position (${closePercentage}%)`
                : "Close Full Position"
            }
          </Button>
        </div>
      </div>
    ) : (
      <div className="w-full flex flex-col flex-grow bg-card rounded-sm rounded-t-none p-6 space-y-6 border border-t-0">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Positions</h2>
        </div>

        {perpPositions.length > 0 ? (
          <ScrollArea className="h-[395px] w-full">
            <div className="space-y-2">
              {perpPositions.map((position) => {
                const tokenInfo = getTokenInfo(position);
                const positionSide = getPositionSide(position);
                
                return (
                  <Button
                    key={position.positionId}
                    variant="outline"
                    className="w-full h-auto p-4 border-border rounded-sm hover:text-secondary-foreground"
                    onClick={() => setSelectedPosition(position)}
                  >
                    <div className="w-full flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {positionSide === "long" ? (
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        <span>{positionSide}</span>
                        <span className="text-xs text-secondary-foreground">
                          {position.leverage}x
                        </span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span>{position.poolName}</span>
                        <span className="text-xs text-secondary-foreground">
                          ${position.positionSize.toFixed(2)}
                        </span>
                        <span
                          className={`font-medium ${position.orderType === 'market' ? 'text-emerald-500' : 'text-yellow-500'}`}
                        >
                          {position.orderType === 'market' ? 'Active' : 'Pending'}
                        </span>
                        <div className="text-right">
                          <span
                            className={`font-medium text-xs ${calculatePositionPnl(position, priceData.price || 0, 100) >= 0 ? 'text-green-500' : 'text-red-500'}`}
                          >
                            {calculatePositionPnl(position, priceData.price || 0, 100) >= 0 ? '+' : ''}${calculatePositionPnl(position, priceData.price || 0, 100).toFixed(2)}
                          </span>
                          <div className="text-xs text-secondary-foreground">
                            {((calculatePositionPnl(position, priceData.price || 0, 100) / position.collateralUSD) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-secondary-foreground">
            {isLoadingPositions ? 'Loading positions...' : 'No positions found. Start trading to see your positions here.'}
          </div>
        )}
      </div>
    );
  }

  // Original open interface
  return (
    <div className="border rounded-sm rounded-t-none flex flex-col h-fit py-0.5">
      <div className={`flex-1 p-6 space-y-4`}>
        {/* Asset Selection & Price */}
        <div className="flex justify-between gap-3 items-start">
          <CardTokenList onSymbolChange={onSymbolChange} onPaymentTokenChange={setPayCurrency} onIdxChange={onIdxChange} active={active} type="chart" />
          {orderType === 'market' ? (
            <div className="text-right h-12">
              <div className="text-2xl font-semibold tracking-tight">${priceData.price ? formatPrice(priceData.price) : priceLoading}</div>
              <div className={`text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {isPositive ? '+' : '-'}{marketData.change24h ? formatChange(marketData.change24h) : marketLoading}%
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="w-32 rounded-sm p-2 h-12 flex flex-col border items-start justify-center focus-within:border-primary">
                <span className="text-xs text-secondary-foreground">Limit Price:</span>
                <Input
                  type="number"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(parseFloat(e.target.value) || 0)}
                  className="w-32 text-left h-fit border-none"
                  placeholder="0.00"
                />
              </div>
            </div>
          )}
        </div>

        {/* Position Type Selection */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-sm transition-all group border ${selectedTx === "long"
              ? 'bg-green-500/10 text-green-500 border-green-500 hover:bg-green-500/20'
              : 'hover:border-green-500 hover:text-green-500 border-border/40 hover:bg-green-500/20'
              }`}
            onClick={() => setSelectedTx("long")}
          >
            <TrendingUp className={`w-4 h-4 mr-2 ${selectedTx === "long" ? 'text-green-500' : 'text-muted-foreground group-hover:text-green-500'
              }`} />
            <span className="text-base font-medium">Long</span>
          </Button>
          <Button
            variant="outline"
            className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-sm transition-all group border ${selectedTx === "short"
              ? 'bg-red-500/10 text-red-500 border-red-500 hover:bg-red-500/20'
              : 'hover:border-red-500 hover:text-red-500 border-border/40 hover:bg-red-500/20'
              }`}
            onClick={() => setSelectedTx("short")}
          >
            <TrendingDown className={`w-4 h-4 mr-2 ${selectedTx === "short" ? 'text-red-500' : 'text-muted-foreground group-hover:text-red-500'
              }`} />
            <span className="text-base font-medium">Short</span>
          </Button>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-secondary-foreground font-medium">Pay Amount</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-secondary-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Enter the amount you want to invest</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className="text-sm text-secondary-foreground">Balance: 0 SOL</span>
          </div>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <CardTokenList onSymbolChange={onSymbolChange} onPaymentTokenChange={setPayCurrency} onIdxChange={onIdxChange} active={active} type="paying" />
            </div>
            <Input
              type="number"
              value={amount}
              placeholder="0.00"
              onChange={(e) => setAmount(e.target.value)}
              className="pr-2 h-11 text-right text-base font-medium border-border rounded-sm placeholder:text-secondary-foreground focus:border-primary"
              step="0.1"
              min="0.1"
            />
          </div>
        </div>

        {/* Leverage Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-secondary-foreground font-medium">Leverage</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-secondary-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Adjust your position leverage</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="text-sm text-secondary-foreground">
              Max position: {amount === '' || priceData?.price == null ? 0 : positionAmount.toFixed(2)} SOL
            </div>
          </div>
          <div className="w-full flex gap-2">
            <Input
              type="number"
              value={leverage}
              placeholder="1"
              onChange={(e) => {
                const rawValue = e.target.value;
                const num = Number(rawValue);

                if (rawValue === '') {
                  setLeverage('');
                  return;
                }

                if (isNaN(num)) return;

                const clamped = Math.min(Math.max(num, 1.1), 100);
                if (clamped !== parseFloat(leverage)) {
                  setLeverage(clamped.toString());
                }
              }}
              className="w-16 h-12 text-2xl text-center font-medium border-border rounded-sm placeholder:text-secondary-foreground focus:border-primary"
              step="0.1"
              min="1.1"
              max="100"
            />
            <div className="h-12 w-full px-4 pt-2 border rounded-sm">
              <Slider
                min={1.1}
                max={100}
                step={0.1}
                value={parseFloat(tempLeverage)}
                onChange={(value) => setTempLeverage((Array.isArray(value) ? value[0] : value).toString())}
                onChangeComplete={(value) => {
                  const finalValue = (Array.isArray(value) ? value[0] : value).toString();
                  setLeverage(finalValue);
                  setTempLeverage(finalValue);
                }}
                marks={leverageMarks}
                className="!transition-none"
                styles={{
                  rail: {
                    height: 4,
                    backgroundColor: 'var(--secondary-foreground)',
                    borderRadius: 0
                  },
                  track: {
                    height: 4,
                    backgroundImage: 'linear-gradient(to right, var(--gradient-start), var(--gradient-middle), var(--gradient-end))',
                    borderRadius: 0
                  },
                  handle: {
                    height: 15,
                    width: 15,
                    backgroundColor: 'var(--primary-foreground)',
                    borderWidth: 2,
                    borderColor: 'rgb(var(--primary))',
                    marginTop: -5,
                    transition: 'none',
                    opacity: '1',
                  },
                }}
                dotStyle={{
                  width: 4,
                  height: 14,
                  top: -4,
                  backgroundColor: 'var(--secondary-foreground)',
                  borderRadius: 20,
                  border: 0,
                  marginLeft: -1,
                  transition: 'none'
                }}
                activeDotStyle={{
                  backgroundColor: 'rgb(var(--primary))'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Connect Wallet Button */}
      <div className="p-6 pt-0">
        {connected ? (
          <Button
            className={`w-full h-10 rounded-sm text-black ${collateralUSD > 10
              ? 'bg-primary hover:bg-gradient-primary'
              : 'bg-gray-400 cursor-not-allowed'
              }`}
            onClick={() => collateralUSD > 10 && buyFutureHandler()}
            disabled={collateralUSD <= 10}
          >
            <span className="text-base font-medium">
              {collateralUSD <= 10 ? 'Minimum $10 Required' : 'Buy'}
            </span>
          </Button>
        ) : (
          <Button
            className="w-full h-10 rounded-sm bg-primary hover:bg-gradient-primary text-black"
            onClick={() => setIsWalletModalOpen(true)}
          >
            <WalletIcon />
            <span className="text-base font-medium">Connect Wallet</span>
          </Button>
        )}
      </div>

      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />

      <ExpirationDialog
        open={showExpirationModal}
        onOpenChange={setShowExpirationModal}
        onSelectExpiration={setExpiration}
        currentExpiration={expiration}
      />

      <div className="border rounded-sm">
        <button
          className="classname px-6 py-3 w-full flex justify-between items-center cursor-pointer"
          onClick={() => setDropDownActive(!dropDownActive)}
        >
          <span className="text-sm text-secondary-foreground font-medium">
            Order Summary
          </span>
          {dropDownActive ? <ChevronUp className="text-secondary-foreground text-sm w-4 h-4" /> : <ChevronDown className="text-secondary-foreground text-sm w-4 h-4" />}
        </button>
        {dropDownActive && (
          <section className="border-t px-6 py-3 flex flex-col gap-1">
            <div className="flex justify-between text-sm text-secondary-foreground font-normal">
              <span>Entry Price</span>
              <span>${priceData.price?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between text-sm text-secondary-foreground font-normal">
              <span>Liquidation Price</span>
              <span className={liquidationPrice ? (selectedTx === "long" ? 'text-red-500' : 'text-green-500') : ''}>
                {liquidationPrice ? `$${liquidationPrice.toFixed(2)}` : '-'}
              </span>
            </div>
            <div className="flex justify-between text-sm text-secondary-foreground font-normal">
              <span>Available Liquidity</span>
              <span>
                ${availableLiquidity?.toFixed(2) || 0.00}
              </span>
            </div>
            <div className="flex justify-between text-sm text-secondary-foreground font-normal">
              <span>Exit Fee (0.1%)</span>
              <span>
                {exitFee ? `$${exitFee.toFixed(2)}` : '-'}
              </span>
            </div>
            <div className="flex justify-between text-sm text-secondary-foreground font-normal">
              <span>Borrow Fee Due</span>
              <span>
                {borrowRate ? `$${borrowRate.toFixed(6)}` : '-'}
              </span>
            </div>
            <div className="flex justify-between text-sm text-secondary-foreground font-normal">
              <span>Position Size</span>
              <span>
                {collateralUSD > 10 ? `$${(collateralUSD * parseFloat(leverage)).toFixed(2)}` : '-'}
              </span>
            </div>
            <div className="flex justify-between text-sm text-secondary-foreground font-normal">
              <span>Collateral (USD)</span>
              <span className={collateralUSD > 10 ? 'text-green-500' : 'text-red-500'}>
                ${collateralUSD.toFixed(2)}
              </span>
            </div>
            {collateralUSD <= 10 && collateralUSD > 0 && (
              <div className="text-xs text-red-500 mt-1">
                Minimum collateral of $10 required to open position
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}