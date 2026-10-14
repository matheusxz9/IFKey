# Contrato da API — IFKey

> **Status:** implementado — reflete a API atual
> **Issue:** [#8 — Definir contrato de rotas da API](https://github.com/matheusxz9/IFKey/issues/8)
> **Última atualização:** 2026-10-14
>
> Este documento define o contrato HTTP entre frontend e backend. A fonte viva é o
> **Swagger** em `http://localhost:3000/docs`; mudanças no código devem ser refletidas aqui.

---

## 1. Visão geral

| Item | Definição |
|---|---|
| Base URL (dev) | `http://localhost:3000/api` (porta configurável via `PORT`; prefixo global `/api` aplicado) |
| Formato | JSON (`application/json; charset=utf-8`) |
| Datas | ISO 8601 com offset — ex.: `2026-09-10T14:30:00-03:00` (persistir em UTC no banco) |
| Nomenclatura | `camelCase` nos payloads (mapeamento para o `snake_case` do DER na §8) |
| Autenticação | `Authorization: Bearer <JWT>` — login SUAP/OAuth2 + refresh token (ver §5.2) |
| CORS | Liberado para a origem do frontend em desenvolvimento (ex.: `http://localhost:5173`) |

## 2. Enums

| Enum | Valores |
|---|---|
| `TipoSolicitante` | `ALUNO`, `PROFESSOR`, `SERVIDOR` |
| `StatusChave` | `DISPONIVEL`, `EMPRESTADA` |
| `StatusEmprestimo` | `EMPRESTADA`, `DEVOLVIDA` |
| `PerfilAdministrador` | `ADMINISTRADOR`, `GESTOR`, `SOLICITANTE` |

> `ADMINISTRADOR` e `GESTOR` são papéis de administrador (com `login`); `SOLICITANTE`
> é o perfil efetivo de quem se autentica pela matrícula (ver §5.2).

## 3. Listagem e paginação

Todas as rotas de listagem aceitam:

| Query param | Tipo | Default | Descrição |
|---|---|---|---|
| `page` | int ≥ 1 | `1` | Página |
| `limit` | int (1–100) | `20` (admins: `10`) | Itens por página |

Resposta padrão de listagem:

```json
{
  "data": [],
  "meta": { "page": 1, "limit": 20, "total": 57, "totalPages": 3 }
}
```

## 4. Formato de erro

Padrão do NestJS + campo `code` estável (para o frontend tratar sem depender da mensagem):

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Chave LAB-01 já está emprestada",
  "code": "CHAVE_INDISPONIVEL"
}
```

Erro de validação (`class-validator`), HTTP 400:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": ["nome não pode ser vazio", "tipo deve ser ALUNO, PROFESSOR ou SERVIDOR"],
  "code": "VALIDACAO"
}
```

## 5. Endpoints

### 5.1 Resumo

| Método | Rota | Auth (perfis) | Descrição |
|---|---|---|---|
| POST | `/auth/suap` | público | Troca o `code` do SUAP por tokens (JWT + refresh) |
| POST | `/auth/refresh` | público | Renova o par de tokens a partir do `refreshToken` |
| POST | `/auth/logout` | autenticado | Revoga o `refreshToken` |
| GET | `/auth/me` | autenticado | Dados do usuário autenticado (admin ou solicitante) |
| GET | `/solicitantes` | ADMIN, GESTOR, SOLICITANTE | Lista solicitantes (filtros: `nome`, `matricula`, `tipo`, `ativo`) |
| GET | `/solicitantes/:id` | ADMIN, GESTOR, SOLICITANTE | Detalhe do solicitante |
| POST | `/solicitantes` | ADMIN, GESTOR | Cadastra solicitante |
| PATCH | `/solicitantes/:id` | ADMIN, GESTOR | Atualiza solicitante (parcial) |
| DELETE | `/solicitantes/:id` | ADMIN, GESTOR | Inativa solicitante (soft delete) |
| GET | `/chaves` | ADMIN, GESTOR, SOLICITANTE | Lista chaves (filtros: `status`, `ativo`, `busca`) |
| GET | `/chaves/:id` | ADMIN, GESTOR, SOLICITANTE | Detalhe da chave |
| POST | `/chaves` | ADMIN, GESTOR | Cadastra chave |
| PATCH | `/chaves/:id` | ADMIN, GESTOR | Atualiza chave (parcial) |
| DELETE | `/chaves/:id` | ADMIN, GESTOR | Inativa chave (soft delete) |
| POST | `/emprestimos` | ADMIN, GESTOR, SOLICITANTE | Registra empréstimo |
| PATCH | `/emprestimos/:id/devolucao` | ADMIN, GESTOR, SOLICITANTE | Registra devolução |
| GET | `/emprestimos` | ADMIN, GESTOR, SOLICITANTE | Lista empréstimos (filtro `status`, `solicitanteId`, `chaveId`) |
| GET | `/emprestimos/historico` | ADMIN, GESTOR, SOLICITANTE | Histórico (filtros `de`, `ate`, `solicitanteId`, `chaveId`) |
| GET | `/emprestimos/:id` | ADMIN, GESTOR, SOLICITANTE | Detalhe do empréstimo |
| GET | `/administradores` | ADMIN, GESTOR | Lista administradores (filtros: `nome`, `login`, `perfil`, `ativo`) |
| GET | `/administradores/:id` | ADMIN, GESTOR | Detalhe do administrador |
| POST | `/administradores` | ADMIN | Cadastra administrador |
| PATCH | `/administradores/:id` | ADMIN | Atualiza administrador (parcial) |
| DELETE | `/administradores/:id` | ADMIN | Inativa administrador (soft delete) |

