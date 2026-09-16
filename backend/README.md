# IFKey — Backend (NestJS + TypeORM + Postgres)

API do sistema de controle de chaves. Todas as rotas têm o prefixo `/api`.

---

## 1. Pré-requisitos

- **Node.js** 24+ (testado na v24.19)
- **Docker** (para o banco Postgres)
- **npm**

---

## 2. Como rodar (passo a passo)

```bash
cd backend
```

### 2.1 Instalar as dependências

```bash
npm install
```

### 2.2 Criar o arquivo de configuração

```bash
cp .env.example .env
```

Abra o `.env` e preencha. Para **desenvolvimento local**, use:

```env
DB_HOST=localhost
DB_PORT=5434
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=ifkey_db

SUAP_CLIENT_ID=<pedir ao time>
SUAP_CLIENT_SECRET=<pedir ao time>
SUAP_REDIRECT_URI=http://localhost:5173/login/suap/callback

JWT_SECRET=qualquer-coisa-secreta
```

> ⚠️ As credenciais SUAP ficam **fora** do repositório (no `.env`, que é ignorado pelo git). Peça ao time se não tiver.

### 2.3 Subir o banco de dados

```bash
docker compose up -d db
```

O Postgres fica na porta **5434** (a 5433 costuma estar ocupada por outros projetos).

### 2.4 Criar as tabelas (migration)

```bash
npm run migration:run
```

### 2.5 Inserir dados de teste (seed)

```bash
npm run seed
```

Cria 2 administradores, 5 chaves e 5 solicitantes. **Idempotente**: pode rodar de novo.

### 2.6 Cadastrar um administrador (para logar)

```bash
npm run admin:add -- <login-do-suap> "<Nome Completo>"
```

Exemplo: `npm run admin:add -- m.william "Matheus William"`

> O `login` é a parte antes do `@` no e-mail acadêmico do SUAP da pessoa (ex.: `m.william@academico.ifrn.edu.br` → `m.william`).

### 2.7 Subir o servidor

```bash
npm run start:dev
```

A API responde em **http://localhost:3000/api** e a documentação Swagger em **http://localhost:3000/docs**.

---

## 3. Testar as rotas

> Dica: para facilitar, defina as variáveis abaixo no terminal:
> ```bash
> export API=http://localhost:3000/api
> export TOKEN="SEU_TOKEN"   # obtido no login (seção 3.2)
> ```

### 3.1 Login (via SUAP)

O login usa o SUAP (OAuth2). Para obter um token sem o frontend:

1. Acesse `http://localhost:5173/login/suap/callback` (página de teste) → clique **"Entrar com SUAP"** → autorize
2. A página mostra o `accessToken` — use-o no lugar de `SEU_TOKEN`
3. Para conferir se o token funciona:

```bash
curl $API/auth/me -H "Authorization: Bearer $TOKEN"
```

### 3.2 Solicitantes

```bash
# Listar (paginado)
curl $API/solicitantes

# Listar com filtros (nome, matricula, tipo, ativo) + paginação
curl "$API/solicitantes?nome=maria&tipo=ALUNO&ativo=true&page=1&limit=10"

# Detalhe
curl $API/solicitantes/1

# Criar (201)
curl -X POST $API/solicitantes \
  -H "Content-Type: application/json" \
  -d '{"nome":"Maria Silva","tipo":"ALUNO","matricula":"2024112345","contato":"maria@if.edu.br"}'

# Atualizar (parcial — PATCH)
curl -X PATCH $API/solicitantes/1 \
  -H "Content-Type: application/json" \
  -d '{"contato":"novo.email@if.edu.br"}'

# Inativar (soft delete — 204)
curl -X DELETE $API/solicitantes/1
```

**Casos de erro para testar:**
```bash
# Campo extra no body → 400 VALIDACAO
curl -X POST $API/solicitantes -H "Content-Type: application/json" \
  -d '{"nome":"X","tipo":"ALUNO","matricula":"1","contato":"x@if.edu.br","campo_extra":1}'

# Matrícula duplicada → 409 MATRICULA_DUPLICADA
curl -X POST $API/solicitantes -H "Content-Type: application/json" \
  -d '{"nome":"X","tipo":"ALUNO","matricula":"2024112345","contato":"x@if.edu.br"}'

# Tipo inválido → 400 VALIDACAO
curl -X POST $API/solicitantes -H "Content-Type: application/json" \
  -d '{"nome":"X","tipo":"ESTAGIARIO","matricula":"2024999999","contato":"x@if.edu.br"}'

# Não encontrado → 404 NAO_ENCONTRADO
curl $API/solicitantes/9999
```

### 3.3 Chaves

```bash
# Listar (paginado)
curl $API/chaves

# Listar disponíveis (UC1 do contrato) + busca
curl "$API/chaves?status=DISPONIVEL"
curl "$API/chaves?busca=lab"

# Detalhe
curl $API/chaves/1

# Criar (201) — status sempre inicia DISPONIVEL
curl -X POST $API/chaves \
  -H "Content-Type: application/json" \
  -d '{"codigo":"LAB-01","descricao":"Laboratório de Informática 1","localizacao":"Bloco A - Sala 1"}'

# Atualizar (status NÃO é editável — só pelo empréstimo)
curl -X PATCH $API/chaves/1 \
  -H "Content-Type: application/json" \
  -d '{"localizacao":"Bloco B - Sala 2"}'

# Inativar (soft delete — 204)
curl -X DELETE $API/chaves/1
```

