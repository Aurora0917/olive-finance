'use client'
import Image from "next/image";
import { Badge } from "./ui/badge";
import { useState, useEffect, useMemo } from "react";
import { ArrowDown, ArrowUp } from "@/public/svgs/icons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import Collateral from "./Collateral";
import Tpsl from "./Tpsl";
import CloseFutures from "./CloseFutures";
import SettledTpSls from "./SettledTpSls";
import { usePythPrice } from "@/hooks/usePythPrice";
import { Button } from "./ui/button";
import { ChevronDown } from "lucide-react";
import { tpSlApiService, TpSlOrderResponse } from "@/services/tpSlApiService";
import { toast } from "sonner";
import { Switch } from './ui/switch'

interface TpSlOrder {
    id: string;
    type: 'take-profit' | 'stop-loss';
    price: number;
    token: string;
    percentage: number;
    isPartial?: boolean;
}

interface TpSlFormData {
    type: 'take-profit' | 'stop-loss';
    price: number;
    token: string;
    percentage: number;
    isPartial: boolean;
}

interface FuturesOrderHistoryProps {
    logo: string;
    token: string;
    symbol: string;
    type: string;
    position: 'long' | 'short'; // Frontend position direction
    leverage: number;
    entry: number;
    liquidation: number;
    size: number;
    collateral: number;
    tpsl: number;
    purchaseDate: string;
    unrealizedPnl?: number;
    onCollateral: (amount: number, isSol: boolean, isDeposit: boolean) => Promise<void>;
    onClose: (percent: number, receiveToken: string, exitPrice: number) => Promise<void>;
    isClosing?: boolean;
    // Backend integration props
    userId?: string; // User wallet address or identifier
    positionId?: string; // Unique position identifier
    contractType?: 'perp' | 'option';
    custody?: string; // Custody information for backend
    poolName?: string; // Pool name for backend
}

