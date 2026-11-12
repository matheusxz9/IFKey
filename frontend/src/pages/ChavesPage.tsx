import { useEffect, useRef, useState } from "react";
import { listarChaves } from "../services/chaves";
import { listarTodosEmprestimos } from "../services/emprestimos";
import type { Chave, StatusChave } from "../types/chave";
import type { Emprestimo } from "../types/emprestimo";
import { useAuth } from "../contexts/AuthContext";
import PageHeader from "../components/PageHeader";
import DataTable, { type Coluna } from "../components/DataTable";
import Pagination from "../components/Pagination";
import { Alerta } from "../components/ui/Alerta";
import { Botao } from "../components/ui/Botao";
import { Cartao, Contagem } from "../components/ui/Cartao";
import { EntradaBusca, Selecao } from "../components/ui/Campos";
import { Icone } from "../components/ui/Icone";
import { SeloStatusChave } from "../components/Selos";
import { useListagemPaginada } from "../hooks/useListagemPaginada";
import { pluralizar } from "../utils/formatacao";
import EmprestimoModal from "./chaves/EmprestimoModal";
import EmprestimosAtivos, {
  type EmprestimosAtivosHandle,
} from "./chaves/EmprestimosAtivos";

function ChavesPage() {
  const { user, isSolicitante } = useAuth();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<StatusChave | "">("");

  const listagem = useListagemPaginada({
    filtros: { busca, status },
    mensagemErro: "Erro ao carregar as chaves.",
    carregar: async (paginaAtual, filtros, signal) => {
      const resposta = await listarChaves(
        {
          busca: filtros.busca || undefined,
          status: filtros.status || undefined,
          ativo: true,
          page: paginaAtual,
          limit: 10,
        },
        { signal },
      );
      return {
        data: resposta.data,
        page: resposta.meta.page,
        totalPages: resposta.meta.totalPages,
        total: resposta.meta.total,
      };
    },
  });

  const [chaveSelecionada, setChaveSelecionada] = useState<Chave | null>(null);
  const emprestimosAtivosRef = useRef<EmprestimosAtivosHandle>(null);

  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);
  const [carregandoEmprestimos, setCarregandoEmprestimos] = useState(true);
  const [erroEmprestimos, setErroEmprestimos] = useState("");

  const abortEmprestimosRef = useRef<AbortController | null>(null);

  async function carregarEmprestimos() {
    abortEmprestimosRef.current?.abort();
    const controller = new AbortController();
    abortEmprestimosRef.current = controller;
    try {
      setCarregandoEmprestimos(true);
      setErroEmprestimos("");
      const resposta = await listarTodosEmprestimos(
        { status: "EMPRESTADA" },
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      setEmprestimos(resposta);
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error("Erro ao carregar empréstimos:", error);
      setErroEmprestimos("Erro ao carregar os empréstimos ativos.");
    } finally {
      if (!controller.signal.aborted) setCarregandoEmprestimos(false);
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void carregarEmprestimos();
    return () => abortEmprestimosRef.current?.abort();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function limparFiltros() {
    setBusca("");
    setStatus("");
    void listagem.carregar(1, { busca: "", status: "" });
  }

  const temFiltros = Boolean(busca || status);

  const ehResponsavelAtual = (emprestimo: Emprestimo) =>
    !isSolicitante || emprestimo.responsavelAtual.id === user?.id;

  const colunasChaves: Coluna<Chave>[] = [
    { key: "codigo", titulo: "Código", mono: true },
    { key: "descricao", titulo: "Descrição" },
    {
      key: "localizacao",
      titulo: "Localização",
      render: (c) => <span className="text-texto-medio">{c.localizacao}</span>,
    },
    {
      key: "status",
      titulo: "Status",
      render: (c) => <SeloStatusChave status={c.status} />,
    },
    {
      key: "acao",
      titulo: "Ação",
      acoes: true,
      render: (c) => {
        const emprestimoDaChave = emprestimos.find((e) => e.chave.id === c.id);
        if (c.status === "DISPONIVEL") {
          return (
            <Botao
              tamanho="sm"
              variante="primario"
              aria-label={`Emprestar chave ${c.codigo}`}
              onClick={() => setChaveSelecionada(c)}
            >
              Emprestar
            </Botao>
          );
        }
        return emprestimoDaChave && ehResponsavelAtual(emprestimoDaChave) ? (
          <Botao
            tamanho="sm"
            variante="secundario"
            aria-label={`Devolver chave ${c.codigo}`}
            onClick={() =>
              emprestimosAtivosRef.current?.solicitarDevolucao(
                emprestimoDaChave,
              )
            }
          >
            Devolver
          </Botao>
        ) : (
          <span className="text-texto-fraco">—</span>
        );
      },
    },
  ];

  return (
    <>
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader
          titulo="Chaves"
          subtitulo="Gerenciamento das chaves das salas e laboratórios."
        />

        <section className="mb-6 rounded-xl border border-linha bg-superficie p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <EntradaBusca
              rotulo="Buscar chaves por código ou descrição"
              placeholder="Buscar por código ou descrição..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void listagem.buscar();
              }}
            />
            <Selecao
              value={status}
              aria-label="Filtrar por status"
              onChange={(e) => {
                const novoStatus = e.target.value as StatusChave | "";
                setStatus(novoStatus);
                void listagem.carregar(1, { busca, status: novoStatus });
              }}
              className="lg:w-52"
            >
              <option value="">Todos os status</option>
              <option value="DISPONIVEL">Disponível</option>
              <option value="EMPRESTADA">Emprestada</option>
            </Selecao>
            <div className="flex items-center gap-2.5">
              <Botao
                variante="primario"
                onClick={() => void listagem.buscar()}
                icone={<Icone nome="buscar" />}
                className="flex-1 lg:flex-none"
              >
                Buscar
              </Botao>
              {temFiltros && (
                <Botao variante="sutil" onClick={limparFiltros}>
                  Limpar
                </Botao>
              )}
            </div>
          </div>
        </section>

        {listagem.erro && <Alerta className="mb-6">{listagem.erro}</Alerta>}

        <Cartao
          className="mb-6"
          semRecuo
          acao={
            <Contagem>
              {pluralizar(
                listagem.total,
                "chave encontrada",
                "chaves encontradas",
              )}
            </Contagem>
          }
        >
          <DataTable
            colunas={colunasChaves}
            dados={listagem.dados}
            carregando={listagem.carregando}
            mensagemVazia="Nenhuma chave encontrada."
            dicaVazia="Ajuste a busca e os filtros ou verifique o cadastro das chaves."
          />

          <Pagination
            paginaAtual={listagem.pagina}
            totalPaginas={listagem.totalPaginas}
            onAnterior={() => listagem.carregar(listagem.pagina - 1)}
            onProxima={() => listagem.carregar(listagem.pagina + 1)}
          />
        </Cartao>

        <EmprestimosAtivos
          ref={emprestimosAtivosRef}
          emprestimos={emprestimos}
          carregando={carregandoEmprestimos}
          erro={erroEmprestimos}
          onAtualizar={async () => {
            await Promise.all([carregarEmprestimos(), listagem.carregar()]);
          }}
        />
      </div>

      <EmprestimoModal
        chave={chaveSelecionada}
        onClose={() => setChaveSelecionada(null)}
        onConfirmado={async () => {
          await Promise.all([listagem.carregar(), carregarEmprestimos()]);
        }}
      />
    </>
  );
}

export default ChavesPage;
