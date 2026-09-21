export type TipoSolicitante = "ALUNO" | "PROFESSOR" | "SERVIDOR";

export interface Solicitante {
  id: number;
  nome: string;
  tipo: TipoSolicitante;
  matricula: string;
  contato: string;
  ativo: boolean;
}

export interface Paginacao {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListaSolicitantesResponse {
  data: Solicitante[];
  meta: Paginacao;
}
