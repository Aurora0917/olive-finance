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
    backendPositionType?: 'perp' | 'option'; // Backend position type (perp/option)
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
    backendPositionType = 'perp', // Default to perpetual
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
                    <span className="text-xs text-secondary-foreground font-medium">{type === 'dated' ? purchaseDate : 'PERPS'}</span>
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
                            <TableRow className="w-full grid grid-cols-10 gap-10 whitespace-nowrap h-7">
                                <TableHead className="">Entry Price</TableHead>
                                <TableHead className="">Mark Price</TableHead>
                                <TableHead className="">Size</TableHead>
                                <TableHead className="">Value</TableHead>
                                <TableHead className="">Liq. Price</TableHead>
                                <TableHead className="">Levarage</TableHead>
                                <TableHead className="text-center">
                                    <div className="flex items-center gap-1">
                                        Collateral <Collateral />
                                    </div>
                                </TableHead>
                                <TableHead className="">
                                    <div className="flex items-center gap-1">
                                        TP/SL <Tpsl />
                                    </div>
                                    
                                </TableHead>
                                <TableHead className="">PNL</TableHead>
                                <TableHead className=""></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow className="w-full grid grid-cols-10 gap-10">
                                <TableCell className="flex space-x-2 items-center">{entry}</TableCell>
                                <TableCell className="flex space-x-2 items-center">$107.32</TableCell>
                                <TableCell className="flex space-x-2 items-center">{size}</TableCell>
                                <TableCell className="flex space-x-2 items-center">$107.32</TableCell>
                                <TableCell className="flex space-x-2 items-center">${liquidation}</TableCell>
                                <TableCell className="flex space-x-2 items-center">{leverage}x</TableCell>
                                <TableCell className="flex space-x-1 items-center">
                                    <span>
                                        ${collateral} 
                                    </span>
                                    
                                </TableCell>
                                <TableCell className="flex space-x-1 items-center">
                                    <span>
                                        ${tpsl} 
                                    </span>
                                    
                                </TableCell>
                                <TableCell className="flex space-x-2 items-center">$107.32</TableCell>
                                <TableCell className="flex space-x-2 items-center">
                                    <CloseFutures />
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                    {/* <div className="w-full grid grid-cols-9 py-1.5 text-xs gap-2">
                        <div className="flex flex-col space-y-0 col-span-1">
                            <span className="text-left align-middle font-medium text-secondary-foreground">
                                Entry Price
                            </span>
                            <span className="flex space-x-2 items-center">
                                {entry}
                            </span>
                        </div>
                        <div className="flex flex-col space-y-0 col-span-1">
                            <span className="text-left align-middle font-medium text-secondary-foreground">
                                Mark Price
                            </span>
                            <span className="flex space-x-2 items-center">
                                {entry}
                            </span>
                        </div>
                        <div className="flex flex-col space-y-0 col-span-1">
                            <span className="text-left align-middle font-medium text-secondary-foreground">
                                Size
                            </span>
                            <span className="flex space-x-2 items-center">
                                {size}
                            </span>
                        </div>
                        <div className="flex flex-col space-y-0 col-span-1">
                            <span className="text-left align-middle font-medium text-secondary-foreground">
                                Value
                            </span>
                            <span className="flex space-x-2 items-center">
                                {entry}
                            </span>
                        </div>
                        <div className="flex flex-col space-y-0 col-span-1">
                            <span className="text-left align-middle font-medium text-secondary-foreground">
                                Liq. Price
                            </span>
                            <span className="flex space-x-2 items-center">
                                {liquidation}
                            </span>
                        </div>
                        <div className="flex flex-col space-y-0 col-span-1">
                            <span className="text-left align-middle font-medium text-secondary-foreground">
                                Leverage
                            </span>
                            <span className="flex space-x-2 items-center">
                                {leverage}x
                            </span>
                        </div>
                        <div className="flex flex-col space-y-0 col-span-1">
                            <span className="text-left align-middle font-medium text-secondary-foreground">
                                Collateral
                            </span>
                            <span className="flex space-x-2 items-center">
                                <span>
                                    ${collateral} 
                                </span>
                                <Collateral />
                            </span>
                        </div>
                        <div className="flex flex-col space-y-0 col-span-1">
                            <span className="text-left align-middle font-medium text-secondary-foreground">
                                TP/SL
                            </span>
                            <span className="flex space-x-2 items-center">
                                <span>
                                    ${tpsl} 
                                </span>
                                <Tpsl />
                            </span>
                        </div>
                        <div className="flex flex-col space-y-0 col-span-1">
                            <span className="text-left align-middle font-medium text-secondary-foreground">
                                PNL
                            </span>
                            <span className="flex space-x-2 items-center">
                                $107.32
                            </span>
                        </div>
                        <div className="flex flex-col space-y-0 col-span-1">
                            <span className="text-left align-middle font-medium text-secondary-foreground">
                                Date
                            </span>
                            <span className="flex space-x-2 items-center">
                                {purchaseDate}
                            </span>
                        </div>
                        <div className="flex flex-col space-y-0 col-span-1">
                            <span className="text-left align-middle font-medium text-secondary-foreground">
                                
                            </span>
                            <span className="flex space-x-2 items-center">
                                <CloseFutures />
                            </span>
                        </div>
                    </div> */}
                </div>
            )}
        </div>
    )
}