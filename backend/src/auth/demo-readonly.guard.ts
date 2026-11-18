import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { SemPermissaoException } from '../common/exceptions/app.exception';
import type { UsuarioAutenticado } from './auth.service';

@Injectable()
export class DemoReadOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: UsuarioAutenticado }>();
    const identificador = request.user?.login ?? request.user?.matricula ?? '';

    if (identificador.toLowerCase().startsWith('demo.')) {
      throw new SemPermissaoException(
        'Contas de demonstração não podem alterar administradores.',
      );
    }
    return true;
  }
}
