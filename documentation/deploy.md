# Deploy

## URLs de produção

| Serviço | URL |
| --- | --- |
| Frontend (Vercel) | https://ifkey.vercel.app |
| API (Render) | https://ifkey-api.onrender.com/api |
| Swagger | https://ifkey-api.onrender.com/docs |

## Backend — Render

- Serviço: `ifkey-api` (Web Service, runtime Node, região Virginia).
- Repositório: `https://github.com/matheusxz9/IFKey`, branch `main`, root directory `backend`.
- Build: `npm ci --include=dev && npm run build`.
- Start: `npm run migration:run && npm run start:prod` (as migrations rodam a cada deploy).
- Health check: `/api`.
- Auto-deploy: habilitado para pushes na `main`.

Variáveis de ambiente configuradas no Render:

- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`
- `CORS_ORIGIN=https://ifkey.vercel.app`
- `SUAP_CLIENT_ID`, `SUAP_CLIENT_SECRET`
- `SUAP_REDIRECT_URI=https://ifkey.vercel.app/login/suap/callback`
- `THROTTLE_TTL`, `THROTTLE_LIMIT`
- `DEMO_LOGIN_ENABLED`, `DEMO_ADMIN_PASSWORD`, `DEMO_GESTOR_PASSWORD`,
  `DEMO_SOLICITANTE_PASSWORD` (apenas durante a demonstração)

## Frontend — Vercel

- Projeto: `ifkey` (root directory `frontend`, framework Vite).
- Build: `npm run build`; output: `dist`.
- Auto-deploy: habilitado para a branch `main`.
- Rewrite de SPA (React Router) em `frontend/vercel.json`.

Variáveis de ambiente (Production e Preview):

- `VITE_API_URL=https://ifkey-api.onrender.com/api`
- `VITE_CLIENT_ID` (mesmo client ID do SUAP usado no backend)
- `VITE_REDIRECT_URI=https://ifkey.vercel.app/login/suap/callback`
- `VITE_DEMO_LOGIN_ENABLED=true` (apenas durante a demonstração)

## Banco — Render Postgres

- Instância: `ifkey-db`, Postgres 16, plano free, região Virginia.
- Banco/usuário: `ifkey_db` / `ifkey`.
- As migrations são aplicadas automaticamente no start do backend.
- O plano free expira em **18/12/2026**. Antes disso, migre para um plano pago ou outro Postgres.

## Login SUAP

O app OAuth do SUAP precisa ter exatamente esta Redirect URI cadastrada:

```
https://ifkey.vercel.app/login/suap/callback
```

Ela também está em `SUAP_REDIRECT_URI` (backend) e `VITE_REDIRECT_URI` (frontend).

## Primeiro administrador

O banco de produção não é populado pelo seed. Cadastre o primeiro admin apontando o backend
para o banco de produção:

```bash
cd backend
npm run admin:add -- <login-do-suap> "<Nome Completo>"
```

O login precisa ser o identificador que o SUAP devolve (matrícula ou usuário).

## Login de demonstração

Para avaliação sem compartilhar contas do SUAP, o backend expõe `POST /auth/demo` e o frontend
mostra um formulário de acesso de demonstração. A migration `SeedDemo` cria os perfis
`demo.admin`, `demo.gestor` e `demo.solicitante` e dados de exemplo (solicitantes, chaves e
empréstimos). Nada disso depende do SUAP.

No Render, configure:

- `DEMO_LOGIN_ENABLED=true`
- `DEMO_ADMIN_PASSWORD`, `DEMO_GESTOR_PASSWORD`, `DEMO_SOLICITANTE_PASSWORD` com senhas próprias
  da demonstração (diferentes das contas reais)

Na Vercel, configure `VITE_DEMO_LOGIN_ENABLED=true` e gere um novo deploy (a variável é embutida no
build).

Para encerrar o acesso após a apresentação:

1. No Render, mude `DEMO_LOGIN_ENABLED` para `false`. Tokens e refresh tokens demo passam a ser
   recusados imediatamente.
2. Na Vercel, mude `VITE_DEMO_LOGIN_ENABLED` para `false` e gere um novo deploy para esconder o
   formulário.
3. Opcionalmente, inative os perfis demo no banco (o recurso de demonstração já fica bloqueado
   pela flag).

As senhas de demonstração não devem ser versionadas; mantenha-as apenas no Render e no formulário
entregue à avaliação.

## Limitações do plano free

- O Web Service hiberna após 15 minutos sem requisições; a primeira chamada pode demorar cerca de 1 minuto.
- O Postgres free expira 30 dias após a criação.
