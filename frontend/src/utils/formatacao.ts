import type { PerfilSistema } from "../types/administrador";
import type { TipoSolicitante } from "../types/solicitante";

const ROTULOS_TIPO: Record<TipoSolicitante, string> = {
  ALUNO: "Aluno",
  PROFESSOR: "Professor",
  SERVIDOR: "Servidor",
};

const ROTULOS_PERFIL: Record<PerfilSistema, string> = {
  ADMINISTRADOR: "Administrador",
  GESTOR: "Gestor",
  SOLICITANTE: "Solicitante",
};

/** Converte os enums da API em rótulos legíveis (ex.: SERVIDOR → Servidor). */
export function formatarTipo(tipo: TipoSolicitante) {
  return ROTULOS_TIPO[tipo] ?? tipo;
}

export function formatarPerfil(perfil: PerfilSistema) {
  return ROTULOS_PERFIL[perfil] ?? perfil;
}

export function formatarDataHora(data: string) {
  return new Date(data).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

/** "1 chave" / "4 chaves" — usado nas contagens das listagens. */
export function pluralizar(quantidade: number, singular: string, plural: string) {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}
