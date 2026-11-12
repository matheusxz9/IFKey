import { expect, test, type Page } from "@playwright/test";
import {
  apiDe,
  criarAdministrador,
  inativarAdministrador,
  loginUnico,
  nomeUnico,
} from "../fixtures/api";
import { caminhoApi, caminhoStorageState } from "../fixtures/sessao";

/** P0/P1 — Gestão de administradores (perfil restrito ao ADMINISTRADOR). */

test.use({ storageState: caminhoStorageState("admin") });

const tabela = (page: Page) => page.getByRole("table");

const linhaDoAdministrador = (page: Page, login: string) =>
  tabela(page).getByRole("row").filter({ hasText: login });

const buscarPorLogin = async (page: Page, login: string) => {
  await page.goto("/admin/administradores");
  await page.getByLabel("Buscar administradores por login").fill(login);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
};

test("cadastra um novo administrador e ele aparece na listagem", async ({ page }) => {
  const api = await apiDe("admin");
  const login = loginUnico();
  const nome = nomeUnico("UI Admin");

  try {
    await page.goto("/admin/administradores");
    await page.getByRole("button", { name: "Novo administrador" }).click();
    const dialogo = page.getByRole("dialog", { name: "Novo administrador" });
    await expect(dialogo).toBeVisible();

    await dialogo.getByLabel("Nome", { exact: true }).fill(nome);
    await dialogo.getByLabel("Login (SUAP)", { exact: true }).fill(login);
    await dialogo.getByLabel("Perfil", { exact: true }).selectOption("GESTOR");
    await dialogo.getByRole("button", { name: "Cadastrar" }).click();

    await expect(page.getByText("Administrador cadastrado com sucesso!")).toBeVisible();
    await expect(dialogo).toHaveCount(0);

    await buscarPorLogin(page, login);
    const linha = linhaDoAdministrador(page, login);
    await expect(linha.getByText(nome)).toBeVisible();
    await expect(linha.getByText("Gestor", { exact: true })).toBeVisible();
    await expect(linha.getByText("Ativo", { exact: true })).toBeVisible();
  } finally {
    await removerAdministrador(api, login);
    await api.dispose();
  }
});

test("exige o preenchimento de todos os campos do cadastro", async ({ page }) => {
  await page.goto("/admin/administradores");
  await page.getByRole("button", { name: "Novo administrador" }).click();
  const dialogo = page.getByRole("dialog", { name: "Novo administrador" });

  await dialogo.getByRole("button", { name: "Cadastrar" }).click();
  await expect(
    dialogo.getByText("Preencha todos os campos obrigatórios."),
  ).toBeVisible();
  await expect(dialogo).toBeVisible();

  await dialogo.getByLabel("Nome", { exact: true }).fill("Só o nome");
  await dialogo.getByRole("button", { name: "Cadastrar" }).click();
  await expect(
    dialogo.getByText("Preencha todos os campos obrigatórios."),
  ).toBeVisible();
});

/**
 * Regressão (bug P1 corrigido): o cadastro com login duplicado retornava 500.
 * O service agora detecta o duplicado e responde 409 LOGIN_DUPLICADO, então a
 * tela mostra "Já existe um administrador com esse login.".
 */
test("avisa quando o login já está cadastrado", async ({ page }) => {
  const api = await apiDe("admin");
  const login = loginUnico();
  await criarAdministrador(api, { login, nome: nomeUnico("Repetido") });

  try {
    await page.goto("/admin/administradores");
    await page.getByRole("button", { name: "Novo administrador" }).click();
    const dialogo = page.getByRole("dialog", { name: "Novo administrador" });

    await dialogo.getByLabel("Nome", { exact: true }).fill(nomeUnico("Novo"));
    await dialogo.getByLabel("Login (SUAP)", { exact: true }).fill(login);
    await dialogo.getByLabel("Perfil", { exact: true }).selectOption("GESTOR");
    await dialogo.getByRole("button", { name: "Cadastrar" }).click();

    await expect(
      dialogo.getByText("Já existe um administrador com esse login."),
    ).toBeVisible();
    await expect(dialogo).toBeVisible();
  } finally {
    await removerAdministrador(api, login);
    await api.dispose();
  }
});

