import { expect, test } from "@playwright/test";
import { apiComToken } from "../fixtures/api";
import {
  API_URL,
  caminhoApi,
  caminhoStorageState,
  lerUsuarios,
  tokenDe,
} from "../fixtures/sessao";

test.describe("sem sessão", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const rota of ["/chaves", "/historico", "/admin/chaves", "/admin/administradores"]) {
    test(`acesso direto a ${rota} redireciona para a tela de login`, async ({ page }) => {
      await page.goto(rota);
      await expect(page).toHaveURL("http://localhost:5173/");
      await expect(
        page.getByRole("heading", { name: "Acesso do Administrador / Solicitante" }),
      ).toBeVisible();
    });
  }
});

test.describe("como solicitante", () => {
  test.use({ storageState: caminhoStorageState("solicitante") });

  test("menu oferece apenas Chaves e Histórico", async ({ page }) => {
    await page.goto("/chaves");

    const navegacao = page.getByRole("navigation");
    await expect(navegacao.getByRole("link", { name: "Chaves", exact: true })).toBeVisible();
    await expect(navegacao.getByRole("link", { name: "Histórico", exact: true })).toBeVisible();
    await expect(navegacao.getByRole("link", { name: "Gerenciar Chaves" })).toHaveCount(0);
    await expect(navegacao.getByRole("link", { name: "Gerenciar Solicitantes" })).toHaveCount(0);
    await expect(navegacao.getByRole("link", { name: "Gerenciar Administradores" })).toHaveCount(0);
    await expect(navegacao.getByText("Administração")).toHaveCount(0);
  });

  for (const rota of ["/admin/chaves", "/admin/solicitantes", "/admin/administradores"]) {
    test(`não acessa ${rota} e volta para /chaves`, async ({ page }) => {
      await page.goto(rota);
      await expect(page).toHaveURL(/\/chaves$/);
      await expect(page.getByRole("heading", { name: "Chaves" })).toBeVisible();
    });
  }

  test("a API recusa a criação de chaves para o perfil SOLICITANTE", async () => {
    const api = await apiComToken(tokenDe(lerUsuarios().solicitante));
    const resposta = await api.post(caminhoApi("/chaves"), {
      data: { codigo: "NAO-DEVE", descricao: "x", localizacao: "x" },
    });
    expect(resposta.status()).toBe(403);
    expect((await resposta.json()).code).toBe("SEM_PERMISSAO");
    await api.dispose();
  });
});

test.describe("como gestor", () => {
  test.use({ storageState: caminhoStorageState("gestor") });

  test("menu oferece gestão de chaves e solicitantes, mas não de administradores", async ({
    page,
  }) => {
    await page.goto("/chaves");

    const navegacao = page.getByRole("navigation");
    await expect(navegacao.getByRole("link", { name: "Gerenciar Chaves" })).toBeVisible();
    await expect(navegacao.getByRole("link", { name: "Gerenciar Solicitantes" })).toBeVisible();
    await expect(navegacao.getByRole("link", { name: "Gerenciar Administradores" })).toHaveCount(0);
    await expect(navegacao.getByText("Administradores")).toHaveCount(0);
  });

  test("não acessa a gestão de administradores", async ({ page }) => {
    await page.goto("/admin/administradores");
    await expect(page).toHaveURL(/\/chaves$/);
  });

  test("acessa a gestão de chaves e de solicitantes", async ({ page }) => {
    await page.goto("/admin/chaves");
    await expect(page.getByRole("heading", { name: "Gestão de chaves" })).toBeVisible();

    await page.goto("/admin/solicitantes");
    await expect(page.getByRole("heading", { name: "Gestão de solicitantes" })).toBeVisible();
  });

  test("a API recusa a criação de administradores para o perfil GESTOR", async () => {
    const api = await apiComToken(tokenDe(lerUsuarios().gestor));
    const resposta = await api.post(caminhoApi("/administradores"), {
      data: { nome: "Não deve", login: "nao.deve", perfil: "GESTOR" },
    });
    expect(resposta.status()).toBe(403);
    await api.dispose();
  });
});

