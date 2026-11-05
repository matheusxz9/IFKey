import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import type { UsuarioAutenticado } from './auth.service';
import { SemPermissaoException } from '../common/exceptions/app.exception';

interface RequisicaoAutenticada {
  headers: { authorization?: string };
  user?: UsuarioAutenticado;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequisicaoAutenticada>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token não informado.');
    }

    let payload: { sub: number; login: string; perfil: string };
    try {
      payload = this.jwtService.verify<{
        sub: number;
        login: string;
        perfil: string;
      }>(header.slice(7));
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }

    try {
      request.user = await this.authService.perfil(payload.sub, payload.perfil);
    } catch (erro) {
      if (erro instanceof SemPermissaoException) {
        throw new UnauthorizedException('Usuário inativo ou não encontrado.');
      }
      throw erro;
    }

    return true;
  }
}
