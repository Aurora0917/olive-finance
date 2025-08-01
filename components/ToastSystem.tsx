import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, ExternalLink, Check, Clock, Loader2 } from 'lucide-react';

// Types
interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  closable?: boolean;
}

interface TransactionStep {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
}

interface TransactionProgress {
  id: string;
  title: string;
  steps: TransactionStep[];
  isOpen: boolean;
}

// Toast Context
interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  transactionProgress: TransactionProgress | null;
  showTransactionProgress: (title: string, steps: Omit<TransactionStep, 'status'>[]) => void;
  updateTransactionStep: (stepId: string, status: TransactionStep['status']) => void;
  hideTransactionProgress: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Modern Toast Provider using useState
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [transactionProgress, setTransactionProgress] = useState<TransactionProgress | null>(null);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    // Don't add regular toasts when transaction progress is active
    if (transactionProgress?.isOpen) {
      return;
    }
    
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      id,
      duration: 5000,
      closable: true,
      ...toast
    };
    
    setToasts(prev => [...prev, newToast]);

    // Auto-remove toast after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, newToast.duration);
    }
  }, [transactionProgress]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showTransactionProgress = useCallback((title: string, steps: Omit<TransactionStep, 'status'>[]) => {
    const id = Math.random().toString(36).substr(2, 9);
    const transactionSteps: TransactionStep[] = steps.map(step => ({
      ...step,
      status: 'pending' as const
    }));
    
    setTransactionProgress({ id, title, steps: transactionSteps, isOpen: true });
  }, []);

  const updateTransactionStep = useCallback((stepId: string, status: TransactionStep['status']) => {
    setTransactionProgress(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        steps: prev.steps.map(step =>
          step.id === stepId ? { ...step, status } : step
        )
      };
    });
  }, []);

  const hideTransactionProgress = useCallback(() => {
    setTransactionProgress(null);
  }, []);

  return (
    <ToastContext.Provider value={{
      toasts,
      addToast,
      removeToast,
      transactionProgress,
      showTransactionProgress,
      updateTransactionStep,
      hideTransactionProgress
    }}>
      {children}
      <ToastContainer />
      <TransactionProgressModal />
    </ToastContext.Provider>
  );
};

