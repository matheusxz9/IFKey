import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdministradoresService } from './administradores.service';
import { Administrador } from './administrador.entity';
import { Solicitante } from '../solicitantes/solicitante.entity';
import { NaoEncontradoException } from '../common/exceptions/app.exception';

describe('AdministradoresService', () => {
  let service: AdministradoresService;
  let repo: {
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    getManyAndCount: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      createQueryBuilder: jest.fn().mockReturnThis(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      getManyAndCount: jest.fn(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdministradoresService,
        {
          provide: getRepositoryToken(Administrador),
          useValue: repo,
        },
        {
          provide: getRepositoryToken(Solicitante),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<AdministradoresService>(AdministradoresService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('lança NAO_ENCONTRADO ao buscar administrador inexistente', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.buscar(999)).rejects.toBeInstanceOf(
      NaoEncontradoException,
    );
  });
});
