import { useEffect, useRef, useState } from "react";
import { mensagemDoErro } from "../utils/erros";

export interface ResultadoListagem<T> {
  data: T[];
  page: number;
  totalPages: number;
  total: number;
}

export interface OpcoesListagemPaginada<T, F> {
  filtros: F;
  carregar: (
    pagina: number,
    filtros: F,
    signal: AbortSignal,
  ) => Promise<ResultadoListagem<T>>;
  mensagemErro: string;
}

export function useListagemPaginada<T, F>({
  filtros,
  carregar,
  mensagemErro,
}: OpcoesListagemPaginada<T, F>) {
  const [dados, setDados] = useState<T[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);
  const requisicaoRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  async function carregarPagina(
    paginaAtual = pagina,
    filtrosAtuais: F = filtros,
  ) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requisicao = ++requisicaoRef.current;

    try {
      setCarregando(true);
      setErro("");
      // Antecipa a página para recargas de mutações não usarem a anterior.
      setPagina(paginaAtual);
      const resposta = await carregar(
        paginaAtual,
        filtrosAtuais,
        controller.signal,
      );
      if (requisicao !== requisicaoRef.current || controller.signal.aborted) {
        return;
      }
      setDados(resposta.data);
      setPagina(resposta.page);
      setTotalPaginas(resposta.totalPages);
      setTotal(resposta.total);
    } catch (error) {
      if (requisicao !== requisicaoRef.current || controller.signal.aborted) {
        return;
      }
      setErro(mensagemDoErro(error, mensagemErro));
    } finally {
      if (requisicao === requisicaoRef.current) setCarregando(false);
    }
  }

  function buscar() {
    return carregarPagina(1, filtros);
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    void carregarPagina(1, filtros);
    return () => abortRef.current?.abort();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  return {
    dados,
    carregando,
    erro,
    pagina,
    totalPaginas,
    total,
    carregar: carregarPagina,
    buscar,
  };
}
