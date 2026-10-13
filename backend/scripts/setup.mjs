// Prepara o backend do zero: cria .env, sobe o Postgres, espera ficar pronto,
// roda migrations e popula dados de teste.
// Uso: npm run setup
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const backendDir = join(fileURLToPath(import.meta.url), '..', '..');
process.chdir(backendDir);

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: backendDir });
}

function carregarEnv() {
  const valores = {};
  for (const linha of readFileSync(join(backendDir, '.env'), 'utf-8').split('\n')) {
    const match = linha.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (match) valores[match[1]] = match[2];
  }
  return valores;
}

async function esperarPostgres(env) {
  const { Client } = pg;
  const client = new Client({
    host: env.DB_HOST || 'localhost',
    port: parseInt(env.DB_PORT || '5434', 10),
    user: env.DB_USERNAME || 'postgres',
    password: env.DB_PASSWORD || 'postgres',
    database: env.DB_NAME || 'ifkey_db',
  });

  for (let tentativa = 1; tentativa <= 30; tentativa++) {
    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return true;
    } catch {
      process.stdout.write('.');
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return false;
}

async function main() {
  if (!existsSync(join(backendDir, '.env'))) {
    copyFileSync(join(backendDir, '.env.example'), join(backendDir, '.env'));
    console.log('✔ Criado o arquivo .env a partir do .env.example');
  } else {
    console.log('✔ .env já existe (não vou sobrescrever)');
  }

  const env = carregarEnv();

  if (!env.SUAP_CLIENT_ID || !env.SUAP_CLIENT_SECRET) {
    console.log(
      '⚠️  SUAP_CLIENT_ID/SECRET estão vazios no .env — o login via SUAP não vai funcionar até preencher.',
    );
  }

  run('docker compose up -d db');

  process.stdout.write('\nAguardando o Postgres ficar pronto');
  const pronto = await esperarPostgres(env);
  if (!pronto) {
    console.error(
      '\n\n❌ Não consegui conectar no Postgres. Verifique se o Docker está rodando e se DB_HOST/DB_PORT no .env estão corretos.',
    );
    process.exit(1);
  }
  console.log('\n✔ Postgres pronto!');

  run('npm run migration:run');
  run('npm run seed');

  console.log(`
✅ Backend pronto para usar!

Próximos passos:
  1. Cadastre seu login do SUAP (a parte antes do @ do e-mail acadêmico):
       npm run admin:add -- <login> "<Nome Completo>"
  2. Suba a API em modo desenvolvimento:
       npm run start:dev
  3. (Opcional) Página de teste do login SUAP, em outro terminal:
       npm run callback:test

  API:      http://localhost:3000/api
  Swagger:  http://localhost:3000/docs
`);
}

main();
