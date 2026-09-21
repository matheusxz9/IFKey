import { useEffect, useState } from "react";
import {
  listarChaves,
  criarChave,
  atualizarChave,
  inativarChave,
} from "../services/chaves";
import type { Chave, StatusChave } from "../types/chave";

type ModalTipo = "cadastro" | "edicao" | null;

function GestaoChavesPage() {
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

  const [chaveParaInativar, setChaveParaInativar] = useState<Chave | null>(
    null,
  );
  const [inativando, setInativando] = useState(false);
  const [erroInativacao, setErroInativacao] = useState("");

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

  function paginaAnterior() {
    if (pagina > 1) {
      carregarChaves(pagina - 1);
    }
  }

  function proximaPagina() {
    if (pagina < totalPaginas) {
      carregarChaves(pagina + 1);
    }
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
    if (salvando) {
      return;
    }

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
      await carregarChaves(pagina);
    } catch (error) {
      const erro = error as Error & { code?: string };

      if (erro.code === "CODIGO_CHAVE_DUPLICADO") {
        setErroModal("Já existe uma chave com esse código.");
      } else if (erro.code === "VALIDACAO") {
        setErroModal("Dados inválidos. Verifique os campos informados.");
      } else {
        setErroModal(erro.message || "Não foi possível salvar a chave.");
      }
    } finally {
      setSalvando(false);
    }
  }

  function confirmarInativacao(chave: Chave) {
    setChaveParaInativar(chave);
    setErroInativacao("");
  }

  function fecharInativacao() {
    if (inativando) {
      return;
    }

    setChaveParaInativar(null);
    setErroInativacao("");
  }

  async function executarInativacao() {
    if (!chaveParaInativar) {
      return;
    }

    try {
      setInativando(true);
      setErroInativacao("");

      await inativarChave(chaveParaInativar.id);

      setChaveParaInativar(null);
      await carregarChaves(pagina);
    } catch (error) {
      setErroInativacao(
        error instanceof Error
          ? error.message
          : "Erro ao inativar a chave.",
      );
    } finally {
      setInativando(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestão de chaves</h1>

            <p className="mt-2 text-gray-400">
              Cadastre, edite e gerencie as chaves das salas e laboratórios.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirModalCadastro}
            className="rounded-md bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 cursor-pointer"
          >
            Nova chave
          </button>
        </header>

        <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-gray-800 bg-gray-900 p-5 md:flex-row">
          <input
            type="text"
            placeholder="Buscar por código, descrição ou localização..."
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                buscar();
              }
            }}
            className="flex-1 rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500"
          />

          <select
            value={status}
            onChange={(event) => {
              const novoStatus = event.target.value as StatusChave | "";
              setStatus(novoStatus);
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
          {carregando ? (
            <div className="p-8 text-center text-gray-400">
              Carregando chaves...
            </div>
          ) : chaves.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              Nenhuma chave encontrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-800 bg-gray-950">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Código
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Descrição
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Localização
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Status
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Ativo
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {chaves.map((chave) => (
                    <tr
                      key={chave.id}
                      className="border-b border-gray-800 last:border-0"
                    >
                      <td className="px-6 py-4 font-medium">{chave.codigo}</td>

                      <td className="px-6 py-4 text-gray-400">
                        {chave.descricao}
                      </td>

                      <td className="px-6 py-4 text-gray-400">
                        {chave.localizacao}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            chave.status === "DISPONIVEL"
                              ? "bg-green-900 text-green-300"
                              : "bg-yellow-900 text-yellow-300"
                          }`}
                        >
                          {chave.status === "DISPONIVEL"
                            ? "Disponível"
                            : "Emprestada"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            chave.ativo
                              ? "bg-green-900 text-green-300"
                              : "bg-gray-700 text-gray-400"
                          }`}
                        >
                          {chave.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
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
                              onClick={() => confirmarInativacao(chave)}
                              className="rounded-md border border-red-800 px-3 py-1 text-sm font-medium text-red-400 hover:bg-red-950/40 cursor-pointer"
                            >
                              Inativar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!carregando && totalPaginas > 1 && (
            <div className="flex items-center justify-between border-t border-gray-800 px-6 py-4">
              <button
                type="button"
                onClick={paginaAnterior}
                disabled={pagina === 1}
                className="rounded-md border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>

              <span className="text-sm text-gray-400">
                Página {pagina} de {totalPaginas}
              </span>

              <button
                type="button"
                onClick={proximaPagina}
                disabled={pagina === totalPaginas}
                className="rounded-md border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          )}
        </section>
      </div>

      {modalTipo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              fecharModal();
            }
          }}
        >
          <section className="w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">
                  {modalTipo === "cadastro" ? "Nova chave" : "Editar chave"}
                </h2>

                <p className="mt-1 text-sm text-gray-400">
                  {modalTipo === "cadastro"
                    ? "Preencha os dados para cadastrar uma nova chave."
                    : "Altere os dados da chave."}
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModal}
                disabled={salvando}
                className="text-2xl leading-none text-gray-500 hover:text-white cursor-pointer disabled:opacity-40"
                aria-label="Fechar modal"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <label
                htmlFor="codigo"
                className="mb-2 block text-sm font-medium"
              >
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
              <label
                htmlFor="descricao"
                className="mb-2 block text-sm font-medium"
              >
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
              <label
                htmlFor="localizacao"
                className="mb-2 block text-sm font-medium"
              >
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
                {salvando
                  ? "Salvando..."
                  : modalTipo === "cadastro"
                    ? "Cadastrar"
                    : "Salvar"}
              </button>
            </div>
          </section>
        </div>
      )}

      {chaveParaInativar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              fecharInativacao();
            }
          }}
        >
          <section className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white">Inativar chave</h2>

            <p className="mt-2 text-gray-400">
              Tem certeza que deseja inativar esta chave?
            </p>

            <div className="mt-4 rounded-lg border border-gray-800 bg-gray-950 p-4">
              <p className="font-semibold text-white">
                {chaveParaInativar.codigo}
              </p>

              <p className="mt-1 text-sm text-gray-400">
                {chaveParaInativar.descricao}
              </p>

              <p className="text-sm text-gray-400">
                {chaveParaInativar.localizacao}
              </p>
            </div>

            {erroInativacao && (
              <div className="mt-4 rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-400">
                {erroInativacao}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={fecharInativacao}
                disabled={inativando}
                className="rounded-md border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={executarInativacao}
                disabled={inativando}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                {inativando ? "Inativando..." : "Confirmar inativação"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default GestaoChavesPage;