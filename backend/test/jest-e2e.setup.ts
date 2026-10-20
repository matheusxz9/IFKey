// Setup dos testes e2e: mocka apenas os módulos ESM-only problemáticos.
// Para o @nestjs/jwt fornecemos uma implementação real sobre o `jsonwebtoken`
// (CJS), porque o AppModule precisa de um JwtModule/JwtService funcional
// (diferente dos testes unitários, que não montam o grafo de módulos).

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: jest.fn((classRef) => classRef),
  PickType: jest.fn((classRef) => classRef),
  OmitType: jest.fn((classRef) => classRef),
  IntersectionType: jest.fn((...classRefs) => classRefs[0]),
}));

jest.mock('@nestjs/swagger', () => ({
  ApiTags: jest.fn(() => (target) => target),
  ApiProperty: jest.fn(() => () => {}),
  ApiPropertyOptional: jest.fn(() => () => {}),
  ApiResponse: jest.fn(),
  ApiBearerAuth: jest.fn(),
  ApiOperation: jest.fn(),
  ApiParam: jest.fn(),
  ApiQuery: jest.fn(),
  ApiBody: jest.fn(),
  ApiConsumes: jest.fn(),
  ApiProduces: jest.fn(),
  ApiHeader: jest.fn(),
  ApiHeaders: jest.fn(),
  ApiExtraModels: jest.fn(),
  ApiExcludeEndpoint: jest.fn(),
  ApiExcludeController: jest.fn(),
  ApiDeprecated: jest.fn(),
  ApiSecurity: jest.fn(),
  ApiOAuth2: jest.fn(),
  ApiExtension: jest.fn(),
  ApiSchema: jest.fn(),
}));

jest.mock('@nestjs/jwt', () => {
  const jwt = require('jsonwebtoken');
  const segredo = process.env.JWT_SECRET || 'dev-secret-para-teste';

  class JwtService {
    sign(payload, options) {
      return jwt.sign(payload, segredo, options);
    }

    signAsync(payload, options) {
      return Promise.resolve(this.sign(payload, options));
    }

    verify(token, options) {
      return jwt.verify(token, segredo, options);
    }
  }

  class JwtModule {
    static register() {
      return {
        module: JwtModule,
        providers: [{ provide: JwtService, useClass: JwtService }],
        exports: [JwtService],
      };
    }

    static registerAsync() {
      return JwtModule.register();
    }
  }

  return { JwtService, JwtModule };
});
