# AGENTS.md

Instruções para agentes de IA neste repositório (IFKey). Valem para todo o monorepo — não há
AGENTS.md em subdiretórios. Se algo aqui divergir do código, o código vence: siga o comportamento
real e atualize este arquivo.

## O projeto

Sistema de controle de empréstimo de chaves do IFRN (projeto integrador):

- API REST com prefixo `/api` e SPA que a consome.
- Login via SUAP (OAuth2) + JWT/refresh token; perfis `ADMINISTRADOR`, `GESTOR` e `SOLICITANTE`.
- Fluxo central: um solicitante pega uma chave emprestada e depois a devolve. `chave.status`
  (`DISPONIVEL`/`EMPRESTADA`) muda apenas pelo fluxo de empréstimo/devolução.
- Contrato HTTP vigente: `documentation/contrato-api.md`; o Swagger em `/docs` é a fonte viva.

## Mapa do repositório

- `backend/src/` — NestJS + TypeORM + PostgreSQL. Um módulo por domínio (`auth/`, `chaves/`,
  `solicitantes/`, `emprestimos/`, `administradores/`), com entity, controller, service, `dto/` e
  specs. `common/` guarda enums, exceções, filtro global e paginação; `migrations/` e `seed.ts`
  cuidam do banco.
- `frontend/src/` — React + Vite + TypeScript + Tailwind. `pages/`, `components/`, `contexts/`
  (Auth/Toast), `services/` (acesso à API) e `types/`; as rotas em `App.tsx` são protegidas por
  `ProtectedRoute` conforme o perfil.
- `frontend/tests/` — E2E Playwright (fixtures em `tests/fixtures/`). `documentation/` — contrato e
  diagramas. `.github/workflows/ci.yml` — verificações do CI.
- Não existe workspace npm na raiz: rode os comandos dentro de `backend/` ou `frontend/`.

## Preparar o ambiente

Pré-requisitos: Node.js 20.19+ (ou 22.12+; o CI usa Node 20), Docker e npm.

```bash
cd backend
npm install
npm run setup        # cria o .env, sobe o Postgres (5434), roda migrations e seed
npm run start:dev    # http://localhost:3000/api  (Swagger: /docs)
```

- Credenciais SUAP ficam em `backend/.env` (não versionado; base: `.env.example`). Sem elas o login
  via SUAP não funciona, mas o restante da API sim. Para entrar, cadastre seu login:
  `npm run admin:add -- <login-do-suap> "<Nome Completo>"`.
- Passos manuais: `docker compose up -d db`, `npm run migration:run`, `npm run seed`.
- Opcional, para testar o login sem o frontend: `npm run callback:test`.
- Frontend: `cd frontend && npm install && cp .env.example .env && npm run dev` (porta 5173).

## Testes

Backend (Jest):

```bash
cd backend
npm test          # unitários, sem banco
npm run test:e2e  # integração; exige Postgres e faz TRUNCATE das tabelas
```

Rode `npm run seed` após o `test:e2e` para restaurar os dados de desenvolvimento. Há mocks de
módulos ESM-only em `jest.setup.ts` e `test/jest-e2e.setup.ts` — não os remova e estenda-os se
adicionar imports ESM.

Frontend (Playwright, apenas E2E):

```bash
cd frontend
npm run test:e2e        # chromium + firefox
npm run test:e2e:ui     # modo interativo
npm run test:e2e:report # abre o relatório HTML
```

- O `webServer` sobe backend e frontend automaticamente (só o Postgres precisa já estar no ar, e as
  dependências instaladas). Fora do CI ele reaproveita servidores já rodando — reinicie-os se tiver
  alterado o código. O `globalSetup` roda `npm run seed`.
- O projeto `setup` forja sessões admin/gestor/solicitante (JWT assinado com o `JWT_SECRET`) em
  `tests/.auth/`; esses arquivos contêm tokens e não podem ser versionados nem expostos.
- A API limita requisições por IP (padrão 100/min), mas `GET /auth/me` é isento e o Playwright sobe
  o backend com `THROTTLE_LIMIT=100000`. Se a suíte retornar 429, verifique esse override antes de
  mexer no throttle.

## Verificações antes de concluir

