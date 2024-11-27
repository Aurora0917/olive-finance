import { useState } from "react"
import { CardContent, CardHeader } from "./ui/card"
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs"
import { cn } from "@/lib/utils"
import { TabsContent } from "@radix-ui/react-tabs"
import { Label } from "./ui/label"
import { Button } from "./ui/button"
import { RefreshCcw } from "lucide-react"
import { Input } from "./ui/input"
import { Slider } from "./ui/slider"


interface PortfolioFlippedProps{
    onClose: () => void
    coin: string
}

export default function PortfolioFlipped({onClose, coin}:PortfolioFlippedProps){
    const [activeTab, setActiveTab] = useState<"Open" | "Close">("Open")
    const [amount, setAmount] = useState<number>(0)
    const maxAmount = 100000

    const resetToDefault = () => {
        setAmount(0);
    };

    const handleSliderChange = (value: number[]) => {
        setAmount(value[0])
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value.replace(/[^0-9.]/g, ''))
        if (!isNaN(value) && value <= maxAmount) {
        setAmount(value)
        }
    }
    
    return(
            <Tabs defaultValue="Open"
                onValueChange={(value)=>setActiveTab(value as "Open" | "Close")}
                className="flex flex-col h-full space-y-4"
            >
                <CardHeader className="h-[32px]">
                    <TabsList className="w-full grid grid-cols-2 bg-secondary text-dark">
                        <TabsTrigger 
                            value="Open"
                            className={cn(
                            "data-[state=active]:bg-gradient data-[state=active]:text-light"
                            )}
                        >
                            Open
                        </TabsTrigger>
                        <TabsTrigger 
                            value="Close"
                            className={cn(
                            "data-[state=active]:bg-gradient data-[state=active]:text-light"
                            )}
                        >
                            Close
                        </TabsTrigger>
                    </TabsList>
                </CardHeader>
                <CardContent className="flex flex-col p-6 w-full">
                    <TabsContent value={activeTab} className="space-y-5">
                        <div className="flex flex-col space-y-1.5">
                            <div className="flex justify-between items-end">
                                <Label htmlFor="amount-input" className="text-sm font-medium">Amount</Label>
                                <Button
                                    type="button"
                                    variant="ghostPink"
                                    size="icon"
                                    className="h-6 w-6 rounded-md bg-secondary p-0"
                                    onClick={resetToDefault}
                                    aria-label="Reset amount"
                                >
                                    <RefreshCcw className="text-dark h-4 w-4" />
                                </Button>
                            </div>
                            <Input 
                                id="amount-input"
                                type="text"
                                value={`$${amount.toLocaleString()}`}
                                onChange={handleInputChange}
                                className="text-left"
                                aria-label="Enter open/close amount"
                            />
                        </div>
                        <div>
                            <Slider 
                                value={[amount]}
                                max={maxAmount}
                                step={100}
                                onValueChange={handleSliderChange}
                                aria-label="Adjust open/close amount"/>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-normal">{activeTab === 'Open'? 'Open' : 'Closing'} Fee:</span>
                                <span className="text-sm font-semibold">0.00 {coin}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-normal">Max Sell:</span>
                                <span className="text-sm font-semibold">0.00 {coin}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-normal">Price Impact:</span>
                                <span className="text-sm font-semibold">0.00 {coin}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-normal">Available Liquidity:</span>
                                <span className="text-sm font-semibold">0.00 {coin}</span>
                            </div>
                        </div>
                        <div className="w-full">
                            {activeTab === 'Open'? (
                                <Button className="w-full" variant='unselected'>
                                    Buy
                                </Button>
                            ) : (
                                <Button className="w-full" variant='unselected'>
                                    Sell
                                </Button>
                            )}
                        </div>
                    </TabsContent>
                </CardContent>
            </Tabs>
    )
}