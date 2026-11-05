import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';
import type { UsuarioAutenticado } from './auth.service';
import { SemPermissaoException } from '../common/exceptions/app.exception';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  const jwtService = { verify: jest.fn() };
  const authService = { perfil: jest.fn() };

  const admin: UsuarioAutenticado = {
    id: 1,
    nome: 'Admin Teste',
    login: 'admin.teste',
    perfil: 'ADMINISTRADOR',
    tipo: 'admin',
  };

  function contexto(authorization?: string) {
    const request: {
      headers: { authorization?: string };
      user?: UsuarioAutenticado;
    } = { headers: { authorization } };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
    return { context, request };
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: JwtService, useValue: jwtService },
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
  });

  it('rejeita requisição sem bearer token', async () => {
    const { context } = contexto();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejeita token inválido ou expirado', async () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('invalid token');
    });
    const { context } = contexto('Bearer token-invalido');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('carrega o usuário atual do banco e libera a requisição', async () => {
    jwtService.verify.mockReturnValue({
      sub: 1,
      login: 'admin.teste',
      perfil: 'ADMINISTRADOR',
    });
    authService.perfil.mockResolvedValue(admin);
    const { context, request } = contexto('Bearer token-valido');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authService.perfil).toHaveBeenCalledWith(1, 'ADMINISTRADOR');
    expect(request.user).toEqual(admin);
  });

  it('rejeita usuário inativado como não autenticado', async () => {
    jwtService.verify.mockReturnValue({
      sub: 1,
      login: 'admin.teste',
      perfil: 'ADMINISTRADOR',
    });
    authService.perfil.mockRejectedValue(new SemPermissaoException());
    const { context } = contexto('Bearer token-valido');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('propaga falhas inesperadas do banco sem derrubar a sessão', async () => {
    jwtService.verify.mockReturnValue({
      sub: 1,
      login: 'admin.teste',
      perfil: 'ADMINISTRADOR',
    });
    const erro = new Error('banco indisponível');
    authService.perfil.mockRejectedValue(erro);
    const { context } = contexto('Bearer token-valido');

    await expect(guard.canActivate(context)).rejects.toBe(erro);
  });
});
