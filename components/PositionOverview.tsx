import { ExpiryIcon, PositionTypeIcon, PurchasePriceIcon, RedArrowPnl, SizeIcon, StrikePriceIcon, ValueIcon } from "@/public/svgs/icons"
import { Calendar, ChevronDown, SquarePen } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Label } from "./ui/label"
import { Calendar as CalendarComponent } from "./ui/calendar"
import React, { useState, useEffect, useContext } from "react"
import { Button } from "./ui/button"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import Image from "next/image";
import { tokenList } from "@/lib/data/tokenlist"
import { ContractContext } from "@/contexts/contractProvider"
import { usePythPrice } from "@/hooks/usePythPrice"
import { OptionDetailUtils } from "@/utils/optionsPricing"

interface PositionOverviewProps {
    type: string
    expiry: string
    size: number
    value: number
    pnl: number
    strikePrice: number
    purchaseDate?: string
    position?: any
    optionIndex?: number
}

export default function PositionOverview({
    type,
    expiry,
    size,
    value,
    pnl,
    strikePrice,
    position,
    optionIndex
}: PositionOverviewProps) {
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isExpiry, setIsExpiry] = useState(false);
    const [isSize, setIsSize] = useState(false);
    const [isStrike, setIsStrike] = useState(false);
    const [customDate, setCustomDate] = useState<Date>();

    // Loading states for each edit action
    const [isSizeLoading, setIsSizeLoading] = useState(false);
    const [isStrikeLoading, setIsStrikeLoading] = useState(false);
    const [isExpiryLoading, setIsExpiryLoading] = useState(false);

    // Token selection states
    const [selectedTokenSize, setSelectedTokenSize] = useState("SOL");
    const [selectedTokenStrike, setSelectedTokenStrike] = useState("SOL");
    const [selectedTokenExpiry, setSelectedTokenExpiry] = useState("SOL");
    const tokens = tokenList;

    // Edit form values
    const [newSize, setNewSize] = useState<string>(size.toString());
    const [newStrike, setNewStrike] = useState<string>(strikePrice.toString());
    const [newExpiry, setNewExpiry] = useState<Date | undefined>();

    // Calculated amounts
    const [sizePayAmount, setSizePayAmount] = useState<number>(0);
    const [strikePayAmount, setStrikePayAmount] = useState<number>(0);
    const [expiryPayAmount, setExpiryPayAmount] = useState<number>(0);

    const {
        getPoolUtilization,
        onEditOption, // Add this from ContractContext
    } = useContext(ContractContext);
    const { priceData: pythPriceData } = usePythPrice("Crypto.SOL/USD");

    // Get current SOL price
    const currentPrice = pythPriceData.price || 0;

    // Enhanced calculation function
    const calculatePayAmount = (
        changeType: 'size' | 'strike' | 'expiry',
        newValue: number | Date
    ): number => {
        if (currentPrice === 0) return 0;

        try {
            // Get current time and calculate time to expiry
            const now = Date.now();
            const currentExpiryTime = new Date(expiry).getTime();

            // Determine new parameters
            let calcSize = size;
            let calcStrike = strikePrice;
            let calcExpiryTime = currentExpiryTime;

            switch (changeType) {
                case 'size':
                    calcSize = newValue as number;
                    break;
                case 'strike':
                    calcStrike = newValue as number;
                    break;
                case 'expiry':
                    calcExpiryTime = (newValue as Date).getTime();
                    break;
            }

            // Convert to years
            const currentTimeToExpiry = Math.max((currentExpiryTime - now) / (365.25 * 24 * 60 * 60 * 1000), 0.001);
            const newTimeToExpiry = Math.max((calcExpiryTime - now) / (365.25 * 24 * 60 * 60 * 1000), 0.001);

            // Get pool utilization for borrow rate calculation
            const isCall = type === "Call";
            const utilization = getPoolUtilization ? getPoolUtilization(isCall ? "SOL" : "USDC") : null;

            if (!utilization) {
                console.warn("No utilization data available");
                return 0;
            }

            // Calculate current option value (total for current size)
            let currentOptionValue = 0;
            try {
                const currentValuePerUnit = OptionDetailUtils.blackScholesWithBorrowRate(
                    currentPrice,
                    strikePrice,
                    currentTimeToExpiry,
                    isCall,
                    utilization.tokenLocked,
                    utilization.tokenOwned,
                    isCall
                );
                currentOptionValue = currentValuePerUnit * size;
            } catch (error) {
                console.error("Error calculating current option value:", error);
                // Fallback to intrinsic value
                const intrinsicValue = isCall ?
                    Math.max(0, currentPrice - strikePrice) :
                    Math.max(0, strikePrice - currentPrice);
                currentOptionValue = intrinsicValue * size;
            }

            // Calculate new option value
            let newOptionValue = 0;
            try {
                const newValuePerUnit = OptionDetailUtils.blackScholesWithBorrowRate(
                    currentPrice,
                    calcStrike,
                    changeType === 'expiry' ? newTimeToExpiry : currentTimeToExpiry,
                    isCall,
                    utilization.tokenLocked,
                    utilization.tokenOwned,
                    isCall
                );
                newOptionValue = newValuePerUnit * calcSize;
            } catch (error) {
                console.error("Error calculating new option value:", error);
                // Fallback to intrinsic value
                const intrinsicValue = isCall ?
                    Math.max(0, currentPrice - calcStrike) :
                    Math.max(0, calcStrike - currentPrice);
                newOptionValue = intrinsicValue * calcSize;
            }

            // Calculate difference (positive = user pays more, negative = user gets refund)
            const difference = newOptionValue - currentOptionValue;

            console.log(`${changeType} calculation:`, {
                currentPrice,
                currentSize: size,
                currentStrike: strikePrice,
                newSize: calcSize,
                newStrike: calcStrike,
                currentOptionValue,
                newOptionValue,
                difference
            });

            let amount;

            switch (changeType) {
                case 'size':
                    amount = selectedTokenSize === 'SOL' ? difference / currentPrice : difference;
                    break;
                case 'strike':
                    amount = selectedTokenStrike === 'SOL' ? difference / currentPrice : difference;
                    break;
                case 'expiry':
                    amount = selectedTokenExpiry === 'SOL' ? difference / currentPrice : difference;
                    break;
            }

            return amount;

        } catch (error) {
            console.error(`Error calculating ${changeType} adjustment:`, error);
            return 0;
        }
    };

    // Update calculations when inputs change
    useEffect(() => {
        if (newSize && parseFloat(newSize) > 0) {
            const amount = calculatePayAmount('size', parseFloat(newSize));
            setSizePayAmount(amount);
        } else {
            setSizePayAmount(0);
        }
    }, [newSize, currentPrice, position, selectedTokenSize]);

    useEffect(() => {
        if (newStrike && parseFloat(newStrike) > 0) {
            const amount = calculatePayAmount('strike', parseFloat(newStrike));
            setStrikePayAmount(amount);
        } else {
            setStrikePayAmount(0);
        }
    }, [newStrike, currentPrice, position, selectedTokenStrike]);

    useEffect(() => {
        if (newExpiry) {
            const amount = calculatePayAmount('expiry', newExpiry);
            setExpiryPayAmount(amount);
        } else {
            setExpiryPayAmount(0);
        }
    }, [newExpiry, currentPrice, position, selectedTokenExpiry]);

    // Handle edit confirmations with actual smart contract calls
    const handleSizeEdit = async () => {
        if (!optionIndex || !onEditOption) {
            console.error("Missing required data for size edit");
            return;
        }

        setIsSizeLoading(true);
        try {
            // onEditOption expects regular token amounts (not wei/micro units)
            // The function itself will handle the conversion to micro units
            const success = await onEditOption({
                optionIndex: optionIndex,
                poolName: "SOL/USDC",
                newSize: parseFloat(newSize),
                // Slippage protection: 5% tolerance
                maxAdditionalPremium: sizePayAmount > 0 ? Math.abs(sizePayAmount) * 1.05 : 0,
                minRefundAmount: sizePayAmount < 0 ? Math.abs(sizePayAmount) * 0.95 : 0,
            });

            if (success) {
                setIsSize(false);
                // Reset to new values
                setNewSize(parseFloat(newSize).toString());
                console.log("Size edit successful!");
            } else {
                console.error("Size edit failed");
            }
        } catch (error) {
            console.error("Error in size edit:", error);
        } finally {
            setIsSizeLoading(false);
        }
    };

    const handleStrikeEdit = async () => {
        if (!optionIndex || !onEditOption) {
            console.error("Missing required data for strike edit");
            return;
        }

        setIsStrikeLoading(true);
        try {
            // Convert amounts to proper scale
            const amountInTokenUnits = selectedTokenStrike === 'SOL' 
                ? Math.abs(strikePayAmount) * 1_000_000_000
                : Math.abs(strikePayAmount) * 1_000_000;

            const success = await onEditOption({
                optionIndex: optionIndex,
                poolName: "SOL/USDC",
                newStrike: parseFloat(newStrike),
                // Slippage protection: 5% tolerance
                maxAdditionalPremium: strikePayAmount > 0 ? amountInTokenUnits * 1.05 : 0,
                minRefundAmount: strikePayAmount < 0 ? amountInTokenUnits * 0.95 : 0,
            });

            if (success) {
                setIsStrike(false);
                // Reset to new values
                setNewStrike(parseFloat(newStrike).toString());
                console.log("Strike edit successful!");
            } else {
                console.error("Strike edit failed");
            }
        } catch (error) {
            console.error("Error in strike edit:", error);
        } finally {
            setIsStrikeLoading(false);
        }
    };

    const handleExpiryEdit = async () => {
        if (!optionIndex || !onEditOption || !newExpiry) {
            console.error("Missing required data for expiry edit");
            return;
        }

        setIsExpiryLoading(true);
        try {
            // Convert amounts to proper scale
            const amountInTokenUnits = selectedTokenExpiry === 'SOL' 
                ? Math.abs(expiryPayAmount) * 1_000_000_000
                : Math.abs(expiryPayAmount) * 1_000_000;

            const success = await onEditOption({
                optionIndex: optionIndex,
                poolName: "SOL/USDC",
                newExpiry: Math.floor(newExpiry.getTime() / 1000), // Convert to Unix timestamp
                // Slippage protection: 5% tolerance
                maxAdditionalPremium: expiryPayAmount > 0 ? amountInTokenUnits * 1.05 : 0,
                minRefundAmount: expiryPayAmount < 0 ? amountInTokenUnits * 0.95 : 0,
            });

            if (success) {
                setIsExpiry(false);
                console.log("Expiry edit successful!");
            } else {
                console.error("Expiry edit failed");
            }
        } catch (error) {
            console.error("Error in expiry edit:", error);
        } finally {
            setIsExpiryLoading(false);
        }
    };

    return (
        <div className='w-full flex flex-col space-y-1'>
            {/* Size Row */}
            <div className='w-full flex justify-between text-sm text-secondary-foreground font-normal'>
                <div className='flex space-x-2 items-center'>
                    <SizeIcon />
                    <span>Size:</span>
                </div>
                <div className='flex space-x-2 items-center'>
                    <span>{size}</span>
                    <Popover open={isSize} onOpenChange={setIsSize}>
                        <PopoverTrigger asChild>
                            <SquarePen size={13} className="text-foreground hover:text-primary cursor-pointer" />
                        </PopoverTrigger>
                        <PopoverContent align="end" className="p-3 space-y-4">
                            <div className="space-y-2 flex flex-col">
                                <Label>New Size</Label>
                                <Input
                                    type="number"
                                    value={newSize}
                                    onChange={(e) => setNewSize(e.target.value)}
                                    className="p-2 border-border text-xs rounded-sm"
                                    placeholder={size.toString()}
                                    step="0.001"
                                    min="0"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">
                                    {sizePayAmount >= 0 ? "Pay" : "Receive"} in
                                </Label>
                                <div className="relative w-full">
                                    <Select value={selectedTokenSize} onValueChange={setSelectedTokenSize}>
                                        <SelectTrigger className="w-fit p-1 bg-backgroundSecondary absolute left-3 top-1/2 -translate-y-1/2 flex items-center space-x-1 z-10 border-0">
                                            <div className="flex items-center space-x-1">
                                                {tokens.map((token, idx) =>
                                                    token.symbol === selectedTokenSize && (
                                                        <React.Fragment key={idx}>
                                                            <Image
                                                                src={token.iconPath}
                                                                alt={token.name}
                                                                width={20}
                                                                height={20}
                                                                className="rounded-full w-5 h-5"
                                                            />
                                                            <span className="text-secondary-foreground text-sm">{token.symbol}</span>
                                                        </React.Fragment>
                                                    ))}
                                                <ChevronDown size={14} className="text-secondary-foreground" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tokens.map((token, idx) => (
                                                <SelectItem key={idx} value={token.symbol}>
                                                    <div className="flex space-x-2 items-center">
                                                        <Image
                                                            src={token.iconPath}
                                                            alt={token.name}
                                                            width={20}
                                                            height={20}
                                                            className="rounded-full w-5 h-5"
                                                        />
                                                        <span>{token.symbol}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="number"
                                        value={Math.abs(sizePayAmount).toFixed(6)}
                                        readOnly
                                        className={`pl-20 pr-2 py-2 rounded-sm h-auto w-full bg-muted border-border shadow-none cursor-not-allowed text-xs text-right ${sizePayAmount < 0 ? 'text-green-500' : 'text-red-500'}`}
                                    />
                                </div>
                                {sizePayAmount !== 0 && (
                                    <div className="text-xs text-secondary-foreground">
                                        {sizePayAmount >= 0 ? "Additional payment required" : "Refund amount"}
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant='outline'
                                    onClick={() => {
                                        setIsSize(false);
                                        setNewSize(size.toString());
                                    }}
                                    disabled={isSizeLoading}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    onClick={handleSizeEdit} 
                                    disabled={!newSize || parseFloat(newSize) <= 0 || isSizeLoading}
                                >
                                    {isSizeLoading ? "Processing..." : "Confirm"}
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* Strike Price Row */}
            <div className='w-full flex justify-between text-sm text-secondary-foreground font-normal'>
                <div className='flex space-x-2 items-center'>
                    <StrikePriceIcon />
                    <span>Strike Price:</span>
                </div>
                <div className='flex space-x-2 items-center'>
                    <span>${strikePrice}</span>
                    <Popover open={isStrike} onOpenChange={setIsStrike}>
                        <PopoverTrigger asChild>
                            <SquarePen size={13} className="text-foreground hover:text-primary cursor-pointer" />
                        </PopoverTrigger>
                        <PopoverContent align="end" className="p-3 space-y-4">
                            <div className="space-y-2 flex flex-col">
                                <Label className="text-xs">New Strike Price</Label>
                                <Input
                                    type="number"
                                    value={newStrike}
                                    onChange={(e) => setNewStrike(e.target.value)}
                                    className="p-2 border-border text-xs rounded-sm"
                                    placeholder={strikePrice.toString()}
                                    step="0.01"
                                    min="0"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">
                                    {strikePayAmount >= 0 ? "Pay" : "Receive"} in
                                </Label>
                                <div className="relative w-full">
                                    <Select value={selectedTokenStrike} onValueChange={setSelectedTokenStrike}>
                                        <SelectTrigger className="w-fit p-1 bg-backgroundSecondary absolute left-3 top-1/2 -translate-y-1/2 flex items-center space-x-1 z-10 border-0">
                                            <div className="flex items-center space-x-1">
                                                {tokens.map((token, idx) =>
                                                    token.symbol === selectedTokenStrike && (
                                                        <React.Fragment key={idx}>
                                                            <Image
                                                                src={token.iconPath}
                                                                alt={token.name}
                                                                width={20}
                                                                height={20}
                                                                className="rounded-full w-5 h-5"
                                                            />
                                                            <span className="text-secondary-foreground text-sm">{token.symbol}</span>
                                                        </React.Fragment>
                                                    ))}
                                                <ChevronDown size={14} className="text-secondary-foreground" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tokens.map((token, idx) => (
                                                <SelectItem key={idx} value={token.symbol}>
                                                    <div className="flex space-x-2 items-center">
                                                        <Image
                                                            src={token.iconPath}
                                                            alt={token.name}
                                                            width={20}
                                                            height={20}
                                                            className="rounded-full w-5 h-5"
                                                        />
                                                        <span>{token.symbol}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="number"
                                        value={Math.abs(strikePayAmount).toFixed(6)}
                                        readOnly
                                        className={`pl-20 pr-2 py-2 rounded-sm h-auto w-full bg-muted border-border shadow-none cursor-not-allowed text-xs text-right ${strikePayAmount < 0 ? 'text-green-500' : 'text-red-500'}`}
                                    />
                                </div>
                                {strikePayAmount !== 0 && (
                                    <div className="text-xs text-secondary-foreground">
                                        {strikePayAmount >= 0 ? "Additional payment required" : "Refund amount"}
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant='outline'
                                    onClick={() => {
                                        setIsStrike(false);
                                        setNewStrike(strikePrice.toString());
                                    }}
                                    disabled={isStrikeLoading}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    onClick={handleStrikeEdit} 
                                    disabled={!newStrike || parseFloat(newStrike) <= 0 || isStrikeLoading}
                                >
                                    {isStrikeLoading ? "Processing..." : "Confirm"}
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* Expiry Row */}
            <div className='w-full flex justify-between text-sm text-secondary-foreground font-normal'>
                <div className='flex space-x-2 items-center'>
                    <ExpiryIcon />
                    <span>Expiry:</span>
                </div>
                <div className='flex space-x-2 items-center'>
                    <span>{format(new Date(expiry), "dd MMM, yyyy")}</span>
                    <Popover open={isExpiry} onOpenChange={setIsExpiry}>
                        <PopoverTrigger asChild>
                            <SquarePen size={13} className="text-foreground hover:text-primary cursor-pointer" />
                        </PopoverTrigger>
                        <PopoverContent align="end" className="p-3 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs">New Expiration</Label>
                                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left text-xs font-normal hover:bg-inherit hover:text-secondary-foreground border-border p-2 [&_svg]:size-3",
                                                !newExpiry && "text-muted-foreground"
                                            )}
                                        >
                                            <Calendar className="h-3 w-3" />
                                            {newExpiry ? format(newExpiry, "PPP") : "Pick a date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <CalendarComponent
                                            mode="single"
                                            selected={newExpiry}
                                            onSelect={(date) => {
                                                setNewExpiry(date);
                                                setIsCalendarOpen(false);
                                            }}
                                            initialFocus
                                            disabled={(date) => date <= new Date()}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">
                                    {expiryPayAmount >= 0 ? "Pay" : "Receive"} in
                                </Label>
                                <div className="relative w-full">
                                    <Select value={selectedTokenExpiry} onValueChange={setSelectedTokenExpiry}>
                                        <SelectTrigger className="w-fit p-1 bg-backgroundSecondary absolute left-3 top-1/2 -translate-y-1/2 flex items-center space-x-1 z-10 border-0">
                                            <div className="flex items-center space-x-1">
                                                {tokens.map((token, idx) =>
                                                    token.symbol === selectedTokenExpiry && (
                                                        <React.Fragment key={idx}>
                                                            <Image
                                                                src={token.iconPath}
                                                                alt={token.name}
                                                                width={20}
                                                                height={20}
                                                                className="rounded-full w-5 h-5"
                                                            />
                                                            <span className="text-secondary-foreground text-sm">{token.symbol}</span>
                                                        </React.Fragment>
                                                    ))}
                                                <ChevronDown size={14} className="text-secondary-foreground" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tokens.map((token, idx) => (
                                                <SelectItem key={idx} value={token.symbol}>
                                                    <div className="flex space-x-2 items-center">
                                                        <Image
                                                            src={token.iconPath}
                                                            alt={token.name}
                                                            width={20}
                                                            height={20}
                                                            className="rounded-full w-5 h-5"
                                                        />
                                                        <span>{token.symbol}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="number"
                                        value={Math.abs(expiryPayAmount).toFixed(6)}
                                        readOnly
                                        className={`pl-20 pr-2 py-2 rounded-sm h-auto w-full bg-muted border-border shadow-none cursor-not-allowed text-xs text-right ${expiryPayAmount < 0 ? 'text-green-500' : 'text-red-500'}`}
                                    />
                                </div>
                                {expiryPayAmount !== 0 && (
                                    <div className="text-xs text-secondary-foreground">
                                        {expiryPayAmount >= 0 ? "Additional payment required" : "Refund amount"}
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant='outline'
                                    onClick={() => {
                                        setIsExpiry(false);
                                        setNewExpiry(undefined);
                                    }}
                                    disabled={isExpiryLoading}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    onClick={handleExpiryEdit} 
                                    disabled={!newExpiry || isExpiryLoading}
                                >
                                    {isExpiryLoading ? "Processing..." : "Confirm"}
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* Read-only fields */}
            <div className='w-full flex justify-between text-sm text-secondary-foreground font-normal'>
                <div className='flex space-x-2 items-center'>
                    <PurchasePriceIcon />
                    <span>Purchase Price:</span>
                </div>
                <span>${position?.entryPrice || strikePrice}</span>
            </div>
            <div className='w-full flex justify-between text-sm text-secondary-foreground font-normal'>
                <div className='flex space-x-2 items-center'>
                    <ValueIcon />
                    <span>Value:</span>
                </div>
                <span>${value.toFixed(2)}</span>
            </div>
            <div className='w-full flex justify-between text-sm text-[#FF6889] font-normal'>
                <div className='flex space-x-2 items-center'>
                    <RedArrowPnl />
                    <span>P&L:</span>
                </div>
                <span className={`${pnl > 0 ? 'text-green-500' : pnl < 0 ? 'text-red-500' : 'text-foreground'}`}>
                    {pnl > 0 ? '+' : ''}${pnl.toFixed(2)}
                </span>
            </div>
        </div>
    )
}