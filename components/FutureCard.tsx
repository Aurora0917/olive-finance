"use client";

import { useContext, useEffect, useState } from "react";
import { MoreHorizontal, TrendingUp, TrendingDown, Info } from "lucide-react";
import { Button } from "./ui/button";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import Image from "next/image";
import { Input } from "./ui/input";
import { ExpirationDialog } from "./ExpirationDialog";
import { addWeeks, format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { WalletIcon } from "@/public/svgs/icons";
import CardTokenList from "./CardTokenList";
import { getPythPrice, type PythPriceState } from "@/hooks/usePythPrice";
import type { MarketDataState } from "@/hooks/usePythMarketData"
import { formatPrice } from "@/utils/formatter";
import WalletModal from "./WalletModal";
import { useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import { ContractContext } from "@/contexts/contractProvider";
import { ChevronDown, ChevronUp } from "lucide-react";
import { USDC_DECIMALS, WSOL_DECIMALS } from "@/utils/const";
import { OptionDetailUtils } from "@/utils/optionsPricing";

interface FutureCardProps {
  type: 'perps' | 'expiry';
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

  const [selectedTx, setSelectedTx] = useState("long");
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [leverage, setLeverage] = useState('1.1');
  const [tempLeverage, setTempLeverage] = useState('1.1');
  const [amount, setAmount] = useState("");
  const [payCurrency, setPayCurrency] = useState(selectedSymbol)
  const [limitPrice, setLimitPrice] = useState("");
  const [showExpirationModal, setShowExpirationModal] = useState(false);
  const [expiration, setExpiration] = useState<Date>(addWeeks(new Date(), 1));
  const { onOpenPerp, poolData } = useContext(ContractContext);
  const [dropDownActive, setDropDownActive] = useState<boolean>(true);

  // New state variables for dynamic calculations
  const [liquidationPrice, setLiquidationPrice] = useState<number | null>(null);
  const [openFee, setOpenFee] = useState<number | null>(null);
  const [borrowRate, setBorrowRate] = useState<number | null>(null);
  const [availableLiquidity, setAvailableLiquidity] = useState<number | null>(null);
  const [collateralUSD, setCollateralUSD] = useState<number>(0);
  const [positionSize, setPositionSize] = useState<number>(0);

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

  // Dynamic calculations useEffect
  useEffect(() => {
    const calculateValues = async () => {
      if (priceData.price) {
        const solPoolsize = (poolData!.sol.tokenOwned - poolData!.sol.tokenLocked) / 10 ** WSOL_DECIMALS;
        const usdcPoolsize = (poolData!.usdc.tokenOwned - poolData!.usdc.tokenLocked) / 10 ** USDC_DECIMALS;
        const availableLiquidity = solPoolsize * priceData.price + usdcPoolsize;
        setAvailableLiquidity(availableLiquidity);
      }
      if (!amount || !leverage || !priceData.price) {
        setLiquidationPrice(null);
        setOpenFee(null);
        setBorrowRate(null);
        setCollateralUSD(0);
        setPositionSize(0);
        return;
      }

      try {
        // Calculate collateral in USD
        const payTokenPrice = await getPythPrice(payCurrency, 0);
        const collateralUSDValue = payTokenPrice * parseFloat(amount);

        // Only calculate if collateral > $10
        if (collateralUSDValue > 10) {
          const leverageNum = parseFloat(leverage);
          const entryPrice = priceData.price;
          const grossPositionSizeValue = collateralUSDValue * leverageNum;

          // Calculate Open Fee (0.06% of position size)
          const openFeeValue = (grossPositionSizeValue * 0.0006) / (1 + 0.0006 * leverageNum); // 0.06% = 0.0006
          setOpenFee(openFeeValue);
          console.log(poolData);
          const borrowRateValue = payCurrency === 'Crypto.SOL/USD' ? OptionDetailUtils.getSolBorrowRate(poolData!.sol.tokenLocked, poolData!.sol.tokenOwned) : OptionDetailUtils.getSolBorrowRate(poolData!.usdc.tokenLocked, poolData!.usdc.tokenOwned);
          setBorrowRate(borrowRateValue / 24.0 / 365.0);

          setCollateralUSD(collateralUSDValue - openFeeValue);

          const actualPositionSizeValue = (collateralUSDValue - openFeeValue) * leverageNum;

          setPositionSize(actualPositionSizeValue);

          const liquidationBuffer = 0.005; // 0.5% buffer for safety

          let liqPrice: number;
          if (selectedTx === "long") {
            // For LONG: Price can drop by (1/leverage - fees) before liquidation
            // const maxDropPercentage = ((collateralUSD - openFeeValue) / grossPositionSizeValue) - liquidationBuffer;
            const maxDropPercentage = (1 / parseFloat(leverage)) - liquidationBuffer;

            liqPrice = entryPrice * (1 - maxDropPercentage);
          } else {
            // For SHORT: Price can rise by (1/leverage - fees) before liquidation  
            // const maxRisePercentage = ((collateralUSD - openFeeValue) / grossPositionSizeValue) - liquidationBuffer;
            const maxRisePercentage = (1 / parseFloat(leverage)) - liquidationBuffer;
            liqPrice = entryPrice * (1 + maxRisePercentage);
          }

          setLiquidationPrice(liqPrice);
        } else {
          setLiquidationPrice(null);
          setOpenFee(null);
          setBorrowRate(null);
          setPositionSize(0);
        }
      } catch (error) {
        console.error("Error calculating values:", error);
        setLiquidationPrice(null);
        setOpenFee(null);
        setBorrowRate(null);
        setPositionSize(0);
      }
    };

    calculateValues();
  }, [amount, leverage, priceData.price, payCurrency, selectedTx]);

  const buyFutureHandler = async () => {
    if (isNotNull(priceData.price)) {
      if (collateralUSD > 10) {
        await onOpenPerp(collateralUSD * (10 ** (selectedTx === "long" ? WSOL_DECIMALS : USDC_DECIMALS)), positionSize * (10 ** WSOL_DECIMALS), selectedTx, priceData.price,
          payCurrency === "Crypto.SOL/USD", parseFloat(amount) * (10 ** (payCurrency === "Crypto.SOL/USD" ? WSOL_DECIMALS : USDC_DECIMALS)));
      }
    } else {
      console.error("Price data is unavailable.");
    }
  }

  const formatChange = (change: number | null) => {
    if (change === null) return '0.00';
    return Math.abs(change).toFixed(2);
  };

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
                  type="text"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
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

        {/* Expiration Selection */}
        {type === 'expiry' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-secondary-foreground">Expiration Date</label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-secondary-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Select when your futures contract will expire</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {isDefaultExpiration ? (
                <>
                  {defaultExpirations.map((exp) => (
                    <Button
                      key={exp.label}
                      onClick={() => setExpiration(exp.value)}
                      className={`flex-1 py-2 px-4 rounded-sm ${format(expiration, 'yyyy-MM-dd') === format(exp.value, 'yyyy-MM-dd')
                        ? 'bg-primary hover:bg-gradient-primary text-backgroundSecondary'
                        : 'bg-backgroundSecondary text-foreground hover:bg-secondary'
                        }`}
                    >
                      {exp.label}
                    </Button>
                  ))}
                  <Button
                    className="py-2 px-4 rounded-sm bg-backgroundSecondary text-foreground hover:bg-secondary"
                    onClick={() => setShowExpirationModal(true)}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    className="col-span-3 bg-gradient-primary text-backgroundSecondary rounded-sm py-2 px-4"
                  >
                    {getExpirationLabel(expiration)}
                  </Button>
                  <Button
                    className="py-2 px-4 rounded-sm bg-backgroundSecondary text-foreground hover:bg-secondary"
                    onClick={() => setShowExpirationModal(true)}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

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
              Max position: {amount === '' || priceData?.price == null ? 0 : (positionSize / priceData?.price).toFixed(2)} SOL
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
              <span>Open Fee (0.06%)</span>
              <span>
                {openFee ? `$${openFee.toFixed(2)}` : '-'}
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
                {positionSize > 0 ? `$${positionSize.toFixed(2)}` : '-'}
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