> Todas as rotas (exceto `/auth/suap` e `/auth/refresh`) exigem `Authorization: Bearer <JWT>`;
> os perfis são checados por rota (coluna Auth). `401 NAO_AUTENTICADO` sem token válido/expirado;
> `403 SEM_PERMISSAO` quando o perfil não tem permissão.

> **Solicitante escopado:** quando o autenticado é `SOLICITANTE`, ele opera apenas sobre si
> mesmo — `POST /emprestimos` ignora o `solicitanteId` enviado (usa o próprio id) e
> `GET /emprestimos/historico` retorna somente os registros dele.

> **Atenção NestJS:** declarar `GET /emprestimos/historico` **antes** de `GET /emprestimos/:id`,
> senão `historico` é interpretado como `:id`.

### 5.2 Auth — SUAP (OAuth2) + JWT

O `ADMINISTRADOR` **não possui senha**; o login é feito pelo SUAP (OAuth2). O backend troca o
`code` recebido no callback por um **access token** (JWT, 15 min) e um **refresh token** opaco
(7 dias, rotativo).

```
POST /auth/suap
{ "code": "<authorization code do SUAP>" }

200 OK
{
  "accessToken": "<jwt>",
  "refreshToken": "<token opaco>",
  "user": {
    "id": 1,
    "nome": "João Souza",
    "tipo": "admin",
    "login": "joao.souza",
    "perfil": "ADMINISTRADOR"
  }
}
```

- Resolução da identidade no SUAP: primeiro por `login` (administrador ativo); se não houver,
  por `matrícula` (solicitante ativo). Sem cadastro ativo correspondente → `403 SEM_PERMISSAO`.
- O `login` do administrador é derivado da conta SUAP (parte antes do `@` do e-mail acadêmico).
- `POST /auth/refresh` (público) — body `{ "refreshToken": "<token>" }` → novo par
  `{ accessToken, refreshToken, user }`. O refresh antigo é **revogado** a cada uso.
  Token inválido/expirado → `403 SEM_PERMISSAO`.
- `POST /auth/logout` (autenticado) — body `{ "refreshToken": "<token>" }` → revoga o token
  (`{ "message": "Logout realizado com sucesso." }`).
- `GET /auth/me` (autenticado):
  - admin → `{ "id": 1, "nome": "...", "login": "...", "perfil": "ADMINISTRADOR", "tipo": "admin" }`
  - solicitante → `{ "id": 5, "nome": "...", "matricula": "...", "perfil": "SOLICITANTE", "tipo": "solicitante" }`
- Rotas protegidas exigem `Authorization: Bearer <JWT>`; `401 NAO_AUTENTICADO` sem token/expirado.

### 5.3 Solicitantes

**Objeto `Solicitante`:**

```json
{
  "id": 1,
  "nome": "Maria Silva",
  "tipo": "ALUNO",
  "matricula": "2024112345",
  "contato": "maria.silva@estudante.if.edu.br",
  "ativo": true
}
```

