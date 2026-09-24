import type { Paginacao } from "./common";

export type StatusChave = "DISPONIVEL" | "EMPRESTADA";

export interface Chave {
  id: number;
  codigo: string;
  descricao: string;
  localizacao: string;
  status: StatusChave;
  ativo: boolean;
}

export interface ListaChavesResponse {
  data: Chave[];
  meta: Paginacao;
}