**Casos de erro:**
```bash
# Código duplicado (case-insensitive) → 409 CODIGO_CHAVE_DUPLICADO
curl -X POST $API/chaves -H "Content-Type: application/json" \
  -d '{"codigo":"lab-01","descricao":"x","localizacao":"x"}'
```

### 3.4 Empréstimos (rotas protegidas — exigem o token)

```bash
# Registrar empréstimo (201)
curl -X POST $API/emprestimos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"solicitanteId":1,"chaveId":1,"observacoes":"Devolver até 18h"}'

# Registrar devolução (200)
curl -X PATCH $API/emprestimos/1/devolucao \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"observacoes":"Devolvida em bom estado"}'

# Listar empréstimos (filtros: status, solicitanteId, chaveId)
curl "$API/emprestimos?status=EMPRESTADA"

# Histórico de devolvidos (filtros: de, ate)
curl "$API/emprestimos/historico?de=2026-01-01&ate=2026-12-31"

# Detalhe
curl $API/emprestimos/1
```

**Casos de erro:**
```bash
# Sem token → 401 NAO_AUTENTICADO
curl -X POST $API/emprestimos -H "Content-Type: application/json" \
  -d '{"solicitanteId":1,"chaveId":1}'

# Chave já emprestada → 409 CHAVE_INDISPONIVEL
curl -X POST $API/emprestimos -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"solicitanteId":1,"chaveId":1}'

# Devolver empréstimo já devolvido → 409 EMPRESTIMO_JA_DEVOLVIDO
curl -X PATCH $API/emprestimos/1/devolucao -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{}'

# Inativar chave com empréstimo ativo → 409 RECURSO_COM_EMPRESTIMO_ATIVO
curl -X DELETE $API/chaves/1

# Solicitante inativo no empréstimo → 409 SOLICITANTE_INATIVO
curl -X PATCH $API/solicitantes/1 -H "Content-Type: application/json" -d '{"ativo":false}'
curl -X POST $API/emprestimos -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"solicitanteId":1,"chaveId":1}'
# (reabra o solicitante depois: -d '{"ativo":true}')
```

### 3.5 Formato de erro (importante para o frontend)

Toda resposta de erro segue o padrão:

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Chave indisponível para empréstimo.",
  "code": "CHAVE_INDISPONIVEL"
}
```

Códigos: `VALIDACAO` (400), `NAO_AUTENTICADO` (401), `SEM_PERMISSAO` (403), `NAO_ENCONTRADO` (404), `MATRICULA_DUPLICADA`, `CODIGO_CHAVE_DUPLICADO`, `CHAVE_INDISPONIVEL`, `SOLICITANTE_INATIVO`, `EMPRESTIMO_JA_DEVOLVIDO`, `RECURSO_COM_EMPRESTIMO_ATIVO` (409), `ERRO_INTERNO` (500).

### 3.6 Teste rápido de ponta a ponta (fluxo completo)

```bash
export API=http://localhost:3000/api
export TOKEN="SEU_TOKEN"

# 1. criar solicitante e chave
curl -X POST $API/solicitantes -H "Content-Type: application/json" \
  -d '{"nome":"Maria","tipo":"ALUNO","matricula":"2024111111","contato":"m@if.edu.br"}'
curl -X POST $API/chaves -H "Content-Type: application/json" \
  -d '{"codigo":"TST-01","descricao":"Chave de teste","localizacao":"Bloco T"}'

# 2. emprestar (chave vira EMPRESTADA)
curl -X POST $API/emprestimos -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"solicitanteId":1,"chaveId":1}'

# 3. conferir que a chave ficou emprestada
curl $API/chaves/1

# 4. devolver (chave volta a DISPONIVEL)
curl -X PATCH $API/emprestimos/1/devolucao -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{}'

# 5. ver no histórico
curl "$API/emprestimos/historico"
```

---

## 4. Testes automatizados

```bash
npm test              # testes unitários (9)
npm run test:e2e      # testes de integração (11) — precisa do banco rodando
```

> ⚠️ O `test:e2e` **limpa as tabelas** (TRUNCATE) no início. Depois dele, rode de novo `npm run seed` e `npm run admin:add` para restaurar os dados de desenvolvimento.

---

## 5. Problemas comuns

| Problema | Solução |
|---|---|
| Login retorna `403 SEM_PERMISSAO` | Seu login SUAP não está na tabela `administrador`. Rode `npm run admin:add -- <login> "<Nome>"` |
| Porta 3000 ocupada | Mude `PORT` no `.env` |
| `migration:run` dá erro de conexão | Confira se o banco está no ar (`docker compose up -d db`) e o `.env` com `DB_HOST/DB_PORT` corretos |
| CORS bloqueando o frontend | O backend já libera `http://localhost:5173`. Se usar outra porta, adicione no `main.ts` |
| Banco "sujo" | `npm run seed` reinicia os dados (TRUNCATE + insert) |

---

## 6. Estrutura de pastas

```
src/
  auth/          # Login SUAP (OAuth2) + JWT
  chaves/        # CRUD de chaves
  solicitantes/  # CRUD de solicitantes
  emprestimos/   # Empréstimos, devolução e histórico
  administradores/  # Entidade do administrador
  common/
    enums/       # Enums do domínio e códigos de erro
    exceptions/  # Exceções de negócio
    filters/     # Filtro global de erro
    dto/         # Paginação
  migrations/    # Migrations do banco
  scripts/       # Scripts auxiliares (admin:add)
  seed.ts        # Dados de demonstração
```