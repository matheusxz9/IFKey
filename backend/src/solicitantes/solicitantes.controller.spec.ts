import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SolicitantesController } from './solicitantes.controller';
import { SolicitantesService } from './solicitantes.service';
import { Solicitante } from './solicitante.entity';

describe('SolicitantesController', () => {
  let controller: SolicitantesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SolicitantesController],
      providers: [
        SolicitantesService,
        { provide: getRepositoryToken(Solicitante), useValue: {} },
      ],
    }).compile();

    controller = module.get<SolicitantesController>(SolicitantesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
