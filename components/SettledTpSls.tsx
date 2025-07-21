'use client'

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Info, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { tpSlApiService, TpSlOrderResponse } from "@/services/tpSlApiService";
import { toast } from "sonner";
import apiService from "@/services/apiService";

interface TpSlOrder {
    id: string;
    type: 'take-profit' | 'stop-loss';
    price: number;
    token: string;
    percentage: number;
    isPartial?: boolean;
    triggerCondition?: 'above' | 'below';
    enabled?: boolean;
}

interface SettledTpSlsProps {
    orders?: TpSlOrder[]; // Local orders (fallback)
    onCancel?: (orderId: string) => void; // Local callback
    onUpdatePrice?: (orderId: string, newPrice: number) => void; // Local callback
    isVisible: boolean;
    onToggleVisibility: () => void;
    // Backend integration props
    userId?: string;
    positionId?: string;
    positionSide?: 'long' | 'short'; // Frontend position type for display
    contractType?: 'perp' | 'option'; // Backend position type
    currentPrice: number;
    onOrdersUpdated?: () => void; // Callback when orders are updated
}

export default function SettledTpSls({
    orders: localOrders = [],
    onCancel: localOnCancel,
    onUpdatePrice: localOnUpdatePrice,
    isVisible,
    onToggleVisibility,
    userId,
    positionId,
    positionSide = 'long',
    contractType = 'perp',
    currentPrice,
    onOrdersUpdated
}: SettledTpSlsProps) {
    const [editingOrder, setEditingOrder] = useState<string | null>(null);
    const [tempPrice, setTempPrice] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(false);
    const [backendOrders, setBackendOrders] = useState<TpSlOrderResponse[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    // Load orders from backend if userId is provided
    useEffect(() => {
        if (userId && isVisible) {
            loadBackendOrders();
        }
    }, [userId, isVisible]);

    const loadBackendOrders = async () => {
        if (!userId) return;
        
        setLoadingOrders(true);
        try {
            const response = await apiService.getTpSlOrders(userId);
            // Filter orders by positionId if provided
            const filteredOrders = positionId 
                ? response.orders.filter(order => 
                    order.positionId === positionId || 
                    order.positionId.startsWith(`${positionId}_`)
                  )
                : response.orders;
            setBackendOrders(filteredOrders);
        } catch (error: any) {
            console.error('Error loading TP/SL orders:', error);
            toast.error('Failed to load TP/SL orders');
        } finally {
            setLoadingOrders(false);
        }
    };

    // Convert backend orders to local format for display
    const convertBackendToLocal = (backendOrder: TpSlOrderResponse): TpSlOrder[] => {
        const orders: TpSlOrder[] = [];
        
        // Convert takeProfit if it exists and is enabled
        if (backendOrder.takeProfit?.enabled) {
            orders.push({
                id: `${backendOrder._id}_tp`,
                type: 'take-profit',
                price: backendOrder.takeProfit.price,
                token: backendOrder.receiveAsset,
                percentage: backendOrder.closePercent, // Default for backend orders
                isPartial: backendOrder.closePercent != 100, // Default for backend orders
                triggerCondition: backendOrder.takeProfit.triggerCondition,
                enabled: backendOrder.takeProfit.enabled
            });
        }
        
        // Convert stopLoss if it exists and is enabled
        if (backendOrder.stopLoss?.enabled) {
            orders.push({
                id: `${backendOrder._id}_sl`,
                type: 'stop-loss',
                price: backendOrder.stopLoss.price,
                token: backendOrder.receiveAsset,
                percentage: backendOrder.closePercent, // Default for backend orders
                isPartial: backendOrder.closePercent != 100, // Default for backend orders
                triggerCondition: backendOrder.stopLoss.triggerCondition,
                enabled: backendOrder.stopLoss.enabled
            });
        }
        
        return orders;
    };

    // Use backend orders if available, otherwise use local orders
    const displayOrders = userId && backendOrders.length > 0 
        ? backendOrders.flatMap(convertBackendToLocal)
        : localOrders;

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
        if (order) {
            const validation = tpSlApiService.validateTpSlPrices(
                currentPrice, 
                order.type === 'take-profit' ? tempPrice : undefined,
                order.type === 'stop-loss' ? tempPrice : undefined,
                positionSide
            );

            if (!validation.isValid) {
                toast.error(validation.errors[0]);
                return;
            }
        }

        setIsLoading(true);
        try {
            if (userId && positionId) {
                // Update via backend
                const backendOrderId = orderId.includes('_tp') ? orderId.replace('_tp', '') : orderId.replace('_sl', '');
                const backendOrder = backendOrders.find(o => o._id === backendOrderId);
                
                if (backendOrder && order) {
                    const updates: Partial<TpSlOrderResponse> = {};
                    
                    if (order.type === 'take-profit') {
                        updates.takeProfit = {
                            ...backendOrder.takeProfit!,
                            price: tempPrice
                        };
                    } else {
                        updates.stopLoss = {
                            ...backendOrder.stopLoss!,
                            price: tempPrice
                        };
                    }
                    
                    await tpSlApiService.updateTpSlOrder(userId, backendOrder.positionId, updates);
                    toast.success('TP/SL order updated successfully');
                    
                    // Reload orders
                    await loadBackendOrders();
                    onOrdersUpdated?.();
                }
            } else if (localOnUpdatePrice) {
                // Update locally
                localOnUpdatePrice(orderId, tempPrice);
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
        setIsLoading(true);
        try {
            if (userId && positionId) {
                // Cancel via backend
                const backendOrderId = orderId.includes('_tp') ? orderId.replace('_tp', '') : orderId.replace('_sl', '');
                const backendOrder = backendOrders.find(o => o._id === backendOrderId);
                const order = displayOrders.find(o => o.id === orderId);
                
                if (backendOrder && order) {
                    // If this is a combined order (both TP and SL), we need to disable only the specific one
                    const hasTP = backendOrder.takeProfit?.enabled;
                    const hasSL = backendOrder.stopLoss?.enabled;
                    
                    if (hasTP && hasSL) {
                        // Update to disable only the specific order type
                        const updates: Partial<TpSlOrderResponse> = {};
                        
                        if (order.type === 'take-profit') {
                            updates.takeProfit = {
                                ...backendOrder.takeProfit!,
                                enabled: false
                            };
                        } else {
                            updates.stopLoss = {
                                ...backendOrder.stopLoss!,
                                enabled: false
                            };
                        }
                        
                        await tpSlApiService.updateTpSlOrder(userId, backendOrder.positionId, updates);
                    } else {
                        // Delete the entire order if it only has one type
                        await tpSlApiService.deleteTpSlOrder(userId, backendOrder.positionId);
                    }
                    
                    toast.success('TP/SL order cancelled successfully');
                    
                    // Reload orders
                    await loadBackendOrders();
                    onOrdersUpdated?.();
                }
            } else if (localOnCancel) {
                // Cancel locally
                localOnCancel(orderId);
            }
        } catch (error: any) {
            console.error('Error cancelling order:', error);
            toast.error(error.message || 'Failed to cancel order');
        } finally {
            setIsLoading(false);
        }
    };

    const renderOrder = (order: TpSlOrder) => {
        const isBackendOrder = userId && backendOrders.some(bo => 
            (order.id.includes('_tp') && bo._id === order.id.replace('_tp', '')) ||
            (order.id.includes('_sl') && bo._id === order.id.replace('_sl', ''))
        );
        
        return (
            <div key={order.id} className="flex items-center justify-between py-2 px-3 bg-backgroundSecondary/30 rounded-sm">
                <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${order.type === 'take-profit' ? 'bg-blue-500' : 'bg-red-500'
                        }`} />
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
                    {isBackendOrder && (
                        <span className="text-xs text-green-400 px-1 py-0.5 bg-green-500/10 rounded">
                            Active
                        </span>
                    )}
                    {order.enabled === false && (
                        <span className="text-xs text-gray-400 px-1 py-0.5 bg-gray-500/10 rounded">
                            Disabled
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
                                disabled={isLoading || order.enabled === false}
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
                        disabled={isLoading || order.enabled === false}
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
                        {/* {userId && (
                            <span className="text-xs text-blue-400 px-1 py-0.5 bg-blue-500/10 rounded">
                                Live
                            </span>
                        )}
                        {contractType && (
                            <span className="text-xs text-purple-400 px-1 py-0.5 bg-purple-500/10 rounded">
                                {contractType.toUpperCase()}
                            </span>
                        )} */}
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

                                {/* Refresh button for backend orders */}
                                {userId && (
                                    <div className="flex justify-center pt-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-xs"
                                            onClick={loadBackendOrders}
                                            disabled={loadingOrders}
                                        >
                                            {loadingOrders ? (
                                                <>
                                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                    Refreshing...
                                                </>
                                            ) : (
                                                'Refresh Orders'
                                            )}
                                        </Button>
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