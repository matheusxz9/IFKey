import { expect, test } from "@playwright/test";
import {
  apiDe,
  codigoChave,
  criarChave,
  criarSolicitante,
  matriculaUnica,
  nomeUnico,
} from "../fixtures/api";
import { caminhoApi, caminhoStorageState } from "../fixtures/sessao";

test.use({ storageState: caminhoStorageState("admin") });

test("importa solicitantes com prévia, edição e aprovação", async ({ page }) => {
  const api = await apiDe("admin");
  const existente = nomeUnico("Já Existe");
  const matriculaExistente = matriculaUnica();
  await criarSolicitante(api, {
    nome: existente,
    tipo: "ALUNO",
    matricula: matriculaExistente,
    contato: "existente@ifrn.br",
  });

  const novo = nomeUnico("Importado");
  const matriculaNova = matriculaUnica();
  const corrigido = nomeUnico("Corrigido");
  const matriculaCorrigida = matriculaUnica();
  const csv = [
    "nome;tipo;matricula;contato",
    `${novo};ALUNO;${matriculaNova};`,
    `${existente};ALUNO;${matriculaExistente};`,
    `${corrigido};ESTAGIARIO;${matriculaCorrigida};`,
  ].join("\n");

  await page.goto("/admin/solicitantes");
  await page.getByRole("button", { name: "Importar CSV" }).click();
  await expect(page.getByRole("dialog", { name: "Importar solicitantes" })).toBeVisible();
  await page.getByLabel("Arquivo CSV").setInputFiles({
    name: "solicitantes.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });

  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByText("Erro", { exact: true })).toBeVisible();
  await dialogo.getByRole("button", { name: "Editar linha 4" }).click();
  await dialogo.getByLabel("Tipo da linha 4").selectOption("SERVIDOR");
  await dialogo.getByRole("button", { name: "Salvar linha 4" }).click();
  await dialogo.getByRole("button", { name: "Aprovar importação" }).click();
  await expect(dialogo).toBeHidden();

  await page.getByLabel("Buscar solicitantes por nome").fill(novo);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: novo })).toBeVisible();

  // Registro sem contato continua editável sem preencher o campo.
  await page
    .getByRole("row")
    .filter({ hasText: novo })
    .getByRole("button", { name: `Editar solicitante ${novo}` })
    .click();
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Solicitante atualizado com sucesso!")).toBeVisible();

  const porMatricula = async (matricula: string) => {
    const resposta = await api.get(caminhoApi(`/solicitantes?matricula=${matricula}`));
    return ((await resposta.json()) as { data: { id: number }[] }).data[0].id;
  };
  await api.delete(caminhoApi(`/solicitantes/${await porMatricula(matriculaNova)}`));
  await api.delete(caminhoApi(`/solicitantes/${await porMatricula(matriculaCorrigida)}`));
  await api.dispose();
});

test("recusar descarta a prévia sem gravar", async ({ page }) => {
  const api = await apiDe("admin");
  const nome = nomeUnico("Recusado");
  const matricula = matriculaUnica();
  const csv = `nome;tipo;matricula;contato\n${nome};ALUNO;${matricula};`;

  await page.goto("/admin/solicitantes");
  await page.getByRole("button", { name: "Importar CSV" }).click();
  await page.getByLabel("Arquivo CSV").setInputFiles({
    name: "solicitantes.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await page.getByRole("dialog").getByRole("button", { name: "Recusar" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  const resposta = await api.get(caminhoApi(`/solicitantes?matricula=${matricula}`));
  expect(((await resposta.json()) as { data: unknown[] }).data).toEqual([]);
  await api.dispose();
});

test("importa chaves por CSV", async ({ page }) => {
  const api = await apiDe("admin");
  const existente = await criarChave(api);
  const codigo = codigoChave("IMP");
  const csv = [
    "codigo;descricao;localizacao",
    `${codigo};Chave importada;Bloco A`,
    `${existente.codigo};Chave já cadastrada;Bloco B`,
  ].join("\n");

  try {
    await page.goto("/admin/chaves");
    await page.getByRole("button", { name: "Importar CSV" }).click();
    await expect(page.getByRole("dialog", { name: "Importar chaves" })).toBeVisible();
    await page.getByLabel("Arquivo CSV").setInputFiles({
      name: "chaves.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });
    const dialogo = page.getByRole("dialog");
    await expect(
      dialogo.getByText("Já cadastrado", { exact: true }),
    ).toBeVisible();
    await dialogo.getByRole("button", { name: "Aprovar importação" }).click();
    await expect(dialogo).toBeHidden();

    await page.getByLabel("Buscar chaves por código, descrição ou localização").fill(codigo);
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(page.getByRole("row").filter({ hasText: codigo })).toBeVisible();

    const resposta = await api.get(caminhoApi(`/chaves?busca=${codigo}`));
    const [chave] = ((await resposta.json()) as { data: { id: number }[] }).data;
    await api.delete(caminhoApi(`/chaves/${chave.id}`));
  } finally {
    await api.delete(caminhoApi(`/chaves/${existente.id}`));
    await api.dispose();
  }
});
