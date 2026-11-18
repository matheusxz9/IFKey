import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SuapService } from './suap.service';
import { Administrador } from '../administradores/administrador.entity';
import { Solicitante } from '../solicitantes/solicitante.entity';
import { RefreshToken } from './refresh-token.entity';
import { SemPermissaoException } from '../common/exceptions/app.exception';
import { PerfilAdministrador } from '../common/enums/perfil-administrador.enum';

describe('AuthService.loginDemo', () => {
  let service: AuthService;
  let configService: { get: jest.Mock };

  const suapService = {
    trocarCodePorToken: jest.fn(),
    buscarUsuario: jest.fn(),
  };
  const jwtService = { signAsync: jest.fn() };
  const adminRepo = { findOne: jest.fn() };
  const solicitanteRepo = { findOne: jest.fn() };
  const refreshTokenRepo = { save: jest.fn() };

  const configuracao: Record<string, string> = {
    DEMO_LOGIN_ENABLED: 'true',
    DEMO_ADMIN_PASSWORD: 'senha-admin',
    DEMO_GESTOR_PASSWORD: 'senha-gestor',
    DEMO_SOLICITANTE_PASSWORD: 'senha-solicitante',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    configService = {
      get: jest.fn((chave: string) => configuracao[chave]),
    };
    jwtService.signAsync.mockResolvedValue('access-token');
    refreshTokenRepo.save.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: SuapService, useValue: suapService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: getRepositoryToken(Administrador), useValue: adminRepo },
        { provide: getRepositoryToken(Solicitante), useValue: solicitanteRepo },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: refreshTokenRepo,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('não autentica quando o recurso está desabilitado', async () => {
    configService.get.mockImplementation((chave: string) =>
      chave === 'DEMO_LOGIN_ENABLED' ? 'false' : configuracao[chave],
    );

    await expect(
      service.loginDemo('demo.admin', 'senha-admin'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(adminRepo.findOne).not.toHaveBeenCalled();
  });

  it('autentica o administrador demo', async () => {
    adminRepo.findOne.mockResolvedValue({
      id: 10,
      nome: 'Administrador Demo',
      login: 'demo.admin',
      perfil: PerfilAdministrador.ADMINISTRADOR,
      ativo: true,
    });

    const resultado = await service.loginDemo('demo.admin', 'senha-admin');

    expect(resultado.accessToken).toBe('access-token');
    expect(resultado.user).toMatchObject({
      id: 10,
      tipo: 'admin',
      login: 'demo.admin',
      nome: 'Administrador Demo',
      perfil: PerfilAdministrador.ADMINISTRADOR,
    });
    expect(refreshTokenRepo.save).toHaveBeenCalled();
  });

  it('autentica o gestor demo', async () => {
    adminRepo.findOne.mockResolvedValue({
      id: 11,
      nome: 'Gestor Demo',
      login: 'demo.gestor',
      perfil: PerfilAdministrador.GESTOR,
      ativo: true,
    });

    const resultado = await service.loginDemo('demo.gestor', 'senha-gestor');

    expect(resultado.user).toMatchObject({
      id: 11,
      tipo: 'admin',
      perfil: PerfilAdministrador.GESTOR,
    });
  });

  it('autentica o solicitante demo', async () => {
    solicitanteRepo.findOne.mockResolvedValue({
      id: 12,
      nome: 'Solicitante Demo',
      matricula: 'demo.solicitante',
      ativo: true,
    });

    const resultado = await service.loginDemo(
      'demo.solicitante',
      'senha-solicitante',
    );

    expect(resultado.user).toMatchObject({
      id: 12,
      tipo: 'solicitante',
      matricula: 'demo.solicitante',
      perfil: PerfilAdministrador.SOLICITANTE,
    });
    expect(adminRepo.findOne).not.toHaveBeenCalled();
  });

  it('recusa senha inválida sem consultar o banco', async () => {
    await expect(
      service.loginDemo('demo.admin', 'senha-errada'),
    ).rejects.toBeInstanceOf(SemPermissaoException);
    expect(adminRepo.findOne).not.toHaveBeenCalled();
    expect(refreshTokenRepo.save).not.toHaveBeenCalled();
  });

  it('recusa login fora dos perfis demo', async () => {
    await expect(
      service.loginDemo('matheus', 'senha-admin'),
    ).rejects.toBeInstanceOf(SemPermissaoException);
  });

  it('recusa quando o perfil demo não está cadastrado', async () => {
    adminRepo.findOne.mockResolvedValue(null);

    await expect(
      service.loginDemo('demo.admin', 'senha-admin'),
    ).rejects.toBeInstanceOf(SemPermissaoException);
  });

  it('bloqueia o perfil demo quando o recurso é desabilitado', async () => {
    configService.get.mockImplementation((chave: string) =>
      chave === 'DEMO_LOGIN_ENABLED' ? 'false' : configuracao[chave],
    );
    adminRepo.findOne.mockResolvedValue({
      id: 10,
      nome: 'Administrador Demo',
      login: 'demo.admin',
      perfil: PerfilAdministrador.ADMINISTRADOR,
      ativo: true,
    });

    await expect(
      service.perfil(10, PerfilAdministrador.ADMINISTRADOR),
    ).rejects.toBeInstanceOf(SemPermissaoException);
  });
});
