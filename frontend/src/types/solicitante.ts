import type { Paginacao } from "./common";

export type TipoSolicitante = "ALUNO" | "PROFESSOR" | "SERVIDOR";

export interface Solicitante {
  id: number;
  nome: string;
  tipo: TipoSolicitante;
  matricula: string;
  contato: string;
  ativo: boolean;
}

export interface ListaSolicitantesResponse {
  data: Solicitante[];
  meta: Paginacao;
}
