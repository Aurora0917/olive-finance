'use client'

import { Transaction } from "@/lib/data/WalletActivity"
import { CallIconDark, CopyIcon, PutIconDark, SendIcon } from "@/public/svgs/icons"
import Image from "next/image"
import { Separator } from "./ui/separator"
import { Badge } from "./ui/badge"

export default function OrderHistory({doneOptioninfos}:{doneOptioninfos:Transaction[]}){
    return (
        <>
            <div className="w-full hidden md:flex flex-col space-y-[14px]">
                {doneOptioninfos && doneOptioninfos.map((tx) => (
                    <div className="w-full flex justify-between items-center" key={tx.transactionID}>
                        <div className="w-full flex space-x-[10px] items-center">
                            <div className="flex flex-col -space-y-0.5 justify-center items-center h-9">
                                <Image src={tx.token.logo} alt='eth icon' width={20} height={20} className="rounded-full" />
                                <div className="rounded-full ring ring-background">
                                    {tx.transactionType === 'Put' ? (
                                        <PutIconDark width="20" height="20"/>
                                    ):(
                                        <CallIconDark width="20" height="20"/>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col justify-center">
                                <span className="text-xs text-foreground font-medium">{tx.transactionID}</span>
                                <div className="flex items-center space-x-2">
                                    <span className="text-xs text-secondary-foreground font-normal">
                                        {tx.token.name} • {tx.transactionType} Option • 
                                        <span className="px-1">Buy</span>
                                    </span>
                                    <Badge className="text-[8px] bg-gradient-primary border-none text-black font-semibold py-[3px] px-1 w-fit h-3 rounded-[3px] flex items-center justify-center">
                                        ${tx.strikePrice}
                                    </Badge>
                                </div>
                                <span className="text-xs text-secondary-foreground font-normal">
                                    {tx.timestamp ? new Date(tx.timestamp).toLocaleString() : "Unknown date"}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col justify-center">
                            <div className="flex justify-end space-x-2">
                                <CopyIcon />
                                <SendIcon />
                            </div>
                            <span className="text-xs text-secondary-foreground font-normal flex items-center whitespace-nowrap">
                                Expiry: {tx.expiry}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
            <div className="w-full md:hidden flex flex-col">
                {doneOptioninfos && doneOptioninfos.map((tx, index) => (
                    <div key={`${tx.transactionID}-${index}`} className="w-full">
                        <div className="w-full flex flex-col space-y-3 items-center">
                            <div className="w-full flex space-x-[10px] items-center">
                                <div className="flex flex-col -space-y-0.5 justify-center items-center h-9">
                                    <Image src={tx.token.logo} alt='eth icon' width={20} height={20} className="rounded-full" />
                                    <div className="rounded-full ring ring-background">
                                        {tx.transactionType === 'Put' ? (
                                            <PutIconDark width="20" height="20"/>
                                        ):(
                                            <CallIconDark width="20" height="20"/>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col justify-center">
                                    <span className="text-xs text-foreground font-medium">{tx.transactionID}</span>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs text-secondary-foreground font-normal">
                                            {tx.token.name} • {tx.transactionType} Option • 
                                            <span className="px-1">Buy</span>
                                        </span>
                                        <Badge className="text-[8px] bg-gradient-primary border-none text-black font-semibold py-[3px] px-1 w-fit h-3 rounded-[3px] flex items-center justify-center">
                                            ${tx.strikePrice}
                                        </Badge>
                                    </div>
                                    <span className="text-xs text-secondary-foreground font-normal">
                                        {tx.timestamp ? new Date(tx.timestamp).toLocaleString() : "Unknown date"}
                                    </span>
                                </div>
                            </div>
                            <div className="w-full flex justify-between">
                                <span className="text-xs text-secondary-foreground font-normal flex items-center whitespace-nowrap">
                                    Expiry: {tx.expiry}
                                </span>
                                <div className="flex justify-end space-x-2 text-secondary-foreground">
                                    <CopyIcon />
                                    <SendIcon />
                                </div>
                            </div>
                        </div>
                        {index !== doneOptioninfos.length - 1 && (
                            <Separator className="my-[14px]"/>
                        )}
                    </div>
                ))}
            </div>
        </>
    )
}