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
import { Alerta } from "../components/ui/Alerta";
import { Botao } from "../components/ui/Botao";
import { Cartao, Contagem } from "../components/ui/Cartao";
import { Campo, Entrada, EntradaBusca, Selecao } from "../components/ui/Campos";
import { Icone } from "../components/ui/Icone";
import { Selo, type VarianteSelo } from "../components/ui/Selo";
import { formatarTipo, pluralizar } from "../utils/formatacao";

type ModalTipo = "cadastro" | "edicao" | null;

const varianteTipo: Record<TipoSolicitante, VarianteSelo> = {
  ALUNO: "aluno",
  PROFESSOR: "professor",
  SERVIDOR: "servidor",
};

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
  const [total, setTotal] = useState(0);

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
  const [reativando, setReativando] = useState(false);

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
      setTotal(resposta.meta.total);
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

  function limparFiltros() {
    setBuscaNome("");
    setBuscaMatricula("");
    setTipo("");
    setAtivo("");
    setPagina(1);
    carregarSolicitantes(1, { nome: "", matricula: "", tipo: "", ativo: "" });
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
      } else if (err.code === "IDENTIFICADOR_DUPLICADO") {
        setErroModal("Essa matrícula já pertence a um administrador cadastrado.");
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

  async function executarReativacao(solicitante: Solicitante) {
    try {
      setReativando(true);
      await atualizarSolicitante(solicitante.id, { ativo: true });
      toast.success("Solicitante reativado com sucesso!");
      await carregarSolicitantes(pagina);
    } catch {
      toast.error("Erro ao reativar o solicitante. Tente novamente.");
    } finally {
      setReativando(false);
    }
  }

  const temFiltros = Boolean(
    buscaNome || buscaMatricula || tipo || ativo !== "",
  );

  const colunas: Coluna<Solicitante>[] = [
    { key: "nome", titulo: "Nome" },
    {
      key: "tipo",
      titulo: "Tipo",
      render: (s) => (
        <Selo variante={varianteTipo[s.tipo] ?? "aluno"}>{formatarTipo(s.tipo)}</Selo>
      ),
    },
    { key: "matricula", titulo: "Matrícula", mono: true },
    {
      key: "contato",
      titulo: "Contato",
      render: (s) => <span className="text-texto-medio">{s.contato}</span>,
    },
    {
      key: "ativo",
      titulo: "Ativo",
      render: (s) => (
        <Selo variante={s.ativo ? "ativo" : "inativo"}>
          {s.ativo ? "Ativo" : "Inativo"}
        </Selo>
      ),
    },
    {
      key: "acoes",
      titulo: "Ações",
      acoes: true,
      render: (s) => (
        <div className="flex flex-wrap gap-1">
          <Botao
            tamanho="sm"
            variante="sutil"
            aria-label={`Editar solicitante ${s.nome}`}
            onClick={() => abrirModalEdicao(s)}
          >
            Editar
          </Botao>
          {s.ativo ? (
            <Botao
              tamanho="sm"
              variante="sutil-perigo"
              aria-label={`Inativar solicitante ${s.nome}`}
              onClick={() => setSolicitanteParaInativar(s)}
            >
              Inativar
            </Botao>
          ) : (
            <Botao
              tamanho="sm"
              variante="sutil-verde"
              aria-label={`Reativar solicitante ${s.nome}`}
              onClick={() => executarReativacao(s)}
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
          titulo="Gestão de solicitantes"
          subtitulo="Cadastre, edite e gerencie os solicitantes de chaves."
        >
          <Botao
            variante="primario"
            onClick={abrirModalCadastro}
            icone={<Icone nome="mais" />}
          >
            Novo solicitante
          </Botao>
        </PageHeader>

        <section className="mb-6 rounded-xl border border-linha bg-superficie p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <EntradaBusca
              rotulo="Buscar solicitantes por nome"
              placeholder="Buscar por nome..."
              value={buscaNome}
              onChange={(e) => setBuscaNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") buscar();
              }}
            />
            <EntradaBusca
              rotulo="Buscar solicitantes por matrícula"
              placeholder="Buscar por matrícula..."
              value={buscaMatricula}
              onChange={(e) => setBuscaMatricula(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") buscar();
              }}
              classNameWrapper="xl:max-w-xs"
            />
            <Selecao
              value={tipo}
              aria-label="Filtrar por tipo de solicitante"
              onChange={(e) => {
                const novoTipo = e.target.value as TipoSolicitante | "";
                setTipo(novoTipo);
                setPagina(1);
                void carregarSolicitantes(1, { nome: buscaNome, matricula: buscaMatricula, tipo: novoTipo, ativo });
              }}
              className="xl:w-44"
            >
              <option value="">Todos os tipos</option>
              <option value="ALUNO">Aluno</option>
              <option value="PROFESSOR">Professor</option>
              <option value="SERVIDOR">Servidor</option>
            </Selecao>
            <Selecao
              value={ativo === "" ? "" : String(ativo)}
              aria-label="Filtrar por situação do cadastro"
              onChange={(e) => {
                const valor = e.target.value;
                const novoAtivo = valor === "" ? "" : valor === "true";
                setAtivo(novoAtivo);
                setPagina(1);
                void carregarSolicitantes(1, { nome: buscaNome, matricula: buscaMatricula, tipo, ativo: novoAtivo });
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
              {pluralizar(total, "solicitante encontrado", "solicitantes encontrados")}
            </Contagem>
          }
        >
          <DataTable
            colunas={colunas}
            dados={solicitantes}
            carregando={carregando}
            mensagemVazia="Nenhum solicitante encontrado."
            dicaVazia="Ajuste a busca e os filtros ou cadastre um novo solicitante."
          />
          <Pagination
            paginaAtual={pagina}
            totalPaginas={totalPaginas}
            onAnterior={() => carregarSolicitantes(pagina - 1)}
            onProxima={() => carregarSolicitantes(pagina + 1)}
          />
        </Cartao>
      </div>

      <Modal
        aberto={!!modalTipo}
        onClose={fecharModal}
        titulo={modalTipo === "cadastro" ? "Novo solicitante" : "Editar solicitante"}
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
          <Campo label="Tipo" htmlFor="tipo">
            <Selecao
              id="tipo"
              value={tipoForm}
              onChange={(e) => setTipoForm(e.target.value as TipoSolicitante)}
            >
              <option value="ALUNO">Aluno</option>
              <option value="PROFESSOR">Professor</option>
              <option value="SERVIDOR">Servidor</option>
            </Selecao>
          </Campo>
          <Campo label="Matrícula" htmlFor="matricula">
            <Entrada
              id="matricula"
              type="text"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              placeholder="Número da matrícula"
            />
          </Campo>
          <Campo label="Contato" htmlFor="contato">
            <Entrada
              id="contato"
              type="text"
              value={contato}
              onChange={(e) => setContato(e.target.value)}
              placeholder="E-mail ou telefone"
            />
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
        aberto={!!solicitanteParaInativar}
        onClose={() => setSolicitanteParaInativar(null)}
        onConfirmar={executarInativacao}
        titulo="Inativar solicitante"
        mensagem={`Tem certeza que deseja inativar ${solicitanteParaInativar?.nome}?`}
        textoConfirmar="Confirmar inativação"
        carregando={inativando}
      />
    </>
  );
}

export default GestaoSolicitantesPage;
