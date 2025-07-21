'use client'

import { ChevronDown, CirclePlus, SquarePen, Loader2, Pencil } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useState } from "react";
import { Switch } from "./ui/switch";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "./ui/select";
import Image from "next/image";
import { tokenList } from "@/lib/data/tokenlist";
import { Input } from "./ui/input";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { tpSlApiService, TpSlOrderRequest } from "@/services/tpSlApiService";
import { toast } from "sonner";
import { ContractContext } from "@/contexts/contractProvider";
import { useContext } from "react";

interface TpSlFormData {
    type: 'take-profit' | 'stop-loss';
    price: number;
    token: string;
    percentage: number;
    isPartial: boolean;
}

interface TpslProps {
    onCreateOrder?: (orderData: TpSlFormData) => void;
    // Onchain integration props
    positionIndex?: number; // Required for onchain TP/SL
    poolName?: string;
    positionSide?: 'long' | 'short'; // Frontend still uses long/short for UI
    positionDirection?: 'long' | 'short'; // Keep for internal logic
    currentPrice: number;
    onOrderCreated?: () => void; // Callback to refresh orders
    // Legacy backend props (deprecated)
    userId?: string;
    positionId?: string;
    contractType?: 'perp' | 'option';
    custody?: string;
}

export default function Tpsl({ 
    onCreateOrder, 
    positionIndex,
    poolName = "SOL/USDC",
    positionSide = 'long',
    positionDirection,
    currentPrice,
    onOrderCreated,
    // Legacy props
    userId,
    positionId,
    contractType = 'perp',
    custody
}: TpslProps) {
    const { onSetTpSl } = useContext(ContractContext);
    const [isPartial, setIsPartial] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [active, setActive] = useState('tp')
    const [selectedToken, setSelectedToken] = useState("SOL");
    const [activeTab, setActiveTab] = useState("TP"); // TP or SL
    const [selectedSizePercentage, setSelectedSizePercentage] = useState(25);
    const [takeProfitPrice, setTakeProfitPrice] = useState("");
    const [stopLossPrice, setStopLossPrice] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    const tokens = tokenList;
    const sizePercentages = [25, 50, 75, 100];

    // Use positionDirection if provided, otherwise fall back to positionSide
    const effectivePositionDirection = positionDirection || positionSide;

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

        const validation = tpSlApiService.validateTpSlPrices(currentPrice, tp, sl, effectivePositionDirection);
        return validation;
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
            
            const validation = validatePrices(takeProfitPrice, stopLossPrice);
            if (!validation.isValid) {
                setValidationErrors(validation.errors);
                toast.error(validation.errors[0]);
                setIsLoading(false);
                return;
            }

            // Use onchain transaction for TP/SL (preferred method)
            if (positionIndex !== undefined && onSetTpSl) {
                try {
                    // Validate that at least one price is provided
                    if ((!tp || tp <= 0) && (!sl || sl <= 0)) {
                        toast.error('Please enter at least one TP or SL price');
                        setIsLoading(false);
                        return;
                    }

                    console.log("Setting TP/SL onchain for position:", positionIndex);
                    
                    // Call the onchain set_tp_sl instruction
                    const result = await onSetTpSl(
                        positionIndex,
                        poolName,
                        tp && tp > 0 ? tp : undefined,
                        sl && sl > 0 ? sl : undefined
                    );

                    if (result) {
                        const orderTypes = [];
                        if (tp && tp > 0) orderTypes.push('Take Profit');
                        if (sl && sl > 0) orderTypes.push('Stop Loss');
                        
                        toast.success(`${orderTypes.join(' and ')} set successfully onchain`);
                        
                        // Callback to refresh data in parent component
                        onOrderCreated?.();
                    } else {
                        toast.error('Failed to set TP/SL onchain');
                        setIsLoading(false);
                        return;
                    }
                } catch (error: any) {
                    console.error('Error setting TP/SL onchain:', error);
                    toast.error(error.message || 'Failed to set TP/SL onchain');
                    setIsLoading(false);
                    return;
                }
            } else {
                // Fallback to local state management
                if (!onCreateOrder) {
                    toast.error('Missing configuration for TP/SL creation');
                    setIsLoading(false);
                    return;
                }

                if (isPartial) {
                    const price = activeTab === "TP" ? tp : sl;
                    if (!price || price <= 0) {
                        toast.error('Please enter a valid price');
                        setIsLoading(false);
                        return;
                    }

                    const orderData: TpSlFormData = {
                        type: activeTab === "TP" ? 'take-profit' : 'stop-loss',
                        price,
                        token: selectedToken,
                        percentage: selectedSizePercentage,
                        isPartial: true
                    };

                    onCreateOrder(orderData);
                } else {
                    if (tp && tp > 0) {
                        const tpOrder: TpSlFormData = {
                            type: 'take-profit',
                            price: tp,
                            token: selectedToken,
                            percentage: 100,
                            isPartial: false
                        };
                        onCreateOrder(tpOrder);
                    }

                    if (sl && sl > 0) {
                        const slOrder: TpSlFormData = {
                            type: 'stop-loss',
                            price: sl,
                            token: selectedToken,
                            percentage: 100,
                            isPartial: false
                        };
                        onCreateOrder(slOrder);
                    }
                }
            }

            // Reset form
            setTakeProfitPrice("");
            setStopLossPrice("");
            setSelectedSizePercentage(25);
            setValidationErrors([]);
            setIsOpen(false);
            
        } catch (error) {
            console.error('Unexpected error:', error);
            toast.error('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate suggested prices based on current price and position type
    const getSuggestedTpPrice = () => {
        if (effectivePositionDirection === 'long') {
            return (currentPrice + 5).toFixed(2); // Suggest $5 above current price
        } else {
            return (currentPrice - 5).toFixed(2); // Suggest $5 below current price
        }
    };

    const getSuggestedSlPrice = () => {
        if (effectivePositionDirection === 'long') {
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
                    className={`hover:text-primary ${isOpen ? 'text-primary' : 'text-foreground'} ${isLoading ? 'opacity-50' : ''}`} 
                />
            </PopoverTrigger>
            <PopoverContent align="end" className="flex flex-col space-y-3 w-80">
                <div className="w-full flex justify-between gap-5">
                    <div className="w-full flex flex-col justify-center">
                        <h1 className="text-sm">{isPartial ? 'Partial' : 'Full'} TPSL</h1>
                        <p className="text-xs text-secondary-foreground">
                            Current price: ${currentPrice.toFixed(2)} | Position: {effectivePositionDirection.toUpperCase()}
                        </p>
                        {positionIndex !== undefined && (
                            <p className="text-xs text-green-400">
                                Onchain Mode: Position {positionIndex}
                            </p>
                        )}
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
                            <p key={index} className="text-xs text-red-400">{error}</p>
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
                                    <Select defaultValue="SOL" onValueChange={(value) => setSelectedToken(value)} disabled={isLoading}>
                                        <SelectTrigger className="w-fit p-1 bg-backgroundSecondary absolute left-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
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
                                        // placeholder={getSuggestedTpPrice()}
                                        value={takeProfitPrice}
                                        onChange={(e) => handleTakeProfitChange(e.target.value)}
                                        className="px-2 text-right py-2 rounded-sm h-auto w-full bg-transparent border-border shadow-none"
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
                                    <Select defaultValue="SOL" onValueChange={(value) => setSelectedToken(value)} disabled={isLoading}>
                                        <SelectTrigger className="w-fit p-1 bg-backgroundSecondary absolute left-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
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
                                        // placeholder={getSuggestedSlPrice()}
                                        value={stopLossPrice}
                                        onChange={(e) => handleStopLossChange(e.target.value)}
                                        className="px-2 text-right py-2 rounded-sm h-auto w-full bg-transparent border-border shadow-none"
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
                        <div className="flex justify-between items-center text-sm">
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
                    <div className="flex flex-col space-y-2">
                        <div className="flex flex-col space-y-2">
                            <Label className="font-normal flex items-center justify-between">
                                Take Profit Price
                                <span className="text-xs text-secondary-foreground">
                                    Suggested: ${getSuggestedTpPrice()}
                                </span>
                            </Label>
                            <div className="relative w-full">
                                <Select defaultValue="SOL" onValueChange={(value) => setSelectedToken(value)} disabled={isLoading}>
                                    <SelectTrigger className="w-fit p-1 bg-backgroundSecondary absolute left-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
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
                                    // placeholder={getSuggestedTpPrice()}
                                    value={takeProfitPrice}
                                    onChange={(e) => handleTakeProfitChange(e.target.value)}
                                    className="px-2 text-right py-2 rounded-sm h-auto w-full bg-transparent border-border shadow-none"
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
                                <Select defaultValue="SOL" onValueChange={(value) => setSelectedToken(value)} disabled={isLoading}>
                                    <SelectTrigger className="w-fit p-1 bg-backgroundSecondary absolute left-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
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
                                    // placeholder={getSuggestedSlPrice()}
                                    value={stopLossPrice}
                                    onChange={(e) => handleStopLossChange(e.target.value)}
                                    className="px-2 text-right py-2 rounded-sm h-auto w-full bg-transparent border-border shadow-none"
                                    step="0.01"
                                    min="0.01"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="w-full flex justify-between text-sm gap-2">
                    <Button
                        variant={'outline'}
                        className="w-full"
                        onClick={() => setIsOpen(false)}
                        disabled={isLoading}
                    >
                        Dismiss
                    </Button>
                    <Button
                        className="w-full bg-primary/70 hover:bg-primary text-black disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={handleConfirm}
                        disabled={isLoading || validationErrors.length > 0}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Creating...
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