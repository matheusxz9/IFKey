import { useEffect, useState } from "react";
import { listarChaves } from "../services/chaves";
import { apiFetch } from "../services/api";
import { criarEmprestimo } from "../services/emprestimos";
import type { Chave, StatusChave } from "../types/chave";

interface Solicitante {
  id: number;
  nome: string;
  matricula: string;
  tipo: string;
}

function ChavesPage() {
  const [chaves, setChaves] = useState<Chave[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<StatusChave | "">("");

  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  // Modal
  const [chaveSelecionada, setChaveSelecionada] = useState<Chave | null>(null);

  const [matricula, setMatricula] = useState("");
  const [solicitante, setSolicitante] = useState<Solicitante | null>(null);
  const [observacoes, setObservacoes] = useState("");

  const [buscandoSolicitante, setBuscandoSolicitante] = useState(false);
  const [salvandoEmprestimo, setSalvandoEmprestimo] = useState(false);
  const [erroModal, setErroModal] = useState("");

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

  function abrirModal(chave: Chave) {
    setChaveSelecionada(chave);
    setMatricula("");
    setSolicitante(null);
    setObservacoes("");
    setErroModal("");
  }

  function fecharModal() {
    if (salvandoEmprestimo) {
      return;
    }

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

      const resposta = await apiFetch(
        `/solicitantes?matricula=${encodeURIComponent(matricula.trim())}`,
      );

      const dados = resposta.data ?? resposta;

      if (!dados || (Array.isArray(dados) && dados.length === 0)) {
        setErroModal("Solicitante não encontrado.");
        return;
      }

      const encontrado = Array.isArray(dados) ? dados[0] : dados;

      setSolicitante(encontrado);
    } catch (error) {
      setErroModal(
        error instanceof Error
          ? error.message
          : "Erro ao buscar o solicitante.",
      );
    } finally {
      setBuscandoSolicitante(false);
    }
  }

  async function confirmarEmprestimo() {
    if (!chaveSelecionada) {
      return;
    }

    if (!solicitante) {
      setErroModal("Busque um solicitante antes de continuar.");
      return;
    }

    try {
      setSalvandoEmprestimo(true);
      setErroModal("");

      await criarEmprestimo({
        solicitanteId: solicitante.id,
        chaveId: chaveSelecionada.id,
        observacoes: observacoes.trim() || undefined,
      });

      fecharModal();

      await carregarChaves(pagina);
    } catch (error) {
      const erro = error as Error & {
        code?: string;
      };

      if (erro.code === "CHAVE_INDISPONIVEL") {
        setErroModal(
          "Essa chave acabou de ser emprestada. Atualize a lista e tente novamente.",
        );
      } else {
        setErroModal(erro.message || "Não foi possível realizar o empréstimo.");
      }
    } finally {
      setSalvandoEmprestimo(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Chaves</h1>

          <p className="mt-2 text-gray-400">
            Gerenciamento das chaves das salas e laboratórios.
          </p>
        </header>

        <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-gray-800 bg-gray-900 p-5 md:flex-row">
          <input
            type="text"
            placeholder="Buscar por código ou descrição..."
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

              setTimeout(() => {
                carregarChaves(1);
              }, 0);
            }}
            className="rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500 cursor-pointer"
          >
            <option value="">Todos os status</option>
            <option value="DISPONIVEL">Disponível</option>
            <option value="EMPRESTADA">Emprestada</option>
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
                      Status
                    </th>

                    <th className="px-6 py-4 text-right text-sm font-semibold">
                      Ação
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

                      <td className="px-6 py-4 text-right">
                        {chave.status === "DISPONIVEL" && (
                          <button
                            type="button"
                            onClick={() => abrirModal(chave)}
                            className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold hover:bg-green-700 cursor-pointer"
                          >
                            Emprestar
                          </button>
                        )}
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
                className="rounded-md border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
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
                className="rounded-md border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          )}
        </section>
      </div>

      {chaveSelecionada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              fecharModal();
            }
          }}
        >
          <section
            className="w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 id="modal-title" className="text-xl font-bold">
                  Registrar empréstimo
                </h2>

                <p className="mt-1 text-sm text-gray-400">
                  Informe o solicitante para realizar o empréstimo.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModal}
                disabled={salvandoEmprestimo}
                className="text-2xl leading-none text-gray-500 hover:text-white disabled:opacity-40"
                aria-label="Fechar modal"
              >
                ×
              </button>
            </div>

            <div className="mb-6 rounded-lg border border-gray-700 bg-gray-950 p-4">
              <p className="text-sm text-gray-400">Chave selecionada</p>

              <p className="mt-1 font-semibold">{chaveSelecionada.codigo}</p>

              <p className="text-sm text-gray-400">
                {chaveSelecionada.descricao}
              </p>
            </div>

            <div className="mb-6">
              <label
                htmlFor="matricula"
                className="mb-2 block text-sm font-medium"
              >
                Matrícula do solicitante
              </label>

              <div className="flex gap-3">
                <input
                  id="matricula"
                  type="text"
                  value={matricula}
                  onChange={(event) => setMatricula(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      buscarSolicitante();
                    }
                  }}
                  placeholder="Digite a matrícula"
                  className="min-w-0 flex-1 rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500"
                />

                <button
                  type="button"
                  onClick={buscarSolicitante}
                  disabled={buscandoSolicitante}
                  className="rounded-md bg-green-600 px-4 py-3 font-semibold hover:bg-green-700 disabled:opacity-50 cursor-pointer"
                >
                  {buscandoSolicitante ? "Buscando..." : "Buscar"}
                </button>
              </div>
            </div>

            {solicitante && (
              <div className="mb-6 rounded-lg border border-green-800 bg-green-950/30 p-4">
                <p className="text-sm text-gray-400">Solicitante</p>

                <p className="mt-1 font-semibold">{solicitante.nome}</p>

                <p className="text-sm text-gray-400">
                  Matrícula: {solicitante.matricula}
                </p>

                <p className="text-sm text-gray-400">
                  Tipo: {solicitante.tipo}
                </p>
              </div>
            )}

            <div className="mb-6">
              <label
                htmlFor="observacoes"
                className="mb-2 block text-sm font-medium"
              >
                Observações
              </label>

              <textarea
                id="observacoes"
                value={observacoes}
                onChange={(event) => setObservacoes(event.target.value)}
                placeholder="Observações sobre o empréstimo (opcional)"
                rows={3}
                className="w-full resize-none rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500"
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
                disabled={salvandoEmprestimo}
                className="rounded-md border border-gray-700 px-5 py-3 font-semibold text-gray-300 hover:bg-gray-800 disabled:opacity-40 cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmarEmprestimo}
                disabled={salvandoEmprestimo || !solicitante}
                className="rounded-md bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                {salvandoEmprestimo ? "Registrando..." : "Confirmar empréstimo"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default ChavesPage;
