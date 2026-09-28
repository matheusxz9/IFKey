import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Administrador } from './administrador.entity';
import { CriarAdministradorDto } from './dto/criar-administrador.dto';
import { AtualizarAdministradorDto } from './dto/atualizar-administrador.dto';
import { ListarAdministradoresQueryDto } from './dto/listar-administradores.query.dto';

@Injectable()
export class AdministradoresService {
  constructor(
    @InjectRepository(Administrador)
    private readonly repo: Repository<Administrador>,
  ) {}

  async listar(query: ListarAdministradoresQueryDto) {
    const { page = 1, limit = 10, ...filtros } = query;
    const qb = this.repo.createQueryBuilder('admin');

    if (filtros.nome) {
      qb.andWhere('admin.nome ILIKE :nome', { nome: `%${filtros.nome}%` });
    }
    if (filtros.login) {
      qb.andWhere('admin.login ILIKE :login', { login: `%${filtros.login}%` });
    }
    if (filtros.perfil) {
      qb.andWhere('admin.perfil = :perfil', { perfil: filtros.perfil });
    }
    if (filtros.ativo !== undefined) {
      qb.andWhere('admin.ativo = :ativo', { ativo: filtros.ativo });
    }

    qb.orderBy('admin.nome', 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async buscar(id: number) {
    const admin = await this.repo.findOne({ where: { id } });
    if (!admin) {
      return null;
    }
    return admin;
  }

  async criar(dto: CriarAdministradorDto) {
    const admin = this.repo.create(dto);
    return this.repo.save(admin);
  }

  async atualizar(id: number, dto: AtualizarAdministradorDto) {
    await this.repo.update(id, dto);
    return this.buscar(id);
  }

  async inativar(id: number) {
    const admin = await this.buscar(id);
    if (!admin) return;
    admin.ativo = false;
    return this.repo.save(admin);
  }
}