**`GET /solicitantes`** — filtros: `nome` (busca parcial), `matricula` (exata — usada no form de
empréstimo), `tipo`, `ativo` (opcional; se omitido traz ativos **e** inativos), `page`, `limit`.
Ordenação: `nome` asc.

**`POST /solicitantes`**

```json
{ "nome": "Maria Silva", "tipo": "ALUNO", "matricula": "2024112345", "contato": "maria.silva@estudante.if.edu.br" }
```

- `201` → objeto criado (`ativo` default `true`)
- `400 VALIDACAO` · `409 MATRICULA_DUPLICADA`

**`PATCH /solicitantes/:id`** — qualquer subconjunto de `nome`, `tipo`, `matricula`, `contato`, `ativo`.

**`DELETE /solicitantes/:id`**

- `204` e `ativo = false` (soft delete)
- `404 NAO_ENCONTRADO` · `409 RECURSO_COM_EMPRESTIMO_ATIVO`

### 5.4 Chaves

**Objeto `Chave`:**

```json
{
  "id": 3,
  "codigo": "LAB-01",
  "descricao": "Chave do Laboratório de Informática 1",
  "localizacao": "Bloco A — Sala 12",
  "status": "DISPONIVEL",
  "dataCadastro": "2026-09-01T10:00:00-03:00",
  "ativo": true
}
```

**`GET /chaves`** — filtros: `status`, `ativo` (opcional; se omitido traz ativos **e** inativos),
`busca` (todas as palavras informadas, em qualquer ordem — `codigo`/`descricao`/`localizacao`),
`page`, `limit`. Ordenação: `codigo` asc.

- Consultar disponibilidade (UC1): `GET /chaves?status=DISPONIVEL`

**`POST /chaves`**

```json
{ "codigo": "LAB-01", "descricao": "Chave do Laboratório de Informática 1", "localizacao": "Bloco A — Sala 12" }
```

- `201` → `status` sempre inicia como `DISPONIVEL`
- `400 VALIDACAO` · `409 CODIGO_CHAVE_DUPLICADO`

**`PATCH /chaves/:id`** — `codigo`, `descricao`, `localizacao`, `ativo`.
`status` **não é editável** por aqui: é alterado apenas pelo fluxo de empréstimo/devolução.

**`DELETE /chaves/:id`** — `204` (soft delete) · `409 RECURSO_COM_EMPRESTIMO_ATIVO`.

### 5.5 Empréstimos

**Objeto `Emprestimo` (resposta):**

```json
{
  "id": 10,
  "solicitante": { "id": 1, "nome": "Maria Silva", "matricula": "2024112345", "tipo": "ALUNO" },
  "chave": { "id": 3, "codigo": "LAB-01", "descricao": "Chave do Laboratório de Informática 1" },
  "administrador": { "id": 1, "nome": "João Souza" },
  "dataHoraEmprestimo": "2026-09-10T14:30:00-03:00",
  "dataHoraDevolucao": null,
  "status": "EMPRESTADA",
  "observacoes": "Devolver até as 18h"
}
```

> `administrador` é quem registrou o empréstimo (extraído do JWT) — também no caso de um
> `SOLICITANTE` registrando para si.

**`POST /emprestimos`**

```json
{ "solicitanteId": 1, "chaveId": 3, "observacoes": "Devolver até as 18h" }
```

- `201` → empréstimo criado; `administrador` vem do JWT; `dataHoraEmprestimo` = agora (servidor);
  `chave.status` → `EMPRESTADA` na mesma transação
- `400 VALIDACAO` · `404 NAO_ENCONTRADO` (solicitante/chave)
- `409 CHAVE_INDISPONIVEL` (chave emprestada ou inativa)
- `409 SOLICITANTE_INATIVO`
- para `SOLICITANTE`, o `solicitanteId` do body é ignorado (usa o próprio)

**`PATCH /emprestimos/:id/devolucao`**

```json
{ "observacoes": "Devolvida em bom estado" }
```

(body opcional)

- `200` → empréstimo com `status = DEVOLVIDA`, `dataHoraDevolucao` = agora (servidor);
  `chave.status` → `DISPONIVEL` na mesma transação
- `404 NAO_ENCONTRADO` · `409 EMPRESTIMO_JA_DEVOLVIDO`

**`GET /emprestimos`** — filtros: `status` (`EMPRESTADA`/`DEVOLVIDA`), `solicitanteId`, `chaveId`, `page`, `limit`.
Ordenação padrão: `dataHoraEmprestimo` desc.

