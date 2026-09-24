import { AppError } from "./AppError";

const API_URL = import.meta.env.VITE_API_URL;

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

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem("accessToken");

  const headers = new Headers(options.headers);

  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const resposta = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const corpo: unknown = await resposta.json().catch(() => null);

  if (resposta.status === 401 && token) {
    localStorage.removeItem("accessToken");
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
