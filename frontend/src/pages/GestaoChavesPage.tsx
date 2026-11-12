import { useState } from "react";
import {
  listarChaves,
  criarChave,
  atualizarChave,
  inativarChave,
  previsualizarImportacaoChaves,
  importarChaves,
} from "../services/chaves";
import type { Chave, StatusChave } from "../types/chave";
import type { DadosImportacaoChave } from "../types/importacao";
import { useToast } from "../contexts/ToastContext";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import ImportacaoCsvModal, { type CampoImportacao } from "../components/ImportacaoCsvModal";
import ConfirmDialog from "../components/ConfirmDialog";
import DataTable, { type Coluna } from "../components/DataTable";
import Pagination from "../components/Pagination";
import { Alerta } from "../components/ui/Alerta";
import { Botao } from "../components/ui/Botao";
import { Cartao, Contagem } from "../components/ui/Cartao";
import { Campo, Entrada, EntradaBusca, Selecao } from "../components/ui/Campos";
import { Icone } from "../components/ui/Icone";
import { SeloAtivo, SeloStatusChave } from "../components/Selos";
import { useListagemPaginada } from "../hooks/useListagemPaginada";
import { codigoDoErro, mensagemDoErro } from "../utils/erros";
import { pluralizar } from "../utils/formatacao";

type ModalTipo = "cadastro" | "edicao" | null;

const MODELO_CSV_CHAVES = [
  "codigo;descricao;localizacao",
  "LAB-01;Chave do laboratório de informática;Bloco A - Sala 1",
  "LAB-02;Chave do laboratório de redes;Bloco B - Sala 3",
].join("\n");

const CAMPOS_IMPORTACAO_CHAVES: CampoImportacao[] = [
  { chave: "codigo", rotulo: "Código", obrigatorio: true, maxLength: 20 },
  { chave: "descricao", rotulo: "Descrição", obrigatorio: true, maxLength: 120 },
  { chave: "localizacao", rotulo: "Localização", obrigatorio: true, maxLength: 120 },
];

