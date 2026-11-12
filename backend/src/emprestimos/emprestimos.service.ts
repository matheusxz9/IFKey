import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Emprestimo } from './emprestimo.entity';
import { Chave } from '../chaves/chave.entity';
import { Solicitante } from '../solicitantes/solicitante.entity';
import { Administrador } from '../administradores/administrador.entity';
import { CriarEmprestimoDto } from './dto/criar-emprestimo.dto';
import { DevolverEmprestimoDto } from './dto/devolver-emprestimo.dto';
import { ListarEmprestimosQueryDto } from './dto/listar-emprestimos.query.dto';
import { HistoricoEmprestimosQueryDto } from './dto/historico-emprestimos.query.dto';
import {
  ChaveIndisponivelException,
  EmprestimoJaDevolvidoException,
  NaoEncontradoException,
  SemPermissaoException,
  SolicitanteInativoException,
} from '../common/exceptions/app.exception';
import { StatusChave } from '../common/enums/status-chave.enum';
import { StatusEmprestimo } from '../common/enums/status-emprestimo.enum';
import { PerfilAdministrador } from '../common/enums/perfil-administrador.enum';
import { calcularSkip, montarMeta } from '../common/paginacao';
import { RepasseEmprestimo } from './repasse-emprestimo.entity';
import { RepassarEmprestimoDto } from './dto/repassar-emprestimo.dto';

type UsuarioEmprestimo = {
  id: number;
  nome: string;
  login?: string;
  perfil: PerfilAdministrador;
};

@Injectable()
export class EmprestimosService {
  constructor(
    @InjectRepository(Emprestimo)
    private readonly repo: Repository<Emprestimo>,
  ) {}

  async criar(
    dto: CriarEmprestimoDto,
    usuarioId: number,
    perfil: PerfilAdministrador,
  ) {
    const ehSolicitante = perfil === PerfilAdministrador.SOLICITANTE;
    const solicitanteId = ehSolicitante ? usuarioId : dto.solicitanteId;
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
        responsavelAtual: { id: solicitanteId },
        chave: { id: dto.chaveId },
        // Empréstimo registrado pelo próprio solicitante não tem administrador associado.
        ...(ehSolicitante ? {} : { administrador: { id: usuarioId } }),
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

  async devolver(
    id: number,
    dto: DevolverEmprestimoDto,
    user?: UsuarioEmprestimo,
  ) {
    return this.repo.manager.transaction(async (manager) => {
      const emprestimoRepo = manager.getRepository(Emprestimo);
      const chaveRepo = manager.getRepository(Chave);

      // Lock isolado na linha do empréstimo: aplicar "FOR UPDATE" junto com o
      // join da chave é rejeitado pelo Postgres (outer join).
      const emprestimoTravado = await emprestimoRepo.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!emprestimoTravado) {
        throw new NaoEncontradoException('Empréstimo não encontrado.');
      }

      const emprestimo = await emprestimoRepo.findOne({
        where: { id },
        relations: {
          chave: true,
          solicitante: true,
          administrador: true,
          responsavelAtual: true,
        },
      });
      if (!emprestimo) {
        throw new NaoEncontradoException('Empréstimo não encontrado.');
      }
      if (
        user?.perfil === PerfilAdministrador.SOLICITANTE &&
        emprestimo.responsavelAtual.id !== user.id
      ) {
        throw new SemPermissaoException(
          'Somente o responsável atual pode devolver este empréstimo.',
        );
      }
      if (emprestimo.status === StatusEmprestimo.DEVOLVIDA) {
        throw new EmprestimoJaDevolvidoException();
      }

      // O `FOR UPDATE` não pode ser aplicado junto do join de `relations`
      // (erro do Postgres), então o lock é feito apenas na linha da chave
      // para serializar devoluções concorrentes.
      await chaveRepo.findOne({
        where: { id: emprestimo.chave.id },
        lock: { mode: 'pessimistic_write' },
      });

      const dataHoraDevolucao = new Date();
      await emprestimoRepo.update(id, {
        status: StatusEmprestimo.DEVOLVIDA,
        dataHoraDevolucao,
        ...(user?.perfil === PerfilAdministrador.SOLICITANTE
          ? {
              devolvedorSolicitante: { id: user.id },
              devolvedorAdministrador: null,
            }
          : user
            ? {
                devolvedorAdministrador: { id: user.id },
                devolvedorSolicitante: null,
              }
            : {}),
        ...(dto.observacoes ? { observacoes: dto.observacoes } : {}),
      });

      await chaveRepo.update(emprestimo.chave.id, {
        status: StatusChave.DISPONIVEL,
      });

      emprestimo.status = StatusEmprestimo.DEVOLVIDA;
      emprestimo.dataHoraDevolucao = dataHoraDevolucao;
      if (dto.observacoes) emprestimo.observacoes = dto.observacoes;
      if (user?.perfil === PerfilAdministrador.SOLICITANTE) {
        emprestimo.devolvedorSolicitante = emprestimo.responsavelAtual;
        emprestimo.devolvedorAdministrador = null;
      } else if (user) {
        emprestimo.devolvedorSolicitante = null;
        emprestimo.devolvedorAdministrador = {
          id: user.id,
          nome: user.nome,
          login: user.login ?? '',
          perfil: user.perfil,
        } as Administrador;
      }

      return this.toResponse(emprestimo);
    });
  }

