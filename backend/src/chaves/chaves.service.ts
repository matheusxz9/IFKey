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
  RecursoComEmprestimoAtivoException,
} from '../common/exceptions/app.exception';
import { Emprestimo } from '../emprestimos/emprestimo.entity';
import { StatusEmprestimo } from '../common/enums/status-emprestimo.enum';
import { StatusChave } from '../common/enums/status-chave.enum';
import { ArquivoCsv, lerCsv } from '../common/importacao/csv';
import { ImportacaoInvalidaException } from '../common/exceptions/app.exception';
import { LinhaImportacaoChaveDto } from './dto/importar-chaves.dto';
import {
  COLUNAS_CSV_CHAVES,
  DadosImportacaoChave,
  validarLinhasChaves,
} from './importacao/validar-linhas';
import {
  LinhaPrevia,
  OcorrenciaImportacao,
  PreviaImportacao,
  RelatorioImportacao,
} from '../common/importacao/importacao.types';

@Injectable()
export class ChavesService {
  constructor(
    @InjectRepository(Chave)
    private readonly repo: Repository<Chave>,
    @InjectRepository(Emprestimo)
    private readonly emprestimoRepo: Repository<Emprestimo>,
  ) {}

  async listar(query: ListarChavesQueryDto) {
    const qb = this.repo.createQueryBuilder('c');
    const ativo = query.ativo;
    if (ativo !== undefined) {
      qb.andWhere('c.ativo = :ativo', { ativo });
    }
    const status = query.status;
    if (status) {
      qb.andWhere('c.status = :status', { status });
    }
    const busca = query.busca;
    if (busca) {
      const termos = busca.trim().split(/\s+/).filter(Boolean);
      termos.forEach((termo, i) => {
        const param = `termo${i}`;
        qb.andWhere(
          `(LOWER(c.codigo) LIKE LOWER(:${param}) OR LOWER(c.descricao) LIKE LOWER(:${param}) OR LOWER(c.localizacao) LIKE LOWER(:${param}))`,
          { [param]: `%${termo}%` },
        );
      });
    }
    qb.orderBy('c.codigo', 'ASC').addOrderBy('c.id', 'ASC');
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
    if (dto.ativo === false) {
      const temEmprestimoAtivo = await this.emprestimoRepo.exists({
        where: { chave: { id }, status: StatusEmprestimo.EMPRESTADA },
      });
      if (temEmprestimoAtivo) {
        throw new RecursoComEmprestimoAtivoException(
          'Chave não pode ser inativada: há empréstimo ativo.',
        );
      }
    }
    Object.assign(chave, dto);
    return this.repo.save(chave);
  }

  async inativar(id: number): Promise<void> {
    const chave = await this.buscar(id);
    const temEmprestimoAtivo = await this.emprestimoRepo.exists({
      where: { chave: { id }, status: StatusEmprestimo.EMPRESTADA },
    });
    if (temEmprestimoAtivo) {
      throw new RecursoComEmprestimoAtivoException(
        'Chave não pode ser inativada: há empréstimo ativo.',
      );
    }
    chave.ativo = false;
    await this.repo.save(chave);
  }

  async previsualizar(
    arquivo?: ArquivoCsv,
  ): Promise<PreviaImportacao<DadosImportacaoChave>> {
    if (!arquivo)
      throw new ImportacaoInvalidaException('Arquivo CSV não informado.');
    const registros = lerCsv(arquivo, COLUNAS_CSV_CHAVES);
    return this.montarPrevia(
      validarLinhasChaves(registros, await this.consultarCodigos(registros)),
    );
  }

  async importar(
    linhas: LinhaImportacaoChaveDto[],
  ): Promise<RelatorioImportacao> {
    const registros = linhas.map((linha) => ({
      linha: linha.linha,
      valores: {
        codigo: linha.codigo ?? '',
        descricao: linha.descricao ?? '',
        localizacao: linha.localizacao ?? '',
      },
    }));
    const validadas = validarLinhasChaves(
      registros,
      await this.consultarCodigos(registros),
    );
    if (validadas.some((linha) => linha.status === 'ERRO'))
      return this.montarRelatorio(validadas, 0, true);
    const novas = validadas.filter((linha) => linha.status === 'NOVO');
    try {
      if (novas.length > 0)
        await this.repo.manager.transaction(async (manager) => {
          await manager.getRepository(Chave).insert(
            novas.map((linha) => ({
              ...linha.dados,
              status: StatusChave.DISPONIVEL,
              ativo: true,
            })),
          );
        });
    } catch (erro) {
      if (
        typeof erro === 'object' &&
        erro !== null &&
        'driverError' in erro &&
        (erro as { driverError?: { code?: string } }).driverError?.code ===
          '23505'
      ) {
        throw new CodigoChaveDuplicadoException();
      }
      throw erro;
    }
    return this.montarRelatorio(validadas, novas.length);
  }

  private async consultarCodigos(
    registros: { valores: Record<string, string> }[],
  ) {
    const codigos = registros
      .map((registro) => (registro.valores.codigo ?? '').trim().toLowerCase())
      .filter(Boolean);
    const existentes = new Set<string>();
    if (codigos.length > 0) {
      const chaves = await this.repo
        .createQueryBuilder('c')
        .where('LOWER(c.codigo) IN (:...codigos)', { codigos })
        .getMany();
      for (const chave of chaves) existentes.add(chave.codigo.toLowerCase());
    }
    return { codigosExistentes: existentes };
  }

  private montarPrevia(
    linhas: LinhaPrevia<DadosImportacaoChave>[],
  ): PreviaImportacao<DadosImportacaoChave> {
    return {
      total: linhas.length,
      resumo: {
        novos: linhas.filter((linha) => linha.status === 'NOVO').length,
        duplicados: linhas.filter((linha) => linha.status === 'DUPLICADO')
          .length,
        erros: linhas.filter((linha) => linha.status === 'ERRO').length,
      },
      linhas,
    };
  }

  private montarRelatorio(
    linhas: LinhaPrevia<DadosImportacaoChave>[],
    criados: number,
    apenasErros = false,
  ): RelatorioImportacao {
    const consideradas = apenasErros
      ? linhas.filter((linha) => linha.status === 'ERRO')
      : linhas.filter((linha) => linha.status !== 'NOVO');
    const ocorrencias: OcorrenciaImportacao[] = consideradas.map((linha) => ({
      linha: linha.linha,
      status: linha.status === 'DUPLICADO' ? 'IGNORADO' : 'ERRO',
      identificador: linha.dados.codigo,
      mensagens: linha.mensagens,
    }));
    return {
      total: linhas.length,
      criados,
      ignorados: ocorrencias.filter(
        (ocorrencia) => ocorrencia.status === 'IGNORADO',
      ).length,
      erros: ocorrencias.filter((ocorrencia) => ocorrencia.status === 'ERRO')
        .length,
      ocorrencias,
    };
  }
}
