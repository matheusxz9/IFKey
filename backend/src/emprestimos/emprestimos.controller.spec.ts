import { Test, TestingModule } from '@nestjs/testing';
import { EmprestimosController } from './emprestimos.controller';

describe('EmprestimosController', () => {
  let controller: EmprestimosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmprestimosController],
    }).compile();

    controller = module.get<EmprestimosController>(EmprestimosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
