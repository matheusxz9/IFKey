import { useEffect, useId, useRef, type ReactNode } from "react";

interface ModalProps {
  aberto: boolean;
  onClose: () => void;
  titulo: string;
  children: ReactNode;
  tamanho?: "sm" | "md" | "lg";
}

const tamanhoClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

const SELETOR_FOCOVEIS =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({
  aberto,
  onClose,
  titulo,
  children,
  tamanho = "md",
}: ModalProps) {
  const tituloId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!aberto) return;

    const elementoAnterior = document.activeElement as HTMLElement | null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const dialogo = dialogRef.current;
      if (!dialogo) return;

      const focaveis = Array.from(
        dialogo.querySelectorAll<HTMLElement>(SELETOR_FOCOVEIS),
      );
      if (focaveis.length === 0) {
        event.preventDefault();
        return;
      }

      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const atual = document.activeElement;

      if (event.shiftKey) {
        if (atual === primeiro || !dialogo.contains(atual)) {
          event.preventDefault();
          ultimo.focus();
        }
      } else if (atual === ultimo || !dialogo.contains(atual)) {
        event.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = overflowAnterior;
      elementoAnterior?.focus();
    };
  }, [aberto]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className={`w-full ${tamanhoClasses[tamanho]} rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id={tituloId} className="text-xl font-bold text-white">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-gray-500 hover:text-white cursor-pointer"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
