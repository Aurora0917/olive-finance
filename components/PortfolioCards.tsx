import { useEffect, useState } from "react";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader } from "./ui/card";
import PortfolioFlipped from "./PortfolioFlipped";
import { Button } from "./ui/button";

interface Positions{
    coin: string
    strategyType: "Put" | "Call"
    positionType: "Long" | "Short"
    expiry: string
    size: number
    pl: number
    delta: number
    gamma: number
    theta: number
    vega: number
}

const generateRandomPosition = (): Positions => {
    const coins = ["BTC", "ETH", "SOL"];
    const currentDate = new Date()
    const randomDate = new Date(currentDate.setMonth(currentDate.getMonth() + Math.floor(Math.random()*12)))

    return{
        coin: coins[Math.floor(Math.random()*coins.length)],
        strategyType: Math.random() > 0.5 ? "Call" : "Put",
        positionType: Math.random() > 0.5 ? "Long" : "Short",
        expiry: randomDate.toLocaleDateString(),
        size: Math.floor(Math.random() *20 ) + 1,
        pl: Math.floor(Math.random() * 1000 ) - 500,
        delta: Number((Math.random() * 2 - 1).toFixed(4)),
        gamma: Number((Math.random() * 0.1).toFixed(4)),
        theta: Number((-Math.random() * 0.2).toFixed(4)),
        vega: Number((Math.random() * 0.5).toFixed(4))
    }
}

export default function PortfolioCards(){
    const [positions, setPositions] = useState<Positions[]>([])
    const [selectedCard, setSelectedCard] = useState<number | null>(null)

    useEffect(()=>{
        const generatedPositions : Positions [] = Array(5).fill(null).map(generateRandomPosition)
        setPositions(generatedPositions)
    }, [])

    const handleCardClick = (index: number) =>{
        if (selectedCard === index) {
            setSelectedCard(null);
          } else {
            setSelectedCard(index);
          }
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-4 justify-items-center">
            {positions.map((position, index) => (
                <Card key={index} onClick={() => handleCardClick(index)} className="w-full h-96 bg-backgroundSecondary space-y-6 rounded-3xl">
                    {selectedCard === index ? (
                        <PortfolioFlipped onClose={() => handleCardClick(index)} coin={position.coin}/>
                    ) : (
                        <>
                            <CardHeader className="border-b-2 cursor-pointer">
                                <div className="flex justify-between items-start">
                                    <div className="flex justify-between items-start">
                                        <span className="font-bold text-base">{position.coin}</span>
                                    </div>
                                    <Badge className="bg-primary-foreground border-none text-xs text-primary p-[6px]">
                                        {position.strategyType}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="flex flex-col justify-between space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-start">
                                        <span className="font-medium text-xs">Position Type: </span>
                                    </div>
                                    <span className="font-medium text-xs">{position.positionType}</span>
                                </div>
                                <div className="flex justify-between items-start">
                                    <div className="flex items-start">
                                        <span className="font-medium text-xs">Expiry: </span>
                                    </div>
                                    <span className="font-medium text-xs">{position.expiry}</span>
                                </div>
                                <div className="flex justify-between items-start">
                                    <div className="flex items-start">
                                        <span className="font-medium text-xs">Size: </span>
                                    </div>
                                    <span className="font-medium text-xs">{position.size}</span>
                                </div>
                                <div className={position.pl > 0 ? "text-green-600 flex justify-between items-start" : "text-red-600 flex justify-between items-start"}>
                                    <div className="flex items-start">
                                        <span className="font-medium text-xs">P&L: </span>
                                    </div>
                                    <span className="font-medium text-xs">{Math.abs(position.pl)}</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-start">
                                            <span className="font-medium text-xs">Delta: </span>
                                        </div>
                                        <span className="font-medium text-xs">{position.delta}</span>
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-start">
                                            <span className="font-medium text-xs">Gamma: </span>
                                        </div>
                                        <span className="font-medium text-xs">{position.gamma}</span>
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-start">
                                            <span className="font-medium text-xs">Theta: </span>
                                        </div>
                                        <span className="font-medium text-xs">{position.theta}</span>
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-start">
                                            <span className="font-medium text-xs">Vega: </span>
                                        </div>
                                        <span className="font-medium text-xs">{position.vega}</span>
                                    </div>
                                </div>
                                <div className="flex-shrink-0 py-4 w-full" onClick={(e) => e.stopPropagation()}>
                                    <Button className="w-full border-2 border-primary bg-primary text-foreground rounded-full" variant='unselected'>
                                        Exercise
                                    </Button>
                                </div>
                            </CardContent>
                        </>
                        )}
                </Card>
            ))}
        </div>
    )
}