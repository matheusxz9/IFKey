import { useEffect, useRef, useState } from "react";
import { listarChaves } from "../services/chaves";
import {
  criarEmprestimo,
  listarTodosEmprestimos,
  devolverEmprestimo,
} from "../services/emprestimos";
import { buscarSolicitante as buscarSolicitantePorId, buscarSolicitantePorMatricula } from "../services/solicitantes";
import type { Chave, StatusChave } from "../types/chave";
import type { Emprestimo } from "../types/emprestimo";
import type { Solicitante } from "../types/solicitante";
import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import DataTable, { type Coluna } from "../components/DataTable";
import Pagination from "../components/Pagination";
import { Alerta } from "../components/ui/Alerta";
import { Botao } from "../components/ui/Botao";
import { Cartao, Contagem } from "../components/ui/Cartao";
import { AreaTexto, Campo, Entrada, EntradaBusca, Selecao } from "../components/ui/Campos";
import { Icone } from "../components/ui/Icone";
import { Selo } from "../components/ui/Selo";
import { formatarTipo, pluralizar } from "../utils/formatacao";

type FiltrosChaves = { busca: string; status: StatusChave | "" };

function ChavesPage() {
  const toast = useToast();
  const { user, isSolicitante } = useAuth();
  const [chaves, setChaves] = useState<Chave[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<StatusChave | "">("");

  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);

  const [chaveSelecionada, setChaveSelecionada] = useState<Chave | null>(null);
  const [matricula, setMatricula] = useState("");
  const [solicitante, setSolicitante] = useState<Solicitante | null>(null);
  const [observacoes, setObservacoes] = useState("");
  const [buscandoSolicitante, setBuscandoSolicitante] = useState(false);
  const [salvandoEmprestimo, setSalvandoEmprestimo] = useState(false);
  const [erroModal, setErroModal] = useState("");

  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);
  const [carregandoEmprestimos, setCarregandoEmprestimos] = useState(true);
  const [erroEmprestimos, setErroEmprestimos] = useState("");
  const [emprestimoSelecionado, setEmprestimoSelecionado] = useState<Emprestimo | null>(null);
  const [devolvendo, setDevolvendo] = useState(false);

  const abortChavesRef = useRef<AbortController | null>(null);
  const abortEmprestimosRef = useRef<AbortController | null>(null);

  async function carregarChaves(
    paginaAtual = pagina,
    filtros: FiltrosChaves = { busca, status },
  ) {
    abortChavesRef.current?.abort();
    const controller = new AbortController();
    abortChavesRef.current = controller;
    try {
      setCarregando(true);
      setErro("");
      const resposta = await listarChaves(
        {
          busca: filtros.busca || undefined,
          status: filtros.status || undefined,
          ativo: true,
          page: paginaAtual,
          limit: 10,
        },
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      setChaves(resposta.data);
      setPagina(resposta.meta.page);
      setTotalPaginas(resposta.meta.totalPages);
      setTotal(resposta.meta.total);
    } catch (error) {
      if (controller.signal.aborted) return;
      setErro(error instanceof Error ? error.message : "Erro ao carregar as chaves.");
    } finally {
      if (!controller.signal.aborted) setCarregando(false);
    }
  }

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarChaves(1);
     
    carregarEmprestimos();
    return () => {
      abortChavesRef.current?.abort();
      abortEmprestimosRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buscar() {
    setPagina(1);
    carregarChaves(1);
  }

  function limparFiltros() {
    setBusca("");
    setStatus("");
    setPagina(1);
    carregarChaves(1, { busca: "", status: "" });
  }

  function abrirModalEmprestimo(chave: Chave) {
    setChaveSelecionada(chave);
    setSolicitante(null);
    setObservacoes("");
    setErroModal("");
    if (isSolicitante && user) {
      setMatricula(user.perfil === "SOLICITANTE" ? user.matricula : "");
      void carregarSolicitanteProprio();
    } else {
      setMatricula("");
    }
  }

  async function carregarSolicitanteProprio() {
    if (!user) return;
    try {
      setBuscandoSolicitante(true);
      setErroModal("");
      const proprio = await buscarSolicitantePorId(user.id);
      setSolicitante(proprio);
    } catch (error) {
      setErroModal(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar seus dados de solicitante.",
      );
    } finally {
      setBuscandoSolicitante(false);
    }
  }

  function fecharModalEmprestimo() {
    if (salvandoEmprestimo) return;
    setChaveSelecionada(null);
    setMatricula("");
    setSolicitante(null);
    setObservacoes("");
    setErroModal("");
  }

  async function buscarSolicitante() {
    if (!matricula.trim()) {
      setErroModal("Informe a matrícula do solicitante.");
      return;
    }
    try {
      setBuscandoSolicitante(true);
      setErroModal("");
      setSolicitante(null);
      const encontrado = await buscarSolicitantePorMatricula(matricula.trim());
      setSolicitante(encontrado);
    } catch (error) {
      setErroModal(error instanceof Error ? error.message : "Erro ao buscar o solicitante.");
    } finally {
      setBuscandoSolicitante(false);
    }
  }

  async function confirmarEmprestimo() {
    if (!chaveSelecionada || !solicitante) return;
    try {
      setSalvandoEmprestimo(true);
      setErroModal("");
      await criarEmprestimo({
        solicitanteId: solicitante.id,
        chaveId: chaveSelecionada.id,
        observacoes: observacoes.trim() || undefined,
      });
      fecharModalEmprestimo();
      toast.success("Empréstimo registrado com sucesso!");
      await carregarChaves(pagina);
      await carregarEmprestimos();
    } catch (error) {
      const err = error as Error & { code?: string };
      if (err.code === "CHAVE_INDISPONIVEL") {
        setErroModal("Essa chave acabou de ser emprestada. Atualize a lista e tente novamente.");
      } else {
        setErroModal(err.message || "Não foi possível realizar o empréstimo.");
      }
    } finally {
      setSalvandoEmprestimo(false);
    }
  }

  async function confirmarDevolucao() {
    if (!emprestimoSelecionado) return;
    try {
      setDevolvendo(true);
      await devolverEmprestimo(emprestimoSelecionado.id);
      toast.success("Devolução registrada com sucesso!");
      setEmprestimoSelecionado(null);
      await carregarEmprestimos();
      await carregarChaves(pagina);
    } catch {
      toast.error("Erro ao registrar a devolução. Tente novamente.");
    } finally {
      setDevolvendo(false);
    }
  }

  const temFiltros = Boolean(busca || status);

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
      render: (c) => (
        <Selo variante={c.status === "DISPONIVEL" ? "disponivel" : "emprestada"}>
          {c.status === "DISPONIVEL" ? "Disponível" : "Emprestada"}
        </Selo>
      ),
    },
    {
      key: "acao",
      titulo: "Ação",
      acoes: true,
      render: (c) => {
        const emprestimoDaChave = emprestimos.find((e) => e.chave.id === c.id);
        return c.status === "DISPONIVEL" ? (
          <Botao
            tamanho="sm"
            variante="primario"
            aria-label={`Emprestar chave ${c.codigo}`}
            onClick={() => abrirModalEmprestimo(c)}
          >
            Emprestar
          </Botao>
        ) : (
          <Botao
            tamanho="sm"
            variante="secundario"
            aria-label={`Devolver chave ${c.codigo}`}
            onClick={() => {
              if (emprestimoDaChave) setEmprestimoSelecionado(emprestimoDaChave);
            }}
            disabled={!emprestimoDaChave}
          >
            Devolver
          </Botao>
        );
      },
    },
  ];

  const colunasEmprestimos: Coluna<Emprestimo>[] = [
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
    { key: "solicitante", titulo: "Solicitante", render: (e) => e.solicitante.nome },
    { key: "matricula", titulo: "Matrícula", mono: true, render: (e) => e.solicitante.matricula },
    {
      key: "devolver",
      titulo: "Ação",
      acoes: true,
      render: (e) => (
        <Botao
          tamanho="sm"
          variante="secundario"
          aria-label={`Devolver chave ${e.chave.codigo}`}
          onClick={() => setEmprestimoSelecionado(e)}
        >
          Devolver
        </Botao>
      ),
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
                if (e.key === "Enter") buscar();
              }}
            />
            <Selecao
              value={status}
              aria-label="Filtrar por status"
              onChange={(e) => {
                const novoStatus = e.target.value as StatusChave | "";
                setStatus(novoStatus);
                setPagina(1);
                void carregarChaves(1, { busca, status: novoStatus });
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
                onClick={buscar}
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

        {erro && <Alerta className="mb-6">{erro}</Alerta>}

        <Cartao
          className="mb-6"
          semRecuo
          acao={<Contagem>{pluralizar(total, "chave encontrada", "chaves encontradas")}</Contagem>}
        >
          <DataTable
            colunas={colunasChaves}
            dados={chaves}
            carregando={carregando}
            mensagemVazia="Nenhuma chave encontrada."
            dicaVazia="Ajuste a busca e os filtros ou verifique o cadastro das chaves."
          />

          <Pagination
            paginaAtual={pagina}
            totalPaginas={totalPaginas}
            onAnterior={() => carregarChaves(pagina - 1)}
            onProxima={() => carregarChaves(pagina + 1)}
          />
        </Cartao>

        <Cartao
          semRecuo
          titulo="Empréstimos ativos"
          subtitulo="Chaves que estão atualmente emprestadas."
          acao={<Contagem>{pluralizar(emprestimos.length, "empréstimo", "empréstimos")}</Contagem>}
        >
          {erroEmprestimos && (
            <div className="border-b border-linha p-4">
              <Alerta>{erroEmprestimos}</Alerta>
            </div>
          )}

          <DataTable
            colunas={colunasEmprestimos}
            dados={emprestimos}
            carregando={carregandoEmprestimos}
            mensagemVazia="Nenhuma chave emprestada no momento."
            dicaVazia="Todas as chaves estão disponíveis."
          />
        </Cartao>
      </div>

      <ConfirmDialog
        aberto={!!emprestimoSelecionado}
        onClose={() => {
          if (!devolvendo) setEmprestimoSelecionado(null);
        }}
        onConfirmar={confirmarDevolucao}
        titulo="Confirmar devolução"
        mensagem={`Deseja devolver a chave ${emprestimoSelecionado?.chave.codigo}?`}
        textoConfirmar="Confirmar devolução"
        carregando={devolvendo}
        variante="warning"
      />

      <Modal
        aberto={!!chaveSelecionada}
        onClose={fecharModalEmprestimo}
        titulo="Registrar empréstimo"
      >
        <div className="space-y-5">
          <div className="rounded-lg border border-linha bg-superficie-alta px-4 py-3">
            <p className="text-xs text-texto-fraco">Chave selecionada</p>
            <p className="mt-1 font-mono text-[0.8125rem] font-medium text-texto">
              {chaveSelecionada?.codigo}
            </p>
            <p className="text-sm text-texto-medio">{chaveSelecionada?.descricao}</p>
            <p className="mt-1 text-xs text-texto-fraco">
              {chaveSelecionada?.localizacao}
            </p>
          </div>

          {isSolicitante ? (
            <div className="rounded-lg border border-verde/25 bg-veu-verde px-4 py-3">
              <p className="text-xs text-texto-fraco">Solicitante</p>
              {solicitante ? (
                <>
                  <p className="mt-1 font-medium text-texto">{solicitante.nome}</p>
                  <p className="text-sm text-texto-medio">
                    Matrícula: {solicitante.matricula}
                  </p>
                  <p className="text-sm text-texto-medio">
                    Tipo: {formatarTipo(solicitante.tipo)}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-texto-medio">
                  O empréstimo será registrado para você mesmo.
                </p>
              )}
            </div>
          ) : (
            <Campo label="Matrícula do solicitante" htmlFor="matricula">
              <div className="flex gap-2.5">
                <Entrada
                  id="matricula"
                  type="text"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") buscarSolicitante();
                  }}
                  placeholder="Digite a matrícula"
                  className="min-w-0 flex-1"
                />
                <Botao
                  variante="secundario"
                  onClick={buscarSolicitante}
                  carregando={buscandoSolicitante}
                >
                  {buscandoSolicitante ? "Buscando..." : "Buscar"}
                </Botao>
              </div>
            </Campo>
          )}

          {solicitante && !isSolicitante && (
            <div className="rounded-lg border border-verde/25 bg-veu-verde px-4 py-3">
              <p className="text-xs text-texto-fraco">Solicitante</p>
              <p className="mt-1 font-medium text-texto">{solicitante.nome}</p>
              <p className="text-sm text-texto-medio">
                Matrícula: {solicitante.matricula}
              </p>
              <p className="text-sm text-texto-medio">Tipo: {formatarTipo(solicitante.tipo)}</p>
            </div>
          )}

          <Campo label="Observações" htmlFor="observacoes" dica="Opcional.">
            <AreaTexto
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações sobre o empréstimo (opcional)"
              rows={3}
            />
          </Campo>

          {erroModal && <Alerta>{erroModal}</Alerta>}

          <div className="flex flex-wrap justify-end gap-2.5 pt-0.5">
            <Botao
              variante="secundario"
              onClick={fecharModalEmprestimo}
              disabled={salvandoEmprestimo}
            >
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              onClick={confirmarEmprestimo}
              disabled={salvandoEmprestimo || !solicitante}
            >
              {salvandoEmprestimo ? "Registrando..." : "Confirmar empréstimo"}
            </Botao>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default ChavesPage;
