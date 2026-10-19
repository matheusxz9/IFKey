export enum PerfilAdministrador {
  ADMINISTRADOR = 'ADMINISTRADOR',
  GESTOR = 'GESTOR',
  SOLICITANTE = 'SOLICITANTE',
}

export const PERFIS_ADMINISTRADOR = [
  PerfilAdministrador.ADMINISTRADOR,
  PerfilAdministrador.GESTOR,
] as const;