test("edita o nome e o perfil de um administrador", async ({ page }) => {
  const api = await apiDe("admin");
  const login = loginUnico();
  const nome = nomeUnico("Edita Admin");
  const criado = await criarAdministrador(api, { login, nome });

  try {
    await buscarPorLogin(page, login);
    await page.getByRole("button", { name: `Editar administrador ${nome}` }).click();
    const dialogo = page.getByRole("dialog", { name: "Editar administrador" });
    await expect(dialogo.getByLabel("Nome", { exact: true })).toHaveValue(nome);

    const nomeEditado = nomeUnico("Admin Editado");
    await dialogo.getByLabel("Nome", { exact: true }).fill(nomeEditado);
    await dialogo.getByLabel("Perfil", { exact: true }).selectOption("ADMINISTRADOR");
    await dialogo.getByRole("button", { name: "Salvar" }).click();

    await expect(page.getByText("Administrador atualizado com sucesso!")).toBeVisible();

    await buscarPorLogin(page, login);
    const linha = linhaDoAdministrador(page, login);
    await expect(linha.getByText(nomeEditado)).toBeVisible();
    await expect(linha.getByText("Administrador", { exact: true })).toBeVisible();

    // Restaura o perfil para não interferir em outros testes.
    await page.getByRole("button", { name: `Editar administrador ${nomeEditado}` }).click();
    await dialogo.getByLabel("Perfil", { exact: true }).selectOption("GESTOR");
    await dialogo.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Administrador atualizado com sucesso!")).toBeVisible();
    expect(criado.login).toBe(login);
  } finally {
    await removerAdministrador(api, login);
    await api.dispose();
  }
});

test("inativa e reativa um administrador", async ({ page }) => {
  const api = await apiDe("admin");
  const login = loginUnico();
  const nome = nomeUnico("Inativa Admin");
  await criarAdministrador(api, { login, nome });

  try {
    await buscarPorLogin(page, login);
    await page.getByRole("button", { name: `Inativar administrador ${nome}` }).click();
    const confirmacao = page.getByRole("dialog", { name: "Inativar administrador" });
    await expect(
      confirmacao.getByText(`Tem certeza que deseja inativar ${nome}?`),
    ).toBeVisible();
    await confirmacao.getByRole("button", { name: "Confirmar inativação" }).click();

    await expect(page.getByText("Administrador inativado com sucesso!")).toBeVisible();
    const linha = linhaDoAdministrador(page, login);
    await expect(linha.getByText("Inativo", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: `Reativar administrador ${nome}` }).click();
    await expect(page.getByText("Administrador reativado com sucesso!")).toBeVisible();
    await expect(linhaDoAdministrador(page, login).getByText("Ativo", { exact: true })).toBeVisible();
  } finally {
    await removerAdministrador(api, login);
    await api.dispose();
  }
});

test("busca sem resultados mostra o estado vazio", async ({ page }) => {
  await page.goto("/admin/administradores");
  await page.getByLabel("Buscar administradores por login").fill("nao.existe.9999");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();

  await expect(page.getByText("Nenhum administrador encontrado.")).toBeVisible();
});

/** Localiza e inativa o administrador criado pelo teste. */
async function removerAdministrador(
  api: Awaited<ReturnType<typeof apiDe>>,
  login: string,
) {
  const resposta = await api.get(
    `${caminhoApi("/administradores")}?limit=10&login=${login}`,
  );
  const corpo = (await resposta.json()) as {
    data: Array<{ id: number; login: string; ativo: boolean }>;
  };
  const administrador = corpo.data.find((item) => item.login === login);
  if (administrador?.ativo) await inativarAdministrador(api, administrador.id);
}