  async repassar(
    id: number,
    dto: RepassarEmprestimoDto,
    user: { id: number; perfil: string },
  ) {
    if (user.perfil !== 'SOLICITANTE') throw new SemPermissaoException();
    return this.repo.manager.transaction(async (manager) => {
      const emprestimoRepo = manager.getRepository(Emprestimo);
      const travado = await emprestimoRepo.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!travado)
        throw new NaoEncontradoException('Empréstimo não encontrado.');
      const emprestimo = await emprestimoRepo.findOne({
        where: { id },
        relations: { responsavelAtual: true },
      });
      if (!emprestimo)
        throw new NaoEncontradoException('Empréstimo não encontrado.');
      if (emprestimo.responsavelAtual.id !== user.id)
        throw new SemPermissaoException(
          'Somente o responsável atual pode repassar este empréstimo.',
        );
      if (emprestimo.status === StatusEmprestimo.DEVOLVIDA)
        throw new EmprestimoJaDevolvidoException();
      if (dto.solicitanteId === user.id)
        throw new BadRequestException(
          'O destinatário deve ser diferente do responsável atual.',
        );
      const destino = await manager
        .getRepository(Solicitante)
        .findOne({ where: { id: dto.solicitanteId } });
      if (!destino)
        throw new NaoEncontradoException('Destinatário não encontrado.');
      if (!destino.ativo) throw new SolicitanteInativoException();
      await manager.getRepository(RepasseEmprestimo).insert({
        emprestimo: { id },
        origem: { id: user.id },
        destino: { id: destino.id },
        observacoes: dto.observacoes ?? null,
      });
      await emprestimoRepo.update(id, { responsavelAtual: { id: destino.id } });
      return this.toResponse(
        await this.buscarEntidadeComManager(manager, id, true),
      );
    });
  }

  private async buscarEntidadeComManager(
    manager: EntityManager,
    id: number,
    comRepasses = false,
  ): Promise<Emprestimo> {
    const emprestimo = await manager.findOne(Emprestimo, {
      where: { id },
      relations: {
        solicitante: true,
        chave: true,
        administrador: true,
        responsavelAtual: true,
        devolvedorSolicitante: true,
        devolvedorAdministrador: true,
        ...(comRepasses ? { repasses: { origem: true, destino: true } } : {}),
      },
    });
    if (!emprestimo) {
      throw new NaoEncontradoException('Empréstimo não encontrado.');
    }
    return emprestimo;
  }

  async listar(query: ListarEmprestimosQueryDto, user?: UsuarioEmprestimo) {
    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.solicitante', 's')
      .leftJoinAndSelect('e.chave', 'c')
      .leftJoinAndSelect('e.administrador', 'a')
      .leftJoinAndSelect('e.responsavelAtual', 'r')
      .leftJoinAndSelect('e.devolvedorSolicitante', 'ds')
      .leftJoinAndSelect('e.devolvedorAdministrador', 'da');
    if (query.status)
      qb.andWhere('e.status = :status', { status: query.status });
    if (query.chaveId)
      qb.andWhere('c.id = :chaveId', { chaveId: query.chaveId });
    if (user?.perfil === PerfilAdministrador.SOLICITANTE) {
      qb.andWhere(
        `(s.id = :participante OR r.id = :participante OR EXISTS
        (SELECT 1 FROM emprestimo_repasse p WHERE p.id_emprestimo = e.id
        AND (p.id_solicitante_origem = :participante OR p.id_solicitante_destino = :participante)))`,
        { participante: user.id },
      );
    } else if (query.solicitanteId)
      qb.andWhere('s.id = :solicitanteId', {
        solicitanteId: query.solicitanteId,
      });
    qb.orderBy('e.dataHoraEmprestimo', 'DESC')
      .skip(calcularSkip(query.page, query.limit))
      .take(query.limit);
    const [data, total] = await qb.getManyAndCount();
    return {
      data: data.map((e) => this.toResponse(e)),
      meta: montarMeta(query.page, query.limit, total),
    };
  }

  async historico(
    query: HistoricoEmprestimosQueryDto,
    user?: UsuarioEmprestimo,
  ) {
    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.solicitante', 's')
      .leftJoinAndSelect('e.chave', 'c')
      .leftJoinAndSelect('e.administrador', 'a')
      .leftJoinAndSelect('e.responsavelAtual', 'r')
      .leftJoinAndSelect('e.devolvedorSolicitante', 'ds')
      .leftJoinAndSelect('e.devolvedorAdministrador', 'da')
      .addSelect(
        `CASE WHEN e.status = '${StatusEmprestimo.EMPRESTADA}' THEN 0 ELSE 1 END`,
        'ordem_status',
      )
      .orderBy('ordem_status', 'ASC')
      .addOrderBy('e.dataHoraEmprestimo', 'DESC');

    if (user?.perfil === PerfilAdministrador.SOLICITANTE) {
      qb.andWhere(
        `(s.id = :participante OR r.id = :participante OR EXISTS
        (SELECT 1 FROM emprestimo_repasse p WHERE p.id_emprestimo = e.id
        AND (p.id_solicitante_origem = :participante OR p.id_solicitante_destino = :participante)))`,
        { participante: user.id },
      );
    } else {
      const solicitanteId = query.solicitanteId;
      if (solicitanteId) {
        qb.andWhere('e.solicitante = :solicitanteId', { solicitanteId });
      }
    }

    const de = query.de;
    if (de) {
      qb.andWhere('e.dataHoraEmprestimo >= :de', {
        de: this.inicioDoDia(de),
      });
    }
    const ate = query.ate;
    if (ate) {
      qb.andWhere('e.dataHoraEmprestimo <= :ate', {
        ate: this.fimDoDia(ate),
      });
    }
    const chaveId = query.chaveId;
    if (chaveId) {
      qb.andWhere('e.chave = :chaveId', { chaveId });
    }
    qb.skip(calcularSkip(query.page, query.limit)).take(query.limit);
    const [data, total] = await qb.getManyAndCount();
    return {
      data: data.map((e) => this.toResponse(e)),
      meta: montarMeta(query.page, query.limit, total),
    };
  }

  async buscar(id: number, user?: UsuarioEmprestimo) {
    const emprestimo = await this.buscarEntidade(id);
    this.garantirProprioEmprestimo(emprestimo, user);
    return this.toResponse(emprestimo);
  }

  private garantirProprioEmprestimo(
    emprestimo: Emprestimo,
    user?: UsuarioEmprestimo,
  ) {
    if (
      user?.perfil === PerfilAdministrador.SOLICITANTE &&
      emprestimo.solicitante?.id !== user.id &&
      emprestimo.responsavelAtual?.id !== user.id &&
      !emprestimo.repasses?.some(
        (repasse) =>
          repasse.origem.id === user.id || repasse.destino.id === user.id,
      )
    ) {
      throw new SemPermissaoException(
        'Solicitante só pode acessar os empréstimos em que participa.',
      );
    }
    return this.toResponse(emprestimo);
  }

  private async buscarEntidade(id: number): Promise<Emprestimo> {
    const emprestimo = await this.repo.findOne({
      where: { id },
      relations: {
        solicitante: true,
        chave: true,
        administrador: true,
        responsavelAtual: true,
        devolvedorSolicitante: true,
        devolvedorAdministrador: true,
        repasses: { origem: true, destino: true },
      },
    });
    if (!emprestimo) {
      throw new NaoEncontradoException('Empréstimo não encontrado.');
    }
    return emprestimo;
  }

  private inicioDoDia(valor: string): Date {
    return valor.length === 10
      ? new Date(`${valor}T00:00:00`)
      : new Date(valor);
  }

  private fimDoDia(valor: string): Date {
    return valor.length === 10
      ? new Date(`${valor}T23:59:59.999`)
      : new Date(valor);
  }

  private toResponse(e: Emprestimo) {
    const pessoa = (s: Solicitante) => ({
      id: s.id,
      nome: s.nome,
      matricula: s.matricula,
      tipo: s.tipo,
    });
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
      responsavelAtual: e.responsavelAtual ? pessoa(e.responsavelAtual) : null,
      devolvidoPor: e.devolvedorSolicitante
        ? { ...pessoa(e.devolvedorSolicitante), tipo: 'SOLICITANTE' }
        : e.devolvedorAdministrador
          ? {
              id: e.devolvedorAdministrador.id,
              nome: e.devolvedorAdministrador.nome,
              login: e.devolvedorAdministrador.login,
              tipo: e.devolvedorAdministrador.perfil,
            }
          : null,
      ...(e.repasses
        ? {
            repasses: e.repasses
              .sort((a, b) => a.id - b.id)
              .map((repasse) => ({
                id: repasse.id,
                origem: pessoa(repasse.origem),
                destino: pessoa(repasse.destino),
                dataHora: repasse.dataHora,
                observacoes: repasse.observacoes,
              })),
          }
        : {}),
      dataHoraEmprestimo: e.dataHoraEmprestimo,
      dataHoraDevolucao: e.dataHoraDevolucao,
      status: e.status,
      observacoes: e.observacoes,
    };
  }
}
