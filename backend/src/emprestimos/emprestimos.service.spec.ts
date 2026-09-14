import { Test, TestingModule } from '@nestjs/testing';
import { EmprestimosService } from './emprestimos.service';
import { ChavesService } from '../chaves/chaves.service';
import { SolicitantesService } from '../solicitantes/solicitantes.service';

describe('EmprestimosService', () => {
  let service: EmprestimosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmprestimosService, ChavesService, SolicitantesService],
    }).compile();

    service = module.get<EmprestimosService>(EmprestimosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
