import { ExecutionContext } from '@nestjs/common';
import { DemoReadOnlyGuard } from './demo-readonly.guard';
import { SemPermissaoException } from '../common/exceptions/app.exception';

function contexto(
  user: { login?: string; matricula?: string } | undefined,
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('DemoReadOnlyGuard', () => {
  const guard = new DemoReadOnlyGuard();

  it('libera administradores reais', () => {
    expect(guard.canActivate(contexto({ login: '20251038060021' }))).toBe(true);
  });

  it('libera solicitantes reais', () => {
    expect(guard.canActivate(contexto({ matricula: '20251038060031' }))).toBe(
      true,
    );
  });

  it('bloqueia administrador demo', () => {
    expect(() => guard.canActivate(contexto({ login: 'demo.admin' }))).toThrow(
      SemPermissaoException,
    );
  });

  it('bloqueia gestor demo', () => {
    expect(() => guard.canActivate(contexto({ login: 'Demo.Gestor' }))).toThrow(
      SemPermissaoException,
    );
  });

  it('bloqueia solicitante demo', () => {
    expect(() =>
      guard.canActivate(contexto({ matricula: 'demo.solicitante' })),
    ).toThrow(SemPermissaoException);
  });
});
