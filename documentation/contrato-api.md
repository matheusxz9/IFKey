# Contrato da API — IFKey

> **Status:** rascunho v0.1 para revisão do time
> **Issue:** [#8 — Definir contrato de rotas da API](https://github.com/matheusxz9/IFKey/issues/8)
> **Última atualização:** 2026-09-10
>
> Este documento define o contrato HTTP entre frontend e backend **antes da implementação**.
> Alterações devem ser discutidas no time e refletidas aqui + na issue antes de codar.
> Quando o Swagger estiver configurado ([#21](https://github.com/matheusxz9/IFKey/issues/21)),
> ele passa a ser a fonte viva deste contrato.

---

## 1. Visão geral

| Item | Definição |
|---|---|
| Base URL (dev) | `http://localhost:3000` (porta configurável via `PORT`; prefixo `/api` pendente — ver §9) |
| Formato | JSON (`application/json; charset=utf-8`) |
| Datas | ISO 8601 com offset — ex.: `2026-09-10T14:30:00-03:00` (persistir em UTC no banco) |
| Nomenclatura | `camelCase` nos payloads (mapeamento para o `snake_case` do DER na §8) |
| Autenticação | `Authorization: Bearer <JWT>` (estratégia de login pendente — ver §9.1) |
| CORS | Liberado para a origem do frontend em desenvolvimento (ex.: `http://localhost:5173`) |

## 2. Enums

| Enum | Valores |
|---|---|
| `TipoSolicitante` | `ALUNO`, `PROFESSOR`, `SERVIDOR` |
| `StatusChave` | `DISPONIVEL`, `EMPRESTADA` |
| `StatusEmprestimo` | `EMPRESTADA`, `DEVOLVIDA` |
| `PerfilAdministrador` | `ADMINISTRADOR` |

## 3. Listagem e paginação

Todas as rotas de listagem aceitam:

| Query param | Tipo | Default | Descrição |
|---|---|---|---|
| `page` | int ≥ 1 | `1` | Página |
| `limit` | int (1–100) | `20` | Itens por página |

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

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/auth/login` | — | Login do administrador (formato pendente — §9.1) |
| GET | `/auth/me` | ✔ | Administrador autenticado |
| GET | `/solicitantes` | ✔ | Lista solicitantes (filtros: `nome`, `matricula`, `tipo`, `ativo`) |
| GET | `/solicitantes/:id` | ✔ | Detalhe do solicitante |
| POST | `/solicitantes` | ✔ | Cadastra solicitante |
| PATCH | `/solicitantes/:id` | ✔ | Atualiza solicitante (parcial) |
| DELETE | `/solicitantes/:id` | ✔ | Inativa solicitante (soft delete) |
| GET | `/chaves` | ✔ | Lista chaves (filtros: `status`, `ativo`, `busca`) |
| GET | `/chaves/:id` | ✔ | Detalhe da chave |
| POST | `/chaves` | ✔ | Cadastra chave |
| PATCH | `/chaves/:id` | ✔ | Atualiza chave (parcial) |
| DELETE | `/chaves/:id` | ✔ | Inativa chave (soft delete) |
| POST | `/emprestimos` | ✔ | Registra empréstimo |
| PATCH | `/emprestimos/:id/devolucao` | ✔ | Registra devolução |
| GET | `/emprestimos` | ✔ | Lista empréstimos (filtro `status`, `solicitanteId`, `chaveId`) |
| GET | `/emprestimos/historico` | ✔ | Histórico de devolvidos (filtros `de`, `ate`, `solicitanteId`, `chaveId`) |
| GET | `/emprestimos/:id` | ✔ | Detalhe do empréstimo |

> **Atenção NestJS:** declarar `GET /emprestimos/historico` **antes** de `GET /emprestimos/:id`,
> senão `historico` é interpretado como `:id`.

### 5.2 Auth — ⚠️ pendente de decisão ([#1](https://github.com/matheusxz9/IFKey/issues/1))

O DER do `ADMINISTRADOR` **não possui senha** (só `login`, `perfil`, `ativo`), e o `.env.example`
já prevê `SUAP_CLIENT_ID/SECRET/REDIRECT_URI` + `JWT_SECRET` — o que sugere SUAP como provedor.
Enquanto a decisão não sai, o contrato assume apenas:

- Rotas protegidas exigem `Authorization: Bearer <JWT>`;
- `401` sem token/expirado; `403` para perfil sem permissão;
- `GET /auth/me` → `{ "id": 1, "nome": "João Souza", "login": "joao.souza", "perfil": "ADMINISTRADOR" }`.

**Opção A — SUAP (OAuth2), consistente com o DER:**

```
POST /auth/suap
{ "code": "<authorization code do SUAP>" }

200 OK
{ "accessToken": "<jwt>", "administrador": { "id": 1, "nome": "...", "login": "...", "perfil": "ADMINISTRADOR" } }
```

**Opção B — login/senha local (exigiria `senha_hash` no DER):**

```
POST /auth/login
{ "login": "joao.souza", "senha": "********" }
```

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

**`GET /solicitantes`** — filtros: `nome` (busca parcial), `matricula` (exata — usada no form de empréstimo),
`tipo`, `ativo` (default `true`), `page`, `limit`.

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

**`GET /chaves`** — filtros: `status`, `ativo` (default `true`), `busca` (parcial em `codigo`/`descricao`/`localizacao`), `page`, `limit`.

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

**`POST /emprestimos`**

```json
{ "solicitanteId": 1, "chaveId": 3, "observacoes": "Devolver até as 18h" }
```

- `201` → empréstimo criado; `administrador` vem do JWT; `dataHoraEmprestimo` = agora (servidor);
  `chave.status` → `EMPRESTADA` na mesma transação
- `400 VALIDACAO` · `404 NAO_ENCONTRADO` (solicitante/chave)
- `409 CHAVE_INDISPONIVEL` (chave emprestada ou inativa)
- `409 SOLICITANTE_INATIVO`

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

**`GET /emprestimos/historico`** — apenas `DEVOLVIDA`, ordenado por `dataHoraDevolucao` desc.
Filtros extras: `de`, `ate` (data ISO sobre `dataHoraDevolucao`).

**`GET /emprestimos/:id`** — detalhe · `404 NAO_ENCONTRADO`.

## 6. Regras de negócio

1. **Uma chave, um empréstimo ativo:** não é possível criar empréstimo para chave com `status = EMPRESTADA`.
2. **Transação:** criar empréstimo/devolução e atualizar `chave.status` acontecem juntos (rollback em falha).
3. **Datas são do servidor:** `dataHoraEmprestimo` e `dataHoraDevolucao` nunca vêm do cliente.
4. **Soft delete:** exclusões de chave/solicitante apenas setam `ativo = false` (histórico preservado).
5. **Unicidade:** `chave.codigo` e `solicitante.matricula` são únicos (case-insensitive).
6. **Bloqueio de inativação:** chave/solicitante com empréstimo `EMPRESTADA` não pode ser inativado.
7. **Perfil:** somente `ADMINISTRADOR` autenticado registra empréstimo e devolução.
   *(Quem registra a devolução pode mudar — ver [#35](https://github.com/matheusxz9/IFKey/issues/35).)*
8. **Datas coerentes:** `dataHoraDevolucao`, quando existir, nunca é anterior a `dataHoraEmprestimo`
   (constraint `CK_EMPRESTIMO_DATAS` do DER).

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

## 9. Decisões pendentes

| # | Decisão | Proposta | Impacto |
|---|---|---|---|
| 1 | Estratégia de auth (SUAP vs senha local) — [#1](https://github.com/matheusxz9/IFKey/issues/1) | SUAP + JWT (DER não tem senha) | `/auth/*`, DER, tarefa [#22](https://github.com/matheusxz9/IFKey/issues/22) |
| 2 | `camelCase` vs `snake_case` nos payloads | `camelCase` (convenção Nest/JS) | Todo o contrato |
| 3 | Embutir resumos relacionados vs só IDs | Embutir (evita N+1 no frontend) | Respostas de empréstimo |
| 4 | Paginação | `page`/`limit` + `meta` (§3) | Todas as listagens |
| 5 | Soft delete | Sim (§6.4) | DELETE de chaves/solicitantes |
| 6 | Prefixo global `/api` | Sim (base: `http://localhost:3000/api`) | main.ts + frontend |
| 7 | Campo `code` estável nos erros | Sim (§4) | Exception filter |
| 8 | Quem registra a devolução — [#35](https://github.com/matheusxz9/IFKey/issues/35) | Administrador | Permissões |

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
2. Auth ([#22](https://github.com/matheusxz9/IFKey/issues/22)) — após decisão da §9.1
3. CRUD `/solicitantes` ([#19](https://github.com/matheusxz9/IFKey/issues/19))
4. CRUD `/chaves` ([#18](https://github.com/matheusxz9/IFKey/issues/18))
5. Empréstimo/devolução ([#13](https://github.com/matheusxz9/IFKey/issues/13), [#14](https://github.com/matheusxz9/IFKey/issues/14), [#20](https://github.com/matheusxz9/IFKey/issues/20))
6. Consultas/histórico ([#15](https://github.com/matheusxz9/IFKey/issues/15)–[#17](https://github.com/matheusxz9/IFKey/issues/17))
7. Swagger ([#21](https://github.com/matheusxz9/IFKey/issues/21)) — passa a ser a fonte viva do contrato

> **Para o frontend (Pedro):** os exemplos JSON deste documento podem ser usados diretamente como mocks/fixtures.
