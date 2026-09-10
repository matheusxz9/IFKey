import { Test, TestingModule } from '@nestjs/testing';
import { ChavesService } from './chaves.service';

describe('ChavesService', () => {
  let service: ChavesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChavesService],
    }).compile();

    service = module.get<ChavesService>(ChavesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
