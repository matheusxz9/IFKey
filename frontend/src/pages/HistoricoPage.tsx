import { useEffect, useRef, useState } from "react";
import { listarHistoricoEmprestimos } from "../services/emprestimos";
import type { Emprestimo } from "../types/emprestimo";
import PageHeader from "../components/PageHeader";
import DataTable, { type Coluna } from "../components/DataTable";
import Pagination from "../components/Pagination";

const colunas: Coluna<Emprestimo>[] = [
  {
    key: "chave",
    titulo: "Chave",
    render: (e) => (
      <>
        <p className="font-medium">{e.chave.codigo}</p>
        <p className="text-sm text-gray-400">{e.chave.descricao}</p>
      </>
    ),
  },
  {
    key: "solicitante",
    titulo: "Solicitante",
    render: (e) => (
      <>
        <p className="font-medium">{e.solicitante.nome}</p>
        <p className="text-sm text-gray-400">{e.solicitante.matricula}</p>
      </>
    ),
  },
  {
    key: "dataHoraEmprestimo",
    titulo: "Empréstimo",
    render: (e) => formatarData(e.dataHoraEmprestimo),
  },
  {
    key: "dataHoraDevolucao",
    titulo: "Devolução",
    render: (e) => (e.dataHoraDevolucao ? formatarData(e.dataHoraDevolucao) : "-"),
  },
];

function formatarData(data: string) {
  return new Date(data).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function HistoricoPage() {
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const requisicaoRef = useRef(0);

  async function carregarHistorico(
    paginaAtual = pagina,
    filtros: { de?: string; ate?: string } = { de: dataInicio, ate: dataFim },
  ) {
    const requisicao = ++requisicaoRef.current;
    try {
      setCarregando(true);
      setErro("");

      const resposta = await listarHistoricoEmprestimos({
        de: filtros.de ? `${filtros.de}T00:00:00` : undefined,
        ate: filtros.ate ? `${filtros.ate}T23:59:59` : undefined,
        page: paginaAtual,
        limit: 10,
      });

      if (requisicao !== requisicaoRef.current) return;
      setEmprestimos(resposta.data);
      setPagina(resposta.meta.page);
      setTotalPaginas(resposta.meta.totalPages);
    } catch (error) {
      if (requisicao !== requisicaoRef.current) return;
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao carregar o histórico.",
      );
    } finally {
      if (requisicao === requisicaoRef.current) setCarregando(false);
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    carregarHistorico(1);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  function pesquisar() {
    setPagina(1);
    carregarHistorico(1);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titulo="Histórico de empréstimos"
        subtitulo="Consulte os empréstimos que já foram devolvidos."
      />

      <section className="mb-6 rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <label htmlFor="dataInicio" className="mb-2 block text-sm font-medium text-gray-300">
              Data inicial
            </label>
            <input
              id="dataInicio"
              type="date"
              value={dataInicio}
              onChange={(event) => setDataInicio(event.target.value)}
              className="w-full rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="dataFim" className="mb-2 block text-sm font-medium text-gray-300">
              Data final
            </label>
            <input
              id="dataFim"
              type="date"
              value={dataFim}
              onChange={(event) => setDataFim(event.target.value)}
              className="w-full rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500"
            />
          </div>
          <button
            type="button"
            onClick={pesquisar}
            className="rounded-md bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800 cursor-pointer"
          >
            Pesquisar
          </button>
        </div>
      </section>

      {erro && (
        <div className="mb-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-red-400" role="alert">
          {erro}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
        <DataTable
          colunas={colunas}
          dados={emprestimos}
          carregando={carregando}
          mensagemVazia="Nenhum empréstimo encontrado."
        />
        <Pagination
          paginaAtual={pagina}
          totalPaginas={totalPaginas}
          onAnterior={() => carregarHistorico(pagina - 1)}
          onProxima={() => carregarHistorico(pagina + 1)}
        />
      </section>
    </div>
  );
}

export default HistoricoPage;
