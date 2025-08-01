'use client'
import Image from "next/image";
import { Badge } from "./ui/badge";
import { useState, useEffect, useMemo } from "react";
import { ArrowDown, ArrowUp } from "@/public/svgs/icons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import Collateral from "./Collateral";
import Tpsl from "./Tpsl";
import CloseFutures from "./CloseFutures";
import SettledTpSls from "./SettledTpSls";
import { usePythPrice } from "@/hooks/usePythPrice";
import { Button } from "./ui/button";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Switch } from './ui/switch'
import apiService from "@/services/apiService";
import { EXIT_FEE } from "@/utils/const";
import PositionSize from "./PositionSize";

interface TpSlOrder {
    id: string;
    type: 'take-profit' | 'stop-loss';
    price: number;
    token: string;
    percentage: number;
    isPartial?: boolean;
}

interface TpSlFormData {
    type: 'take-profit' | 'stop-loss';
    price: number;
    token: string;
    percentage: number;
    isPartial: boolean;
}

interface LimitOrdersProps {
    logo: string;
    token: string;
    symbol: string;
    type: string;
    position: 'long' | 'short'; // Frontend position direction
    leverage: number;
    entry: number;
    liquidation: number;
    size: number;
    collateral: number;
    collateralAmount: number;
    lockedAmount: number;
    tpsl: number;
    purchaseDate: string;
    triggerPrice: number;
    unrealizedPnl?: number;
    onCollateral: (amount: number, isSol: boolean, isDeposit: boolean) => Promise<void>;
    onClose: (percent: number, receiveToken: string) => Promise<void>;
    isClosing?: boolean;
    // Backend integration props
    userId?: string; // User wallet address or identifier
    positionId?: string; // Unique position identifier
    contractType?: 'perp' | 'option';
    custody?: string; // Custody information for backend
    poolName?: string; // Pool name for backend
}

export default function LimitOrders({
    logo,
    token,
    symbol,
    type,
    position,
    leverage,
    entry,
    liquidation,
    size,
    collateral,
    collateralAmount,
    lockedAmount,
    tpsl,
    purchaseDate,
    triggerPrice,
    unrealizedPnl,
    onCollateral,
    onClose,
    isClosing = false,
    userId,
    positionId,
    contractType = 'perp',
    custody,
    poolName
}: LimitOrdersProps) {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const { priceData } = usePythPrice("Crypto.SOL/USD");
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update time every second for real-time relative time display
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000); // Update every second

        return () => clearInterval(timer);
    }, []);

    // Get current market price (mark price)
    const markPrice = priceData?.price || entry;

    return (
        <div className="w-full flex flex-col bg-accent rounded-sm">
            <div
                className="flex-col md:flex-row w-full px-4 py-3 flex justify-between items-center cursor-pointer"
            >
                <div className="flex space-x-[6px] items-center h-10">
                    <img src={logo} alt={token} width={40} height={40} className="w-8 h-8 rounded-full" />
                    <span className="text-sm text-foreground font-medium">{symbol}</span>
                    <Badge className={`${position === "long" ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'} text-xs font-semibold py-[1px] px-1 w-fit h-fit rounded-[3px] flex items-center justify-center`}>
                        {leverage}x {position.charAt(0).toUpperCase() + position.slice(1).toLowerCase()}
                    </Badge>
                    {/* Show backend integration status */}
                    {/* {userId && (
                        <Badge className="bg-blue-500/10 text-blue-400 text-xs font-semibold py-[1px] px-1 w-fit h-fit rounded-[3px] flex items-center justify-center">
                            Live TP/SL
                        </Badge>
                    )} */}
                    {/* Show backend position type */}
                    {userId && contractType && (
                        <Badge className="bg-purple-500/10 text-purple-400 text-xs font-semibold py-[1px] px-1 w-fit h-fit rounded-[3px] flex items-center justify-center">
                            {contractType.toUpperCase()}
                        </Badge>
                    )}
                </div>
                {isOpen ? (
                    <span className='text-secondary-foreground'
                        onClick={() => setIsOpen(!isOpen)}>
                        <ArrowUp />
                    </span>

                ) : (
                    <span className='text-secondary-foreground'
                        onClick={() => setIsOpen(!isOpen)}>
                        <ArrowDown />
                    </span>
                )}
            </div>
            {isOpen && (
                <div className="w-full px-4 pt-2 pb-4 space-y-4 border-backgroundSecondary overflow-hidden">
                    <div className="overflow-x-auto scrollbar-hide">
                        <Table>
                            <TableHeader>
                                <TableRow className="w-full grid grid-cols-5 whitespace-nowrap h-7 min-w-[900px] border-t-[2px] !border-b-0 pt-2 pb-0">
                                    <TableHead className="text-[10px]">Size</TableHead>
                                    <TableHead className="text-[10px]">Collateral</TableHead>
                                    <TableHead className="text-[10px]">Market Price</TableHead>
                                    <TableHead className="text-[10px]">Limit Price</TableHead>
                                    <TableHead className="text-[10px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow className="w-full grid grid-cols-5 min-w-[900px]">
                                    <TableCell className="flex space-x-2 items-center text-xs py-0 text-white underline-offset-4 underline" style={{ textDecorationStyle: 'dotted' }}>
                                        {lockedAmount.toFixed(2)} {token}
                                    </TableCell>
                                    <TableCell className="flex space-x-1 items-center text-xs py-0 text-white underline-offset-4 underline" style={{ textDecorationStyle: 'dotted' }}>
                                        <span>
                                            {collateralAmount.toFixed(2)} {token}
                                        </span>
                                        {/* <Collateral
                                            currentLeverage={leverage}
                                            currentLiquidationPrice={liquidation}
                                            currentCollateral={collateral}
                                            currentPositionSize={size}
                                            entryPrice={entry}
                                            position={position}
                                            markPrice={markPrice}
                                            unrealizedPnl={unrealizedPnl || 0}
                                            onDeposit={async (amount, token) => {
                                                onCollateral(amount, token === "SOL", true);
                                            }}
                                            onWithdraw={async (amount, token) => {
                                                onCollateral(amount, token === "SOL", false);
                                            }}
                                            isProcessing={false}
                                        /> */}
                                    </TableCell>
                                    <TableCell className="flex space-x-2 items-center text-xs py-0 text-white">${markPrice.toFixed(2)}</TableCell>
                                    <TableCell className="flex space-x-2 items-center text-xs py-0 text-white">${triggerPrice.toFixed(2)}</TableCell>
                                    <TableCell className="flex space-x-2 items-right text-xs py-0 text-white">
                                        <CloseFutures
                                            size={size}
                                            markPrice={markPrice}
                                            entryPrice={entry}
                                            collateral={collateral}
                                            position={position}
                                            orderType="limit"
                                            onClose={(closePercent, receiveToken) => {
                                                // Handle the close operation
                                                onClose(closePercent, receiveToken)
                                            }}
                                        />
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>

                    {/* TP/SL Orders Section - Below table to expand container height */}
                    {/* {hasOrders && showTpSlOrders && (
                        <SettledTpSls
                            orders={tpslOrders} // Fallback local orders
                            onCancel={handleCancelTpSlOrder}
                            onUpdatePrice={handleUpdateTpSlPrice}
                            isVisible={showTpSlOrders}
                            onToggleVisibility={handleToggleTpSlOrders}
                            userId={userId}
                            positionId={effectivePositionId}
                            positionSide={position}
                            contractType={contractType}
                            currentPrice={markPrice}
                            onOrdersUpdated={handleOrdersUpdated}
                        />
                    )} */}
                </div>
            )}
        </div>
    )
}