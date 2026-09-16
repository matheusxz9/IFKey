import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Emprestimo } from './emprestimo.entity';
import { Chave } from '../chaves/chave.entity';
import { CriarEmprestimoDto } from './dto/criar-emprestimo.dto';
import { DevolverEmprestimoDto } from './dto/devolver-emprestimo.dto';
import { ListarEmprestimosQueryDto } from './dto/listar-emprestimos.query.dto';
import { HistoricoEmprestimosQueryDto } from './dto/historico-emprestimos.query.dto';
import { ChavesService } from '../chaves/chaves.service';
import { SolicitantesService } from '../solicitantes/solicitantes.service';
import {
  ChaveIndisponivelException,
  EmprestimoJaDevolvidoException,
  NaoEncontradoException,
  SolicitanteInativoException,
} from '../common/exceptions/app.exception';
import { StatusChave } from '../common/enums/status-chave.enum';
import { StatusEmprestimo } from '../common/enums/status-emprestimo.enum';

@Injectable()
export class EmprestimosService {
  constructor(
    @InjectRepository(Emprestimo)
    private readonly repo: Repository<Emprestimo>,
    private readonly chavesService: ChavesService,
    private readonly solicitantesService: SolicitantesService,
  ) {}

  async criar(dto: CriarEmprestimoDto, adminId: number) {
    const solicitante = await this.solicitantesService.buscarMesmoInativo(
      dto.solicitanteId,
    );
    if (!solicitante.ativo) {
      throw new SolicitanteInativoException();
    }
    const chave = await this.chavesService.buscarMesmoInativo(dto.chaveId);
    if (!chave.ativo || chave.status !== StatusChave.DISPONIVEL) {
      throw new ChaveIndisponivelException();
    }
    const emprestimo = this.repo.create({
      solicitante: { id: dto.solicitanteId },
      chave: { id: dto.chaveId } as Chave,
      administrador: { id: adminId },
      status: StatusEmprestimo.EMPRESTADA,
      observacoes: dto.observacoes,
    });
    await this.repo.manager.transaction(async (manager) => {
      const salvo = await manager.save(emprestimo);
      await manager.update(Chave, dto.chaveId, {
        status: StatusChave.EMPRESTADA,
      });
      return salvo;
    });
    return this.toResponse(await this.buscarEntidade(emprestimo.id));
  }

  async devolver(id: number, dto: DevolverEmprestimoDto) {
    const emprestimo = await this.buscarEntidade(id);
    if (emprestimo.status === StatusEmprestimo.DEVOLVIDA) {
      throw new EmprestimoJaDevolvidoException();
    }
    await this.repo.manager.transaction(async (manager) => {
      await manager.update(Emprestimo, id, {
        status: StatusEmprestimo.DEVOLVIDA,
        dataHoraDevolucao: new Date(),
        ...(dto.observacoes ? { observacoes: dto.observacoes } : {}),
      });
      await manager.update(Chave, emprestimo.chave.id, {
        status: StatusChave.DISPONIVEL,
      });
    });
    return this.toResponse(await this.buscarEntidade(id));
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

  async historico(query: HistoricoEmprestimosQueryDto) {
    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.solicitante', 's')
      .leftJoinAndSelect('e.chave', 'c')
      .leftJoinAndSelect('e.administrador', 'a')
      .where('e.status = :status', { status: StatusEmprestimo.DEVOLVIDA })
      .orderBy('e.dataHoraDevolucao', 'DESC');
    const de = query.de;
    if (de) {
      qb.andWhere('e.dataHoraDevolucao >= :de', { de: new Date(de) });
    }
    const ate = query.ate;
    if (ate) {
      qb.andWhere('e.dataHoraDevolucao <= :ate', { ate: new Date(ate) });
    }
    const solicitanteId = query.solicitanteId;
    if (solicitanteId) {
      qb.andWhere('e.solicitante = :solicitanteId', { solicitanteId });
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
