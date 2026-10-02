// Jest setup file to mock ESM-only modules that can't be loaded in CommonJS test environment

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: jest.fn((classRef) => classRef),
  PickType: jest.fn((classRef, keys) => classRef),
  OmitType: jest.fn((classRef, keys) => classRef),
  IntersectionType: jest.fn((...classRefs) => classRefs[0]),
}));

jest.mock('@nestjs/swagger', () => ({
  ApiTags: jest.fn(() => (target) => target),
  ApiProperty: jest.fn(() => (target, key) => {}),
  ApiPropertyOptional: jest.fn(() => (target, key) => {}),
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

jest.mock('@nestjs/jwt', () => ({
  JwtService: jest.fn().mockImplementation(() => ({
    signAsync: jest.fn().mockResolvedValue('mock-token'),
    verify: jest.fn().mockReturnValue({ sub: 1, login: 'test', perfil: 'ADMINISTRADOR' }),
  })),
  JwtModule: {
    registerAsync: jest.fn(),
    register: jest.fn(),
  },
}));