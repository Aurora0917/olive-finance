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
import { FuturePos, FuturesTransaction } from "@/lib/data/WalletActivity";
import { useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import { RefreshCw } from "lucide-react";

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
    const {
        perpPositions,
        positionsLoading,
        onClosePerp,
        onAddCollateral,
        onRemoveCollateral,
        refreshPerpPositions,
        donePositions,
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

    // Debug wallet connection
    useEffect(() => {
        console.log('🔍 Wallet Integration Debug:', {
            publicKey: publicKey?.toBase58(),
            finalWalletAddress: walletAddress,
            hasWallet: !!walletAddress
        });
    }, [publicKey, walletAddress]);

    // Convert real perp positions to futures transactions for history
    const convertPerpPositionsToTransactions = (positions: FuturePos[]): FuturesTransaction[] => {
        return positions.map((pos, index) => ({
            transactionID: `PERP-${pos.accountAddress || index}-${pos.position}`,
            token: pos.token,
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
    }, [perpPositions]);

    // Filter expired positions (for perps, these would be liquidated positions)
    useEffect(() => {
        // For perpetual positions, "expired" could mean liquidated positions
        // Since perpPositions only contains active positions, expired would be empty
        // unless you fetch liquidated positions separately from your smart contract
        setExpiredPositions([]);
    }, [perpPositions]);

    // Pagination calculations
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;

    const currentPositions = perpPositions.slice(indexOfFirstItem, indexOfLastItem);
    const currentExpiredPositions = expiredPositions.slice(indexOfFirstItem, indexOfLastItem);
    const currentTransactions = futuresTransactions.slice(indexOfFirstItem, indexOfLastItem);

    const handleClickTab = (value: string) => {
        setActiveTab(value);
        setCurrentPage(1);
    };

    const handleCollateral = async (position: FuturePos, amount: number, isSol: boolean, isDeposit: boolean) => {
        if (isDeposit) {
            onAddCollateral(position.accountAddress, amount, isSol);
        } else {
            onRemoveCollateral(position.accountAddress, amount, isSol);
        }
    }

    const handleClosePosition = async (position: FuturePos, percent: number, receiveToken: string, exitPrice: number) => {
        if (!position.accountAddress) {
            console.error("Invalid position - no account address");
            return;
        }

        // For closing, we need to find the position index from the smart contract
        const positionIndex = perpPositions.findIndex(p =>
            p.accountAddress === position.accountAddress
        ); // +1 because smart contract might use 1-based indexing

        setIsClosing(positionIndex);
        try {
            const success = await onClosePerp(position.accountAddress, percent, receiveToken, exitPrice);
            if (success) {
                console.log("Position closed successfully!");
                // Position will be automatically removed from the list via refresh
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
                                Positions
                            </TabsTrigger>
                            <TabsTrigger
                                value="Orders"
                                className="text-[11px] md:text-sm px-2 py-[2px] border-b rounded-none border-transparent data-[state=active]:border-primary"
                            >
                                Orders
                            </TabsTrigger>
                            <TabsTrigger
                                value="expired"
                                className="text-[11px] md:text-sm px-2 py-[2px] border-b rounded-none border-transparent data-[state=active]:border-primary"
                            >
                                Funding History
                            </TabsTrigger>
                            <TabsTrigger
                                value="history"
                                className="text-[11px] md:text-sm px-2 py-[2px] border-b rounded-none border-transparent data-[state=active]:border-primary"
                            >
                                History
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Right side - Metrics and Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 lg:gap-6 w-full lg:w-auto">
                    {/* Metrics Container */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 lg:gap-6">
                        {/* Total PnL */}
                        {/* <div className="flex flex-row border-[1px] px-1 py-1.5 rounded">
                            <span className='text-[10px] md:text-xs text-secondary-foreground tracking-wide mr-2'>
                                Total PnL:
                            </span>
                            <span className={`text-xs font-semibold ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {totalPnl >= 0 ? '+' : '-'}${Math.abs(totalPnl).toFixed(2)}
                            </span>
                        </div> */}

                        {/* Total Collateral */}
                        {/* <div className="flex flex-row border-[1px] px-1 py-1.5 rounded">
                            <span className='text-[10px] md:text-xs text-secondary-foreground tracking-wide mr-2'>
                                Total Collateral:
                            </span>
                            <span className="text-xs font-semibold text-foreground">
                                ${totalCollateral.toFixed(2)}
                            </span>
                        </div> */}

                        {/* Close All Positions Button */}
                        {/* <Button
                            onClick={handleCloseAllPositions}
                            disabled={currentPositions.length === 0 || isClosingAll}
                            size="sm"
                            variant="outline"
                            className="text-[11px] md:text-xs px-3 py-1.5 h-auto whitespace-nowrap text-foreground bg-transparent"
                        >
                            {isClosingAll ? "Closing..." : "Close All Positions"}
                        </Button> */}
                    </div>

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

            {/* Wallet connection status display */}
            {/* {walletAddress && (
                <div className="px-6 py-2 bg-blue-500/10 border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-xs text-blue-400">
                                Live TP/SL Integration Active
                            </span>
                        </div>
                        <span className="text-xs text-secondary-foreground">
                            Wallet: {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
                        </span>
                    </div>
                </div>
            )} */}

            <ProtectedRoute fallback={<Fallback />}>
                {activeTab === 'positions' && (
                    <>
                        {positionsLoading ? (
                            <LoadingSection />
                        ) : currentPositions.length > 0 ? (
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
                                                leverage={pos.leverage}
                                                entry={pos.entryPrice}
                                                liquidation={pos.LiqPrice}
                                                size={pos.size}
                                                collateral={pos.collateral}
                                                tpsl={pos.TPSL}
                                                purchaseDate={pos.purchaseDate}
                                                unrealizedPnl={pos.unrealizedPnl}

                                                // Callbacks
                                                onCollateral={(amount, isSol, isDeposit) => handleCollateral(pos, amount, isSol, isDeposit)}
                                                onClose={(percent, receiveToken, exitPrice) => handleClosePosition(pos, percent, receiveToken, exitPrice)}
                                                isClosing={isClosing === positionIndex}

                                                // Backend integration props
                                                userId={walletAddress} // User's wallet address
                                                positionId={pos.accountAddress || `${pos.symbol}_${pos.leverage}x_${pos.entryPrice}_${idx}`} // Position identifier
                                                custody={getCustodyToken(pos)} // Custody token
                                                poolName="SOL/USDC" // Pool name
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
                        ) : (
                            <EmptySection message="No open perpetual positions" />
                        )}

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
                )}

                {activeTab === 'expired' && (
                    <>
                        {expiredPositions.length > 0 ? (
                            <>
                                <section className="px-6 py-3 space-y-[10px]">
                                    {currentExpiredPositions.map((pos, idx) => (
                                        <ExpiredFutures
                                            key={pos.accountAddress || `expired-${idx}`}
                                        // Pass the expired position data
                                        // position={pos}
                                        />
                                    ))}
                                </section>
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
                        {positionsLoading ? (
                            <LoadingSection />
                        ) : currentPositions.length > 0 ? (
                            <section className="px-6 py-3 space-y-[10px]">
                                {currentPositions.map((pos, idx) => {
                                    const positionIndex = perpPositions.findIndex(p =>
                                        p.accountAddress === pos.accountAddress
                                    ) + 1;

                                    return (
                                        <div key={pos.accountAddress || `pos-${idx}`} className="relative">
                                            <FuturesOrderHistory
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
                                                collateral={pos.collateral}
                                                tpsl={pos.TPSL}
                                                purchaseDate={pos.purchaseDate}
                                                unrealizedPnl={pos.unrealizedPnl}

                                                // Callbacks
                                                onCollateral={(amount, isSol, isDeposit) => handleCollateral(pos, amount, isSol, isDeposit)}
                                                onClose={(percent, receiveToken, exitPrice) => handleClosePosition(pos, percent, receiveToken, exitPrice)}
                                                isClosing={isClosing === positionIndex}

                                                // Backend integration props
                                                userId={walletAddress} // User's wallet address
                                                positionId={pos.accountAddress || `${pos.symbol}_${pos.leverage}x_${pos.entryPrice}_${idx}`} // Position identifier
                                                custody={getCustodyToken(pos)} // Custody token
                                                poolName="SOL/USDC" // Pool name
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
                        ) : (
                            <EmptySection message="No open perpetual positions" />
                        )}

                        {/* Pagination for positions */}
                        {futuresTransactions.length > itemsPerPage && (
                            <div className="px-3 md:px-6 pb-4 w-full">
                                <Pagination
                                    currentPage={currentPage}
                                    totalItems={futuresTransactions.length}
                                    itemsPerPage={itemsPerPage}
                                    onPageChange={setCurrentPage}
                                />
                            </div>
                        )}
                    </>
                )}
            </ProtectedRoute>
        </div>
    )
}