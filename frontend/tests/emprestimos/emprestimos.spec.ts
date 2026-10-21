import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import {
  apiDe,
  caminhoChaves,
  codigoChave,
  criarChave,
  criarEmprestimo,
  criarSolicitante,
  devolverEmprestimo,
  inativarChave,
  inativarSolicitante,
} from "../fixtures/api";
import { caminhoApi, caminhoStorageState, lerUsuarios } from "../fixtures/sessao";

/**
 * P0 — Fluxo de empréstimo/devolução de chaves.
 *
 * Os dados são criados pela API em um prefixo único e removidos ao final,
 * garantindo que os testes não dependam da ordem de execução.
 */

test.use({ storageState: caminhoStorageState("admin") });

const secaoEmprestimosAtivos = (page: Page) =>
  page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Empréstimos ativos" }) });

const tabelaDeChaves = (page: Page) =>
  page.locator("section").filter({ has: page.getByRole("table") }).first();

async function abrirModalDeEmprestimo(page: Page, codigo: string) {
  await page.goto("/chaves");
  await page.getByLabel("Buscar chaves por código ou descrição").fill(codigo);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(tabelaDeChaves(page).getByText(codigo)).toBeVisible();
  await tabelaDeChaves(page)
    .getByRole("button", { name: `Emprestar chave ${codigo}` })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Registrar empréstimo" }),
  ).toBeVisible();
}

/** Devolve (se preciso) e inativa a chave para não poluir as próximas execuções. */
async function encerrarChave(api: APIRequestContext, codigo: string) {
  const resposta = await api.get(caminhoChaves(`busca=${codigo}`));
  const corpo = (await resposta.json()) as {
    data: Array<{ id: number; status: string; codigo: string }>;
  };
  const chave = corpo.data.find((item) => item.codigo === codigo);
  if (!chave) return;

  if (chave.status === "EMPRESTADA") {
    const emprestimos = await api.get(
      caminhoApi("/emprestimos?status=EMPRESTADA&limit=100"),
    );
    const lista = ((await emprestimos.json()) as { data: Array<{
      id: number;
      chave: { codigo: string };
    }> }).data;
    const emprestimo = lista.find((item) => item.chave.codigo === codigo);
    if (emprestimo) await devolverEmprestimo(api, emprestimo.id);
  }
  await inativarChave(api, chave.id);
}

test("registra empréstimo e devolve a chave pelo fluxo completo", async ({
  page,
}) => {
  const api = await apiDe("admin");
  const codigo = codigoChave("EMP");
  await criarChave(api, { codigo });
  const solicitante = await criarSolicitante(api, {
    nome: "Solicitante Emprestimo",
  });

  try {
    await abrirModalDeEmprestimo(page, codigo);

    const dialogo = page.getByRole("dialog", { name: "Registrar empréstimo" });
    await expect(dialogo.getByText(codigo)).toBeVisible();
    await expect(
      dialogo.getByRole("button", { name: "Confirmar empréstimo" }),
    ).toBeDisabled();

    await dialogo.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(
      dialogo.getByText("Informe a matrícula do solicitante."),
    ).toBeVisible();

    await dialogo.getByPlaceholder("Digite a matrícula").fill(solicitante.matricula);
    await dialogo.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(dialogo.getByText(solicitante.nome)).toBeVisible();
    await expect(dialogo.getByText(`Matrícula: ${solicitante.matricula}`)).toBeVisible();
    await expect(
      dialogo.getByRole("button", { name: "Confirmar empréstimo" }),
    ).toBeEnabled();

    await dialogo.getByRole("button", { name: "Confirmar empréstimo" }).click();

    await expect(page.getByText("Empréstimo registrado com sucesso!")).toBeVisible();
    await expect(
      page.getByRole("dialog", { name: "Registrar empréstimo" }),
    ).toHaveCount(0);

    // A chave aparece como emprestada na tabela principal e nos empréstimos ativos.
    await expect(
      tabelaDeChaves(page).getByRole("button", { name: `Devolver chave ${codigo}` }),
    ).toBeVisible();
    const ativos = secaoEmprestimosAtivos(page);
    await expect(ativos.getByText(codigo)).toBeVisible();
    await expect(
      ativos.getByRole("row").filter({ hasText: codigo }).getByText(solicitante.nome),
    ).toBeVisible();

  } finally {
    await encerrarChave(api, codigo);
    await api.dispose();
  }
});

