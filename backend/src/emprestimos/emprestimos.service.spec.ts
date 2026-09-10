import { Test, TestingModule } from '@nestjs/testing';
import { EmprestimosService } from './emprestimos.service';

describe('EmprestimosService', () => {
  let service: EmprestimosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmprestimosService],
    }).compile();

    service = module.get<EmprestimosService>(EmprestimosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
