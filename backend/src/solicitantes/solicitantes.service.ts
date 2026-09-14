import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Solicitante } from './solicitante.entity';
import { CriarSolicitanteDto } from './dto/criar-solicitante.dto';
import { AtualizarSolicitanteDto } from './dto/atualizar-solicitante.dto';
import { ListarSolicitantesQueryDto } from './dto/listar-solicitantes.query.dto';
import {
  MatriculaDuplicadaException,
  NaoEncontradoException,
} from '../common/exceptions/app.exception';

@Injectable()
export class SolicitantesService {
  constructor(
    @InjectRepository(Solicitante)
    private readonly repo: Repository<Solicitante>,
  ) {}

  async listar(query: ListarSolicitantesQueryDto) {
    const qb = this.repo.createQueryBuilder('s');
    qb.where('s.ativo = :ativo', { ativo: query.ativo ?? true });
    const nome = query.nome;
    if (nome) {
      qb.andWhere('LOWER(s.nome) LIKE LOWER(:nome)', { nome: `%${nome}%` });
    }
    const matricula = query.matricula;
    if (matricula) {
      qb.andWhere('s.matricula = :matricula', { matricula });
    }
    const tipo = query.tipo;
    if (tipo) {
      qb.andWhere('s.tipo = :tipo', { tipo });
    }
    qb.skip((query.page - 1) * query.limit).take(query.limit);
    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async buscar(id: number): Promise<Solicitante> {
    const solicitante = await this.repo.findOne({ where: { id, ativo: true } });
    if (!solicitante) {
      throw new NaoEncontradoException('Solicitante não encontrado.');
    }
    return solicitante;
  }

  async buscarMesmoInativo(id: number): Promise<Solicitante> {
    const solicitante = await this.repo.findOne({ where: { id } });
    if (!solicitante) {
      throw new NaoEncontradoException('Solicitante não encontrado.');
    }
    return solicitante;
  }

  async criar(dto: CriarSolicitanteDto): Promise<Solicitante> {
    const duplicada = await this.repo
      .createQueryBuilder('s')
      .where('LOWER(s.matricula) = LOWER(:matricula)', {
        matricula: dto.matricula,
      })
      .getOne();
    if (duplicada) {
      throw new MatriculaDuplicadaException();
    }
    const solicitante = this.repo.create({ ...dto, ativo: true });
    return this.repo.save(solicitante);
  }

  async atualizar(
    id: number,
    dto: AtualizarSolicitanteDto,
  ): Promise<Solicitante> {
    const solicitante = await this.buscarMesmoInativo(id);
    const matricula = dto.matricula;
    if (matricula) {
      const duplicada = await this.repo
        .createQueryBuilder('s')
        .where('s.id != :id', { id })
        .andWhere('LOWER(s.matricula) = LOWER(:matricula)', { matricula })
        .getOne();
      if (duplicada) {
        throw new MatriculaDuplicadaException();
      }
    }
    Object.assign(solicitante, dto);
    return this.repo.save(solicitante);
  }

  async inativar(id: number): Promise<void> {
    const solicitante = await this.buscar(id);
    solicitante.ativo = false;
    await this.repo.save(solicitante);
  }
}
