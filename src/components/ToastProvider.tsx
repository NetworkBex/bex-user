'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/ui';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem { id: number; message: string; type: ToastType }
interface ToastContextType { toast: (message: string, type?: ToastType) => void }

const ToastContext = createContext<ToastContextType | null>(null);
export const useToast = () => useContext(ToastContext);

let counter = 0;

const toneStyles: Record<ToastType, string> = {
  success: 'border-success/30 [&_.t-ic]:text-success',
  error:   'border-danger/30  [&_.t-ic]:text-danger',
  info:    'border-info/30    [&_.t-ic]:text-info',
};

const Icon = ({ type }: { type: ToastType }) =>
  type === 'success' ? <CheckCircle2 className="size-4" /> :
  type === 'error'   ? <AlertTriangle className="size-4" /> :
                       <Info className="size-4" />;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++counter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none w-[min(360px,calc(100vw-2rem))]">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start gap-3 px-3.5 py-3 rounded-lg',
              'bg-surface text-fg border shadow-[var(--shadow-pop)]',
              'animate-slide-in',
              toneStyles[t.type]
            )}
          >
            <span className="t-ic mt-0.5 shrink-0"><Icon type={t.type} /></span>
            <p className="text-sm leading-snug flex-1">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 text-fg-subtle hover:text-fg transition-colors"
              aria-label="Dismiss"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
