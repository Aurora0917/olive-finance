import axiosInstance from './axiosInstance';

export interface TpSlOrderRequest {
    user: string;
    positionId: string;
    contractType: 'perp' | 'option';
    positionType: 'long' | 'short';
    takeProfit?: {
        price: number;
        enabled: boolean;
        triggerCondition: 'above' | 'below';
    };
    stopLoss?: {
        price: number;
        enabled: boolean;
        triggerCondition: 'above' | 'below';
    };
    closePercent: number,
    poolName?: string;
    custody: string;
    receiveAsset: 'SOL' | 'USDC';
    isActive?: boolean;
}

export interface TpSlOrderResponse {
    _id: string;
    user: string;
    positionId: string;
    contractType: 'perp' | 'option';
    positionType: 'long' | 'short';
    takeProfit?: {
        price: number;
        enabled: boolean;
        triggerCondition: 'above' | 'below';
    };
    stopLoss?: {
        price: number;
        enabled: boolean;
        triggerCondition: 'above' | 'below';
    };
    closePercent: number;
    poolName: string;
    custody: string;
    receiveAsset: 'SOL' | 'USDC';
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface TpSlStats {
    total: number;
    active: number;
    perp: number;
    option: number;
    withTP: number;
    withSL: number;
}

class TpSlApiService {
    private baseUrl = '/tpsl'; // Keep original endpoint structure

    // Create new TP/SL order
    async createTpSlOrder(orderData: TpSlOrderRequest): Promise<{ success: boolean; orderId: string }> {
        try {
            console.log('🚀 API Call: Creating TP/SL order', orderData);
            
            // Validate that at least one of TP or SL is provided and enabled
            const hasTP = orderData.takeProfit?.enabled;
            const hasSL = orderData.stopLoss?.enabled;
            
            if (!hasTP && !hasSL) {
                throw new Error('At least one of Take Profit or Stop Loss must be enabled');
            }
            
            const response = await axiosInstance.post(this.baseUrl, orderData);
            console.log('✅ API Response: Order created', response.data);
            return response.data;
        } catch (error: any) {
            console.error('❌ API Error: Creating TP/SL order failed', error);
            console.error('Error response:', error.response?.data);
            throw new Error(error.response?.data?.error || error.message || 'Failed to create TP/SL order');
        }
    }

    // Update existing TP/SL order
    async updateTpSlOrder(
        user: string, 
        positionId: string, 
        updates: Partial<TpSlOrderRequest>
    ): Promise<{ success: boolean; message: string }> {
        try {
            console.log('🚀 API Call: Updating TP/SL order', { user, positionId, updates });
            const response = await axiosInstance.put(`${this.baseUrl}/${user}/${positionId}`, updates);
            console.log('✅ API Response: Order updated', response.data);
            return response.data;
        } catch (error: any) {
            console.error('❌ API Error: Updating TP/SL order failed', error);
            console.error('Error response:', error.response?.data);
            throw new Error(error.response?.data?.error || 'Failed to update TP/SL order');
        }
    }

    // Delete TP/SL order
    async deleteTpSlOrder(user: string, positionId: string): Promise<{ success: boolean; message: string }> {
        try {
            console.log('🚀 API Call: Deleting TP/SL order', { user, positionId });
            const response = await axiosInstance.delete(`${this.baseUrl}/${user}/${positionId}`);
            console.log('✅ API Response: Order deleted', response.data);
            return response.data;
        } catch (error: any) {
            console.error('❌ API Error: Deleting TP/SL order failed', error);
            console.error('Error response:', error.response?.data);
            throw new Error(error.response?.data?.error || 'Failed to delete TP/SL order');
        }
    }

    // Get user's TP/SL orders
    async getUserTpSlOrders(user: string): Promise<{ orders: TpSlOrderResponse[] }> {
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

    // Get specific TP/SL order
    async getTpSlOrder(user: string, positionId: string): Promise<{ order: TpSlOrderResponse }> {
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

    // Get database stats
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

    // Cleanup inactive orders
    async cleanupInactiveOrders(olderThanDays: number = 7): Promise<{ message: string; deletedCount: number }> {
        try {
            console.log('🚀 API Call: Cleaning up inactive orders', { olderThanDays });
            const response = await axiosInstance.post('/database/cleanup', { olderThanDays });
            console.log('✅ API Response: Cleanup completed', response.data);
            return response.data;
        } catch (error: any) {
            console.error('❌ API Error: Cleanup failed', error);
            console.error('Error response:', error.response?.data);
            throw new Error(error.response?.data?.error || 'Failed to cleanup orders');
        }
    }

    // Convert frontend position type to backend position type
    convertToBackendPositionType(frontendPosition: 'long' | 'short'): 'perp' | 'option' {
        // For now, mapping all positions to 'perp' (perpetual futures)
        // You can modify this logic based on your actual business requirements
        return 'perp';
    }

    // Convert backend position type to frontend position type (for display)
    convertToFrontendPositionType(backendPosition: 'perp' | 'option'): 'long' | 'short' {
        // This is a simplified mapping - you'll need to store the actual direction separately
        // or determine it from other position data
        return 'long'; // Default - you'll need proper logic here
    }

    // Helper to determine trigger condition based on position and order type
    getTriggerCondition(
        positionType: 'long' | 'short',
        orderType: 'takeProfit' | 'stopLoss'
    ): 'above' | 'below' {
        if (positionType === 'long') {
            return orderType === 'takeProfit' ? 'above' : 'below';
        } else {
            return orderType === 'takeProfit' ? 'below' : 'above';
        }
    }

    // Validation helpers
    validateTpSlPrices(
        currentPrice: number, 
        takeProfit?: number, 
        stopLoss?: number, 
        positionType: 'long' | 'short' = 'long'
    ): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (takeProfit !== undefined) {
            if (positionType === 'long') {
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
            if (positionType === 'long') {
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
}

export const tpSlApiService = new TpSlApiService();