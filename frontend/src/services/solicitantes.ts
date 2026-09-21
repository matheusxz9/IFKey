import { apiFetch } from "./api";
import type {
  Solicitante,
  ListaSolicitantesResponse,
  TipoSolicitante,
} from "../types/solicitante";

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
): Promise<ListaSolicitantesResponse> {
  const query = new URLSearchParams();

  if (params.nome) {
    query.set("nome", params.nome);
  }

  if (params.matricula) {
    query.set("matricula", params.matricula);
  }

  if (params.tipo) {
    query.set("tipo", params.tipo);
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

  return apiFetch(
    `/solicitantes${queryString ? `?${queryString}` : ""}`,
  );
}

export async function buscarSolicitante(id: number): Promise<Solicitante> {
  return apiFetch(`/solicitantes/${id}`);
}

interface CriarSolicitanteParams {
  nome: string;
  tipo: TipoSolicitante;
  matricula: string;
  contato: string;
}

export async function criarSolicitante(
  dados: CriarSolicitanteParams,
): Promise<Solicitante> {
  return apiFetch("/solicitantes", {
    method: "POST",
    body: JSON.stringify(dados),
  });
}

interface AtualizarSolicitanteParams {
  nome?: string;
  tipo?: TipoSolicitante;
  matricula?: string;
  contato?: string;
  ativo?: boolean;
}

export async function atualizarSolicitante(
  id: number,
  dados: AtualizarSolicitanteParams,
): Promise<Solicitante> {
  return apiFetch(`/solicitantes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(dados),
  });
}

export async function inativarSolicitante(id: number): Promise<void> {
  return apiFetch(`/solicitantes/${id}`, {
    method: "DELETE",
  });
}
