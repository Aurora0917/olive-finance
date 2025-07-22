'use client'

import { useState, useEffect, useContext } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Info, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import apiService from "@/services/apiService";
import { ContractContext } from "@/contexts/contractProvider";
import { BackendTpSlOrder } from "@/types/trading";

interface SettledTpSlsProps {
    isVisible: boolean;
    onToggleVisibility: () => void;
    // Backend integration props
    userId?: string;
    positionId?: string;
    positionSide?: 'long' | 'short';
    contractType?: 'perp' | 'option';
    currentPrice: number;
    onOrdersUpdated?: () => void; // Callback when orders are updated
    // Onchain integration props
    positionIndex?: number; // Required for onchain operations
    poolName?: string;
    // Backend orders passed from parent
    backendOrders?: BackendTpSlOrder[];
}

interface DisplayOrder {
    id: string;
    type: 'take-profit' | 'stop-loss';
    price: number;
    token: string;
    percentage: number;
    isPartial: boolean;
    triggerCondition?: 'above' | 'below';
    enabled: boolean;
    onchainIndex: number;
    backendOrderId: string;
    triggerStatus: string;
    distanceToTrigger: number | null;
}

export default function SettledTpSls({
    isVisible,
    onToggleVisibility,
    userId,
    positionId,
    positionSide = 'long',
    contractType = 'perp',
    currentPrice,
    onOrdersUpdated,
    positionIndex,
    poolName = "SOL/USDC",
    backendOrders = []
}: SettledTpSlsProps) {
    const { onRemoveTpSl, onUpdateTpSl } = useContext(ContractContext);
    const [editingOrder, setEditingOrder] = useState<string | null>(null);
    const [tempPrice, setTempPrice] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(false);
    const [localBackendOrders, setLocalBackendOrders] = useState<BackendTpSlOrder[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    // Use provided backend orders or load them locally
    const effectiveBackendOrders = backendOrders.length > 0 ? backendOrders : localBackendOrders;

    // Load orders from backend if not provided and userId exists
    useEffect(() => {
        if (userId && isVisible && backendOrders.length === 0) {
            loadBackendOrders();
        }
    }, [userId, isVisible, backendOrders.length]);

    const loadBackendOrders = async () => {
        if (!userId) return;
        
        setLoadingOrders(true);
        try {
            const response = await apiService.getTpSlOrders(userId);
            // Filter orders by positionId if provided
            const filteredOrders = positionId 
                ? response.orders.filter((order: BackendTpSlOrder) => 
                    order.positionId === positionId && 
                    order.isActive && 
                    !order.isExecuted
                  )
                : response.orders.filter((order: BackendTpSlOrder) => 
                    order.isActive && 
                    !order.isExecuted
                  );
            setLocalBackendOrders(filteredOrders);
        } catch (error: any) {
            console.error('Error loading TP/SL orders:', error);
            toast.error('Failed to load TP/SL orders');
        } finally {
            setLoadingOrders(false);
        }
    };

    // Convert backend orders to display format
    const convertBackendToDisplay = (backendOrder: BackendTpSlOrder): DisplayOrder => {
        const orderType = backendOrder.triggerOrderType === 0 ? 'take-profit' : 'stop-loss';
        
        // Determine trigger condition based on position side and order type
        let triggerCondition: 'above' | 'below';
        if (positionSide === 'long') {
            triggerCondition = orderType === 'take-profit' ? 'above' : 'below';
        } else {
            triggerCondition = orderType === 'take-profit' ? 'below' : 'above';
        }
        
        return {
            id: backendOrder._id,
            type: orderType,
            price: backendOrder.price,
            token: backendOrder.receiveSol ? 'SOL' : 'USDC',
            percentage: backendOrder.sizePercent,
            isPartial: backendOrder.sizePercent !== 100,
            triggerCondition,
            enabled: backendOrder.isActive && !backendOrder.isExecuted,
            onchainIndex: backendOrder.index,
            backendOrderId: backendOrder._id,
            triggerStatus: backendOrder.triggerStatus,
            distanceToTrigger: backendOrder.distanceToTrigger
        };
    };

    // Get all display orders
    const displayOrders = effectiveBackendOrders.map(convertBackendToDisplay);

    // Don't render anything if no orders
    if (displayOrders.length === 0) {
        return null;
    }

    const fullOrders = displayOrders.filter(order => !order.isPartial);
    const partialOrders = displayOrders.filter(order => order.isPartial);

    const handlePriceEdit = (orderId: string, currentPrice: number) => {
        setEditingOrder(orderId);
        setTempPrice(currentPrice);
    };

    const handlePriceUpdate = async (orderId: string) => {
        if (!tempPrice || tempPrice <= 0) {
            toast.error('Please enter a valid price');
            return;
        }

        // Validate price based on current market price and position type
        const order = displayOrders.find(o => o.id === orderId);
        if (!order) return;

        // Basic price validation
        if (positionSide === 'long') {
            if (order.type === 'take-profit' && tempPrice <= currentPrice) {
                toast.error('Take profit price must be above current price for long positions');
                return;
            }
            if (order.type === 'stop-loss' && tempPrice >= currentPrice) {
                toast.error('Stop loss price must be below current price for long positions');
                return;
            }
        } else {
            if (order.type === 'take-profit' && tempPrice >= currentPrice) {
                toast.error('Take profit price must be below current price for short positions');
                return;
            }
            if (order.type === 'stop-loss' && tempPrice <= currentPrice) {
                toast.error('Stop loss price must be above current price for short positions');
                return;
            }
        }

        setIsLoading(true);
        try {
            // Use onchain update
            if (positionIndex !== undefined && onUpdateTpSl) {
                console.log("Updating TP/SL onchain for position:", positionIndex);
                
                const updates: {
                    updateTPs?: Array<{index: number; price?: number; sizePercent?: number}>;
                    updateSLs?: Array<{index: number; price?: number; sizePercent?: number}>;
                } = {};
                
                if (order.type === 'take-profit') {
                    updates.updateTPs = [{
                        index: order.onchainIndex,
                        price: tempPrice,
                        sizePercent: order.percentage
                    }];
                } else {
                    updates.updateSLs = [{
                        index: order.onchainIndex,
                        price: tempPrice,
                        sizePercent: order.percentage
                    }];
                }
                
                const result = await onUpdateTpSl(positionIndex, updates);
                
                if (result) {
                    toast.success('TP/SL order updated successfully onchain');
                    onOrdersUpdated?.();
                } else {
                    throw new Error('Onchain update failed');
                }
            } else {
                toast.error('Onchain update not available');
            }
            
            setEditingOrder(null);
        } catch (error: any) {
            console.error('Error updating order:', error);
            toast.error(error.message || 'Failed to update order');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePriceCancel = () => {
        setEditingOrder(null);
        setTempPrice(0);
    };

    const handleCancelOrder = async (orderId: string) => {
        const order = displayOrders.find(o => o.id === orderId);
        if (!order) return;

        setIsLoading(true);
        try {
            // Use onchain removal
            if (positionIndex !== undefined && onRemoveTpSl) {
                console.log("Removing TP/SL onchain for position:", positionIndex);
                
                const removals: {
                    removeTPs?: number[];
                    removeSLs?: number[];
                } = {};
                
                if (order.type === 'take-profit') {
                    removals.removeTPs = [order.onchainIndex];
                } else {
                    removals.removeSLs = [order.onchainIndex];
                }
                
                const result = await onRemoveTpSl(positionIndex, removals);
                
                if (result) {
                    toast.success('TP/SL order cancelled successfully onchain');
                    onOrdersUpdated?.();
                } else {
                    throw new Error('Onchain removal failed');
                }
            } else {
                toast.error('Onchain removal not available');
            }
        } catch (error: any) {
            console.error('Error cancelling order:', error);
            toast.error(error.message || 'Failed to cancel order');
        } finally {
            setIsLoading(false);
        }
    };

    const renderOrder = (order: DisplayOrder) => {        
        return (
            <div key={order.id} className="flex items-center justify-between py-2 px-3 bg-backgroundSecondary/30 rounded-sm">
                <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${order.type === 'take-profit' ? 'bg-blue-500' : 'bg-red-500'}`} />
                    <span className="text-sm text-foreground">
                        {order.type === 'take-profit' ? 'Take Profit' : 'Stop Loss'}
                    </span>
                    <span className="text-xs text-secondary-foreground px-2 py-1 bg-backgroundSecondary rounded">
                        {order.token}
                    </span>
                    {order.triggerCondition && (
                        <span className="text-xs text-yellow-400 px-1 py-0.5 bg-yellow-500/10 rounded">
                            {order.triggerCondition}
                        </span>
                    )}
                    {order.triggerStatus && (
                        <span className={`text-xs px-1 py-0.5 rounded ${
                            order.triggerStatus === 'pending' ? 'text-blue-400 bg-blue-500/10' :
                            order.triggerStatus === 'triggered' ? 'text-green-400 bg-green-500/10' :
                            order.triggerStatus === 'cancelled' ? 'text-red-400 bg-red-500/10' :
                            'text-gray-400 bg-gray-500/10'
                        }`}>
                            {order.triggerStatus}
                        </span>
                    )}
                    {!order.enabled && (
                        <span className="text-xs text-gray-400 px-1 py-0.5 bg-gray-500/10 rounded">
                            Disabled
                        </span>
                    )}
                    {order.distanceToTrigger !== null && (
                        <span className="text-xs text-purple-400 px-1 py-0.5 bg-purple-500/10 rounded">
                            ${Math.abs(order.distanceToTrigger).toFixed(2)} away
                        </span>
                    )}
                </div>

                <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                        <span className="text-xs text-secondary-foreground mr-1">$</span>
                        {editingOrder === order.id ? (
                            <div className="flex items-center space-x-1">
                                <Input
                                    type="number"
                                    value={tempPrice}
                                    onChange={(e) => setTempPrice(parseFloat(e.target.value))}
                                    className="w-16 h-6 text-xs text-right bg-backgroundSecondary border-border"
                                    step="0.01"
                                    disabled={isLoading}
                                />
                                <Button
                                    size="sm"
                                    className="h-5 px-1 text-xs bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => handlePriceUpdate(order.id)}
                                    disabled={isLoading}
                                >
                                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : '✓'}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-5 px-1 text-xs border-border"
                                    onClick={handlePriceCancel}
                                    disabled={isLoading}
                                >
                                    ✕
                                </Button>
                            </div>
                        ) : (
                            <button
                                className="text-sm text-foreground hover:text-primary cursor-pointer disabled:opacity-50"
                                onClick={() => handlePriceEdit(order.id, order.price)}
                                disabled={isLoading || !order.enabled || positionIndex === undefined}
                            >
                                {order.price.toFixed(2)}
                            </button>
                        )}
                    </div>

                    <span className="text-xs text-secondary-foreground min-w-[50px] text-center">
                        {order.percentage.toFixed(0)}%
                    </span>

                    <Button
                        size="sm"
                        className="h-6 px-2 text-xs bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={isLoading || !order.enabled || positionIndex === undefined}
                    >
                        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Cancel'}
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full flex justify-end">
            <div className="w-1/2 bg-backgroundSecondary/30 border border-border rounded-sm shadow-sm">
                {/* Toggle Header */}
                <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-backgroundSecondary/40 rounded-t-sm"
                    onClick={onToggleVisibility}
                >
                    <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-foreground">TP/SL Orders</span>
                        <span className="text-xs text-secondary-foreground bg-backgroundSecondary px-2 py-1 rounded">
                            {displayOrders.length}
                        </span>
                        {loadingOrders && (
                            <Loader2 className="w-3 h-3 animate-spin text-secondary-foreground" />
                        )}
                    </div>
                    {isVisible ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>

                {isVisible && (
                    <div className="p-3 pt-0 space-y-3 border-t border-border">
                        {/* Price context information */}
                        <div className="text-xs text-secondary-foreground bg-backgroundSecondary/20 p-2 rounded">
                            <div className="flex justify-between">
                                <span>Current Price: ${currentPrice.toFixed(2)}</span>
                                <span>Position: {positionSide.toUpperCase()}</span>
                                {contractType && (
                                    <span>Type: {contractType.toUpperCase()}</span>
                                )}
                                {positionIndex !== undefined && (
                                    <span>Index: #{positionIndex}</span>
                                )}
                            </div>
                        </div>

                        {loadingOrders ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm text-secondary-foreground ml-2">Loading orders...</span>
                            </div>
                        ) : (
                            <>
                                {fullOrders.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm font-medium text-foreground">Full TP/SL</span>
                                            <Info size={12} className="text-secondary-foreground" />
                                        </div>
                                        <div className="space-y-1">
                                            {fullOrders.map(renderOrder)}
                                        </div>
                                    </div>
                                )}

                                {partialOrders.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm font-medium text-foreground">Partial TP/SL</span>
                                            <Info size={12} className="text-secondary-foreground" />
                                        </div>
                                        <div className="space-y-1">
                                            {partialOrders.map(renderOrder)}
                                        </div>
                                    </div>
                                )}

                                {/* Show message if onchain operations not available */}
                                {positionIndex === undefined && displayOrders.length > 0 && (
                                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
                                        <p className="text-xs text-yellow-400">
                                            Onchain operations not available. Position index required for editing/cancelling orders.
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}