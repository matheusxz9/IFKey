# IFKey — Frontend (React + Vite + TypeScript)

SPA do sistema de controle de empréstimo de chaves do IFRN. Consome a API do
[`backend/`](../backend/README.md); o contrato HTTP está em
[`documentation/contrato-api.md`](../documentation/contrato-api.md).

## Pré-requisitos

- Node.js 20.19+ (ou 22.12+)
- Backend no ar (veja [`backend/README.md`](../backend/README.md))
- npm

## Rodando

```bash
npm install
cp .env.example .env   # ajuste VITE_API_URL, VITE_CLIENT_ID e VITE_REDIRECT_URI
npm run dev            # http://localhost:5173
```

Variáveis do `.env` (não versionado):

| Variável | Descrição |
|---|---|
| `VITE_API_URL` | Base da API (ex.: `http://localhost:3000/api`) |
| `VITE_CLIENT_ID` | Client ID do app OAuth registrado no SUAP (pedir ao time) |
| `VITE_REDIRECT_URI` | Callback do login (`http://localhost:5173/login/suap/callback`) |

## Scripts

```bash
npm run dev             # servidor de desenvolvimento
npm run build           # typecheck (tsc -b) + build de produção
npm run preview         # serve o build de produção
npm run lint            # ESLint
npm run test:e2e        # Playwright (chromium + firefox)
npm run test:e2e:ui     # Playwright em modo interativo
npm run test:e2e:report # abre o relatório HTML
```

## Estrutura

```
src/
  components/   # componentes reutilizáveis (DataTable, Modal, Pagination, ...)
  contexts/     # AuthContext (sessão/perfil) e ToastContext
  pages/        # telas (login, chaves, histórico, gestão)
  services/     # acesso à API via apiFetch (token, refresh e AppError)
  types/        # tipos compartilhados
tests/          # suíte E2E do Playwright (fixtures em tests/fixtures)
```

As rotas e a proteção por perfil ficam em `src/App.tsx` (`ProtectedRoute`). O acesso à API
passa pelos `services/`, que usam o `fetch` central de `services/api.ts`; os fluxos de login
SUAP ficam em `LoginPage`/`SuapCallbackPage` e `AuthContext`.

## Testes E2E

```bash
npx playwright install --with-deps  # só na primeira vez
npm run test:e2e
```

- O `webServer` do `playwright.config.ts` sobe backend (3000) e frontend (5173)
  automaticamente; basta o Postgres estar no ar, com as dependências dos dois instaladas.
- O `globalSetup` roda o `seed` do backend e o projeto `setup` forja as sessões
  admin/gestor/solicitante em `tests/.auth/` (contêm tokens — não versionar).
- Convenções e fluxo de trabalho: [`AGENTS.md`](../AGENTS.md).
