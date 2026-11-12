import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import {
  apiDe,
  caminhoChaves,
  codigoChave,
  criarChave,
  inativarChave,
} from "../fixtures/api";
import { caminhoStorageState } from "../fixtures/sessao";

/** P0/P1 — Gestão de chaves (CRUD, validações e filtros). */

test.use({ storageState: caminhoStorageState("admin") });

const tabela = (page: Page) => page.getByRole("table");

const linhaDaChave = (page: Page, codigo: string) =>
  tabela(page).getByRole("row").filter({ hasText: codigo });

const abrirNovaChave = async (page: Page) => {
  await page.goto("/admin/chaves");
  await page.getByRole("button", { name: "Nova chave" }).click();
  await expect(page.getByRole("dialog", { name: "Nova chave" })).toBeVisible();
};

test("cadastra uma nova chave e ela aparece na listagem", async ({ page }) => {
  const api = await apiDe("admin");
  const codigo = codigoChave("CAD");

  try {
    await abrirNovaChave(page);
    const dialogo = page.getByRole("dialog", { name: "Nova chave" });
    await dialogo.getByLabel("Código", { exact: true }).fill(codigo);
    await dialogo.getByLabel("Descrição", { exact: true }).fill("Chave criada pela UI");
    await dialogo.getByLabel("Localização", { exact: true }).fill("Bloco UI, Sala 1");
    await dialogo.getByRole("button", { name: "Cadastrar" }).click();

    await expect(page.getByText("Chave cadastrada com sucesso!")).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Nova chave" })).toHaveCount(0);

    await page.getByLabel("Buscar chaves por código, descrição ou localização").fill(codigo);
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(tabela(page).getByText(codigo)).toBeVisible();
    await expect(tabela(page).getByText("Chave criada pela UI")).toBeVisible();
    await expect(tabela(page).getByText("Bloco UI, Sala 1")).toBeVisible();
    await expect(linhaDaChave(page, codigo).getByText("Ativo", { exact: true })).toBeVisible();
  } finally {
    await encerrar(api, codigo);
    await api.dispose();
  }
});

test("exige o preenchimento de todos os campos do cadastro", async ({ page }) => {
  await abrirNovaChave(page);
  const dialogo = page.getByRole("dialog", { name: "Nova chave" });

  await dialogo.getByRole("button", { name: "Cadastrar" }).click();
  await expect(dialogo.getByText("Preencha todos os campos.")).toBeVisible();
  await expect(dialogo).toBeVisible();

  await dialogo.getByLabel("Código", { exact: true }).fill("APENAS-UM-CODIGO");
  await dialogo.getByRole("button", { name: "Cadastrar" }).click();
  await expect(dialogo.getByText("Preencha todos os campos.")).toBeVisible();
});

test("avisa quando o código da chave já existe", async ({ page }) => {
  const api = await apiDe("admin");
  const codigo = codigoChave("DUP");
  await criarChave(api, { codigo });

  try {
    await abrirNovaChave(page);
    const dialogo = page.getByRole("dialog", { name: "Nova chave" });
    await dialogo.getByLabel("Código", { exact: true }).fill(codigo);
    await dialogo.getByLabel("Descrição", { exact: true }).fill("Duplicada");
    await dialogo.getByLabel("Localização", { exact: true }).fill("Bloco Duplicada");
    await dialogo.getByRole("button", { name: "Cadastrar" }).click();

    await expect(dialogo.getByText("Já existe uma chave com esse código.")).toBeVisible();
    await expect(dialogo).toBeVisible();
  } finally {
    await encerrar(api, codigo);
    await api.dispose();
  }
});

/**
 * Regressão (bug P0 corrigido): a edição falhava com 400 VALIDACAO porque
 * `AtualizarChaveDto` declarava `@IsBoolean() ativo?` sem `@IsOptional()`,
 * rejeitando qualquer PATCH sem o campo `ativo`.
 */
test("edita os dados de uma chave existente", async ({ page }) => {
  const api = await apiDe("admin");
  const codigo = codigoChave("EDI");
  await criarChave(api, { codigo });

  try {
    await page.goto("/admin/chaves");
    await page
      .getByLabel("Buscar chaves por código, descrição ou localização")
      .fill(codigo);
    await page.getByRole("button", { name: "Buscar", exact: true }).click();

    await page.getByRole("button", { name: `Editar chave ${codigo}` }).click();
    const dialogo = page.getByRole("dialog", { name: "Editar chave" });
    await expect(dialogo.getByLabel("Código", { exact: true })).toHaveValue(codigo);

    await dialogo.getByLabel("Descrição", { exact: true }).fill("Descrição editada pela UI");
    await dialogo.getByRole("button", { name: "Salvar" }).click();

    await expect(page.getByText("Chave atualizada com sucesso!")).toBeVisible();
    await expect(tabela(page).getByText("Descrição editada pela UI")).toBeVisible();
  } finally {
    await encerrar(api, codigo);
    await api.dispose();
  }
});

