import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import {
  apiDe,
  codigoChave,
  criarChave,
  criarEmprestimo,
  criarSolicitante,
  inativarChave,
  inativarSolicitante,
  nomeUnico,
} from "../fixtures/api";
import {
  API_URL,
  caminhoApi,
  caminhoStorageState,
  injetarSessao,
} from "../fixtures/sessao";

/** P0/P1 — Histórico de empréstimos (filtros, escopo por perfil e estados). */

interface Cenario {
  api: APIRequestContext;
  codigo: string;
  solicitante: { id: number; nome: string; matricula: string };
}

/**
 * Cria uma chave emprestada para um solicitante novo, evitando reutilizar
 * registros que outros testes possam estar manipulando em paralelo.
 */
async function prepararEmprestimo(): Promise<Cenario> {
  const api = await apiDe("admin");
  const codigo = codigoChave("HIS");
  await criarChave(api, { codigo });
  const solicitante = await criarSolicitante(api, { nome: nomeUnico("Histórico") });
  const chaveId = await idDaChave(api, codigo);
  await criarEmprestimo(api, { solicitanteId: solicitante.id, chaveId });
  return { api, codigo, solicitante };
}

async function idDaChave(api: APIRequestContext, codigo: string) {
  const resposta = await api.get(caminhoApi(`/chaves?busca=${codigo}`));
  const corpo = (await resposta.json()) as {
    data: Array<{ id: number; codigo: string }>;
  };
  const chave = corpo.data.find((item) => item.codigo === codigo);
  if (!chave) throw new Error(`Chave ${codigo} não encontrada na API.`);
  return chave.id;
}

const tabela = (page: Page) => page.getByRole("table");

