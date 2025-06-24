'use client'
import Image from "next/image";
import { Badge } from "./ui/badge";
import { useState } from "react";
import { ArrowDown, ArrowUp } from "@/public/svgs/icons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import Collateral from "./Collateral";
import Tpsl from "./Tpsl";
import CloseFutures from "./CloseFutures";
import { usePythPrice } from "@/hooks/usePythPrice";

interface OpenFuturesProps{
    logo: string;
    token: string;
    symbol: string;
    type: string;
    position: string;
    leverage: number;
    entry: number;
    liquidation: number;
    size: number;
    collateral: number;
    tpsl: number;
    purchaseDate: string;
    unrealizedPnl?: number;
    onClose?: () => Promise<void>;
    isClosing?: boolean;
}

export default function OpenFutures({
    logo, 
    token, 
    symbol, 
    type, 
    position, 
    leverage,
    entry,
    liquidation,
    size,
    collateral,
    tpsl,
    purchaseDate,
    unrealizedPnl,
    onClose,
    isClosing = false
} : OpenFuturesProps){
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const { priceData } = usePythPrice("Crypto.SOL/USD");
    
    // Get current market price (mark price)
    const markPrice = priceData?.price || entry;
    
    // Calculate position value
    const positionValue = size * markPrice;
    
    // Calculate PnL if not provided
    const calculatePnl = () => {
        if (unrealizedPnl !== undefined) {
            return unrealizedPnl;
        }
        
        // Fallback calculation
        const priceDiff = position === "long" 
            ? markPrice - entry 
            : entry - markPrice;
        return (priceDiff / entry) * positionValue;
    };
    
    const pnl = calculatePnl();

    return (
        <div className="w-full flex flex-col bg-accent rounded-sm">
            <div 
                className="w-full px-4 py-3 flex justify-between items-center cursor-pointer"
                onClick={()=>setIsOpen(!isOpen)}
            >
                <div className="flex space-x-[6px] items-center">
                    <Image src={logo} alt={token} width={16} height={16} className="w-4 h-4 rounded-full"/>
                    <span className="text-sm text-foreground font-medium">{symbol}</span>
                    <Badge className={`${position === "long" ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'} text-xs font-semibold py-[1px] px-1 w-fit h-fit rounded-[3px] flex items-center justify-center`}>
                        {leverage}x {position.charAt(0).toUpperCase() + position.slice(1).toLowerCase()}
                    </Badge>
                </div>
                <div>
                    
                </div>
                {isOpen ? (
                    <span className='text-secondary-foreground'>
                        <ArrowUp />
                    </span>
                    
                ) : (
                    <span className='text-secondary-foreground'>
                        <ArrowDown />
                    </span>
                )}
            </div>
            {isOpen && (
                <div className="w-full px-4 pt-2 pb-4 space-y-4 border-t-2 border-backgroundSecondary">
                    <Table>
                        <TableHeader>
                            <TableRow className="w-full grid grid-cols-8 whitespace-nowrap h-7">
                                <TableHead className="">Entry Price</TableHead>
                                <TableHead className="">Mark Price</TableHead>
                                <TableHead className="">Size</TableHead>
                                {/* <TableHead className="">Value</TableHead> */}
                                <TableHead className="">Liq. Price</TableHead>
                                <TableHead className="">Levarage</TableHead>
                                <TableHead className="col-span-1">Collateral</TableHead>
                                <TableHead className="">TP/SL</TableHead>
                                <TableHead className="">PNL</TableHead>
                                <TableHead className=""></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow className="w-full grid grid-cols-8">
                                <TableCell className="flex space-x-2 items-center">${entry.toFixed(2)}</TableCell>
                                <TableCell className="flex space-x-2 items-center">${markPrice.toFixed(2)}</TableCell>
                                <TableCell className="flex space-x-2 items-center">${size.toFixed(2)}</TableCell>
                                {/* <TableCell className="flex space-x-2 items-center">${positionValue.toFixed(2)}</TableCell> */}
                                <TableCell className="flex space-x-2 items-center">${liquidation.toFixed(2)}</TableCell>
                                <TableCell className="flex space-x-2 items-center">{leverage}x</TableCell>
                                <TableCell className="flex space-x-1 items-center">
                                    <span>
                                        ${collateral.toFixed(2)} 
                                    </span>
                                    <Collateral />
                                </TableCell>
                                <TableCell className="flex space-x-1 items-center">
                                    <span>
                                        ${tpsl.toFixed(2)} 
                                    </span>
                                    <Tpsl />
                                </TableCell>
                                <TableCell className={`flex space-x-2 items-center ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    ${pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}({((pnl / collateral) * 100).toFixed(2)}%)
                                </TableCell>
                                <TableCell className="flex space-x-2 items-center">
                                    <CloseFutures />
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
}