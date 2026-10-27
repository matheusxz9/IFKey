import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { SuapService, UsuarioSuap } from './suap.service';
import { Administrador } from '../administradores/administrador.entity';
import { Solicitante } from '../solicitantes/solicitante.entity';
import { RefreshToken } from './refresh-token.entity';
import {
  RefreshTokenReutilizadoException,
  SemPermissaoException,
} from '../common/exceptions/app.exception';
import { PerfilAdministrador } from '../common/enums/perfil-administrador.enum';

export interface UsuarioAutenticado {
  id: number;
  nome: string;
  login?: string;
  matricula?: string;
  perfil: string;
  tipo: 'admin' | 'solicitante';
}

interface UsuarioParaToken {
  id: number;
  nome: string;
  login: string;
  perfil: string;
  tipo: 'admin' | 'solicitante';
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // Evita revogar a família quando duas renovações válidas chegam quase juntas
  // (por exemplo, abas concorrentes). Fora da janela, a reutilização indica
  // vazamento do token.
  private static readonly REFRESH_REUSE_GRACE_MS = 10_000;

  constructor(
    private readonly suapService: SuapService,
    private readonly jwtService: JwtService,
    @InjectRepository(Administrador)
    private readonly adminRepo: Repository<Administrador>,
    @InjectRepository(Solicitante)
    private readonly solicitanteRepo: Repository<Solicitante>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  private generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private identificadores(usuario: UsuarioSuap): string[] {
    const candidatos = new Set<string>();
    const adicionar = (valor?: string) => {
      const limpo = valor?.trim();
      if (limpo) candidatos.add(limpo);
    };
    // A SUAP expõe a matrícula tanto no nível raiz quanto em `vinculo`,
    // e o usuário (IFRN-id) em `identificacao`. Usamos todos como possíveis
    // identificadores, pois o formato varia entre aluno e servidor.
    adicionar(usuario.vinculo?.matricula);
    adicionar(usuario.matricula);
    adicionar(usuario.identificacao);
    adicionar(usuario.vinculo?.login);
    adicionar(usuario.email?.split('@')[0]);
    adicionar(usuario.email_preferencial?.split('@')[0]);
    adicionar(usuario.email_academico?.split('@')[0]);
    adicionar(usuario.email_google_classroom?.split('@')[0]);
    adicionar(usuario.email_secundario?.split('@')[0]);
    return [...candidatos];
  }

  async loginSuap(code: string) {
    const accessToken = await this.suapService.trocarCodePorToken(code);
    const usuario = await this.suapService.buscarUsuario(accessToken);
    const candidatos = this.identificadores(usuario);

    if (candidatos.length) {
      const admin = await this.adminRepo.findOne({
        where: { login: In(candidatos), ativo: true },
      });
      if (admin) {
        this.logger.log(
          `Login SUAP OK (admin): ${admin.login} (admin id ${admin.id})`,
        );
        return this.generateTokens(
          admin.id,
          admin.login,
          admin.perfil,
          'admin',
          admin.nome,
        );
      }

      const solicitante = await this.solicitanteRepo.findOne({
        where: { matricula: In(candidatos), ativo: true },
      });
      if (solicitante) {
        this.logger.log(
          `Login SUAP OK (solicitante): ${solicitante.matricula} (solicitante id ${solicitante.id})`,
        );
        return this.generateTokens(
          solicitante.id,
          solicitante.matricula,
          PerfilAdministrador.SOLICITANTE,
          'solicitante',
          solicitante.nome,
        );
      }
    }

    this.logger.warn(
      `Login SUAP sem cadastro: identificadores=[${candidatos.join(', ')}]`,
    );
    throw new SemPermissaoException(
      'Usuário não está cadastrado como administrador ou solicitante ativo.',
    );
  }

  private async generateTokens(
    userId: number,
    login: string,
    perfil: string,
    userType: 'admin' | 'solicitante',
    nome?: string,
    familyId: string = crypto.randomUUID(),
    manager?: EntityManager,
  ) {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, login, perfil },
      { expiresIn: '15m' },
    );

    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const refreshTokenRepo = manager
      ? manager.getRepository(RefreshToken)
      : this.refreshTokenRepo;

