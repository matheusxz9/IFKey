import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EmprestimosController } from './emprestimos.controller';
import { EmprestimosService } from './emprestimos.service';
import { Emprestimo } from './emprestimo.entity';
import { ChavesService } from '../chaves/chaves.service';
import { SolicitantesService } from '../solicitantes/solicitantes.service';

describe('EmprestimosController', () => {
  let controller: EmprestimosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmprestimosController],
      providers: [
        EmprestimosService,
        { provide: getRepositoryToken(Emprestimo), useValue: {} },
        { provide: ChavesService, useValue: {} },
        { provide: SolicitantesService, useValue: {} },
      ],
    }).compile();

    controller = module.get<EmprestimosController>(EmprestimosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
