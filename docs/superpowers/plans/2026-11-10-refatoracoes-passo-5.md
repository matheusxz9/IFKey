# Refatorações do passo 5 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduzir duplicação e complexidade em listagens, na página de chaves, na renovação de sessão e na devolução de empréstimos, sem alterar contratos nem comportamento observável.

**Architecture:** Extrair um hook de listagem paginada reutilizado por quatro páginas; decompor `ChavesPage` em componentes de modal e de empréstimos ativos; trocar o estado mutável de `refreshTokens` por um resultado discriminado; e montar a resposta de `devolver` com as entidades já carregadas, eliminando o refetch final.

**Tech Stack:** React 19 + TypeScript + Vite (frontend); NestJS + TypeORM + PostgreSQL (backend); Jest e Playwright.

**Spec:** `docs/superpowers/plans/2026-11-10-refatoracoes-passo-5.md` (proposta aprovada em conversa)

## Global Constraints

- Não alterar rotas, payloads, mensagens de erro, regras de negócio ou o contrato em `documentation/contrato-api.md`.
- Não adicionar dependências.
- Código e textos em pt-BR; seguir os padrões existentes de controllers/services/componentes.
- Nenhum commit intermediário: o usuário pediu um único commit ao final.
- Backend: `npm run lint` roda ESLint com `--fix`; `npm run build`; `npm test -- --runInBand`.
- Frontend: `npm run lint` (somente reporta); `npm run build` (`tsc -b` + Vite).
- E2E de backend e Playwright exigem PostgreSQL na porta 5434; não há Docker disponível nesta máquina, então ficam para o CI.

## Review Focus

- Duas devoluções concorrentes do mesmo empréstimo: uma vence, a outra recebe `409 EMPRESTIMO_JA_DEVOLVIDO`, e a chave termina `DISPONIVEL`.
- Reutilização de refresh token dentro da janela de 10 s não revoga a família; fora da janela revoga e retorna `REFRESH_TOKEN_REUTILIZADO`.
- Refresh token de usuário inativo revoga a família e retorna `SEM_PERMISSAO` com “Usuário não encontrado.”.
- Troca rápida de filtros na listagem: a resposta antiga não pode sobrescrever a mais recente.
- Modal de empréstimo aberto por solicitante carrega o próprio cadastro; aberto por admin/gestor exige busca por matrícula.

---

### Task 1: Hook `useListagemPaginada` e migração das três páginas de gestão

**Files:**
- Create: `frontend/src/hooks/useListagemPaginada.ts`
- Modify: `frontend/src/pages/GestaoChavesPage.tsx`
- Modify: `frontend/src/pages/GestaoSolicitantesPage.tsx`
- Modify: `frontend/src/pages/GestaoAdministradoresPage.tsx`

**Interfaces:**
- Produces:

```ts
export interface ResultadoListagem<T> {
  data: T[];
  page: number;
  totalPages: number;
  total: number;
}

export interface OpcoesListagemPaginada<T, F> {
  filtros: F;
  carregar: (
    pagina: number,
    filtros: F,
    signal: AbortSignal,
  ) => Promise<ResultadoListagem<T>>;
  mensagemErro: string;
}

export function useListagemPaginada<T, F>(
  opcoes: OpcoesListagemPaginada<T, F>,
): {
  dados: T[];
  carregando: boolean;
  erro: string;
  pagina: number;
  totalPaginas: number;
  total: number;
  carregar: (pagina?: number, filtros?: F) => Promise<void>;
  buscar: () => Promise<void>;
};
```

- [ ] **Step 1: Criar o hook**

Implementar em `frontend/src/hooks/useListagemPaginada.ts`:
- estado `dados`, `carregando` (inicial `true`), `erro`, `pagina`, `totalPaginas`, `total`;
- `requisicaoRef` e `abortRef`;
- `carregar(paginaAtual = pagina, filtrosAtuais: F = filtros)` que aborta a requisição anterior, cria `AbortController`, chama `carregar(paginaAtual, filtrosAtuais, controller.signal)`, ignora resultados/erros quando `signal.aborted` e atualiza o estado com `data/page/totalPages/total`;
- `buscar()` que chama `carregar(1, filtros)`;
- `useEffect` de montagem chamando `carregar(1, filtros)` e cleanup abortando;
- erro via `mensagemDoErro(error, mensagemErro)`;
- retornar os campos da interface acima.

