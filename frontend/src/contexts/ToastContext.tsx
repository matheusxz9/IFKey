import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { Icone, type NomeIcone } from "../components/ui/Icone";
import { cn } from "../utils/classes";

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
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed top-4 right-4 left-4 z-[100] flex flex-col items-end gap-2.5 sm:left-auto"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={() => remover(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const estilos: Record<
  ToastTipo,
  { borda: string; chip: string; icone: NomeIcone }
> = {
  success: {
    borda: "border-verde/35",
    chip: "bg-veu-verde text-verde-claro",
    icone: "confirmado",
  },
  error: {
    borda: "border-vermelho/35",
    chip: "bg-veu-vermelho text-vermelho",
    icone: "erro",
  },
  warning: {
    borda: "border-ambar/35",
    chip: "bg-veu-ambar text-ambar",
    icone: "alerta",
  },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const estilo = estilos[toast.tipo];

  return (
    <div
      className={cn(
        "animate-slide-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-superficie px-4 py-3 shadow-xl",
        estilo.borda,
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
          estilo.chip,
        )}
      >
        <Icone nome={estilo.icone} className="h-3.5 w-3.5" />
      </span>
      <p className="min-w-0 flex-1 text-sm leading-relaxed text-texto-medio">
        {toast.mensagem}
      </p>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Fechar"
        className="-mt-0.5 -mr-1 cursor-pointer rounded-md p-1 text-texto-fraco transition-colors hover:bg-superficie-ativa hover:text-texto"
      >
        <Icone nome="fechar" className="h-3.5 w-3.5" />
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
