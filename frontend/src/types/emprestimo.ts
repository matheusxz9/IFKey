import type { Paginacao } from "./common";
import type { TipoSolicitante } from "./solicitante";

export type StatusEmprestimo = "EMPRESTADA" | "DEVOLVIDA";

export interface ParticipanteEmprestimo {
  id: number;
  nome: string;
  matricula: string;
  tipo: string;
}

export type DevolvidoPor =
  | ({ tipo: "SOLICITANTE" } & ParticipanteEmprestimo)
  | {
      tipo: "ADMINISTRADOR" | "GESTOR";
      id: number;
      nome: string;
      login: string;
    };

export interface RepasseEmprestimo {
  id: number;
  origem: ParticipanteEmprestimo;
  destino: ParticipanteEmprestimo;
  dataHora: string;
  observacoes?: string | null;
}

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
    tipo: TipoSolicitante;
  };
  responsavelAtual: ParticipanteEmprestimo;
  devolvidoPor?: DevolvidoPor | null;
  repasses?: RepasseEmprestimo[];
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
