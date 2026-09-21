import { useEffect, useState } from "react";
import {
  listarHistoricoEmprestimos,
  type Emprestimo,
} from "../services/emprestimos";

function HistoricoPage() {
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  async function carregarHistorico(paginaAtual = pagina) {
    try {
      setCarregando(true);
      setErro("");

      const resposta = await listarHistoricoEmprestimos({
        de: dataInicio ? `${dataInicio}T00:00:00` : undefined,
        ate: dataFim ? `${dataFim}T23:59:59` : undefined,
        page: paginaAtual,
        limit: 10,
      });

      setEmprestimos(resposta.data);
      setPagina(resposta.meta.page);
      setTotalPaginas(resposta.meta.totalPages);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao carregar o histórico.",
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarHistorico(1);
  }, []);

  function pesquisar() {
    setPagina(1);
    carregarHistorico(1);
  }

  function paginaAnterior() {
    if (pagina > 1) {
      carregarHistorico(pagina - 1);
    }
  }

  function proximaPagina() {
    if (pagina < totalPaginas) {
      carregarHistorico(pagina + 1);
    }
  }

  function formatarData(data: string) {
    return new Date(data).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  return (
    <main className="min-h-screen bg-gray-950 p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Histórico de empréstimos</h1>

          <p className="mt-2 text-gray-400">
            Consulte os empréstimos que já foram devolvidos.
          </p>
        </header>

        <section className="mb-6 rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <label
                htmlFor="dataInicio"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Data inicial
              </label>

              <input
                id="dataInicio"
                type="date"
                value={dataInicio}
                onChange={(event) => setDataInicio(event.target.value)}
                className="w-full rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500"
              />
            </div>

            <div className="flex-1">
              <label
                htmlFor="dataFim"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Data final
              </label>

              <input
                id="dataFim"
                type="date"
                value={dataFim}
                onChange={(event) => setDataFim(event.target.value)}
                className="w-full rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500"
              />
            </div>

            <button
              type="button"
              onClick={pesquisar}
              className="rounded-md bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
            >
              Pesquisar
            </button>
          </div>
        </section>

        {erro && (
          <div className="mb-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-red-400">
            {erro}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
          {carregando ? (
            <div className="p-8 text-center text-gray-400">
              Carregando histórico...
            </div>
          ) : emprestimos.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              Nenhum empréstimo encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-800 bg-gray-950">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Chave
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Solicitante
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Empréstimo
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Devolução
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {emprestimos.map((emprestimo) => (
                    <tr
                      key={emprestimo.id}
                      className="border-b border-gray-800 last:border-0"
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium">{emprestimo.chave.codigo}</p>

                        <p className="text-sm text-gray-400">
                          {emprestimo.chave.descricao}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-medium">
                          {emprestimo.solicitante.nome}
                        </p>

                        <p className="text-sm text-gray-400">
                          {emprestimo.solicitante.matricula}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-gray-400">
                        {formatarData(emprestimo.dataHoraEmprestimo)}
                      </td>

                      <td className="px-6 py-4 text-gray-400">
                        {emprestimo.dataHoraDevolucao
                          ? formatarData(emprestimo.dataHoraDevolucao)
                          : "-"}
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
    </main>
  );
}

export default HistoricoPage;
