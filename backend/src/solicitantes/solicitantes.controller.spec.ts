import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SolicitantesController } from './solicitantes.controller';
import { SolicitantesService } from './solicitantes.service';
import { Solicitante } from './solicitante.entity';
import { Emprestimo } from '../emprestimos/emprestimo.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

describe('SolicitantesController', () => {
  let controller: SolicitantesController;

  const mockSolicitantesService = {
    listar: jest.fn(),
    buscar: jest.fn(),
    criar: jest.fn(),
    atualizar: jest.fn(),
    inativar: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SolicitantesController],
      providers: [
        { provide: SolicitantesService, useValue: mockSolicitantesService },
        { provide: getRepositoryToken(Solicitante), useValue: {} },
        { provide: getRepositoryToken(Emprestimo), useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SolicitantesController>(SolicitantesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
