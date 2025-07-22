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

        // Calculate derived values
        const totalVolume = openTransaction?.positionSize || 0;
        const entryPrice = openTransaction?.price || 0;
        const exitPrice = closeTransaction?.price || entryPrice;
        const leverage = openTransaction?.leverage || 1;

        // Calculate total collateral (initial + added)
        const initialCollateral = openTransaction?.collateral || 0;
        const addedCollateral = addCollateralTransactions.reduce((sum, t) => sum + (t.addedCollateral || 0), 0);
        const totalCollateral = initialCollateral + addedCollateral;

        // Calculate total fees
        const totalFees = sortedTransactions.reduce((sum, t) => {
            return sum + (t.fees || 0) + (t.exitFees || 0) + (t.borrowFees || 0);
        }, 0);

        // Calculate PnL
        const pnl = closeTransaction?.pnl || 0;

        const isOpen = !closeTransaction;
        const timeOpened = openTransaction?.timestamp || sortedTransactions[0].timestamp;
        const timeClosed = closeTransaction?.timestamp || sortedTransactions[sortedTransactions.length - 1].timestamp;
        const positionId = transactions[0].positionId;

        const isLiquidated = sortedTransactions[sortedTransactions.length - 1].transactionType === 'Liquidation';

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

    if (!positionSummary) {
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

        if (diffDays > 0) {
            const remainingHours = diffHours % 24;
            return remainingHours > 0 ? `${diffDays}d ${remainingHours}h` : `${diffDays}d`;
        } else if (diffHours > 0) {
            const remainingMinutes = diffMinutes % 60;
            return `${diffHours}h ${remainingMinutes}m`;
        } else if (diffMinutes > 0) {
            return `${diffMinutes}m`;
        } else {
            return `${diffSeconds}s`;
        }
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
                        {displayPnl >= 0 ? '+' : ''}${(Math.abs(displayPnl) / 1000000).toFixed(2)} ({(pnlPercentage / 1000000).toFixed(2)}%)
                    </span>
                </div>

                {/* Mobile Stats Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-2">
                        <div>
                            <span className="text-muted-foreground">Volume:</span>
                            <span className="ml-1 text-foreground font-medium">${positionSummary.totalVolume.toFixed(2)}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Entry:</span>
                            <span className="ml-1 text-foreground font-medium">${positionSummary.entryPrice.toFixed(2)}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Duration:</span>
                            <span className="ml-1 text-foreground font-medium">{getTimePeriod(positionSummary.timeOpened, positionSummary.timeClosed)}</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div>
                            <span className="text-muted-foreground">Exit:</span>
                            <span className="ml-1 text-foreground font-medium">${positionSummary.exitPrice.toFixed(2)}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Fees:</span>
                            <span className="ml-1 text-red-400 font-medium">${(positionSummary.totalFees / 1000000).toFixed(2)}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Collateral:</span>
                            <span className="ml-1 text-foreground font-medium">${positionSummary.totalCollateral.toFixed(2)}</span>
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
                                {displayPnl >= 0 ? '+' : ''}${(Math.abs(displayPnl) / 1000000).toFixed(2)} ({(pnlPercentage / 1000000).toFixed(2)}%)
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

                {/* Tablet Stats */}
                <div className="grid grid-cols-4 gap-4 text-xs">
                    <div>
                        <span className="text-muted-foreground block">Volume</span>
                        <span className="text-foreground font-medium">${positionSummary.totalVolume.toFixed(2)}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground block">Entry → Exit</span>
                        <span className="text-foreground font-medium">${positionSummary.entryPrice.toFixed(2)} → ${positionSummary.exitPrice.toFixed(2)}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground block">Fees</span>
                        <span className="text-red-400 font-medium">${(positionSummary.totalFees / 1000000).toFixed(2)}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground block">Duration</span>
                        <span className="text-foreground font-medium">{getTimePeriod(positionSummary.timeOpened, positionSummary.timeClosed)}</span>
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
                                {displayPnl >= 0 ? '+' : '-'}${Math.abs(displayPnl / 1000000).toFixed(2)} (
                                {(pnlPercentage / 1000000).toFixed(2)}%)
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
                                    <TableCell className="flex space-x-2 items-center text-xs py-0 text-white">
                                        ${positionSummary.totalVolume.toFixed(2)}
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
                                        ${(positionSummary.totalFees / 1000000).toFixed(2)}
                                    </TableCell>
                                    <TableCell className="flex space-x-1 items-center text-xs py-0 text-white underline-offset-2 underline" style={{ textDecorationStyle: 'dotted' }}>
                                        <span>
                                            ${positionSummary.totalCollateral.toFixed(2)}
                                        </span>
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

            {/* Expandable Transaction History */}
            {isExpanded && (
                <div className="w-full px-4 pb-4 border-t border-border/50">
                    <div className="pt-4">
                        <h4 className="text-sm font-medium text-foreground mb-3">Transaction History</h4>
                        <div className="space-y-3">
                            {positionSummary.sortedTransactions
                                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                .map((transaction, index) => (
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
                                                        <div><span className="text-muted-foreground">Leverage:</span> {transaction.leverage}x</div>
                                                        <div><span className="text-muted-foreground">Collateral:</span> ${transaction.collateral?.toFixed(2)}</div>
                                                    </>
                                                )}
                                                {transaction.transactionType === 'close_position' && (
                                                    <>
                                                        <div><span className="text-muted-foreground">Size:</span> ${(transaction.positionSize || 0).toFixed(2)}</div>
                                                        <div><span className="text-muted-foreground">Exit Price:</span> ${transaction.price?.toFixed(2)}</div>
                                                        <div><span className="text-muted-foreground">Closed:</span> {transaction.percent}%</div>
                                                        <div><span className="text-muted-foreground">PnL:</span> <span className={`${(transaction.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>${((transaction.pnl || 0) / 1000000).toFixed(2)}</span></div>
                                                        <div><span className="text-muted-foreground">Exit Fees:</span> ${((transaction.exitFees || 0) / 1000000).toFixed(2)}</div>
                                                        <div><span className="text-muted-foreground">Borrow Fees:</span> ${((transaction.borrowFees || 0) / 1000000).toFixed(2)}</div>
                                                    </>
                                                )}
                                                {transaction.transactionType === 'add_collateral' && (
                                                    <>
                                                        <div><span className="text-muted-foreground">Added:</span> ${(transaction.addedCollateral || 0).toFixed(2)}</div>
                                                        <div><span className="text-muted-foreground">New Total:</span> ${transaction.collateral?.toFixed(2)}</div>
                                                        <div><span className="text-muted-foreground">New Leverage:</span> {transaction.leverage}x</div>
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
                                                {transaction.transactionType === 'open_position' && (
                                                    <>
                                                        <div>Price: ${transaction.price?.toFixed(2)}</div>
                                                        <div>Size: ${(transaction.positionSize || 0).toFixed(2)}</div>
                                                        <div>Leverage: {transaction.leverage}x</div>
                                                        <div>Collateral: ${transaction.collateral?.toFixed(2)}</div>
                                                    </>
                                                )}
                                                {transaction.transactionType === 'close_position' && (
                                                    <>
                                                        <div>Size: ${(transaction.positionSize || 0).toFixed(2)}</div>
                                                        <div>Collateral: ${transaction.collateral?.toFixed(2)}</div>
                                                        <div>Exit Price: ${transaction.price?.toFixed(2)}</div>
                                                        <div>Percentage Closed: {transaction.percent}%</div>
                                                        <div>PnL: <span className={`${(transaction.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>${((transaction.pnl || 0) / 1000000).toFixed(2)}</span></div>
                                                        <div>Exit Fees: ${((transaction.exitFees || 0) / 1000000).toFixed(2)}</div>
                                                        <div>Borrow Fees: ${((transaction.borrowFees || 0) / 1000000).toFixed(2)}</div>
                                                    </>
                                                )}
                                                {transaction.transactionType === 'add_collateral' && (
                                                    <>
                                                        <div>Added: ${(transaction.addedCollateral || 0).toFixed(2)}</div>
                                                        <div>New Total: ${transaction.collateral?.toFixed(2)}</div>
                                                        <div>New Leverage: {transaction.leverage}x</div>
                                                    </>
                                                )}
                                                {transaction.transactionType === 'remove_collateral' && (
                                                    <>
                                                        <div>Removed: ${(transaction.removedCollateral || 0).toFixed(2)}</div>
                                                        <div>New Total: ${transaction.collateral?.toFixed(2)}</div>
                                                        <div>New Leverage: {transaction.leverage}x</div>
                                                    </>
                                                )}
                                                {transaction.transactionType === 'liquidation' && (
                                                    <>
                                                        <div>Size: ${(transaction.positionSize || 0).toFixed(2)}</div>
                                                        <div>Collateral: ${transaction.collateral?.toFixed(2)}</div>
                                                        <div>Exit Price: ${transaction.price?.toFixed(2)}</div>
                                                        <div>PnL: <span className={`${(transaction.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>${((transaction.pnl || 0) / 1000000).toFixed(2)}</span></div>
                                                        <div>Exit Fees: ${((transaction.exitFees || 0) / 1000000).toFixed(2)}</div>
                                                        <div>Borrow Fees: ${((transaction.borrowFees || 0) / 1000000).toFixed(2)}</div>
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