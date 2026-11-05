import { useEffect, useId, useState } from "react";
import Modal from "./Modal";
import { Alerta } from "./ui/Alerta";
import { Botao } from "./ui/Botao";
import { Entrada, Selecao } from "./ui/Campos";
import { Selo, type VarianteSelo } from "./ui/Selo";
import type {
  LinhaImportacao,
  PreviaImportacao,
  RelatorioImportacao,
  ValoresImportacao,
} from "../types/importacao";

export interface CampoImportacao {
  chave: string;
  rotulo: string;
  obrigatorio?: boolean;
  maxLength?: number;
  opcoes?: { valor: string; rotulo: string }[];
}

interface Props<T extends ValoresImportacao> {
  aberto: boolean;
  titulo: string;
  descricao: string;
  nomeArquivoModelo: string;
  conteudoModelo: string;
  campos: CampoImportacao[];
  campoIdentificador: string;
  previsualizar: (arquivo: File) => Promise<PreviaImportacao<T>>;
  importar: (linhas: LinhaImportacao<T>[]) => Promise<RelatorioImportacao>;
  onFechar: () => void;
  onImportado: (relatorio: RelatorioImportacao) => void;
}

const TAMANHO_MAXIMO_ARQUIVO = 2 * 1024 * 1024;

const varianteStatus: Record<LinhaImportacao<ValoresImportacao>["status"], VarianteSelo> = {
  NOVO: "novo",
  DUPLICADO: "duplicado",
  ERRO: "erro",
};

const rotuloStatus = {
  NOVO: "Novo",
  DUPLICADO: "Já cadastrado",
  ERRO: "Erro",
} as const;

type Etapa = "selecao" | "revisao";

