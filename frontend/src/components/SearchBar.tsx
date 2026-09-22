import { type ReactNode } from "react";

interface SearchBarProps {
  valor: string;
  onChange: (valor: string) => void;
  onBuscar: () => void;
  placeholder?: string;
  children?: ReactNode;
}

export default function SearchBar({
  valor,
  onChange,
  onBuscar,
  placeholder = "Buscar...",
  children,
}: SearchBarProps) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") onBuscar();
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end">
      <div className="flex flex-1 gap-3">
        <input
          type="text"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500"
        />
        <button
          type="button"
          onClick={onBuscar}
          className="rounded-md bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 cursor-pointer"
        >
          Buscar
        </button>
      </div>
      {children}
    </div>
  );
}
