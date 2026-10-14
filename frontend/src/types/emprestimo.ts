import type { Paginacao } from "./common";

export type StatusEmprestimo = "EMPRESTADA" | "DEVOLVIDA";

export interface Emprestimo {
  id: number;
  observacoes?: string | null;
  dataHoraEmprestimo: string;
  dataHoraDevolucao?: string | null;
  status: StatusEmprestimo;
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

export interface ListaEmprestimosResponse {
  data: Emprestimo[];
  meta: Paginacao;
}