/**
 * Regressão (bug P0 corrigido): a devolução retornava 500 porque o lock
 * pessimistic_write era aplicado a um findOne com join (relations: chave),
 * que o Postgres rejeita em outer join. O serviço agora trava a linha do
 * empréstimo separadamente e a chave volta para DISPONIVEL.
 */
test("devolve a chave pelo fluxo completo", async ({ page }) => {
  const api = await apiDe("admin");
  const codigo = codigoChave("DEV");
  const chave = await criarChave(api, { codigo });
  const solicitante = await criarSolicitante(api);
  await criarEmprestimo(api, { solicitanteId: solicitante.id, chaveId: chave.id });

  try {
    await page.goto("/chaves");
    const ativos = secaoEmprestimosAtivos(page);
    await expect(ativos.getByText(codigo)).toBeVisible();

    await ativos.getByRole("button", { name: `Devolver chave ${codigo}` }).click();
    const confirmacao = page.getByRole("dialog", { name: "Confirmar devolução" });
    await expect(
      confirmacao.getByText(`Deseja devolver a chave ${codigo}?`),
    ).toBeVisible();
    await confirmacao.getByRole("button", { name: "Confirmar devolução" }).click();

    await expect(page.getByText("Devolução registrada com sucesso!")).toBeVisible();
    await expect(ativos.getByText(codigo)).toHaveCount(0);

    // Filtra a chave: a lista é paginada e a linha pode não estar na 1ª página.
    await page.getByLabel("Buscar chaves por código ou descrição").fill(codigo);
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(
      tabelaDeChaves(page).getByRole("button", { name: `Emprestar chave ${codigo}` }),
    ).toBeVisible();
  } finally {
    await encerrarChave(api, codigo);
    await api.dispose();
  }
});

test("mostra erros de matrícula vazia e de solicitante inexistente", async ({
  page,
}) => {
  const api = await apiDe("admin");
  const codigo = codigoChave("ERR");
  const chave = await criarChave(api, { codigo });

  try {
    await abrirModalDeEmprestimo(page, codigo);
    const dialogo = page.getByRole("dialog", { name: "Registrar empréstimo" });

    await dialogo.getByPlaceholder("Digite a matrícula").fill("   ");
    await dialogo.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(
      dialogo.getByText("Informe a matrícula do solicitante."),
    ).toBeVisible();

    await dialogo.getByPlaceholder("Digite a matrícula").fill("0000000000000");
    await dialogo.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(dialogo.getByText("Solicitante não encontrado.")).toBeVisible();
    await expect(
      dialogo.getByRole("button", { name: "Confirmar empréstimo" }),
    ).toBeDisabled();
  } finally {
    await inativarChave(api, chave.id);
    await api.dispose();
  }
});

test("cancelar fecha o modal sem registrar empréstimo", async ({ page }) => {
  const api = await apiDe("admin");
  const codigo = codigoChave("CAN");
  const chave = await criarChave(api, { codigo });

  try {
    await abrirModalDeEmprestimo(page, codigo);
    const dialogo = page.getByRole("dialog", { name: "Registrar empréstimo" });
    await dialogo.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialogo).toHaveCount(0);

    await expect(secaoEmprestimosAtivos(page).getByText(codigo)).toHaveCount(0);
    await expect(
      tabelaDeChaves(page).getByRole("button", { name: `Emprestar chave ${codigo}` }),
    ).toBeVisible();
  } finally {
    await inativarChave(api, chave.id);
    await api.dispose();
  }
});

