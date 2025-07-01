export interface Position{
    index: number
    token: string
    logo: string
    symbol: string
    type: string
    strikePrice: number
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

export const positions: Position[] = [
    {
        index:1,
        token: 'Bitcoin',
        logo: '/images/bitcoin.png',
        symbol: 'BTC',
        type: 'Call',
        strikePrice: 150,
        expiry: '1/5/2025',
        size: 28,
        pnl: 120,
        greeks: {
            delta: 0.9132,
            gamma: 0.0723,
            theta: -0.3587,
            vega: 0.0321
        }
    },
    {
        index:1,
        token: 'Bitcoin',
        logo: '/images/bitcoin.png',
        symbol: 'BTC',
        type: 'Call',
        strikePrice: 150,
        expiry: '1/5/2025',
        size: 28,
        pnl: 120,
        greeks: {
            delta: 0.9132,
            gamma: 0.0723,
            theta: -0.3587,
            vega: 0.0321
        }
    },
    {
        index:1,
        token: 'Bitcoin',
        logo: '/images/bitcoin.png',
        symbol: 'BTC',
        type: 'Call',
        strikePrice: 150,
        expiry: '1/5/2025',
        size: 28,
        pnl: 120,
        greeks: {
            delta: 0.9132,
            gamma: 0.0723,
            theta: -0.3587,
            vega: 0.0321
        }
    },
    {
        index:1,
        token: 'Bitcoin',
        logo: '/images/bitcoin.png',
        symbol: 'BTC',
        type: 'Call',
        strikePrice: 150,
        expiry: '1/5/2025',
        size: 28,
        pnl: 120,
        greeks: {
            delta: 0.9132,
            gamma: 0.0723,
            theta: -0.3587,
            vega: 0.0321
        }
    },
]

export const orders: Order[] = [
    
    
]