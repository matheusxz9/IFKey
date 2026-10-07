import { apiFetch, type ApiFetchOptions } from "./api";
import type { Chave, ListaChavesResponse, StatusChave } from "../types/chave";

interface ListarChavesParams {
  busca?: string;
  status?: StatusChave;
  ativo?: boolean;
  page?: number;
  limit?: number;
}

export async function listarChaves(
  params: ListarChavesParams = {},
  options?: ApiFetchOptions,
): Promise<ListaChavesResponse> {
  const query = new URLSearchParams();

  if (params.busca) {
    query.set("busca", params.busca);
  }

  if (params.status) {
    query.set("status", params.status);
  }

  if (params.ativo !== undefined) {
    query.set("ativo", String(params.ativo));
  }

  if (params.page) {
    query.set("page", String(params.page));
  }

  if (params.limit) {
    query.set("limit", String(params.limit));
  }

  const queryString = query.toString();

  return apiFetch<ListaChavesResponse>(`/chaves${queryString ? `?${queryString}` : ""}`, options);
}

export async function buscarChave(
  id: number,
  options?: ApiFetchOptions,
): Promise<Chave> {
  return apiFetch<Chave>(`/chaves/${id}`, options);
}

interface CriarChaveParams {
  codigo: string;
  descricao: string;
  localizacao: string;
}

export async function criarChave(
  dados: CriarChaveParams,
  options?: ApiFetchOptions,
): Promise<Chave> {
  return apiFetch<Chave>("/chaves", {
    method: "POST",
    body: JSON.stringify(dados),
    ...options,
  });
}

interface AtualizarChaveParams {
  codigo?: string;
  descricao?: string;
  localizacao?: string;
  ativo?: boolean;
}

export async function atualizarChave(
  id: number,
  dados: AtualizarChaveParams,
  options?: ApiFetchOptions,
): Promise<Chave> {
  return apiFetch<Chave>(`/chaves/${id}`, {
    method: "PATCH",
    body: JSON.stringify(dados),
    ...options,
  });
}

export async function inativarChave(
  id: number,
  options?: ApiFetchOptions,
): Promise<void> {
  return apiFetch<void>(`/chaves/${id}`, {
    method: "DELETE",
    ...options,
  });
}
