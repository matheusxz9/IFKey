import { Test, TestingModule } from '@nestjs/testing';
import { AdministradoresController } from './administradores.controller';

describe('AdministradoresController', () => {
  let controller: AdministradoresController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdministradoresController],
    }).compile();

    controller = module.get<AdministradoresController>(AdministradoresController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
