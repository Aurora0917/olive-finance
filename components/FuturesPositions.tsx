'use client'
import { useContext, useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { WalletIcon } from "@/public/svgs/icons";
import WalletModal from "./WalletModal";
import ProtectedRoute from "./ProtectedRoute";
import OpenFutures from "./OpenFutures";
import Pagination from "./Pagination";
import ExpiredFutures from "./ExpiredFutures";
import FuturesOrderHistory from "./FuturesOrderHistory";
import { ContractContext } from "@/contexts/contractProvider";
import { useDataContext } from "@/contexts/dataProvider";
import { FuturePos, FuturesTransaction } from "@/lib/data/WalletActivity";
import { tokenList } from "@/lib/data/tokenlist";
import { useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import { RefreshCw } from "lucide-react";
import LimitOrders from "./LimitOrders";

const Fallback = () => {
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
    return (
        <div className="w-full m-auto p-6 flex h-[186px] justify-center items-center">
            <div className="flex flex-col gap-3 items-center">
                <span>To view your orders</span>
                <Button
                    onClick={() => setIsWalletModalOpen(true)}
                    className="text-background rounded-sm bg-primary hover:bg-gradient-primary"
                >
                    <WalletIcon />
                    <span className="text-sm font-semibold">Connect Wallet</span>
                </Button>
                <WalletModal
                    isOpen={isWalletModalOpen}
                    onClose={() => setIsWalletModalOpen(false)}
                />
            </div>
        </div>
    )
}

const LoadingSection = () => (
    <div className="px-6 py-8 text-center">
        <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto"></div>
        </div>
        <p className="text-gray-500 mt-4">Loading positions...</p>
    </div>
);

const EmptySection = ({ message }: { message: string }) => (
    <div className="px-6 py-8 text-center text-gray-500">
        <div className="mb-4">
            <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2m10-1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-3a1 1 0 011-1h3z"
                />
            </svg>
        </div>
        <p>{message}</p>
    </div>
);

export default function FuturesPositions() {
    // Get data from backend API
    const {
        positions: backendPositions,
        transactions,
        isLoadingPositions: positionsLoading,
        refreshUserData: refreshPerpPositions,
    } = useDataContext();

    // Convert backend Position[] to FuturePos[]
    const perpPositions: FuturePos[] = (backendPositions || [])
        .filter(pos => pos.contractType === 'perp' && pos.orderType === 'market' && pos.isActive === true)
        .map(pos => {
            // Find the token from tokenList based on pool name
            const tokenSymbol = pos.poolName.split('/')[0] || 'SOL';
            const foundToken = tokenList.find(t => t.symbol === tokenSymbol) || tokenList[0]; // Default to SOL
            return {
                index: pos.index,
                token: foundToken,
                symbol: pos.poolName,
                futureType: 'perps' as const,
                position: pos.positionSide,
                entryPrice: pos.entryPrice,
                LiqPrice: pos.liquidationPrice,
                size: pos.positionSize,
                lockedAmount: pos.lockedAmount,
                collateralAmount: pos.collateralAmount,
                collateral: pos.collateralUSD,
                TPSL: pos.takeProfitPrice || pos.stopLossPrice || 0,
                logo: foundToken.iconPath,
                leverage: pos.leverage,
                purchaseDate: (pos.executionTime || 0).toString(),
                unrealizedPnl: pos.unrealizedPnl,
                marginRatio: (pos.collateralUSD / pos.positionSize) * 100,
                accountAddress: pos.positionId
            };
        });

    const limitOrders: FuturePos[] = (backendPositions || [])
        .filter(pos => pos.contractType === 'perp' && pos.orderType === 'limit' && pos.isActive === true)
        .map(pos => {
            // Find the token from tokenList based on pool name
            const tokenSymbol = pos.poolName.split('/')[0] || 'SOL';
            const foundToken = tokenList.find(t => t.symbol === tokenSymbol) || tokenList[0]; // Default to SOL
            return {
                index: pos.index,
                token: foundToken,
                symbol: pos.poolName,
                futureType: 'perps' as const,
                position: pos.positionSide,
                entryPrice: pos.entryPrice,
                LiqPrice: pos.liquidationPrice,
                size: pos.positionSize,
                lockedAmount: pos.lockedAmount,
                collateralAmount: pos.collateralAmount,
                triggerPrice: pos.triggerPrice,
                collateral: pos.collateralUSD,
                TPSL: pos.takeProfitPrice || pos.stopLossPrice || 0,
                logo: foundToken.iconPath,
                leverage: pos.leverage,
                purchaseDate: pos.openedAt.toString(),
                unrealizedPnl: pos.unrealizedPnl,
                marginRatio: (pos.collateralUSD / pos.positionSize) * 100,
                accountAddress: pos.positionId
            };
        });

    const donePositions: FuturePos[] = (backendPositions || [])
        .filter(pos => pos.orderType === 'market' && pos.isActive === false)
        .map(pos => {
            // Find the token from tokenList based on pool name
            const tokenSymbol = pos.poolName.split('/')[0] || 'SOL';
            const foundToken = tokenList.find(t => t.symbol === tokenSymbol) || tokenList[0]; // Default to SOL
            return {
                index: pos.index,
                token: foundToken,
                symbol: pos.poolName,
                futureType: 'perps' as const,
                position: pos.positionSide,
                entryPrice: pos.entryPrice,
                LiqPrice: pos.liquidationPrice,
                size: pos.positionSize,
                lockedAmount: pos.lockedAmount,
                collateralAmount: pos.collateralAmount,
                triggerPrice: pos.triggerPrice,
                collateral: pos.collateralUSD,
                TPSL: pos.takeProfitPrice || pos.stopLossPrice || 0,
                logo: foundToken.iconPath,
                leverage: pos.leverage,
                purchaseDate: pos.openedAt.toString(),
                unrealizedPnl: pos.unrealizedPnl,
                marginRatio: (pos.collateralUSD / pos.positionSize) * 100,
                accountAddress: pos.positionId
            };
        });

    // Get transaction functions from contract provider
    const {
        onClosePerp,
        onAddCollateral,
        onRemoveCollateral,
        onCancelLimitPerp,
        program,
    } = useContext(ContractContext);

    const [activeTab, setActiveTab] = useState('positions');
    const [currentPage, setCurrentPage] = useState(1);
    const [isClosing, setIsClosing] = useState<number | null>(null);
    const [expiredPositions, setExpiredPositions] = useState<FuturePos[]>([]);
    const [futuresTransactions, setFuturesTransactions] = useState<FuturesTransaction[]>([]);
    const { connected, publicKey } = useWallet();
    const [isClosingAll, setIsClosingAll] = useState(false);

    const totalPnl = -3.42;
    const totalCollateral = 284.36;

    const itemsPerPage = 5;

    // Get wallet address for backend integration
    const walletAddress = publicKey?.toBase58() || '';

    // Convert real perp positions to futures transactions for history
    const convertPerpPositionsToTransactions = (positions: FuturePos[]): FuturesTransaction[] => {
        return positions.map((pos, index) => ({
            transactionID: `PERP-${pos.accountAddress || index}-${pos.position}`,
            token: pos.token, // This is now properly a Token object
            transactionType: pos.position, // "long" or "short"
            futureType: "Perps",
            expiry: "N/A", // Perps don't expire
            leverage: pos.leverage,
            purchaseDate: pos.purchaseDate
        }));
    };

    // Update transactions when positions change
    useEffect(() => {
        if (perpPositions.length > 0) {
            const transactions = convertPerpPositionsToTransactions(perpPositions);
            setFuturesTransactions(transactions);
        }
    }, [perpPositions.length == 0]);

    // Pagination calculations for all tabs
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;

    // Get current items for each tab
    const currentPositions = perpPositions.slice(indexOfFirstItem, indexOfLastItem);
    const currentLimitOrders = limitOrders.slice(indexOfFirstItem, indexOfLastItem);
    const currentExpiredPositions = expiredPositions.slice(indexOfFirstItem, indexOfLastItem);
    const currentDonePositions = donePositions.slice(indexOfFirstItem, indexOfLastItem);

    // Get total items count for current tab
    const getTotalItemsForCurrentTab = () => {
        switch (activeTab) {
            case 'positions':
                return perpPositions.length;
            case 'orders':
                return limitOrders.length;
            case 'expired':
                return expiredPositions.length;
            case 'history':
                return donePositions.length;
            default:
                return 0;
        }
    };

    const handleClickTab = (value: string) => {
        setActiveTab(value);
        setCurrentPage(1); // Reset to first page when switching tabs
    };

    const handleCollateral = async (position: FuturePos, amount: number, isSol: boolean, isDeposit: boolean) => {
        if (isDeposit) {
            onAddCollateral(position.index, amount, isSol);
        } else {
            onRemoveCollateral(position.index, amount, isSol);
        }
    }

    const handleCancleLimit = async (position: FuturePos, percent: number, receiveToken: string) => {
        if (!position.accountAddress) {
            console.error("Invalid position - no account address");
            return;
        }

        setIsClosing(position.index);
        try {
            const success = await onCancelLimitPerp(percent * 1000000, receiveToken, position.index);
            if (success) {
                console.log("Position closed successfully!");
            } else {
                console.error("Failed to close position");
            }
        } catch (error) {
            console.error("Error closing position:", error);
        } finally {
            setIsClosing(null);
        }
    };

    const handleClosePosition = async (position: FuturePos, percent: number, receiveToken: string) => {
        if (!position.accountAddress) {
            console.error("Invalid position - no account address");
            return;
        }

        setIsClosing(position.index);
        try {
            const success = await onClosePerp(percent * 1000000, receiveToken, position.index);
            if (success) {
                console.log("Position closed successfully!");
            } else {
                console.error("Failed to close position");
            }
        } catch (error) {
            console.error("Error closing position:", error);
        } finally {
            setIsClosing(null);
        }
    };

    // Auto-refresh positions every 30 seconds when viewing positions
    useEffect(() => {
        if (!program) return;

        const interval = setInterval(() => {
            if (activeTab === 'positions' && perpPositions.length > 0) {
                refreshPerpPositions();
            }
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [activeTab, perpPositions.length, refreshPerpPositions, program]);

    // Manual refresh function
    const handleRefresh = () => {
        refreshPerpPositions();
    };

    const handleCloseAllPositions = () => {

    }

    // Helper function to generate pool name from position data
    const generatePoolName = (position: FuturePos): string => {
        return `${position.symbol}-PERPETUAL`;
    };

    // Helper function to get custody token
    const getCustodyToken = (position: FuturePos): string => {
        // Return the token symbol for custody
        return position.symbol || position.token.name || 'UNKNOWN';
    };

    return (
        <div className="w-full border rounded-sm flex flex-col mb-3">
            <section className="border-b rounded-none px-3 md:px-6 py-3 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-0">
                {/* Left side - Tabs */}
                <div className="w-full lg:w-auto">
                    <Tabs defaultValue={activeTab} onValueChange={handleClickTab}>
                        <TabsList className="w-full flex justify-start bg-inherit text-secondary-foreground p-0 gap-2 md:gap-3 lg:gap-6">
                            <TabsTrigger
                                value="positions"
                                className="text-[11px] md:text-sm px-2 py-[2px] border-b rounded-none border-transparent data-[state=active]:border-primary"
                            >
                                Positions ({perpPositions.length})
                            </TabsTrigger>
                            <TabsTrigger
                                value="orders"
                                className="text-[11px] md:text-sm px-2 py-[2px] border-b rounded-none border-transparent data-[state=active]:border-primary"
                            >
                                Orders ({limitOrders.length})
                            </TabsTrigger>
                            <TabsTrigger
                                value="expired"
                                className="text-[11px] md:text-sm px-2 py-[2px] border-b rounded-none border-transparent data-[state=active]:border-primary"
                            >
                                Funding History ({expiredPositions.length})
                            </TabsTrigger>
                            <TabsTrigger
                                value="history"
                                className="text-[11px] md:text-sm px-2 py-[2px] border-b rounded-none border-transparent data-[state=active]:border-primary"
                            >
                                History ({donePositions.length})
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Right side - Metrics and Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 lg:gap-6 w-full lg:w-auto">
                    {/* Refresh Button */}
                    <Button
                        onClick={handleRefresh}
                        disabled={positionsLoading}
                        variant="outline"
                        size="sm"
                        className="p-2 h-8 w-8 flex-shrink-0"
                        title="Refresh positions"
                    >
                        <RefreshCw
                            className={`h-4 w-4 ${positionsLoading ? 'animate-spin' : ''}`}
                        />
                    </Button>
                </div>
            </section>

            <ProtectedRoute fallback={<Fallback />}>
                {activeTab === 'positions' && (
                    <>
                        {/* positionsLoading ? (
                            <LoadingSection />
                        ) :  */currentPositions.length > 0 ? (
                            <>
                                <section className="px-6 py-3 space-y-[10px]">
                                    {currentPositions.map((pos, idx) => {
                                        const positionIndex = perpPositions.findIndex(p =>
                                            p.accountAddress === pos.accountAddress
                                        ) + 1;

                                        return (
                                            <div key={pos.accountAddress || `pos-${idx}`} className="relative">
                                                <OpenFutures
                                                    // Basic position props
                                                    token={pos.token.name}
                                                    logo={pos.logo}
                                                    symbol={pos.symbol}
                                                    type={pos.futureType}
                                                    position={pos.position}
                                                    positionIndex={pos.index}
                                                    leverage={pos.leverage}
                                                    entry={pos.entryPrice}
                                                    liquidation={pos.LiqPrice}
                                                    size={pos.size}
                                                    collateral={pos.collateral}
                                                    collateralAmount={pos.collateralAmount}
                                                    lockedAmount={pos.lockedAmount}
                                                    tpsl={pos.TPSL}
                                                    purchaseDate={pos.purchaseDate}
                                                    unrealizedPnl={pos.unrealizedPnl}

                                                    // Callbacks
                                                    onCollateral={(amount, isSol, isDeposit) => handleCollateral(pos, amount, isSol, isDeposit)}
                                                    onClose={(percent, receiveToken) => handleClosePosition(pos, percent, receiveToken)}
                                                    isClosing={isClosing === positionIndex}

                                                    // Backend integration props
                                                    userId={walletAddress}
                                                    positionId={pos.accountAddress || `${pos.symbol}_${pos.leverage}x_${pos.entryPrice}_${idx}`}
                                                    custody={getCustodyToken(pos)}
                                                    poolName="SOL/USDC"
                                                />

                                                {/* Loading overlay for closing position */}
                                                {isClosing === positionIndex && (
                                                    <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center rounded z-10">
                                                        <div className="bg-white px-4 py-2 rounded shadow-lg">
                                                            <span className="text-sm">Closing position...</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </section>

                                {/* Pagination for positions */}
                                {perpPositions.length > itemsPerPage && (
                                    <div className="px-3 md:px-6 pb-4 w-full">
                                        <Pagination
                                            currentPage={currentPage}
                                            totalItems={perpPositions.length}
                                            itemsPerPage={itemsPerPage}
                                            onPageChange={setCurrentPage}
                                        />
                                    </div>
                                )}
                            </>
                        ) : (
                            <EmptySection message="No open perpetual positions" />
                        )}
                    </>
                )}

                {activeTab === 'orders' && (
                    <>
                        {/* positionsLoading ? (
                            <LoadingSection />
                        ) :  */currentLimitOrders.length > 0 ? (
                            <>
                                <section className="px-6 py-3 space-y-[10px]">
                                    {currentLimitOrders.map((pos, idx) => {
                                        const positionIndex = limitOrders.findIndex(p =>
                                            p.accountAddress === pos.accountAddress
                                        ) + 1;

                                        return (
                                            <div key={pos.accountAddress || `pos-${idx}`} className="relative">
                                                <LimitOrders
                                                    // Basic position props
                                                    token={pos.token.name}
                                                    logo={pos.logo}
                                                    symbol={pos.symbol}
                                                    type={pos.futureType}
                                                    position={pos.position}
                                                    leverage={pos.leverage}
                                                    entry={pos.entryPrice}
                                                    liquidation={pos.LiqPrice}
                                                    size={pos.size}
                                                    collateralAmount={pos.collateralAmount}
                                                    lockedAmount={pos.lockedAmount}
                                                    collateral={pos.collateral}
                                                    triggerPrice={pos.triggerPrice || 0}
                                                    tpsl={pos.TPSL}
                                                    purchaseDate={pos.purchaseDate}
                                                    unrealizedPnl={pos.unrealizedPnl}

                                                    // Callbacks
                                                    onCollateral={(amount, isSol, isDeposit) => handleCollateral(pos, amount, isSol, isDeposit)}
                                                    onClose={(percent, receiveToken) => handleCancleLimit(pos, percent, receiveToken)}
                                                    isClosing={isClosing === positionIndex}

                                                    // Backend integration props
                                                    userId={walletAddress}
                                                    positionId={pos.accountAddress || `${pos.symbol}_${pos.leverage}x_${pos.entryPrice}_${idx}`}
                                                    custody={getCustodyToken(pos)}
                                                    poolName="SOL/USDC"
                                                />

                                                {/* Loading overlay for closing position */}
                                                {isClosing === positionIndex && (
                                                    <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center rounded z-10">
                                                        <div className="bg-white px-4 py-2 rounded shadow-lg">
                                                            <span className="text-sm">Cancelling order...</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </section>

                                {/* Pagination for limit orders */}
                                {limitOrders.length > itemsPerPage && (
                                    <div className="px-3 md:px-6 pb-4 w-full">
                                        <Pagination
                                            currentPage={currentPage}
                                            totalItems={limitOrders.length}
                                            itemsPerPage={itemsPerPage}
                                            onPageChange={setCurrentPage}
                                        />
                                    </div>
                                )}
                            </>
                        ) : (
                            <EmptySection message="No open limit orders" />
                        )}
                    </>
                )}

                {activeTab === 'expired' && (
                    <>
                        {/* positionsLoading ? (
                            <LoadingSection />
                        ) :  */currentExpiredPositions.length > 0 ? (
                            <>
                                <section className="px-6 py-3 space-y-[10px]">
                                    {currentExpiredPositions.map((pos, idx) => (
                                        <ExpiredFutures
                                            key={pos.accountAddress || `expired-${idx}`}
                                        />
                                    ))}
                                </section>

                                {/* Pagination for expired positions */}
                                {expiredPositions.length > itemsPerPage && (
                                    <div className="px-3 md:px-6 pb-4 w-full">
                                        <Pagination
                                            currentPage={currentPage}
                                            totalItems={expiredPositions.length}
                                            itemsPerPage={itemsPerPage}
                                            onPageChange={setCurrentPage}
                                        />
                                    </div>
                                )}
                            </>
                        ) : (
                            <EmptySection message="No expired/liquidated perpetual positions" />
                        )}
                    </>
                )}

                {activeTab === 'history' && (
                    <>
                        {/* positionsLoading ? (
                            <LoadingSection />
                        ) :  */currentDonePositions.length > 0 ? (
                            <>
                                <section className="px-6 py-3 space-y-[10px]">
                                    {currentDonePositions.map((pos, idx) => {
                                        return (
                                            <div key={pos.accountAddress || `pos-${idx}`} className="relative">
                                                <FuturesOrderHistory
                                                    transactions={transactions.filter(transaction => transaction.positionId === pos.accountAddress)}
                                                    token={pos.token.name}
                                                    logo={pos.logo}
                                                    side={pos.position}
                                                    symbol={pos.symbol}
                                                />
                                            </div>
                                        );
                                    })}
                                </section>

                                {/* Pagination for history */}
                                {donePositions.length > itemsPerPage && (
                                    <div className="px-3 md:px-6 pb-4 w-full">
                                        <Pagination
                                            currentPage={currentPage}
                                            totalItems={donePositions.length}
                                            itemsPerPage={itemsPerPage}
                                            onPageChange={setCurrentPage}
                                        />
                                    </div>
                                )}
                            </>
                        ) : (
                            <EmptySection message="No completed positions" />
                        )}
                    </>
                )}
            </ProtectedRoute>
        </div>
    )
}