test("inativa e reativa uma chave", async ({ page }) => {
  const api = await apiDe("admin");
  const codigo = codigoChave("INA");
  await criarChave(api, { codigo });

  try {
    await page.goto("/admin/chaves");
    await page
      .getByLabel("Buscar chaves por código, descrição ou localização")
      .fill(codigo);
    await page.getByRole("button", { name: "Buscar", exact: true }).click();

    await page.getByRole("button", { name: `Inativar chave ${codigo}` }).click();
    const confirmacao = page.getByRole("dialog", { name: "Inativar chave" });
    await expect(
      confirmacao.getByText(`Tem certeza que deseja inativar a chave ${codigo}?`),
    ).toBeVisible();
    await confirmacao.getByRole("button", { name: "Confirmar inativação" }).click();

    await expect(page.getByText("Chave inativada com sucesso!")).toBeVisible();
    // A listagem padrão (Todos) traz ativos e inativos.
    await expect(linhaDaChave(page, codigo).getByText("Inativo", { exact: true })).toBeVisible();

    // O filtro de ativos esconde a chave inativada.
    await page.getByLabel("Filtrar por situação do cadastro", { exact: true }).selectOption("true");
    await expect(tabela(page).getByText(codigo)).toHaveCount(0);

    // Para reativar é preciso filtrar pelos inativos.
    await page.getByLabel("Filtrar por situação do cadastro", { exact: true }).selectOption("false");
    await expect(tabela(page).getByText(codigo)).toBeVisible();
    await expect(linhaDaChave(page, codigo).getByText("Inativo", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: `Reativar chave ${codigo}` }).click();
    await expect(page.getByText("Chave reativada com sucesso!")).toBeVisible();

    await page.getByLabel("Filtrar por situação do cadastro", { exact: true }).selectOption("true");
    await expect(tabela(page).getByText(codigo)).toBeVisible();
    await expect(linhaDaChave(page, codigo).getByText("Ativo", { exact: true })).toBeVisible();
  } finally {
    await encerrar(api, codigo);
    await api.dispose();
  }
});

test("busca sem resultados mostra o estado vazio", async ({ page }) => {
  await page.goto("/admin/chaves");
  await page
    .getByLabel("Buscar chaves por código, descrição ou localização")
    .fill("NAO-EXISTE-9999");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();

  await expect(page.getByText("Nenhuma chave encontrada.")).toBeVisible();
});

test.describe("como gestor", () => {
  test.use({ storageState: caminhoStorageState("gestor") });

  test("também pode cadastrar chaves", async ({ page }) => {
    const api = await apiDe("admin");
    const codigo = codigoChave("GES");

    try {
      await abrirNovaChave(page);
      const dialogo = page.getByRole("dialog", { name: "Nova chave" });
      await dialogo.getByLabel("Código", { exact: true }).fill(codigo);
      await dialogo.getByLabel("Descrição", { exact: true }).fill("Chave do gestor");
      await dialogo.getByLabel("Localização", { exact: true }).fill("Bloco Gestor");
      await dialogo.getByRole("button", { name: "Cadastrar" }).click();

      await expect(page.getByText("Chave cadastrada com sucesso!")).toBeVisible();
      await expect(page.getByRole("dialog", { name: "Nova chave" })).toHaveCount(0);

      await page
        .getByLabel("Buscar chaves por código, descrição ou localização")
        .fill(codigo);
      await page.getByRole("button", { name: "Buscar", exact: true }).click();
      await expect(tabela(page).getByText(codigo)).toBeVisible();
    } finally {
      await encerrar(api, codigo);
      await api.dispose();
    }
  });
});

/** Inativa a chave e falha silenciosamente se ela já tiver sido removida. */
async function encerrar(api: APIRequestContext, codigo: string) {
  const resposta = await api.get(caminhoChaves(`busca=${codigo}`));
  const corpo = (await resposta.json()) as {
    data: Array<{ id: number; codigo: string }>;
  };
  const chave = corpo.data.find((item) => item.codigo === codigo);
  if (chave) await inativarChave(api, chave.id);
}
