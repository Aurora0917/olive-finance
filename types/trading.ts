export interface Bar {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface PerpTPSL {
    price: number;
    sizePercent: number; // 0-100
    receiveSol: boolean;
}

export interface BackendTpSlOrder {
    _id: string;
    user: string;
    positionId: string;
    contractType: number;
    triggerOrderType: number; // 0 = take profit, 1 = stop loss
    index: number;
    price: number;
    sizePercent: number;
    receiveSol: boolean;
    poolName: string;
    isExecuted: boolean;
    isActive: boolean;
    addedAt: string;
    addTransaction: string;
    createdAt: string;
    updatedAt: string;
    currentPrice: number | null;
    triggerStatus: string;
    orderType: string; // "take_profit" or "stop_loss"
    distanceToTrigger: number | null;
}