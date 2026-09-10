import { Test, TestingModule } from '@nestjs/testing';
import { SolicitantesController } from './solicitantes.controller';

describe('SolicitantesController', () => {
  let controller: SolicitantesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SolicitantesController],
    }).compile();

    controller = module.get<SolicitantesController>(SolicitantesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