- Empréstimos ativos: `GET /emprestimos?status=EMPRESTADA`

**`GET /emprestimos/historico`** — traz todos os empréstimos: primeiro os ativos (`EMPRESTADA`),
depois os `DEVOLVIDA`; dentro de cada grupo, `dataHoraEmprestimo` desc.
Filtros: `de`, `ate` (inclusivos; aceitam `YYYY-MM-DD` ou data ISO — sobre `dataHoraEmprestimo`),
`solicitanteId`, `chaveId`. Para autenticado `SOLICITANTE`, retorna apenas os registros dele.

**`GET /emprestimos/:id`** — detalhe · `404 NAO_ENCONTRADO`.

### 5.6 Administradores

**Objeto `Administrador`:**

```json
{ "id": 2, "nome": "João Souza", "login": "joao.souza", "perfil": "GESTOR", "ativo": true }
```

**`GET /administradores`** (ADMIN, GESTOR) — filtros: `nome`, `login` (busca parcial), `perfil`,
`ativo` (opcional), `page`, `limit` (default `10`). Ordenação: `nome` asc.

**`POST /administradores`** (apenas ADMIN)

```json
{ "nome": "João Souza", "login": "joao.souza", "perfil": "GESTOR" }
```

- `201` → objeto criado (`ativo` default `true`)
- `400 VALIDACAO` · `409 LOGIN_DUPLICADO` (unicidade case-insensitive)

**`PATCH /administradores/:id`** (apenas ADMIN) — subconjunto de `nome`, `login`, `perfil`, `ativo`.

**`DELETE /administradores/:id`** (apenas ADMIN) — `204` (soft delete, `ativo = false`).

> O `login` do administrador corresponde ao login do SUAP (parte antes do `@`).

## 6. Regras de negócio

1. **Uma chave, um empréstimo ativo:** não é possível criar empréstimo para chave com `status = EMPRESTADA`.
2. **Transação:** criar empréstimo/devolução e atualizar `chave.status` acontecem juntos (rollback em falha).
3. **Datas são do servidor:** `dataHoraEmprestimo` e `dataHoraDevolucao` nunca vêm do cliente.
4. **Soft delete:** exclusões de chave/solicitante/administrador apenas setam `ativo = false` (histórico preservado).
5. **Unicidade:** `chave.codigo` e `solicitante.matricula` são únicos (case-insensitive);
   `administrador.login` também é único (case-insensitive) → `LOGIN_DUPLICADO`.
6. **Bloqueio de inativação:** chave/solicitante com empréstimo `EMPRESTADA` não pode ser inativado.
7. **Perfis:** `ADMINISTRADOR`/`GESTOR` gerenciam chaves e solicitantes (e `ADMINISTRADOR` também
   administradores); empréstimo/devolução podem ser feitos por `ADMINISTRADOR`, `GESTOR` e
   `SOLICITANTE` (este apenas para si mesmo).
8. **Datas coerentes:** `dataHoraDevolucao`, quando existir, nunca é anterior a `dataHoraEmprestimo`
   (constraint `CK_EMPRESTIMO_DATAS` do DER).
9. **Solicitante escopado:** autenticado como `SOLICITANTE` cria empréstimo apenas para si e vê
   apenas o próprio histórico.

## 7. Códigos de status

| HTTP | Quando |
|---|---|
| 200 | GET/PATCH com sucesso |
| 201 | POST com sucesso |
| 204 | DELETE com sucesso |
| 400 | Payload inválido (`VALIDACAO`) |
| 401 | Token ausente/inválido (`NAO_AUTENTICADO`) |
| 403 | Perfil sem permissão (`SEM_PERMISSAO`) |
| 404 | Recurso inexistente (`NAO_ENCONTRADO`) |
| 409 | Conflito de estado/unicidade (ver `code` na §4) |
| 500 | Erro inesperado |

Códigos `409` possíveis: `MATRICULA_DUPLICADA`, `CODIGO_CHAVE_DUPLICADO`, `LOGIN_DUPLICADO`,
`CHAVE_INDISPONIVEL`, `SOLICITANTE_INATIVO`, `EMPRESTIMO_JA_DEVOLVIDO`, `RECURSO_COM_EMPRESTIMO_ATIVO`.

## 8. Mapeamento DER → API

> Fonte: [`documentation/diagrams/DER-IFKey.puml`](diagrams/DER-IFKey.puml)