test.describe("como administrador", () => {
  test.use({ storageState: caminhoStorageState("admin") });

  test("menu oferece todas as seções", async ({ page }) => {
    await page.goto("/chaves");

    const navegacao = page.getByRole("navigation");
    for (const item of [
      "Chaves",
      "Histórico",
      "Gerenciar Chaves",
      "Gerenciar Solicitantes",
      "Gerenciar Administradores",
    ]) {
      await expect(navegacao.getByRole("link", { name: item, exact: true })).toBeVisible();
    }
    await expect(page.locator("aside").getByText("Matheus", { exact: true })).toBeVisible();
  });

  test("atualizar a página mantém a sessão ativa", async ({ page }) => {
    await page.goto("/chaves");
    await page.reload();
    await expect(page).toHaveURL(/\/chaves$/);
    await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();
  });
});

test.describe("sessão", () => {
  test.use({ storageState: caminhoStorageState("admin") });

  test("sem usuário salvo, o perfil é recuperado pela API", async ({ page }) => {
    const admin = lerUsuarios().admin;
    await page.addInitScript(
      (token) => {
        localStorage.setItem("accessToken", token);
        localStorage.removeItem("user");
      },
      tokenDe(admin),
    );

    await page.goto("/chaves");

    await expect(page.locator("aside").getByText("Matheus", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();
    expect(
      await page.evaluate(() => localStorage.getItem("user")),
    ).toContain('"matheus"');
  });

  test("logout revoga o refresh token, limpa o storage e devolve para o login", async ({
    page,
  }) => {
    let corpoRevogacao: unknown;
    let cabecalhoAutorizacao: string | undefined;

    await page.route(`${API_URL}/auth/logout`, async (route) => {
      corpoRevogacao = route.request().postDataJSON();
      cabecalhoAutorizacao = route.request().headers()["authorization"];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Logout realizado com sucesso." }),
      });
    });

    await page.goto("/chaves");
    await page.evaluate(() => localStorage.setItem("refreshToken", "refresh-e2e"));
    await page.getByRole("button", { name: "Sair" }).click();

    await expect.poll(() => corpoRevogacao).toEqual({
      refreshToken: "refresh-e2e",
    });
    expect(cabecalhoAutorizacao).toBeUndefined();
    await expect(page).toHaveURL("http://localhost:5173/");
    expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe("{}");

    await page.goto("/chaves");
    await expect(page).toHaveURL("http://localhost:5173/");
  });

  // Regressão (bug corrigido): o token expirado agora leva o usuário de volta
  // para o login — apiFetch trata a falha de refresh como sessão expirada,
  // limpa o storage e redireciona.
  test("sessão expirada sem refresh token leva ao login", async ({ page }) => {
    const admin = lerUsuarios().admin;
    await page.addInitScript(
      ([token, usuario]) => {
        // Só injeta na primeira carga; o redirect deve limpar e não reinjetar.
        if (sessionStorage.getItem("e2e-sessao-injetada")) return;
        sessionStorage.setItem("e2e-sessao-injetada", "1");
        localStorage.setItem("accessToken", token);
        localStorage.setItem("user", usuario);
      },
      ["token-invalido", JSON.stringify(admin)] as const,
    );

    await page.goto("/chaves");

    await expect(page).toHaveURL("http://localhost:5173/");
    expect(await page.evaluate(() => localStorage.getItem("accessToken"))).toBeNull();
  });

  // Regressão (bug corrigido): com refresh token inválido o usuário é
  // redirecionado para o login em vez de ficar preso em /chaves.
  test("refresh token inválido leva ao login", async ({ page }) => {
    const admin = lerUsuarios().admin;
    await page.addInitScript(
      ([token, usuario]) => {
        if (sessionStorage.getItem("e2e-sessao-injetada")) return;
        sessionStorage.setItem("e2e-sessao-injetada", "1");
        localStorage.setItem("accessToken", token);
        localStorage.setItem("refreshToken", "refresh-invalido");
        localStorage.setItem("user", usuario);
      },
      ["token-invalido", JSON.stringify(admin)] as const,
    );

    await page.goto("/chaves");

    await expect(page).toHaveURL("http://localhost:5173/");
  });
});
