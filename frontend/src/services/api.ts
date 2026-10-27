import { AppError } from "./AppError";

const API_URL = import.meta.env.VITE_API_URL;

export const EVENTO_USUARIO_ATUALIZADO = "ifkey:usuario-atualizado";

interface UsuarioSessao {
  id: number;
  nome: string;
  perfil: string;
  tipo: "admin" | "solicitante";
  login?: string;
  matricula?: string;
}

// Endpoints que não precisam de autenticação
const PUBLIC_ENDPOINTS = ["/auth/suap", "/auth/refresh", "/auth/logout"];

function isPublicEndpoint(endpoint: string): boolean {
  return PUBLIC_ENDPOINTS.some((publicEndpoint) => endpoint.startsWith(publicEndpoint));
}

interface CorpoErro {
  message?: string | string[];
  code?: string;
}

function normalizarMensagem(message: string | string[] | undefined): string {
  if (Array.isArray(message)) {
    return message.filter(Boolean).join(" ");
  }
  return message || "Ocorreu um erro na requisição.";
}

function limparSessao(): void {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event(EVENTO_USUARIO_ATUALIZADO));
}

function encerrarSessao(): never {
  limparSessao();
  if (window.location.pathname !== "/") {
    window.location.href = "/";
  }
  throw new AppError("Sessão expirada. Faça login novamente.", "NAO_AUTENTICADO", 401);
}

let refreshPromise: Promise<string> | null = null;

const BLOQUEIO_RENOVACAO = "ifkey:renovacao-sessao";
const ESPERA_PROPAGACAO_SESSAO_MS = 100;
const ESPERA_RENOVACAO_CONCORRENTE_MS = 1_000;

function comBloqueioRenovacao<T>(callback: () => Promise<T>): Promise<T> {
  if (typeof navigator === "undefined" || !navigator.locks) {
    return callback();
  }
  return navigator.locks.request(BLOQUEIO_RENOVACAO, callback);
}

function lerAccessTokenAtualizado(tokenAnterior: string | null): string | null {
  const atual = localStorage.getItem("accessToken");
  return atual && atual !== tokenAnterior ? atual : null;
}

function aguardarTokenAtualizado(
  tokenAnterior: string | null,
  tempoLimiteMs: number,
): Promise<string | null> {
  const atual = lerAccessTokenAtualizado(tokenAnterior);
  if (atual) return Promise.resolve(atual);

  return new Promise((resolve) => {
    function finalizar(token: string | null) {
      window.removeEventListener("storage", aoReceberStorage);
      window.clearInterval(intervalo);
      window.clearTimeout(tempoLimite);
      resolve(token);
    }

    function verificar() {
      const token = lerAccessTokenAtualizado(tokenAnterior);
      if (token) finalizar(token);
    }

    function aoReceberStorage(evento: StorageEvent) {
      if (evento.key === "accessToken" || evento.key === null) verificar();
    }

    const intervalo = window.setInterval(verificar, 20);
    const tempoLimite = window.setTimeout(() => finalizar(null), tempoLimiteMs);
    window.addEventListener("storage", aoReceberStorage);
  });
}

async function solicitarRenovacao(tokenAnterior: string | null): Promise<string> {
  const accessTokenAtual = lerAccessTokenAtualizado(tokenAnterior);
  if (accessTokenAtual) return accessTokenAtual;

  if (!localStorage.getItem("accessToken") && tokenAnterior) {
    throw new Error("Sessão encerrada em outra aba");
  }

  // O Firefox propaga o localStorage entre abas de forma assíncrona. Esperar
  // um pouco evita renovar de novo logo após outra aba concluir a renovação.
  const tokenDeOutraAba = await aguardarTokenAtualizado(
    tokenAnterior,
    ESPERA_PROPAGACAO_SESSAO_MS,
  );
  if (tokenDeOutraAba) return tokenDeOutraAba;

  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) {
    throw new Error("Refresh token não encontrado");
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  } catch (erro) {
    const token = await aguardarTokenAtualizado(
      tokenAnterior,
      ESPERA_RENOVACAO_CONCORRENTE_MS,
    );
    if (token) return token;
    throw erro;
  }

  if (!resposta.ok) {
    const erro = (await resposta.json().catch(() => null)) as CorpoErro | null;

    // Em uma corrida entre abas, outra pode ter gravado os tokens novos. Só
    // encerra a sessão se a família não tiver sido revogada por segurança.
    if (erro?.code !== "REFRESH_TOKEN_REUTILIZADO") {
      const token = await aguardarTokenAtualizado(
        tokenAnterior,
        ESPERA_RENOVACAO_CONCORRENTE_MS,
      );
      if (token) return token;
    }
    throw new Error("Falha ao renovar token");
  }

  const dados = (await resposta.json()) as {
    accessToken?: string;
    refreshToken?: string;
    user?: UsuarioSessao;
  };

  if (!dados.accessToken || !dados.refreshToken) {
    throw new Error("Resposta inválida ao renovar token");
  }

  localStorage.setItem("accessToken", dados.accessToken);
  localStorage.setItem("refreshToken", dados.refreshToken);

  if (dados.user) {
    localStorage.setItem("user", JSON.stringify(dados.user));
  }

  window.dispatchEvent(new Event(EVENTO_USUARIO_ATUALIZADO));

  return dados.accessToken;
}

function refreshAccessToken(tokenAnterior: string | null = null): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = comBloqueioRenovacao(() => solicitarRenovacao(tokenAnterior)).finally(
      () => {
        refreshPromise = null;
      },
    );
  }
  return refreshPromise;
}

export interface ApiFetchOptions extends RequestInit {
  signal?: AbortSignal;
  public?: boolean; // Se true, não exige token
}

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { signal, public: isPublic, ...fetchOptions } = options;

  // Endpoints públicos não precisam de token
  const needsAuth = !isPublic && !isPublicEndpoint(endpoint);

  async function enviar(token: string | null): Promise<Response> {
    const headers = new Headers(fetchOptions.headers);

    if (fetchOptions.body) {
      headers.set("Content-Type", "application/json");
    }

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
      signal,
    });
  }

  let token = needsAuth ? localStorage.getItem("accessToken") : null;

  if (needsAuth && !token) {
    try {
      token = await refreshAccessToken();
    } catch {
      encerrarSessao();
    }
  }

  let resposta = await enviar(token);
  let corpo: unknown = await resposta.json().catch(() => null);

  // Access token expirado/inválido: renova uma única vez e repete a
  // requisição original. O refresh compartilhado evita rajadas na mesma aba.
  if (resposta.status === 401 && needsAuth) {
    try {
      token = await refreshAccessToken(token);
    } catch {
      encerrarSessao();
    }

    resposta = await enviar(token);
    corpo = await resposta.json().catch(() => null);

    if (resposta.status === 401) {
      encerrarSessao();
    }
  }

  if (!resposta.ok) {
    const erro = (corpo ?? {}) as CorpoErro;
    throw new AppError(
      normalizarMensagem(erro.message),
      erro.code || "ERRO_DESCONHECIDO",
      resposta.status,
    );
  }

  return corpo as T;
}

export default API_URL;