test("avisa quando a chave foi emprestada por outra pessoa durante o preenchimento", async ({
  page,
}) => {
  const api = await apiDe("admin");
  const codigo = codigoChave("COR");
  const chave = await criarChave(api, { codigo });
  const solicitante = await criarSolicitante(api);

  try {
    await abrirModalDeEmprestimo(page, codigo);
    const dialogo = page.getByRole("dialog", { name: "Registrar empréstimo" });
    await dialogo.getByPlaceholder("Digite a matrícula").fill(solicitante.matricula);
    await dialogo.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(dialogo.getByText(solicitante.nome)).toBeVisible();

    // Outro atendente empresta a mesma chave enquanto o modal está aberto.
    await criarEmprestimo(api, {
      solicitanteId: solicitante.id,
      chaveId: chave.id,
    });
    await dialogo.getByRole("button", { name: "Confirmar empréstimo" }).click();

    await expect(
      dialogo.getByText(
        "Essa chave acabou de ser emprestada. Atualize a lista e tente novamente.",
      ),
    ).toBeVisible();
    await expect(dialogo).toBeVisible();
  } finally {
    await encerrarChave(api, codigo);
    await inativarSolicitante(api, solicitante.id);
    await api.dispose();
  }
});

test("exibe todos os empréstimos ativos, inclusive além da primeira página", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const api = await apiDe("admin");
  const solicitante = await criarSolicitante(api);
  const chaves: number[] = [];
  const emprestimos: number[] = [];
  const codigos: string[] = [];

  try {
    for (let indice = 0; indice < 21; indice += 1) {
      const codigo = codigoChave(`ATV${indice}`);
      const chave = await criarChave(api, { codigo });
      chaves.push(chave.id);
      codigos.push(codigo);
      const emprestimo = await criarEmprestimo(api, {
        solicitanteId: solicitante.id,
        chaveId: chave.id,
      });
      emprestimos.push(emprestimo.id);
    }

    await page.goto("/chaves");
    const ativos = secaoEmprestimosAtivos(page);

    for (const codigo of codigos) {
      await expect(ativos.getByText(codigo)).toBeVisible();
    }
  } finally {
    for (const id of emprestimos) {
      await devolverEmprestimo(api, id);
    }
    for (const id of chaves) {
      await inativarChave(api, id);
    }
    await inativarSolicitante(api, solicitante.id);
    await api.dispose();
  }
});

test("filtra a lista de chaves por status", async ({ page }) => {
  const api = await apiDe("admin");
  const base = Date.now().toString(36);
  const codigoDisponivel = `FIL-${base}A`;
  const codigoEmprestada = `FIL-${base}B`;
  const chaveDisponivel = await criarChave(api, { codigo: codigoDisponivel });
  const chaveEmprestada = await criarChave(api, { codigo: codigoEmprestada });
  const solicitante = await criarSolicitante(api);
  const emprestimo = await criarEmprestimo(api, {
    solicitanteId: solicitante.id,
    chaveId: chaveEmprestada.id,
  });

  try {
    await page.goto("/chaves");
    // Busca que casa com as duas chaves; o filtro de status deve reduzir o resultado.
    await page
      .getByLabel("Buscar chaves por código ou descrição")
      .fill(`FIL-${base}`);
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(tabelaDeChaves(page).getByText(codigoDisponivel)).toBeVisible();
    await expect(tabelaDeChaves(page).getByText(codigoEmprestada)).toBeVisible();

    await page.getByLabel("Filtrar por status").selectOption("EMPRESTADA");
    await expect(tabelaDeChaves(page).getByText(codigoEmprestada)).toBeVisible();
    await expect(tabelaDeChaves(page).getByText(codigoDisponivel)).toHaveCount(0);

    await page.getByLabel("Filtrar por status").selectOption("DISPONIVEL");
    await expect(tabelaDeChaves(page).getByText(codigoDisponivel)).toBeVisible();
    await expect(tabelaDeChaves(page).getByText(codigoEmprestada)).toHaveCount(0);
  } finally {
    await devolverEmprestimo(api, emprestimo.id);
    await inativarChave(api, chaveDisponivel.id);
    await inativarChave(api, chaveEmprestada.id);
    await inativarSolicitante(api, solicitante.id);
    await api.dispose();
  }
});