- [ ] **Step 2: Migrar `GestaoChavesPage`**

Substituir os estados de dados/loading/erro/paginação, o `requisicaoRef`, o `useEffect` e as funções `carregarChaves`/`buscar` pelo hook:

```ts
const listagem = useListagemPaginada({
  filtros: { busca, status, ativo },
  mensagemErro: "Erro ao carregar as chaves.",
  carregar: async (page, filtros, signal) => {
    const resposta = await listarChaves(
      {
        busca: filtros.busca || undefined,
        status: filtros.status || undefined,
        ativo: filtros.ativo !== "" ? filtros.ativo : undefined,
        page,
        limit: 10,
      },
      { signal },
    );
    return {
      data: resposta.data,
      page: resposta.meta.page,
      totalPages: resposta.meta.totalPages,
      total: resposta.meta.total,
    };
  },
});
```

Usar `listagem.dados`, `listagem.carregando`, `listagem.erro`, `listagem.pagina`, `listagem.totalPaginas`, `listagem.total`, `listagem.buscar` e `listagem.carregar`. Nos handlers de filtro, manter `setBusca`/`setStatus`/`setAtivo` e chamar `void listagem.carregar(1, { ... })` com os valores novos. `limparFiltros` limpa os estados e chama `void listagem.carregar(1, { busca: "", status: "", ativo: "" })`. Os recarregamentos após salvar/inativar/reativar usam `void listagem.carregar()`.

- [ ] **Step 3: Migrar `GestaoSolicitantesPage`**

Mesma migração, com filtros `{ nome: buscaNome, matricula: buscaMatricula, tipo, ativo }`, limite 10 e mensagem `"Erro ao carregar os solicitantes."`.

- [ ] **Step 4: Migrar `GestaoAdministradoresPage`**

Mesma migração, com filtros `{ nome: buscaNome, login: buscaLogin, perfil, ativo }`, limite 10 e mensagem `"Erro ao carregar os administradores."`. Adaptar a resposta diferente:

```ts
return {
  data: resposta.data,
  page: resposta.page,
  totalPages: resposta.totalPages,
  total: resposta.total,
};
```

- [ ] **Step 5: Validar**

Run: `cd frontend && npm run lint && npm run build`
Expected: lint sem erros e build concluído.

---

### Task 2: Migrar `ChavesPage` para o hook e decompor modais

**Files:**
- Modify: `frontend/src/pages/ChavesPage.tsx`
- Create: `frontend/src/pages/chaves/EmprestimoModal.tsx`
- Create: `frontend/src/pages/chaves/EmprestimosAtivos.tsx`

**Interfaces:**
- Consumes: `useListagemPaginada` da Task 1.
- Produces:

```ts
// EmprestimoModal.tsx
interface EmprestimoModalProps {
  chave: Chave | null;
  onClose: () => void;
  onConfirmado: () => Promise<void>;
}
export default function EmprestimoModal(props: EmprestimoModalProps): JSX.Element;

// EmprestimosAtivos.tsx
interface EmprestimosAtivosProps {
  emprestimos: Emprestimo[];
  carregando: boolean;
  erro: string;
  onAtualizar: () => Promise<void>;
}
export default function EmprestimosAtivos(props: EmprestimosAtivosProps): JSX.Element;
```

- [ ] **Step 1: Migrar a listagem de `ChavesPage` para o hook**

Substituir os estados `chaves`, `carregando`, `erro`, `pagina`, `totalPaginas`, `total`, `abortChavesRef`, `carregarChaves` e o trecho de listagem do `useEffect` pelo hook, com filtros `{ busca, status }`, `ativo: true`, limite 10, mensagem `"Erro ao carregar as chaves."` e `{ signal }` repassado para `listarChaves`. Manter `carregarEmprestimos` e seu efeito de montagem/cleanup.

