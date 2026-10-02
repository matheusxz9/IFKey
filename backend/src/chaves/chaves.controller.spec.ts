import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChavesController } from './chaves.controller';
import { ChavesService } from './chaves.service';
import { Chave } from './chave.entity';
import { Emprestimo } from '../emprestimos/emprestimo.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

describe('ChavesController', () => {
  let controller: ChavesController;

  const mockChavesService = {
    listar: jest.fn(),
    buscar: jest.fn(),
    criar: jest.fn(),
    atualizar: jest.fn(),
    inativar: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChavesController],
      providers: [
        { provide: ChavesService, useValue: mockChavesService },
        { provide: getRepositoryToken(Chave), useValue: {} },
        { provide: getRepositoryToken(Emprestimo), useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ChavesController>(ChavesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
