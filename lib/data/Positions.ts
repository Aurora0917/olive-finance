export interface Position{
    index: number
    token: string
    logo: string
    symbol: string
    type: string
    strikePrice: number
    entryPrice: number
    quantity: number
    expiry: string
    size: number
    executed: boolean
    pnl: number
    limitPrice?: number
    purchaseDate?: string
    greeks: {
        delta: number
        gamma: number
        theta: number
        vega: number
    }
}

interface Order{
    index: number
    token: string
    logo: string
    symbol: string
    type: string
    transaction: string
    limitPrice: number
    strikePrice: number
    expiry: string
    orderDate: string
    size: number
}

export const orders: Order[] = [
    
    
]