import { SetMetadata } from '@nestjs/common';
import type { PerfilAdministrador } from '../common/enums/perfil-administrador.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: PerfilAdministrador[]) =>
  SetMetadata(ROLES_KEY, roles);
