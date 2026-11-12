import { apiFetch, type ApiFetchOptions } from "./api";
import { montarQueryString } from "./query";
import type {
  Solicitante,
  ListaSolicitantesResponse,
  TipoSolicitante,
} from "../types/solicitante";
import type {
  DadosImportacaoSolicitante,
  LinhaImportacao,
  PreviaImportacao,
  RelatorioImportacao,
} from "../types/importacao";

interface ListarSolicitantesParams {
  nome?: string;
  matricula?: string;
  tipo?: TipoSolicitante;
  ativo?: boolean;
  page?: number;
  limit?: number;
}

export async function listarSolicitantes(
  params: ListarSolicitantesParams = {},
  options?: ApiFetchOptions,
): Promise<ListaSolicitantesResponse> {
  const queryString = montarQueryString({
    nome: params.nome,
    matricula: params.matricula,
    tipo: params.tipo,
    ativo: params.ativo,
    page: params.page,
    limit: params.limit,
  });

  return apiFetch<ListaSolicitantesResponse>(
    `/solicitantes${queryString}`,
    options,
  );
}

export async function buscarSolicitante(
  id: number,
  options?: ApiFetchOptions,
): Promise<Solicitante> {
  return apiFetch<Solicitante>(`/solicitantes/${id}`, options);
}

interface CriarSolicitanteParams {
  nome: string;
  tipo: TipoSolicitante;
  matricula: string;
  contato: string;
}

export async function criarSolicitante(
  dados: CriarSolicitanteParams,
  options?: ApiFetchOptions,
): Promise<Solicitante> {
  return apiFetch<Solicitante>("/solicitantes", {
    method: "POST",
    body: JSON.stringify(dados),
    ...options,
  });
}

interface AtualizarSolicitanteParams {
  nome?: string;
  tipo?: TipoSolicitante;
  matricula?: string;
  contato?: string | null;
  ativo?: boolean;
}

export async function atualizarSolicitante(
  id: number,
  dados: AtualizarSolicitanteParams,
  options?: ApiFetchOptions,
): Promise<Solicitante> {
  return apiFetch<Solicitante>(`/solicitantes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(dados),
    ...options,
  });
}

export async function inativarSolicitante(
  id: number,
  options?: ApiFetchOptions,
): Promise<void> {
  return apiFetch<void>(`/solicitantes/${id}`, {
    method: "DELETE",
    ...options,
  });
}

export function previsualizarImportacaoSolicitantes(
  arquivo: File,
): Promise<PreviaImportacao<DadosImportacaoSolicitante>> {
  const body = new FormData();
  body.append("arquivo", arquivo);
  return apiFetch<PreviaImportacao<DadosImportacaoSolicitante>>(
    "/solicitantes/importacao/previa",
    { method: "POST", body },
  );
}

export function importarSolicitantes(
  linhas: LinhaImportacao<DadosImportacaoSolicitante>[],
): Promise<RelatorioImportacao> {
  return apiFetch<RelatorioImportacao>("/solicitantes/importacao", {
    method: "POST",
    body: JSON.stringify({
      linhas: linhas.map(({ linha, dados }) => ({ linha, ...dados })),
    }),
  });
}

export async function buscarSolicitantePorMatricula(
  matricula: string,
  options?: ApiFetchOptions,
): Promise<Solicitante> {
  const resposta = await listarSolicitantes({ matricula }, options);

  const solicitante = resposta.data?.[0];

  if (!solicitante) {
    throw new Error("Solicitante não encontrado.");
  }

  return solicitante;
}
