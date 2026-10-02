import { useEffect, useRef, useState } from "react";
import {
  listarSolicitantes,
  criarSolicitante,
  atualizarSolicitante,
  inativarSolicitante,
} from "../services/solicitantes";
import type { Solicitante, TipoSolicitante } from "../types/solicitante";
import { useToast } from "../contexts/ToastContext";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import DataTable, { type Coluna } from "../components/DataTable";
import Pagination from "../components/Pagination";

type ModalTipo = "cadastro" | "edicao" | null;

function formatarTipo(tipo: TipoSolicitante) {
  switch (tipo) {
    case "ALUNO": return "Aluno";
    case "PROFESSOR": return "Professor";
    case "SERVIDOR": return "Servidor";
    default: return tipo;
  }
}

function GestaoSolicitantesPage() {
  const toast = useToast();
  const [solicitantes, setSolicitantes] = useState<Solicitante[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [buscaNome, setBuscaNome] = useState("");
  const [buscaMatricula, setBuscaMatricula] = useState("");
  const [tipo, setTipo] = useState<TipoSolicitante | "">("");
  const [ativo, setAtivo] = useState<boolean | "">("");

  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const [modalTipo, setModalTipo] = useState<ModalTipo>(null);
  const [solicitanteEmEdicao, setSolicitanteEmEdicao] = useState<Solicitante | null>(null);

  const [nome, setNome] = useState("");
  const [tipoForm, setTipoForm] = useState<TipoSolicitante>("ALUNO");
  const [matricula, setMatricula] = useState("");
  const [contato, setContato] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState("");

  const [solicitanteParaInativar, setSolicitanteParaInativar] = useState<Solicitante | null>(null);
  const [inativando, setInativando] = useState(false);

  const requisicaoRef = useRef(0);

  async function carregarSolicitantes(
    paginaAtual = pagina,
    filtros: {
      nome: string;
      matricula: string;
      tipo: TipoSolicitante | "";
      ativo: boolean | "";
    } = { nome: buscaNome, matricula: buscaMatricula, tipo, ativo },
  ) {
    const requisicao = ++requisicaoRef.current;
    try {
      setCarregando(true);
      setErro("");
      const resposta = await listarSolicitantes({
        nome: filtros.nome || undefined,
        matricula: filtros.matricula || undefined,
        tipo: filtros.tipo || undefined,
        ativo: filtros.ativo !== "" ? filtros.ativo : undefined,
        page: paginaAtual,
        limit: 10,
      });
      if (requisicao !== requisicaoRef.current) return;
      setSolicitantes(resposta.data);
      setPagina(resposta.meta.page);
      setTotalPaginas(resposta.meta.totalPages);
    } catch (error) {
      if (requisicao !== requisicaoRef.current) return;
      setErro(error instanceof Error ? error.message : "Erro ao carregar os solicitantes.");
    } finally {
      if (requisicao === requisicaoRef.current) setCarregando(false);
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    carregarSolicitantes(1);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  function buscar() {
    setPagina(1);
    carregarSolicitantes(1);
  }

  function abrirModalCadastro() {
    setModalTipo("cadastro");
    setSolicitanteEmEdicao(null);
    setNome("");
    setTipoForm("ALUNO");
    setMatricula("");
    setContato("");
    setErroModal("");
  }

  function abrirModalEdicao(solicitante: Solicitante) {
    setModalTipo("edicao");
    setSolicitanteEmEdicao(solicitante);
    setNome(solicitante.nome);
    setTipoForm(solicitante.tipo);
    setMatricula(solicitante.matricula);
    setContato(solicitante.contato);
    setErroModal("");
  }

  function fecharModal() {
    if (salvando) return;
    setModalTipo(null);
    setSolicitanteEmEdicao(null);
    setNome("");
    setTipoForm("ALUNO");
    setMatricula("");
    setContato("");
    setErroModal("");
  }

  async function confirmarSalvar() {
    if (!nome.trim() || !matricula.trim() || !contato.trim()) {
      setErroModal("Preencha todos os campos.");
      return;
    }
    try {
      setSalvando(true);
      setErroModal("");
      if (modalTipo === "cadastro") {
        await criarSolicitante({ nome: nome.trim(), tipo: tipoForm, matricula: matricula.trim(), contato: contato.trim() });
      } else if (modalTipo === "edicao" && solicitanteEmEdicao) {
        await atualizarSolicitante(solicitanteEmEdicao.id, { nome: nome.trim(), tipo: tipoForm, matricula: matricula.trim(), contato: contato.trim() });
      }
      fecharModal();
      toast.success(modalTipo === "cadastro" ? "Solicitante cadastrado com sucesso!" : "Solicitante atualizado com sucesso!");
      await carregarSolicitantes(pagina);
    } catch (error) {
      const err = error as Error & { code?: string };
      if (err.code === "MATRICULA_DUPLICADA") {
        setErroModal("Já existe um solicitante com essa matrícula.");
      } else if (err.code === "VALIDACAO") {
        setErroModal("Dados inválidos. Verifique os campos informados.");
      } else {
        setErroModal(err.message || "Não foi possível salvar o solicitante.");
      }
    } finally {
      setSalvando(false);
    }
  }

  async function executarInativacao() {
    if (!solicitanteParaInativar) return;
    try {
      setInativando(true);
      await inativarSolicitante(solicitanteParaInativar.id);
      toast.success("Solicitante inativado com sucesso!");
      setSolicitanteParaInativar(null);
      await carregarSolicitantes(pagina);
    } catch {
      toast.error("Erro ao inativar o solicitante. Tente novamente.");
    } finally {
      setInativando(false);
    }
  }

  const colunas: Coluna<Solicitante>[] = [
    { key: "nome", titulo: "Nome" },
    {
      key: "tipo",
      titulo: "Tipo",
      render: (s) => (
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
          s.tipo === "ALUNO" ? "bg-blue-900 text-blue-300"
          : s.tipo === "PROFESSOR" ? "bg-purple-900 text-purple-300"
          : "bg-orange-900 text-orange-300"
        }`}>
          {formatarTipo(s.tipo)}
        </span>
      ),
    },
    { key: "matricula", titulo: "Matrícula" },
    { key: "contato", titulo: "Contato" },
    {
      key: "ativo",
      titulo: "Ativo",
      render: (s) => (
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
          s.ativo ? "bg-green-900 text-green-300" : "bg-gray-700 text-gray-400"
        }`}>
          {s.ativo ? "Ativo" : "Inativo"}
        </span>
      ),
    },
    {
      key: "acoes",
      titulo: "Ações",
      render: (s) => (
        <div className="flex gap-2">
          <button type="button" aria-label={`Editar solicitante ${s.nome}`}
            onClick={() => abrirModalEdicao(s)}
            className="rounded-md border border-gray-700 px-3 py-1 text-sm font-medium text-gray-300 hover:bg-gray-800 cursor-pointer">
            Editar
          </button>
          {s.ativo && (
            <button type="button" aria-label={`Inativar solicitante ${s.nome}`}
              onClick={() => setSolicitanteParaInativar(s)}
              className="rounded-md border border-red-800 px-3 py-1 text-sm font-medium text-red-400 hover:bg-red-950/40 cursor-pointer">
              Inativar
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="mx-auto max-w-6xl">
        <PageHeader titulo="Gestão de solicitantes" subtitulo="Cadastre, edite e gerencie os solicitantes de chaves.">
          <button type="button" onClick={abrirModalCadastro}
            className="rounded-md bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800 cursor-pointer">
            Novo solicitante
          </button>
        </PageHeader>

        <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-gray-800 bg-gray-900 p-5 md:flex-row">
          <input type="text" placeholder="Buscar por nome..." aria-label="Buscar solicitantes por nome"
            value={buscaNome}
            onChange={(e) => setBuscaNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") buscar(); }}
            className="flex-1 rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500" />
          <input type="text" placeholder="Buscar por matrícula..." aria-label="Buscar solicitantes por matrícula"
            value={buscaMatricula}
            onChange={(e) => setBuscaMatricula(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") buscar(); }}
            className="flex-1 rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500" />
          <select value={tipo} aria-label="Filtrar por tipo de solicitante"
            onChange={(e) => {
              const novoTipo = e.target.value as TipoSolicitante | "";
              setTipo(novoTipo);
              setPagina(1);
              void carregarSolicitantes(1, { nome: buscaNome, matricula: buscaMatricula, tipo: novoTipo, ativo });
            }}
            className="rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500 cursor-pointer">
            <option value="">Todos os tipos</option>
            <option value="ALUNO">Aluno</option>
            <option value="PROFESSOR">Professor</option>
            <option value="SERVIDOR">Servidor</option>
          </select>
          <select value={ativo === "" ? "" : String(ativo)} aria-label="Filtrar por situação do cadastro"
            onChange={(e) => {
              const valor = e.target.value;
              const novoAtivo = valor === "" ? "" : valor === "true";
              setAtivo(novoAtivo);
              setPagina(1);
              void carregarSolicitantes(1, { nome: buscaNome, matricula: buscaMatricula, tipo, ativo: novoAtivo });
            }}
            className="rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500 cursor-pointer">
            <option value="">Todos</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
          <button type="button" onClick={buscar}
            className="rounded-md bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800 cursor-pointer">
            Buscar
          </button>
        </section>

        {erro && (
          <div className="mb-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-red-400" role="alert">{erro}</div>
        )}

        <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
          <DataTable colunas={colunas} dados={solicitantes}
            carregando={carregando} mensagemVazia="Nenhum solicitante encontrado." />
          <Pagination paginaAtual={pagina} totalPaginas={totalPaginas}
            onAnterior={() => carregarSolicitantes(pagina - 1)}
            onProxima={() => carregarSolicitantes(pagina + 1)} />
        </section>
      </div>

      <Modal aberto={!!modalTipo} onClose={fecharModal}
        titulo={modalTipo === "cadastro" ? "Novo solicitante" : "Editar solicitante"}>
        <div className="mb-4">
          <label htmlFor="nome" className="mb-2 block text-sm font-medium">Nome</label>
          <input id="nome" type="text" value={nome} onChange={(e) => setNome(e.target.value)}
            placeholder="Nome completo"
            className="w-full rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500" />
        </div>
        <div className="mb-4">
          <label htmlFor="tipo" className="mb-2 block text-sm font-medium">Tipo</label>
          <select id="tipo" value={tipoForm} onChange={(e) => setTipoForm(e.target.value as TipoSolicitante)}
            className="w-full rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500 cursor-pointer">
            <option value="ALUNO">Aluno</option>
            <option value="PROFESSOR">Professor</option>
            <option value="SERVIDOR">Servidor</option>
          </select>
        </div>
        <div className="mb-4">
          <label htmlFor="matricula" className="mb-2 block text-sm font-medium">Matrícula</label>
          <input id="matricula" type="text" value={matricula} onChange={(e) => setMatricula(e.target.value)}
            placeholder="Número da matrícula"
            className="w-full rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500" />
        </div>
        <div className="mb-6">
          <label htmlFor="contato" className="mb-2 block text-sm font-medium">Contato</label>
          <input id="contato" type="text" value={contato} onChange={(e) => setContato(e.target.value)}
            placeholder="E-mail ou telefone"
            className="w-full rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500" />
        </div>
        {erroModal && (
          <div className="mb-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-400" role="alert">{erroModal}</div>
        )}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={fecharModal} disabled={salvando}
            className="rounded-md border border-gray-700 px-5 py-3 font-semibold text-gray-300 hover:bg-gray-800 disabled:opacity-40 cursor-pointer">
            Cancelar
          </button>
          <button type="button" onClick={confirmarSalvar} disabled={salvando}
            className="rounded-md bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40">
            {salvando ? "Salvando..." : modalTipo === "cadastro" ? "Cadastrar" : "Salvar"}
          </button>
        </div>
      </Modal>

      <ConfirmDialog aberto={!!solicitanteParaInativar} onClose={() => setSolicitanteParaInativar(null)}
        onConfirmar={executarInativacao} titulo="Inativar solicitante"
        mensagem={`Tem certeza que deseja inativar ${solicitanteParaInativar?.nome}?`}
        textoConfirmar="Confirmar inativação" carregando={inativando} />
    </>
  );
}

export default GestaoSolicitantesPage;
