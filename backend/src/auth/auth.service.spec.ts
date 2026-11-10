import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { SuapService } from './suap.service';
import { Administrador } from '../administradores/administrador.entity';
import { Solicitante } from '../solicitantes/solicitante.entity';
import { RefreshToken } from './refresh-token.entity';
import { SemPermissaoException } from '../common/exceptions/app.exception';
import { CodigoErro } from '../common/enums/codigo-erro.enum';

describe('AuthService.loginSuap', () => {
  let service: AuthService;

  const suapService = {
    trocarCodePorToken: jest.fn(),
    buscarUsuario: jest.fn(),
  };
  const jwtService = { signAsync: jest.fn().mockResolvedValue('access-token') };
  const adminRepo = { findOne: jest.fn() };
  const solicitanteRepo = { findOne: jest.fn() };
  const refreshTokenRepo = { save: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    jest.clearAllMocks();
    suapService.trocarCodePorToken.mockResolvedValue('suap-token');
    jwtService.signAsync.mockResolvedValue('access-token');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: SuapService, useValue: suapService },
        { provide: JwtService, useValue: jwtService },
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

  it('resolve solicitante pela matrícula do nível raiz (sem `vinculo`)', async () => {
    suapService.buscarUsuario.mockResolvedValue({
      identificacao: 'iago.matheus',
      matricula: '20251038060031',
      tipo_vinculo: 'Servidor',
    });
    adminRepo.findOne.mockResolvedValue(null);
    solicitanteRepo.findOne.mockResolvedValue({
      id: 7,
      nome: 'Iago',
      matricula: '20251038060031',
    });

    const resultado = await service.loginSuap('code');

    expect(solicitanteRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ativo: true }),
      }),
    );
    expect(resultado.user).toMatchObject({
      id: 7,
      tipo: 'solicitante',
      perfil: 'SOLICITANTE',
    });
  });

  it('resolve solicitante pela matrícula dentro de `vinculo`', async () => {
    suapService.buscarUsuario.mockResolvedValue({
      identificacao: 'aluno.teste',
      vinculo: { matricula: '20251038060044' },
    });
    adminRepo.findOne.mockResolvedValue(null);
    solicitanteRepo.findOne.mockResolvedValue({
      id: 9,
      nome: 'Aluno',
      matricula: '20251038060044',
    });

    const resultado = await service.loginSuap('code');

    expect(resultado.user).toMatchObject({ id: 9, tipo: 'solicitante' });
  });

  it('resolve administrador pelo login (identificacao)', async () => {
    suapService.buscarUsuario.mockResolvedValue({ identificacao: 'matheus' });
    adminRepo.findOne.mockResolvedValue({
      id: 1,
      login: 'matheus',
      perfil: 'ADMINISTRADOR',
      nome: 'Matheus',
    });

    const resultado = await service.loginSuap('code');

    expect(resultado.user).toMatchObject({
      id: 1,
      tipo: 'admin',
      nome: 'Matheus',
    });
  });

  it('resolve administrador pelo prefixo do e-mail pessoal (`email`)', async () => {
    suapService.buscarUsuario.mockResolvedValue({
      identificacao: '20251038060035',
      email: 'pedro@gmail.com',
    });
    adminRepo.findOne.mockResolvedValue({
      id: 2,
      login: 'pedro',
      perfil: 'ADMINISTRADOR',
      nome: 'Pedro',
    });

    const resultado = await service.loginSuap('code');

    expect(resultado.user).toMatchObject({
      id: 2,
      tipo: 'admin',
      login: 'pedro',
    });
  });

  it('resolve administrador pelo prefixo de `email_preferencial`', async () => {
    suapService.buscarUsuario.mockResolvedValue({
      email_preferencial: 'pedro.fonseca1@ifrn.edu.br',
    });
    adminRepo.findOne.mockResolvedValue({
      id: 3,
      login: 'pedro.fonseca1',
      perfil: 'ADMINISTRADOR',
      nome: 'Pedro Eduardo',
    });

    const resultado = await service.loginSuap('code');

    expect(resultado.user).toMatchObject({
      id: 3,
      tipo: 'admin',
      login: 'pedro.fonseca1',
      nome: 'Pedro Eduardo',
    });
  });

  it('lança SemPermissao quando não há cadastro', async () => {
    suapService.buscarUsuario.mockResolvedValue({
      identificacao: 'ninguem',
      matricula: '000',
    });
    adminRepo.findOne.mockResolvedValue(null);
    solicitanteRepo.findOne.mockResolvedValue(null);

    await expect(service.loginSuap('code')).rejects.toBeInstanceOf(
      SemPermissaoException,
    );
  });
});

