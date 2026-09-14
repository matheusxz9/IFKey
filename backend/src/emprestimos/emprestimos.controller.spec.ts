import { Test, TestingModule } from '@nestjs/testing';
import { EmprestimosController } from './emprestimos.controller';
import { EmprestimosService } from './emprestimos.service';
import { ChavesService } from '../chaves/chaves.service';
import { SolicitantesService } from '../solicitantes/solicitantes.service';

describe('EmprestimosController', () => {
  let controller: EmprestimosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmprestimosController],
      providers: [EmprestimosService, ChavesService, SolicitantesService],
    }).compile();

    controller = module.get<EmprestimosController>(EmprestimosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
