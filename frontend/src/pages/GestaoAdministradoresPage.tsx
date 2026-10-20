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
import { Alerta } from "../components/ui/Alerta";
import { Botao } from "../components/ui/Botao";
import { Cartao, Contagem } from "../components/ui/Cartao";
import { Campo, Entrada, EntradaBusca, Selecao } from "../components/ui/Campos";
import { Icone } from "../components/ui/Icone";
import { Selo, type VarianteSelo } from "../components/ui/Selo";
import { formatarPerfil, pluralizar } from "../utils/formatacao";

type ModalTipo = "cadastro" | "edicao" | null;

const variantePerfil: Record<PerfilAdministrador, VarianteSelo> = {
  ADMINISTRADOR: "administrador",
  GESTOR: "gestor",
  SOLICITANTE: "solicitante",
};

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
  const [total, setTotal] = useState(0);

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
      setTotal(resposta.total);
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

  function limparFiltros() {
    setBuscaNome("");
    setBuscaLogin("");
    setPerfil("");
    setAtivo("");
    setPagina(1);
    carregarAdministradores(1, { nome: "", login: "", perfil: "", ativo: "" });
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

  const temFiltros = Boolean(buscaNome || buscaLogin || perfil || ativo !== "");

  const colunas: Coluna<Administrador>[] = [
    { key: "nome", titulo: "Nome" },
    { key: "login", titulo: "Login", mono: true },
    {
      key: "perfil",
      titulo: "Perfil",
      render: (a) => (
        <Selo variante={variantePerfil[a.perfil] ?? "gestor"}>
          {formatarPerfil(a.perfil)}
        </Selo>
      ),
    },
    {
      key: "ativo",
      titulo: "Ativo",
      render: (a) => (
        <Selo variante={a.ativo ? "ativo" : "inativo"}>
          {a.ativo ? "Ativo" : "Inativo"}
        </Selo>
      ),
    },
    {
      key: "acoes",
      titulo: "Ações",
      acoes: true,
      render: (a) => (
        <div className="flex flex-wrap gap-1">
          <Botao
            tamanho="sm"
            variante="sutil"
            aria-label={`Editar administrador ${a.nome}`}
            onClick={() => abrirModalEdicao(a)}
          >
            Editar
          </Botao>
          {a.ativo ? (
            <>
              <Botao
                tamanho="sm"
                variante="sutil-ambar"
                aria-label={`Tornar ${a.nome} solicitante`}
                onClick={() => abrirModalConversao(a)}
              >
                Tornar solicitante
              </Botao>
              <Botao
                tamanho="sm"
                variante="sutil-perigo"
                aria-label={`Inativar administrador ${a.nome}`}
                onClick={() => setAdministradorParaInativar(a)}
              >
                Inativar
              </Botao>
            </>
          ) : (
            <Botao
              tamanho="sm"
              variante="sutil-verde"
              aria-label={`Reativar administrador ${a.nome}`}
              onClick={() => executarReativacao(a)}
              disabled={reativando}
            >
              Reativar
            </Botao>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader
          titulo="Gestão de administradores"
          subtitulo="Cadastre, edite e gerencie os administradores do sistema."
        >
          <Botao
            variante="primario"
            onClick={abrirModalCadastro}
            icone={<Icone nome="mais" />}
          >
            Novo administrador
          </Botao>
        </PageHeader>

        <section className="mb-6 rounded-xl border border-linha bg-superficie p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <EntradaBusca
              rotulo="Buscar administradores por nome"
              placeholder="Buscar por nome..."
              value={buscaNome}
              onChange={(e) => setBuscaNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") buscar();
              }}
            />
            <EntradaBusca
              rotulo="Buscar administradores por login"
              placeholder="Buscar por login..."
              value={buscaLogin}
              onChange={(e) => setBuscaLogin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") buscar();
              }}
              classNameWrapper="xl:max-w-xs"
            />
            <Selecao
              value={perfil}
              aria-label="Filtrar por perfil do administrador"
              onChange={(e) => {
                const novoPerfil = e.target.value as PerfilAdministrador | "";
                setPerfil(novoPerfil);
                setPagina(1);
                void carregarAdministradores(1, { nome: buscaNome, login: buscaLogin, perfil: novoPerfil, ativo });
              }}
              className="xl:w-44"
            >
              <option value="">Todos os perfis</option>
              <option value="ADMINISTRADOR">Administrador</option>
              <option value="GESTOR">Gestor</option>
            </Selecao>
            <Selecao
              value={ativo === "" ? "" : String(ativo)}
              aria-label="Filtrar por situação do cadastro"
              onChange={(e) => {
                const valor = e.target.value;
                const novoAtivo = valor === "" ? "" : valor === "true";
                setAtivo(novoAtivo);
                setPagina(1);
                void carregarAdministradores(1, { nome: buscaNome, login: buscaLogin, perfil, ativo: novoAtivo });
              }}
              className="xl:w-48"
            >
              <option value="">Todas as situações</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </Selecao>
            <div className="flex items-center gap-2.5">
              <Botao
                variante="primario"
                onClick={buscar}
                icone={<Icone nome="buscar" />}
                className="flex-1 xl:flex-none"
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
          semRecuo
          acao={
            <Contagem>
              {pluralizar(total, "administrador encontrado", "administradores encontrados")}
            </Contagem>
          }
        >
          <DataTable
            colunas={colunas}
            dados={administradores}
            carregando={carregando}
            mensagemVazia="Nenhum administrador encontrado."
            dicaVazia="Ajuste a busca e os filtros ou cadastre um novo administrador."
          />
          <Pagination
            paginaAtual={pagina}
            totalPaginas={totalPaginas}
            onAnterior={() => carregarAdministradores(pagina - 1)}
            onProxima={() => carregarAdministradores(pagina + 1)}
          />
        </Cartao>
      </div>

      <Modal
        aberto={!!modalTipo}
        onClose={fecharModal}
        titulo={modalTipo === "cadastro" ? "Novo administrador" : "Editar administrador"}
      >
        <div className="space-y-4">
          <Campo label="Nome" htmlFor="nome">
            <Entrada
              id="nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome completo"
            />
          </Campo>
          {modalTipo === "cadastro" && (
            <Campo label="Login (SUAP)" htmlFor="login">
              <Entrada
                id="login"
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Login do SUAP"
              />
            </Campo>
          )}
          <Campo label="Perfil" htmlFor="perfil">
            <Selecao
              id="perfil"
              value={perfilForm}
              onChange={(e) => setPerfilForm(e.target.value as PerfilAdministrador)}
            >
              <option value="ADMINISTRADOR">Administrador</option>
              <option value="GESTOR">Gestor</option>
            </Selecao>
          </Campo>

          {erroModal && <Alerta>{erroModal}</Alerta>}

          <div className="flex flex-wrap justify-end gap-2.5 pt-1">
            <Botao variante="secundario" onClick={fecharModal} disabled={salvando}>
              Cancelar
            </Botao>
            <Botao variante="primario" onClick={confirmarSalvar} carregando={salvando}>
              {salvando ? "Salvando..." : modalTipo === "cadastro" ? "Cadastrar" : "Salvar"}
            </Botao>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        aberto={!!administradorParaInativar}
        onClose={() => setAdministradorParaInativar(null)}
        onConfirmar={executarInativacao}
        titulo="Inativar administrador"
        mensagem={`Tem certeza que deseja inativar ${administradorParaInativar?.nome}?`}
        textoConfirmar="Confirmar inativação"
        carregando={inativando}
      />

      <Modal
        aberto={!!adminParaConverter}
        onClose={fecharModalConversao}
        titulo="Tornar administrador em solicitante"
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-texto-medio">
            O administrador{" "}
            <strong className="font-semibold text-texto">
              {adminParaConverter?.nome}
            </strong>{" "}
            será inativado e passará a acessar o sistema como solicitante, com a
            matrícula informada.
          </p>

          <Campo label="Tipo" htmlFor="tipoConversao">
            <Selecao
              id="tipoConversao"
              value={tipoConversao}
              onChange={(e) => setTipoConversao(e.target.value as TipoSolicitante)}
            >
              <option value="ALUNO">Aluno</option>
              <option value="PROFESSOR">Professor</option>
              <option value="SERVIDOR">Servidor</option>
            </Selecao>
          </Campo>
          <Campo label="Matrícula (SUAP)" htmlFor="matriculaConversao">
            <Entrada
              id="matriculaConversao"
              type="text"
              value={matriculaConversao}
              onChange={(e) => setMatriculaConversao(e.target.value)}
              placeholder="Matrícula do SUAP"
            />
          </Campo>
          <Campo label="Contato (opcional)" htmlFor="contatoConversao">
            <Entrada
              id="contatoConversao"
              type="text"
              value={contatoConversao}
              onChange={(e) => setContatoConversao(e.target.value)}
              placeholder="E-mail ou telefone"
            />
          </Campo>

          {erroConversao && <Alerta>{erroConversao}</Alerta>}

          <div className="flex flex-wrap justify-end gap-2.5 pt-1">
            <Botao variante="secundario" onClick={fecharModalConversao} disabled={convertendo}>
              Cancelar
            </Botao>
            <Botao variante="aviso" onClick={confirmarConversao} carregando={convertendo}>
              {convertendo ? "Convertendo..." : "Converter"}
            </Botao>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default GestaoAdministradoresPage;
