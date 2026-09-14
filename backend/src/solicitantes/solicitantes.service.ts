import { Injectable } from '@nestjs/common';
import { CriarSolicitanteDto } from './dto/criar-solicitante.dto';
import { AtualizarSolicitanteDto } from './dto/atualizar-solicitante.dto';
import { ListarSolicitantesQueryDto } from './dto/listar-solicitantes.query.dto';
import {
  MatriculaDuplicadaException,
  NaoEncontradoException,
} from '../common/exceptions/app.exception';
import { TipoSolicitante } from '../common/enums/tipo-solicitante.enum';

export interface Solicitante {
  id: number;
  nome: string;
  tipo: TipoSolicitante;
  matricula: string;
  contato: string;
  ativo: boolean;
}

@Injectable()
export class SolicitantesService {
  private solicitantes: Solicitante[] = [];
  private proximoId = 1;

  listar(query: ListarSolicitantesQueryDto) {
    let resultado = this.solicitantes.filter(
      (s) => s.ativo === (query.ativo ?? true),
    );
    const nome = query.nome;
    if (nome) {
      const termo = nome.toLowerCase();
      resultado = resultado.filter((s) => s.nome.toLowerCase().includes(termo));
    }
    const matricula = query.matricula;
    if (matricula) {
      resultado = resultado.filter((s) => s.matricula === matricula);
    }
    const tipo = query.tipo;
    if (tipo) {
      resultado = resultado.filter((s) => s.tipo === tipo);
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

  buscar(id: number): Solicitante {
    const solicitante = this.solicitantes.find((s) => s.id === id && s.ativo);
    if (!solicitante) {
      throw new NaoEncontradoException('Solicitante não encontrado.');
    }
    return solicitante;
  }

  buscarMesmoInativo(id: number): Solicitante {
    const solicitante = this.solicitantes.find((s) => s.id === id);
    if (!solicitante) {
      throw new NaoEncontradoException('Solicitante não encontrado.');
    }
    return solicitante;
  }

  criar(dto: CriarSolicitanteDto): Solicitante {
    const duplicada = this.solicitantes.some(
      (s) => s.matricula.toLowerCase() === dto.matricula.toLowerCase(),
    );
    if (duplicada) {
      throw new MatriculaDuplicadaException();
    }
    const solicitante: Solicitante = {
      id: this.proximoId++,
      ...dto,
      ativo: true,
    };
    this.solicitantes.push(solicitante);
    return solicitante;
  }

  atualizar(id: number, dto: AtualizarSolicitanteDto): Solicitante {
    const solicitante = this.buscarMesmoInativo(id);
    const matricula = dto.matricula;
    if (matricula) {
      const duplicada = this.solicitantes.some(
        (s) =>
          s.id !== id && s.matricula.toLowerCase() === matricula.toLowerCase(),
      );
      if (duplicada) {
        throw new MatriculaDuplicadaException();
      }
    }
    Object.assign(solicitante, dto);
    return solicitante;
  }

  inativar(id: number): void {
    const solicitante = this.buscar(id);
    solicitante.ativo = false;
  }
}
