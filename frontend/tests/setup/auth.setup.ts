import fs from "node:fs";
import { expect, test as setup } from "@playwright/test";
import { apiComToken } from "../fixtures/api";
import {
  API_URL,
  AUTH_DIR,
  USERS_FILE,
  caminhoApi,
  caminhoStorageState,
  injetarSessao,
  tokenDe,
  type UsuarioSessao,
} from "../fixtures/sessao";

/**
 * Prepara a base de sessões usada por toda a suíte:
 * 1. aguarda a API ficar disponível;
 * 2. cria o administrador de perfil GESTOR (o seed só cria ADMINISTRADOR);
 * 3. grava o storageState de administrador, gestor e solicitante.
 */

const ADMIN: UsuarioSessao = {
  id: 1,
  nome: "Matheus",
  login: "matheus",
  perfil: "ADMINISTRADOR",
  tipo: "admin",
};

const SOLICITANTE: UsuarioSessao = {
  id: 1,
  nome: "Felipe",
  matricula: "20251038060031",
  perfil: "SOLICITANTE",
  tipo: "solicitante",
};

async function aguardarApi() {
  const limite = Date.now() + 120_000;
  let ultimoErro = "";
  while (Date.now() < limite) {
    try {
      const resposta = await fetch(`${API_URL}/chaves`);
      if (resposta.status < 500) return;
      ultimoErro = `status ${resposta.status}`;
    } catch (erro) {
      ultimoErro = erro instanceof Error ? erro.message : String(erro);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`API não respondeu em ${API_URL} (${ultimoErro}).`);
}

async function prepararGestor(): Promise<UsuarioSessao> {
  const api = await apiComToken(tokenDe(ADMIN));
  const criado = await api.post(caminhoApi("/administradores"), {
    data: { nome: "Gestor E2E", login: "gestor.e2e", perfil: "GESTOR" },
  });
  const statusCriacao = criado.status();
  const corpoCriacao = await criado.text();

  if (statusCriacao === 201) {
    await api.dispose();
    return { ...(JSON.parse(corpoCriacao) as UsuarioSessao), tipo: "admin" };
  }

  // Rodada anterior sem seed: reaproveita o gestor já cadastrado.
  const resposta = await api.get(caminhoApi("/administradores?login=gestor.e2e"));
  const corpo = (await resposta.json()) as { data: UsuarioSessao[] };
  await api.dispose();
  const existente = corpo.data?.[0];
  if (!existente) {
    throw new Error(
      `Não foi possível criar o gestor de teste (status ${statusCriacao}): ${corpoCriacao}`,
    );
  }
  return { ...existente, tipo: "admin" };
}

setup("prepara sessões de teste", async ({ browser }) => {
  setup.setTimeout(180_000);

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  await aguardarApi();

  const usuarios = {
    admin: ADMIN,
    gestor: await prepararGestor(),
    solicitante: SOLICITANTE,
  };
  fs.writeFileSync(USERS_FILE, JSON.stringify(usuarios, null, 2));

  for (const papel of ["admin", "gestor", "solicitante"] as const) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await injetarSessao(page, usuarios[papel]);
    await page.goto("/chaves");
    await expect(
      page.locator("aside").getByText(usuarios[papel].nome, { exact: true }),
    ).toBeVisible();
    await context.storageState({ path: caminhoStorageState(papel) });
    await context.close();
  }
});
