import { expect, test, type Page } from "@playwright/test";
import {
  apiDe,
  criarSolicitante,
  inativarSolicitante,
  matriculaUnica,
  nomeUnico,
} from "../fixtures/api";
import { caminhoApi, caminhoStorageState } from "../fixtures/sessao";

/** P0/P1 — Gestão de solicitantes (cadastro, validações, filtros e ciclo de vida). */

test.use({ storageState: caminhoStorageState("admin") });

const tabela = (page: Page) => page.getByRole("table");

const linhaDoSolicitante = (page: Page, nome: string) =>
  tabela(page).getByRole("row").filter({ hasText: nome });

const buscarPorNome = async (page: Page, nome: string) => {
  await page.goto("/admin/solicitantes");
  await page.getByLabel("Buscar solicitantes por nome").fill(nome);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
};

test("cadastra um novo solicitante e ele aparece na listagem", async ({ page }) => {
  const api = await apiDe("admin");
  const nome = nomeUnico("UI Solicitante");
  const matricula = matriculaUnica();

  try {
    await page.goto("/admin/solicitantes");
    await page.getByRole("button", { name: "Novo solicitante" }).click();
    const dialogo = page.getByRole("dialog", { name: "Novo solicitante" });
    await expect(dialogo).toBeVisible();

    await dialogo.getByLabel("Nome", { exact: true }).fill(nome);
    await dialogo.getByLabel("Tipo", { exact: true }).selectOption("PROFESSOR");
    await dialogo.getByLabel("Matrícula", { exact: true }).fill(matricula);
    await dialogo.getByLabel("Contato", { exact: true }).fill("ui@ifrn.edu.br");
    await dialogo.getByRole("button", { name: "Cadastrar" }).click();

    await expect(page.getByText("Solicitante cadastrado com sucesso!")).toBeVisible();
    await expect(dialogo).toHaveCount(0);

    await buscarPorNome(page, nome);
    const linha = linhaDoSolicitante(page, nome);
    await expect(linha).toBeVisible();
    await expect(linha.getByText(matricula)).toBeVisible();
    await expect(linha.getByText("Professor", { exact: true })).toBeVisible();
    await expect(linha.getByText("Ativo", { exact: true })).toBeVisible();
  } finally {
    await removerSolicitante(api, matricula);
    await api.dispose();
  }
});

test("exige o preenchimento de todos os campos do cadastro", async ({ page }) => {
  await page.goto("/admin/solicitantes");
  await page.getByRole("button", { name: "Novo solicitante" }).click();
  const dialogo = page.getByRole("dialog", { name: "Novo solicitante" });

  await dialogo.getByRole("button", { name: "Cadastrar" }).click();
  await expect(dialogo.getByText("Preencha todos os campos.")).toBeVisible();
  await expect(dialogo).toBeVisible();

  await dialogo.getByLabel("Nome", { exact: true }).fill("Só o nome");
  await dialogo.getByRole("button", { name: "Cadastrar" }).click();
  await expect(dialogo.getByText("Preencha todos os campos.")).toBeVisible();
});

test("avisa quando a matrícula já está cadastrada", async ({ page }) => {
  const api = await apiDe("admin");
  const matricula = matriculaUnica();
  const existente = await criarSolicitante(api, { matricula });

  try {
    await page.goto("/admin/solicitantes");
    await page.getByRole("button", { name: "Novo solicitante" }).click();
    const dialogo = page.getByRole("dialog", { name: "Novo solicitante" });

    await dialogo.getByLabel("Nome", { exact: true }).fill(nomeUnico("Duplicado"));
    await dialogo.getByLabel("Matrícula", { exact: true }).fill(matricula);
    await dialogo.getByLabel("Contato", { exact: true }).fill("dup@ifrn.edu.br");
    await dialogo.getByRole("button", { name: "Cadastrar" }).click();

    await expect(
      dialogo.getByText("Já existe um solicitante com essa matrícula."),
    ).toBeVisible();
    await expect(dialogo).toBeVisible();
  } finally {
    await removerSolicitante(api, existente.matricula);
    await api.dispose();
  }
});

/**
 * Regressão (bug P0 corrigido): a edição falhava com 400 VALIDACAO porque
 * `AtualizarSolicitanteDto` declarava `@IsBoolean() ativo?` sem `@IsOptional()`.
 */
