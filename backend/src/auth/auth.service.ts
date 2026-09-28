import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { SuapService } from './suap.service';
import { Administrador } from '../administradores/administrador.entity';
import { Solicitante } from '../solicitantes/solicitante.entity';
import { SemPermissaoException } from '../common/exceptions/app.exception';
import { PerfilAdministrador } from '../common/enums/perfil-administrador.enum';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly suapService: SuapService,
    private readonly jwtService: JwtService,
    @InjectRepository(Administrador)
    private readonly adminRepo: Repository<Administrador>,
    @InjectRepository(Solicitante)
    private readonly solicitanteRepo: Repository<Solicitante>,
  ) {}

  async loginSuap(code: string) {
    const accessToken = await this.suapService.trocarCodePorToken(code);
    const usuario = await this.suapService.buscarUsuario(accessToken);
    const login =
      usuario.vinculo?.login ??
      usuario.email_academico?.split('@')[0] ??
      usuario.email_google_classroom?.split('@')[0] ??
      usuario.identificacao;
    const matricula = usuario.vinculo?.matricula;

    if (login) {
      const admin = await this.adminRepo.findOne({
        where: { login, ativo: true },
      });
      if (admin) {
        this.logger.log(
          `Login SUAP OK (admin): ${login} (admin id ${admin.id})`,
        );
        const jwt = await this.jwtService.signAsync({
          sub: admin.id,
          login: admin.login,
          perfil: admin.perfil,
        });
        return {
          accessToken: jwt,
          user: {
            id: admin.id,
            nome: admin.nome,
            login: admin.login,
            perfil: admin.perfil,
          },
        };
      }
    }

    if (matricula) {
      const solicitante = await this.solicitanteRepo.findOne({
        where: { matricula, ativo: true },
      });
      if (solicitante) {
        this.logger.log(
          `Login SUAP OK (solicitante): ${matricula} (solicitante id ${solicitante.id})`,
        );
        const jwt = await this.jwtService.signAsync({
          sub: solicitante.id,
          login: solicitante.matricula,
          perfil: PerfilAdministrador.SOLICITANTE,
        });
        return {
          accessToken: jwt,
          user: {
            id: solicitante.id,
            nome: solicitante.nome,
            matricula: solicitante.matricula,
            perfil: PerfilAdministrador.SOLICITANTE,
          },
        };
      }
    }

    this.logger.warn(
      `Login SUAP sem cadastro: login=${login}, matricula=${matricula}`,
    );
    throw new SemPermissaoException(
      'Usuário não está cadastrado como administrador ou solicitante ativo.',
    );
  }

  async perfil(userId: number, perfil: string) {
    if (perfil === 'SOLICITANTE') {
      const solicitante = await this.solicitanteRepo.findOne({
        where: { id: userId },
      });
      if (!solicitante || !solicitante.ativo) {
        throw new SemPermissaoException();
      }
      return {
        id: solicitante.id,
        nome: solicitante.nome,
        matricula: solicitante.matricula,
        perfil: PerfilAdministrador.SOLICITANTE,
      };
    }
    const admin = await this.adminRepo.findOne({ where: { id: userId } });
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