    await refreshTokenRepo.save({
      tokenHash: refreshTokenHash,
      userId,
      userType,
      familyId,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: userId,
        nome: nome ?? login,
        tipo: userType,
        login: userType === 'admin' ? login : undefined,
        matricula: userType === 'solicitante' ? login : undefined,
        perfil,
      },
    };
  }

  async refreshTokens(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const estado: { motivo: 'invalido' | 'reutilizado' | 'inativo' } = {
      motivo: 'invalido',
    };

    const tokens = await this.refreshTokenRepo.manager.transaction(
      async (manager) => {
        const repo = manager.getRepository(RefreshToken);
        const stored = await repo.findOne({
          where: { tokenHash },
          lock: { mode: 'pessimistic_write' },
        });

        if (!stored) return null;

        if (stored.revoked) {
          const revokedAt = stored.revokedAt?.getTime() ?? 0;
          const dentroDaJanela =
            Date.now() - revokedAt < AuthService.REFRESH_REUSE_GRACE_MS;

          if (!dentroDaJanela) {
            estado.motivo = 'reutilizado';
            await this.revogarFamilia(manager, stored.familyId);
          }
          return null;
        }

        if (stored.expiresAt < new Date()) return null;

        const usuario = await this.buscarUsuarioAtivo(manager, stored);
        if (!usuario) {
          estado.motivo = 'inativo';
          await this.revogarFamilia(manager, stored.familyId);
          return null;
        }

        stored.revoked = true;
        stored.revokedAt = new Date();
        await repo.save(stored);

        return this.generateTokens(
          usuario.id,
          usuario.login,
          usuario.perfil,
          usuario.tipo,
          usuario.nome,
          stored.familyId,
          manager,
        );
      },
    );

    if (tokens) return tokens;

    if (estado.motivo === 'reutilizado') {
      throw new RefreshTokenReutilizadoException();
    }
    if (estado.motivo === 'inativo') {
      throw new SemPermissaoException('Usuário não encontrado.');
    }
    throw new SemPermissaoException('Refresh token inválido ou expirado.');
  }

  private async buscarUsuarioAtivo(
    manager: EntityManager,
    stored: RefreshToken,
  ): Promise<UsuarioParaToken | null> {
    if (stored.userType === 'admin') {
      const admin = await manager
        .getRepository(Administrador)
        .findOne({ where: { id: stored.userId, ativo: true } });
      if (!admin) return null;
      return {
        id: admin.id,
        nome: admin.nome,
        login: admin.login,
        perfil: admin.perfil,
        tipo: 'admin',
      };
    }

    const solicitante = await manager
      .getRepository(Solicitante)
      .findOne({ where: { id: stored.userId, ativo: true } });
    if (!solicitante) return null;
    return {
      id: solicitante.id,
      nome: solicitante.nome,
      login: solicitante.matricula,
      perfil: PerfilAdministrador.SOLICITANTE,
      tipo: 'solicitante',
    };
  }

  private async revogarFamilia(
    manager: EntityManager,
    familyId: string,
  ): Promise<void> {
    await manager
      .getRepository(RefreshToken)
      .update(
        { familyId, revoked: false },
        { revoked: true, revokedAt: new Date() },
      );
  }

  async revokeRefreshToken(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.refreshTokenRepo.findOne({
      where: { tokenHash },
    });
    if (!stored) return;

    await this.refreshTokenRepo.update(
      { familyId: stored.familyId, revoked: false },
      { revoked: true, revokedAt: new Date() },
    );
  }

  async perfil(userId: number, perfil: string): Promise<UsuarioAutenticado> {
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
        tipo: 'solicitante' as const,
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
      tipo: 'admin' as const,
    };
  }
}
