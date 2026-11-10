import type { TipoSolicitante } from "./solicitante";

export type PerfilSistema = "ADMINISTRADOR" | "GESTOR" | "SOLICITANTE";
export type PerfilAdministrador = Exclude<PerfilSistema, "SOLICITANTE">;

export interface Administrador {
  id: number;
  nome: string;
  login: string;
  perfil: PerfilAdministrador;
  ativo: boolean;
}

export interface CriarAdministradorDto {
  login: string;
  nome: string;
  perfil: PerfilAdministrador;
}

export interface AtualizarAdministradorDto {
  nome?: string;
  perfil?: PerfilAdministrador;
  ativo?: boolean;
}

export interface ConverterSolicitanteDto {
  tipo: TipoSolicitante;
  matricula?: string;
  contato?: string;
}

export interface ListarAdministradoresQueryDto {
  page?: number;
  limit?: number;
  nome?: string;
  login?: string;
  perfil?: PerfilAdministrador;
  ativo?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
