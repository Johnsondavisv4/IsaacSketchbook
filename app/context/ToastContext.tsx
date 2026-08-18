import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newToast: ToastItem = { id, message, type };

    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed right-5 bottom-5 z-50 flex flex-col gap-2.5 pointer-events-none">
        {toasts.map((toast) => {
          const borderColor =
            toast.type === 'error'
              ? 'border-l-red-600'
              : toast.type === 'info'
              ? 'border-l-blue-500'
              : 'border-l-emerald-500';

          const title =
            toast.type === 'error'
              ? 'Error'
              : toast.type === 'info'
              ? 'Aviso'
              : 'Éxito';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto min-w-70 max-w-95 bg-neutral-900 text-neutral-200 border border-neutral-800 border-l-4 ${borderColor} rounded-lg p-3.5 shadow-2xl transition-all duration-200`}
            >
              <div className="text-xs font-bold tracking-wider uppercase text-white mb-1">
                {title}
              </div>
              <div className="text-xs leading-relaxed text-neutral-300">
                {toast.message}
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
