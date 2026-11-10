import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EmprestimosService } from './emprestimos.service';
import { Emprestimo } from './emprestimo.entity';
import { Chave } from '../chaves/chave.entity';
import { ChavesService } from '../chaves/chaves.service';
import { SolicitantesService } from '../solicitantes/solicitantes.service';
import { PerfilAdministrador } from '../common/enums/perfil-administrador.enum';
import { StatusChave } from '../common/enums/status-chave.enum';
import { StatusEmprestimo } from '../common/enums/status-emprestimo.enum';

describe('EmprestimosService', () => {
  let service: EmprestimosService;

  const emprestimoManagerRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const chaveManagerRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const manager = {
    getRepository: jest.fn((entidade: unknown) => {
      if (entidade === Emprestimo) return emprestimoManagerRepo;
      if (entidade === Chave) return chaveManagerRepo;
      throw new Error('Repositório não mockado.');
    }),
    findOne: jest.fn(),
  };
  const emprestimoRepo = {
    manager: { transaction: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    emprestimoManagerRepo.findOne.mockReset();
    chaveManagerRepo.findOne.mockReset();
    manager.findOne.mockReset();

    emprestimoManagerRepo.update.mockResolvedValue(undefined);
    chaveManagerRepo.update.mockResolvedValue(undefined);
    emprestimoRepo.manager.transaction.mockImplementation(
      async (callback: (m: typeof manager) => Promise<unknown>) =>
        callback(manager),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmprestimosService,
        { provide: getRepositoryToken(Emprestimo), useValue: emprestimoRepo },
        { provide: ChavesService, useValue: {} },
        { provide: SolicitantesService, useValue: {} },
      ],
    }).compile();

    service = module.get<EmprestimosService>(EmprestimosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('devolve o empréstimo sem refazer a busca final', async () => {
    const emprestimoTravado = { id: 1 };
    const emprestimo = {
      id: 1,
      status: StatusEmprestimo.EMPRESTADA,
      chave: { id: 2 },
      solicitante: { id: 7 },
      administrador: { id: 3, nome: 'Admin Registro' },
      observacoes: null,
      dataHoraEmprestimo: new Date('2026-01-01T10:00:00Z'),
      dataHoraDevolucao: null,
    };
    emprestimoManagerRepo.findOne
      .mockResolvedValueOnce(emprestimoTravado)
      .mockResolvedValueOnce(emprestimo);
    chaveManagerRepo.findOne.mockResolvedValue({ id: 2 });

    const resultado = await service.devolver(
      1,
      {},
      { id: 7, perfil: PerfilAdministrador.SOLICITANTE },
    );

    expect(resultado).toMatchObject({
      id: 1,
      status: StatusEmprestimo.DEVOLVIDA,
      dataHoraDevolucao: expect.any(Date),
      administrador: { id: 3, nome: 'Admin Registro' },
    });
    expect(emprestimoManagerRepo.findOne).toHaveBeenNthCalledWith(2, {
      where: { id: 1 },
      relations: { chave: true, solicitante: true, administrador: true },
    });
    expect(emprestimoManagerRepo.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        status: StatusEmprestimo.DEVOLVIDA,
        dataHoraDevolucao: expect.any(Date),
      }),
    );
    expect(chaveManagerRepo.update).toHaveBeenCalledWith(2, {
      status: StatusChave.DISPONIVEL,
    });
    expect(manager.findOne).not.toHaveBeenCalled();
  });
});
