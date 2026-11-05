import { expect, test } from "@playwright/test";
import { API_URL, lerUsuarios, tokenDe } from "../fixtures/sessao";
import {
  interceptarAuthorizeSuap,
  mockarTrocaDeCode,
  prepararStateOAuth,
  urlCallback,
} from "../fixtures/mock";

/**
 * P0 — Autenticação via SUAP (OAuth2).
 *
 * O provedor externo é substituído por um stub local: o redirecionamento do SUAP
 * devolve para o callback e a troca do code (POST /auth/suap) é interceptada.
 * Todo o restante do fluxo (callback, localStorage, roteamento, layout) roda de verdade.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test("conclui o login pelo SUAP e persiste a sessão", async ({ page }) => {
  const admin = lerUsuarios().admin;
  const lerUrlAutorizacao = await interceptarAuthorizeSuap(page, "code-e2e");
  await mockarTrocaDeCode(page, {
    status: 200,
    body: {
      accessToken: tokenDe(admin),
      refreshToken: "refresh-token-e2e",
      user: admin,
    },
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Entrar com SUAP" }).click();

  const urlAutorizacao = lerUrlAutorizacao();
  expect(urlAutorizacao).not.toBeNull();
  expect(urlAutorizacao?.searchParams.get("response_type")).toBe("code");
  expect(urlAutorizacao?.searchParams.get("redirect_uri")).toBe(
    "http://localhost:5173/login/suap/callback",
  );
  expect(urlAutorizacao?.searchParams.get("client_id")).toBeTruthy();
  expect(urlAutorizacao?.searchParams.get("state")).toBeTruthy();

  await expect(page).toHaveURL(/\/chaves$/);
  await expect(page.locator("aside").getByText("Matheus", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();

  const sessao = await page.evaluate(() => ({
    accessToken: localStorage.getItem("accessToken"),
    refreshToken: localStorage.getItem("refreshToken"),
    usuario: localStorage.getItem("user"),
  }));
  expect(sessao.accessToken).toBeTruthy();
  expect(sessao.refreshToken).toBe("refresh-token-e2e");
  expect(JSON.parse(sessao.usuario ?? "{}")).toMatchObject({
    login: "matheus",
    perfil: "ADMINISTRADOR",
  });
});

test("exibe estado de carregamento durante a troca do code", async ({ page }) => {
  const admin = lerUsuarios().admin;
  await interceptarAuthorizeSuap(page, "code-lento");
  await page.route(`${API_URL}/auth/suap`, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        accessToken: tokenDe(admin),
        refreshToken: "refresh-token-e2e",
        user: admin,
      }),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Entrar com SUAP" }).click();

  await expect(page.getByText("Entrando no IFKey...")).toBeVisible();
  await expect(page).toHaveURL(/\/chaves$/);
});

test("sem código de autorização mostra erro no callback", async ({ page }) => {
  const state = await prepararStateOAuth(page);
  await page.goto(urlCallback(undefined, state));

  await expect(page.getByRole("heading", { name: "Erro ao entrar" })).toBeVisible();
  await expect(page.getByText("Código de autenticação não encontrado.")).toBeVisible();
});

test("rejeita callback sem state OAuth", async ({ page }) => {
  await page.goto("/login/suap/callback?code=code-e2e");

  await expect(
    page.getByText("Sessão de autenticação inválida. Tente entrar novamente."),
  ).toBeVisible();
});

test("rejeita callback com state OAuth divergente", async ({ page }) => {
  await prepararStateOAuth(page, "state-armazenado");
  await page.goto(urlCallback("code-e2e", "state-diferente"));

  await expect(
    page.getByText("Sessão de autenticação inválida. Tente entrar novamente."),
  ).toBeVisible();
});

test("mostra a mensagem da API quando o SUAP recusa o usuário", async ({ page }) => {
  await mockarTrocaDeCode(page, {
    status: 403,
    body: {
      statusCode: 403,
      message: "Usuário não está cadastrado como administrador ou solicitante ativo.",
      code: "SEM_PERMISSAO",
    },
  });

  const state = await prepararStateOAuth(page);
  await page.goto(urlCallback("code-invalido", state));

  await expect(page.getByRole("heading", { name: "Erro ao entrar" })).toBeVisible();
  await expect(
    page.getByText(
      "Usuário não está cadastrado como administrador ou solicitante ativo.",
    ),
  ).toBeVisible();
});

test("concatena a lista de erros de validação devolvida pela API", async ({ page }) => {
  await mockarTrocaDeCode(page, {
    status: 400,
    body: { statusCode: 400, message: ["Primeiro erro.", "Segundo erro."] },
  });

  const state = await prepararStateOAuth(page);
  await page.goto(urlCallback("code-invalido", state));

  await expect(page.getByText("Primeiro erro. Segundo erro.")).toBeVisible();
});

test("informa falha de conexão quando o backend está indisponível", async ({
  page,
}) => {
  await mockarTrocaDeCode(page, "erro-de-rede");

  const state = await prepararStateOAuth(page);
  await page.goto(urlCallback("code-e2e", state));

  await expect(
    page.getByText(
      "Não foi possível conectar ao servidor de login. Verifique se o backend está rodando.",
    ),
  ).toBeVisible();
});

test("detecta resposta inesperada sem os tokens de sessão", async ({ page }) => {
  await mockarTrocaDeCode(page, { status: 200, body: { accessToken: "apenas-um" } });

  const state = await prepararStateOAuth(page);
  await page.goto(urlCallback("code-e2e", state));

  await expect(page.getByText("Resposta inválida do servidor de login.")).toBeVisible();
});