// Hook to use toast context
export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Individual Toast Component
const ToastComponent: React.FC<{ toast: Toast }> = ({ toast }) => {
  const { removeToast } = useToast();
  const [isExiting, setIsExiting] = useState(false);

  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(() => removeToast(toast.id), 400);
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'info':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div 
      className={`
        ${getBackgroundColor()} 
        text-white 
        p-4 
        rounded-lg 
        shadow-lg 
        shadow-black/30
        max-w-sm 
        w-full
        toast-bounce
        ${isExiting ? 'toast-exit' : ''}
        transform-gpu
        cursor-pointer
        hover:scale-105
        transition-transform
        duration-200
        border-l-4
        border-white/30
      `}
      onClick={() => toast.action && toast.action.onClick()}
      style={{
        animation: isExiting 
          ? 'bounceOutLeft 0.4s ease-in-out forwards' 
          : 'bounceInLeft 0.7s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 animate-bounce" style={{ animationDuration: '1s', animationDelay: '0.3s' }}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{toast.title}</p>
          {toast.description && (
            <p className="text-xs opacity-90 mt-1">{toast.description}</p>
          )}
          {toast.action && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toast.action?.onClick();
              }}
              className="text-xs underline opacity-90 hover:opacity-100 mt-2 flex items-center gap-1 hover:gap-2 transition-all duration-200"
            >
              {toast.action.label}
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
        {toast.closable && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
            className="opacity-70 hover:opacity-100 transition-all duration-200 hover:scale-110 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// Toast Container
const ToastContainer: React.FC = () => {
  const { toasts, transactionProgress } = useToast();

  // Don't show regular toasts when transaction progress is active
  const visibleToasts = transactionProgress?.isOpen ? [] : toasts;

  return (
    <>
      {/* CSS animations */}
      <style jsx global>{`
        @keyframes bounceInLeft {
          0% {
            opacity: 0;
            transform: translateX(-100%) scale(0.2) rotate(-5deg);
          }
          15% {
            opacity: 0.8;
            transform: translateX(-50%) scale(0.4) rotate(-3deg);
          }
          30% {
            opacity: 0.9;
            transform: translateX(15px) scale(1.1) rotate(2deg);
          }
          45% {
            opacity: 1;
            transform: translateX(-8px) scale(0.95) rotate(-1deg);
          }
          60% {
            transform: translateX(4px) scale(1.02) rotate(0.5deg);
          }
          75% {
            transform: translateX(-2px) scale(0.99) rotate(-0.3deg);
          }
          90% {
            transform: translateX(1px) scale(1.01) rotate(0.1deg);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1) rotate(0deg);
          }
        }
        
        @keyframes bounceOutLeft {
          0% {
            opacity: 1;
            transform: translateX(0) scale(1) rotate(0deg);
          }
          20% {
            opacity: 0.9;
            transform: translateX(10px) scale(1.05) rotate(2deg);
          }
          100% {
            opacity: 0;
            transform: translateX(-100%) scale(0.7) rotate(-10deg);
          }
        }
        
        @keyframes floatUp {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-2px);
          }
          100% {
            transform: translateY(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        
        .toast-bounce {
          animation-fill-mode: both;
        }
        
        .toast-exit {
          animation: bounceOutLeft 0.4s ease-in-out forwards;
        }
        
        .toast-container {
          animation: floatUp 3s ease-in-out infinite;
        }
      `}</style>
      
      <div className="fixed bottom-4 left-4 z-50 space-y-3 flex flex-col-reverse max-h-screen overflow-hidden">
        {visibleToasts.map((toast, index) => (
          <div 
            key={toast.id} 
            className="toast-container"
            style={{ 
              animationDelay: `${index * 0.2}s`,
              zIndex: visibleToasts.length - index 
            }}
          >
            <ToastComponent toast={toast} />
          </div>
        ))}
      </div>
    </>
  );
};

// Transaction Progress Modal
const TransactionProgressModal: React.FC = () => {
  const { transactionProgress, hideTransactionProgress } = useToast();

  if (!transactionProgress?.isOpen) return null;

  const getStepIcon = (status: TransactionStep['status']) => {
    switch (status) {
      case 'completed':
        return <Check className="w-4 h-4 text-green-400" />;
      case 'loading':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStepColor = (status: TransactionStep['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'loading':
        return 'text-blue-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const allCompleted = transactionProgress.steps.every(step => step.status === 'completed');
  const hasError = transactionProgress.steps.some(step => step.status === 'error');

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div 
        className={`
          ${hasError ? 'bg-red-600' : allCompleted ? 'bg-green-600' : 'bg-blue-600'}
          text-white 
          p-5 
          rounded-lg 
          shadow-lg 
          shadow-black/30
          max-w-sm 
          w-full
          border-l-4
          border-white/30
          transform-gpu
        `}
        style={{
          animation: 'bounceInLeft 0.7s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <div className="animate-bounce" style={{ animationDuration: '1s' }}>
              {hasError ? 
                <AlertCircle className="w-5 h-5 text-red-300" /> : 
                allCompleted ? 
                <CheckCircle className="w-5 h-5 text-green-300" /> :
                <Loader2 className="w-5 h-5 text-blue-300 animate-spin" />
              }
            </div>
            {transactionProgress.title}
          </h3>
          {(allCompleted || hasError) && (
            <button
              onClick={hideTransactionProgress}
              className="opacity-70 hover:opacity-100 transition-all duration-200 hover:scale-110"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className="space-y-3">
          {transactionProgress.steps.map((step, index) => (
            <div 
              key={step.id} 
              className="flex items-center gap-3"
              style={{
                animation: step.status === 'loading' ? 'pulse 2s infinite' : undefined
              }}
            >
              <div className="flex-shrink-0">
                {getStepIcon(step.status)}
              </div>
              <span className={`text-sm font-medium ${getStepColor(step.status)}`}>
                {step.label}
              </span>
              {step.status === 'completed' && (
                <div className="ml-auto">
                  <div 
                    className="w-2 h-2 bg-green-400 rounded-full"
                    style={{
                      animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) 1'
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {allCompleted && (
          <div className="mt-4 pt-3 border-t border-white/20">
            <p className="text-xs opacity-90">
              Transaction completed successfully! 🎉
            </p>
          </div>
        )}

        {hasError && (
          <div className="mt-4 pt-3 border-t border-white/20">
            <p className="text-xs opacity-90">
              Transaction failed. Please try again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Custom hook for toast functionality (modern pattern)
export const useToastActions = () => {
  const { addToast, showTransactionProgress, updateTransactionStep, hideTransactionProgress } = useToast();

  const showSuccess = useCallback((title: string, description?: string, action?: { label: string; onClick: () => void }) => {
    addToast({ type: 'success', title, description, action });
  }, [addToast]);

  const showError = useCallback((title: string, description?: string) => {
    addToast({ type: 'error', title, description });
  }, [addToast]);

  const showInfo = useCallback((title: string, description?: string) => {
    addToast({ type: 'info', title, description });
  }, [addToast]);

  const showWarning = useCallback((title: string, description?: string) => {
    addToast({ type: 'warning', title, description });
  }, [addToast]);

  const executeTransaction = useCallback(async (
    title: string,
    steps: Omit<TransactionStep, 'status'>[],
    onComplete?: () => void
  ) => {
    showTransactionProgress(title, steps);
    
    // You can add your transaction logic here
    // This is just a simulation
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateTransactionStep(steps[i].id, 'loading');
      await new Promise(resolve => setTimeout(resolve, 1500));
      updateTransactionStep(steps[i].id, 'completed');
    }
    
    setTimeout(() => {
      hideTransactionProgress();
      onComplete?.();
    }, 1500);
  }, [showTransactionProgress, updateTransactionStep, hideTransactionProgress]);

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    executeTransaction,
    showTransactionProgress,
    updateTransactionStep,
    hideTransactionProgress 
  };
};