| DER (coluna) | API (campo) |
|---|---|
| `administrador.id_usuario` | `id` |
| `administrador.login` | `login` |
| `administrador.perfil` | `perfil` |
| `solicitante.id_solicitante` | `id` |
| `solicitante.matricula` | `matricula` |
| `chave.id_chave` | `id` |
| `chave.data_cadastro` | `dataCadastro` |
| `emprestimo.id_emprestimo` | `id` |
| `emprestimo.id_solicitante` | request: `solicitanteId` · response: `solicitante` (resumo) |
| `emprestimo.id_chave` | request: `chaveId` · response: `chave` (resumo) |
| `emprestimo.id_administrador_registro` | response: `administrador` (extraído do JWT) |
| `emprestimo.data_hora_emprestimo` | `dataHoraEmprestimo` |
| `emprestimo.data_hora_devolucao` | `dataHoraDevolucao` |
| `emprestimo.status` | `status` |

## 9. Decisões

| # | Decisão | Definição | Status |
|---|---|---|---|
| 1 | Estratégia de auth (SUAP vs senha local) — [#1](https://github.com/matheusxz9/IFKey/issues/1) | SUAP + JWT (+ refresh token) | Resolvido (§5.2) |
| 2 | `camelCase` vs `snake_case` nos payloads | `camelCase` | Resolvido |
| 3 | Embutir resumos relacionados vs só IDs | Embutir (evita N+1 no frontend) | Resolvido |
| 4 | Paginação | `page`/`limit` + `meta` (§3) | Resolvido |
| 5 | Soft delete | Sim (§6.4) | Resolvido |
| 6 | Prefixo global `/api` | Sim | Resolvido |
| 7 | Campo `code` estável nos erros | Sim (§4) | Resolvido |
| 8 | RBAC com 3 perfis (`ADMINISTRADOR`/`GESTOR`/`SOLICITANTE`) | Sim (§5.1, §6.7) | Resolvido |
| 9 | Quem registra a devolução — [#35](https://github.com/matheusxz9/IFKey/issues/35) | Qualquer perfil autenticado (solicitante só o próprio) | Resolvido |

## 10. Fluxos de exemplo

**Empréstimo (UC2):**

```
POST /emprestimos
Authorization: Bearer <jwt>
{ "solicitanteId": 1, "chaveId": 3 }

201 Created
{ "id": 10, "status": "EMPRESTADA", "dataHoraEmprestimo": "2026-09-10T14:30:00-03:00", ... }
```

**Devolução (UC8):**

```
PATCH /emprestimos/10/devolucao
Authorization: Bearer <jwt>
{ "observacoes": "Devolvida em bom estado" }

200 OK
{ "id": 10, "status": "DEVOLVIDA", "dataHoraDevolucao": "2026-09-10T17:05:00-03:00", ... }
```

**Chaves disponíveis (UC1):**

```
GET /chaves?status=DISPONIVEL&limit=50
Authorization: Bearer <jwt>

200 OK
{ "data": [ { "id": 3, "codigo": "LAB-01", "status": "DISPONIVEL", ... } ], "meta": { ... } }
```

## 11. Ordem de implementação sugerida

1. Config TypeORM + entidades + migrations ([#6](https://github.com/matheusxz9/IFKey/issues/6), [#9](https://github.com/matheusxz9/IFKey/issues/9)–[#12](https://github.com/matheusxz9/IFKey/issues/12))
2. Auth ([#22](https://github.com/matheusxz9/IFKey/issues/22))
3. CRUD `/solicitantes` ([#19](https://github.com/matheusxz9/IFKey/issues/19))
4. CRUD `/chaves` ([#18](https://github.com/matheusxz9/IFKey/issues/18))
5. Empréstimo/devolução ([#13](https://github.com/matheusxz9/IFKey/issues/13), [#14](https://github.com/matheusxz9/IFKey/issues/14), [#20](https://github.com/matheusxz9/IFKey/issues/20))
6. Consultas/histórico ([#15](https://github.com/matheusxz9/IFKey/issues/15)–[#17](https://github.com/matheusxz9/IFKey/issues/17))
7. Swagger ([#21](https://github.com/matheusxz9/IFKey/issues/21)) — passa a ser a fonte viva do contrato

> **Para o frontend:** os exemplos JSON deste documento podem ser usados diretamente como mocks/fixtures.
