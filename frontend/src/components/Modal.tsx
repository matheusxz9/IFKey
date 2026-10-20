import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "../utils/classes";
import { Icone } from "./ui/Icone";

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
      className="animate-surgir-veu fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-[2px] sm:items-center sm:p-4"
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
        className={cn(
          "animate-surgir-dialogo flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-linha bg-superficie shadow-2xl sm:rounded-2xl",
          tamanhoClasses[tamanho],
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-linha px-5 py-3.5">
          <h2 id={tituloId} className="pt-1 text-base leading-tight text-texto">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="-mr-1.5 cursor-pointer rounded-lg p-2 text-texto-fraco transition-colors hover:bg-superficie-ativa hover:text-texto"
          >
            <Icone nome="fechar" className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
