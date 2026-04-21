import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  addToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.slice(0, 3).map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(() => onRemove(toast.id), 300); // Wait for animation
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  };

  const bgColors = {
    success: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
    error: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20',
    info: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20',
    warning: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',
  };
  
  const progressColors = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-amber-500',
  };

  return (
    <div
      className={`relative overflow-hidden flex items-start p-4 rounded-lg border shadow-lg pointer-events-auto transition-all duration-300 ease-in-out bg-white dark:bg-gray-800 ${bgColors[toast.type]} ${
        isLeaving ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
      } animate-slide-in-right`}
    >
      <div className="flex-shrink-0 mr-3">{icons[toast.type]}</div>
      <div className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">{toast.message}</div>
      <button
        onClick={handleClose}
        className="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="absolute bottom-0 left-0 h-1 w-full bg-gray-200 dark:bg-gray-700">
        <div 
          className={`h-full ${progressColors[toast.type]} animate-shrink-width`} 
          style={{ animationDuration: '4s', animationTimingFunction: 'linear', animationFillMode: 'forwards' }}
        />
      </div>
    </div>
  );
};