test("busca sem resultados exibe o estado vazio", async ({ page }) => {
  await page.goto("/chaves");
  await page
    .getByLabel("Buscar chaves por código ou descrição")
    .fill("NAO-EXISTE-9999");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();

  await expect(page.getByText("Nenhuma chave encontrada.")).toBeVisible();
});

test("navega entre as páginas da lista de chaves", async ({ page }) => {
  const api = await apiDe("admin");
  const criadas: number[] = [];
  for (let indice = 0; indice < 6; indice += 1) {
    const chave = await criarChave(api, { codigo: codigoChave(`PG${indice}`) });
    criadas.push(chave.id);
  }

  try {
    await page.goto("/chaves");
    const rotulo = page.getByText(/^Página 1 de \d+$/);
    await expect(rotulo).toBeVisible();
    const totalPaginas = Number(
      ((await rotulo.textContent()) ?? "").split(" de ")[1],
    );
    expect(totalPaginas).toBeGreaterThan(1);
    await expect(page.getByRole("button", { name: "Anterior" })).toBeDisabled();

    await page.getByRole("button", { name: "Próxima" }).click();
    await expect(page.getByText(`Página 2 de ${totalPaginas}`)).toBeVisible();
    await expect(page.getByRole("button", { name: "Anterior" })).toBeEnabled();

    await page.getByRole("button", { name: "Anterior" }).click();
    await expect(page.getByText(`Página 1 de ${totalPaginas}`)).toBeVisible();
  } finally {
    for (const id of criadas) {
      await inativarChave(api, id);
    }
    await api.dispose();
  }
});

/**
 * Regressão (bug P0): o empréstimo registrado pelo próprio SOLICITANTE falhava com 500
 * (o id do solicitante era gravado como administrador) e a devolução de terceiros
 * passava pela API. Cobre o registro para si e a devolução do próprio empréstimo.
 */
test.describe("como solicitante", () => {
  test.use({ storageState: caminhoStorageState("solicitante") });

  test("registra empréstimo para si e devolve a chave pelo fluxo completo", async ({
    page,
  }) => {
    const api = await apiDe("admin");
    const codigo = codigoChave("SOLIC");
    await criarChave(api, { codigo });
    const solicitante = lerUsuarios().solicitante;

    try {
      await page.goto("/chaves");
      await page.getByLabel("Buscar chaves por código ou descrição").fill(codigo);
      await page.getByRole("button", { name: "Buscar", exact: true }).click();
      await expect(tabelaDeChaves(page).getByText(codigo)).toBeVisible();
      await tabelaDeChaves(page)
        .getByRole("button", { name: `Emprestar chave ${codigo}` })
        .click();

      const dialogo = page.getByRole("dialog", { name: "Registrar empréstimo" });
      await expect(dialogo.getByText(solicitante.nome)).toBeVisible();
      await expect(
        dialogo.getByText(`Matrícula: ${solicitante.matricula}`),
      ).toBeVisible();
      await dialogo.getByRole("button", { name: "Confirmar empréstimo" }).click();

      await expect(page.getByText("Empréstimo registrado com sucesso!")).toBeVisible();
      await expect(
        page.getByRole("dialog", { name: "Registrar empréstimo" }),
      ).toHaveCount(0);

      const ativos = secaoEmprestimosAtivos(page);
      await expect(ativos.getByText(codigo)).toBeVisible();
      await expect(
        ativos.getByRole("row").filter({ hasText: codigo }).getByText(solicitante.nome),
      ).toBeVisible();

      await ativos.getByRole("button", { name: `Devolver chave ${codigo}` }).click();
      const confirmacao = page.getByRole("dialog", { name: "Confirmar devolução" });
      await expect(
        confirmacao.getByText(`Deseja devolver a chave ${codigo}?`),
      ).toBeVisible();
      await confirmacao.getByRole("button", { name: "Confirmar devolução" }).click();

      await expect(page.getByText("Devolução registrada com sucesso!")).toBeVisible();
      await expect(ativos.getByText(codigo)).toHaveCount(0);
    } finally {
      await encerrarChave(api, codigo);
      await api.dispose();
    }
  });
});
