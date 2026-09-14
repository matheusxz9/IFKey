import { Test, TestingModule } from '@nestjs/testing';
import { SolicitantesController } from './solicitantes.controller';
import { SolicitantesService } from './solicitantes.service';

describe('SolicitantesController', () => {
  let controller: SolicitantesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SolicitantesController],
      providers: [SolicitantesService],
    }).compile();

    controller = module.get<SolicitantesController>(SolicitantesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
