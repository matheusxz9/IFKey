import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { Administrador } from '../administradores/administrador.entity';
import { Solicitante } from '../solicitantes/solicitante.entity';
import { PerfilAdministrador } from '../common/enums/perfil-administrador.enum';

async function main() {
  const [loginBruto, nomeBruto] = process.argv.slice(2);
  const login = loginBruto?.trim();
  const nome = nomeBruto?.trim();

  if (!login || !nome) {
    console.error('Uso: npm run admin:add -- <login> "<nome completo>"');
    process.exit(1);
  }
  if (login.length > 80) {
    console.error('O login deve ter no máximo 80 caracteres.');
    process.exit(1);
  }
  if (nome.length > 120) {
    console.error('O nome deve ter no máximo 120 caracteres.');
    process.exit(1);
  }

  await AppDataSource.initialize();
  try {
    await AppDataSource.transaction(async (manager) => {
      const adminRepo = manager.getRepository(Administrador);
      const solicitanteRepo = manager.getRepository(Solicitante);

      const solicitanteComMesmoIdentificador = await solicitanteRepo
        .createQueryBuilder('solicitante')
        .where('LOWER(solicitante.matricula) = LOWER(:login)', { login })
        .getOne();

      if (solicitanteComMesmoIdentificador) {
        throw new Error(
          `O identificador "${login}" já pertence a um solicitante cadastrado.`,
        );
      }

      const existente = await adminRepo
        .createQueryBuilder('admin')
        .where('LOWER(admin.login) = LOWER(:login)', { login })
        .getOne();

      if (existente) {
        await adminRepo.update(existente.id, {
          login,
          nome,
          perfil: PerfilAdministrador.ADMINISTRADOR,
          ativo: true,
        });
        console.log(
          `Admin restaurado: ${login} (${nome}) — perfil ADMINISTRADOR, ativo`,
        );
      } else {
        await adminRepo.insert({
          login,
          nome,
          perfil: PerfilAdministrador.ADMINISTRADOR,
          ativo: true,
        });
        console.log(`Admin criado: ${login} (${nome})`);
      }
    });
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
