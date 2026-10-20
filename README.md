# IFKEY

Sistema de controle de empréstimo de chaves do IFRN. Projeto integrador I — 4º período do curso de Tecnologia em Sistemas para Internet.

## Tecnologias

- **Backend:** NestJS + TypeORM + PostgreSQL
- **Frontend:** React + Vite + TypeScript

## Estrutura do repositório

```
├── backend/         # API (NestJS) — veja backend/README.md
├── frontend/        # SPA (React + Vite) — veja frontend/README.md
└── documentation/   # Diagramas e contrato da API
```

## Rodando o backend (jeito mais rápido)

Pré-requisitos: **Node.js 20.19+** (o CI usa Node 20), **Docker** e **npm**.

```bash
cd backend
npm install
npm run setup      # cria o .env, sobe o banco, roda migrations e o seed
npm run start:dev  # sobe a API em http://localhost:3000/api
```

O `npm run setup` cuida de quase tudo sozinho. Depois, para poder logar, cadastre seu
usuário administrador:

```bash
npm run admin:add -- <login-do-suap> "<Nome Completo>"
```

> ⚠️ As credenciais do SUAP ficam **fora** do repositório (no `backend/.env`). Peça ao time
> e cole no `.env`. Sem elas o login via SUAP não funciona, mas o restante da API sim.

Documentação completa, testes de rotas e solução de problemas: **[`backend/README.md`](backend/README.md)**.

## Rodando o frontend

Pré-requisito: o backend no ar (acima).

```bash
cd frontend
npm install
cp .env.example .env   # ajuste VITE_API_URL, VITE_CLIENT_ID e VITE_REDIRECT_URI
npm run dev            # abre em http://localhost:5173
```

## Documentação

- [`backend/README.md`](backend/README.md) — como rodar, testar e usar a API
- [`frontend/README.md`](frontend/README.md) — como rodar a SPA
- [`documentation/contrato-api.md`](documentation/contrato-api.md) — contrato da API
- [`documentation/diagrams`](documentation/diagrams) — DER e diagrama de casos de uso
