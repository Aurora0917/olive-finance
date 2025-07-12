export interface TradingStrategy{
    image: string
    name: string
    type: string
    transaction: string
    position: string
}

export const tradingStrategies: TradingStrategy[] = [
    {
        image: '/strategy-images/longcall.png',
        name: 'Short Call Butterfly',
        type: 'Neutral',
        transaction: 'Call',
        position: 'Short'

    },
    {
        image: '/strategy-images/LongCallButterfly.png',
        name: 'Long Call Butterfly',
        type: 'Dangerous',
        transaction: 'Call',
        position: 'Long'
    },
    {
        image: '/strategy-images/ShortIronButterfly.png',
        name: 'Put Strategy',
        type: 'Neutral',
        transaction: 'Put',
        position: 'Short'
    },
    {
        image: '/strategy-images/frame1.png',
        name: 'Long Call',
        type: 'Neutral',
        transaction: 'Call',
        position: 'Long'
    },
    {
        image: '/strategy-images/ShortIronButterfly.png',
        name: 'Short Iron Butterfly',
        type: 'Neutral',
        transaction: 'Call',
        position: 'Short'
    },
    {
        image: '/strategy-images/LongCallButterfly.png',
        name: 'Long Call Butterfly',
        type: 'Dangerous',
        transaction: 'Call',
        position:'Long'
    },
]