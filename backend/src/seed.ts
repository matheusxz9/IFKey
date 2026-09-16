import 'reflect-metadata';
import { AppDataSource } from './data-source';
import { Administrador } from './administradores/administrador.entity';
import { Solicitante } from './solicitantes/solicitante.entity';
import { Chave } from './chaves/chave.entity';
import { StatusChave } from './common/enums/status-chave.enum';
import { TipoSolicitante } from './common/enums/tipo-solicitante.enum';
import { PerfilAdministrador } from './common/enums/perfil-administrador.enum';

async function seed() {
  await AppDataSource.initialize();
  await AppDataSource.query(
    'TRUNCATE TABLE emprestimo, chave, solicitante, administrador RESTART IDENTITY CASCADE',
  );
  // Administradores
  const adminRepo = AppDataSource.getRepository(Administrador);
  await adminRepo.insert([
    {
      nome: 'Matheus',
      login: 'matheus',
      perfil: PerfilAdministrador.ADMINISTRADOR,
    },
    {
      nome: 'Pedro',
      login: 'pedro',
      perfil: PerfilAdministrador.ADMINISTRADOR,
    },
  ]);
  // Chaves
  const chaveRepo = AppDataSource.getRepository(Chave);
  await chaveRepo.insert([
    {
      codigo: 'LAB-01',
      descricao: 'Laboratório de Informática 1',
      localizacao: 'Bloco A - Sala 1',
      status: StatusChave.DISPONIVEL,
      ativo: true,
    },
    {
      codigo: 'LAB-02',
      descricao: 'Laboratório de Quimica 1',
      localizacao: 'Bloco C - Sala 1',
      status: StatusChave.DISPONIVEL,
      ativo: true,
    },
    {
      codigo: 'LAB-03',
      descricao: 'Laboratório de Redes 1',
      localizacao: 'Bloco A - Sala 3',
      status: StatusChave.DISPONIVEL,
      ativo: true,
    },
    {
      codigo: 'LAB-04',
      descricao: 'Laboratório de Eletronica 1',
      localizacao: 'Bloco B - Sala 4',
      status: StatusChave.DISPONIVEL,
      ativo: true,
    },
    {
      codigo: 'LAB-05',
      descricao: 'Laboratório de Física 1',
      localizacao: 'Bloco D - Sala 1',
      status: StatusChave.DISPONIVEL,
      ativo: true,
    },
  ]);
  // Solicitantes
  const solicitanteRepo = AppDataSource.getRepository(Solicitante);
  await solicitanteRepo.insert([
    {
      nome: 'Felipe',
      tipo: TipoSolicitante.ALUNO,
      matricula: '20251038060031',
      contato: 'felipe@escolar.ifrn.edu.br',
      ativo: true,
    },
    {
      nome: 'João',
      tipo: TipoSolicitante.PROFESSOR,
      matricula: '20251038060032',
      contato: 'joao@escolar.ifrn.edu.br',
      ativo: true,
    },
    {
      nome: 'Maria',
      tipo: TipoSolicitante.SERVIDOR,
      matricula: '20251038060033',
      contato: 'maria@escolar.ifrn.edu.br',
      ativo: true,
    },
    {
      nome: 'Ana',
      tipo: TipoSolicitante.SERVIDOR,
      matricula: '20251038060035',
      contato: 'ana@escolar.ifrn.edu.br',
      ativo: true,
    },
    {
      nome: 'Carlos',
      tipo: TipoSolicitante.ALUNO,
      matricula: '20251038060034',
      contato: 'carlos@escolar.ifrn.edu.br',
      ativo: true,
    },
  ]);
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
