import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";

type ToastTipo = "success" | "error" | "warning";

interface Toast {
  id: number;
  tipo: ToastTipo;
  mensagem: string;
}

interface ToastContextType {
  success: (mensagem: string) => void;
  error: (mensagem: string) => void;
  warning: (mensagem: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      timeouts.forEach((id) => clearTimeout(id));
      timeouts.clear();
    };
  }, []);

  const adicionar = useCallback((tipo: ToastTipo, mensagem: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, tipo, mensagem }]);
    const timeoutId = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timeoutsRef.current.delete(id);
    }, 5000);
    timeoutsRef.current.set(id, timeoutId);
  }, []);

  const success = useCallback((m: string) => adicionar("success", m), [adicionar]);
  const error = useCallback((m: string) => adicionar("error", m), [adicionar]);
  const warning = useCallback((m: string) => adicionar("warning", m), [adicionar]);

  function remover(id: number) {
    const timeoutId = timeoutsRef.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutsRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ success, error, warning }}>
      {children}
      <div className="fixed right-4 top-4 z-[100] flex flex-col gap-3">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={() => remover(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const cores: Record<ToastTipo, string> = {
    success: "border-green-700 bg-green-950 text-green-300",
    error: "border-red-700 bg-red-950 text-red-300",
    warning: "border-yellow-700 bg-yellow-950 text-yellow-300",
  };

  const icones: Record<ToastTipo, string> = {
    success: "✓",
    error: "✕",
    warning: "⚠",
  };

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg animate-slide-in ${cores[toast.tipo]}`}>
      <span className="text-lg">{icones[toast.tipo]}</span>
      <p className="text-sm font-medium">{toast.mensagem}</p>
      <button type="button" onClick={onRemove} className="ml-2 cursor-pointer opacity-60 hover:opacity-100" aria-label="Fechar">
        ×
      </button>
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast deve ser usado dentro de um ToastProvider");
  }
  return context;
}
