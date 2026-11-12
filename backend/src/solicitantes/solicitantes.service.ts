import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Solicitante } from './solicitante.entity';
import { Administrador } from '../administradores/administrador.entity';
import { Emprestimo } from '../emprestimos/emprestimo.entity';
import { LinhaImportacaoSolicitanteDto } from './dto/importar-solicitantes.dto';
import { CriarSolicitanteDto } from './dto/criar-solicitante.dto';
import { AtualizarSolicitanteDto } from './dto/atualizar-solicitante.dto';
import { ListarSolicitantesQueryDto } from './dto/listar-solicitantes.query.dto';
import {
  ImportacaoInvalidaException,
  MatriculaDuplicadaException,
  IdentificadorDuplicadoException,
  NaoEncontradoException,
  RecursoComEmprestimoAtivoException,
} from '../common/exceptions/app.exception';
import { StatusEmprestimo } from '../common/enums/status-emprestimo.enum';
import { calcularSkip, montarMeta } from '../common/paginacao';
import { ArquivoCsv, lerCsv } from '../common/importacao/csv';
import {
  COLUNAS_CSV_SOLICITANTES,
  ContextoValidacaoSolicitantes,
  DadosImportacaoSolicitante,
  validarLinhasSolicitantes,
} from './importacao/validar-linhas';
import {
  LinhaPrevia,
  OcorrenciaImportacao,
  PreviaImportacao,
  RelatorioImportacao,
} from '../common/importacao/importacao.types';

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
    if (query.ativo !== undefined)
      qb.andWhere('s.ativo = :ativo', { ativo: query.ativo });
    if (query.nome)
      qb.andWhere('LOWER(s.nome) LIKE LOWER(:nome)', {
        nome: `%${query.nome}%`,
      });
    if (query.matricula)
      qb.andWhere('s.matricula = :matricula', { matricula: query.matricula });
    if (query.tipo) qb.andWhere('s.tipo = :tipo', { tipo: query.tipo });
    qb.orderBy('s.nome', 'ASC').addOrderBy('s.id', 'ASC');
    qb.skip(calcularSkip(query.page, query.limit)).take(query.limit);
    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: montarMeta(query.page, query.limit, total),
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
      await this.garantirSemEmprestimoAtivo(id);
    }
    Object.assign(solicitante, dto);
    return this.repo.save(solicitante);
  }

  async inativar(id: number): Promise<void> {
    const solicitante = await this.buscar(id);
    await this.garantirSemEmprestimoAtivo(id);
    solicitante.ativo = false;
    await this.repo.save(solicitante);
  }

  private async garantirSemEmprestimoAtivo(id: number): Promise<void> {
    const temEmprestimoAtivo = await this.emprestimoRepo.exists({
      where: [
        { solicitante: { id }, status: StatusEmprestimo.EMPRESTADA },
        { responsavelAtual: { id }, status: StatusEmprestimo.EMPRESTADA },
      ],
    });
    if (temEmprestimoAtivo) {
      throw new RecursoComEmprestimoAtivoException(
        'Solicitante não pode ser inativado: há empréstimo ativo.',
      );
    }
  }

  async previsualizar(
    arquivo?: ArquivoCsv,
  ): Promise<PreviaImportacao<DadosImportacaoSolicitante>> {
    if (!arquivo) {
      throw new ImportacaoInvalidaException('Arquivo CSV não informado.');
    }
    const registros = lerCsv(arquivo, COLUNAS_CSV_SOLICITANTES);
    const contexto = await this.consultarContexto(registros);
    const linhas = validarLinhasSolicitantes(registros, contexto);

    return this.montarPrevia(linhas);
  }

  async importar(
    linhas: LinhaImportacaoSolicitanteDto[],
  ): Promise<RelatorioImportacao> {
    const registros = linhas.map((linha) => ({
      linha: linha.linha,
      valores: {
        nome: linha.nome ?? '',
        tipo: linha.tipo ?? '',
        matricula: linha.matricula ?? '',
        contato: linha.contato ?? '',
      },
    }));

    const contexto = await this.consultarContexto(registros);
    const validadas = validarLinhasSolicitantes(registros, contexto);

    if (validadas.some((l) => l.status === 'ERRO')) {
      return this.montarRelatorio(validadas, 0, true);
    }

    const novas = validadas.filter((l) => l.status === 'NOVO');
    try {
      if (novas.length > 0)
        await this.repo.manager.transaction(async (manager) => {
          await manager.getRepository(Solicitante).insert(
            novas.map((l) => ({
              nome: l.dados.nome,
              tipo: l.dados.tipo,
              matricula: l.dados.matricula,
              contato: l.dados.contato,
              ativo: true,
            })),
          );
        });
    } catch (erro) {
      if (this.ehViolacaoUnicidade(erro)) {
        throw new MatriculaDuplicadaException();
      }
      throw erro;
    }

    return this.montarRelatorio(validadas, novas.length);
  }

  private async consultarContexto(
    registros: { valores: Record<string, string> }[],
  ): Promise<ContextoValidacaoSolicitantes> {
    const matriculas = registros.map((r) => r.valores.matricula);
    const logins = matriculas.filter(Boolean);

    const matriculasExistentes = new Map<string, boolean>();
    if (matriculas.length > 0) {
      const encontradas = await this.repo
        .createQueryBuilder('s')
        .where('LOWER(s.matricula) IN (:...matriculas)', {
          matriculas: matriculas.map((m) => m.toLowerCase()),
        })
        .getMany();

      for (const s of encontradas) {
        matriculasExistentes.set(s.matricula.toLowerCase(), s.ativo);
      }
    }

    const loginsAdministradores = new Set<string>();
    if (logins.length > 0) {
      const encontrados = await this.adminRepo
        .createQueryBuilder('a')
        .where('LOWER(a.login) IN (:...logins)', {
          logins: logins.map((l) => l.toLowerCase()),
        })
        .getMany();

      for (const a of encontrados) {
        loginsAdministradores.add(a.login.toLowerCase());
      }
    }

    return { matriculasExistentes, loginsAdministradores };
  }

  private montarPrevia(
    linhas: LinhaPrevia<DadosImportacaoSolicitante>[],
  ): PreviaImportacao<DadosImportacaoSolicitante> {
    const novos = linhas.filter((l) => l.status === 'NOVO').length;
    const duplicados = linhas.filter((l) => l.status === 'DUPLICADO').length;
    const erros = linhas.filter((l) => l.status === 'ERRO').length;

    return {
      total: linhas.length,
      resumo: { novos, duplicados, erros },
      linhas,
    };
  }

  private montarRelatorio(
    linhas: LinhaPrevia<DadosImportacaoSolicitante>[],
    criados: number,
    apenasErros = false,
  ): RelatorioImportacao {
    const consideradas = apenasErros
      ? linhas.filter((l) => l.status === 'ERRO')
      : linhas.filter((l) => l.status !== 'NOVO');
    const ignorados = consideradas.filter(
      (l) => l.status === 'DUPLICADO',
    ).length;
    const erros = consideradas.filter((l) => l.status === 'ERRO').length;

    const ocorrencias: OcorrenciaImportacao[] = consideradas.map((l) => ({
      linha: l.linha,
      status: l.status === 'DUPLICADO' ? 'IGNORADO' : 'ERRO',
      identificador: l.dados.matricula,
      mensagens: l.mensagens,
    }));

    return {
      total: linhas.length,
      criados,
      ignorados,
      erros,
      ocorrencias,
    };
  }

  private ehViolacaoUnicidade(erro: unknown): boolean {
    return (
      typeof erro === 'object' &&
      erro !== null &&
      'driverError' in erro &&
      (erro as { driverError?: { code?: string } }).driverError?.code ===
        '23505'
    );
  }
}
