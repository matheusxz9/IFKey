import { Test, TestingModule } from '@nestjs/testing';
import { SolicitantesService } from './solicitantes.service';

describe('SolicitantesService', () => {
  let service: SolicitantesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SolicitantesService],
    }).compile();

    service = module.get<SolicitantesService>(SolicitantesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
