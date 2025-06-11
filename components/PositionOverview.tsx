import { ExpiryIcon, PositionTypeIcon, RedArrowPnl, SizeIcon, StrikePriceIcon, ValueIcon } from "@/public/svgs/icons"

interface PositionOverviewProps{
    type: string
    expiry: string
    size: number
    pnl: number
    strikePrice: number
    purchaseDate?: string
}

export default function PositionOverview({type, expiry, size, pnl, strikePrice, purchaseDate} : PositionOverviewProps){
    return (
        <div className="w-full flex flex-col space-y-4 text-xs">
            <div className="w-full space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-secondary-foreground">Type</span>
                    <span className="text-foreground">{type}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-secondary-foreground">Strike Price</span>
                    <span className="text-foreground">${strikePrice}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-secondary-foreground">Size</span>
                    <span className="text-foreground">{size}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-secondary-foreground">Expiry</span>
                    <span className="text-foreground">{new Date(expiry).toLocaleString()}</span>
                </div>
                {purchaseDate && (
                    <div className="flex justify-between items-center">
                        <span className="text-secondary-foreground">Purchase Date</span>
                        <span className="text-foreground">{new Date(purchaseDate).toLocaleString()}</span>
                    </div>
                )}
                <div className="flex justify-between items-center">
                    <span className="text-secondary-foreground">P&L</span>
                    <span className={`${pnl > 0 ? 'text-green-500' : pnl < 0 ? 'text-red-500' : 'text-foreground'}`}>
                        {pnl > 0 ? '+' : ''}{pnl.toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
    )
}