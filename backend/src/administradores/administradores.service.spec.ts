import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdministradoresService } from './administradores.service';
import { Administrador } from './administrador.entity';

describe('AdministradoresService', () => {
  let service: AdministradoresService;

  beforeEach(async () => {
    const mockRepo = {
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
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<AdministradoresService>(AdministradoresService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
