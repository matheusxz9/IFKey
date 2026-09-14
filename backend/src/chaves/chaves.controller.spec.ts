import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChavesController } from './chaves.controller';
import { ChavesService } from './chaves.service';
import { Chave } from './chave.entity';

describe('ChavesController', () => {
  let controller: ChavesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChavesController],
      providers: [
        ChavesService,
        { provide: getRepositoryToken(Chave), useValue: {} },
      ],
    }).compile();

    controller = module.get<ChavesController>(ChavesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
