import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chave } from './chave.entity';
import { CriarChaveDto } from './dto/criar-chave.dto';
import { AtualizarChaveDto } from './dto/atualizar-chave.dto';
import { ListarChavesQueryDto } from './dto/listar-chaves.query.dto';
import {
  CodigoChaveDuplicadoException,
  NaoEncontradoException,
} from '../common/exceptions/app.exception';
import { StatusChave } from '../common/enums/status-chave.enum';

@Injectable()
export class ChavesService {
  constructor(
    @InjectRepository(Chave)
    private readonly repo: Repository<Chave>,
  ) {}

  async listar(query: ListarChavesQueryDto) {
    const qb = this.repo.createQueryBuilder('c');
    qb.where('c.ativo = :ativo', { ativo: query.ativo ?? true });
    const status = query.status;
    if (status) {
      qb.andWhere('c.status = :status', { status });
    }
    const busca = query.busca;
    if (busca) {
      qb.andWhere(
        '(LOWER(c.codigo) LIKE LOWER(:termo) OR LOWER(c.descricao) LIKE LOWER(:termo) OR LOWER(c.localizacao) LIKE LOWER(:termo))',
        { termo: `%${busca}%` },
      );
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

  async buscar(id: number): Promise<Chave> {
    const chave = await this.repo.findOne({ where: { id, ativo: true } });
    if (!chave) {
      throw new NaoEncontradoException('Chave não encontrada.');
    }
    return chave;
  }

  async buscarMesmoInativo(id: number): Promise<Chave> {
    const chave = await this.repo.findOne({ where: { id } });
    if (!chave) {
      throw new NaoEncontradoException('Chave não encontrada.');
    }
    return chave;
  }

  async criar(dto: CriarChaveDto): Promise<Chave> {
    const duplicada = await this.repo
      .createQueryBuilder('c')
      .where('LOWER(c.codigo) = LOWER(:codigo)', { codigo: dto.codigo })
      .getOne();
    if (duplicada) {
      throw new CodigoChaveDuplicadoException();
    }
    const chave = this.repo.create({
      ...dto,
      status: StatusChave.DISPONIVEL,
      ativo: true,
    });
    return this.repo.save(chave);
  }

  async atualizar(id: number, dto: AtualizarChaveDto): Promise<Chave> {
    const chave = await this.buscarMesmoInativo(id);
    const codigo = dto.codigo;
    if (codigo) {
      const duplicada = await this.repo
        .createQueryBuilder('c')
        .where('c.id != :id', { id })
        .andWhere('LOWER(c.codigo) = LOWER(:codigo)', { codigo })
        .getOne();
      if (duplicada) {
        throw new CodigoChaveDuplicadoException();
      }
    }
    Object.assign(chave, dto);
    return this.repo.save(chave);
  }

  async inativar(id: number): Promise<void> {
    const chave = await this.buscar(id);
    chave.ativo = false;
    await this.repo.save(chave);
  }
}