test.describe("como administrador", () => {
  test.use({ storageState: caminhoStorageState("admin") });

  test("lista o histórico com filtros de período", async ({ page }) => {
    const cenario = await prepararEmprestimo();
    try {
      await page.goto("/historico");

      await expect(
        page.getByRole("heading", { name: "Histórico de empréstimos" }),
      ).toBeVisible();
      await expect(
        page.getByText("Consulte os empréstimos ativos e devolvidos."),
      ).toBeVisible();
      await expect(page.getByLabel("Data inicial")).toBeVisible();
      await expect(page.getByLabel("Data final")).toBeVisible();
      await expect(page.getByRole("button", { name: "Pesquisar" })).toBeVisible();

      const linha = tabela(page).getByRole("row").filter({ hasText: cenario.solicitante.nome });
      await expect(linha).toBeVisible();
      await expect(linha.getByText(cenario.codigo)).toBeVisible();
      await expect(linha.getByText(cenario.solicitante.matricula)).toBeVisible();
      // Empréstimo ativo ainda não tem data de devolução.
      await expect(linha.getByText("-", { exact: true })).toBeVisible();
    } finally {
      await cenario.api.dispose();
    }
  });

  /**
   * Regressão (bug P1 corrigido): `pesquisar()` omitia `de`/`ate` ao chamar
   * `carregarHistorico`, então o filtro de período nunca era aplicado.
   */
  test("período sem empréstimos exibe o estado vazio", async ({ page }) => {
    const cenario = await prepararEmprestimo();
    try {
      await page.goto("/historico");
      await expect(tabela(page).getByText(cenario.codigo)).toBeVisible();

      await page.getByLabel("Data inicial").fill("2000-01-01");
      await page.getByLabel("Data final").fill("2000-01-02");
      await page.getByRole("button", { name: "Pesquisar" }).click();

      await expect(page.getByText("Nenhum empréstimo encontrado.")).toBeVisible();

      // Limpa o período e a lista volta ao normal.
      await page.getByLabel("Data inicial").fill("");
      await page.getByLabel("Data final").fill("");
      await page.getByRole("button", { name: "Pesquisar" }).click();
      await expect(tabela(page).getByText(cenario.codigo)).toBeVisible();
    } finally {
      await cenario.api.dispose();
    }
  });

  test("envia o período como ISO com offset", async ({ page }) => {
    await page.route(`**${API_URL}/emprestimos/historico*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [],
          meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
        }),
      }),
    );

    await page.goto("/historico");
    await page.getByLabel("Data inicial").fill("2026-10-20");
    await page.getByLabel("Data final").fill("2026-10-20");

    const requisicao = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return (
        url.pathname.endsWith("/emprestimos/historico") &&
        url.searchParams.has("de")
      );
    });

    await page.getByRole("button", { name: "Pesquisar" }).click();
    const url = new URL((await requisicao).url());

    expect(url.searchParams.get("de")).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
    expect(url.searchParams.get("ate")).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
  });

  test("exibe a mensagem de erro quando a API falha", async ({ page }) => {
    await page.route(`**${API_URL}/emprestimos/historico*`, (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          statusCode: 500,
          message: "Erro inesperado no servidor.",
          code: "ERRO_INTERNO",
        }),
      }),
    );

    await page.goto("/historico");

    await expect(
      page.getByRole("alert").getByText("Erro inesperado no servidor."),
    ).toBeVisible();
    // A falha também deixa a tabela vazia, sem travar a página.
    await expect(page.getByText("Nenhum empréstimo encontrado.")).toBeVisible();
  });
});

test.describe("como solicitante", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  // Cada teste usa um solicitante dedicado e injeta a própria sessão, para não
  // depender de empréstimos criados por outros testes em paralelo.
  test("histórico vazio exibe o estado vazio", async ({ page }) => {
    const api = await apiDe("admin");
    const solicitante = await criarSolicitante(api, { nome: nomeUnico("Sem histórico") });

    try {
      await injetarSessao(page, {
        id: solicitante.id,
        nome: solicitante.nome,
        matricula: solicitante.matricula,
        perfil: "SOLICITANTE",
        tipo: "solicitante",
      });

      await page.goto("/historico");
      await expect(page.getByText("Nenhum empréstimo encontrado.")).toBeVisible();
    } finally {
      await inativarSolicitante(api, solicitante.id);
      await api.dispose();
    }
  });

  test("vê apenas os próprios empréstimos e não tem filtros de período", async ({
    page,
  }) => {
    const api = await apiDe("admin");
    const proprio = await criarSolicitante(api, { nome: nomeUnico("Dono") });
    const outro = await criarSolicitante(api, { nome: nomeUnico("Outro") });
    const chavePropria = await criarChave(api, { codigo: codigoChave("HIS") });
    const chaveOutra = await criarChave(api, { codigo: codigoChave("HIS") });
    await criarEmprestimo(api, {
      solicitanteId: proprio.id,
      chaveId: chavePropria.id,
    });
    await criarEmprestimo(api, {
      solicitanteId: outro.id,
      chaveId: chaveOutra.id,
    });

    try {
      await injetarSessao(page, {
        id: proprio.id,
        nome: proprio.nome,
        matricula: proprio.matricula,
        perfil: "SOLICITANTE",
        tipo: "solicitante",
      });

      await page.goto("/historico");

      await expect(
        page.getByText("Consulte seus empréstimos ativos e devolvidos."),
      ).toBeVisible();
      await expect(page.getByLabel("Data inicial")).toHaveCount(0);
      await expect(page.getByLabel("Data final")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Pesquisar" })).toHaveCount(0);

      await expect(
        tabela(page).getByRole("row").filter({ hasText: proprio.nome }),
      ).toBeVisible();
      await expect(
        tabela(page).getByRole("row").filter({ hasText: outro.nome }),
      ).toHaveCount(0);
    } finally {
      await inativarSolicitante(api, proprio.id);
      await inativarSolicitante(api, outro.id);
      await inativarChave(api, chavePropria.id);
      await inativarChave(api, chaveOutra.id);
      await api.dispose();
    }
  });
});