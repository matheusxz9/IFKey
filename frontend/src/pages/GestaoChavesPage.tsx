import { useEffect, useState } from "react";
import {
  listarChaves,
  criarChave,
  atualizarChave,
  inativarChave,
} from "../services/chaves";
import type { Chave, StatusChave } from "../types/chave";
import { useToast } from "../contexts/ToastContext";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import DataTable, { type Coluna } from "../components/DataTable";
import Pagination from "../components/Pagination";

type ModalTipo = "cadastro" | "edicao" | null;

function GestaoChavesPage() {
  const toast = useToast();
  const [chaves, setChaves] = useState<Chave[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<StatusChave | "">("");
  const [ativo, setAtivo] = useState<boolean | "">("");

  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const [modalTipo, setModalTipo] = useState<ModalTipo>(null);
  const [chaveEmEdicao, setChaveEmEdicao] = useState<Chave | null>(null);

  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [localizacao, setLocalizacao] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState("");

  const [chaveParaInativar, setChaveParaInativar] = useState<Chave | null>(null);
  const [inativando, setInativando] = useState(false);

  async function carregarChaves(paginaAtual = pagina) {
    try {
      setCarregando(true);
      setErro("");

      const resposta = await listarChaves({
        busca: busca || undefined,
        status: status || undefined,
        ativo: ativo !== "" ? ativo : undefined,
        page: paginaAtual,
        limit: 10,
      });

      setChaves(resposta.data);
      setPagina(resposta.meta.page);
      setTotalPaginas(resposta.meta.totalPages);
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao carregar as chaves.",
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarChaves(1);
  }, []);

  function buscar() {
    setPagina(1);
    carregarChaves(1);
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
      const err = error as Error & { code?: string };
      if (err.code === "CODIGO_CHAVE_DUPLICADO") {
        setErroModal("Já existe uma chave com esse código.");
      } else if (err.code === "VALIDACAO") {
        setErroModal("Dados inválidos. Verifique os campos informados.");
      } else {
        setErroModal(err.message || "Não foi possível salvar a chave.");
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
      // erro tratado pelo ConfirmDialog
    } finally {
      setInativando(false);
    }
  }

  const colunas: Coluna<Record<string, unknown>>[] = [
    { key: "codigo", titulo: "Código" },
    { key: "descricao", titulo: "Descrição" },
    { key: "localizacao", titulo: "Localização" },
    {
      key: "status",
      titulo: "Status",
      render: (item) => (
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            (item as Chave).status === "DISPONIVEL"
              ? "bg-green-900 text-green-300"
              : "bg-yellow-900 text-yellow-300"
          }`}
        >
          {(item as Chave).status === "DISPONIVEL" ? "Disponível" : "Emprestada"}
        </span>
      ),
    },
    {
      key: "ativo",
      titulo: "Ativo",
      render: (item) => (
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            (item as Chave).ativo
              ? "bg-green-900 text-green-300"
              : "bg-gray-700 text-gray-400"
          }`}
        >
          {(item as Chave).ativo ? "Ativo" : "Inativo"}
        </span>
      ),
    },
    {
      key: "acoes",
      titulo: "Ações",
      render: (item) => {
        const chave = item as unknown as Chave;
        return (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => abrirModalEdicao(chave)}
              className="rounded-md border border-gray-700 px-3 py-1 text-sm font-medium text-gray-300 hover:bg-gray-800 cursor-pointer"
            >
              Editar
            </button>
            {chave.ativo && (
              <button
                type="button"
                onClick={() => setChaveParaInativar(chave)}
                className="rounded-md border border-red-800 px-3 py-1 text-sm font-medium text-red-400 hover:bg-red-950/40 cursor-pointer"
              >
                Inativar
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="mx-auto max-w-6xl">
        <PageHeader
          titulo="Gestão de chaves"
          subtitulo="Cadastre, edite e gerencie as chaves das salas e laboratórios."
        >
          <button
            type="button"
            onClick={abrirModalCadastro}
            className="rounded-md bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 cursor-pointer"
          >
            Nova chave
          </button>
        </PageHeader>

        <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-gray-800 bg-gray-900 p-5 md:flex-row">
          <input
            type="text"
            placeholder="Buscar por código, descrição ou localização..."
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") buscar();
            }}
            className="flex-1 rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500"
          />
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as StatusChave | "");
              setPagina(1);
              setTimeout(() => carregarChaves(1), 0);
            }}
            className="rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500 cursor-pointer"
          >
            <option value="">Todos os status</option>
            <option value="DISPONIVEL">Disponível</option>
            <option value="EMPRESTADA">Emprestada</option>
          </select>
          <select
            value={ativo === "" ? "" : String(ativo)}
            onChange={(event) => {
              const valor = event.target.value;
              setAtivo(valor === "" ? "" : valor === "true");
              setPagina(1);
              setTimeout(() => carregarChaves(1), 0);
            }}
            className="rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500 cursor-pointer"
          >
            <option value="">Todos</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
          <button
            type="button"
            onClick={buscar}
            className="rounded-md bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 cursor-pointer"
          >
            Buscar
          </button>
        </section>

        {erro && (
          <div className="mb-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-red-400">
            {erro}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
          <DataTable
            colunas={colunas}
            dados={chaves as unknown as Record<string, unknown>[]}
            carregando={carregando}
            mensagemVazia="Nenhuma chave encontrada."
          />
          <Pagination
            paginaAtual={pagina}
            totalPaginas={totalPaginas}
            onAnterior={() => carregarChaves(pagina - 1)}
            onProxima={() => carregarChaves(pagina + 1)}
          />
        </section>
      </div>

      <Modal
        aberto={!!modalTipo}
        onClose={fecharModal}
        titulo={modalTipo === "cadastro" ? "Nova chave" : "Editar chave"}
      >
        <div className="mb-4">
          <label htmlFor="codigo" className="mb-2 block text-sm font-medium">
            Código
          </label>
          <input
            id="codigo"
            type="text"
            value={codigo}
            onChange={(event) => setCodigo(event.target.value)}
            placeholder="Ex: SALA-001"
            maxLength={20}
            className="w-full rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="descricao" className="mb-2 block text-sm font-medium">
            Descrição
          </label>
          <input
            id="descricao"
            type="text"
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
            placeholder="Ex: Chave da sala 101"
            className="w-full rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500"
          />
        </div>
        <div className="mb-6">
          <label htmlFor="localizacao" className="mb-2 block text-sm font-medium">
            Localização
          </label>
          <input
            id="localizacao"
            type="text"
            value={localizacao}
            onChange={(event) => setLocalizacao(event.target.value)}
            placeholder="Ex: Bloco A, Sala 101"
            className="w-full rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500"
          />
        </div>
        {erroModal && (
          <div className="mb-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-400">
            {erroModal}
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={fecharModal}
            disabled={salvando}
            className="rounded-md border border-gray-700 px-5 py-3 font-semibold text-gray-300 hover:bg-gray-800 disabled:opacity-40 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmarSalvar}
            disabled={salvando}
            className="rounded-md bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
          >
            {salvando ? "Salvando..." : modalTipo === "cadastro" ? "Cadastrar" : "Salvar"}
          </button>
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
