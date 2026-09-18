import { apiFetch } from "./api";
import type { ListaChavesResponse, StatusChave } from "../types/chave";

interface ListarChavesParams {
  busca?: string;
  status?: StatusChave;
  page?: number;
  limit?: number;
}

export async function listarChaves(
  params: ListarChavesParams = {},
): Promise<ListaChavesResponse> {
  const query = new URLSearchParams();

  if (params.busca) {
    query.set("busca", params.busca);
  }

  if (params.status) {
    query.set("status", params.status);
  }

  if (params.page) {
    query.set("page", String(params.page));
  }

  if (params.limit) {
    query.set("limit", String(params.limit));
  }

  const queryString = query.toString();

  return apiFetch(`/chaves${queryString ? `?${queryString}` : ""}`);
}