test("edita os dados de um solicitante existente", async ({ page }) => {
  const api = await apiDe("admin");
  const matricula = matriculaUnica();
  const existente = await criarSolicitante(api, { matricula });

  try {
    await buscarPorNome(page, existente.nome);
    await page.getByRole("button", { name: `Editar solicitante ${existente.nome}` }).click();
    const dialogo = page.getByRole("dialog", { name: "Editar solicitante" });
    await expect(dialogo.getByLabel("Matrícula", { exact: true })).toHaveValue(matricula);

    await dialogo.getByLabel("Nome", { exact: true }).fill(nomeUnico("Editado"));
    await dialogo.getByRole("button", { name: "Salvar" }).click();

    await expect(page.getByText("Solicitante atualizado com sucesso!")).toBeVisible();
  } finally {
    await removerSolicitante(api, matricula);
    await api.dispose();
  }
});

test("inativa e reativa um solicitante", async ({ page }) => {
  const api = await apiDe("admin");
  const matricula = matriculaUnica();
  const existente = await criarSolicitante(api, { matricula });

  try {
    await buscarPorNome(page, existente.nome);
    await page
      .getByRole("button", { name: `Inativar solicitante ${existente.nome}` })
      .click();
    const confirmacao = page.getByRole("dialog", { name: "Inativar solicitante" });
    await expect(
      confirmacao.getByText(`Tem certeza que deseja inativar ${existente.nome}?`),
    ).toBeVisible();
    await confirmacao.getByRole("button", { name: "Confirmar inativação" }).click();

    await expect(page.getByText("Solicitante inativado com sucesso!")).toBeVisible();
    // A listagem padrão (Todos) traz ativos e inativos.
    await expect(linhaDoSolicitante(page, existente.nome).getByText("Inativo", { exact: true })).toBeVisible();

    // O filtro de ativos esconde o cadastro inativado.
    await page.getByLabel("Filtrar por situação do cadastro", { exact: true }).selectOption("true");
    await expect(tabela(page).getByText(existente.nome)).toHaveCount(0);

    await page.getByLabel("Filtrar por situação do cadastro", { exact: true }).selectOption("false");
    const linha = linhaDoSolicitante(page, existente.nome);
    await expect(linha.getByText("Inativo", { exact: true })).toBeVisible();

    await page
      .getByRole("button", { name: `Reativar solicitante ${existente.nome}` })
      .click();
    await expect(page.getByText("Solicitante reativado com sucesso!")).toBeVisible();

    await page.getByLabel("Filtrar por situação do cadastro", { exact: true }).selectOption("true");
    await expect(linhaDoSolicitante(page, existente.nome).getByText("Ativo", { exact: true })).toBeVisible();
  } finally {
    await removerSolicitante(api, matricula);
    await api.dispose();
  }
});

test("filtra solicitantes por tipo", async ({ page }) => {
  const api = await apiDe("admin");
  const matricula = matriculaUnica();
  const nome = nomeUnico("Tipo SERVIDOR");
  await criarSolicitante(api, { nome, matricula, tipo: "SERVIDOR" });

  try {
    await buscarPorNome(page, nome);
    await expect(linhaDoSolicitante(page, nome)).toBeVisible();

    await page.getByLabel("Filtrar por tipo de solicitante").selectOption("ALUNO");
    await expect(tabela(page).getByText(nome)).toHaveCount(0);

    await page.getByLabel("Filtrar por tipo de solicitante").selectOption("SERVIDOR");
    await expect(tabela(page).getByText(nome)).toBeVisible();
  } finally {
    await removerSolicitante(api, matricula);
    await api.dispose();
  }
});

test("busca sem resultados mostra o estado vazio", async ({ page }) => {
  await page.goto("/admin/solicitantes");
  await buscarPorNome(page, "NÃO EXISTE 9999");

  await expect(page.getByText("Nenhum solicitante encontrado.")).toBeVisible();
});

/** Localiza e inativa o solicitante criado pelo teste. */
async function removerSolicitante(
  api: Awaited<ReturnType<typeof apiDe>>,
  matricula: string,
) {
  const resposta = await api.get(
    `${caminhoApi("/solicitantes")}?limit=10&matricula=${matricula}&ativo=true`,
  );
  const corpo = (await resposta.json()) as {
    data: Array<{ id: number; matricula: string }>;
  };
  const solicitante = corpo.data.find((item) => item.matricula === matricula);
  if (solicitante) await inativarSolicitante(api, solicitante.id);
}
