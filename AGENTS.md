# AGENTS.md

Guia para agentes e pessoas que trabalham neste repositório (IFKey).

## Estrutura

- `backend/` — API NestJS + TypeORM + PostgreSQL.
- `frontend/` — SPA React 19 + Vite + TypeScript + Tailwind.
- `documentation/` — contrato da API e diagramas.

## Pré-requisitos

- Node.js 20+
- Docker (apenas para o PostgreSQL local)

## Banco de dados

O Postgres de desenvolvimento sobe na porta **5434** (`ifkey_db` / `postgres` / `postgres`).

```bash
cd backend
docker compose up -d db      # apenas o banco
```

## Backend

```bash
cd backend
npm install
npm run seed            # TRUNCATE + dados iniciais (admins, solicitante, 5 chaves)
npm run start:dev       # http://localhost:3000  (Swagger em /docs)
```

Configuração em `backend/.env` (não versionado; use `.env.example` como base).

## Frontend

```bash
cd frontend
npm install
npm run dev             # http://localhost:5173
```

Configuração em `frontend/.env` (`VITE_API_URL=http://localhost:3000/api`).

## Testes

### Frontend — E2E (Playwright)

```bash
cd frontend
npx playwright install --with-deps   # só na primeira vez
npm run test:e2e                     # chromium + firefox
npm run test:e2e:ui                  # modo interativo
npm run test:e2e:report              # abre o relatório HTML
```

- O `globalSetup` (`tests/global-setup.ts`) roda o `seed` do backend e limpa `tests/.auth/`.
- O `webServer` do `playwright.config.ts` sobe backend (porta 3000) e frontend (5173)
  automaticamente. Só o **Postgres** precisa estar no ar.
- As sessões de admin/gestor/solicitante são forjadas com JWT local e gravadas em
  `tests/.auth/*.json` (contêm tokens — **não versionar**, já no `.gitignore`).

### Throttle (importante para a suíte)

O backend limita requisições por IP (`ThrottlerModule`, padrão `100/min`). A suíte faz
muitas chamadas de `GET /auth/me` (uma por `apiFetch`) do mesmo IP, o que retornava
`429` e quebrava as telas. Duas medidas:

1. `GET /auth/me` é isento de throttle (`@SkipThrottle()` em `auth.controller.ts`).
2. O `webServer` do Playwright sobe o backend com `THROTTLE_LIMIT=100000`
   (override via env `THROTTLE_LIMIT` / `THROTTLE_TTL`).

### Backend — unit

```bash
cd backend
npm test
```

### Backend — e2e

```bash
cd backend
npm run test:e2e        # exige o Postgres no ar
```

> Atenção: o e2e faz `TRUNCATE` das tabelas. Rode `npm run seed` (ou a suíte Playwright,
> que já re-seeda) depois.

## Lint e typecheck

```bash
# frontend
cd frontend && npm run lint && npx tsc --noEmit

# backend
cd backend && npm run lint && npm run build
```

## Convenções

- Código e mensagens em **português (pt-BR)**.
- Não incluir comentários no código, salvo quando solicitado.
- Não commitar `.env`, tokens ou arquivos de `tests/.auth/`.
