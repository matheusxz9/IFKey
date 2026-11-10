import { apiFetch, type ApiFetchOptions } from "./api";
import { montarQueryString } from "./query";
import type {
  Emprestimo,
  ListaEmprestimosResponse,
  StatusEmprestimo,
} from "../types/emprestimo";

interface CriarEmprestimoParams {
  solicitanteId: number;
  chaveId: number;
  observacoes?: string;
}

interface ListarEmprestimosParams {
  status?: StatusEmprestimo;
  solicitanteId?: number;
  chaveId?: number;
  page?: number;
  limit?: number;
}

export async function criarEmprestimo(
  dados: CriarEmprestimoParams,
  options?: ApiFetchOptions,
): Promise<Emprestimo> {
  return apiFetch<Emprestimo>("/emprestimos", {
    method: "POST",
    body: JSON.stringify(dados),
    ...options,
  });
}

export async function listarEmprestimos(
  params: ListarEmprestimosParams = {},
  options?: ApiFetchOptions,
): Promise<ListaEmprestimosResponse> {
  const queryString = montarQueryString({
    status: params.status,
    solicitanteId: params.solicitanteId,
    chaveId: params.chaveId,
    page: params.page,
    limit: params.limit,
  });

  return apiFetch<ListaEmprestimosResponse>(
    `/emprestimos${queryString}`,
    options,
  );
}

export async function listarTodosEmprestimos(
  params: Omit<ListarEmprestimosParams, "page" | "limit"> = {},
  options?: ApiFetchOptions,
): Promise<Emprestimo[]> {
  const primeira = await listarEmprestimos(
    { ...params, page: 1, limit: 100 },
    options,
  );

  if (primeira.meta.totalPages <= 1) {
    return primeira.data;
  }

  const restantes = await Promise.all(
    Array.from({ length: primeira.meta.totalPages - 1 }, (_, indice) =>
      listarEmprestimos(
        { ...params, page: indice + 2, limit: 100 },
        options,
      ),
    ),
  );

  return [primeira, ...restantes].flatMap((resposta) => resposta.data);
}

export async function devolverEmprestimo(
  id: number,
  options?: ApiFetchOptions,
): Promise<Emprestimo> {
  return apiFetch<Emprestimo>(`/emprestimos/${id}/devolucao`, {
    method: "PATCH",
    ...options,
  });
}

interface HistoricoEmprestimosParams {
  de?: string;
  ate?: string;
  solicitanteId?: number;
  chaveId?: number;
  page?: number;
  limit?: number;
}

export async function listarHistoricoEmprestimos(
  params: HistoricoEmprestimosParams = {},
  options?: ApiFetchOptions,
): Promise<ListaEmprestimosResponse> {
  const queryString = montarQueryString({
    de: params.de,
    ate: params.ate,
    solicitanteId: params.solicitanteId,
    chaveId: params.chaveId,
    page: params.page,
    limit: params.limit,
  });

  return apiFetch<ListaEmprestimosResponse>(
    `/emprestimos/historico${queryString}`,
    options,
  );
}
