import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Administrador } from './administrador.entity';
import { Solicitante } from '../solicitantes/solicitante.entity';
import {
  IdentificadorDuplicadoException,
  LoginDuplicadoException,
  MatriculaDuplicadaException,
  NaoEncontradoException,
  UltimoAdministradorException,
} from '../common/exceptions/app.exception';
import { PerfilAdministrador } from '../common/enums/perfil-administrador.enum';
import { CriarAdministradorDto } from './dto/criar-administrador.dto';
import { AtualizarAdministradorDto } from './dto/atualizar-administrador.dto';
import { ConverterSolicitanteDto } from './dto/converter-solicitante.dto';
import { ListarAdministradoresQueryDto } from './dto/listar-administradores.query.dto';

@Injectable()
export class AdministradoresService {
  constructor(
    @InjectRepository(Administrador)
    private readonly repo: Repository<Administrador>,
    @InjectRepository(Solicitante)
    private readonly solicitanteRepo: Repository<Solicitante>,
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
    const login = dto.login.trim();
    const duplicado = await this.repo
      .createQueryBuilder('admin')
      .where('LOWER(admin.login) = LOWER(:login)', { login })
      .getOne();
    if (duplicado) {
      throw new LoginDuplicadoException();
    }
    const solicitanteComMesmoLogin = await this.solicitanteRepo
      .createQueryBuilder('s')
      .where('LOWER(s.matricula) = LOWER(:login)', { login })
      .getOne();
    if (solicitanteComMesmoLogin) {
      throw new IdentificadorDuplicadoException(
        'Este identificador já pertence a um solicitante cadastrado.',
      );
    }
    const admin = this.repo.create({ ...dto, login });
    return this.repo.save(admin);
  }

  async atualizar(id: number, dto: AtualizarAdministradorDto) {
    const atual = await this.repo.findOne({ where: { id } });
    if (!atual) {
      throw new NaoEncontradoException('Administrador não encontrado.');
    }

    const perfilFinal = dto.perfil ?? atual.perfil;
    const ativoFinal = dto.ativo ?? atual.ativo;
    const continuaAdminAtivo =
      (perfilFinal as PerfilAdministrador) ===
        PerfilAdministrador.ADMINISTRADOR && ativoFinal;
    const eraAdminAtivo =
      (atual.perfil as PerfilAdministrador) ===
        PerfilAdministrador.ADMINISTRADOR && atual.ativo;
    if (eraAdminAtivo && !continuaAdminAtivo) {
      await this.garantirNaoEhUltimoAdmin(id);
    }

    await this.repo.update(id, dto);
    return this.buscar(id);
  }

  async inativar(id: number) {
    const admin = await this.buscar(id);
    if (!admin) return;
    if (
      (admin.perfil as PerfilAdministrador) ===
        PerfilAdministrador.ADMINISTRADOR &&
      admin.ativo
    ) {
      await this.garantirNaoEhUltimoAdmin(id);
    }
    admin.ativo = false;
    return this.repo.save(admin);
  }

  async converterEmSolicitante(id: number, dto: ConverterSolicitanteDto) {
    return this.repo.manager.transaction(async (manager) => {
      const adminRepo = manager.getRepository(Administrador);
      const solicitanteRepo = manager.getRepository(Solicitante);

      const admin = await adminRepo.findOne({ where: { id } });
      if (!admin) {
        throw new NaoEncontradoException('Administrador não encontrado.');
      }

      const matricula = (dto.matricula?.trim() || admin.login).trim();
      const duplicada = await solicitanteRepo
        .createQueryBuilder('s')
        .where('LOWER(s.matricula) = LOWER(:matricula)', { matricula })
        .getOne();
      if (duplicada) {
        throw new MatriculaDuplicadaException();
      }

      const outroAdmin = await adminRepo
        .createQueryBuilder('a')
        .where('LOWER(a.login) = LOWER(:matricula)', { matricula })
        .andWhere('a.id != :id', { id })
        .getOne();
      if (outroAdmin) {
        throw new IdentificadorDuplicadoException(
          'Este identificador já pertence a outro administrador.',
        );
      }

      if (
        (admin.perfil as PerfilAdministrador) ===
          PerfilAdministrador.ADMINISTRADOR &&
        admin.ativo
      ) {
        const outrosAdmins = await this.contarAdminsAtivos(adminRepo, id);
        if (outrosAdmins === 0) {
          throw new UltimoAdministradorException();
        }
      }

      const solicitante = solicitanteRepo.create({
        nome: admin.nome,
        tipo: dto.tipo,
        matricula,
        contato: dto.contato?.trim() || '',
        ativo: true,
      });
      const salvo = await solicitanteRepo.save(solicitante);

      admin.ativo = false;
      await adminRepo.save(admin);

      return salvo;
    });
  }

  private async garantirNaoEhUltimoAdmin(id: number) {
    const outrosAdmins = await this.contarAdminsAtivos(this.repo, id);
    if (outrosAdmins === 0) {
      throw new UltimoAdministradorException();
    }
  }

  private contarAdminsAtivos(
    repo: Repository<Administrador>,
    excetoId?: number,
  ) {
    const qb = repo
      .createQueryBuilder('admin')
      .where('admin.perfil = :perfil', {
        perfil: PerfilAdministrador.ADMINISTRADOR,
      })
      .andWhere('admin.ativo = true');
    if (excetoId !== undefined) {
      qb.andWhere('admin.id != :excetoId', { excetoId });
    }
    return qb.getCount();
  }
}
