import { useEffect, type ReactNode } from "react";

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

export default function Modal({
  aberto,
  onClose,
  titulo,
  children,
  tamanho = "md",
}: ModalProps) {
  useEffect(() => {
    if (!aberto) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [aberto, onClose]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={`w-full ${tamanhoClasses[tamanho]} rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{titulo}</h2>
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
      </section>
    </div>
  );
}
