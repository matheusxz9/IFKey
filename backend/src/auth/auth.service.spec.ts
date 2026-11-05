import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { SuapService } from './suap.service';
import { Administrador } from '../administradores/administrador.entity';
import { Solicitante } from '../solicitantes/solicitante.entity';
import { RefreshToken } from './refresh-token.entity';
import { SemPermissaoException } from '../common/exceptions/app.exception';

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
