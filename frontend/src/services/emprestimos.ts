import { apiFetch } from "./api";

interface CriarEmprestimoParams {
  solicitanteId: number;
  chaveId: number;
  observacoes?: string;
}

export interface Emprestimo {
  id: number;
  observacoes?: string | null;
  dataHoraEmprestimo: string;
  dataHoraDevolucao?: string | null;
  status: string;
  solicitante: {
    id: number;
    nome: string;
    matricula: string;
    tipo: string;
  };
  chave: {
    id: number;
    codigo: string;
    descricao: string;
  };
}

interface ListarEmprestimosParams {
  status?: string;
}

export async function criarEmprestimo(dados: CriarEmprestimoParams) {
  return apiFetch("/emprestimos", {
    method: "POST",
    body: JSON.stringify(dados),
  });
}

export async function listarEmprestimos(
  params: ListarEmprestimosParams = {},
): Promise<Emprestimo[]> {
  const query = new URLSearchParams();

  if (params.status) {
    query.set("status", params.status);
  }

  const queryString = query.toString();

  const resposta = await apiFetch(
    `/emprestimos${queryString ? `?${queryString}` : ""}`,
  );

  return resposta.data;
}

export async function devolverEmprestimo(id: number) {
  return apiFetch(`/emprestimos/${id}/devolucao`, {
    method: "PATCH",
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

export interface ListaHistoricoEmprestimosResponse {
  data: Emprestimo[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function listarHistoricoEmprestimos(
  params: HistoricoEmprestimosParams = {},
): Promise<ListaHistoricoEmprestimosResponse> {
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

  return apiFetch(
    `/emprestimos/historico${queryString ? `?${queryString}` : ""}`,
  );
}