describe('AuthService.refreshTokens', () => {
  let service: AuthService;

  const jwtService = { signAsync: jest.fn() };
  const adminRepo = { findOne: jest.fn() };
  const solicitanteRepo = { findOne: jest.fn() };
  const refreshTokenRepo = {
    manager: { transaction: jest.fn() },
    save: jest.fn(),
  };

  const refreshTokenManagerRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const adminManagerRepo = { findOne: jest.fn() };
  const solicitanteManagerRepo = { findOne: jest.fn() };

  const manager = {
    query: jest.fn(),
    getRepository: jest.fn((entidade: unknown) => {
      if (entidade === RefreshToken) return refreshTokenManagerRepo;
      if (entidade === Administrador) return adminManagerRepo;
      if (entidade === Solicitante) return solicitanteManagerRepo;
      throw new Error('Repositório não mockado.');
    }),
  };

  const familyId = 'familia-refresh';

  function tokenArmazenado(
    overrides: Partial<RefreshToken> = {},
  ): RefreshToken {
    return {
      id: 'token-antigo',
      tokenHash: 'hash-antigo',
      userId: 1,
      userType: 'admin',
      familyId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      revoked: false,
      revokedAt: null,
      ...overrides,
    };
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    refreshTokenManagerRepo.findOne.mockReset();
    adminManagerRepo.findOne.mockReset();

    jwtService.signAsync.mockResolvedValue('novo-access-token');
    refreshTokenManagerRepo.save.mockResolvedValue(undefined);
    refreshTokenManagerRepo.update.mockResolvedValue(undefined);
    refreshTokenManagerRepo.delete.mockResolvedValue(undefined);
    adminManagerRepo.findOne.mockResolvedValue({
      id: 1,
      nome: 'Admin Teste',
      login: 'admin.teste',
      perfil: 'ADMINISTRADOR',
    });
    solicitanteManagerRepo.findOne.mockResolvedValue(null);
    refreshTokenRepo.manager.transaction.mockImplementation(
      async (callback: (m: typeof manager) => Promise<unknown>) =>
        callback(manager),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: SuapService,
          useValue: { trocarCodePorToken: jest.fn(), buscarUsuario: jest.fn() },
        },
        { provide: JwtService, useValue: jwtService },
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

  it('rotaciona um refresh token válido mantendo a família', async () => {
    const stored = tokenArmazenado();
    refreshTokenManagerRepo.findOne
      .mockResolvedValueOnce(stored)
      .mockResolvedValueOnce(stored);

    const resultado = await service.refreshTokens('refresh-valido');

    expect(resultado).toMatchObject({
      accessToken: 'novo-access-token',
      refreshToken: expect.any(String),
      user: {
        id: 1,
        nome: 'Admin Teste',
        tipo: 'admin',
        login: 'admin.teste',
        perfil: 'ADMINISTRADOR',
      },
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      { sub: 1, login: 'admin.teste', perfil: 'ADMINISTRADOR' },
      { expiresIn: '15m' },
    );
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('pg_advisory_xact_lock'),
      [familyId],
    );
    expect(stored.revoked).toBe(true);
    expect(stored.revokedAt).toBeInstanceOf(Date);
    expect(refreshTokenManagerRepo.save).toHaveBeenNthCalledWith(1, stored);
    expect(refreshTokenManagerRepo.save).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        userId: 1,
        userType: 'admin',
        familyId,
        expiresAt: expect.any(Date),
      }),
    );
    expect(refreshTokenManagerRepo.delete).toHaveBeenCalledWith(
      expect.objectContaining({ familyId }),
    );
    expect(refreshTokenManagerRepo.update).not.toHaveBeenCalled();
  });

  it('revoga a família ao detectar reutilização fora da janela de 10 s', async () => {
    const stored = tokenArmazenado({
      revoked: true,
      revokedAt: new Date(Date.now() - 11_000),
    });
    refreshTokenManagerRepo.findOne
      .mockResolvedValueOnce(stored)
      .mockResolvedValueOnce(stored);

    await expect(
      service.refreshTokens('refresh-reutilizado'),
    ).rejects.toMatchObject({
      code: CodigoErro.REFRESH_TOKEN_REUTILIZADO,
    });

    expect(refreshTokenManagerRepo.update).toHaveBeenCalledWith(
      { familyId, revoked: false },
      expect.objectContaining({ revoked: true, revokedAt: expect.any(Date) }),
    );
    expect(refreshTokenManagerRepo.save).not.toHaveBeenCalled();
  });

  it('não revoga a família quando a reutilização ocorre dentro da janela', async () => {
    const stored = tokenArmazenado({
      revoked: true,
      revokedAt: new Date(Date.now() - 5_000),
    });
    refreshTokenManagerRepo.findOne
      .mockResolvedValueOnce(stored)
      .mockResolvedValueOnce(stored);

    await expect(
      service.refreshTokens('refresh-recente'),
    ).rejects.toMatchObject({
      code: CodigoErro.SEM_PERMISSAO,
      message: 'Refresh token inválido ou expirado.',
    });

    expect(refreshTokenManagerRepo.update).not.toHaveBeenCalled();
    expect(refreshTokenManagerRepo.save).not.toHaveBeenCalled();
  });

  it('rejeita token inexistente como inválido', async () => {
    refreshTokenManagerRepo.findOne.mockResolvedValueOnce(null);

    await expect(
      service.refreshTokens('refresh-desconhecido'),
    ).rejects.toMatchObject({
      code: CodigoErro.SEM_PERMISSAO,
      message: 'Refresh token inválido ou expirado.',
    });

    expect(manager.query).not.toHaveBeenCalled();
  });

  it('revoga a família quando o usuário está inativo', async () => {
    const stored = tokenArmazenado();
    refreshTokenManagerRepo.findOne
      .mockResolvedValueOnce(stored)
      .mockResolvedValueOnce(stored);
    adminManagerRepo.findOne.mockResolvedValue(null);

    await expect(
      service.refreshTokens('refresh-inativo'),
    ).rejects.toMatchObject({
      code: CodigoErro.SEM_PERMISSAO,
      message: 'Usuário não encontrado.',
    });

    expect(refreshTokenManagerRepo.update).toHaveBeenCalledWith(
      { familyId, revoked: false },
      expect.objectContaining({ revoked: true, revokedAt: expect.any(Date) }),
    );
    expect(refreshTokenManagerRepo.save).not.toHaveBeenCalled();
  });
});
