'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ToastVariant = 'info' | 'error';

type Toast = {
  id: string;
  title: string;
  message?: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  push: (toast: Omit<Toast, 'id'>) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const randomId = () => Math.random().toString(36).slice(2);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>.');
  return ctx;
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = randomId();
    setToasts((prev) => [...prev, { ...toast, id }]);

    // auto-dismiss
    window.setTimeout(() => remove(id), 6000);
  }, [remove]);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed right-6 top-6 z-50 grid w-[min(420px,calc(100vw-3rem))] gap-3"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-2xl border px-4 py-3 shadow-lg backdrop-blur ${
              toast.variant === 'error'
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-100'
                : 'border-slate-700 bg-slate-900/80 text-slate-100'
            }`}
            role={toast.variant === 'error' ? 'alert' : 'status'}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">{toast.title}</p>
                {toast.message ? <p className="mt-1 text-sm opacity-90">{toast.message}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => remove(toast.id)}
                className="rounded-md px-2 py-1 text-sm opacity-80 transition hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
                aria-label="Toast schließen"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};