- [ ] **Step 2: Extrair `EmprestimoModal`**

Mover para `frontend/src/pages/chaves/EmprestimoModal.tsx` os estados `matricula`, `solicitante`, `observacoes`, `buscandoSolicitante`, `salvandoEmprestimo`, `erroModal` e as funções `carregarSolicitanteProprio`, `fecharModalEmprestimo`, `buscarSolicitante` e `confirmarEmprestimo`, além do JSX do `<Modal>` de empréstimo. O componente usa `useAuth` e `useToast`, recebe `chave`/`onClose`/`onConfirmado` e, em `useEffect` dependente de `chave?.id`, reseta o formulário e carrega o solicitante próprio quando `isSolicitante && user`. Em sucesso, chama `await onConfirmado()` e `onClose()`. Preservar textos, validações e tratamento de `CHAVE_INDISPONIVEL`.

- [ ] **Step 3: Extrair `EmprestimosAtivos`**

Mover para `frontend/src/pages/chaves/EmprestimosAtivos.tsx` o `Cartao` de empréstimos ativos, as `colunasEmprestimos`, os estados `emprestimoSelecionado`/`devolvendo`, o `ConfirmDialog` e `confirmarDevolucao`. O componente recebe `emprestimos`, `carregando`, `erro`, `onAtualizar`, usa `useToast` e chama `await onAtualizar()` após a devolução. Preservar textos e comportamento.

- [ ] **Step 4: Recompor `ChavesPage`**

Manter na página: filtros, `listagem`, estado/loader de empréstimos ativos, `chaveSelecionada`, `colunasChaves` e o JSX de header/filtros/cartão de chaves. Renderizar `<EmprestimoModal chave={chaveSelecionada} onClose={() => setChaveSelecionada(null)} onConfirmado={async () => { await Promise.all([listagem.carregar(), carregarEmprestimos()]); }} />` e `<EmprestimosAtivos ... onAtualizar={async () => { await Promise.all([carregarEmprestimos(), listagem.carregar()]); }} />`.

- [ ] **Step 5: Validar**

Run: `cd frontend && npm run lint && npm run build`
Expected: lint sem erros e build concluído.

---

### Task 3: Simplificar `AuthService.refreshTokens` com resultado discriminado

**Files:**
- Modify: `backend/src/auth/auth.service.ts`
- Test: `backend/src/auth/auth.service.spec.ts`

**Interfaces:**
- Produces:

```ts
interface TokensAutenticacao {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    nome: string;
    tipo: "admin" | "solicitante";
    login?: string;
    matricula?: string;
    perfil: PerfilAdministrador;
  };
}

type ResultadoRefresh =
  | { tipo: "ok"; tokens: TokensAutenticacao }
  | { tipo: "invalido" }
  | { tipo: "reutilizado" }
  | { tipo: "inativo" };
```

- [ ] **Step 1: Escrever testes de caracterização**

Em `backend/src/auth/auth.service.spec.ts`, adicionar um `describe('AuthService.refreshTokens')` com mocks de `refreshTokenRepo.manager.transaction`, repositórios do manager e `jwtService.signAsync`. Cobrir:
1. token válido rotaciona: retorna novos tokens, marca o antigo como `revoked` e mantém `familyId`;
2. token revogado há mais de 10 s: lança `RefreshTokenReutilizadoException` e revoga a família;
3. token revogado dentro da janela: lança `SemPermissaoException` com “Refresh token inválido ou expirado.” e não revoga a família;
4. token inexistente: lança `SemPermissaoException` com “Refresh token inválido ou expirado.”;
5. usuário inativo: lança `SemPermissaoException` com “Usuário não encontrado.” e revoga a família.

- [ ] **Step 2: Rodar os testes contra a implementação atual**

Run: `cd backend && npm test -- auth.service.spec.ts --runInBand`
Expected: PASS (caracterização do comportamento atual antes do refactor).

- [ ] **Step 3: Refatorar `refreshTokens`**

