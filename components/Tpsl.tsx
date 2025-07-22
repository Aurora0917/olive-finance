'use client'

import { ChevronDown, Loader2, Pencil, AlertTriangle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useState, useContext } from "react";
import { Switch } from "./ui/switch";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "./ui/select";
import Image from "next/image";
import { tokenList } from "@/lib/data/tokenlist";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { ContractContext } from "@/contexts/contractProvider";
import { PerpTPSL } from "@/types/trading";

interface TpslProps {
    // Onchain integration props (required)
    positionIndex?: number;
    poolName?: string;
    positionSide?: 'long' | 'short';
    currentPrice: number;
    onOrderCreated?: () => void; // Callback to refresh orders
    // Context props (not used for operations, just for display/validation)
    userId?: string;
    positionId?: string;
    contractType?: 'perp' | 'option';
    custody?: string;
}

export default function Tpsl({ 
    positionIndex,
    poolName = "SOL/USDC",
    positionSide = 'long',
    currentPrice,
    onOrderCreated,
    userId,
    positionId,
    contractType = 'perp',
    custody
}: TpslProps) {
    const { onSetTpSl } = useContext(ContractContext);
    const [isPartial, setIsPartial] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedToken, setSelectedToken] = useState("SOL");
    const [activeTab, setActiveTab] = useState("TP"); // TP or SL
    const [selectedSizePercentage, setSelectedSizePercentage] = useState(25);
    const [takeProfitPrice, setTakeProfitPrice] = useState("");
    const [stopLossPrice, setStopLossPrice] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    const tokens = tokenList;
    const sizePercentages = [25, 50, 75, 100];

    // Mock calculation for demonstration
    const calculateTokenAmount = () => {
        const baseAmount = 4562.74;
        const percentage = selectedSizePercentage / 100;
        return parseFloat((baseAmount * percentage).toFixed(2));
    };

    const calculateUsdValue = () => {
        const baseValue = 1056336;
        const percentage = selectedSizePercentage / 100;
        return (baseValue * percentage).toLocaleString();
    };

    // Validate prices in real-time
    const validatePrices = (tpPrice?: string, slPrice?: string) => {
        const errors: string[] = [];
        const tp = tpPrice ? parseFloat(tpPrice) : undefined;
        const sl = slPrice ? parseFloat(slPrice) : undefined;

        // Basic validation for long positions
        if (positionSide === 'long') {
            if (tp && tp <= currentPrice) {
                errors.push('Take profit price must be above current price for long positions');
            }
            if (sl && sl >= currentPrice) {
                errors.push('Stop loss price must be below current price for long positions');
            }
        } else {
            // Validation for short positions
            if (tp && tp >= currentPrice) {
                errors.push('Take profit price must be below current price for short positions');
            }
            if (sl && sl <= currentPrice) {
                errors.push('Stop loss price must be above current price for short positions');
            }
        }

        // Additional validations
        if (tp && tp <= 0) {
            errors.push('Take profit price must be greater than 0');
        }
        if (sl && sl <= 0) {
            errors.push('Stop loss price must be greater than 0');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    };

    // Handle price input changes with validation
    const handleTakeProfitChange = (value: string) => {
        setTakeProfitPrice(value);
        const validation = validatePrices(value, stopLossPrice);
        setValidationErrors(validation.errors);
    };

    const handleStopLossChange = (value: string) => {
        setStopLossPrice(value);
        const validation = validatePrices(takeProfitPrice, value);
        setValidationErrors(validation.errors);
    };

    const handleConfirm = async () => {
        setIsLoading(true);
        
        try {
            // Validate prices
            const tp = takeProfitPrice ? parseFloat(takeProfitPrice) : undefined;
            const sl = stopLossPrice ? parseFloat(stopLossPrice) : undefined;
            
            console.log("Debug - positionIndex:", positionIndex);
            console.log("Debug - onSetTpSl function exists:", !!onSetTpSl);
            console.log("Debug - tp:", tp, "sl:", sl);
            console.log("Debug - isPartial:", isPartial);
            console.log("Debug - selectedSizePercentage:", selectedSizePercentage);
            
            const validation = validatePrices(takeProfitPrice, stopLossPrice);
            if (!validation.isValid) {
                setValidationErrors(validation.errors);
                toast.error(validation.errors[0]);
                setIsLoading(false);
                return;
            }

            // Require onchain transaction for TP/SL
            if (positionIndex === undefined || !onSetTpSl) {
                toast.error('Onchain TP/SL setting is required but not available');
                setIsLoading(false);
                return;
            }

            // Validate that at least one price is provided
            if ((!tp || tp <= 0) && (!sl || sl <= 0)) {
                toast.error('Please enter at least one TP or SL price');
                setIsLoading(false);
                return;
            }

            console.log("Setting TP/SL onchain for position:", positionIndex);
            
            // Prepare TP/SL arrays according to PerpTPSL interface
            const takeProfits: PerpTPSL[] = [];
            const stopLosses: PerpTPSL[] = [];
            
            if (tp && tp > 0) {
                takeProfits.push({
                    price: tp,
                    sizePercent: isPartial ? selectedSizePercentage : 100,
                    receiveSol: selectedToken === 'SOL'
                });
            }
            
            if (sl && sl > 0) {
                stopLosses.push({
                    price: sl,
                    sizePercent: isPartial ? selectedSizePercentage : 100,
                    receiveSol: selectedToken === 'SOL'
                });
            }
            
            console.log("Debug - Prepared arrays:");
            console.log("takeProfits:", takeProfits);
            console.log("stopLosses:", stopLosses);
            
            // Call the onchain set_tp_sl instruction
            const result = await onSetTpSl(
                positionIndex,
                takeProfits,
                stopLosses
            );

            if (result) {
                const orderTypes = [];
                if (tp && tp > 0) orderTypes.push('Take Profit');
                if (sl && sl > 0) orderTypes.push('Stop Loss');
                
                toast.success(`${orderTypes.join(' and ')} set successfully onchain`);
                
                // Callback to refresh data in parent component
                onOrderCreated?.();
                
                // Reset form
                setTakeProfitPrice("");
                setStopLossPrice("");
                setSelectedSizePercentage(25);
                setValidationErrors([]);
                setIsOpen(false);
            } else {
                toast.error('Failed to set TP/SL onchain');
            }
            
        } catch (error: any) {
            console.error('Error setting TP/SL onchain:', error);
            toast.error(error.message || 'Failed to set TP/SL onchain');
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate suggested prices based on current price and position type
    const getSuggestedTpPrice = () => {
        if (positionSide === 'long') {
            return (currentPrice + 5).toFixed(2); // Suggest $5 above current price
        } else {
            return (currentPrice - 5).toFixed(2); // Suggest $5 below current price
        }
    };

    const getSuggestedSlPrice = () => {
        if (positionSide === 'long') {
            return (currentPrice - 5).toFixed(2); // Suggest $5 below current price
        } else {
            return (currentPrice + 5).toFixed(2); // Suggest $5 above current price
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger disabled={isLoading}>
                <Pencil 
                    size={13} 
                    className={`hover:text-primary transition-colors ${isOpen ? 'text-primary' : 'text-foreground'} ${isLoading ? 'opacity-50' : ''}`} 
                />
            </PopoverTrigger>
            <PopoverContent align="end" className="flex flex-col space-y-3 w-80">
                <div className="w-full flex justify-between gap-5">
                    <div className="w-full flex flex-col justify-center">
                        <h1 className="text-sm font-medium">{isPartial ? 'Partial' : 'Full'} TPSL</h1>
                        <p className="text-xs text-secondary-foreground">
                            Current price: ${currentPrice.toFixed(2)} | Position: {positionSide.toUpperCase()}
                        </p>
                        {isPartial && (
                            <p className="text-xs text-secondary-foreground mt-1">
                                Closes only the specified size at the target price, based on the size set when the TP/SL is created.
                            </p>
                        )}
                    </div>
                    <div className="w-fit flex gap-2 items-center">
                        <span className={`text-sm ${isPartial ? 'text-secondary-foreground' : 'text-primary'}`}>Full</span>
                        <Switch
                            checked={isPartial}
                            onCheckedChange={setIsPartial}
                            disabled={isLoading}
                        />
                        <span className={`text-sm ${isPartial ? 'text-primary' : 'text-secondary-foreground'}`}>Partial</span>
                    </div>
                </div>

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
                        {validationErrors.map((error, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />
                                <p className="text-xs text-red-400">{error}</p>
                            </div>
                        ))}
                    </div>
                )}

                {isPartial ? (
                    <div className="flex flex-col space-y-3">
                        {/* TP/SL Tabs */}
                        <div className="flex gap-1 bg-backgroundSecondary rounded p-1">
                            <Button
                                variant={activeTab === "TP" ? "default" : "ghost"}
                                size="sm"
                                className={`flex-1 h-7 ${activeTab === "TP" ? 'bg-primary text-black' : 'bg-transparent text-secondary-foreground hover:text-foreground'}`}
                                onClick={() => setActiveTab("TP")}
                                disabled={isLoading}
                            >
                                TP
                            </Button>
                            <Button
                                variant={activeTab === "SL" ? "default" : "ghost"}
                                size="sm"
                                className={`flex-1 h-7 ${activeTab === "SL" ? 'bg-primary text-black' : 'bg-transparent text-secondary-foreground hover:text-foreground'}`}
                                onClick={() => setActiveTab("SL")}
                                disabled={isLoading}
                            >
                                SL
                            </Button>
                        </div>

                        {/* TP/SL Price based on active tab */}
                        {activeTab === "TP" ? (
                            <div className="flex flex-col space-y-2">
                                <Label className="font-normal flex items-center justify-between">
                                    Take Profit Price
                                    <span className="text-xs text-secondary-foreground">
                                        Suggested: ${getSuggestedTpPrice()}
                                    </span>
                                </Label>
                                <div className="relative w-full">
                                    <Select value={selectedToken} onValueChange={(value) => setSelectedToken(value)} disabled={isLoading}>
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
                                        value={takeProfitPrice}
                                        onChange={(e) => handleTakeProfitChange(e.target.value)}
                                        className="pl-20 pr-2 text-right py-2 rounded-sm h-auto w-full bg-transparent border-border shadow-none"
                                        step="0.01"
                                        min="0.01"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col space-y-2">
                                <Label className="font-normal flex items-center justify-between">
                                    Stop Loss Price
                                    <span className="text-xs text-secondary-foreground">
                                        Suggested: ${getSuggestedSlPrice()}
                                    </span>
                                </Label>
                                <div className="relative w-full">
                                    <Select value={selectedToken} onValueChange={(value) => setSelectedToken(value)} disabled={isLoading}>
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
                                        value={stopLossPrice}
                                        onChange={(e) => handleStopLossChange(e.target.value)}
                                        className="pl-20 pr-2 text-right py-2 rounded-sm h-auto w-full bg-transparent border-border shadow-none"
                                        step="0.01"
                                        min="0.01"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Size Selection */}
                        <div className="flex flex-col space-y-2">
                            <Label className="font-normal text-sm">Size</Label>
                            <div className="flex space-x-1">
                                {sizePercentages.map((percentage) => (
                                    <Button
                                        key={percentage}
                                        variant={selectedSizePercentage === percentage ? "default" : "outline"}
                                        size="sm"
                                        className={`flex-1 h-7 text-xs ${selectedSizePercentage === percentage ? 'bg-primary text-black' : 'bg-backgroundSecondary border-border text-secondary-foreground'}`}
                                        onClick={() => setSelectedSizePercentage(percentage)}
                                        disabled={isLoading}
                                    >
                                        {percentage}%
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Size Display */}
                        <div className="flex justify-between items-center text-sm bg-backgroundSecondary/50 rounded p-2">
                            <div className="flex items-center space-x-1">
                                <span className="text-green-400">+{calculateTokenAmount()}</span>
                                <span className="text-green-400 text-xs">(+{((calculateTokenAmount() / 4562.74) * 100).toFixed(2)}%)</span>
                            </div>
                            <div className="text-right">
                                <span className="font-medium">{calculateUsdValue()} USD</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col space-y-3">
                        <div className="flex flex-col space-y-2">
                            <Label className="font-normal flex items-center justify-between">
                                Take Profit Price
                                <span className="text-xs text-secondary-foreground">
                                    Suggested: ${getSuggestedTpPrice()}
                                </span>
                            </Label>
                            <div className="relative w-full">
                                <Select value={selectedToken} onValueChange={(value) => setSelectedToken(value)} disabled={isLoading}>
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
                                    value={takeProfitPrice}
                                    onChange={(e) => handleTakeProfitChange(e.target.value)}
                                    className="pl-20 pr-2 text-right py-2 rounded-sm h-auto w-full bg-transparent border-border shadow-none"
                                    step="0.01"
                                    min="0.01"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col space-y-2">
                            <Label className="font-normal flex items-center justify-between">
                                Stop Loss Price
                                <span className="text-xs text-secondary-foreground">
                                    Suggested: ${getSuggestedSlPrice()}
                                </span>
                            </Label>
                            <div className="relative w-full">
                                <Select value={selectedToken} onValueChange={(value) => setSelectedToken(value)} disabled={isLoading}>
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
                                    value={stopLossPrice}
                                    onChange={(e) => handleStopLossChange(e.target.value)}
                                    className="pl-20 pr-2 text-right py-2 rounded-sm h-auto w-full bg-transparent border-border shadow-none"
                                    step="0.01"
                                    min="0.01"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="w-full flex justify-between text-sm gap-2 pt-2">
                    <Button
                        variant={'outline'}
                        className="w-full"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsOpen(false);
                        }}
                        disabled={isLoading}
                        type="button"
                    >
                        Dismiss
                    </Button>
                    <Button
                        className="w-full bg-primary/70 hover:bg-primary text-black disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={handleConfirm}
                        disabled={isLoading || validationErrors.length > 0 || positionIndex === undefined || !onSetTpSl}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Setting...
                            </>
                        ) : (
                            'Confirm'
                        )}
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}