"use client";

import React, { ReactElement } from 'react';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  Placement,
  arrow,
  FloatingArrow,
} from '@floating-ui/react';

// Base tooltip component
interface BaseTooltipProps {
  children: ReactElement;
  content: React.ReactNode;
  placement?: Placement;
  delay?: number;
  className?: string;
}

function BaseTooltip({ 
  children, 
  content, 
  placement = 'top', 
  delay = 0,
  className = '' 
}: BaseTooltipProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const arrowRef = React.useRef(null);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    middleware: [
      offset(8),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      arrow({ element: arrowRef }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, { delay });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  return (
    <>
      {React.cloneElement(children, {
        ref: refs.setReference,
        ...getReferenceProps(),
      })}
      
      <FloatingPortal>
        {isOpen && content && (
          <div
            className={`z-50 bg-gray-900 text-white border border-gray-700 rounded-lg shadow-xl font-mono text-xs ${className}`}
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
          >
            {content}
            <FloatingArrow
              ref={arrowRef}
              context={context}
              className="fill-gray-900"
            />
          </div>
        )}
      </FloatingPortal>
    </>
  );
}

// 1. Simple Size Tooltip (Image 1)
interface SizeTooltipProps {
  children: ReactElement;
  size: string;
  sol: string;
  placement?: Placement;
}

export function SizeTooltip({ children, size, sol, placement = 'top' }: SizeTooltipProps) {
  const content = (
    <div className="px-3 py-2 space-y-1">
      <div className="text-gray-300">Size</div>
      <div className="text-white font-medium">{size}</div>
      <div className="text-gray-400 text-xs">{sol}</div>
    </div>
  );

  return (
    <BaseTooltip content={content} placement={placement}>
      {children}
    </BaseTooltip>
  );
}

// 2. Collateral Tooltip (Image 2)
interface CollateralTooltipProps {
  children: ReactElement;
  amount: string;
  sol: string;
  note?: string;
  placement?: Placement;
}

export function CollateralTooltip({ 
  children, 
  amount, 
  sol, 
  note,
  placement = 'top' 
}: CollateralTooltipProps) {
  const content = (
    <div className="px-3 py-2 space-y-1">
      <div className="text-gray-300">Collateral</div>
      <div className="text-white font-medium">{amount}</div>
      <div className="text-gray-400 text-xs">
        {sol} {note && `(${note})`}
      </div>
    </div>
  );

  return (
    <BaseTooltip content={content} placement={placement}>
      {children}
    </BaseTooltip>
  );
}

// 3. Net Value Tooltip (Image 3)
interface NetValueData {
  collateral: string;
  pnl: string;
  borrowFee: string;
  tradeFee: string;
  netValue: string;
}

interface NetValueTooltipProps {
  children: ReactElement;
  data: NetValueData;
  placement?: Placement;
}

export function NetValueTooltip({ children, data, placement = 'top' }: NetValueTooltipProps) {
  const content = (
    <div className="px-4 py-3 min-w-[200px]">
      <div className="text-white font-bold text-sm mb-2">NET VALUE</div>
      <div className="text-gray-400 text-xs mb-3">Formula: Collateral + PnL - Fees</div>
      
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span className="text-gray-300">Collateral</span>
          <span className="text-white">{data.collateral}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">PnL</span>
          <span className="text-white">{data.pnl}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Borrow Fee</span>
          <span className="text-white">{data.borrowFee}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Trade Fee</span>
          <span className="text-red-400">{data.tradeFee}</span>
        </div>
        <div className="h-px bg-gray-700 my-2"></div>
        <div className="flex justify-between font-medium">
          <span className="text-gray-300">Resulting Net Value</span>
          <span className="text-white">{data.netValue}</span>
        </div>
      </div>
    </div>
  );

  return (
    <BaseTooltip content={content} placement={placement}>
      {children}
    </BaseTooltip>
  );
}

// 4. Fees Tooltip (Image 4)
interface FeesData {
  entryFee: string;
  decreaseBorrowFee: string;
  decreaseExitFee: string;
  closeBorrowFee: string;
  closeExitFee: string;
}

interface FeesTooltipProps {
  children: ReactElement;
  data: FeesData;
  placement?: Placement;
}

export function FeesTooltip({ children, data, placement = 'top' }: FeesTooltipProps) {
  const content = (
    <div className="px-4 py-3 min-w-[180px]">
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span className="text-gray-300">Entry Fee:</span>
          <span className="text-white">{data.entryFee}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Decrease Borrow Fee:</span>
          <span className="text-white">{data.decreaseBorrowFee}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Decrease Exit Fee:</span>
          <span className="text-white">{data.decreaseExitFee}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Close Borrow Fee:</span>
          <span className="text-white">{data.closeBorrowFee}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Close Exit Fee:</span>
          <span className="text-white">{data.closeExitFee}</span>
        </div>
      </div>
    </div>
  );

  return (
    <BaseTooltip content={content} placement={placement}>
      {children}
    </BaseTooltip>
  );
}

// 5. Collateral Details Tooltip (Image 5)
interface CollateralDetailsData {
  entryCollateral: { usd: string; token: string };
  increaseRemoveCollateral: { usd: string; token: string };
  decreaseCollateral: { usd: string; token: string };
  closeCollateral: { usd: string; token: string };
  totalExitAmount: string;
}

interface CollateralDetailsTooltipProps {
  children: ReactElement;
  data: CollateralDetailsData;
  placement?: Placement;
}

export function CollateralDetailsTooltip({ 
  children, 
  data, 
  placement = 'top' 
}: CollateralDetailsTooltipProps) {
  const content = (
    <div className="px-4 py-3 min-w-[250px]">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-orange-400">Entry Collateral:</span>
          <div className="text-right">
            <div className="text-white">{data.entryCollateral.usd}</div>
            <div className="text-gray-400 text-xs flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
              {data.entryCollateral.token}
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-300">Increase / Remove Collateral:</span>
          <div className="text-right">
            <div className="text-white">{data.increaseRemoveCollateral.usd}</div>
            <div className="text-gray-400 text-xs flex items-center justify-end">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
              {data.increaseRemoveCollateral.token}
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-300">Decrease Collateral:</span>
          <div className="text-right">
            <div className="text-white">{data.decreaseCollateral.usd}</div>
            <div className="text-gray-400 text-xs flex items-center justify-end">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
              {data.decreaseCollateral.token}
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-300">Close Collateral:</span>
          <div className="text-right">
            <div className="text-white">{data.closeCollateral.usd}</div>
            <div className="text-gray-400 text-xs flex items-center justify-end">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
              {data.closeCollateral.token}
            </div>
          </div>
        </div>
        
        <div className="h-px bg-gray-700 my-2"></div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-300">Total Exit Amount:</span>
          <div className="text-white flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
            {data.totalExitAmount}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <BaseTooltip content={content} placement={placement}>
      {children}
    </BaseTooltip>
  );
}

// 6. Position Size Tooltip (Image 6)
interface PositionSizeData {
  entrySize: string;
  increaseSize: string;
  decreaseSize: string;
  closeSize: string;
}

interface PositionSizeTooltipProps {
  children: ReactElement;
  data: PositionSizeData;
  placement?: Placement;
}

export function PositionSizeTooltip({ 
  children, 
  data, 
  placement = 'top' 
}: PositionSizeTooltipProps) {
  const content = (
    <div className="px-4 py-3 min-w-[160px]">
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span className="text-gray-300">Entry Size:</span>
          <span className="text-white">{data.entrySize}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Increase Size:</span>
          <span className="text-white">{data.increaseSize}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Decrease Size:</span>
          <span className="text-white">{data.decreaseSize}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Close Size:</span>
          <span className="text-white">{data.closeSize}</span>
        </div>
      </div>
    </div>
  );

  return (
    <BaseTooltip content={content} placement={placement}>
      {children}
    </BaseTooltip>
  );
}

// 7. PnL Tooltip (Image 7)
interface PnLData {
  decreasePnL: string;
  closePnL: string;
}

interface PnLTooltipProps {
  children: ReactElement;
  data: PnLData;
  placement?: Placement;
}

export function PnLTooltip({ children, data, placement = 'top' }: PnLTooltipProps) {
  const content = (
    <div className="px-4 py-3 min-w-[140px]">
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span className="text-gray-300">Decrease PnL:</span>
          <span className="text-green-400">{data.decreasePnL}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Close PnL:</span>
          <span className="text-green-400">{data.closePnL}</span>
        </div>
      </div>
    </div>
  );

  return (
    <BaseTooltip content={content} placement={placement}>
      {children}
    </BaseTooltip>
  );
}

// Usage Examples Component
export function TradingTooltipExamples() {
  return (
    <div className="p-8 bg-gray-950 min-h-screen text-white space-y-8">
      <h1 className="text-2xl font-bold mb-8">Trading Tooltips Examples</h1>
      
      <div className="grid grid-cols-2 gap-8">
        {/* Simple Size Tooltip */}
        <div>
          <h3 className="text-lg mb-4">Size Tooltip</h3>
          <SizeTooltip size="$54.7" sol="0.244 SOL">
            <button className="px-4 py-2 bg-blue-600 rounded">Size Info</button>
          </SizeTooltip>
        </div>
        
        {/* Collateral Tooltip */}
        <div>
          <h3 className="text-lg mb-4">Collateral Tooltip</h3>
          <CollateralTooltip 
            amount="$10.94" 
            sol="0.0498 SOL" 
            note="at init."
          >
            <button className="px-4 py-2 bg-green-600 rounded">Collateral Info</button>
          </CollateralTooltip>
        </div>
        
        {/* Net Value Tooltip */}
        <div>
          <h3 className="text-lg mb-4">Net Value Tooltip</h3>
          <NetValueTooltip 
            data={{
              collateral: "$10.94",
              pnl: "$0.15",
              borrowFee: "-$0.00",
              tradeFee: "-$0.08",
              netValue: "$11.01"
            }}
          >
            <button className="px-4 py-2 bg-purple-600 rounded">Net Value</button>
          </NetValueTooltip>
        </div>
        
        {/* Fees Tooltip */}
        <div>
          <h3 className="text-lg mb-4">Fees Tooltip</h3>
          <FeesTooltip 
            data={{
              entryFee: "$0",
              decreaseBorrowFee: "$0",
              decreaseExitFee: "$0",
              closeBorrowFee: "$1.11",
              closeExitFee: "$6.42"
            }}
          >
            <button className="px-4 py-2 bg-red-600 rounded">Fees</button>
          </FeesTooltip>
        </div>
        
        {/* Position Size Tooltip */}
        <div>
          <h3 className="text-lg mb-4">Position Size Tooltip</h3>
          <PositionSizeTooltip 
            data={{
              entrySize: "$4,572.21",
              increaseSize: "$0",
              decreaseSize: "$0",
              closeSize: "$4,572.21"
            }}
          >
            <button className="px-4 py-2 bg-yellow-600 rounded">Position Size</button>
          </PositionSizeTooltip>
        </div>
        
        {/* PnL Tooltip */}
        <div>
          <h3 className="text-lg mb-4">PnL Tooltip</h3>
          <PnLTooltip 
            data={{
              decreasePnL: "$0.52",
              closePnL: "$1.16"
            }}
          >
            <button className="px-4 py-2 bg-indigo-600 rounded">PnL</button>
          </PnLTooltip>
        </div>
      </div>
      
      {/* Collateral Details Example */}
      <div>
        <h3 className="text-lg mb-4">Collateral Details Tooltip</h3>
        <CollateralDetailsTooltip 
          data={{
            entryCollateral: { usd: "$45.72", token: "0.2 JITOSOL" },
            increaseRemoveCollateral: { usd: "$0", token: "0 JITOSOL" },
            decreaseCollateral: { usd: "$0", token: "0 JITOSOL" },
            closeCollateral: { usd: "$45.72", token: "0.0654 JITOSOL" },
            totalExitAmount: "0.0654 JITOSOL"
          }}
        >
          <button className="px-4 py-2 bg-teal-600 rounded">Collateral Details</button>
        </CollateralDetailsTooltip>
      </div>
    </div>
  );
}