import { DialogTitle } from "@radix-ui/react-dialog";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { Separator } from "./ui/separator";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { FuelIcon } from "@/public/svgs/icons";

export default function PriorityFees(){
    const [priority, setPriority] = useState<string>('medium')
    const [maxFee, setMaxFee] = useState<string>('1e-7')

    const handlePriority = (value: string) => {
        if(priority !== value){
            setPriority(value)
        }
    }

    // Dynamic data based on priority level
    const priorityData = {
        medium: {
            rate: "229 μLamport / CU",
            fees: [
                "0.00000046 SOL",
                "0.00000092 SOL", 
                "0.00000016 SOL"
            ]
        },
        high: {
            rate: "2,747 μLamport / CU",
            fees: [
                "0.00000549 SOL",
                "0.00001099 SOL",
                "0.00001923 SOL"
            ]
        },
        ultra: {
            rate: "82,871 μLamport / CU", 
            fees: [
                "0.00016574 SOL",
                "0.00033148 SOL",
                "0.00058401 SOL"
            ]
        }
    }

    const txSizes = [
        "Small (200,000 cu)",
        "Average (400,000 cu)", 
        "Big (700,000 cu)"
    ]

    const currentData = priorityData[priority as keyof typeof priorityData]

    return (
        <Dialog>
            <DialogTrigger className="hidden sm:flex">
                <div className="bg-secondary rounded-sm p-[9px] text-foreground hover:text-primary">
                    <FuelIcon />
                </div>
            </DialogTrigger>
            <DialogContent className="w-[420px] p-5 border-none bg-accent flex flex-col sm:rounded-sm">
                <DialogTitle className="text-sm font-bold text-foreground uppercase tracking-wide">
                    PRIORITY FEES
                </DialogTitle>
                <Separator className="bg-secondary"/>
                <div className="w-full flex flex-col space-y-5">
                    {/* Description */}
                    <div className="flex items-start space-x-2">
                        <div className="w-4 h-4 rounded-full border border-primary flex items-center justify-center mt-0.5 flex-shrink-0">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Speed up your transactions with Dynamic Priority Fees following the market rate.
                        </p>
                    </div>

                    {/* Priority Level Buttons */}
                    <div className="flex space-x-3">
                        <Button
                            className={cn(
                                priority === 'medium' 
                                    ? 'bg-secondary text-foreground border-2 border-white' 
                                    : 'bg-secondary text-muted-foreground border-2 border-transparent hover:text-foreground',
                                "py-2 px-4 text-xs font-medium rounded-sm h-fit shadow-none"
                            )}
                            onClick={() => handlePriority('medium')}
                        >
                            medium
                        </Button>
                        <Button
                            className={cn(
                                priority === 'high' 
                                    ? 'bg-secondary text-foreground border-2 border-white' 
                                    : 'bg-secondary text-muted-foreground border-2 border-transparent hover:text-foreground',
                                "py-2 px-4 text-xs font-medium rounded-sm h-fit shadow-none"
                            )}
                            onClick={() => handlePriority('high')}
                        >
                            high
                        </Button>
                        <Button
                            className={cn(
                                priority === 'ultra' 
                                    ? 'bg-secondary text-foreground border-2 border-white' 
                                    : 'bg-secondary text-muted-foreground border-2 border-transparent hover:text-foreground',
                                "py-2 px-4 text-xs font-medium rounded-sm h-fit shadow-none"
                            )}
                            onClick={() => handlePriority('ultra')}
                        >
                            ultra
                        </Button>
                    </div>

                    {/* Current Rate Info */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                            Now @ {currentData.rate}
                        </span>
                        <div className="w-3 h-3 rounded-full border border-muted-foreground flex items-center justify-center">
                            <span className="text-[8px] text-muted-foreground font-bold">i</span>
                        </div>
                    </div>

                    {/* Fee Table */}
                    <div className="w-full">
                        <div className="flex justify-between items-center mb-3">
                            <Label className="text-xs font-medium text-muted-foreground">
                                TX Size
                            </Label>
                            <Label className="text-xs font-medium text-muted-foreground">
                                Extra Fee
                            </Label>
                        </div>
                        <div className="space-y-2">
                            {txSizes.map((size, index) => (
                                <div key={index} className="flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground">
                                        {size}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {currentData.fees[index]}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Max Priority Fee Input */}
                    <div className="flex justify-between items-center pt-2">
                        <div className="flex items-center space-x-1">
                            <span className="text-xs text-muted-foreground">
                                Max Priority Fee per TX (SOL)
                            </span>
                            <div className="w-3 h-3 rounded-full border border-muted-foreground flex items-center justify-center">
                                <span className="text-[8px] text-muted-foreground font-bold">i</span>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Input
                                type="text"
                                value={maxFee}
                                onChange={(e) => setMaxFee(e.target.value)}
                                className="w-16 h-6 px-1 py-0 text-xs text-foreground bg-transparent border-none shadow-none focus:ring-0 focus:outline-none text-right"
                            />
                            <span className="text-xs text-muted-foreground">
                                SOL
                            </span>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}