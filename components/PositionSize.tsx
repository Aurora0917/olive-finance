'use client'

import { ChevronDown, SquarePen, Pencil } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import Image from "next/image";
import { tokenList } from "@/lib/data/tokenlist";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { getPythPrice } from "@/hooks/usePythPrice";
import { USDC_DECIMALS, WSOL_DECIMALS } from "@/utils/const";

interface CollateralProps {
    // Current position data
    currentLeverage: number;
    currentLiquidationPrice: number;
    currentCollateral: number;
    currentPositionSize: number;
    entryPrice: number;
    position: 'long' | 'short';
    markPrice: number;
    unrealizedPnl: number; // Added: Unrealized P&L in USD (scaled by 1_000_000 like smart contract)
    // Callbacks for deposit/withdraw actions
    onDeposit?: (amount: number, token: string) => Promise<void>;
    onWithdraw?: (amount: number, token: string) => Promise<void>;
    // Loading states
    isProcessing?: boolean;
}

export default function PositionSize({
    currentLeverage,
    currentLiquidationPrice,
    currentCollateral,
    currentPositionSize,
    entryPrice,
    position,
    markPrice,
    unrealizedPnl, // Added parameter
    onDeposit,
    onWithdraw,
    isProcessing = false
}: CollateralProps) {
    const tokens = tokenList;
    const [selectedToken, setSelectedToken] = useState("SOL");
    const [isOpen, setIsOpen] = useState(false);
    const [amount, setAmount] = useState("");
    const [activeTab, setActiveTab] = useState("increase");

    // Calculated values based on amount input
    const [newLeverage, setNewLeverage] = useState<number>(currentLeverage);
    const [newLiquidationPrice, setNewLiquidationPrice] = useState<number>(currentLiquidationPrice);
    const [newCollateral, setNewCollateral] = useState<number>(currentCollateral);

    // Use ref to track the latest calculation request
    const calculationIdRef = useRef<number>(0);

    // Backend matching constants
    const MAINTENANCE_MARGIN = 0.05; // 5%
    const LIQUIDATION_BUFFER = 0.005; // 0.5%

    // Helper function to calculate liquidation price (matching backend logic exactly)
    const calculateLiquidationPrice = (
        collateralValueUSD: number,
        positionValueUSD: number,
        positionSizeSOL: number,
        entryPrice: number,
        isLong: boolean
    ): number => {
        // Exact backend logic: At liquidation, equity = maintenance_margin * position_value

        console.log(positionValueUSD, positionSizeSOL);
        
        const requiredEquity = positionValueUSD * MAINTENANCE_MARGIN;
        const equityDeficit = requiredEquity - collateralValueUSD;
        const priceChangeNeeded = equityDeficit / positionSizeSOL;
        
        if (isLong) {
            // Backend: liq_price = entry_price + price_change_needed - liquidation_buffer
            const liqPrice = entryPrice + priceChangeNeeded - LIQUIDATION_BUFFER;
            return Math.max(0.0, liqPrice);
        } else {
            // Backend: entry_price - price_change_needed + liquidation_buffer
            return entryPrice - priceChangeNeeded + LIQUIDATION_BUFFER;
        }
    };

    // Reset to current values immediately when amount is empty
    useEffect(() => {
        if (!amount || parseFloat(amount) <= 0 || amount.trim() === "" || isNaN(parseFloat(amount))) {
            setNewLeverage(currentLeverage);
            setNewLiquidationPrice(currentLiquidationPrice);
            setNewCollateral(currentCollateral);
        }
    }, [amount, currentLeverage, currentLiquidationPrice, currentCollateral]);

    // Calculate new values when amount has a valid value
    useEffect(() => {
        // Only proceed if amount is valid
        if (!amount || parseFloat(amount) <= 0 || amount.trim() === "" || isNaN(parseFloat(amount))) {
            return;
        }

        const calculateNewValues = async () => {
            const currentCalculationId = ++calculationIdRef.current;

            try {
                const amountValue = parseFloat(amount);
                const tokenPrice = await getPythPrice(selectedToken === "SOL" ? "Crypto.SOL/USD" : "Crypto.USDC/USD", 0);

                // Check if this calculation is still the latest one
                if (currentCalculationId !== calculationIdRef.current) {
                    return; // Ignore stale calculation
                }

                // Double check amount is still valid after async operation
                if (!amount || amount.trim() === "" || parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) {
                    return;
                }

                const amountUSD = tokenPrice * amountValue;
                const unrealizedPnlUSD = unrealizedPnl;

                // Calculate position metrics for backend-style calculation
                const positionSizeSOL = currentPositionSize / markPrice; // Convert to actual SOL units
                const positionValueUSD = positionSizeSOL * markPrice;

                if (activeTab === "increase") {
                    // Adding collateral (no fees)
                    const updatedCollateral = currentCollateral + amountUSD;

                    const currentEquityUSD = updatedCollateral + unrealizedPnlUSD;

                    // Use equity for leverage calculation instead of just collateral
                    const updatedLeverage = currentPositionSize / currentEquityUSD;

                    // Final check before setting state
                    if (currentCalculationId === calculationIdRef.current) {
                        setNewCollateral(updatedCollateral);
                        setNewLeverage(updatedLeverage);

                        // Calculate new liquidation price using backend logic
                        const newLiqPrice = calculateLiquidationPrice(
                            updatedCollateral,
                            positionValueUSD,
                            positionSizeSOL,
                            entryPrice,
                            position === "long"
                        );

                        setNewLiquidationPrice(newLiqPrice);
                    }

                } else {
                    // Withdrawing collateral (no fees)
                    const updatedCollateral = Math.max(0, currentCollateral - amountUSD);

                    // Calculate current equity including unrealized P&L (smart contract logic)
                    const currentEquityUSD = updatedCollateral + unrealizedPnlUSD;

                    // Check if withdrawal would make position unsafe using equity
                    if (currentEquityUSD < currentPositionSize * 0.05) { // Minimum 5% equity ratio
                        if (currentCalculationId === calculationIdRef.current) {
                            setNewCollateral(0);
                            setNewLeverage(0);
                            setNewLiquidationPrice(0);
                        }
                        return;
                    }

                    // Use equity for leverage calculation instead of just collateral
                    const updatedLeverage = currentPositionSize / currentEquityUSD;

                    // Final check before setting state
                    if (currentCalculationId === calculationIdRef.current) {
                        setNewCollateral(updatedCollateral);
                        setNewLeverage(updatedLeverage);

                        // Calculate new liquidation price using backend logic
                        const newLiqPrice = calculateLiquidationPrice(
                            updatedCollateral,
                            positionValueUSD,
                            positionSizeSOL,
                            entryPrice,
                            position === "long"
                        );

                        setNewLiquidationPrice(newLiqPrice);
                    }
                }

            } catch (error) {
                console.error("Error calculating new values:", error);
                // Only reset if this is still the current calculation
                if (currentCalculationId === calculationIdRef.current) {
                    setNewLeverage(currentLeverage);
                    setNewLiquidationPrice(currentLiquidationPrice);
                    setNewCollateral(currentCollateral);
                }
            }
        };

        calculateNewValues();
    }, [amount, selectedToken, activeTab, currentLeverage, currentLiquidationPrice, currentCollateral, currentPositionSize, entryPrice, position, unrealizedPnl]);

    const handleConfirm = async () => {
        if (!amount || parseFloat(amount) <= 0) return;

        try {
            const amountValue = parseFloat(amount);

            if (activeTab === "increase" && onDeposit) {
                await onDeposit(amountValue, selectedToken);
            } else if (activeTab === "decrease" && onWithdraw) {
                await onWithdraw(amountValue, selectedToken);
            }

            // Reset form and close modal on success
            setAmount("");
            setIsOpen(false);
        } catch (error) {
            console.error(`Error ${activeTab}ing:`, error);
        }
    };

    const isValidAmount = amount && parseFloat(amount) > 0;

    // Updated liquidation check to include P&L in equity calculation
    const unrealizedPnlUSD = unrealizedPnl;
    const currentEquityAfterWithdraw = activeTab === "decrease" ?
        (newCollateral + unrealizedPnlUSD) :
        (currentCollateral + unrealizedPnlUSD);

    const wouldBeLiquidated = activeTab === "decrease" && currentEquityAfterWithdraw < currentPositionSize * 0.05;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger>
                <Pencil size={13} className={`hover:text-primary ${isOpen ? 'text-primary' : 'text-foreground'}`}/>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="bg-inherit gap-2">
                        <TabsTrigger
                            value="deposit"
                            className="p-0"
                        >
                            Increase
                        </TabsTrigger>
                        <TabsTrigger
                            value="decrease"
                            className="p-0"
                        >
                            Decrease
                        </TabsTrigger>
                    </TabsList>
                    {['increase', 'decrease'].map((tab) => (
                        <TabsContent
                            key={tab}
                            value={tab}
                            className="w-full flex flex-col space-y-2 mt-0"
                        >
                            <div className="relative w-full">
                                <Select value={selectedToken} onValueChange={(value) => setSelectedToken(value)}>
                                    <SelectTrigger className="w-fit p-1 bg-backgroundSecondary absolute left-3 top-1/2 -translate-y-1/2 flex items-center space-x-1 z-10">
                                        {tokens.map((token, idx) =>
                                            token.symbol === selectedToken && (
                                                <div
                                                    key={idx}
                                                    className="flex space-x-1"
                                                >
                                                    <Image
                                                        src={token.iconPath}
                                                        alt={token.name}
                                                        width={20}
                                                        height={20}
                                                        className="rounded-full w-5 h-5"
                                                    />
                                                    <span className="text-secondary-foreground text-sm">{token.symbol}</span>
                                                </div>
                                            ))}
                                        <ChevronDown size={14} className="text-secondary-foreground" />
                                    </SelectTrigger>
                                    <SelectContent className="min-w-fit">
                                        {tokens.map((token, idx) => (
                                            <SelectItem key={idx} value={token.symbol}>
                                                <div className="flex space-x-2">
                                                    <Image
                                                        src={token.iconPath}
                                                        alt={token.name}
                                                        width={20}
                                                        height={20}
                                                        className="rounded-full w-6 h-6"
                                                    />
                                                    <p>{token.symbol}</p>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Input
                                    type="number"
                                    placeholder='0.00'
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="pl-20 pr-2 text-right py-2 rounded-sm h-auto w-full bg-transparent border-border shadow-none"
                                    step="0.1"
                                    min="0.1"
                                />
                            </div>

                            {/* Real calculated values */}
                            <div className="w-full flex justify-between text-sm">
                                <span>Leverage</span>
                                <span className={newLeverage > 100 ? 'text-red-500' : newLeverage !== currentLeverage ? 'text-primary' : ''}>
                                    {newLeverage !== currentLeverage ? (
                                        <>
                                            {currentLeverage.toFixed(2)}x → {newLeverage.toFixed(2)}x
                                        </>
                                    ) : (
                                        `${newLeverage.toFixed(2)}x`
                                    )}
                                </span>
                            </div>

                            <div className="w-full flex justify-between text-sm">
                                <span>Liq. Price</span>
                                <span className={position === "long" ? 'text-red-500' : 'text-green-500'}>
                                    {newLiquidationPrice !== currentLiquidationPrice ? (
                                        <>
                                            ${currentLiquidationPrice.toFixed(2)} → ${newLiquidationPrice.toFixed(2)}
                                        </>
                                    ) : (
                                        `$${newLiquidationPrice.toFixed(2)}`
                                    )}
                                </span>
                            </div>

                            <div className="w-full flex justify-between text-sm">
                                <span>Collateral</span>
                                <span className={newCollateral !== currentCollateral ? 'text-primary' : ''}>
                                    {newCollateral !== currentCollateral ? (
                                        <>
                                            ${currentCollateral.toFixed(2)} → ${newCollateral.toFixed(2)}
                                        </>
                                    ) : (
                                        `$${newCollateral.toFixed(2)}`
                                    )}
                                </span>
                            </div>

                            {/* Added: Display current equity including P&L */}
                            <div className="w-full flex justify-between text-sm">
                                <span>Current Equity</span>
                                <span className={unrealizedPnlUSD >= 0 ? 'text-green-500' : 'text-red-500'}>
                                    ${(currentCollateral + unrealizedPnlUSD).toFixed(2)}
                                    {unrealizedPnlUSD !== 0 && (
                                        <span className="text-secondary-foreground text-xs ml-1">
                                            (P&L: {unrealizedPnlUSD >= 0 ? '+' : ''}${unrealizedPnlUSD.toFixed(2)})
                                        </span>
                                    )}
                                </span>
                            </div>

                            {wouldBeLiquidated && (
                                <div className="text-xs text-red-500 bg-red-500/10 p-2 rounded">
                                    ⚠️ This withdrawal would put your position at risk of liquidation
                                </div>
                            )}

                            <div className="w-full flex justify-between text-sm gap-2 pt-2">
                                <Button
                                    variant={'outline'}
                                    className="w-full"
                                    onClick={() => setIsOpen(false)}
                                    disabled={isProcessing}
                                >
                                    Dismiss
                                </Button>
                                <Button
                                    className="w-full bg-primary/70 hover:bg-primary text-black disabled:cursor-not-allowed"
                                    onClick={handleConfirm}
                                    disabled={!isValidAmount || wouldBeLiquidated || isProcessing}
                                >
                                    {isProcessing ? 'Processing...' : 'Confirm'}
                                </Button>
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </PopoverContent>
        </Popover>
    )
}