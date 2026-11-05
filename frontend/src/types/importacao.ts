export type StatusLinhaImportacao = "NOVO" | "DUPLICADO" | "ERRO";
export type StatusOcorrenciaImportacao = "IGNORADO" | "ERRO";

export type ValoresImportacao = Record<string, string | null>;

export interface MensagemLinhaImportacao {
  campo?: string;
  mensagem: string;
}

export interface LinhaImportacao<T extends ValoresImportacao> {
  linha: number;
  dados: T;
  status: StatusLinhaImportacao;
  mensagens: MensagemLinhaImportacao[];
}

export interface PreviaImportacao<T extends ValoresImportacao> {
  total: number;
  resumo: { novos: number; duplicados: number; erros: number };
  linhas: LinhaImportacao<T>[];
}

export interface OcorrenciaImportacao {
  linha: number;
  status: StatusOcorrenciaImportacao;
  identificador: string;
  mensagens: MensagemLinhaImportacao[];
}

export interface RelatorioImportacao {
  total: number;
  criados: number;
  ignorados: number;
  erros: number;
  ocorrencias: OcorrenciaImportacao[];
}

export interface DadosImportacaoSolicitante extends ValoresImportacao {
  nome: string;
  tipo: string;
  matricula: string;
  contato: string | null;
}

export interface DadosImportacaoChave extends ValoresImportacao {
  codigo: string;
  descricao: string;
  localizacao: string;
}