function GestaoChavesPage() {
  const toast = useToast();

  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<StatusChave | "">("");
  const [ativo, setAtivo] = useState<boolean | "">("");

  const {
    dados: chaves,
    carregando,
    erro,
    pagina,
    totalPaginas,
    total,
    carregar: carregarChaves,
    buscar,
  } = useListagemPaginada({
    filtros: { busca, status, ativo },
    mensagemErro: "Erro ao carregar as chaves.",
    carregar: async (paginaAtual, filtros, signal) => {
      const resposta = await listarChaves(
        {
          busca: filtros.busca || undefined,
          status: filtros.status || undefined,
          ativo: filtros.ativo !== "" ? filtros.ativo : undefined,
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

  const [modalTipo, setModalTipo] = useState<ModalTipo>(null);
  const [importacaoAberta, setImportacaoAberta] = useState(false);
  const [chaveEmEdicao, setChaveEmEdicao] = useState<Chave | null>(null);

  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [localizacao, setLocalizacao] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState("");

  const [chaveParaInativar, setChaveParaInativar] = useState<Chave | null>(null);
  const [inativando, setInativando] = useState(false);
  const [reativando, setReativando] = useState(false);

  function limparFiltros() {
    setBusca("");
    setStatus("");
    setAtivo("");
    void carregarChaves(1, { busca: "", status: "", ativo: "" });
  }

  function abrirModalCadastro() {
    setModalTipo("cadastro");
    setChaveEmEdicao(null);
    setCodigo("");
    setDescricao("");
    setLocalizacao("");
    setErroModal("");
  }

  function abrirModalEdicao(chave: Chave) {
    setModalTipo("edicao");
    setChaveEmEdicao(chave);
    setCodigo(chave.codigo);
    setDescricao(chave.descricao);
    setLocalizacao(chave.localizacao);
    setErroModal("");
  }

  function fecharModal() {
    if (salvando) return;
    setModalTipo(null);
    setChaveEmEdicao(null);
    setCodigo("");
    setDescricao("");
    setLocalizacao("");
    setErroModal("");
  }

  async function confirmarSalvar() {
    if (!codigo.trim() || !descricao.trim() || !localizacao.trim()) {
      setErroModal("Preencha todos os campos.");
      return;
    }

    try {
      setSalvando(true);
      setErroModal("");

      if (modalTipo === "cadastro") {
        await criarChave({
          codigo: codigo.trim(),
          descricao: descricao.trim(),
          localizacao: localizacao.trim(),
        });
      } else if (modalTipo === "edicao" && chaveEmEdicao) {
        await atualizarChave(chaveEmEdicao.id, {
          codigo: codigo.trim(),
          descricao: descricao.trim(),
          localizacao: localizacao.trim(),
        });
      }

      fecharModal();
      toast.success(modalTipo === "cadastro" ? "Chave cadastrada com sucesso!" : "Chave atualizada com sucesso!");
      await carregarChaves(pagina);
    } catch (error) {
      const codigo = codigoDoErro(error);
      if (codigo === "CODIGO_CHAVE_DUPLICADO") {
        setErroModal("Já existe uma chave com esse código.");
      } else if (codigo === "VALIDACAO") {
        setErroModal("Dados inválidos. Verifique os campos informados.");
      } else {
        setErroModal(mensagemDoErro(error, "Não foi possível salvar a chave."));
      }
    } finally {
      setSalvando(false);
    }
  }

  async function executarInativacao() {
    if (!chaveParaInativar) return;
    try {
      setInativando(true);
      await inativarChave(chaveParaInativar.id);
      toast.success("Chave inativada com sucesso!");
      setChaveParaInativar(null);
      await carregarChaves(pagina);
    } catch {
      toast.error("Erro ao inativar a chave. Tente novamente.");
    } finally {
      setInativando(false);
    }
  }

  async function executarReativacao(chave: Chave) {
    try {
      setReativando(true);
      await atualizarChave(chave.id, { ativo: true });
      toast.success("Chave reativada com sucesso!");
      await carregarChaves(pagina);
    } catch {
      toast.error("Erro ao reativar a chave. Tente novamente.");
    } finally {
      setReativando(false);
    }
  }

  const temFiltros = Boolean(busca || status || ativo !== "");

  const colunas: Coluna<Chave>[] = [
    { key: "codigo", titulo: "Código", mono: true },
    { key: "descricao", titulo: "Descrição" },
    {
      key: "localizacao",
      titulo: "Localização",
      render: (chave) => <span className="text-texto-medio">{chave.localizacao}</span>,
    },
    {
      key: "status",
      titulo: "Status",
      render: (chave) => <SeloStatusChave status={chave.status} />,
    },
    {
      key: "ativo",
      titulo: "Ativo",
      render: (chave) => <SeloAtivo ativo={chave.ativo} />,
    },
    {
      key: "acoes",
      titulo: "Ações",
      acoes: true,
      render: (chave) => (
        <div className="flex flex-wrap gap-1">
          <Botao
            tamanho="sm"
            variante="sutil"
            aria-label={`Editar chave ${chave.codigo}`}
            onClick={() => abrirModalEdicao(chave)}
          >
            Editar
          </Botao>
          {chave.ativo ? (
            <Botao
              tamanho="sm"
              variante="sutil-perigo"
              aria-label={`Inativar chave ${chave.codigo}`}
              onClick={() => setChaveParaInativar(chave)}
            >
              Inativar
            </Botao>
          ) : (
            <Botao
              tamanho="sm"
              variante="sutil-verde"
              aria-label={`Reativar chave ${chave.codigo}`}
              onClick={() => executarReativacao(chave)}
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
          titulo="Gestão de chaves"
          subtitulo="Cadastre, edite e gerencie as chaves das salas e laboratórios."
        >
          <Botao variante="secundario" onClick={() => setImportacaoAberta(true)}>Importar CSV</Botao>
          <Botao
            variante="primario"
            onClick={abrirModalCadastro}
            icone={<Icone nome="mais" />}
          >
            Nova chave
          </Botao>
        </PageHeader>

        <section className="mb-6 rounded-xl border border-linha bg-superficie p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <EntradaBusca
              rotulo="Buscar chaves por código, descrição ou localização"
              placeholder="Buscar por código, descrição ou localização..."
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void buscar();
              }}
            />
            <Selecao
              value={status}
              aria-label="Filtrar por status"
              onChange={(event) => {
                const novoStatus = event.target.value as StatusChave | "";
                setStatus(novoStatus);
                void carregarChaves(1, { busca, status: novoStatus, ativo });
              }}
              className="xl:w-44"
            >
              <option value="">Todos os status</option>
              <option value="DISPONIVEL">Disponível</option>
              <option value="EMPRESTADA">Emprestada</option>
            </Selecao>
            <Selecao
              value={ativo === "" ? "" : String(ativo)}
              aria-label="Filtrar por situação do cadastro"
              onChange={(event) => {
                const valor = event.target.value;
                const novoAtivo = valor === "" ? "" : valor === "true";
                setAtivo(novoAtivo);
                void carregarChaves(1, { busca, status, ativo: novoAtivo });
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
                onClick={() => void buscar()}
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
          acao={<Contagem>{pluralizar(total, "chave encontrada", "chaves encontradas")}</Contagem>}
        >
          <DataTable
            colunas={colunas}
            dados={chaves}
            carregando={carregando}
            mensagemVazia="Nenhuma chave encontrada."
            dicaVazia="Ajuste a busca e os filtros ou cadastre uma nova chave."
          />
          <Pagination
            paginaAtual={pagina}
            totalPaginas={totalPaginas}
            onAnterior={() => carregarChaves(pagina - 1)}
            onProxima={() => carregarChaves(pagina + 1)}
          />
        </Cartao>
      </div>

      <ImportacaoCsvModal<DadosImportacaoChave>
        aberto={importacaoAberta}
        titulo="Importar chaves"
        descricao="As chaves importadas entram como disponíveis. Nada será gravado antes da aprovação."
        nomeArquivoModelo="modelo-chaves.csv"
        conteudoModelo={MODELO_CSV_CHAVES}
        campos={CAMPOS_IMPORTACAO_CHAVES}
        campoIdentificador="codigo"
        previsualizar={previsualizarImportacaoChaves}
        importar={importarChaves}
        onFechar={() => setImportacaoAberta(false)}
        onImportado={(relatorio) => {
          const partes = [`${relatorio.criados} criada(s)`];
          if (relatorio.ignorados > 0) partes.push(`${relatorio.ignorados} ignorada(s)`);
          toast.success(`Importação concluída: ${partes.join(", ")}.`);
          if (relatorio.criados > 0) void carregarChaves(1);
        }}
      />

      <Modal
        aberto={!!modalTipo}
        onClose={fecharModal}
        titulo={modalTipo === "cadastro" ? "Nova chave" : "Editar chave"}
      >
        <div className="space-y-4">
          <Campo label="Código" htmlFor="codigo">
            <Entrada
              id="codigo"
              type="text"
              value={codigo}
              onChange={(event) => setCodigo(event.target.value)}
              placeholder="Ex: SALA-001"
              maxLength={20}
            />
          </Campo>
          <Campo label="Descrição" htmlFor="descricao">
            <Entrada
              id="descricao"
              type="text"
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              placeholder="Ex: Chave da sala 101"
            />
          </Campo>
          <Campo label="Localização" htmlFor="localizacao">
            <Entrada
              id="localizacao"
              type="text"
              value={localizacao}
              onChange={(event) => setLocalizacao(event.target.value)}
              placeholder="Ex: Bloco A, Sala 101"
            />
          </Campo>

          {erroModal && <Alerta>{erroModal}</Alerta>}

          <div className="flex flex-wrap justify-end gap-2.5 pt-1">
            <Botao variante="secundario" onClick={fecharModal} disabled={salvando}>
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              onClick={confirmarSalvar}
              carregando={salvando}
            >
              {salvando ? "Salvando..." : modalTipo === "cadastro" ? "Cadastrar" : "Salvar"}
            </Botao>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        aberto={!!chaveParaInativar}
        onClose={() => setChaveParaInativar(null)}
        onConfirmar={executarInativacao}
        titulo="Inativar chave"
        mensagem={`Tem certeza que deseja inativar a chave ${chaveParaInativar?.codigo}?`}
        textoConfirmar="Confirmar inativação"
        carregando={inativando}
      />
    </>
  );
}

export default GestaoChavesPage;
