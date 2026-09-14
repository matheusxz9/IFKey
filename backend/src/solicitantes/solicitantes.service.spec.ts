import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SolicitantesService } from './solicitantes.service';
import { Solicitante } from './solicitante.entity';

describe('SolicitantesService', () => {
  let service: SolicitantesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SolicitantesService,
        { provide: getRepositoryToken(Solicitante), useValue: {} },
      ],
    }).compile();

    service = module.get<SolicitantesService>(SolicitantesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
