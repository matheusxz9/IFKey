import { request, type APIRequestContext } from "@playwright/test";
import { API_ORIGIN, caminhoApi, lerUsuarios, tokenDe, type Papel } from "./sessao";

/** Contexto HTTP autenticado com um token arbitrário. */
export async function apiComToken(token: string): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: API_ORIGIN,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
}

/** Contexto HTTP autenticado contra a API real, para preparar/limpar dados. */
export async function apiDe(papel: Papel): Promise<APIRequestContext> {
  return apiComToken(tokenDe(lerUsuarios()[papel]));
}

const sufixo = () => Date.now().toString(36);

/** Monta a rota /chaves com uma query string opcional. */
export const caminhoChaves = (consulta = "") =>
  `${caminhoApi("/chaves")}${consulta ? `?${consulta}` : ""}`;


/** Código de chave único (limite de 20 caracteres na API). */
export const codigoChave = (prefixo = "T") =>
  `${prefixo}-${sufixo()}`.slice(0, 20);

export const matriculaUnica = () => `9${Date.now().toString().slice(-12)}`;

export const loginUnico = () => `e2e.${sufixo()}`;

export const nomeUnico = (base = "Teste") => `${base} ${sufixo()}`;

export interface ChaveCriada {
  id: number;
  codigo: string;
}

export async function criarChave(
  api: APIRequestContext,
  dados: Partial<{ codigo: string; descricao: string; localizacao: string }> = {},
): Promise<ChaveCriada> {
  const codigo = dados.codigo ?? codigoChave();
  const resposta = await api.post(caminhoChaves(), {
    data: {
      codigo,
      descricao: dados.descricao ?? "Chave criada pela suíte E2E",
      localizacao: dados.localizacao ?? "Bloco E2E",
    },
  });
  if (!resposta.ok()) {
    throw new Error(`Falha ao criar chave de teste: ${await resposta.text()}`);
  }
  return (await resposta.json()) as ChaveCriada;
}

export async function criarSolicitante(
  api: APIRequestContext,
  dados: Partial<{
    nome: string;
    tipo: string;
    matricula: string;
    contato: string;
  }> = {},
) {
  const resposta = await api.post(`${caminhoApi("/solicitantes")}`, {
    data: {
      nome: dados.nome ?? nomeUnico("Solicitante"),
      tipo: dados.tipo ?? "ALUNO",
      matricula: dados.matricula ?? matriculaUnica(),
      contato: dados.contato ?? "e2e@ifrn.edu.br",
    },
  });
  if (!resposta.ok()) {
    throw new Error(
      `Falha ao criar solicitante de teste: ${await resposta.text()}`,
    );
  }
  return (await resposta.json()) as { id: number; nome: string; matricula: string };
}

export async function criarAdministrador(
  api: APIRequestContext,
  dados: Partial<{ nome: string; login: string; perfil: string }> = {},
) {
  const resposta = await api.post(`${caminhoApi("/administradores")}`, {
    data: {
      nome: dados.nome ?? nomeUnico("Admin"),
      login: dados.login ?? loginUnico(),
      perfil: dados.perfil ?? "GESTOR",
    },
  });
  if (!resposta.ok()) {
    throw new Error(
      `Falha ao criar administrador de teste: ${await resposta.text()}`,
    );
  }
  return (await resposta.json()) as { id: number; nome: string; login: string };
}

export async function criarEmprestimo(
  api: APIRequestContext,
  dados: { solicitanteId: number; chaveId: number; observacoes?: string },
) {
  const resposta = await api.post(caminhoApi("/emprestimos"), { data: dados });
  if (!resposta.ok()) {
    throw new Error(
      `Falha ao criar empréstimo de teste: ${await resposta.text()}`,
    );
  }
  return (await resposta.json()) as { id: number };
}

export async function devolverEmprestimo(api: APIRequestContext, id: number) {
  const resposta = await api.patch(caminhoApi(`/emprestimos/${id}/devolucao`), {
    data: {},
  });
  if (!resposta.ok()) {
    throw new Error(
      `Falha ao devolver empréstimo de teste: ${await resposta.text()}`,
    );
  }
}

/** Inativa (soft delete) os registros criados pelo teste para não poluir a base. */
export async function inativarChave(api: APIRequestContext, id: number) {
  await api.delete(caminhoChaves(`${id}`));
}

export async function inativarSolicitante(api: APIRequestContext, id: number) {
  await api.delete(caminhoApi(`/solicitantes/${id}`));
}

export async function inativarAdministrador(
  api: APIRequestContext,
  id: number,
) {
  await api.delete(caminhoApi(`/administradores/${id}`));
}
