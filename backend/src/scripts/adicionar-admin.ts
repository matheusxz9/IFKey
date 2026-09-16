import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { Administrador } from '../administradores/administrador.entity';
import { PerfilAdministrador } from '../common/enums/perfil-administrador.enum';

async function main() {
  const [login, nome] = process.argv.slice(2);
  if (!login || !nome) {
    console.error('Uso: npm run admin:add -- <login> "<nome completo>"');
    process.exit(1);
  }
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(Administrador);
  const existente = await repo.findOne({ where: { login } });
  if (existente) {
    await repo.update(existente.id, { nome, ativo: true });
    console.log(`Admin atualizado: ${login} (${nome})`);
  } else {
    await repo.insert({
      login,
      nome,
      perfil: PerfilAdministrador.ADMINISTRADOR,
      ativo: true,
    });
    console.log(`Admin criado: ${login} (${nome})`);
  }
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
