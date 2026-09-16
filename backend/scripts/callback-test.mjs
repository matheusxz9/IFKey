// Servidor de teste do login SUAP.
// Serve a página de callback na porta 5173 com as credenciais do .env.
// Uso: npm run callback:test
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = join(fileURLToPath(import.meta.url), '..');

function lerEnv(caminho) {
  const valores = {};
  try {
    for (const linha of readFileSync(caminho, 'utf-8').split('\n')) {
      const match = linha.match(/^([A-Z_]+)=(.*)$/);
      if (match) valores[match[1]] = match[2];
    }
  } catch {
    // sem .env — valores ficam vazios
  }
  return valores;
}

const env = lerEnv(join(__dirname, '..', '.env'));
const pagina = readFileSync(
  join(__dirname, '..', 'suap-callback', 'login', 'suap', 'callback', 'index.html'),
  'utf-8',
)
  .replace('__SUAP_CLIENT_ID__', env.SUAP_CLIENT_ID || '')
  .replace('__SUAP_REDIRECT_URI__', env.SUAP_REDIRECT_URI || '')
  .replace('__API_BASE__', `http://localhost:${process.env.PORT || 3000}`);

createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(pagina);
}).listen(5173, () => {
  console.log('Página de teste do login SUAP:');
  console.log('  http://localhost:5173/login/suap/callback');
});