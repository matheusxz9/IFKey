export type StatusLinhaPrevia = 'NOVO' | 'DUPLICADO' | 'ERRO';
export type StatusOcorrenciaImportacao = 'IGNORADO' | 'ERRO';

export interface MensagemImportacao {
  campo?: string;
  mensagem: string;
}

export interface LinhaPrevia<T> {
  linha: number;
  dados: T;
  status: StatusLinhaPrevia;
  mensagens: MensagemImportacao[];
}

export interface PreviaImportacao<T> {
  total: number;
  resumo: { novos: number; duplicados: number; erros: number };
  linhas: LinhaPrevia<T>[];
}

export interface OcorrenciaImportacao {
  linha: number;
  status: StatusOcorrenciaImportacao;
  identificador: string;
  mensagens: MensagemImportacao[];
}

export interface RelatorioImportacao {
  total: number;
  criados: number;
  ignorados: number;
  erros: number;
  ocorrencias: OcorrenciaImportacao[];
}
