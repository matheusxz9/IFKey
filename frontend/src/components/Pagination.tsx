import { Botao } from "./ui/Botao";
import { Icone } from "./ui/Icone";

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
    <div className="flex items-center justify-between gap-4 border-t border-linha px-5 py-3">
      <Botao
        tamanho="sm"
        variante="secundario"
        onClick={onAnterior}
        disabled={paginaAtual === 1}
        icone={<Icone nome="anterior" className="h-3.5 w-3.5" />}
      >
        Anterior
      </Botao>

      <span className="text-sm text-texto-fraco">
        Página {paginaAtual} de {totalPaginas}
      </span>

      <Botao
        tamanho="sm"
        variante="secundario"
        onClick={onProxima}
        disabled={paginaAtual === totalPaginas}
        icone={<Icone nome="proximo" className="order-last h-3.5 w-3.5" />}
      >
        Próxima
      </Botao>
    </div>
  );
}
