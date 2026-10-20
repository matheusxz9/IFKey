import { useEffect, useRef, useState } from "react";
import { listarHistoricoEmprestimos } from "../services/emprestimos";
import type { Emprestimo } from "../types/emprestimo";
import { useAuth } from "../contexts/AuthContext";
import PageHeader from "../components/PageHeader";
import DataTable, { type Coluna } from "../components/DataTable";
import Pagination from "../components/Pagination";
import { Alerta } from "../components/ui/Alerta";
import { Botao } from "../components/ui/Botao";
import { Cartao, Contagem } from "../components/ui/Cartao";
import { Campo, Entrada } from "../components/ui/Campos";
import { Icone } from "../components/ui/Icone";
import { Selo } from "../components/ui/Selo";
import { formatarDataHora, pluralizar } from "../utils/formatacao";

const colunas: Coluna<Emprestimo>[] = [
  {
    key: "chave",
    titulo: "Chave",
    render: (e) => (
      <>
        <p className="font-mono text-[0.8125rem] font-medium text-texto">
          {e.chave.codigo}
        </p>
        <p className="mt-0.5 text-sm text-texto-fraco">{e.chave.descricao}</p>
      </>
    ),
  },
  {
    key: "solicitante",
    titulo: "Solicitante",
    render: (e) => (
      <>
        <p className="font-medium text-texto">{e.solicitante.nome}</p>
        <p className="mt-0.5 font-mono text-xs text-texto-fraco">
          {e.solicitante.matricula}
        </p>
      </>
    ),
  },
  {
    key: "dataHoraEmprestimo",
    titulo: "Empréstimo",
    mono: true,
    render: (e) => formatarDataHora(e.dataHoraEmprestimo),
  },
  {
    key: "dataHoraDevolucao",
    titulo: "Devolução",
    mono: true,
    render: (e) => (e.dataHoraDevolucao ? formatarDataHora(e.dataHoraDevolucao) : "-"),
  },
  {
    key: "situacao",
    titulo: "Situação",
    render: (e) =>
      e.dataHoraDevolucao ? (
        <Selo variante="devolvida">Devolvida</Selo>
      ) : (
        <Selo variante="andamento">Em andamento</Selo>
      ),
  },
];

function HistoricoPage() {
  const { isSolicitante, user } = useAuth();
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);

  const requisicaoRef = useRef(0);

  async function carregarHistorico(
    paginaAtual = pagina,
    filtros: { de?: string; ate?: string; solicitanteId?: number } = { de: dataInicio, ate: dataFim },
  ) {
    const requisicao = ++requisicaoRef.current;
    try {
      setCarregando(true);
      setErro("");

      const resposta = await listarHistoricoEmprestimos({
        de: filtros.de ? `${filtros.de}T00:00:00` : undefined,
        ate: filtros.ate ? `${filtros.ate}T23:59:59` : undefined,
        solicitanteId: filtros.solicitanteId,
        page: paginaAtual,
        limit: 10,
      });

      if (requisicao !== requisicaoRef.current) return;
      setEmprestimos(resposta.data);
      setPagina(resposta.meta.page);
      setTotalPaginas(resposta.meta.totalPages);
      setTotal(resposta.meta.total);
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
    const solicitanteId = isSolicitante && user?.tipo === "solicitante" ? user.id : undefined;
    carregarHistorico(1, { solicitanteId });
  }, [isSolicitante, user]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  function solicitanteIdAtual() {
    return isSolicitante && user?.tipo === "solicitante" ? user.id : undefined;
  }

  function pesquisar() {
    setPagina(1);
    carregarHistorico(1, { de: dataInicio, ate: dataFim, solicitanteId: solicitanteIdAtual() });
  }

  function limparPeriodo() {
    setDataInicio("");
    setDataFim("");
    setPagina(1);
    carregarHistorico(1, { de: "", ate: "", solicitanteId: solicitanteIdAtual() });
  }

  const temPeriodo = Boolean(dataInicio || dataFim);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        titulo="Histórico de empréstimos"
        subtitulo={isSolicitante
          ? "Consulte seus empréstimos ativos e devolvidos."
          : "Consulte os empréstimos ativos e devolvidos."}
      />

      {!isSolicitante && (
        <section className="mb-6 rounded-xl border border-linha bg-superficie p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <Campo label="Data inicial" htmlFor="dataInicio">
              <Entrada
                id="dataInicio"
                type="date"
                value={dataInicio}
                onChange={(event) => setDataInicio(event.target.value)}
                className="lg:w-48"
              />
            </Campo>
            <Campo label="Data final" htmlFor="dataFim">
              <Entrada
                id="dataFim"
                type="date"
                value={dataFim}
                onChange={(event) => setDataFim(event.target.value)}
                className="lg:w-48"
              />
            </Campo>
            <div className="flex items-center gap-2.5">
              <Botao
                variante="primario"
                onClick={pesquisar}
                icone={<Icone nome="buscar" />}
                className="flex-1 lg:flex-none"
              >
                Pesquisar
              </Botao>
              {temPeriodo && (
                <Botao variante="sutil" onClick={limparPeriodo}>
                  Limpar
                </Botao>
              )}
            </div>
          </div>
        </section>
      )}

      {erro && <Alerta className="mb-6">{erro}</Alerta>}

      <Cartao
        semRecuo
        acao={
          <Contagem>
            {pluralizar(total, "empréstimo encontrado", "empréstimos encontrados")}
          </Contagem>
        }
      >
        <DataTable
          colunas={colunas}
          dados={emprestimos}
          carregando={carregando}
          mensagemVazia="Nenhum empréstimo encontrado."
          dicaVazia={
            isSolicitante
              ? "Você ainda não registrou empréstimos."
              : "Ajuste o período pesquisado para ver outros registros."
          }
        />
        <Pagination
          paginaAtual={pagina}
          totalPaginas={totalPaginas}
          onAnterior={() => {
            carregarHistorico(pagina - 1, { de: dataInicio, ate: dataFim, solicitanteId: solicitanteIdAtual() });
          }}
          onProxima={() => {
            carregarHistorico(pagina + 1, { de: dataInicio, ate: dataFim, solicitanteId: solicitanteIdAtual() });
          }}
        />
      </Cartao>
    </div>
  );
}

export default HistoricoPage;
