import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Solicitante } from './solicitante.entity';
import { Administrador } from '../administradores/administrador.entity';
import { CriarSolicitanteDto } from './dto/criar-solicitante.dto';
import { AtualizarSolicitanteDto } from './dto/atualizar-solicitante.dto';
import { ListarSolicitantesQueryDto } from './dto/listar-solicitantes.query.dto';
import {
  IdentificadorDuplicadoException,
  MatriculaDuplicadaException,
  NaoEncontradoException,
  RecursoComEmprestimoAtivoException,
} from '../common/exceptions/app.exception';
import { Emprestimo } from '../emprestimos/emprestimo.entity';
import { StatusEmprestimo } from '../common/enums/status-emprestimo.enum';

@Injectable()
export class SolicitantesService {
  constructor(
    @InjectRepository(Solicitante)
    private readonly repo: Repository<Solicitante>,
    @InjectRepository(Emprestimo)
    private readonly emprestimoRepo: Repository<Emprestimo>,
    @InjectRepository(Administrador)
    private readonly adminRepo: Repository<Administrador>,
  ) {}

  async listar(query: ListarSolicitantesQueryDto) {
    const qb = this.repo.createQueryBuilder('s');
    const ativo = query.ativo;
    if (ativo !== undefined) {
      qb.andWhere('s.ativo = :ativo', { ativo });
    }
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
    qb.orderBy('s.nome', 'ASC').addOrderBy('s.id', 'ASC');
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

  private async garantirIdentificadorLivre(matricula: string): Promise<void> {
    const admin = await this.adminRepo
      .createQueryBuilder('a')
      .where('LOWER(a.login) = LOWER(:matricula)', { matricula })
      .getOne();
    if (admin) {
      throw new IdentificadorDuplicadoException(
        'Este identificador já pertence a um administrador cadastrado.',
      );
    }
  }

  async criar(dto: CriarSolicitanteDto): Promise<Solicitante> {
    const matricula = dto.matricula.trim();
    const duplicada = await this.repo
      .createQueryBuilder('s')
      .where('LOWER(s.matricula) = LOWER(:matricula)', { matricula })
      .getOne();
    if (duplicada) {
      throw new MatriculaDuplicadaException();
    }
    await this.garantirIdentificadorLivre(matricula);
    const solicitante = this.repo.create({ ...dto, matricula, ativo: true });
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
      await this.garantirIdentificadorLivre(matricula);
    }
    if (dto.ativo === false) {
      const temEmprestimoAtivo = await this.emprestimoRepo.exists({
        where: { solicitante: { id }, status: StatusEmprestimo.EMPRESTADA },
      });
      if (temEmprestimoAtivo) {
        throw new RecursoComEmprestimoAtivoException(
          'Solicitante não pode ser inativado: há empréstimo ativo.',
        );
      }
    }
    Object.assign(solicitante, dto);
    return this.repo.save(solicitante);
  }

  async inativar(id: number): Promise<void> {
    const solicitante = await this.buscar(id);
    const temEmprestimoAtivo = await this.emprestimoRepo.exists({
      where: { solicitante: { id }, status: StatusEmprestimo.EMPRESTADA },
    });
    if (temEmprestimoAtivo) {
      throw new RecursoComEmprestimoAtivoException(
        'Solicitante não pode ser inativado: há empréstimo ativo.',
      );
    }
    solicitante.ativo = false;
    await this.repo.save(solicitante);
  }
}
