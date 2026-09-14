import { Injectable } from '@nestjs/common';
import { CriarChaveDto } from './dto/criar-chave.dto';
import { AtualizarChaveDto } from './dto/atualizar-chave.dto';
import { ListarChavesQueryDto } from './dto/listar-chaves.query.dto';
import {
  ChaveIndisponivelException,
  CodigoChaveDuplicadoException,
  NaoEncontradoException,
} from '../common/exceptions/app.exception';
import { StatusChave } from '../common/enums/status-chave.enum';

export interface Chave {
  id: number;
  codigo: string;
  descricao: string;
  localizacao: string;
  status: StatusChave;
  dataCadastro: string;
  ativo: boolean;
}

@Injectable()
export class ChavesService {
  private chaves: Chave[] = [];
  private proximoId = 1;

  listar(query: ListarChavesQueryDto) {
    let resultado = this.chaves.filter(
      (c) => c.ativo === (query.ativo ?? true),
    );
    const status = query.status;
    if (status) {
      resultado = resultado.filter((c) => c.status === status);
    }
    const busca = query.busca;
    if (busca) {
      const termo = busca.toLowerCase();
      resultado = resultado.filter(
        (c) =>
          c.codigo.toLowerCase().includes(termo) ||
          c.descricao.toLowerCase().includes(termo) ||
          c.localizacao.toLowerCase().includes(termo),
      );
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

  buscar(id: number): Chave {
    const chave = this.chaves.find((c) => c.id === id && c.ativo);
    if (!chave) {
      throw new NaoEncontradoException('Chave não encontrada.');
    }
    return chave;
  }

  buscarMesmoInativo(id: number): Chave {
    const chave = this.chaves.find((c) => c.id === id);
    if (!chave) {
      throw new NaoEncontradoException('Chave não encontrada.');
    }
    return chave;
  }

  criar(dto: CriarChaveDto): Chave {
    const duplicada = this.chaves.some(
      (c) => c.codigo.toLowerCase() === dto.codigo.toLowerCase(),
    );
    if (duplicada) {
      throw new CodigoChaveDuplicadoException();
    }
    const chave: Chave = {
      id: this.proximoId++,
      codigo: dto.codigo,
      descricao: dto.descricao,
      localizacao: dto.localizacao,
      status: StatusChave.DISPONIVEL,
      dataCadastro: new Date().toISOString(),
      ativo: true,
    };
    this.chaves.push(chave);
    return chave;
  }

  atualizar(id: number, dto: AtualizarChaveDto): Chave {
    const chave = this.buscarMesmoInativo(id);
    const codigo = dto.codigo;
    if (codigo) {
      const duplicada = this.chaves.some(
        (c) => c.id !== id && c.codigo.toLowerCase() === codigo.toLowerCase(),
      );
      if (duplicada) {
        throw new CodigoChaveDuplicadoException();
      }
    }
    Object.assign(chave, dto);
    return chave;
  }

  inativar(id: number): void {
    const chave = this.buscar(id);
    chave.ativo = false;
  }

  emprestar(id: number): void {
    const chave = this.buscarMesmoInativo(id);
    if (!chave.ativo || chave.status !== StatusChave.DISPONIVEL) {
      throw new ChaveIndisponivelException();
    }
    chave.status = StatusChave.EMPRESTADA;
  }

  devolver(id: number): void {
    const chave = this.buscarMesmoInativo(id);
    chave.status = StatusChave.DISPONIVEL;
  }
}
