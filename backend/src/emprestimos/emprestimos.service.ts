import { Injectable } from '@nestjs/common';
import { CriarEmprestimoDto } from './dto/criar-emprestimo.dto';
import { DevolverEmprestimoDto } from './dto/devolver-emprestimo.dto';
import { ListarEmprestimosQueryDto } from './dto/listar-emprestimos.query.dto';
import { HistoricoEmprestimosQueryDto } from './dto/historico-emprestimos.query.dto';
import { ChavesService } from '../chaves/chaves.service';
import { SolicitantesService } from '../solicitantes/solicitantes.service';
import {
  EmprestimoJaDevolvidoException,
  NaoEncontradoException,
  SolicitanteInativoException,
} from '../common/exceptions/app.exception';
import { StatusEmprestimo } from '../common/enums/status-emprestimo.enum';

export interface Emprestimo {
  id: number;
  solicitanteId: number;
  chaveId: number;
  dataHoraEmprestimo: string;
  dataHoraDevolucao: string | null;
  status: StatusEmprestimo;
  observacoes?: string;
}

@Injectable()
export class EmprestimosService {
  private emprestimos: Emprestimo[] = [];
  private proximoId = 1;

  constructor(
    private readonly chavesService: ChavesService,
    private readonly solicitantesService: SolicitantesService,
  ) {}

  criar(dto: CriarEmprestimoDto): Emprestimo {
    const solicitante = this.solicitantesService.buscarMesmoInativo(
      dto.solicitanteId,
    );
    if (!solicitante.ativo) {
      throw new SolicitanteInativoException();
    }
    this.chavesService.buscarMesmoInativo(dto.chaveId);
    this.chavesService.emprestar(dto.chaveId);
    const emprestimo: Emprestimo = {
      id: this.proximoId++,
      solicitanteId: dto.solicitanteId,
      chaveId: dto.chaveId,
      dataHoraEmprestimo: new Date().toISOString(),
      dataHoraDevolucao: null,
      status: StatusEmprestimo.EMPRESTADA,
      observacoes: dto.observacoes,
    };
    this.emprestimos.push(emprestimo);
    return emprestimo;
  }

  devolver(id: number, dto: DevolverEmprestimoDto): Emprestimo {
    const emprestimo = this.buscar(id);
    if (emprestimo.status === StatusEmprestimo.DEVOLVIDA) {
      throw new EmprestimoJaDevolvidoException();
    }
    emprestimo.status = StatusEmprestimo.DEVOLVIDA;
    emprestimo.dataHoraDevolucao = new Date().toISOString();
    if (dto.observacoes) {
      emprestimo.observacoes = dto.observacoes;
    }
    this.chavesService.devolver(emprestimo.chaveId);
    return emprestimo;
  }

  listar(query: ListarEmprestimosQueryDto) {
    let resultado = [...this.emprestimos].sort((a, b) =>
      b.dataHoraEmprestimo.localeCompare(a.dataHoraEmprestimo),
    );
    const status = query.status;
    if (status) {
      resultado = resultado.filter((e) => e.status === status);
    }
    const solicitanteId = query.solicitanteId;
    if (solicitanteId) {
      resultado = resultado.filter((e) => e.solicitanteId === solicitanteId);
    }
    const chaveId = query.chaveId;
    if (chaveId) {
      resultado = resultado.filter((e) => e.chaveId === chaveId);
    }
    const total = resultado.length;
    const inicio = (query.page - 1) * query.limit;
    const data = resultado.slice(inicio, inicio + query.limit);
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

  historico(query: HistoricoEmprestimosQueryDto) {
    let resultado = this.emprestimos.filter(
      (e) => e.status === StatusEmprestimo.DEVOLVIDA,
    );
    const de = query.de;
    if (de) {
      const dataDe = new Date(de);
      resultado = resultado.filter(
        (e) => new Date(e.dataHoraDevolucao ?? 0) >= dataDe,
      );
    }
    const ate = query.ate;
    if (ate) {
      const dataAte = new Date(ate);
      resultado = resultado.filter(
        (e) => new Date(e.dataHoraDevolucao ?? 0) <= dataAte,
      );
    }
    const solicitanteId = query.solicitanteId;
    if (solicitanteId) {
      resultado = resultado.filter((e) => e.solicitanteId === solicitanteId);
    }
    const chaveId = query.chaveId;
    if (chaveId) {
      resultado = resultado.filter((e) => e.chaveId === chaveId);
    }
    resultado.sort((a, b) =>
      (b.dataHoraDevolucao ?? '').localeCompare(a.dataHoraDevolucao ?? ''),
    );
    const total = resultado.length;
    const inicio = (query.page - 1) * query.limit;
    const data = resultado.slice(inicio, inicio + query.limit);
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

  buscar(id: number): Emprestimo {
    const emprestimo = this.emprestimos.find((e) => e.id === id);
    if (!emprestimo) {
      throw new NaoEncontradoException('Empréstimo não encontrado.');
    }
    return emprestimo;
  }
}
