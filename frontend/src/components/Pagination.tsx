interface PaginationProps {
  paginaAtual: number;
  totalPaginas: number;
  onAnterior: () => void;
  onProxima: () => void;
}

export default function Pagination({
  paginaAtual,
  totalPaginas,
  onAnterior,
  onProxima,
}: PaginationProps) {
  if (totalPaginas <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-gray-800 px-6 py-4">
      <button
        type="button"
        onClick={onAnterior}
        disabled={paginaAtual === 1}
        className="rounded-md border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
      >
        Anterior
      </button>

      <span className="text-sm text-gray-400">
        Página {paginaAtual} de {totalPaginas}
      </span>

      <button
        type="button"
        onClick={onProxima}
        disabled={paginaAtual === totalPaginas}
        className="rounded-md border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
      >
        Próxima
      </button>
    </div>
  );
}