Adicionar `TokensAutenticacao` e `ResultadoRefresh`; tipar `generateTokens` como `Promise<TokensAutenticacao>`; substituir o objeto `estado` por `rotacionarRefreshToken(manager, tokenHash): Promise<ResultadoRefresh>` e tratar o resultado com `switch` em `refreshTokens`, mantendo exatamente os mesmos erros e a ordem das operações (busca, advisory lock, lock pessimista, janela de graça, expiração, usuário ativo, revogação, limpeza e geração).

- [ ] **Step 4: Rodar os testes**

Run: `cd backend && npm test -- auth.service.spec.ts --runInBand`
Expected: PASS.

- [ ] **Step 5: Validar**

Run: `cd backend && npm run lint && npm run build && npm test -- --runInBand`
Expected: lint sem erros, build concluído, todas as suítes passando.

---

### Task 4: Otimizar `EmprestimosService.devolver` sem refetch final

**Files:**
- Modify: `backend/src/emprestimos/emprestimos.service.ts`
- Test: `backend/src/emprestimos/emprestimos.service.spec.ts`

**Interfaces:**
- Consumes: `Emprestimo`, `Chave`, `StatusEmprestimo`, `toResponse`.
- Produces: `devolver` retorna o mesmo payload de antes, agora montado a partir da entidade carregada.

- [ ] **Step 1: Escrever o teste de caracterização**

Em `backend/src/emprestimos/emprestimos.service.spec.ts`, adicionar um teste de `devolver` com repositórios mockados:
- `emprestimoRepo.findOne` retorna primeiro `{ id: 1 }` (lock) e depois um empréstimo completo com `status: EMPRESTADA`, `chave: { id: 2 }`, `solicitante: { id: 7 }`, `administrador: null`, `observacoes: null`, `dataHoraDevolucao: null`;
- `chaveRepo.findOne`/`update`, `emprestimoRepo.update` e `manager.findOne` mockados;
- chamar `devolver(1, {}, { id: 7, perfil: PerfilAdministrador.SOLICITANTE })`;
- esperar resposta com `status: 'DEVOLVIDA'` e `dataHoraDevolucao` sendo `Date`;
- esperar que `emprestimoRepo.update` e `chaveRepo.update` tenham sido chamados;
- esperar que `manager.findOne` **não** tenha sido chamado.

- [ ] **Step 2: Rodar o teste para confirmar a falha**

Run: `cd backend && npm test -- emprestimos.service.spec.ts --runInBand`
Expected: FAIL porque a implementação atual chama `buscarEntidadeComManager` (`manager.findOne`).

- [ ] **Step 3: Implementar**

Em `devolver`, guardar `const dataHoraDevolucao = new Date()`, usar essa data no `update`, atualizar em memória `emprestimo.status`, `emprestimo.dataHoraDevolucao` e `emprestimo.observacoes` (quando `dto.observacoes`), e retornar `this.toResponse(emprestimo)`. Remover a chamada final a `buscarEntidadeComManager` apenas desse fluxo; manter os dois locks e a ordem atual.

- [ ] **Step 4: Rodar os testes**

Run: `cd backend && npm test -- emprestimos.service.spec.ts --runInBand`
Expected: PASS.

- [ ] **Step 5: Validar**

Run: `cd backend && npm run lint && npm run build && npm test -- --runInBand`
Expected: lint sem erros, build concluído, todas as suítes passando.

---

### Task 5: Revisão final e commit único

**Files:**
- Review: todo o `git diff` e arquivos não rastreados criados no passo 5.

- [ ] **Step 1: Revisar o diff**

Run: `git status --short && git diff --check && git diff --stat`
Expected: apenas arquivos esperados; nenhum whitespace error.

- [ ] **Step 2: Rodar todas as verificações**

Run: `cd backend && npm run lint && npm run build && npm test -- --runInBand`
Run: `cd frontend && npm run lint && npm run build`
Expected: tudo verde. E2E não executável localmente (sem Docker/PostgreSQL); registrar a limitação.

- [ ] **Step 3: Commit único**

Run:
```bash
git add -A
git commit -m "refactor: simplifica listagens, empréstimos e renovação de sessão"
```
Expected: um único commit com as mudanças do passo 5 e as refatorações anteriores.
