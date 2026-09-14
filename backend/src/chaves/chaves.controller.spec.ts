import { Test, TestingModule } from '@nestjs/testing';
import { ChavesController } from './chaves.controller';
import { ChavesService } from './chaves.service';

describe('ChavesController', () => {
  let controller: ChavesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChavesController],
      providers: [ChavesService],
    }).compile();

    controller = module.get<ChavesController>(ChavesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
