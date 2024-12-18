'use client'

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

import btc from '../public/images/bitcoin.png'
import { ChevronDown, Wallet} from 'lucide-react';

import Image from "next/image";
import swapIcon from "@/public/svgs/swapdark.svg"
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import WalletModal from "./WalletModal";
import { useWallet } from "@/contexts/walletprovider";
import { useTheme } from "next-themes";

export default function OptionsCard(){
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
    const { theme } = useTheme()
    const [position, setPosition] = useState<string>("American");
    const [date, setDate] = useState<Date>();
    const [formValues, setFormValues] = useState<{
        selling: { currency: string; amount: string };
        buying: { type: string; amount: string };
        expiryDate: Date | undefined;
        strikePrice: string;
    }>({
        selling: { currency: 'btc', amount: '' },
        buying: { type: 'call', amount: '' },
        expiryDate: undefined,
        strikePrice: ''
      })

    const { isConnected, walletName } = useWallet();
 
    return (
        <Card className="rounded-[15px]">
            <CardHeader className="pt-[10px] px-6 pb-5 border-b-[1px]">
                <Tabs className="w-full flex justify-between items-center"
                    defaultValue="American"
                    onValueChange={(value)=>setPosition(value)}
                >
                    <TabsList className="grid grid-cols-4 rounded-full gap-2 p-0 bg-inherit text-secondary-foreground justify-start">
                        <TabsTrigger
                            value="American"
                            className="bg-none border-b-2 border-transparent rounded-none data-[state=active]:border-primary"
                        >
                            American
                        </TabsTrigger>
                        <TabsTrigger
                            value="European"
                            className="bg-none border-b-2 border-transparent rounded-none data-[state=active]:border-primary"
                        >
                            European
                        </TabsTrigger>
                        <TabsTrigger
                            value="Futures"
                            className="bg-none border-b-2 border-transparent rounded-none data-[state=active]:border-primary"
                        >
                            Futures
                        </TabsTrigger>
                    </TabsList>
                    <div>
                        <Select>
                            <SelectTrigger className="bg-inherit text-secondary-foreground text-sm focus:outline-none flex items-center justify-evenly p-0 w-28" >
                                <SelectValue placeholder='Market'/>
                                <ChevronDown className="opacity-50" size={14}/>
                            </SelectTrigger>
                            <SelectContent className="w-full" align="start">
                                <SelectItem value="limit">Limit</SelectItem>
                                <SelectItem value="market">Market</SelectItem>
                                <SelectItem value="amm">AMM</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </Tabs>
            </CardHeader>
            <CardContent className="p-0">
                <div className="px-6 py-7 flex flex-col justify-between border-b-[1px]">
                    <div className="w-full flex justify-between items-center">
                        <div className="w-full">
                            <Label className="text-sm font-medium text-foreground">You Sell</Label>
                        </div>
                        <div className="flex justify-between gap-2 w-full items-center">
                            <div className="w-full flex gap-1">
                                <Wallet className="w-4 h-4 text-secondary-foreground"/>
                                <div className="text-sm font-normal text-secondary-foreground w-full flex gap-1">
                                    <span>0.004185199</span>
                                    <span>BTC</span>
                                </div>
                                
                            </div>
                            <div className="w-full flex gap-1">
                                <Button
                                    className="px-[6px] py-[5px] text-[10px] font-semibold w-full h-auto text-secondary-foreground bg-inherit shadow-none"
                                >
                                    Max
                                </Button>
                                <Button
                                    className="px-[6px] py-[5px] text-[10px] font-semibold w-full h-auto text-secondary-foreground bg-inherit shadow-none"
                                >
                                    Half
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between mt-5">
                        <div className="flex flex-col p-0">
                            <div className="w-full flex p-0">
                                <Select value={formValues.selling.currency} onValueChange={(value) => setFormValues(prev => ({ ...prev, selling: { ...prev.selling, currency: value } }))}>
                                    <SelectTrigger className="bg-inherit p-0 w-full h-[52px]">
                                        <div className="flex items-center space-x-2 text-[28px]">
                                            <Image src={btc} alt="bitcoin" height={28} width={28}/>
                                            <SelectValue placeholder="Select"/>
                                            <ChevronDown className="opacity-50" size={28}/>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="w-full">
                                        <SelectItem value="btc" >BTC</SelectItem>
                                        <SelectItem value="eth">ETH</SelectItem>
                                        <SelectItem value="sol">SOL</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <span className="text-sm font-normal text-secondary-foreground p-0">
                                Bitcoin
                            </span>
                        </div>
                        <div className="w-fit items-end flex flex-col p-0">
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={formValues.selling.amount}
                                onChange={(e) => setFormValues(prev => ({ ...prev, selling: { ...prev.selling, amount: e.target.value } }))}
                                className="border-none text-right shadow-none p-0 text-[52px] font-normal text-foreground w-[200px] h-[52px]"
                            />
                            <span className="text-sm font-normal text-secondary-foreground">$10.75</span>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-7 flex flex-col justify-between border-b-[1px]">
                    <div className="w-full flex justify-between items-center">
                        <div className="w-full">
                            <Label className="text-sm font-medium text-foreground">You Buy</Label>
                        </div>
                        <div className="flex justify-end gap-2 w-full ">
                            <div className="flex gap-1">
                                <Wallet className="w-4 h-4 text-secondary-foreground"/>
                                <div className="text-sm font-normal text-secondary-foreground w-full flex gap-1">
                                    <span>0.004185199</span>
                                    <span>BTC</span>
                                </div>
                                
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between mt-5">
                        <div className="flex flex-col p-0">
                            <div className="w-full flex p-0">
                                <Select value={formValues.buying.type} onValueChange={(value) => setFormValues(prev => ({ ...prev, buying: { ...prev.buying, type: value } }))}>
                                    <SelectTrigger className="bg-inherit p-0 w-full h-[52px]">
                                        <div className="flex items-center space-x-2 text-[28px] justify-evenly">
                                            <SelectValue placeholder="Select"/>
                                            <ChevronDown className="opacity-50" size={28}/>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="w-full">
                                        <SelectItem value="call">Call</SelectItem>
                                        <SelectItem value="put">Put</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <span className="text-sm font-normal text-secondary-foreground p-0">
                                Call Option
                            </span>
                        </div>
                        <div className="w-fit items-end flex flex-col p-0">
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={formValues.buying.amount}
                                onChange={(e) => setFormValues(prev => ({ ...prev, buying: { ...prev.buying, amount: e.target.value } }))}
                                className="border-none text-right shadow-none p-0 text-[52px] font-normal text-foreground w-[200px] h-[52px]"
                            />
                            <span className="text-sm font-normal text-secondary-foreground">$10.75</span>
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="px-6 py-7 flex flex-col space-y-7">
                <div className="w-full flex gap-4">
                    <div className="flex flex-col gap-1 w-full">
                        <Label className="text-foreground text-sm font-medium">Strike Price</Label>
                        <Input 
                            type="number"
                            placeholder="0.00"
                            className="border-none bg-backgroundSecondary px-3 py-2 text-foreground rounded-[12px]"
                            value={formValues.strikePrice}
                            onChange={(e) => setFormValues(prev => ({ ...prev, strikePrice: e.target.value }))}
                        />
                    </div>
                    <div className="flex flex-col gap-1 w-full">
                        <Label className="text-foreground text-sm font-medium">Expiry</Label>
                        <Select>
                            <SelectTrigger className="bg-backgroundSecondary w-full rounded-[12px] ">
                                <SelectValue placeholder="Never" />
                                <ChevronDown className="opacity-50" size={14}/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="never">Never</SelectItem>
                                <SelectItem value="1">1 day</SelectItem>
                                <SelectItem value="2">2 days</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                {!isConnected && (
                    <Button 
                        className="w-full h-auto rounded-xl text-black flex"
                        onClick={() => setIsWalletModalOpen(true)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M6.88152 17.7048C7.42067 17.1657 7.7304 16.4774 7.8107 15.7662C7.91967 14.8199 7.60421 13.8391 6.88152 13.1165C6.45135 12.6863 5.92367 12.3995 5.36731 12.2676C4.30622 11.998 3.13041 12.2791 2.293 13.1165C1.7137 13.6957 1.39824 14.4356 1.35809 15.1984C1.32941 15.5254 1.35809 15.8637 1.44413 16.1907C1.57605 16.747 1.86283 17.2747 2.293 17.7048C3.56058 18.9724 5.61394 18.9724 6.88152 17.7048ZM5.80322 14.8142C6.13589 14.8142 6.4112 15.0895 6.4112 15.4221C6.40546 15.7605 6.13589 16.0301 5.79748 16.0358L5.19524 16.0301L5.20098 16.6094C5.19524 16.9478 4.92567 17.2173 4.58726 17.2231C4.24886 17.2173 3.97928 16.9478 3.97355 16.6094L3.97928 16.0301L3.37704 16.0358C3.03864 16.0301 2.76906 15.7605 2.76333 15.4221C2.76906 15.2558 2.83789 15.1067 2.94687 14.9977C3.05584 14.8887 3.20497 14.8199 3.3713 14.8142L3.97928 14.8142L3.97928 14.1833C3.97928 14.0112 4.04811 13.8621 4.15709 13.7531C4.26607 13.6441 4.41519 13.5753 4.58726 13.5753C4.91993 13.5753 5.19524 13.8506 5.19524 14.1833L5.19524 14.8142L5.80322 14.8142Z" fill="#141519"/>
                            <path d="M12.5782 3.20568V6.28793H11.3615V3.20568C11.3615 2.98668 11.1668 2.88123 11.037 2.88123C10.9964 2.88123 10.9559 2.88934 10.9153 2.90556L4.48296 5.33081C4.05305 5.49303 3.77726 5.89859 3.77726 6.36093V6.90438C3.03912 7.45594 2.56055 8.34006 2.56055 9.33774V6.36093C2.56055 5.3957 3.15268 4.53591 4.05305 4.19524L10.4935 1.76189C10.672 1.697 10.8585 1.66455 11.037 1.66455C11.8481 1.66455 12.5782 2.32156 12.5782 3.20568Z" fill="#141519"/>
                            <path d="M17.9733 11.7635V12.5746C17.9733 12.7936 17.8029 12.972 17.5758 12.9801H16.3915C15.9616 12.9801 15.5723 12.6638 15.5398 12.242C15.5155 11.9906 15.6128 11.7554 15.7751 11.5931C15.9211 11.439 16.1239 11.3579 16.3429 11.3579H17.5677C17.8029 11.366 17.9733 11.5445 17.9733 11.7635Z" fill="#141519"/>
                            <path d="M16.3338 10.5049H17.1611C17.6073 10.5049 17.9723 10.1399 17.9723 9.69381V9.33692C17.9723 7.6579 16.6014 6.28711 14.9224 6.28711H5.61045C4.92097 6.28711 4.28828 6.51422 3.77726 6.90356C3.03912 7.45512 2.56055 8.33924 2.56055 9.33692V10.7807C2.56055 11.0889 2.885 11.2836 3.17702 11.1863C3.63126 11.0322 4.10983 10.951 4.5884 10.951C7.04617 10.951 9.04969 12.9545 9.04969 15.4122C9.04969 15.9962 8.89558 16.637 8.65223 17.2048C8.52245 17.4968 8.72523 17.8456 9.04158 17.8456H14.9224C16.6014 17.8456 17.9723 16.4748 17.9723 14.7958V14.6416C17.9723 14.1955 17.6073 13.8305 17.1611 13.8305H16.4554C15.6767 13.8305 14.9305 13.352 14.7277 12.5976C14.5655 11.9812 14.7601 11.3809 15.1657 10.9916C15.4658 10.6834 15.8795 10.5049 16.3338 10.5049ZM11.8887 10.3427H7.83298C7.50041 10.3427 7.22462 10.0669 7.22462 9.73437C7.22462 9.40181 7.50041 9.12603 7.83298 9.12603H11.8887C12.2213 9.12603 12.4971 9.40181 12.4971 9.73437C12.4971 10.0669 12.2213 10.3427 11.8887 10.3427Z" fill="#141519"/>
                        </svg>
                        <span className="text-sm text-black font-semibold">
                            Connect Wallet to Trade
                        </span>
                    </Button>
                )}
                {isConnected && (
                    <Button 
                        disabled={formValues.buying.amount==="" && formValues.selling.amount === ""}
                        className={formValues.buying.amount==="" && formValues.selling.amount === "" ? "w-full h-auto rounded-xl text-black flex disabled:pointer-events-auto disabled:cursor-not-allowed" : 'w-full h-auto rounded-xl text-black flex'}
                        onClick={() => console.log('Initiate Trade')}
                    >
                        <span className="text-sm text-black font-semibold">
                            {formValues.buying.amount === '' && formValues.selling.amount === '' ? 'Enter Amount' : 'Trade'}
                        </span>
                    </Button>
                )}
                <WalletModal 
                    isOpen={isWalletModalOpen} 
                    onClose={() => setIsWalletModalOpen(false)}
                />
            </CardFooter>
        </Card>
    )
}