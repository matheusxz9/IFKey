import { expect, test } from "@playwright/test";
import {
  apiDe,
  codigoChave,
  criarChave,
  inativarChave,
} from "./fixtures/api";
import { API_URL, caminhoStorageState, lerUsuarios, tokenDe } from "./fixtures/sessao";

/**
 * P1 — Testes exploratórios e transversais:
 * rotas inválidas, recuperação de sessão, estados de carregamento/erro,
 * navegação mobile e comportamento dos diálogos.
 */

test.describe("sem sessão", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("rota desconhecida exibe a página 404 com saída para o início", async ({
    page,
  }) => {
    await page.goto("/rota/que/nao/existe");

    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    await expect(page.getByText("Página não encontrada")).toBeVisible();

    await page.getByRole("link", { name: "Voltar para o início" }).click();
    await expect(page).toHaveURL("http://localhost:5173/");
    await expect(
      page.getByRole("heading", { name: "Acesso do Administrador / Solicitante" }),
    ).toBeVisible();
  });

  test("mostra 'Verificando sessão...' enquanto valida o token", async ({ page }) => {
    const admin = lerUsuarios().admin;
    await page.route(`${API_URL}/auth/me`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(admin),
      });
    });
    await page.addInitScript((token) => {
      localStorage.setItem("accessToken", token);
      localStorage.removeItem("user");
    }, tokenDe(admin));

    await page.goto("/chaves");

    await expect(
      page.getByRole("status").filter({ hasText: "Verificando sessão..." }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Chaves" })).toBeVisible();
  });
});

test.describe("com sessão", () => {
  test.use({ storageState: caminhoStorageState("admin") });

  test("renova o access token quando o /auth/me responde 401", async ({ page }) => {
    const admin = lerUsuarios().admin;
    const tokenRenovado = tokenDe(admin);
    // O storageState não guarda refreshToken: injeta um antigo para que a
    // renovação chegue ao POST /auth/refresh.
    await page.addInitScript(() => {
      localStorage.setItem("refreshToken", "refresh-antigo");
    });

    await page.route(`${API_URL}/auth/me`, (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          statusCode: 401,
          message: "Token inválido.",
          code: "NAO_AUTENTICADO",
        }),
      }),
    );
    await page.route(`${API_URL}/auth/refresh`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: tokenRenovado,
          refreshToken: "refresh-renovado",
        }),
      }),
    );

    await page.goto("/chaves");

    await expect(page.getByRole("heading", { name: "Chaves" })).toBeVisible();
    await expect(page.getByRole("table").first()).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("accessToken"))).toBe(
      tokenRenovado,
    );
    expect(await page.evaluate(() => localStorage.getItem("refreshToken"))).toBe(
      "refresh-renovado",
    );
  });

  test("erro de rede ao carregar a lista mostra alerta sem quebrar a página", async ({
    page,
  }) => {
    await page.route(`${API_URL}/chaves*`, (route) => route.abort("failed"));

    await page.goto("/chaves");

    await expect(page.getByRole("alert").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Chaves" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();
  });

  test("429 no /auth/me não derruba a sessão do usuário", async ({ page }) => {
    await page.route(`${API_URL}/auth/me`, (route) =>
      route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({ statusCode: 429, message: "Too Many Requests" }),
      }),
    );

    await page.goto("/chaves");

    // Não redireciona para o login nem tenta renovar o token.
    await expect(page).toHaveURL(/\/chaves$/);
    await expect(page.getByRole("heading", { name: "Chaves" })).toBeVisible();
    await expect(page.getByRole("table").first()).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("accessToken"))).toBeTruthy();
    expect(await page.evaluate(() => localStorage.getItem("refreshToken"))).toBeNull();
  });

  test("diálogo fecha com Escape e devolve o foco ao gatilho", async ({ page }) => {
    const api = await apiDe("admin");
    const codigo = codigoChave("ESC");
    const chave = await criarChave(api, { codigo });

    try {
      await page.goto("/chaves");
      await page
        .getByLabel("Buscar chaves por código ou descrição")
        .fill(codigo);
      await page.getByRole("button", { name: "Buscar", exact: true }).click();

      const gatilho = page.getByRole("button", { name: `Emprestar chave ${codigo}` });
      await expect(gatilho).toBeVisible();
      await gatilho.click();

      const dialogo = page.getByRole("dialog", { name: "Registrar empréstimo" });
      await expect(dialogo).toBeVisible();
      await expect(dialogo).toHaveAttribute("aria-modal", "true");

      await page.keyboard.press("Escape");

      await expect(dialogo).toHaveCount(0);
      await expect(gatilho).toBeFocused();
    } finally {
      await inativarChave(api, chave.id);
      await api.dispose();
    }
  });

  test("cada página tem exatamente um título principal", async ({ page }) => {
    for (const rota of ["/chaves", "/historico", "/admin/chaves", "/admin/solicitantes"]) {
      await page.goto(rota);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    }
  });

  test.describe("em viewport mobile", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("abre e fecha o menu lateral por teclado", async ({ page }) => {
      await page.goto("/chaves");

      const botao = page.getByRole("button", { name: "Abrir menu" });
      await expect(botao).toBeVisible();
      await botao.click();

      const menu = page.locator("#menu-principal");
      const botaoAberto = page.getByRole("button", { name: "Fechar menu" });
      await expect(botaoAberto).toHaveAttribute("aria-expanded", "true");
      await expect(menu.getByRole("link", { name: "Histórico" })).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(botao).toHaveAttribute("aria-expanded", "false");
      await expect(botao).toBeFocused();
    });

    test("navega pelo menu e fecha ao escolher um destino", async ({ page }) => {
      await page.goto("/chaves");

      await page.getByRole("button", { name: "Abrir menu" }).click();
      await page.locator("#menu-principal").getByRole("link", { name: "Histórico" }).click();

      await expect(page).toHaveURL(/\/historico$/);
      await expect(page.getByRole("button", { name: "Abrir menu" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      await expect(page.getByRole("heading", { name: "Histórico de empréstimos" })).toBeVisible();
    });
  });
});

/** Garante que o fluxo de SUAP segue disponível para a página de login. */
test("a página de login continua renderizando o botão do SUAP", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Entrar com SUAP" })).toBeVisible();
});

/**
 * Regressão (bug P2 corrigido): `/auth/me` é chamado a cada apiFetch e estava
 * sujeito ao throttler global (100 req/min por IP), derrubando a sessão com
 * 429. O endpoint agora usa @SkipThrottle().
 */
test("GET /auth/me não sofre rate limit mesmo sob rajada", async ({ request }) => {
  await test.step("dispara 120 requisições e espera todas 200", async () => {
    const admin = lerUsuarios().admin;
    const cabecalho = { Authorization: `Bearer ${tokenDe(admin)}` };

    const respostas = await Promise.all(
      Array.from({ length: 120 }, () =>
        request.get(`${API_URL}/auth/me`, { headers: cabecalho }),
      ),
    );

    const naoAutorizadas = respostas.filter((resposta) => resposta.status() !== 200);
    expect(
      naoAutorizadas.map((resposta) => resposta.status()),
      "nenhuma requisição deveria ser limitada (429)",
    ).toEqual([]);
  });
});
