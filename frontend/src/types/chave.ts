export type StatusChave = "DISPONIVEL" | "EMPRESTADA";

export interface Chave {
  id: number;
  codigo: string;
  descricao: string;
  status: StatusChave;
}

export interface Paginacao {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListaChavesResponse {
  data: Chave[];
  meta: Paginacao;
}
