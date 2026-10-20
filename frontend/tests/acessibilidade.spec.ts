import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { caminhoStorageState } from "./fixtures/sessao";

/**
 * Smoke de acessibilidade (WCAG 2 A/AA) nas telas principais.
 *
 * Foca em violações de impacto "critical" e "serious", que são as que de fato
 * impedem o uso por leitores de tela/teclado. Violações "moderate"/"minor"
 * ficam de fora para não gerar ruído.
 */

async function violacoesGraves(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  return resultado.violations
    .filter((violacao) => violacao.impact === "critical" || violacao.impact === "serious")
    .map((violacao) => ({
      id: violacao.id,
      impact: violacao.impact,
      descricao: violacao.help,
      alvos: violacao.nodes.map((no) => no.target.join(" ")),
    }));
}

test.describe("acessibilidade — sem sessão", () => {
  test("a tela de login não tem violações graves", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Entrar com SUAP" })).toBeVisible();

    expect(await violacoesGraves(page)).toEqual([]);
  });
});

test.describe("acessibilidade — com sessão", () => {
  test.use({ storageState: caminhoStorageState("admin") });

  const telas = [
    { nome: "lista de chaves", rota: "/chaves" },
    { nome: "administração de chaves", rota: "/admin/chaves" },
    { nome: "administração de solicitantes", rota: "/admin/solicitantes" },
    { nome: "administração de administradores", rota: "/admin/administradores" },
    { nome: "histórico", rota: "/historico" },
  ] as const;

  for (const tela of telas) {
    test(`a tela de ${tela.nome} não tem violações graves`, async ({ page }) => {
      await page.goto(tela.rota);
      await expect(page.locator("main")).toBeVisible();

      expect(await violacoesGraves(page)).toEqual([]);
    });
  }
});
