import { useEffect, useRef, useState } from "react";
import {
  listarAdministradores,
  criarAdministrador,
  atualizarAdministrador,
  inativarAdministrador,
  converterAdministradorEmSolicitante,
} from "../services/administradores";
import type { Administrador, PerfilAdministrador } from "../types/administrador";
import type { TipoSolicitante } from "../types/solicitante";
import { useToast } from "../contexts/ToastContext";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import DataTable, { type Coluna } from "../components/DataTable";
import Pagination from "../components/Pagination";

type ModalTipo = "cadastro" | "edicao" | null;

function formatarPerfil(perfil: PerfilAdministrador) {
  switch (perfil) {
    case "ADMINISTRADOR": return "Administrador";
    case "GESTOR": return "Gestor";
    case "SOLICITANTE": return "Solicitante";
    default: return perfil;
  }
}

function GestaoAdministradoresPage() {
  const toast = useToast();
  const [administradores, setAdministradores] = useState<Administrador[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [buscaNome, setBuscaNome] = useState("");
  const [buscaLogin, setBuscaLogin] = useState("");
  const [perfil, setPerfil] = useState<PerfilAdministrador | "">("");
  const [ativo, setAtivo] = useState<boolean | "">("");

  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const [modalTipo, setModalTipo] = useState<ModalTipo>(null);
  const [administradorEmEdicao, setAdministradorEmEdicao] = useState<Administrador | null>(null);

  const [nome, setNome] = useState("");
  const [perfilForm, setPerfilForm] = useState<PerfilAdministrador>("GESTOR");
  const [login, setLogin] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState("");

  const [administradorParaInativar, setAdministradorParaInativar] = useState<Administrador | null>(null);
  const [inativando, setInativando] = useState(false);
  const [reativando, setReativando] = useState(false);

  const [adminParaConverter, setAdminParaConverter] = useState<Administrador | null>(null);
  const [tipoConversao, setTipoConversao] = useState<TipoSolicitante>("ALUNO");
  const [matriculaConversao, setMatriculaConversao] = useState("");
  const [contatoConversao, setContatoConversao] = useState("");
  const [convertendo, setConvertendo] = useState(false);
  const [erroConversao, setErroConversao] = useState("");

  const requisicaoRef = useRef(0);

  async function carregarAdministradores(
    paginaAtual = pagina,
    filtros: {
      nome: string;
      login: string;
      perfil: PerfilAdministrador | "";
      ativo: boolean | "";
    } = { nome: buscaNome, login: buscaLogin, perfil, ativo },
  ) {
    const requisicao = ++requisicaoRef.current;
    try {
      setCarregando(true);
      setErro("");
      const resposta = await listarAdministradores({
        nome: filtros.nome || undefined,
        login: filtros.login || undefined,
        perfil: filtros.perfil || undefined,
        ativo: filtros.ativo !== "" ? filtros.ativo : undefined,
        page: paginaAtual,
        limit: 10,
      });
      if (requisicao !== requisicaoRef.current) return;
      setAdministradores(resposta.data);
      setPagina(resposta.page);
      setTotalPaginas(resposta.totalPages);
    } catch (error) {
      if (requisicao !== requisicaoRef.current) return;
      setErro(error instanceof Error ? error.message : "Erro ao carregar os administradores.");
    } finally {
      if (requisicao === requisicaoRef.current) setCarregando(false);
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    carregarAdministradores(1);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  function buscar() {
    setPagina(1);
    carregarAdministradores(1);
  }

  function abrirModalCadastro() {
    setModalTipo("cadastro");
    setAdministradorEmEdicao(null);
    setNome("");
    setPerfilForm("GESTOR");
    setLogin("");
    setErroModal("");
  }

  function abrirModalEdicao(administrador: Administrador) {
    setModalTipo("edicao");
    setAdministradorEmEdicao(administrador);
    setNome(administrador.nome);
    setPerfilForm(administrador.perfil);
    setLogin(administrador.login);
    setErroModal("");
  }

  function fecharModal() {
    if (salvando) return;
    setModalTipo(null);
    setAdministradorEmEdicao(null);
    setNome("");
    setPerfilForm("GESTOR");
    setLogin("");
    setErroModal("");
  }

  async function confirmarSalvar() {
    if (!nome.trim() || !login.trim()) {
      setErroModal("Preencha todos os campos obrigatórios.");
      return;
    }
    try {
      setSalvando(true);
      setErroModal("");
      if (modalTipo === "cadastro") {
        await criarAdministrador({ nome: nome.trim(), login: login.trim(), perfil: perfilForm });
      } else if (modalTipo === "edicao" && administradorEmEdicao) {
        await atualizarAdministrador(administradorEmEdicao.id, { nome: nome.trim(), perfil: perfilForm });
      }
      fecharModal();
      toast.success(modalTipo === "cadastro" ? "Administrador cadastrado com sucesso!" : "Administrador atualizado com sucesso!");
      await carregarAdministradores(pagina);
    } catch (error) {
      const err = error as Error & { code?: string };
      if (err.code === "LOGIN_DUPLICADO") {
        setErroModal("Já existe um administrador com esse login.");
      } else if (err.code === "IDENTIFICADOR_DUPLICADO") {
        setErroModal("Esse login já pertence a um solicitante cadastrado.");
      } else if (err.code === "ULTIMO_ADMINISTRADOR") {
        setErroModal("Não é possível deixar o sistema sem administrador ativo. Ative ou cadastre outro administrador antes.");
      } else if (err.code === "VALIDACAO") {
        setErroModal("Dados inválidos. Verifique os campos informados.");
      } else {
        setErroModal(err.message || "Não foi possível salvar o administrador.");
      }
    } finally {
      setSalvando(false);
    }
  }

  async function executarInativacao() {
    if (!administradorParaInativar) return;
    try {
      setInativando(true);
      await inativarAdministrador(administradorParaInativar.id);
      toast.success("Administrador inativado com sucesso!");
      setAdministradorParaInativar(null);
      await carregarAdministradores(pagina);
    } catch (error) {
      const err = error as Error & { code?: string };
      if (err.code === "ULTIMO_ADMINISTRADOR") {
        toast.error("Não é possível inativar o último administrador ativo. Ative ou cadastre outro administrador antes.");
      } else {
        toast.error("Erro ao inativar o administrador. Tente novamente.");
      }
    } finally {
      setInativando(false);
    }
  }

  function abrirModalConversao(administrador: Administrador) {
    setAdminParaConverter(administrador);
    setTipoConversao("ALUNO");
    setMatriculaConversao(administrador.login);
    setContatoConversao("");
    setErroConversao("");
  }

  function fecharModalConversao() {
    if (convertendo) return;
    setAdminParaConverter(null);
    setErroConversao("");
  }

  async function confirmarConversao() {
    if (!adminParaConverter) return;
    try {
      setConvertendo(true);
      setErroConversao("");
      const solicitante = await converterAdministradorEmSolicitante(adminParaConverter.id, {
        tipo: tipoConversao,
        matricula: matriculaConversao.trim() || undefined,
        contato: contatoConversao.trim() || undefined,
      });
      toast.success(`${solicitante.nome} agora é solicitante (matrícula ${solicitante.matricula}).`);
      fecharModalConversao();
      await carregarAdministradores(pagina);
    } catch (error) {
      const err = error as Error & { code?: string };
      if (err.code === "ULTIMO_ADMINISTRADOR") {
        setErroConversao("Não é possível converter o último administrador ativo. Ative ou cadastre outro administrador antes.");
      } else if (err.code === "MATRICULA_DUPLICADA") {
        setErroConversao("Já existe um solicitante com essa matrícula.");
      } else if (err.code === "VALIDACAO") {
        setErroConversao("Dados inválidos. Verifique os campos informados.");
      } else {
        setErroConversao(err.message || "Não foi possível converter o administrador.");
      }
    } finally {
      setConvertendo(false);
    }
  }

  async function executarReativacao(administrador: Administrador) {
    try {
      setReativando(true);
      await atualizarAdministrador(administrador.id, { ativo: true });
      toast.success("Administrador reativado com sucesso!");
      await carregarAdministradores(pagina);
    } catch {
      toast.error("Erro ao reativar o administrador. Tente novamente.");
    } finally {
      setReativando(false);
    }
  }

  const colunas: Coluna<Administrador>[] = [
    { key: "nome", titulo: "Nome" },
    { key: "login", titulo: "Login" },
    {
      key: "perfil",
      titulo: "Perfil",
      render: (a) => (
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
          a.perfil === "ADMINISTRADOR" ? "bg-red-900 text-red-300"
          : a.perfil === "GESTOR" ? "bg-blue-900 text-blue-300"
          : "bg-green-900 text-green-300"
        }`}>
          {formatarPerfil(a.perfil)}
        </span>
      ),
    },
    {
      key: "ativo",
      titulo: "Ativo",
      render: (a) => (
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
          a.ativo ? "bg-green-900 text-green-300" : "bg-gray-700 text-gray-300"
        }`}>
          {a.ativo ? "Ativo" : "Inativo"}
        </span>
      ),
    },
    {
      key: "acoes",
      titulo: "Ações",
      render: (a) => (
        <div className="flex gap-2">
          <button type="button" aria-label={`Editar administrador ${a.nome}`}
            onClick={() => abrirModalEdicao(a)}
            className="rounded-md border border-gray-700 px-3 py-1 text-sm font-medium text-gray-300 hover:bg-gray-800 cursor-pointer">
            Editar
          </button>
          {a.ativo && (
            <button type="button" aria-label={`Tornar ${a.nome} solicitante`}
              onClick={() => abrirModalConversao(a)}
              className="rounded-md border border-amber-700 px-3 py-1 text-sm font-medium text-amber-400 hover:bg-amber-950/40 cursor-pointer">
              Tornar solicitante
            </button>
          )}
          {a.ativo && (
            <button type="button" aria-label={`Inativar administrador ${a.nome}`}
              onClick={() => setAdministradorParaInativar(a)}
              className="rounded-md border border-red-800 px-3 py-1 text-sm font-medium text-red-400 hover:bg-red-950/40 cursor-pointer">
              Inativar
            </button>
          )}
          {!a.ativo && (
            <button type="button" aria-label={`Reativar administrador ${a.nome}`}
              onClick={() => executarReativacao(a)} disabled={reativando}
              className="rounded-md border border-green-800 px-3 py-1 text-sm font-medium text-green-400 hover:bg-green-950/40 disabled:opacity-40 cursor-pointer">
              Reativar
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="mx-auto max-w-6xl">
        <PageHeader titulo="Gestão de administradores" subtitulo="Cadastre, edite e gerencie os administradores do sistema.">
          <button type="button" onClick={abrirModalCadastro}
            className="rounded-md bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800 cursor-pointer">
            Novo administrador
          </button>
        </PageHeader>

        <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-gray-800 bg-gray-900 p-5 md:flex-row">
          <input type="text" placeholder="Buscar por nome..." aria-label="Buscar administradores por nome"
            value={buscaNome}
            onChange={(e) => setBuscaNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") buscar(); }}
            className="flex-1 rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500" />
          <input type="text" placeholder="Buscar por login..." aria-label="Buscar administradores por login"
            value={buscaLogin}
            onChange={(e) => setBuscaLogin(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") buscar(); }}
            className="flex-1 rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500" />
          <select value={perfil} aria-label="Filtrar por perfil do administrador"
            onChange={(e) => {
              const novoPerfil = e.target.value as PerfilAdministrador | "";
              setPerfil(novoPerfil);
              setPagina(1);
              void carregarAdministradores(1, { nome: buscaNome, login: buscaLogin, perfil: novoPerfil, ativo });
            }}
            className="rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500 cursor-pointer">
            <option value="">Todos os perfis</option>
            <option value="ADMINISTRADOR">Administrador</option>
            <option value="GESTOR">Gestor</option>
          </select>
          <select value={ativo === "" ? "" : String(ativo)} aria-label="Filtrar por situação do cadastro"
            onChange={(e) => {
              const valor = e.target.value;
              const novoAtivo = valor === "" ? "" : valor === "true";
              setAtivo(novoAtivo);
              setPagina(1);
              void carregarAdministradores(1, { nome: buscaNome, login: buscaLogin, perfil, ativo: novoAtivo });
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
          <DataTable colunas={colunas} dados={administradores}
            carregando={carregando} mensagemVazia="Nenhum administrador encontrado." />
          <Pagination paginaAtual={pagina} totalPaginas={totalPaginas}
            onAnterior={() => carregarAdministradores(pagina - 1)}
            onProxima={() => carregarAdministradores(pagina + 1)} />
        </section>
      </div>

      <Modal aberto={!!modalTipo} onClose={fecharModal}
        titulo={modalTipo === "cadastro" ? "Novo administrador" : "Editar administrador"}>
        <div className="mb-4">
          <label htmlFor="nome" className="mb-2 block text-sm font-medium">Nome</label>
          <input id="nome" type="text" value={nome} onChange={(e) => setNome(e.target.value)}
            placeholder="Nome completo"
            className="w-full rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500" />
        </div>
        {modalTipo === "cadastro" && (
          <div className="mb-4">
            <label htmlFor="login" className="mb-2 block text-sm font-medium">Login (SUAP)</label>
            <input id="login" type="text" value={login} onChange={(e) => setLogin(e.target.value)}
              placeholder="Login do SUAP"
              className="w-full rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500" />
          </div>
        )}
        <div className="mb-4">
          <label htmlFor="perfil" className="mb-2 block text-sm font-medium">Perfil</label>
          <select id="perfil" value={perfilForm} onChange={(e) => setPerfilForm(e.target.value as PerfilAdministrador)}
            className="w-full rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500 cursor-pointer">
            <option value="ADMINISTRADOR">Administrador</option>
            <option value="GESTOR">Gestor</option>
          </select>
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

      <ConfirmDialog aberto={!!administradorParaInativar} onClose={() => setAdministradorParaInativar(null)}
        onConfirmar={executarInativacao} titulo="Inativar administrador"
        mensagem={`Tem certeza que deseja inativar ${administradorParaInativar?.nome}?`}
        textoConfirmar="Confirmar inativação" carregando={inativando} />

      <Modal aberto={!!adminParaConverter} onClose={fecharModalConversao}
        titulo="Tornar administrador em solicitante">
        <p className="mb-4 text-sm text-gray-400">
          O administrador <strong className="text-gray-200">{adminParaConverter?.nome}</strong> será
          inativado e passará a acessar o sistema como solicitante, com a matrícula informada.
        </p>
        <div className="mb-4">
          <label htmlFor="tipoConversao" className="mb-2 block text-sm font-medium">Tipo</label>
          <select id="tipoConversao" value={tipoConversao}
            onChange={(e) => setTipoConversao(e.target.value as TipoSolicitante)}
            className="w-full rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500 cursor-pointer">
            <option value="ALUNO">Aluno</option>
            <option value="PROFESSOR">Professor</option>
            <option value="SERVIDOR">Servidor</option>
          </select>
        </div>
        <div className="mb-4">
          <label htmlFor="matriculaConversao" className="mb-2 block text-sm font-medium">Matrícula (SUAP)</label>
          <input id="matriculaConversao" type="text" value={matriculaConversao}
            onChange={(e) => setMatriculaConversao(e.target.value)}
            placeholder="Matrícula do SUAP"
            className="w-full rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500" />
        </div>
        <div className="mb-4">
          <label htmlFor="contatoConversao" className="mb-2 block text-sm font-medium">Contato (opcional)</label>
          <input id="contatoConversao" type="text" value={contatoConversao}
            onChange={(e) => setContatoConversao(e.target.value)}
            placeholder="E-mail ou telefone"
            className="w-full rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500" />
        </div>
        {erroConversao && (
          <div className="mb-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-400" role="alert">{erroConversao}</div>
        )}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={fecharModalConversao} disabled={convertendo}
            className="rounded-md border border-gray-700 px-5 py-3 font-semibold text-gray-300 hover:bg-gray-800 disabled:opacity-40 cursor-pointer">
            Cancelar
          </button>
          <button type="button" onClick={confirmarConversao} disabled={convertendo}
            className="rounded-md bg-amber-700 px-5 py-3 font-semibold text-white hover:bg-amber-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40">
            {convertendo ? "Convertendo..." : "Converter"}
          </button>
        </div>
      </Modal>
    </>
  );
}

export default GestaoAdministradoresPage;