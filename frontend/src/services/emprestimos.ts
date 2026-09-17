import { apiFetch } from "./api";

interface CriarEmprestimoParams {
  solicitanteId: number;
  chaveId: number;
  observacoes?: string;
}

export async function criarEmprestimo(dados: CriarEmprestimoParams) {
  return apiFetch("/emprestimos", {
    method: "POST",
    body: JSON.stringify(dados),
  });
}
