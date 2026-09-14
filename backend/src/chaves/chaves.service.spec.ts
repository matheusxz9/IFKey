import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChavesService } from './chaves.service';
import { Chave } from './chave.entity';

describe('ChavesService', () => {
  let service: ChavesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChavesService,
        { provide: getRepositoryToken(Chave), useValue: {} },
      ],
    }).compile();

    service = module.get<ChavesService>(ChavesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
