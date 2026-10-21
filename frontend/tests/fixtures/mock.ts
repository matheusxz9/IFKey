import type { Page, Route } from "@playwright/test";
import { CHAVE_STATE_OAUTH } from "../../src/utils/oauth";
import { API_URL, BASE_URL } from "./sessao";

export const STATE_OAUTH_E2E = "state-e2e";

/**
 * Intercepta o redirecionamento OAuth do SUAP e devolve o usuário para o
 * callback da aplicação, sem sair do ambiente local.
 */
export async function interceptarAuthorizeSuap(page: Page, codigo = "codigo-e2e") {
  let urlAutorizacao: URL | undefined;
  await page.route(
    (url) => url.href.includes("suap.ifrn.edu.br/o/authorize"),
    async (route: Route) => {
      urlAutorizacao = new URL(route.request().url());
      const params = new URLSearchParams({ code: codigo });
      const state = urlAutorizacao.searchParams.get("state");
      if (state) params.set("state", state);

      await route.fulfill({
        status: 302,
        headers: {
          location: `${BASE_URL}/login/suap/callback?${params.toString()}`,
        },
        body: "",
      });
    },
  );
  return () => urlAutorizacao;
}

/** Deixa um state OAuth válido no sessionStorage antes do callback. */
export async function prepararStateOAuth(
  page: Page,
  state = STATE_OAUTH_E2E,
) {
  await page.addInitScript(
    ([chave, valor]) => sessionStorage.setItem(chave, valor),
    [CHAVE_STATE_OAUTH, state] as const,
  );
  return state;
}

/** Monta a URL do callback com code/state controlados pelo teste. */
export function urlCallback(codigo?: string, state = STATE_OAUTH_E2E) {
  const params = new URLSearchParams();
  if (codigo) params.set("code", codigo);
  params.set("state", state);
  return `/login/suap/callback?${params.toString()}`;
}

/** Responde a troca do code OAuth pelo backend (POST /auth/suap). */
export async function mockarTrocaDeCode(
  page: Page,
  resposta: { status: number; body: unknown } | "erro-de-rede",
) {
  await page.route(`${API_URL}/auth/suap`, async (route) => {
    if (resposta === "erro-de-rede") {
      await route.abort("connectionfailed");
      return;
    }
    await route.fulfill({
      status: resposta.status,
      contentType: "application/json",
      body: JSON.stringify(resposta.body),
    });
  });
}

/** Faz uma rota da API responder com um status/erro específico. */
export async function mockarErroApi(
  page: Page,
  caminho: string | RegExp,
  status: number,
  corpo: unknown = { statusCode: status, message: "Erro simulado", code: "ERRO_INTERNO" },
) {
  await page.route(
    (url) => (typeof caminho === "string" ? url.pathname.includes(caminho) : caminho.test(url.pathname)),
    async (route) => {
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(corpo),
      });
    },
  );
}

/** Atrasa a resposta (determinístico) para exercitar estados de carregamento. */
export async function atrasarResposta(page: Page, caminho: string, atrasoMs = 1500) {
  await page.route(
    (url) => url.pathname.includes(caminho),
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, atrasoMs));
      await route.continue();
    },
  );
}
