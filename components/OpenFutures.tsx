'use client'
import Image from "next/image";
import { Badge } from "./ui/badge";
import { useState, useEffect } from "react";
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

interface OpenFuturesProps {
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
    userId,
    positionId,
    contractType = 'perp', // Default to perpetual
    custody,
    poolName
}: OpenFuturesProps) {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [tpslOrders, setTpslOrders] = useState<TpSlOrder[]>([]);
    const [showTpSlOrders, setShowTpSlOrders] = useState<boolean>(false);
    const [backendOrders, setBackendOrders] = useState<TpSlOrderResponse[]>([]);
    const [isLoadingOrders, setIsLoadingOrders] = useState(false);
    const { priceData } = usePythPrice("Crypto.SOL/USD");

    // Get current market price (mark price)
    const markPrice = priceData?.price || entry;

    // Generate position ID if not provided
    const effectivePositionId = positionId || `${symbol}_${leverage}x_${entry}_${Date.now()}`;

    // Generate custody if not provided (you might want to get this from your position data)
    const effectiveCustody = custody || '6fiDYq4uZgQQNUZVaBBcwu9jAUTWWBb7U8nmxt6BCaHY'; // Default custody

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

    // Load existing orders when component mounts or position changes
    useEffect(() => {
        if (userId && effectivePositionId && isOpen) {
            loadExistingOrders();
        }
    }, [userId, effectivePositionId, isOpen]);

    const loadExistingOrders = async () => {
        if (!userId) return;

        setIsLoadingOrders(true);
        try {
            const response = await tpSlApiService.getUserTpSlOrders(userId);
            // Filter orders for this specific position
            const positionOrders = response.orders.filter(order =>
                order.positionId === effectivePositionId ||
                order.positionId.startsWith(`${effectivePositionId}_`)
            );
            setBackendOrders(positionOrders);
        } catch (error: any) {
            console.error('Error loading existing orders:', error);
            // Don't show error toast on load - just log it
        } finally {
            setIsLoadingOrders(false);
        }
    };

    // Handler for creating new TP/SL orders (local state - fallback)
    const handleCreateTpSlOrder = (orderData: TpSlFormData) => {
        const newOrder: TpSlOrder = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            type: orderData.type,
            price: orderData.price,
            token: orderData.token,
            percentage: orderData.percentage,
            isPartial: orderData.isPartial
        };

        setTpslOrders(prevOrders => [...prevOrders, newOrder]);
    };

    // Handler for canceling TP/SL orders (local state - fallback)
    const handleCancelTpSlOrder = (orderId: string) => {
        setTpslOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
    };

    // Handler for updating TP/SL order prices (local state - fallback)
    const handleUpdateTpSlPrice = (orderId: string, newPrice: number) => {
        setTpslOrders(prevOrders =>
            prevOrders.map(order =>
                order.id === orderId
                    ? { ...order, price: newPrice }
                    : order
            )
        );
    };

    // Callback when orders are created/updated via backend
    const handleOrdersUpdated = () => {
        loadExistingOrders();
    };

    // Calculate total TP/SL display value (for the table)
    const calculateTpSlDisplayValue = () => {
        // Prioritize backend orders if available
        if (userId && backendOrders.length > 0) {
            const activePrices: number[] = [];
            
            backendOrders.forEach(order => {
                if (order.takeProfit?.enabled) {
                    activePrices.push(order.takeProfit.price);
                }
                if (order.stopLoss?.enabled) {
                    activePrices.push(order.stopLoss.price);
                }
            });

            if (activePrices.length > 0) {
                return activePrices.reduce((sum, price) => sum + price, 0) / activePrices.length;
            }
        }

        // Fallback to local orders
        if (tpslOrders.length === 0) return tpsl;

        const activePrices = tpslOrders.map(order => order.price);
        return activePrices.length > 0
            ? activePrices.reduce((sum, price) => sum + price, 0) / activePrices.length
            : tpsl;
    };

    const handleToggleTpSlOrders = () => {
        setShowTpSlOrders(!showTpSlOrders);

        // Load orders when opening the view
        if (!showTpSlOrders && userId) {
            loadExistingOrders();
        }
    };

    // Determine if we have any orders (backend or local)
    const hasOrders = (userId && backendOrders.length > 0) || tpslOrders.length > 0;
    
    // Count total active orders
    const getTotalOrderCount = () => {
        if (userId && backendOrders.length > 0) {
            let count = 0;
            backendOrders.forEach(order => {
                if (order.takeProfit?.enabled) count++;
                if (order.stopLoss?.enabled) count++;
            });
            return count;
        }
        return tpslOrders.length;
    };

    const totalOrderCount = getTotalOrderCount();

    return (
        <div className="w-full flex flex-col bg-accent rounded-sm">
            <div
                className="w-full px-4 py-3 flex justify-between items-center cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex space-x-[6px] items-center">
                    <Image src={logo} alt={token} width={16} height={16} className="w-4 h-4 rounded-full" />
                    <span className="text-sm text-foreground font-medium">{symbol}</span>
                    <Badge className={`${position === "long" ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'} text-xs font-semibold py-[1px] px-1 w-fit h-fit rounded-[3px] flex items-center justify-center`}>
                        {leverage}x {position.charAt(0).toUpperCase() + position.slice(1).toLowerCase()}
                    </Badge>
                    {/* Show backend integration status */}
                    {userId && (
                        <Badge className="bg-blue-500/10 text-blue-400 text-xs font-semibold py-[1px] px-1 w-fit h-fit rounded-[3px] flex items-center justify-center">
                            Live TP/SL
                        </Badge>
                    )}
                    {/* Show backend position type */}
                    {userId && contractType && (
                        <Badge className="bg-purple-500/10 text-purple-400 text-xs font-semibold py-[1px] px-1 w-fit h-fit rounded-[3px] flex items-center justify-center">
                            {contractType.toUpperCase()}
                        </Badge>
                    )}
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
                <div className="w-full px-4 pt-2 pb-4 space-y-4 border-t-2 border-backgroundSecondary overflow-hidden">
                    <div className="overflow-x-auto scrollbar-hide">
                        <Table>
                            <TableHeader>
                                <TableRow className="w-full grid grid-cols-10 whitespace-nowrap h-7 min-w-[900px]">
                                    <TableHead className="text-xs">Entry Price</TableHead>
                                    <TableHead className="text-xs">Mark Price</TableHead>
                                    <TableHead className="text-xs">Size</TableHead>
                                    <TableHead className="text-xs">Liq. Price</TableHead>
                                    <TableHead className="text-xs">Leverage</TableHead>
                                    <TableHead className="text-xs">Collateral</TableHead>
                                    <TableHead className="text-xs col-span-2">TP/SL</TableHead>
                                    <TableHead className="text-xs">PNL</TableHead>
                                    <TableHead className="text-xs"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow className="w-full grid grid-cols-10 min-w-[900px]">
                                    <TableCell className="flex space-x-2 items-center text-xs">${entry.toFixed(2)}</TableCell>
                                    <TableCell className="flex space-x-2 items-center text-xs">${markPrice.toFixed(2)}</TableCell>
                                    <TableCell className="flex space-x-2 items-center text-xs">${size.toFixed(2)}</TableCell>
                                    <TableCell className="flex space-x-2 items-center text-xs">${liquidation.toFixed(2)}</TableCell>
                                    <TableCell className="flex space-x-2 items-center text-xs">{leverage}x</TableCell>
                                    <TableCell className="flex space-x-1 items-center text-xs">
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
                                    <TableCell className="flex space-x-1 items-center text-xs col-span-2">
                                        {hasOrders ? (
                                            <div className="flex items-center space-x-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-2 text-xs text-primary hover:text-primary/80 hover:bg-backgroundSecondary"
                                                    onClick={handleToggleTpSlOrders}
                                                    disabled={isLoadingOrders}
                                                >
                                                    View All ({totalOrderCount})
                                                    <ChevronDown size={12} className="ml-1" />
                                                </Button>
                                                <Tpsl
                                                    onCreateOrder={handleCreateTpSlOrder}
                                                    userId={userId}
                                                    positionId={effectivePositionId}
                                                    positionType={position}
                                                    positionDirection={position}
                                                    contractType={contractType}
                                                    currentPrice={markPrice}
                                                    custody={effectiveCustody}
                                                    poolName={poolName}
                                                    onOrderCreated={handleOrdersUpdated}
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-center space-x-1">
                                                <span>
                                                    N/A
                                                </span>
                                                <Tpsl
                                                    onCreateOrder={handleCreateTpSlOrder}
                                                    userId={userId}
                                                    positionId={effectivePositionId}
                                                    positionType={position}
                                                    positionDirection={position}
                                                    contractType={contractType}
                                                    currentPrice={markPrice}
                                                    custody={effectiveCustody}
                                                    poolName={poolName}
                                                    onOrderCreated={handleOrdersUpdated}
                                                />
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className={`flex space-x-2 items-center text-xs ml-[-30px] ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        ${pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}({((pnl / collateral) * 100).toFixed(2)}%)
                                    </TableCell>
                                    <TableCell className="flex space-x-2 items-right text-xs">
                                        <CloseFutures
                                            size={size}
                                            markPrice={markPrice}
                                            entryPrice={entry}
                                            collateral={collateral}
                                            position={position}
                                            onClose={(closePercent, receiveToken, exitPrice) => {
                                                // Handle the close operation
                                                onClose(closePercent, receiveToken, exitPrice)
                                            }}
                                        />
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>

                    {/* TP/SL Orders Section - Below table to expand container height */}
                    {hasOrders && showTpSlOrders && (
                        <SettledTpSls
                            orders={tpslOrders} // Fallback local orders
                            onCancel={handleCancelTpSlOrder}
                            onUpdatePrice={handleUpdateTpSlPrice}
                            isVisible={showTpSlOrders}
                            onToggleVisibility={handleToggleTpSlOrders}
                            userId={userId}
                            positionId={effectivePositionId}
                            positionType={position}
                            contractType={contractType}
                            currentPrice={markPrice}
                            onOrdersUpdated={handleOrdersUpdated}
                        />
                    )}
                </div>
            )}
        </div>
    )
}