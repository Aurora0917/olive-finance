import {
  Ban,
  EllipsisVertical,
  RotateCw,
} from "lucide-react";
import { Button } from "./ui/button";
import { useContext, useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import OpenPositions from "./OpenPositions";
import OrderHistory from "./OrderHistory";
import ExpiredOptions from "./ExpiredOptions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ContractContext } from "@/contexts/contractProvider";
import { useDataContext } from "@/contexts/dataProvider";
import { tokenList } from "@/lib/data/tokenlist";
import { coins } from "@/lib/data/coins";
import Pagination from "./Pagination";
import OpenOptionOrders from "./OpenOptionOrders";
import { motion, AnimatePresence } from "framer-motion";
import { usePythPrice } from "@/hooks/usePythPrice";

export default function TradingPositions() {
  const [activeTab, setActiveTab] = useState<string>("Positions");
  const [currentPage, setCurrentPage] = useState(1);
  const { priceData, loading: priceLoading } = usePythPrice('Crypto.SOL/USD');
  const itemsPerPage = 5;

  // Get data from backend API
  const {
    positions: backendPositions,
    transactions: backendTransactions,
    isLoadingPositions: positionsLoading,
    refreshUserData: refreshPositions,
  } = useDataContext();
  
  // Convert backend transactions to frontend Transaction format
  const donePositions = backendTransactions.map(tx => {
    const tokenSymbol = tx.poolName?.split('/')[0] || 'SOL';
    const foundToken = tokenList.find(t => t.symbol === tokenSymbol) || tokenList[0];
    const coinToken = coins.find(c => c.symbol === tokenSymbol) || coins[0];
    
    return {
      transactionID: tx.signature,
      token: coinToken,
      transactionType: tx.transactionType || 'unknown',
      optionType: tx.transactionType === 'openOption' ? 'Call' : 'Put', // Approximate based on transaction type
      expiry: tx.timestamp ? new Date(tx.timestamp).toISOString() : '',
      strikePrice: tx.price || 0,
      timestamp: tx.timestamp ? new Date(tx.timestamp).getTime() : Date.now()
    };
  });
  
  // Convert backend Position[] to frontend Position[] format for options
  const positions = backendPositions
    .filter(pos => pos.contractType === 'option')
    .map(pos => ({
      // Map backend position to frontend format
      index: parseInt(pos.positionId) || 0,
      optionType: pos.side ? 'Call' : 'Put',
      size: pos.positionSize,
      strikePrice: pos.entryPrice, // Approximate mapping
      expiry: (new Date(pos.openedAt).getTime() + (7 * 24 * 60 * 60 * 1000)).toString(), // 7 days from open
      premium: pos.fees,
      profit: pos.unrealizedPnl,
      expired: false, // Backend would need to indicate this
      purchaseDate: new Date(pos.openedAt).toLocaleDateString(),
      // Add other required fields with defaults
      token: pos.poolName.split('/')[0] || 'SOL',
      logo: '/images/solana.png',
      greeks: { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 },
      // Add missing properties for option filtering
      limitPrice: pos.positionType === 'limit' ? pos.entryPrice : 0,
      executed: pos.isActive, // If position is active, it means it was executed
      quantity: pos.positionSize,
      symbol: pos.poolName.split('/')[0] || 'SOL',
      type: pos.side ? 'Call' : 'Put',
      entryPrice: pos.entryPrice,
      pnl: pos.unrealizedPnl
    }));
  
  // Get transaction functions from contract provider
  const {
    onClaimOption,
    onExerciseOption,
    onCloseLimitOption
  } = useContext(ContractContext);
  
  // Filter expired positions from positions data and map to ExpiredOption format
  const expiredPositions = positions
    .filter(pos => pos.expired === true)
    .map(pos => ({
      index: pos.index,
      token: pos.token,
      transaction: pos.optionType,
      strikePrice: pos.strikePrice,
      qty: pos.quantity,
      expiryPrice: pos.strikePrice, // Using strike price as approximation
      tokenAmount: pos.quantity,
      dollarAmount: pos.profit,
      iconPath: pos.logo
    }));

  const handleClickTab = (state: string) => {
    if (activeTab !== state) {
      setActiveTab(state);
      setCurrentPage(1); // Reset to first page when switching tabs
    }
  };

  const onClaim = (optionindex: number, solPrice: number) => {
    onClaimOption(optionindex, solPrice);
  };

  const onExercise = (index: number) => {
    onExerciseOption(index);
  };

  // Set up an interval to refresh positions data
  useEffect(() => {
    // Initial load
    refreshPositions();

    // Set up interval for periodic refresh (every 30 seconds)
    const intervalId = setInterval(() => {
      refreshPositions();
    }, 30000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []); // Empty dependency array to run only once on mount

  const actionTextMap: Record<string, string> = {
    Positions: "Close all",
    OpenOrders: "Cancel all",
    Expired: "Claim all",
  };

  // Filter positions based on limitPrice
  const actualPositions = positions?.filter(position => position.limitPrice === 0 || position.executed === true) || [];
  const actualOrders = positions?.filter(position => position.limitPrice !== 0 && position.executed === false) || [];

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedPositions = actualPositions.slice(indexOfFirstItem, indexOfLastItem);
  const paginatedOrders = actualOrders.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="w-full h-fit border rounded-sm flex flex-col">
      <div className="w-full flex justify-between px-3 py-1 md:px-6 md:py-3 border-b">
        <Tabs defaultValue={activeTab} className="p-0">
          <TabsList className="w-full flex bg-inherit text-secondary-foreground p-0 gap-2 md:gap-3 lg:gap-6">
            <TabsTrigger
              value="Positions"
              className="text-[11px] md:text-sm px-2 py-[2px] border-b rounded-none border-transparent data-[state=active]:border-primary"
              onClick={() => handleClickTab("Positions")}
            >
              Positions
            </TabsTrigger>
            <TabsTrigger
              value="OpenOrders"
              className="text-[11px] md:text-sm px-2 py-[2px] border-b rounded-none border-transparent data-[state=active]:border-primary"
              onClick={() => handleClickTab("OpenOrders")}
            >
              Orders
            </TabsTrigger>
            <TabsTrigger
              value="Expired"
              className="text-[11px] md:text-sm px-2 py-[2px] border-b rounded-none border-transparent data-[state=active]:border-primary"
              onClick={() => handleClickTab("Expired")}
            >
              Expired
            </TabsTrigger>
            <TabsTrigger
              value="History"
              className="text-[11px] md:text-sm px-2 py-[2px] border-b rounded-none border-transparent data-[state=active]:border-primary"
              onClick={() => handleClickTab("History")}
            >
              History
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="hidden md:flex gap-3 items-center">
          <Button
            className="bg-secondary p-2 w-full h-auto rounded-sm"
            onClick={() => refreshPositions()}
            disabled={positionsLoading}
          >
            <RotateCw className={`text-secondary-foreground ${positionsLoading ? 'animate-spin' : ''}`} />
          </Button>
          {activeTab !== 'History' && (
            <Button className="bg-secondary w-full h-auto py-[6px] px-[10px] rounded-sm">
              <Ban className="text-secondary-foreground p-0" />
              {actionTextMap[activeTab] && (
                <span className="text-sm font-normal text-secondary-foreground p-0">
                  {actionTextMap[activeTab]}
                </span>
              )}
            </Button>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-inherit p-[6px] w-fit h-auto rounded-sm md:hidden shadow-none">
              <EllipsisVertical className="text-secondary-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="p-1 min-w-fit rounded-[12px]"
          >
            <DropdownMenuItem
              className="space-x-[6px] gap-0 w-fit"
              onClick={() => refreshPositions()}
            >
              <RotateCw className={`w-fit text-secondary-foreground ${positionsLoading ? 'animate-spin' : ''}`} />
              <span>Reload</span>
            </DropdownMenuItem>
            {activeTab !== 'History' && (
              <DropdownMenuItem className="w-fit space-x-[6px] gap-0">
                <Ban className="text-secondary-foreground" />
                {actionTextMap[activeTab] && (
                  <span className="text-sm font-normal text-secondary-foreground p-0">
                    {actionTextMap[activeTab]}
                  </span>
                )}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {activeTab === "Positions" && (
        <div className="px-3 md:px-6 py-4 pb-[10px] space-y-[10px] min-h-[300px] flex flex-col justify-between">
          <div className="space-y-[10px] flex-grow">
            <AnimatePresence>
              {actualPositions && actualPositions.length > 0 ? (
                paginatedPositions.map((position, index) => (
                  <OpenPositions
                    key={position.index}
                    index={position.index}
                    token={position.token}
                    logo={position.logo}
                    symbol={position.symbol}
                    type={position.type}
                    strikePrice={position.strikePrice}
                    entryPrice={position.entryPrice}
                    limitPrice={position.limitPrice}
                    expiry={position.expiry}
                    currentPrice={priceData?.price || 0}
                    size={parseInt(position.quantity.toString())}
                    pnl={position.pnl}
                    purchaseDate={position.purchaseDate}
                    greeks={position.greeks}
                    onExercise={() => onExercise(position.index)}
                  />
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-muted-foreground text-center flex flex-grow justify-center items-center"
                >
                  {positionsLoading ? "Loading positions..." : "No Positions Open \n Start Trading Now"}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {actualPositions && actualPositions.length > 0 && (
            <div className="pb-4 w-full">
              <Pagination
                currentPage={currentPage}
                totalItems={actualPositions.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === "OpenOrders" && (
        <div className="px-3 md:px-6 py-4 pb-[10px] space-y-[10px] min-h-[300px] flex flex-col justify-between">
          <div className="space-y-[10px] flex-grow">
            {actualOrders && actualOrders.length > 0 ? (
              <>
                {paginatedOrders.map((order, idx) => (
                  <OpenOptionOrders
                    key={idx}
                    logo={order.logo}
                    token={order.token}
                    symbol={order.symbol}
                    type={order.type}
                    limitPrice={order.limitPrice || 0}
                    transaction={"buy"}
                    strikePrice={order.strikePrice}
                    expiry={order.expiry}
                    size={parseInt(order.quantity.toString())}
                    orderDate={order.purchaseDate || ''}
                    onCancel={() => onCloseLimitOption(order.index, parseInt(order.quantity.toString()))}
                  />
                ))}
              </>
            ) : (
              <div className="text-sm text-muted-foreground text-center flex flex-grow justify-center items-center">
                {positionsLoading ? "Loading orders..." : "No Orders Open \n Start Trading Now"}
              </div>
            )}
          </div>
          {actualOrders && actualOrders.length > 0 && (
            <div className="pb-4 w-full">
              <Pagination
                currentPage={currentPage}
                totalItems={actualOrders.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === "Expired" && (
        <div className="md:pb-[44px] min-h-[300px] flex">
          {expiredPositions && expiredPositions.length > 0 ? (
            <ExpiredOptions infos={expiredPositions} onClaim={onClaim} />
          ) : (
            <div className="text-sm text-muted-foreground text-center flex flex-grow justify-center items-center">
              {positionsLoading ? "Loading expired positions..." : "No Expired Positions \n Start Trading Now"}
            </div>
          )}
        </div>
      )}

      {activeTab === "History" && (
        <div className="px-3 md:px-6 py-4 pb-[20px] md:pb-[10px] space-y-[10px] min-h-[300px] flex flex-col justify-between">
          <div className="flex-grow">
            {donePositions && donePositions.length > 0 ? (
              <OrderHistory doneOptioninfos={donePositions} />
            ) : (
              <div className="text-sm text-muted-foreground text-center flex flex-grow justify-center items-center">
                {positionsLoading ? "Loading history..." : "No History Available\n Start Trading Now"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}