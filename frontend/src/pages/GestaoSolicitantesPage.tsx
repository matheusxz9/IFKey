import { useEffect, useState } from "react";
import {
  listarSolicitantes,
  criarSolicitante,
  atualizarSolicitante,
  inativarSolicitante,
} from "../services/solicitantes";
import type { Solicitante, TipoSolicitante } from "../types/solicitante";

type ModalTipo = "cadastro" | "edicao" | null;

function GestaoSolicitantesPage() {
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
  const [solicitanteEmEdicao, setSolicitanteEmEdicao] =
    useState<Solicitante | null>(null);

  const [nome, setNome] = useState("");
  const [tipoForm, setTipoForm] = useState<TipoSolicitante>("ALUNO");
  const [matricula, setMatricula] = useState("");
  const [contato, setContato] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState("");

  const [solicitanteParaInativar, setSolicitanteParaInativar] =
    useState<Solicitante | null>(null);
  const [inativando, setInativando] = useState(false);
  const [erroInativacao, setErroInativacao] = useState("");

  async function carregarSolicitantes(paginaAtual = pagina) {
    try {
      setCarregando(true);
      setErro("");

      const resposta = await listarSolicitantes({
        nome: buscaNome || undefined,
        matricula: buscaMatricula || undefined,
        tipo: tipo || undefined,
        ativo: ativo !== "" ? ativo : undefined,
        page: paginaAtual,
        limit: 10,
      });

      setSolicitantes(resposta.data);
      setPagina(resposta.meta.page);
      setTotalPaginas(resposta.meta.totalPages);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao carregar os solicitantes.",
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarSolicitantes(1);
  }, []);

  function buscar() {
    setPagina(1);
    carregarSolicitantes(1);
  }

  function paginaAnterior() {
    if (pagina > 1) {
      carregarSolicitantes(pagina - 1);
    }
  }

  function proximaPagina() {
    if (pagina < totalPaginas) {
      carregarSolicitantes(pagina + 1);
    }
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
    if (salvando) {
      return;
    }

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
        await criarSolicitante({
          nome: nome.trim(),
          tipo: tipoForm,
          matricula: matricula.trim(),
          contato: contato.trim(),
        });
      } else if (modalTipo === "edicao" && solicitanteEmEdicao) {
        await atualizarSolicitante(solicitanteEmEdicao.id, {
          nome: nome.trim(),
          tipo: tipoForm,
          matricula: matricula.trim(),
          contato: contato.trim(),
        });
      }

      fecharModal();
      await carregarSolicitantes(pagina);
    } catch (error) {
      const erro = error as Error & { code?: string };

      if (erro.code === "MATRICULA_DUPLICADA") {
        setErroModal("Já existe um solicitante com essa matrícula.");
      } else if (erro.code === "VALIDACAO") {
        setErroModal("Dados inválidos. Verifique os campos informados.");
      } else {
        setErroModal(
          erro.message || "Não foi possível salvar o solicitante.",
        );
      }
    } finally {
      setSalvando(false);
    }
  }

  function confirmarInativacao(solicitante: Solicitante) {
    setSolicitanteParaInativar(solicitante);
    setErroInativacao("");
  }

  function fecharInativacao() {
    if (inativando) {
      return;
    }

    setSolicitanteParaInativar(null);
    setErroInativacao("");
  }

  async function executarInativacao() {
    if (!solicitanteParaInativar) {
      return;
    }

    try {
      setInativando(true);
      setErroInativacao("");

      await inativarSolicitante(solicitanteParaInativar.id);

      setSolicitanteParaInativar(null);
      await carregarSolicitantes(pagina);
    } catch (error) {
      setErroInativacao(
        error instanceof Error
          ? error.message
          : "Erro ao inativar o solicitante.",
      );
    } finally {
      setInativando(false);
    }
  }

  function formatarTipo(tipo: TipoSolicitante) {
    switch (tipo) {
      case "ALUNO":
        return "Aluno";
      case "PROFESSOR":
        return "Professor";
      case "SERVIDOR":
        return "Servidor";
      default:
        return tipo;
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestão de solicitantes</h1>

            <p className="mt-2 text-gray-400">
              Cadastre, edite e gerencie os solicitantes de chaves.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirModalCadastro}
            className="rounded-md bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 cursor-pointer"
          >
            Novo solicitante
          </button>
        </header>

        <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-gray-800 bg-gray-900 p-5 md:flex-row">
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={buscaNome}
            onChange={(event) => setBuscaNome(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                buscar();
              }
            }}
            className="flex-1 rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500"
          />

          <input
            type="text"
            placeholder="Buscar por matrícula..."
            value={buscaMatricula}
            onChange={(event) => setBuscaMatricula(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                buscar();
              }
            }}
            className="flex-1 rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500"
          />

          <select
            value={tipo}
            onChange={(event) => {
              const novoTipo = event.target.value as TipoSolicitante | "";
              setTipo(novoTipo);
              setPagina(1);
              setTimeout(() => carregarSolicitantes(1), 0);
            }}
            className="rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500 cursor-pointer"
          >
            <option value="">Todos os tipos</option>
            <option value="ALUNO">Aluno</option>
            <option value="PROFESSOR">Professor</option>
            <option value="SERVIDOR">Servidor</option>
          </select>

          <select
            value={ativo === "" ? "" : String(ativo)}
            onChange={(event) => {
              const valor = event.target.value;
              setAtivo(valor === "" ? "" : valor === "true");
              setPagina(1);
              setTimeout(() => carregarSolicitantes(1), 0);
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
              Carregando solicitantes...
            </div>
          ) : solicitantes.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              Nenhum solicitante encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-800 bg-gray-950">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Nome
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Tipo
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Matrícula
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Contato
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
                  {solicitantes.map((solicitante) => (
                    <tr
                      key={solicitante.id}
                      className="border-b border-gray-800 last:border-0"
                    >
                      <td className="px-6 py-4 font-medium">
                        {solicitante.nome}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            solicitante.tipo === "ALUNO"
                              ? "bg-blue-900 text-blue-300"
                              : solicitante.tipo === "PROFESSOR"
                                ? "bg-purple-900 text-purple-300"
                                : "bg-orange-900 text-orange-300"
                          }`}
                        >
                          {formatarTipo(solicitante.tipo)}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-gray-400">
                        {solicitante.matricula}
                      </td>

                      <td className="px-6 py-4 text-gray-400">
                        {solicitante.contato}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            solicitante.ativo
                              ? "bg-green-900 text-green-300"
                              : "bg-gray-700 text-gray-400"
                          }`}
                        >
                          {solicitante.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => abrirModalEdicao(solicitante)}
                            className="rounded-md border border-gray-700 px-3 py-1 text-sm font-medium text-gray-300 hover:bg-gray-800 cursor-pointer"
                          >
                            Editar
                          </button>

                          {solicitante.ativo && (
                            <button
                              type="button"
                              onClick={() => confirmarInativacao(solicitante)}
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
                  {modalTipo === "cadastro"
                    ? "Novo solicitante"
                    : "Editar solicitante"}
                </h2>

                <p className="mt-1 text-sm text-gray-400">
                  {modalTipo === "cadastro"
                    ? "Preencha os dados para cadastrar um novo solicitante."
                    : "Altere os dados do solicitante."}
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
                htmlFor="nome"
                className="mb-2 block text-sm font-medium"
              >
                Nome
              </label>

              <input
                id="nome"
                type="text"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                placeholder="Nome completo"
                className="w-full rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500"
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="tipo"
                className="mb-2 block text-sm font-medium"
              >
                Tipo
              </label>

              <select
                id="tipo"
                value={tipoForm}
                onChange={(event) =>
                  setTipoForm(event.target.value as TipoSolicitante)
                }
                className="w-full rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500 cursor-pointer"
              >
                <option value="ALUNO">Aluno</option>
                <option value="PROFESSOR">Professor</option>
                <option value="SERVIDOR">Servidor</option>
              </select>
            </div>

            <div className="mb-4">
              <label
                htmlFor="matricula"
                className="mb-2 block text-sm font-medium"
              >
                Matrícula
              </label>

              <input
                id="matricula"
                type="text"
                value={matricula}
                onChange={(event) => setMatricula(event.target.value)}
                placeholder="Número da matrícula"
                className="w-full rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-green-500"
              />
            </div>

            <div className="mb-6">
              <label
                htmlFor="contato"
                className="mb-2 block text-sm font-medium"
              >
                Contato
              </label>

              <input
                id="contato"
                type="text"
                value={contato}
                onChange={(event) => setContato(event.target.value)}
                placeholder="E-mail ou telefone"
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

      {solicitanteParaInativar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              fecharInativacao();
            }
          }}
        >
          <section className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white">
              Inativar solicitante
            </h2>

            <p className="mt-2 text-gray-400">
              Tem certeza que deseja inativar este solicitante?
            </p>

            <div className="mt-4 rounded-lg border border-gray-800 bg-gray-950 p-4">
              <p className="font-semibold text-white">
                {solicitanteParaInativar.nome}
              </p>

              <p className="mt-1 text-sm text-gray-400">
                {formatarTipo(solicitanteParaInativar.tipo)}
              </p>

              <p className="text-sm text-gray-400">
                Matrícula: {solicitanteParaInativar.matricula}
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

export default GestaoSolicitantesPage;
