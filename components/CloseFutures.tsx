import { useState } from "react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "./ui/select";
import Image from "next/image";
import { tokenList } from "@/lib/data/tokenlist";
import { ChevronDown } from "lucide-react";

interface CloseFuturesProps {
    size: number;
    markPrice: number;
    entryPrice: number;
    collateral: number;
    position: string;
    onClose?: (closeSize: number, receiveToken: string, exitPrice: number) => void;
}

export default function CloseFutures({ 
    size, 
    markPrice, 
    entryPrice,
    collateral,
    position,
    onClose 
}: CloseFuturesProps) {
    const tokens = tokenList;
    const [selectedToken, setSelectedToken] = useState("SOL");
    const [isOpen, setIsOpen] = useState(false);
    const [closeSize, setCloseSize] = useState<number>(0);

    // Calculate receive amount based on close size and selected token
    const calculateReceiveAmount = () => {
        if (closeSize <= 0) return 0;
        
        // Base calculation: closeSize * markPrice for USD value
        const usdValue = (closeSize * (position == 'long' ? (markPrice - entryPrice) : (entryPrice - markPrice)) / entryPrice * 0.999 - 0.01) + collateral * closeSize / size;
        
        // If selected token is not the base symbol, you might need conversion rates
        // For now, assuming direct conversion (you may need to add token price conversion logic)
        if (selectedToken != 'SOL') {
            return usdValue;
        } else {
            return usdValue / markPrice;
        }
        
        // For other tokens, you'd need their current prices to convert
        // This is a placeholder - implement actual token conversion logic
        return usdValue;
    };

    const receiveAmount = calculateReceiveAmount();

    const handlePercentageClick = (percentage: number) => {
        const newCloseSize = (size * percentage) / 100;
        setCloseSize(Number(newCloseSize));
    };

    const handleCloseSizeChange = (value: string) => {
        const numValue = parseFloat(parseFloat(value).toFixed(3)) || 0;
        if (numValue <= size) {
            setCloseSize(numValue);
        }
    };

    const handleConfirm = () => {
        if (onClose && closeSize > 0) {
            onClose(closeSize / size * 100, selectedToken,  markPrice * (position ==  'long' ? 0.99 : 1.01));
        }
        setIsOpen(false);
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button 
                    variant={'outline'}
                    className={`bg-transparent h-fit p-1 text-xs hover:text-primary hover:border-primary ${isOpen ? 'text-primary border-primary' : 'text-secondary-foreground border-border'}`}
                >
                    Close
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="flex flex-col space-y-2">
                <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between gap-10">
                        <Label className="font-normal">
                            Size
                        </Label>
                        <div className="grid grid-cols-4 gap-2">
                            <Button 
                                variant={'outline'}
                                className="p-1 text-xs h-fit text-secondary-foreground hover:text-foreground"
                                onClick={() => handlePercentageClick(25)}
                            >
                                25%
                            </Button>
                            <Button 
                                variant={'outline'}
                                className="p-1 text-xs h-fit text-secondary-foreground hover:text-foreground"
                                onClick={() => handlePercentageClick(50)}
                            >
                                50%
                            </Button>
                            <Button 
                                variant={'outline'}
                                className="p-1 text-xs h-fit text-secondary-foreground hover:text-foreground"
                                onClick={() => handlePercentageClick(75)}
                            >
                                75%
                            </Button>
                            <Button 
                                variant={'outline'}
                                className="p-1 text-xs h-fit text-secondary-foreground hover:text-foreground"
                                onClick={() => handlePercentageClick(100)}
                            >
                                100%
                            </Button>
                        </div>
                    </div>
                    <div className="relative">
                        <Input
                            type="number"
                            placeholder={'0.00'}
                            value={parseFloat(closeSize.toFixed(3))}
                            onChange={(e) => handleCloseSizeChange(e.target.value)}
                            className="px-2 text-right py-2 rounded-sm h-auto w-full bg-transparent border-border shadow-none"
                            step="0.1"
                            min="0"
                            max={size}
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-secondary-foreground">
                            Max: {size.toFixed(3)}
                        </span>
                    </div>
                </div>
                <div className="flex flex-col space-y-2">
                    <Label className="font-normal">
                        Receive In
                    </Label>
                    <div className="relative w-full">
                        <Select defaultValue="SOL" onValueChange={(value) => setSelectedToken(value)}>
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
                                <ChevronDown size={14} className="text-secondary-foreground"/>
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
                            value={receiveAmount.toFixed(3)}
                            readOnly
                            className="px-2 text-right py-2 rounded-sm h-auto w-full bg-muted border-border shadow-none cursor-not-allowed"
                        />
                    </div>     
                </div>
                <div className="w-full flex justify-between text-sm">
                    <span>
                        Size
                    </span>
                    <span>
                        {size.toFixed(2)} -&gt; {(size - closeSize).toFixed(2)}
                    </span>
                </div>
                <div className="w-full flex justify-between text-sm">
                    <span>
                        Collateral
                    </span>
                    <span>
                        {collateral.toFixed(2)} -&gt; {(collateral * Math.max(size - closeSize, 0) / size).toFixed(2)}
                    </span>
                </div>
                <div className="w-full flex justify-between text-sm">
                    <span>
                        Close Fee (0.1%)
                    </span>
                    <span>
                        ${(closeSize * 0.001).toFixed(2)} {/* 0.1% fee example */}
                    </span>
                </div>
                <div className="w-full flex justify-between text-sm">
                    <span>
                        Transaction Fee
                    </span>
                    <span>
                        $0.01 {/* Example fixed fee */}
                    </span>
                </div>
                <div className="w-full flex justify-between text-sm gap-2">
                    <Button
                        variant={'outline'}
                        className="w-full"
                        onClick={() => setIsOpen(false)}
                    >
                        Dismiss
                    </Button>
                    <Button 
                        className="w-full bg-primary/70 hover:bg-primary text-black disabled:cursor-not-allowed"
                        onClick={handleConfirm}
                        disabled={closeSize <= 0 || closeSize > size}
                    >
                        Confirm Close
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}