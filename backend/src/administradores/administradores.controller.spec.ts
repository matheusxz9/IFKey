import { Test, TestingModule } from '@nestjs/testing';
import { AdministradoresController } from './administradores.controller';
import { AdministradoresService } from './administradores.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

describe('AdministradoresController', () => {
  let controller: AdministradoresController;

  const mockAdministradoresService = {
    listar: jest.fn(),
    buscar: jest.fn(),
    criar: jest.fn(),
    atualizar: jest.fn(),
    inativar: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdministradoresController],
      providers: [
        {
          provide: AdministradoresService,
          useValue: mockAdministradoresService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdministradoresController>(
      AdministradoresController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
