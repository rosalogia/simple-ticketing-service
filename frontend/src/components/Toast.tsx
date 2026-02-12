import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";

interface Toast {
  id: number;
  message: string;
  type: "error" | "success";
}

interface ToastContextValue {
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showError: () => {},
  showSuccess: () => {},
});

export const useToast = () => useContext(ToastContext);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: "error" | "success") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const showError = useCallback((message: string) => addToast(message, "error"), [addToast]);
  const showSuccess = useCallback((message: string) => addToast(message, "success"), [addToast]);

  return (
    <ToastContext.Provider value={{ showError, showSuccess }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onDismiss={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const cls =
    toast.type === "error"
      ? "bg-white border-sev1-border text-sev1"
      : "bg-white border-green-200 text-green-700";

  return (
    <div
      className={`px-4 py-3 rounded-xl border shadow-lg text-sm font-medium transition-all duration-200 ${cls} ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
    >
      <div className="flex items-start gap-2">
        <span className="flex-1">{toast.message}</span>
        <button onClick={onDismiss} className="text-stone-400 hover:text-stone-600 text-xs mt-0.5">
          &times;
        </button>
      </div>
    </div>
  );
}