export default function FuturesOrderHistory({
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
    onCollateral,
    onClose,
    isClosing = false,
    userId,
    positionId,
    contractType = 'perp',
    custody,
    poolName
}: FuturesOrderHistoryProps) {
    const [isOpen, setIsOpen] = useState<boolean>(false); // Changed default to false (collapsed)
    const [withFees, setWithFees] = useState(true)
    const { priceData } = usePythPrice("Crypto.SOL/USD");

    // Get current market price (mark price)
    const markPrice = priceData?.price || entry;

    // Calculate PnL if not provided
    const calculatePnl = () => {
        if (unrealizedPnl !== undefined) {
            return unrealizedPnl;
        }

        // Fallback calculation
        const priceDiff = position === "long"
            ? markPrice - entry
            : entry - markPrice;
        return (priceDiff / entry) * size;
    };

    const pnl = calculatePnl();

    // Toggle function for expanding/collapsing
    const toggleExpanded = () => {
        setIsOpen(!isOpen);
    };

    // Format timestamp for display
    const formatTimestamp = (date: string) => {
        return new Date(date).toLocaleString();
    };

    const getTimePeriodFromNow = (date: string) => {
        const openTime = new Date(date);
        const diffMs = (new Date()).getTime() - openTime.getTime();
        
        // Convert to different units
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffDays > 0) {
            // For days, show days and hours
            const remainingHours = diffHours % 24;
            return remainingHours > 0 ? `${diffDays}d ${remainingHours}h` : `${diffDays}d`;
        } else if (diffHours > 0) {
            // For hours under 24, show hours, minutes, and seconds
            const remainingMinutes = diffMinutes % 60;
            const remainingSeconds = diffSeconds % 60;
            if (remainingMinutes > 0 && remainingSeconds > 0) {
                return `${diffHours}h ${remainingMinutes}m ${remainingSeconds}s`;
            } else if (remainingMinutes > 0) {
                return `${diffHours}h ${remainingMinutes}m`;
            } else {
                return `${diffHours}h`;
            }
        } else if (diffMinutes > 0) {
            // For minutes, show minutes and seconds
            const remainingSeconds = diffSeconds % 60;
            return remainingSeconds > 0 ? `${diffMinutes}m ${remainingSeconds}s` : `${diffMinutes}m`;
        } else {
            // For less than a minute, show seconds only
            return `${diffSeconds}s`;
        }
    };

    return (
        <div className="w-full flex flex-col bg-accent rounded-sm">
            {/* Header Section - Always Visible */}
            <div className="flex-col md:flex-row w-full px-4 py-3 flex justify-between items-center">
                <div className="flex space-x-[6px] items-center h-10">
                    <img src={logo} alt={token} width={40} height={40} className="w-8 h-8 rounded-full" />
                    <span className="text-sm text-foreground font-medium">{symbol}</span>
                    <Badge className={`${position === "long" ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'} text-xs font-semibold py-[1px] px-1 w-fit h-fit rounded-[3px] flex items-center justify-center`}>
                        {leverage}x {position.charAt(0).toUpperCase() + position.slice(1).toLowerCase()}
                    </Badge>
                    {/* Show backend position type */}
                    {userId && contractType && (
                        <Badge className="bg-purple-500/10 text-purple-400 text-xs font-semibold py-[1px] px-1 w-fit h-fit rounded-[3px] flex items-center justify-center">
                            {contractType.toUpperCase()}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center space-x-2 mx-auto flex-col">
                    <div className="flex items-center space-x-2 mx-auto">
                        <span className="text-xs text-muted-foreground">PnL</span>
                        <Switch
                            checked={withFees}
                            onCheckedChange={setWithFees}
                            className="data-[state=checked]:bg-green-600"
                        />
                        <span className="text-[8px] text-muted-foreground">{withFees ? 'w/ fees' : 'w/o fees'}</span>
                    </div>
                    <div>
                        <span
                            className={`text-sm font-semibold ${pnl >= 0 ? 'text-green-500' : 'text-red-500'
                                }`}
                        >
                            {pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toFixed(2)} (
                            {((pnl / collateral) * 100).toFixed(2)}%)
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Table Row - Always Visible */}
            <div className="w-full px-4 pb-2">
                <div className="overflow-x-auto scrollbar-hide">
                    <Table className="overflow-hidden">
                        <TableHeader>
                            <TableRow className="w-full grid grid-cols-8 whitespace-nowrap h-7 min-w-[900px] border-t-[2px] !border-b-0 pt-2 pb-0">
                                <TableHead className="text-[10px]">Time Opened</TableHead>
                                <TableHead className="text-[10px]">Volume</TableHead>
                                <TableHead className="text-[10px]">Entry Price</TableHead>
                                <TableHead className="text-[10px]">Exit Price</TableHead>
                                <TableHead className="text-[10px]">Status</TableHead>
                                <TableHead className="text-[10px]">Fees Paid</TableHead>
                                <TableHead className="text-[10px]">Collateral</TableHead>
                                <TableHead className="text-[10px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow className="w-full grid grid-cols-8 min-w-[900px]">
                                <TableCell className="flex space-x-2 items-center text-xs py-0 text-white">
                                    {getTimePeriodFromNow(purchaseDate)}
                                </TableCell>
                                <TableCell className="flex space-x-2 items-center text-xs py-0 text-white">
                                    ${size.toFixed(2)}
                                </TableCell>
                                <TableCell className="flex space-x-2 items-center text-xs py-0 text-white">
                                    ${entry.toFixed(2)}
                                </TableCell>
                                <TableCell className="flex space-x-2 items-center text-xs py-0 text-white">
                                    ${markPrice.toFixed(2)}
                                </TableCell>
                                <TableCell className="flex space-x-2 items-center text-xs py-0 text-[#3a86ff]">
                                    Closed
                                </TableCell>
                                <TableCell className="flex space-x-2 items-center text-xs py-0 text-red-500 underline-offset-2 underline" style={{ textDecorationStyle: 'dotted' }}>
                                    $1.58
                                </TableCell>
                                <TableCell className="flex space-x-1 items-center text-xs py-0 text-white underline-offset-2 underline" style={{ textDecorationStyle: 'dotted' }}>
                                    <span>
                                        ${collateral.toFixed(2)}
                                    </span>
                                </TableCell>
                                <TableCell className="flex space-x-2 items-end justify-end">
                                    <button
                                        onClick={toggleExpanded}
                                        className="text-secondary-foreground hover:text-foreground transition-colors cursor-pointer"
                                    >
                                        {isOpen ? <ArrowUp /> : <ArrowDown />}
                                    </button>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Expandable Content - Only visible when isOpen is true */}
            {isOpen && (
                <div className="w-full px-4 pb-4 space-y-4">
                    {/* Detailed Position Information */}
                    <div className="space-y-2 pt-4">
                        {/* Action Sections */}
                        <div className="space-y-3 pt-4">
                            {/* Close Position */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-blue-400 cursor-pointer hover:underline">
                                        Close Position 🔗
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {formatTimestamp(purchaseDate)}
                                    </span>
                                </div>
                                {/* You can add CloseFutures component here */}
                                {/* <CloseFutures 
                                    position={position}
                                    onClose={onClose}
                                    isClosing={isClosing}
                                /> */}
                            </div>

                            {/* Add Collateral */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-blue-400 cursor-pointer hover:underline">
                                        Add Collateral 🔗
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {formatTimestamp(purchaseDate)}
                                    </span>
                                </div>
                                {/* You can add Collateral component here */}
                                {/* <Collateral 
                                    onCollateral={onCollateral}
                                    currentCollateral={collateral}
                                /> */}
                            </div>

                            {/* Open Position */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-blue-400 cursor-pointer hover:underline">
                                        Open Position 🔗
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {formatTimestamp(purchaseDate)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}