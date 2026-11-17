import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { uid } from '@/lib/id';

interface ToastItem {
  id: string;
  message: string;
  action?: { label: string; run: () => void };
}

type Notify = (message: string, action?: ToastItem['action']) => void;
const ToastContext = createContext<Notify>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: string) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const notify = useCallback<Notify>(
    (message, action) => {
      const id = uid('t');
      setItems((xs) => [...xs.slice(-2), { id, message, action }]);
      window.setTimeout(() => dismiss(id), action ? 6000 : 3000);
    },
    [dismiss],
  );
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="toast">
            <span>{t.message}</span>
            {t.action && (
              <button
                onClick={() => {
                  t.action!.run();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
