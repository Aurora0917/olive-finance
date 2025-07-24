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
import { ChevronDown, Activity, Clock } from "lucide-react";
import { Switch } from './ui/switch'
import apiService from "@/services/apiService";
import { EXIT_FEE } from "@/utils/const";
import { BackendTpSlOrder } from "../types/trading";

interface OpenFuturesProps {
    logo: string;
    token: string;
    symbol: string;
    type: string;
    position: 'long' | 'short';
    leverage: number;
    entry: number;
    liquidation: number;
    size: number;
    collateral: number;
    tpsl: number;
    purchaseDate: string;
    unrealizedPnl?: number;
    onCollateral: (amount: number, isSol: boolean, isDeposit: boolean) => Promise<void>;
    onClose: (percent: number, receiveToken: string) => Promise<void>;
    isClosing?: boolean;
    // Onchain integration props
    positionIndex?: number;
    poolName?: string;
    // Backend integration props
    userId?: string;
    positionId?: string;
    contractType?: 'perp' | 'option';
    custody?: string;
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
    onCollateral,
    onClose,
    isClosing = false,
    positionIndex,
    poolName,
    userId,
    positionId,
    contractType = 'perp',
    custody
}: OpenFuturesProps) {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [showTpSlOrders, setShowTpSlOrders] = useState<boolean>(false);
    const [backendOrders, setBackendOrders] = useState<BackendTpSlOrder[]>([]);
    const [isLoadingOrders, setIsLoadingOrders] = useState(false);
    const [withFees, setWithFees] = useState(true)
    const { priceData } = usePythPrice("Crypto.SOL/USD");
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update time every second for real-time relative time display
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Get current market price (mark price)
    const markPrice = priceData?.price || entry;

    // Generate position ID if not provided
    const effectivePositionId = positionId || `${symbol}_${leverage}x_${entry}_${Date.now()}`;

    // Generate custody if not provided
    const effectiveCustody = custody || '6fiDYq4uZgQQNUZVaBBcwu9jAUTWWBb7U8nmxt6BCaHY';

    // Calculate PnL
    const calculatePnl = () => {
        const priceDiff = position === "long"
            ? markPrice - entry
            : entry - markPrice;
        return (priceDiff / entry) * size;
    };

    const calculateFee = () => {
        return size * EXIT_FEE;
    }

    const fee = calculateFee();
    const pnl = calculatePnl() - (withFees ? fee : 0);
    const breakEvenPrice = entry + (position === 'long' ? 1 : -1) * fee / (size / entry);

    const netValue = useMemo(() => collateral + calculatePnl() - fee, [collateral, pnl]);
    const currentLeverage = (size / netValue).toFixed(2);

    // Load backend orders when component mounts or position changes
    useEffect(() => {
        if (userId && effectivePositionId && isOpen) {
            loadBackendOrders();
        }
    }, [userId, effectivePositionId, isOpen]);

    const loadBackendOrders = async () => {
        if (!userId) return;

        setIsLoadingOrders(true);
        try {
            const response = await apiService.getTpSlOrders(userId);
            // Filter orders for this specific position that are active and not executed
            const positionOrders = response.orders.filter((order: BackendTpSlOrder) =>
                order.positionId === effectivePositionId && 
                order.isActive && 
                !order.isExecuted
            );
            setBackendOrders(positionOrders);
        } catch (error: any) {
            console.error('Error loading backend orders:', error);
        } finally {
            setIsLoadingOrders(false);
        }
    };

    // Callback when orders are created/updated
    const handleOrdersUpdated = () => {
        loadBackendOrders();
    };

    const handleToggleTpSlOrders = () => {
        setShowTpSlOrders(!showTpSlOrders);

        // Load orders when opening the view
        if (!showTpSlOrders && userId) {
            loadBackendOrders();
        }
    };

    // Count total active orders
    const getTotalOrderCount = () => {
        return backendOrders.length;
    };

    const getTimePeriodFromNow = (date: string) => {
        const openTime = new Date(date);
        const diffMs = currentTime.getTime() - openTime.getTime();
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
            const remainingHours = diffHours % 24;
            return remainingHours > 0 ? `${diffDays}d ${remainingHours}h` : `${diffDays}d`;
        } else if (diffHours > 0) {
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
            const remainingSeconds = diffSeconds % 60;
            return remainingSeconds > 0 ? `${diffMinutes}m ${remainingSeconds}s` : `${diffMinutes}m`;
        } else {
            return `${diffSeconds}s`;
        }
    };

    const totalOrderCount = getTotalOrderCount();
    const hasOrders = backendOrders.length > 0;

    return (
        <div className="w-full flex flex-col bg-accent rounded-lg border border-border/50">
            <div
                className="flex-col md:flex-row w-full px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-accent/80 transition-colors"
            >
                <div className="flex space-x-[6px] items-center h-10">
                    <img src={logo} alt={token} width={40} height={40} className="w-8 h-8 rounded-full" />
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-foreground font-medium">{symbol}</span>
                            <Badge className={`${position === "long"
                                    ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                    : 'bg-red-500/10 text-red-500 border-red-500/20'
                                } text-xs font-semibold py-[1px] px-1 w-fit h-fit rounded-[3px] flex items-center justify-center`}>
                                {leverage}x {position.charAt(0).toUpperCase() + position.slice(1).toLowerCase()}
                            </Badge>
                            {contractType && (
                                <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs font-semibold py-0 px-1 w-fit h-fit rounded-[3px] flex items-center justify-center">
                                    {contractType.toUpperCase()}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-2 mx-auto flex-col">
                    <div className="flex items-center space-x-2 mx-auto">
                        <span className="text-xs text-muted-foreground">PnL</span>
                        <Switch
                            checked={withFees}
                            onCheckedChange={setWithFees}
                            className="data-[state=checked]:bg-green-600 scale-75"
                        />
                        <span className="text-[8px] text-muted-foreground">{withFees ? 'w/ fees' : 'w/o fees'}</span>
                    </div>
                    <div>
                        <span
                            className={`text-sm font-semibold ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}
                        >
                            {pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toFixed(2)} (
                            {((pnl / collateral) * 100).toFixed(2)}%)
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end text-right">
                        <span className="text-xs text-muted-foreground">Net value</span>
                        <span className="font-semibold underline-offset-2 underline" style={{ textDecorationStyle: 'dotted' }}>
                            ${netValue.toFixed(2)}
                        </span>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="p-1 hover:bg-muted"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        {isOpen ? (
                            <ArrowUp />
                        ) : (
                            <ArrowDown />
                        )}
                    </Button>
                </div>
            </div>

            {isOpen && (
                <div className="w-full px-4 pt-2 pb-4 space-y-4 border-t border-border/50 bg-accent/30">
                    <div className="overflow-x-auto scrollbar-hide">
                        <Table>
                            <TableHeader>
                                <TableRow className="w-full grid grid-cols-11 whitespace-nowrap h-7 min-w-[900px] border-b border-border">
                                    <TableHead className="text-[10px] text-muted-foreground">Time Open</TableHead>
                                    <TableHead className="text-[10px] text-muted-foreground">Cur. Lev</TableHead>
                                    <TableHead className="text-[10px] text-muted-foreground">Size</TableHead>
                                    <TableHead className="text-[10px] text-muted-foreground">Collateral</TableHead>
                                    <TableHead className="text-[10px] text-muted-foreground">Entry</TableHead>
                                    <TableHead className="text-[10px] text-muted-foreground">Market</TableHead>
                                    <TableHead className="text-[10px] text-muted-foreground">Liquidation</TableHead>
                                    <TableHead className="text-[10px] text-muted-foreground">Break Even</TableHead>
                                    <TableHead className="text-[10px] text-muted-foreground col-span-2">TP/SL</TableHead>
                                    <TableHead className="text-[10px] text-muted-foreground">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow className="w-full grid grid-cols-11 min-w-[900px] hover:bg-muted/30 transition-colors">
                                    <TableCell className="flex space-x-2 items-center text-xs py-0 text-white">
                                        <Clock size={12} className="text-muted-foreground" />
                                        {getTimePeriodFromNow(purchaseDate)}
                                    </TableCell>
                                    <TableCell className="flex space-x-2 items-center text-xs py-0 text-white">{currentLeverage}x</TableCell>
                                    <TableCell className="flex space-x-2 items-center text-xs py-0 text-white underline-offset-4 underline" style={{ textDecorationStyle: 'dotted' }}>
                                        ${size.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="flex space-x-1 items-center text-xs py-0 text-white underline-offset-4 underline" style={{ textDecorationStyle: 'dotted' }}>
                                        <span>
                                            ${collateral.toFixed(2)}
                                        </span>
                                        <Collateral
                                            currentLeverage={leverage}
                                            currentLiquidationPrice={liquidation}
                                            currentCollateral={collateral}
                                            currentPositionSize={size}
                                            entryPrice={entry}
                                            position={position}
                                            markPrice={markPrice}
                                            unrealizedPnl={unrealizedPnl || 0}
                                            onDeposit={async (amount, token) => {
                                                onCollateral(amount, token === "SOL", true);
                                            }}
                                            onWithdraw={async (amount, token) => {
                                                onCollateral(amount, token === "SOL", false);
                                            }}
                                            isProcessing={false}
                                        />
                                    </TableCell>
                                    <TableCell className="flex space-x-2 items-center text-xs py-0 text-white font-medium">${entry.toFixed(2)}</TableCell>
                                    <TableCell className="flex space-x-2 items-center text-xs py-0">
                                        <span className={`font-medium ${markPrice > entry ? 'text-green-400' : markPrice < entry ? 'text-red-400' : 'text-white'
                                            }`}>
                                            ${markPrice.toFixed(2)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="flex space-x-2 items-center text-xs py-0 text-[#f77f00] font-medium">${liquidation.toFixed(2)}</TableCell>
                                    <TableCell className="flex space-x-2 items-center text-xs py-0 text-[#9333ea] font-medium">${breakEvenPrice.toFixed(2)}</TableCell>
                                    <TableCell className="flex space-x-1 items-center text-xs col-span-2 py-0 text-white">
                                        {hasOrders ? (
                                            <div className="flex items-center space-x-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                                    onClick={handleToggleTpSlOrders}
                                                    disabled={isLoadingOrders}
                                                >
                                                    {isLoadingOrders ? (
                                                        <div className="animate-spin w-3 h-3 border border-blue-400 border-t-transparent rounded-full mr-1" />
                                                    ) : (
                                                        <>View All ({totalOrderCount})</>
                                                    )}
                                                    <ChevronDown size={12} className="ml-1" />
                                                </Button>
                                                <Tpsl
                                                    positionIndex={positionIndex}
                                                    poolName={poolName}
                                                    positionSide={position}
                                                    currentPrice={markPrice}
                                                    onOrderCreated={handleOrdersUpdated}
                                                    userId={userId}
                                                    positionId={effectivePositionId}
                                                    contractType={contractType}
                                                    custody={effectiveCustody}
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-center space-x-1">
                                                <span>
                                                    -
                                                </span>
                                                <Tpsl
                                                    positionIndex={positionIndex}
                                                    poolName={poolName}
                                                    positionSide={position}
                                                    currentPrice={markPrice}
                                                    onOrderCreated={handleOrdersUpdated}
                                                    userId={userId}
                                                    positionId={effectivePositionId}
                                                    contractType={contractType}
                                                    custody={effectiveCustody}
                                                />
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="flex space-x-2 items-center text-xs py-0 text-white">
                                        <CloseFutures
                                            size={size}
                                            markPrice={markPrice}
                                            entryPrice={entry}
                                            collateral={collateral}
                                            position={position}
                                            orderType="market"
                                            onClose={onClose}
                                        />
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>

                    {/* TP/SL Orders Section */}
                    {hasOrders && showTpSlOrders && (
                        <div className="border-t border-border/50 pt-4">
                            <SettledTpSls
                                isVisible={showTpSlOrders}
                                onToggleVisibility={handleToggleTpSlOrders}
                                userId={userId}
                                positionId={effectivePositionId}
                                positionSide={position}
                                contractType={contractType}
                                currentPrice={markPrice}
                                onOrdersUpdated={handleOrdersUpdated}
                                positionIndex={positionIndex}
                                poolName={poolName}
                                backendOrders={backendOrders}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}