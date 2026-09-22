import { useEffect, useState } from "react";
import { listarChaves } from "../services/chaves";
import {
  criarEmprestimo,
  listarEmprestimos,
  devolverEmprestimo,
} from "../services/emprestimos";
import { buscarSolicitantePorMatricula } from "../services/solicitantes";
import type { Chave, StatusChave } from "../types/chave";
import type { Emprestimo } from "../types/emprestimo";
import type { Solicitante } from "../types/solicitante";
import { useToast } from "../contexts/ToastContext";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import DataTable, { type Coluna } from "../components/DataTable";
import Pagination from "../components/Pagination";

function ChavesPage() {
  const toast = useToast();
  const [chaves, setChaves] = useState<Chave[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<StatusChave | "">("");

  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const [chaveSelecionada, setChaveSelecionada] = useState<Chave | null>(null);
  const [matricula, setMatricula] = useState("");
  const [solicitante, setSolicitante] = useState<Solicitante | null>(null);
  const [observacoes, setObservacoes] = useState("");
  const [buscandoSolicitante, setBuscandoSolicitante] = useState(false);
  const [salvandoEmprestimo, setSalvandoEmprestimo] = useState(false);
  const [erroModal, setErroModal] = useState("");

  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);
  const [carregandoEmprestimos, setCarregandoEmprestimos] = useState(true);
  const [emprestimoSelecionado, setEmprestimoSelecionado] = useState<Emprestimo | null>(null);
  const [devolvendo, setDevolvendo] = useState(false);

  async function carregarChaves(paginaAtual = pagina) {
    try {
      setCarregando(true);
      setErro("");
      const resposta = await listarChaves({
        busca: busca || undefined,
        status: status || undefined,
        page: paginaAtual,
        limit: 10,
      });
      setChaves(resposta.data);
      setPagina(resposta.meta.page);
      setTotalPaginas(resposta.meta.totalPages);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar as chaves.");
    } finally {
      setCarregando(false);
    }
  }

  async function carregarEmprestimos() {
    try {
      setCarregandoEmprestimos(true);
      const resposta = await listarEmprestimos({ status: "EMPRESTADA" });
      setEmprestimos(resposta);
    } catch (error) {
      console.error("Erro ao carregar empréstimos:", error);
    } finally {
      setCarregandoEmprestimos(false);
    }
  }

  useEffect(() => {
    carregarChaves(1);
    carregarEmprestimos();
  }, []);

  function buscar() {
    setPagina(1);
    carregarChaves(1);
  }

  function abrirModalEmprestimo(chave: Chave) {
    setChaveSelecionada(chave);
    setMatricula("");
    setSolicitante(null);
    setObservacoes("");
    setErroModal("");
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
      // erro já tratado
    } finally {
      setDevolvendo(false);
    }
  }

  const colunasChaves: Coluna<Record<string, unknown>>[] = [
    { key: "codigo", titulo: "Código" },
    { key: "descricao", titulo: "Descrição" },
    {
      key: "status",
      titulo: "Status",
      render: (item) => {
        const c = item as unknown as Chave;
        return (
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            c.status === "DISPONIVEL" ? "bg-green-900 text-green-300" : "bg-yellow-900 text-yellow-300"
          }`}>
            {c.status === "DISPONIVEL" ? "Disponível" : "Emprestada"}
          </span>
        );
      },
    },
    {
      key: "acao",
      titulo: "Ação",
      render: (item) => {
        const c = item as unknown as Chave;
        const emprestimoDaChave = emprestimos.find((e) => e.chave.id === c.id);
        return c.status === "DISPONIVEL" ? (
          <button type="button" onClick={() => abrirModalEmprestimo(c)}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 cursor-pointer">
            Emprestar
          </button>
        ) : (
          <button type="button" onClick={() => { if (emprestimoDaChave) setEmprestimoSelecionado(emprestimoDaChave); }}
            disabled={!emprestimoDaChave}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50">
            Devolver
          </button>
        );
      },
    },
  ];

  const colunasEmprestimos: Coluna<Record<string, unknown>>[] = [
    {
      key: "chave",
      titulo: "Chave",
      render: (item) => {
        const e = item as unknown as Emprestimo;
        return (
          <>
            <p className="font-medium">{e.chave.codigo}</p>
            <p className="text-sm text-gray-400">{e.chave.descricao}</p>
          </>
        );
      },
    },
    { key: "solicitante", titulo: "Solicitante", render: (item) => (item as unknown as Emprestimo).solicitante.nome },
    { key: "matricula", titulo: "Matrícula", render: (item) => (item as unknown as Emprestimo).solicitante.matricula },
    {
      key: "devolver",
      titulo: "Ação",
      render: (item) => (
        <button type="button" onClick={() => setEmprestimoSelecionado(item as unknown as Emprestimo)}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 cursor-pointer">
          Devolver
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="mx-auto max-w-6xl">
        <PageHeader titulo="Chaves" subtitulo="Gerenciamento das chaves das salas e laboratórios." />

        <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-gray-800 bg-gray-900 p-5 md:flex-row">
          <input type="text" placeholder="Buscar por código ou descrição..." value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") buscar(); }}
            className="flex-1 rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500" />
          <select value={status} onChange={(e) => { setStatus(e.target.value as StatusChave | ""); setPagina(1); setTimeout(() => carregarChaves(1), 0); }}
            className="rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500 cursor-pointer">
            <option value="">Todos os status</option>
            <option value="DISPONIVEL">Disponível</option>
            <option value="EMPRESTADA">Emprestada</option>
          </select>
          <button type="button" onClick={buscar}
            className="rounded-md bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 cursor-pointer">
            Buscar
          </button>
        </section>

        {erro && (
          <div className="mb-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-red-400">{erro}</div>
        )}

        <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
          <DataTable colunas={colunasChaves} dados={chaves as unknown as Record<string, unknown>[]}
            carregando={carregando} mensagemVazia="Nenhuma chave encontrada." />
          <Pagination paginaAtual={pagina} totalPaginas={totalPaginas}
            onAnterior={() => carregarChaves(pagina - 1)} onProxima={() => carregarChaves(pagina + 1)} />
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
          <div className="border-b border-gray-800 px-6 py-5">
            <h2 className="text-xl font-bold">Empréstimos ativos</h2>
            <p className="mt-1 text-sm text-gray-400">Chaves que estão atualmente emprestadas.</p>
          </div>
          <DataTable colunas={colunasEmprestimos} dados={emprestimos as unknown as Record<string, unknown>[]}
            carregando={carregandoEmprestimos} mensagemVazia="Nenhuma chave emprestada no momento." />
        </section>
      </div>

      <ConfirmDialog
        aberto={!!emprestimoSelecionado}
        onClose={() => { if (!devolvendo) setEmprestimoSelecionado(null); }}
        onConfirmar={confirmarDevolucao}
        titulo="Confirmar devolução"
        mensagem={`Deseja devolver a chave ${emprestimoSelecionado?.chave.codigo}?`}
        textoConfirmar="Confirmar devolução"
        carregando={devolvendo}
        variante="warning"
      />

      <Modal aberto={!!chaveSelecionada} onClose={fecharModalEmprestimo} titulo="Registrar empréstimo">
        <div className="mb-6 rounded-lg border border-gray-700 bg-gray-950 p-4">
          <p className="text-sm text-gray-400">Chave selecionada</p>
          <p className="mt-1 font-semibold">{chaveSelecionada?.codigo}</p>
          <p className="text-sm text-gray-400">{chaveSelecionada?.descricao}</p>
        </div>
        <div className="mb-6">
          <label htmlFor="matricula" className="mb-2 block text-sm font-medium">Matrícula do solicitante</label>
          <div className="flex gap-3">
            <input id="matricula" type="text" value={matricula} onChange={(e) => setMatricula(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") buscarSolicitante(); }}
              placeholder="Digite a matrícula"
              className="min-w-0 flex-1 rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500" />
            <button type="button" onClick={buscarSolicitante} disabled={buscandoSolicitante}
              className="rounded-md bg-green-600 px-4 py-3 font-semibold hover:bg-green-700 disabled:opacity-50 cursor-pointer">
              {buscandoSolicitante ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </div>
        {solicitante && (
          <div className="mb-6 rounded-lg border border-green-800 bg-green-950/30 p-4">
            <p className="text-sm text-gray-400">Solicitante</p>
            <p className="mt-1 font-semibold">{solicitante.nome}</p>
            <p className="text-sm text-gray-400">Matrícula: {solicitante.matricula}</p>
            <p className="text-sm text-gray-400">Tipo: {solicitante.tipo}</p>
          </div>
        )}
        <div className="mb-6">
          <label htmlFor="observacoes" className="mb-2 block text-sm font-medium">Observações</label>
          <textarea id="observacoes" value={observacoes} onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Observações sobre o empréstimo (opcional)" rows={3}
            className="w-full resize-none rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500" />
        </div>
        {erroModal && (
          <div className="mb-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-400">{erroModal}</div>
        )}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={fecharModalEmprestimo} disabled={salvandoEmprestimo}
            className="rounded-md border border-gray-700 px-5 py-3 font-semibold text-gray-300 hover:bg-gray-800 disabled:opacity-40 cursor-pointer">
            Cancelar
          </button>
          <button type="button" onClick={confirmarEmprestimo} disabled={salvandoEmprestimo || !solicitante}
            className="rounded-md bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40">
            {salvandoEmprestimo ? "Registrando..." : "Confirmar empréstimo"}
          </button>
        </div>
      </Modal>
    </>
  );
}

export default ChavesPage;
