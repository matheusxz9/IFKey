import { apiFetch, type ApiFetchOptions } from "./api";
import type { Emprestimo, ListaEmprestimosResponse } from "../types/emprestimo";

interface CriarEmprestimoParams {
  solicitanteId: number;
  chaveId: number;
  observacoes?: string;
}

interface ListarEmprestimosParams {
  status?: string;
  solicitanteId?: number;
  chaveId?: number;
  page?: number;
  limit?: number;
}

export async function criarEmprestimo(
  dados: CriarEmprestimoParams,
  options?: ApiFetchOptions,
) {
  return apiFetch("/emprestimos", {
    method: "POST",
    body: JSON.stringify(dados),
    ...options,
  });
}

export async function listarEmprestimos(
  params: ListarEmprestimosParams = {},
  options?: ApiFetchOptions,
): Promise<ListaEmprestimosResponse> {
  const query = new URLSearchParams();

  if (params.status) {
    query.set("status", params.status);
  }

  if (params.solicitanteId) {
    query.set("solicitanteId", String(params.solicitanteId));
  }

  if (params.chaveId) {
    query.set("chaveId", String(params.chaveId));
  }

  if (params.page) {
    query.set("page", String(params.page));
  }

  if (params.limit) {
    query.set("limit", String(params.limit));
  }

  const queryString = query.toString();

  return apiFetch<ListaEmprestimosResponse>(
    `/emprestimos${queryString ? `?${queryString}` : ""}`,
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
) {
  return apiFetch(`/emprestimos/${id}/devolucao`, {
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
  const query = new URLSearchParams();

  if (params.de) {
    query.set("de", params.de);
  }

  if (params.ate) {
    query.set("ate", params.ate);
  }

  if (params.solicitanteId) {
    query.set("solicitanteId", String(params.solicitanteId));
  }

  if (params.chaveId) {
    query.set("chaveId", String(params.chaveId));
  }

  if (params.page) {
    query.set("page", String(params.page));
  }

  if (params.limit) {
    query.set("limit", String(params.limit));
  }

  const queryString = query.toString();

  return apiFetch<ListaEmprestimosResponse>(
    `/emprestimos/historico${queryString ? `?${queryString}` : ""}`,
    options,
  );
}