```bash
# backend — mesmas etapas do CI
cd backend && npm run lint && npm run build && npm test

# frontend
cd frontend && npm run lint && npm run build
```

- O `lint` do backend roda Prettier com `--fix` (altera arquivos); o do frontend só reporta.
- No frontend, `npx tsc --noEmit` na raiz não verifica nada (project references com `files: []`);
  use `npx tsc -b` (igual ao CI) ou `npm run build`.
- Rode também o `test:e2e` do módulo afetado quando a mudança chegar no fluxo coberto. Se alguma
  verificação não puder ser executada, diga qual e por quê.

## Convenções

- Código, mensagens de erro e textos de UI em português (pt-BR): `listar`, `ativo`, `CriarChaveDto`.
- Evite comentários; o código atual comenta apenas decisões não óbvias (locks, throttle, contornos).
- Backend: controller fino, regra de negócio no service, repositório via `@InjectRepository`.
  Novas entradas devem usar DTO com `class-validator` — o `ValidationPipe` global rejeita campo
  extra nos DTOs (os fluxos de auth são exceções pontuais).
- Erros: use/estenda `AppException` (`common/exceptions/app.exception.ts`) com um código de
  `common/enums/codigo-erro.enum.ts`; o filtro global devolve `{ statusCode, error, message, code }`.
- Listagens: `page`/`limit` (default 20, 10 em administradores; máx. 100) e resposta `{ data, meta }`.
  Exceção: `GET /administradores` devolve `{ data, total, page, limit, totalPages }`.
- Rotas protegidas usam `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)`. `SOLICITANTE` só
  opera em nome próprio (empresta para si e só vê os próprios empréstimos).
- Frontend: acesse a API pelos `services/*` com `apiFetch` (injeta token, renova sessão e converte
  erro em `AppError`); não use `fetch` direto em páginas/componentes (exceções: fluxos de auth em
  `AuthContext` e `SuapCallbackPage`). Reaproveite `components/` e classes Tailwind.

## Regras de domínio

- Chave tem no máximo um empréstimo ativo; criar/devolver empréstimo e atualizar `chave.status`
  acontecem na mesma transação.
- Exclusões são soft delete (`ativo = false`); não apague registros.
- Unicidade case-insensitive: `chave.codigo`, `solicitante.matricula` e `administrador.login`, sem
  colisão entre login de administrador e matrícula de solicitante.
- Nunca deixe o sistema sem `ADMINISTRADOR` ativo (`ULTIMO_ADMINISTRADOR`).
- Datas de empréstimo/devolução são geradas no servidor, nunca vêm do cliente.

## Como trabalhar

- Leia o fluxo existente antes de mudar (controller → service → entidade/DTO → serviço e tipos do
  frontend → contrato) e reaproveite padrões e abstrações já adotados.
- Prefira a solução mais simples que atenda; não refatore além do escopo nem introduza dependências
  ou renomeações sem necessidade demonstrada.
- Não invente comandos, rotas, campos, variáveis de ambiente ou funcionalidades.
- Mudou o contrato? Ajuste backend, frontend consumidor e `documentation/contrato-api.md` na mesma
  tarefa. Mudança de schema exige migration em `backend/src/migrations/` (não há `synchronize`),
  criada com `npm run migration:generate -- src/migrations/Nome`, e `seed.ts` coerente.
- Preserve alterações preexistentes do usuário e nunca sobrescreva trabalho não relacionado.
- Diante de decisão ambígua com efeito público (rota, payload, regra), pergunte antes de implementar.
- Ao terminar, resuma o que mudou, o que foi validado e o que não pôde ser validado.

## Segurança

- Nunca versione nem exponha `backend/.env`, `frontend/.env` ou `frontend/tests/.auth/*` (tokens);
  evite imprimir o conteúdo deles. Use os `.env.example` como referência.
- `npm run seed` e `npm run test:e2e` (backend) fazem TRUNCATE: confirme que são dados locais antes
  de rodar.
- Não reescreva histórico Git nem descarte mudanças de terceiros.

## Documentação

- Referências: `README.md`, `backend/README.md`, `frontend/README.md` e
  `documentation/contrato-api.md`.
- Atualize o contrato quando rota, payload, erro, paginação ou regra mudar. Mudança interna sem
  efeito no contrato não exige documentação nova.
