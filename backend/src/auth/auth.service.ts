import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { SuapService } from './suap.service';
import { Administrador } from '../administradores/administrador.entity';
import { SemPermissaoException } from '../common/exceptions/app.exception';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly suapService: SuapService,
    private readonly jwtService: JwtService,
    @InjectRepository(Administrador)
    private readonly adminRepo: Repository<Administrador>,
  ) {}

  async loginSuap(code: string) {
    const accessToken = await this.suapService.trocarCodePorToken(code);
    const usuario = await this.suapService.buscarUsuario(accessToken);
    const login =
      usuario.vinculo?.login ??
      usuario.email_academico?.split('@')[0] ??
      usuario.email_google_classroom?.split('@')[0] ??
      usuario.identificacao;
    if (!login) {
      throw new UnauthorizedException(
        'Não foi possível identificar o login do usuário.',
      );
    }
    const admin = await this.adminRepo.findOne({
      where: { login, ativo: true },
    });
    if (!admin) {
      this.logger.warn(`Login SUAP sem administrador cadastrado: ${login}`);
      throw new SemPermissaoException(
        'Usuário não está cadastrado como administrador.',
      );
    }
    this.logger.log(`Login SUAP OK: ${login} (admin id ${admin.id})`);
    const jwt = await this.jwtService.signAsync({
      sub: admin.id,
      login: admin.login,
      perfil: admin.perfil,
    });
    return {
      accessToken: jwt,
      administrador: {
        id: admin.id,
        nome: admin.nome,
        login: admin.login,
        perfil: admin.perfil,
      },
    };
  }

  async perfil(adminId: number) {
    const admin = await this.adminRepo.findOne({ where: { id: adminId } });
    if (!admin || !admin.ativo) {
      throw new SemPermissaoException();
    }
    return {
      id: admin.id,
      nome: admin.nome,
      login: admin.login,
      perfil: admin.perfil,
    };
  }
}
