'use client'
import Image from "next/image";
import { Badge } from "./ui/badge";
import { useState, useEffect, useMemo } from "react";
import { ArrowDown, ArrowUp } from "@/public/svgs/icons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Switch } from './ui/switch';
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Transaction } from "@/services/apiService";

import {
    SizeTooltip,
    NetValueTooltip,
    PositionSizeTooltip,
    FeesTooltip,
    CollateralDetailsTooltip
} from '@/components/TradingTooltips';

interface FuturesOrderHistoryProps {
    transactions: Transaction[]; // All transactions have the same positionId
    logo: string;
    token: string;
    side: string;
    symbol: string;
}

export default function FuturesOrderHistory({
    transactions,
    logo,
    token,
    side,
    symbol,
}: FuturesOrderHistoryProps) {
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const [withFees, setWithFees] = useState<boolean>(true);

    // Calculate position summary from transactions
    const positionSummary = useMemo(() => {
        if (transactions.length === 0) return null;

        // Sort transactions by timestamp
        const sortedTransactions = [...transactions].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        const openTransaction = sortedTransactions.find(t => t.transactionType === 'open_position');
        const closeTransaction = sortedTransactions.find(t => t.transactionType === 'close_position');
        const addCollateralTransactions = sortedTransactions.filter(t => t.transactionType === 'add_collateral');

        // Calculate total volume (sum of all position movements - entry + partial closes + final close)
        const openPositionVolume = sortedTransactions
            .filter(t => t.transactionType === 'open_position')
            .reduce((sum, t) => sum + (t.positionSize || 0), 0);
        const closePositionVolume = sortedTransactions
            .filter(t => t.transactionType === 'close_position' || t.transactionType === 'liquidation')
            .reduce((sum, t) => sum + (t.positionSize || 0), 0);
        const totalVolume = openPositionVolume + closePositionVolume;

        const entryPrice = openTransaction?.price || 0;
        const exitPrice = closeTransaction?.price || entryPrice;
        const leverage = openTransaction?.leverage || 1;

        // Calculate total collateral (initial + net added/removed)
        const initialCollateral = openTransaction?.collateral || 0;
        const netAddedCollateral = addCollateralTransactions.reduce((sum, t) => sum + (t.addedCollateral || 0), 0) -
                                 sortedTransactions.filter(t => t.transactionType === 'remove_collateral')
                                                  .reduce((sum, t) => sum + (t.removedCollateral || 0), 0);
        const totalCollateral = initialCollateral + netAddedCollateral;

        // Calculate total fees
        const totalFees = sortedTransactions.reduce((sum, t) => {
            return sum + (t.fees || 0) + (t.tradeFees || 0) + (t.borrowFees || 0);
        }, 0);

        // Calculate PnL
        const pnl = sortedTransactions.reduce((sum, t) => {
            return sum + (t.pnl || 0);
        }, 0);

        const isOpen = !closeTransaction;
        const timeOpened = openTransaction?.timestamp || sortedTransactions[0].timestamp;
        const timeClosed = closeTransaction?.timestamp || sortedTransactions[sortedTransactions.length - 1].timestamp;
        const positionId = transactions[0].positionId;

        const isLiquidated = sortedTransactions[sortedTransactions.length - 1].transactionType === 'liquidation';

        return {
            positionId,
            token,
            isOpen,
            totalVolume,
            entryPrice,
            exitPrice,
            totalCollateral,
            totalFees,
            leverage,
            pnl,
            status: isLiquidated ? 'Liquidated' : 'Closed',
            timeOpened,
            timeClosed,
            isLiquidated,
            positionDirection: side,
            sortedTransactions
        };
    }, [transactions]);

    // Calculate tooltip data
    const tooltipData = useMemo(() => {
        if (!positionSummary) return null;

        const sortedTransactions = positionSummary.sortedTransactions;
        
        // Categorize transactions properly
        const entryTransactions = sortedTransactions.filter(t => t.transactionType === 'open_position');
        const addCollateralTransactions = sortedTransactions.filter(t => t.transactionType === 'add_collateral');
        const removeCollateralTransactions = sortedTransactions.filter(t => t.transactionType === 'remove_collateral');
        
        // Differentiate between partial closes (decrease) and final closes
        const partialCloseTransactions = sortedTransactions.filter(t => 
            (t.transactionType === 'close_position') && (t.percent && t.percent < 100)
        );
        const finalCloseTransactions = sortedTransactions.filter(t => 
            (t.transactionType === 'close_position' && (!t.percent || t.percent === 100)) || 
            t.transactionType === 'liquidation'
        );

        const positionSizeData = {
            entrySize: `${entryTransactions.reduce((sum, t) => sum + (t.positionSize || 0), 0).toFixed(2)}`,
            increaseSize: `${addCollateralTransactions.reduce((sum, t) => sum + (t.positionSize || 0), 0).toFixed(2)}`,
            decreaseSize: `${partialCloseTransactions.reduce((sum, t) => sum + (t.positionSize || 0), 0).toFixed(2)}`,
            closeSize: `${finalCloseTransactions.reduce((sum, t) => sum + (t.positionSize || 0), 0).toFixed(2)}`
        };

        // Fees Data - separate partial close fees from final close fees
        const feesData = {
            entryFee: `${entryTransactions.reduce((sum, t) => sum + (t.fees || 0) + (t.tradeFees || 0), 0).toFixed(2)}`,
            decreaseBorrowFee: `${partialCloseTransactions.reduce((sum, t) => sum + (t.borrowFees || 0), 0).toFixed(6)}`,
            decreaseExitFee: `${partialCloseTransactions.reduce((sum, t) => sum + (t.tradeFees || 0), 0).toFixed(2)}`,
            closeBorrowFee: `${finalCloseTransactions.reduce((sum, t) => sum + (t.borrowFees || 0), 0).toFixed(6)}`,
            closeExitFee: `${finalCloseTransactions.reduce((sum, t) => sum + (t.tradeFees || 0), 0).toFixed(2)}`
        };

        // Collateral Details Data
        const entryCollateral = entryTransactions.reduce((sum, t) => sum + (t.collateral || 0), 0);
        const addedCollateral = addCollateralTransactions.reduce((sum, t) => sum + (t.addedCollateral || 0), 0);
        const removedCollateral = removeCollateralTransactions.reduce((sum, t) => sum + (t.removedCollateral || 0), 0);
        const partialCloseCollateral = partialCloseTransactions.reduce((sum, t) => sum + (t.collateral || 0), 0);
        const finalCloseCollateral = finalCloseTransactions.reduce((sum, t) => sum + (t.collateral || 0), 0);
        
        const entryNativeCollateral = entryTransactions.reduce((sum, t) => sum + (t.nativeCollateral || 0), 0);
        const addedNativeCollateral = addCollateralTransactions.reduce((sum, t) => sum + (t.nativeCollateral || 0), 0);
        const removedNativeCollateral = removeCollateralTransactions.reduce((sum, t) => sum + (t.nativeCollateral || 0), 0);
        const partialCloseNativeCollateral = partialCloseTransactions.reduce((sum, t) => sum + (t.nativeCollateral || 0), 0);
        const finalCloseNativeCollateral = finalCloseTransactions.reduce((sum, t) => sum + (t.nativeCollateral || 0), 0);
        
        // Calculate increase/remove collateral (net of add/remove operations)
        const netAddedCollateral = addedCollateral - removedCollateral;
        const netAddedNativeCollateral = addedNativeCollateral - removedNativeCollateral;
        const totalExitNativeAmount = partialCloseNativeCollateral + finalCloseNativeCollateral;

        const collateralDetailsData = {
            entryCollateral: {
                usd: `${entryCollateral.toFixed(2)}`,
                token: `${entryNativeCollateral.toFixed(2)} ${token}`
            },
            increaseRemoveCollateral: {
                usd: `${Math.abs(netAddedCollateral).toFixed(2)}`,
                token: `${netAddedNativeCollateral >= 0 ? '+' : ''}${netAddedNativeCollateral.toFixed(2)} ${token}`
            },
            decreaseCollateral: {
                usd: `${partialCloseCollateral.toFixed(2)}`,
                token: `${partialCloseNativeCollateral.toFixed(2)} ${token}`
            },
            closeCollateral: {
                usd: `${finalCloseCollateral.toFixed(2)}`,
                token: `${finalCloseNativeCollateral.toFixed(2)} ${token}`
            },
            totalExitAmount: `${totalExitNativeAmount.toFixed(2)} ${token}`
        };

        return {
            positionSizeData,
            feesData,
            collateralDetailsData
        };
    }, [positionSummary, token]);

    // All transactions sorted by timestamp (newest first)
    const sortedTransactions = useMemo(() => {
        if (!positionSummary) return [];

        return positionSummary.sortedTransactions
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [positionSummary]);

    if (!positionSummary || !tooltipData) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                No transaction data available
            </div>
        );
    }

    // Calculate PnL with or without fees
    const displayPnl = withFees
        ? positionSummary.pnl - positionSummary.totalFees
        : positionSummary.pnl;

    const pnlPercentage = positionSummary.totalCollateral > 0
        ? (displayPnl / positionSummary.totalCollateral) * 100
        : 0;

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    const getTimePeriod = (startDate: Date, endDate: Date): string => {
        const diffMs = (new Date(endDate).getTime() - new Date(startDate).getTime());

        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        const remainingHours = diffHours % 24;
        const remainingMinutes = diffMinutes % 60;
        const remainingSeconds = diffSeconds % 60;

        const parts: string[] = [];

        if (diffDays > 0) parts.push(`${diffDays}d`);
        if (remainingHours > 0) parts.push(`${remainingHours}h`);
        if (remainingMinutes > 0) parts.push(`${remainingMinutes}m`);
        if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);

        return parts.join(' ');
    };

    const formatTimestamp = (date: string): string => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatMobileTimestamp = (date: string): string => {
        const d = new Date(date);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays === 0) {
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays}d ago`;
        } else {
            return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };

    const getTransactionTypeLabel = (type: string): string => {
        switch (type) {
            case 'limit_order':
                return 'Limit Order';
            case 'open_position':
                return 'Open Position';
            case 'close_position':
                return 'Close Position';
            case 'add_collateral':
                return 'Add Collateral';
            case 'remove_collateral':
                return 'Remove Collateral';
            case 'liquidation':
                return 'Liquidated';
            default:
                return type;
        }
    };

    const getSolscanUrl = (signature: string): string => {
        return `https://solscan.io/tx/${signature}?cluster=devnet`;
    };

    return (
        <div className="w-full flex flex-col bg-accent rounded-lg border border-border/50">
            {/* Mobile Header (xs to sm) */}
            <div className="block sm:hidden w-full p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                        <img src={logo} alt={token} width={32} height={32} className="w-8 h-8 rounded-full" />
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">{symbol}</span>
                            <div className="flex items-center space-x-1">
                                <Badge className={`${positionSummary.positionDirection === "long" ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'} text-xs font-semibold py-0.5 px-1.5 rounded-sm`}>
                                    {positionSummary.leverage}x {positionSummary.positionDirection.charAt(0).toUpperCase() + positionSummary.positionDirection.slice(1)}
                                </Badge>
                                <Badge className={`${positionSummary.isLiquidated ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'} text-xs font-medium py-0.5 px-1.5 rounded-sm`}>
                                    {positionSummary.status} {positionSummary.status === 'Liquidated' && '⚡'}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleExpanded}
                        className="h-8 w-8 p-0 text-secondary-foreground"
                    >
                        {isExpanded ? <ArrowUp /> : <ArrowDown />}
                    </Button>
                </div>

                {/* PnL Section */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                        <span className="text-xs text-muted-foreground">PnL</span>
                        <Switch
                            checked={withFees}
                            onCheckedChange={setWithFees}
                            className="data-[state=checked]:bg-green-600 scale-75"
                        />
                        <span className="text-[10px] text-muted-foreground">{withFees ? 'w/ fees' : 'w/o fees'}</span>
                    </div>
                    <span className={`text-sm font-semibold ${displayPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {displayPnl >= 0 ? '+' : ''}${(Math.abs(displayPnl)).toFixed(2)} ({(pnlPercentage).toFixed(2)}%)
                    </span>
                </div>

                {/* Enhanced Mobile Stats Grid - Now includes all desktop information */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-2">
                        <div>
                            <span className="text-muted-foreground">Volume:</span>
                            <PositionSizeTooltip data={tooltipData.positionSizeData}>
                                <span className="ml-1 text-foreground font-medium cursor-help underline decoration-dotted">
                                    ${positionSummary.totalVolume.toFixed(2)}
                                </span>
                            </PositionSizeTooltip>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Entry:</span>
                            <span className="ml-1 text-foreground font-medium">${positionSummary.entryPrice.toFixed(2)}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Exit:</span>
                            <span className="ml-1 text-foreground font-medium">${positionSummary.exitPrice.toFixed(2)}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Duration:</span>
                            <span className="ml-1 text-foreground font-medium">{getTimePeriod(positionSummary.timeOpened, positionSummary.timeClosed)}</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div>
                            <span className="text-muted-foreground">Collateral:</span>
                            <CollateralDetailsTooltip data={tooltipData.collateralDetailsData}>
                                <span className="ml-1 text-foreground font-medium cursor-help underline decoration-dotted">
                                    ${positionSummary.totalCollateral.toFixed(2)}
                                </span>
                            </CollateralDetailsTooltip>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Fees:</span>
                            <FeesTooltip data={tooltipData.feesData}>
                                <span className="ml-1 text-red-400 font-medium cursor-help underline decoration-dotted">
                                    ${(positionSummary.totalFees).toFixed(2)}
                                </span>
                            </FeesTooltip>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Status:</span>
                            <span className={`ml-1 font-medium ${positionSummary.isLiquidated ? 'text-red-400' : 'text-green-400'}`}>
                                {positionSummary.status}
                            </span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Transactions:</span>
                            <span className="ml-1 text-foreground font-medium">{positionSummary.sortedTransactions.length}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-3 text-xs text-muted-foreground">
                    {formatMobileTimestamp(positionSummary.timeOpened.toString())}
                </div>
            </div>

            {/* Tablet Header (sm to lg) */}
            <div className="hidden sm:block lg:hidden w-full p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <img src={logo} alt={token} width={36} height={36} className="w-9 h-9 rounded-full" />
                        <div className="flex flex-col">
                            <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-foreground">{symbol}</span>
                                <Badge className={`${positionSummary.positionDirection === "long" ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'} text-xs font-semibold py-1 px-2 rounded-md`}>
                                    {positionSummary.leverage}x {positionSummary.positionDirection.charAt(0).toUpperCase() + positionSummary.positionDirection.slice(1)}
                                </Badge>
                                <Badge className={`${positionSummary.isLiquidated ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'} text-xs font-medium py-1 px-2 rounded-md`}>
                                    {positionSummary.status} {positionSummary.status === 'Liquidated' && '⚡'}
                                </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">{formatTimestamp(positionSummary.timeOpened.toString())}</span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="flex flex-col items-center">
                            <div className="flex items-center space-x-2 mb-1">
                                <span className="text-xs text-muted-foreground">PnL</span>
                                <Switch
                                    checked={withFees}
                                    onCheckedChange={setWithFees}
                                    className="data-[state=checked]:bg-green-600 scale-75"
                                />
                                <span className="text-[10px] text-muted-foreground">{withFees ? 'w/ fees' : 'w/o fees'}</span>
                            </div>
                            <span className={`text-sm font-semibold ${displayPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {displayPnl >= 0 ? '+' : ''}${(Math.abs(displayPnl)).toFixed(2)} ({(pnlPercentage).toFixed(2)}%)
                            </span>
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleExpanded}
                            className="h-8 w-8 p-0 text-secondary-foreground"
                        >
                            {isExpanded ? <ArrowUp /> : <ArrowDown />}
                        </Button>
                    </div>
                </div>

                {/* Enhanced Tablet Stats - Now includes tooltips */}
                <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                        <span className="text-muted-foreground block">Volume</span>
                        <PositionSizeTooltip data={tooltipData.positionSizeData}>
                            <span className="text-foreground font-medium cursor-help underline decoration-dotted">
                                ${positionSummary.totalVolume.toFixed(2)}
                            </span>
                        </PositionSizeTooltip>
                    </div>
                    <div>
                        <span className="text-muted-foreground block">Entry → Exit</span>
                        <span className="text-foreground font-medium">${positionSummary.entryPrice.toFixed(2)} → ${positionSummary.exitPrice.toFixed(2)}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground block">Collateral</span>
                        <CollateralDetailsTooltip data={tooltipData.collateralDetailsData}>
                            <span className="text-foreground font-medium cursor-help underline decoration-dotted">
                                ${positionSummary.totalCollateral.toFixed(2)}
                            </span>
                        </CollateralDetailsTooltip>
                    </div>
                    <div>
                        <span className="text-muted-foreground block">Fees</span>
                        <FeesTooltip data={tooltipData.feesData}>
                            <span className="text-red-400 font-medium cursor-help underline decoration-dotted">
                                ${(positionSummary.totalFees).toFixed(2)}
                            </span>
                        </FeesTooltip>
                    </div>
                    <div>
                        <span className="text-muted-foreground block">Duration</span>
                        <span className="text-foreground font-medium">{getTimePeriod(positionSummary.timeOpened, positionSummary.timeClosed)}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground block">Transactions</span>
                        <span className="text-foreground font-medium">{positionSummary.sortedTransactions.length}</span>
                    </div>
                </div>
            </div>

            {/* Desktop Header (lg+) */}
            <div className="hidden lg:block w-full">
                <div className="flex-col md:flex-row w-full px-4 py-3 flex justify-between items-center">
                    <div className="flex space-x-[6px] items-center h-10">
                        <img src={logo} alt={token} width={40} height={40} className="w-8 h-8 rounded-full" />
                        <span className="text-sm text-foreground font-medium">{symbol}</span>
                        <Badge className={`${positionSummary.positionDirection === "long" ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'} text-xs font-semibold py-[1px] px-1 w-fit h-fit rounded-[3px] flex items-center justify-center`}>
                            {positionSummary.leverage}x {positionSummary.positionDirection.charAt(0).toUpperCase() + positionSummary.positionDirection.slice(1)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{formatTimestamp(positionSummary.timeOpened.toString())}</span>
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
                            <span className={`text-sm font-semibold ${displayPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {displayPnl >= 0 ? '+' : '-'}${Math.abs(displayPnl).toFixed(2)} (
                                {(pnlPercentage).toFixed(2)}%)
                            </span>
                        </div>
                    </div>
                </div>

                {/* Desktop Table */}
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
                                        {getTimePeriod(positionSummary.timeOpened, positionSummary.timeClosed)}
                                    </TableCell>
                                    <TableCell className="flex space-x-2 items-center text-xs py-0 text-white underline-offset-2 underline" style={{ textDecorationStyle: 'dotted' }}>
                                        <PositionSizeTooltip data={tooltipData.positionSizeData}>
                                            <p className="cursor-help">
                                                ${positionSummary.totalVolume.toFixed(2)}
                                            </p>
                                        </PositionSizeTooltip>
                                    </TableCell>
                                    <TableCell className="flex space-x-2 items-center text-xs py-0 text-white">
                                        ${positionSummary.entryPrice.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="flex space-x-2 items-center text-xs py-0 text-white">
                                        ${positionSummary.exitPrice.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="flex space-x-2 items-center text-xs py-0 text-[#3a86ff]">
                                        <Badge className={`${positionSummary.isLiquidated ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'} text-xs font-medium py-[1px] px-2 rounded-[3px]`}>
                                            {positionSummary.status} {positionSummary.status === 'Liquidated' && '⚡'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="flex space-x-2 items-center text-xs py-0 text-red-500 underline-offset-2 underline" style={{ textDecorationStyle: 'dotted' }}>
                                        <FeesTooltip data={tooltipData.feesData}>
                                            <span className="cursor-help">
                                                ${(positionSummary.totalFees).toFixed(2)}
                                            </span>
                                        </FeesTooltip>
                                    </TableCell>
                                    <TableCell className="flex space-x-1 items-center text-xs py-0 text-white underline-offset-2 underline" style={{ textDecorationStyle: 'dotted' }}>
                                        <CollateralDetailsTooltip data={tooltipData.collateralDetailsData}>
                                            <span className="cursor-help">
                                                ${positionSummary.totalCollateral.toFixed(2)}
                                            </span>
                                        </CollateralDetailsTooltip>
                                    </TableCell>
                                    <TableCell className="flex space-x-2 items-end justify-end">
                                        <button
                                            onClick={toggleExpanded}
                                            className="text-secondary-foreground hover:text-foreground transition-colors cursor-pointer"
                                        >
                                            {isExpanded ? <ArrowUp /> : <ArrowDown />}
                                        </button>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>

            {/* Expandable Transaction History with Pagination */}
            {isExpanded && (
                <div className="w-full px-4 pb-4 border-t border-border/50">
                    <div className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-foreground">Transaction History</h4>
                            <span className="text-xs text-muted-foreground">
                                {positionSummary.sortedTransactions.length} total transactions
                            </span>
                        </div>

                        <div className="space-y-3">
                            {sortedTransactions.map((transaction, index) => (
                                <div key={index} className="bg-background/50 rounded-lg p-3 border border-border/30">
                                    {/* Mobile Transaction Layout */}
                                    <div className="block sm:hidden">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm font-medium text-foreground">
                                                    {getTransactionTypeLabel(transaction.transactionType)}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 text-blue-400"
                                                    onClick={() => window.open(getSolscanUrl(transaction.signature), '_blank')}
                                                >
                                                    🔗
                                                </Button>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {formatMobileTimestamp(transaction.timestamp.toString())}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            {transaction.transactionType === 'open_position' && (
                                                <>
                                                    <div><span className="text-muted-foreground">Price:</span> ${transaction.price?.toFixed(2)}</div>
                                                    <div><span className="text-muted-foreground">Size:</span> ${(transaction.positionSize || 0).toFixed(2)}</div>
                                                    <div><span className="text-muted-foreground">Native Collateral:</span> {(transaction.nativeCollateral || 0).toFixed(2)}</div>
                                                    <div><span className="text-muted-foreground">Leverage:</span> {transaction.leverage}x</div>
                                                    <div><span className="text-muted-foreground">Collateral:</span> ${transaction.collateral?.toFixed(2)}</div>
                                                </>
                                            )}
                                            {transaction.transactionType === 'close_position' && (
                                                <>
                                                    <div><span className="text-muted-foreground">Size:</span> ${(transaction.positionSize || 0).toFixed(2)}</div>
                                                    <div><span className="text-muted-foreground">Exit Price:</span> ${transaction.price?.toFixed(2)}</div>
                                                    <div><span className="text-muted-foreground">Native Exit Collateral:</span> {(transaction.nativeCollateral || 0).toFixed(2)}</div>
                                                    <div><span className="text-muted-foreground">Closed:</span> {transaction.percent}%</div>
                                                    <div><span className="text-muted-foreground">PnL:</span> <span className={`${(transaction.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>${((transaction.pnl || 0)).toFixed(2)}</span></div>
                                                    <div><span className="text-muted-foreground">Exit Fees:</span> ${((transaction.tradeFees || 0)).toFixed(2)}</div>
                                                    <div><span className="text-muted-foreground">Borrow Fees:</span> ${((transaction.borrowFees || 0)).toFixed(6)}</div>
                                                </>
                                            )}
                                            {transaction.transactionType === 'add_collateral' && (
                                                <>
                                                    <div><span className="text-muted-foreground">Added:</span> ${(transaction.addedCollateral || 0).toFixed(2)}</div>
                                                    <div><span className="text-muted-foreground">Native Collateral:</span> {(transaction.nativeCollateral || 0).toFixed(2)}</div>
                                                    <div><span className="text-muted-foreground">New Total:</span> ${transaction.collateral?.toFixed(2)}</div>
                                                    <div><span className="text-muted-foreground">New Leverage:</span> {transaction.leverage?.toFixed(2)}x</div>
                                                </>
                                            )}
                                            {transaction.transactionType === 'remove_collateral' && (
                                                <>
                                                    <div><span className="text-muted-foreground">Removed:</span> ${(transaction.removedCollateral || 0).toFixed(2)}</div>
                                                    <div><span className="text-muted-foreground">Native Collateral:</span> -{(transaction.nativeCollateral || 0).toFixed(2)}</div>
                                                    <div><span className="text-muted-foreground">New Total:</span> ${transaction.collateral?.toFixed(2)}</div>
                                                    <div><span className="text-muted-foreground">New Leverage:</span> {transaction.leverage?.toFixed(2)}x</div>
                                                </>
                                            )}
                                        </div>

                                        <div className="mt-2 text-[10px] text-gray-500 truncate">
                                            Signature: {transaction.signature.slice(0, 20)}...
                                        </div>
                                    </div>

                                    {/* Desktop Transaction Layout */}
                                    <div className="hidden sm:block">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm font-medium text-foreground">
                                                    {getTransactionTypeLabel(transaction.transactionType)}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 text-blue-400"
                                                    onClick={() => window.open(getSolscanUrl(transaction.signature), '_blank')}
                                                >
                                                    🔗
                                                </Button>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {formatTimestamp(transaction.timestamp.toString())}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                                            {transaction.transactionType === 'limit_order' && (
                                                <>
                                                    <div>Price: ${transaction.price?.toFixed(2)}</div>
                                                    <div>Size: ${(transaction.positionSize || 0).toFixed(2)}</div>
                                                    <div>Native Collateral: {(transaction.nativeCollateral || 0).toFixed(2)}</div>
                                                    <div>Leverage: {transaction.leverage}x</div>
                                                    <div>Collateral: ${transaction.collateral?.toFixed(2)}</div>
                                                </>
                                            )}
                                            {transaction.transactionType === 'open_position' && (
                                                <>
                                                    <div>Price: ${transaction.price?.toFixed(2)}</div>
                                                    <div>Size: ${(transaction.positionSize || 0).toFixed(2)}</div>
                                                    <div>Native Collateral: {(transaction.nativeCollateral || 0).toFixed(2)}</div>
                                                    <div>Leverage: {transaction.leverage}x</div>
                                                    <div>Collateral: ${transaction.collateral?.toFixed(2)}</div>
                                                </>
                                            )}
                                            {transaction.transactionType === 'close_position' && (
                                                <>
                                                    <div>Size: ${(transaction.positionSize || 0).toFixed(2)}</div>
                                                    <div>Collateral: ${transaction.collateral?.toFixed(2)}</div>
                                                    <div>Exit Price: ${transaction.price?.toFixed(2)}</div>
                                                    <div>Native Exit Collateral: {(transaction.nativeCollateral || 0).toFixed(2)}</div>
                                                    <div>Percentage Closed: {transaction.percent}%</div>
                                                    <div>PnL: <span className={`${(transaction.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>${((transaction.pnl || 0)).toFixed(2)}</span></div>
                                                    <div>Triggered Type: <span className={`${transaction.triggeredType === 'tp' ? 'text-green-400' : transaction.triggeredType === 'sl' ? 'text-red-400' : ''}`}>{transaction.triggeredType}</span></div>
                                                    {transaction.settledPrice && <div>Ordered Price: ${transaction.settledPrice?.toFixed(2)}</div>}
                                                    <div>Exit Fees: ${((transaction.tradeFees || 0)).toFixed(2)}</div>
                                                    <div>Borrow Fees: ${((transaction.borrowFees || 0)).toFixed(6)}</div>
                                                </>
                                            )}
                                            {transaction.transactionType === 'add_collateral' && (
                                                <>
                                                    <div>Added: ${(transaction.addedCollateral || 0).toFixed(2)}</div>
                                                    <div>Native Collateral: {(transaction.nativeCollateral || 0).toFixed(2)}</div>
                                                    <div>New Total: ${transaction.collateral?.toFixed(2)}</div>
                                                    <div>New Leverage: {transaction.leverage?.toFixed(2)}x</div>
                                                </>
                                            )}
                                            {transaction.transactionType === 'remove_collateral' && (
                                                <>
                                                    <div>Removed: ${(transaction.removedCollateral || 0).toFixed(2)}</div>
                                                    <div>Native Collateral: -{(transaction.nativeCollateral || 0).toFixed(2)}</div>
                                                    <div>New Total: ${transaction.collateral?.toFixed(2)}</div>
                                                    <div>New Leverage: {transaction.leverage?.toFixed(2)}x</div>
                                                </>
                                            )}
                                            {transaction.transactionType === 'remove_collateral' && (
                                                <>
                                                    <div>Removed: ${(transaction.removedCollateral || 0).toFixed(2)}</div>
                                                    <div>Native Collateral: -{(transaction.nativeCollateral || 0).toFixed(2)}</div>
                                                    <div>New Total: ${transaction.collateral?.toFixed(2)}</div>
                                                    <div>New Leverage: {transaction.leverage?.toFixed(2)}x</div>
                                                </>
                                            )}
                                            {transaction.transactionType === 'liquidation' && (
                                                <>
                                                    <div>Size: ${(transaction.positionSize || 0).toFixed(2)}</div>
                                                    <div>Collateral: ${transaction.collateral?.toFixed(2)}</div>
                                                    <div>Exit Price: ${transaction.price?.toFixed(2)}</div>
                                                    <div>PnL: <span className={`${(transaction.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>${((transaction.pnl || 0)).toFixed(2)}</span></div>
                                                    <div>Exit Fees: ${((transaction.tradeFees || 0)).toFixed(2)}</div>
                                                    <div>Borrow Fees: ${((transaction.borrowFees || 0)).toFixed(6)}</div>
                                                </>
                                            )}
                                        </div>

                                        <div className="mt-2 text-[10px] text-gray-500">
                                            Signature: {transaction.signature.slice(0, 40)}...
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}