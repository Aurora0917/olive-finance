import { BackendTpSlOrder } from '@/types/trading';
import axiosInstance from './axiosInstance';

export interface TpSlStats {
    total: number;
    active: number;
    perp: number;
    option: number;
    withTP: number;
    withSL: number;
}

class TpSlApiService {
    private baseUrl = '/tpsl';

    // Get user's TP/SL orders (READ ONLY)
    async getUserTpSlOrders(user: string): Promise<{ orders: BackendTpSlOrder[] }> {
        try {
            console.log('🚀 API Call: Getting user TP/SL orders', { user });
            const response = await axiosInstance.get(`${this.baseUrl}/${user}`);
            console.log('✅ API Response: User orders retrieved', response.data);
            return response.data;
        } catch (error: any) {
            console.error('❌ API Error: Getting user TP/SL orders failed', error);
            console.error('Error response:', error.response?.data);
            
            // For 404 errors (no orders found), return empty array instead of throwing
            if (error.response?.status === 404) {
                console.log('📭 No orders found for user, returning empty array');
                return { orders: [] };
            }
            
            throw new Error(error.response?.data?.error || 'Failed to fetch TP/SL orders');
        }
    }

    // Get specific TP/SL order (READ ONLY)
    async getTpSlOrder(user: string, positionId: string): Promise<{ order: BackendTpSlOrder }> {
        try {
            console.log('🚀 API Call: Getting specific TP/SL order', { user, positionId });
            const response = await axiosInstance.get(`${this.baseUrl}/${user}/${positionId}`);
            console.log('✅ API Response: Specific order retrieved', response.data);
            return response.data;
        } catch (error: any) {
            console.error('❌ API Error: Getting specific TP/SL order failed', error);
            console.error('Error response:', error.response?.data);
            throw new Error(error.response?.data?.error || 'Failed to fetch TP/SL order');
        }
    }

    // Get database stats (READ ONLY)
    async getDatabaseStats(): Promise<TpSlStats> {
        try {
            console.log('🚀 API Call: Getting database stats');
            const response = await axiosInstance.get('/database/stats');
            console.log('✅ API Response: Database stats retrieved', response.data);
            return response.data;
        } catch (error: any) {
            console.error('❌ API Error: Getting database stats failed', error);
            console.error('Error response:', error.response?.data);
            throw new Error(error.response?.data?.error || 'Failed to fetch database stats');
        }
    }

    // Helper to determine trigger condition based on position and order type
    getTriggerCondition(
        positionSide: 'long' | 'short',
        orderType: 'takeProfit' | 'stopLoss'
    ): 'above' | 'below' {
        if (positionSide === 'long') {
            return orderType === 'takeProfit' ? 'above' : 'below';
        } else {
            return orderType === 'takeProfit' ? 'below' : 'above';
        }
    }

    // Validation helpers for UI
    validateTpSlPrices(
        currentPrice: number, 
        takeProfit?: number, 
        stopLoss?: number, 
        positionSide: 'long' | 'short' = 'long'
    ): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (takeProfit !== undefined) {
            if (positionSide === 'long') {
                // For long positions, TP should be higher than current price
                if (takeProfit <= currentPrice + 2) {
                    errors.push('Take Profit must be at least $2.00 higher than current price');
                }
            } else {
                // For short positions, TP should be lower than current price
                if (takeProfit >= currentPrice - 2) {
                    errors.push('Take Profit must be at least $2.00 lower than current price');
                }
            }
        }

        if (stopLoss !== undefined) {
            if (positionSide === 'long') {
                // For long positions, SL should be lower than current price
                if (stopLoss >= currentPrice - 2) {
                    errors.push('Stop Loss must be at least $2.00 lower than current price');
                }
            } else {
                // For short positions, SL should be higher than current price
                if (stopLoss <= currentPrice + 2) {
                    errors.push('Stop Loss must be at least $2.00 higher than current price');
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Helper method to filter active orders
    filterActiveOrders(orders: BackendTpSlOrder[]): BackendTpSlOrder[] {
        return orders.filter(order => order.isActive && !order.isExecuted);
    }

    // Helper method to filter orders by position
    filterOrdersByPosition(orders: BackendTpSlOrder[], positionId: string): BackendTpSlOrder[] {
        return orders.filter(order => 
            order.positionId === positionId || 
            order.positionId.startsWith(`${positionId}_`)
        );
    }

    // Helper method to filter orders by contract type
    filterOrdersByContractType(orders: BackendTpSlOrder[], contractType: 'perp' | 'option'): BackendTpSlOrder[] {
        // Assuming contractType: 0 = perp, 1 = option
        const typeNumber = contractType === 'perp' ? 0 : 1;
        return orders.filter(order => order.contractType === typeNumber);
    }

    // Helper method to filter orders by trigger type
    filterOrdersByTriggerType(orders: BackendTpSlOrder[], triggerType: 'take-profit' | 'stop-loss'): BackendTpSlOrder[] {
        // triggerOrderType: 0 = take profit, 1 = stop loss
        const typeNumber = triggerType === 'take-profit' ? 0 : 1;
        return orders.filter(order => order.triggerOrderType === typeNumber);
    }

    // Helper method to get order statistics
    getOrderStatistics(orders: BackendTpSlOrder[]): {
        total: number;
        active: number;
        executed: number;
        withTP: number;
        withSL: number;
        perp: number;
        option: number;
        pendingTrigger: number;
        triggered: number;
    } {
        const active = orders.filter(order => order.isActive && !order.isExecuted);
        const executed = orders.filter(order => order.isExecuted);
        const withTP = orders.filter(order => order.triggerOrderType === 0); // take profit
        const withSL = orders.filter(order => order.triggerOrderType === 1); // stop loss
        const perp = orders.filter(order => order.contractType === 0);
        const option = orders.filter(order => order.contractType === 1);
        const pendingTrigger = orders.filter(order => order.triggerStatus === 'pending');
        const triggered = orders.filter(order => order.triggerStatus === 'triggered');

        return {
            total: orders.length,
            active: active.length,
            executed: executed.length,
            withTP: withTP.length,
            withSL: withSL.length,
            perp: perp.length,
            option: option.length,
            pendingTrigger: pendingTrigger.length,
            triggered: triggered.length
        };
    }

    // Helper method to get order type string
    getOrderTypeString(triggerOrderType: number): 'take-profit' | 'stop-loss' {
        return triggerOrderType === 0 ? 'take-profit' : 'stop-loss';
    }

    // Helper method to get contract type string
    getContractTypeString(contractType: number): 'perp' | 'option' {
        return contractType === 0 ? 'perp' : 'option';
    }

    // Helper method to format order for display
    formatOrderForDisplay(order: BackendTpSlOrder) {
        return {
            id: order._id,
            user: order.user,
            positionId: order.positionId,
            contractType: this.getContractTypeString(order.contractType),
            orderType: this.getOrderTypeString(order.triggerOrderType),
            index: order.index,
            price: order.price,
            sizePercent: order.sizePercent,
            receiveSol: order.receiveSol,
            poolName: order.poolName,
            isExecuted: order.isExecuted,
            isActive: order.isActive,
            addedAt: order.addedAt,
            addTransaction: order.addTransaction,
            triggerStatus: order.triggerStatus,
            distanceToTrigger: order.distanceToTrigger,
            currentPrice: order.currentPrice
        };
    }
}

export const tpSlApiService = new TpSlApiService();