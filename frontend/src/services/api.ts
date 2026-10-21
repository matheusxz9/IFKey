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

async function solicitarRenovacao(): Promise<string> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) {
    throw new Error("Refresh token não encontrado");
  }

  const resposta = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!resposta.ok) {
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

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = solicitarRenovacao().finally(() => {
      refreshPromise = null;
    });
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
      token = await refreshAccessToken();
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
