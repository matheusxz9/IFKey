import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Emprestimo } from './emprestimo.entity';
import { Chave } from '../chaves/chave.entity';
import { Solicitante } from '../solicitantes/solicitante.entity';
import { CriarEmprestimoDto } from './dto/criar-emprestimo.dto';
import { DevolverEmprestimoDto } from './dto/devolver-emprestimo.dto';
import { ListarEmprestimosQueryDto } from './dto/listar-emprestimos.query.dto';
import { HistoricoEmprestimosQueryDto } from './dto/historico-emprestimos.query.dto';
import {
  ChaveIndisponivelException,
  EmprestimoJaDevolvidoException,
  NaoEncontradoException,
  SolicitanteInativoException,
} from '../common/exceptions/app.exception';
import { StatusChave } from '../common/enums/status-chave.enum';
import { StatusEmprestimo } from '../common/enums/status-emprestimo.enum';
import { PerfilAdministrador } from '../common/enums/perfil-administrador.enum';

@Injectable()
export class EmprestimosService {
  constructor(
    @InjectRepository(Emprestimo)
    private readonly repo: Repository<Emprestimo>,
  ) {}

  async criar(dto: CriarEmprestimoDto, adminId: number, perfil: string) {
    let solicitanteId = dto.solicitanteId;
    if (perfil === 'SOLICITANTE') {
      solicitanteId = adminId;
    }
    return this.repo.manager.transaction(async (manager) => {
      const solicitanteRepo = manager.getRepository(Solicitante);
      const chaveRepo = manager.getRepository(Chave);
      const emprestimoRepo = manager.getRepository(Emprestimo);

      const solicitante = await solicitanteRepo.findOne({
        where: { id: solicitanteId },
      });
      if (!solicitante) {
        throw new NaoEncontradoException('Solicitante não encontrado.');
      }
      if (!solicitante.ativo) {
        throw new SolicitanteInativoException();
      }

      const chave = await chaveRepo.findOne({
        where: { id: dto.chaveId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!chave) {
        throw new NaoEncontradoException('Chave não encontrada.');
      }
      if (!chave.ativo || chave.status !== StatusChave.DISPONIVEL) {
        throw new ChaveIndisponivelException();
      }

      const emprestimo = emprestimoRepo.create({
        solicitante: { id: solicitanteId },
        chave: { id: dto.chaveId },
        administrador: { id: adminId },
        status: StatusEmprestimo.EMPRESTADA,
        observacoes: dto.observacoes,
      });
      const salvo = await emprestimoRepo.save(emprestimo);

      await chaveRepo.update(dto.chaveId, {
        status: StatusChave.EMPRESTADA,
      });

      return this.toResponse(
        await this.buscarEntidadeComManager(manager, salvo.id),
      );
    });
  }

  async devolver(id: number, dto: DevolverEmprestimoDto) {
    return this.repo.manager.transaction(async (manager) => {
      const emprestimoRepo = manager.getRepository(Emprestimo);
      const chaveRepo = manager.getRepository(Chave);

      const emprestimo = await emprestimoRepo.findOne({
        where: { id },
        relations: { chave: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!emprestimo) {
        throw new NaoEncontradoException('Empréstimo não encontrado.');
      }
      if (emprestimo.status === StatusEmprestimo.DEVOLVIDA) {
        throw new EmprestimoJaDevolvidoException();
      }

      await emprestimoRepo.update(id, {
        status: StatusEmprestimo.DEVOLVIDA,
        dataHoraDevolucao: new Date(),
        ...(dto.observacoes ? { observacoes: dto.observacoes } : {}),
      });

      await chaveRepo.update(emprestimo.chave.id, {
        status: StatusChave.DISPONIVEL,
      });

      return this.toResponse(await this.buscarEntidadeComManager(manager, id));
    });
  }

  private async buscarEntidadeComManager(
    manager: EntityManager,
    id: number,
  ): Promise<Emprestimo> {
    const emprestimo = await manager.findOne(Emprestimo, {
      where: { id },
      relations: {
        solicitante: true,
        chave: true,
        administrador: true,
      },
    });
    if (!emprestimo) {
      throw new NaoEncontradoException('Empréstimo não encontrado.');
    }
    return emprestimo;
  }

  async listar(query: ListarEmprestimosQueryDto) {
    const [data, total] = await this.repo.findAndCount({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.solicitanteId
          ? { solicitante: { id: query.solicitanteId } }
          : {}),
        ...(query.chaveId ? { chave: { id: query.chaveId } } : {}),
      },
      relations: {
        solicitante: true,
        chave: true,
        administrador: true,
      },
      order: { dataHoraEmprestimo: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return {
      data: data.map((e) => this.toResponse(e)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async historico(
    query: HistoricoEmprestimosQueryDto,
    user?: { id: number; perfil: string },
  ) {
    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.solicitante', 's')
      .leftJoinAndSelect('e.chave', 'c')
      .leftJoinAndSelect('e.administrador', 'a')
      .addSelect(
        `CASE WHEN e.status = '${StatusEmprestimo.EMPRESTADA}' THEN 0 ELSE 1 END`,
        'ordem_status',
      )
      .orderBy('ordem_status', 'ASC')
      .addOrderBy('e.dataHoraEmprestimo', 'DESC');

    if (user?.perfil === PerfilAdministrador.SOLICITANTE) {
      qb.andWhere('e.solicitante = :solicitanteId', {
        solicitanteId: user.id,
      });
    } else {
      const solicitanteId = query.solicitanteId;
      if (solicitanteId) {
        qb.andWhere('e.solicitante = :solicitanteId', { solicitanteId });
      }
    }

    const de = query.de;
    if (de) {
      qb.andWhere('e.dataHoraEmprestimo >= :de', { de: new Date(de) });
    }
    const ate = query.ate;
    if (ate) {
      qb.andWhere('e.dataHoraEmprestimo <= :ate', { ate: new Date(ate) });
    }
    const chaveId = query.chaveId;
    if (chaveId) {
      qb.andWhere('e.chave = :chaveId', { chaveId });
    }
    qb.skip((query.page - 1) * query.limit).take(query.limit);
    const [data, total] = await qb.getManyAndCount();
    return {
      data: data.map((e) => this.toResponse(e)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async buscar(id: number) {
    return this.toResponse(await this.buscarEntidade(id));
  }

  private async buscarEntidade(id: number): Promise<Emprestimo> {
    const emprestimo = await this.repo.findOne({
      where: { id },
      relations: {
        solicitante: true,
        chave: true,
        administrador: true,
      },
    });
    if (!emprestimo) {
      throw new NaoEncontradoException('Empréstimo não encontrado.');
    }
    return emprestimo;
  }

  private toResponse(e: Emprestimo) {
    return {
      id: e.id,
      solicitante: e.solicitante
        ? {
            id: e.solicitante.id,
            nome: e.solicitante.nome,
            matricula: e.solicitante.matricula,
            tipo: e.solicitante.tipo,
          }
        : null,
      chave: e.chave
        ? {
            id: e.chave.id,
            codigo: e.chave.codigo,
            descricao: e.chave.descricao,
          }
        : null,
      administrador: e.administrador
        ? { id: e.administrador.id, nome: e.administrador.nome }
        : null,
      dataHoraEmprestimo: e.dataHoraEmprestimo,
      dataHoraDevolucao: e.dataHoraDevolucao,
      status: e.status,
      observacoes: e.observacoes,
    };
  }
}
