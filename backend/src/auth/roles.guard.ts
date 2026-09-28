import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: { perfil: string };
    }>();
    const user = request.user;
    if (!user || !user.perfil) {
      throw new ForbiddenException('Usuário sem perfil definido.');
    }

    const hasRole = requiredRoles.includes(user.perfil);
    if (!hasRole) {
      throw new ForbiddenException(
        `Acesso negado. Perfis permitidos: ${requiredRoles.join(', ')}`,
      );
    }
    return true;
  }
}