function ImportacaoCsvModal<T extends ValoresImportacao>({
  aberto,
  titulo,
  descricao,
  nomeArquivoModelo,
  conteudoModelo,
  campos,
  campoIdentificador,
  previsualizar,
  importar,
  onFechar,
  onImportado,
}: Props<T>) {
  const idArquivo = useId();

  const [etapa, setEtapa] = useState<Etapa>("selecao");
  const [linhas, setLinhas] = useState<LinhaImportacao<T>[]>([]);
  const [linhaEditando, setLinhaEditando] = useState<number | null>(null);
  const [rascunho, setRascunho] = useState<Record<string, string>>({});
  const [erro, setErro] = useState("");
  const [erroEdicao, setErroEdicao] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const ocupado = carregando || enviando;

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!aberto) return;
    setEtapa("selecao");
    setLinhas([]);
    setLinhaEditando(null);
    setRascunho({});
    setErro("");
    setErroEdicao("");
    setCarregando(false);
    setEnviando(false);
  }, [aberto]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function fechar() {
    if (ocupado) return;
    onFechar();
  }

  function voltarParaSelecao() {
    if (ocupado) return;
    setEtapa("selecao");
    setLinhas([]);
    setLinhaEditando(null);
    setRascunho({});
    setErro("");
    setErroEdicao("");
  }

  function baixarModelo() {
    const blob = new Blob([`\uFEFF${conteudoModelo}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nomeArquivoModelo;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function selecionarArquivo(arquivo?: File) {
    if (!arquivo) return;
    if (!arquivo.name.toLowerCase().endsWith(".csv")) {
      setErro("Selecione um arquivo com extensão .csv.");
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_ARQUIVO) {
      setErro("O arquivo CSV deve ter no máximo 2 MB.");
      return;
    }

    setCarregando(true);
    setErro("");
    setErroEdicao("");
    try {
      const previa = await previsualizar(arquivo);
      setLinhas(previa.linhas);
      setEtapa("revisao");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível ler o arquivo CSV.");
    } finally {
      setCarregando(false);
    }
  }

  function iniciarEdicao(linha: LinhaImportacao<T>) {
    setLinhaEditando(linha.linha);
    setErroEdicao("");
    setRascunho(
      Object.fromEntries(
        campos.map((campo) => [campo.chave, linha.dados[campo.chave] ?? ""]),
      ),
    );
  }

  function cancelarEdicao() {
    setLinhaEditando(null);
    setRascunho({});
    setErroEdicao("");
  }

  function removerLinha(linha: LinhaImportacao<T>) {
    setLinhas((anteriores) => anteriores.filter((atual) => atual.linha !== linha.linha));
    if (linhaEditando === linha.linha) cancelarEdicao();
  }

  function salvarEdicao(linha: LinhaImportacao<T>) {
    const obrigatorioVazio = campos.find(
      (campo) => campo.obrigatorio && !(rascunho[campo.chave] ?? "").trim(),
    );
    if (obrigatorioVazio) {
      setErroEdicao(`Preencha o campo ${obrigatorioVazio.rotulo}.`);
      return;
    }

    const excedeuTamanho = campos.find(
      (campo) =>
        campo.maxLength !== undefined &&
        (rascunho[campo.chave] ?? "").trim().length > campo.maxLength,
    );
    if (excedeuTamanho) {
      setErroEdicao(
        `O campo ${excedeuTamanho.rotulo} deve ter no máximo ${excedeuTamanho.maxLength} caracteres.`,
      );
      return;
    }

    const opcaoInvalida = campos.find(
      (campo) =>
        campo.opcoes &&
        !campo.opcoes.some((opcao) => opcao.valor === rascunho[campo.chave]),
    );
    if (opcaoInvalida) {
      setErroEdicao(`Selecione uma opção válida para ${opcaoInvalida.rotulo}.`);
      return;
    }

    const identificador = (rascunho[campoIdentificador] ?? "").trim().toLowerCase();
    const repetido = linhas.some(
      (atual) =>
        atual.linha !== linha.linha &&
        String(atual.dados[campoIdentificador] ?? "").trim().toLowerCase() ===
          identificador,
    );
    if (repetido) {
      setErroEdicao("Já existe outra linha com este identificador.");
      return;
    }

    setLinhas((anteriores) =>
      anteriores.map((atual) => {
        if (atual.linha !== linha.linha) return atual;
        const dados = { ...atual.dados } as Record<string, string | null>;
        campos.forEach((campo) => {
          dados[campo.chave] = (rascunho[campo.chave] ?? "").trim();
        });
        return {
          ...atual,
          dados: dados as T,
          status: "NOVO",
          mensagens: [],
        };
      }),
    );
    cancelarEdicao();
  }

  const resumo = linhas.reduce(
    (contagem, linha) => {
      if (linha.status === "NOVO") contagem.novos += 1;
      if (linha.status === "DUPLICADO") contagem.duplicados += 1;
      if (linha.status === "ERRO") contagem.erros += 1;
      return contagem;
    },
    { novos: 0, duplicados: 0, erros: 0 },
  );

  const aprovacaoBloqueada = linhas.length === 0 || resumo.erros > 0 || ocupado;

  async function aprovar() {
    if (linhas.length === 0 || resumo.erros > 0) return;
    setEnviando(true);
    setErro("");
    try {
      const relatorio = await importar(linhas);
      if (relatorio.erros > 0) {
        const errosPorLinha = new Map(
          relatorio.ocorrencias
            .filter((ocorrencia) => ocorrencia.status === "ERRO")
            .map((ocorrencia) => [ocorrencia.linha, ocorrencia]),
        );
        setLinhas((anteriores) =>
          anteriores.map((linha) => {
            const ocorrencia = errosPorLinha.get(linha.linha);
            return ocorrencia
              ? { ...linha, status: "ERRO", mensagens: ocorrencia.mensagens }
              : linha;
          }),
        );
        setErro(
          "Nenhuma linha foi importada. Corrija as linhas com erro e tente novamente.",
        );
        return;
      }
      onImportado(relatorio);
      onFechar();
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Não foi possível concluir a importação.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal aberto={aberto} onClose={fechar} titulo={titulo} tamanho="xl">
      <div className="space-y-4 text-sm text-texto">
        {etapa === "selecao" ? (
          <>
            <p>{descricao}</p>
            <div className="rounded-lg border border-linha bg-superficie-alta p-4">
              <p className="font-medium text-texto">Baixe o modelo e preencha uma linha por registro.</p>
              <p className="mt-1 text-texto-medio">
                O arquivo deve estar em UTF-8, com até 2 MB e no máximo 5.000 linhas de dados.
              </p>
              <Botao className="mt-3" onClick={baixarModelo}>
                Baixar modelo CSV
              </Botao>
            </div>
            <div>
              <label htmlFor={idArquivo} className="mb-1.5 block font-medium text-texto-medio">
                Arquivo CSV
              </label>
              <Entrada
                id={idArquivo}
                type="file"
                accept=".csv,text/csv"
                aria-label="Arquivo CSV"
                disabled={carregando}
                onChange={(evento) => {
                  const arquivo = evento.target.files?.[0];
                  evento.target.value = "";
                  void selecionarArquivo(arquivo);
                }}
              />
            </div>
            {carregando && <p role="status">Lendo e validando o arquivo...</p>}
            {erro && <Alerta>{erro}</Alerta>}
            <div className="flex justify-end gap-2">
              <Botao onClick={fechar} disabled={carregando}>
                Fechar
              </Botao>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Selo variante="novo">Novos: {resumo.novos}</Selo>
              <Selo variante="duplicado">Já cadastrados: {resumo.duplicados}</Selo>
              <Selo variante="erro">Com erro: {resumo.erros}</Selo>
            </div>

            {linhas.length === 0 ? (
              <p className="rounded-lg border border-linha p-4 text-texto-medio">
                Nenhuma linha restante para importar. Escolha outro arquivo ou recuse a
                importação.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-linha">
                <table className="w-full min-w-[42rem] text-left text-sm">
                  <thead className="bg-superficie-alta text-xs text-texto-fraco">
                    <tr>
                      <th className="px-3 py-2 font-medium">Linha</th>
                      {campos.map((campo) => (
                        <th key={campo.chave} className="px-3 py-2 font-medium">
                          {campo.rotulo}
                        </th>
                      ))}
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map((linha) => {
                      const editando = linhaEditando === linha.linha;
                      return (
                        <tr key={linha.linha} className="border-t border-linha align-top">
                          <td className="px-3 py-3 font-mono text-xs text-texto-medio">
                            {linha.linha}
                          </td>
                          {campos.map((campo) => {
                            const rotulo = `${campo.rotulo} da linha ${linha.linha}`;
                            if (!editando) {
                              const valor = linha.dados[campo.chave];
                              return (
                                <td key={campo.chave} className="px-3 py-3">
                                  {campo.opcoes
                                    ? (campo.opcoes.find((opcao) => opcao.valor === valor)
                                        ?.rotulo ?? valor ?? "—")
                                    : (valor || "—")}
                                </td>
                              );
                            }
                            return (
                              <td key={campo.chave} className="px-3 py-3">
                                {campo.opcoes ? (
                                  <Selecao
                                    aria-label={rotulo}
                                    value={rascunho[campo.chave] ?? ""}
                                    onChange={(evento) =>
                                      setRascunho((atual) => ({
                                        ...atual,
                                        [campo.chave]: evento.target.value,
                                      }))
                                    }
                                  >
                                    <option value="">Selecione...</option>
                                    {campo.opcoes.map((opcao) => (
                                      <option key={opcao.valor} value={opcao.valor}>
                                        {opcao.rotulo}
                                      </option>
                                    ))}
                                  </Selecao>
                                ) : (
                                  <Entrada
                                    aria-label={rotulo}
                                    value={rascunho[campo.chave] ?? ""}
                                    maxLength={campo.maxLength}
                                    onChange={(evento) =>
                                      setRascunho((atual) => ({
                                        ...atual,
                                        [campo.chave]: evento.target.value,
                                      }))
                                    }
                                  />
                                )}
                              </td>
                            );
                          })}
                          <td className="px-3 py-3">
                            <Selo variante={varianteStatus[linha.status]}>
                              {rotuloStatus[linha.status]}
                            </Selo>
                            {linha.mensagens.length > 0 && (
                              <ul className="mt-1 space-y-0.5 text-xs text-vermelho">
                                {linha.mensagens.map((mensagem, indice) => (
                                  <li key={`${mensagem.mensagem}-${indice}`}>
                                    {mensagem.mensagem}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1">
                              {editando ? (
                                <>
                                  <Botao
                                    tamanho="sm"
                                    variante="primario"
                                    aria-label={`Salvar linha ${linha.linha}`}
                                    onClick={() => salvarEdicao(linha)}
                                  >
                                    Salvar
                                  </Botao>
                                  <Botao
                                    tamanho="sm"
                                    variante="sutil"
                                    aria-label={`Cancelar edição da linha ${linha.linha}`}
                                    onClick={cancelarEdicao}
                                  >
                                    Cancelar
                                  </Botao>
                                </>
                              ) : (
                                <>
                                  <Botao
                                    tamanho="sm"
                                    variante="sutil"
                                    aria-label={`Editar linha ${linha.linha}`}
                                    onClick={() => iniciarEdicao(linha)}
                                  >
                                    Editar
                                  </Botao>
                                  <Botao
                                    tamanho="sm"
                                    variante="sutil-perigo"
                                    aria-label={`Remover linha ${linha.linha}`}
                                    onClick={() => removerLinha(linha)}
                                  >
                                    Remover
                                  </Botao>
                                </>
                              )}
                            </div>
                            {editando && erroEdicao && (
                              <p className="mt-1 text-xs text-vermelho">{erroEdicao}</p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {erro && <Alerta>{erro}</Alerta>}

            <div className="flex flex-col gap-3 border-t border-linha pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-texto-medio">
                  {resumo.erros > 0
                    ? "Corrija ou remova as linhas com erro para importar."
                    : linhas.length === 0
                      ? "Não há linhas para importar."
                      : "As linhas já cadastradas serão ignoradas."}
                </p>
                <Botao variante="sutil" onClick={voltarParaSelecao} disabled={ocupado}>
                  Escolher outro arquivo
                </Botao>
              </div>
              <div className="flex justify-end gap-2">
                <Botao onClick={fechar} disabled={ocupado}>
                  Recusar
                </Botao>
                <Botao
                  variante="primario"
                  onClick={() => void aprovar()}
                  disabled={aprovacaoBloqueada}
                  carregando={enviando}
                >
                  Aprovar importação
                </Botao>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export default ImportacaoCsvModal;
