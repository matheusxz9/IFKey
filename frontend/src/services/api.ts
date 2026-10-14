import { AppError } from "./AppError";

const API_URL = import.meta.env.VITE_API_URL;

// Endpoints que não precisam de autenticação
const PUBLIC_ENDPOINTS = ["/auth/suap", "/auth/refresh"];

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

export interface ApiFetchOptions extends RequestInit {
  signal?: AbortSignal;
}

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
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
    accessToken: string;
    refreshToken: string;
  };

  localStorage.setItem("accessToken", dados.accessToken);
  localStorage.setItem("refreshToken", dados.refreshToken);

  return dados.accessToken;
}

async function getValidAccessToken(): Promise<string | null> {
  const token = localStorage.getItem("accessToken");
  if (!token) return null;

  try {
    const resposta = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (resposta.ok) return token;
  } catch {
    // Ignore errors, will try refresh
  }

  if (isRefreshing) {
    return refreshPromise!;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const newToken = await refreshAccessToken();
      return newToken;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

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

  let token: string | null = null;
  if (needsAuth) {
    token = await getValidAccessToken();
    if (!token) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      window.location.href = "/";
      throw new AppError("Sessão expirada. Faça login novamente.", "NAO_AUTENTICADO", 401);
    }
  }

  const headers = new Headers(fetchOptions.headers);

  if (fetchOptions.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const resposta = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
    signal,
  });

  const corpo: unknown = await resposta.json().catch(() => null);

  if (resposta.status === 401 && needsAuth) {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    window.location.href = "/";
    throw new AppError("Sessão expirada. Faça login novamente.", "NAO_AUTENTICADO", 401);
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
