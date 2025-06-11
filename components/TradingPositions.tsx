import {
  Ban,
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
  RotateCw,
} from "lucide-react";
import { Button } from "./ui/button";
import { useContext, useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import OpenPositions from "./OpenPositions";
import OrderHistory from "./OrderHistory";
import { Position, positions } from "@/lib/data/Positions";
import ExpiredOptions from "./ExpiredOptions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ContractContext, ExpiredOption } from "@/contexts/contractProvider";
import { Transaction } from "@/lib/data/WalletActivity";
import { BN } from "@coral-xyz/anchor";
import Pagination from "./Pagination";
import { motion, AnimatePresence } from "framer-motion";

export default function TradingPositions() {
  const [activeTab, setActiveTab] = useState<string>("Positions");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  const { 
    positions, 
    expiredPositions, 
    donePositions, 
    refreshPositions, 
    positionsLoading, 
    onClaimOption, 
    onExerciseOption 
  } = useContext(ContractContext);

  const handleClickTab = (state: string) => {
    if (activeTab !== state) {
      setActiveTab(state);
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

  return (
    <div className="w-full h-fit border rounded-sm flex flex-col">
      <div className="w-full flex justify-between px-3 py-1 md:px-6 md:py-3 border-b">
        <Tabs defaultValue={activeTab} className="p-0">
          <TabsList className="w-full grid grid-cols-3 bg-inherit text-secondary-foreground p-0 gap-2 md:gap-6">
            <TabsTrigger
              value="Positions"
              className="text-[11px] md:text-sm px-2 py-[2px] border-b rounded-none border-transparent data-[state=active]:border-primary"
              onClick={() => handleClickTab("Positions")}
            >
              Open Positions
            </TabsTrigger>
            <TabsTrigger
              value="Expired"
              className="text-[11px] md:text-sm px-2 py-[2px] border-b rounded-none border-transparent data-[state=active]:border-primary"
              onClick={() => handleClickTab("Expired")}
            >
              Expired Positions
            </TabsTrigger>
            <TabsTrigger
              value="History"
              className="text-[11px] md:text-sm px-2 py-[2px] border-b rounded-none border-transparent data-[state=active]:border-primary"
              onClick={() => handleClickTab("History")}
            >
              Order History
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
          <Button className="bg-secondary w-full h-auto py-[6px] px-[10px] rounded-sm">
            <Ban className="text-secondary-foreground p-0" />
            <span className="text-sm font-normal text-secondary-foreground p-0">
              Cancel all
            </span>
          </Button>
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
            <DropdownMenuItem className="w-fit space-x-[6px] gap-0">
              <Ban className="text-secondary-foreground" />
              <span>Cancel All</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {activeTab === "Positions" && (
        <div className="px-3 md:px-6 py-4 pb-[10px] space-y-[10px]">
          <AnimatePresence>
            {positions && positions.length > 0 ? (
              positions.map((position, index) => (
                <OpenPositions
                  key={position.index}
                  index={position.index}
                  token={position.token}
                  logo={position.logo}
                  symbol={position.symbol}
                  type={position.type}
                  strikePrice={position.strikePrice}
                  expiry={position.expiry}
                  size={position.size}
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
                className="w-full text-center py-4 text-secondary-foreground"
              >
                {positionsLoading ? "Loading positions..." : "No open positions"}
              </motion.div>
            )}
          </AnimatePresence>
          {positions && positions.length > 0 && (
            <div className="pb-4 w-full">
              <Pagination
                currentPage={currentPage}
                totalItems={positions.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}
      {activeTab === "Expired" && (
        <div className="md:pb-[44px]">
          <ExpiredOptions infos={expiredPositions} onClaim={onClaim} />
        </div>
      )}
      {activeTab === "History" && (
        <div className="px-3 md:px-6 py-4 pb-[20px] md:pb-[10px]">
          <OrderHistory doneOptioninfos={donePositions} />
        </div>
      )}
    </div>
  );
}
