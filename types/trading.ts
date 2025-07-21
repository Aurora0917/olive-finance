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
}