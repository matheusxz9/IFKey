import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EmprestimosService } from './emprestimos.service';
import { Emprestimo } from './emprestimo.entity';
import { ChavesService } from '../chaves/chaves.service';
import { SolicitantesService } from '../solicitantes/solicitantes.service';

describe('EmprestimosService', () => {
  let service: EmprestimosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmprestimosService,
        { provide: getRepositoryToken(Emprestimo), useValue: {} },
        { provide: ChavesService, useValue: {} },
        { provide: SolicitantesService, useValue: {} },
      ],
    }).compile();

    service = module.get<EmprestimosService>(EmprestimosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
