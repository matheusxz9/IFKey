import { apiFetch } from "./api";

interface CriarEmprestimoParams {
  solicitanteId: number;
  chaveId: number;
  observacoes?: string;
}

export interface Emprestimo {
  id: number;
  observacoes?: string | null;
  dataEmprestimo: string;
  dataDevolucao?: string | null;
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
