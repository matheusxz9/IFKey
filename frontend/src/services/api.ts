import { AppError } from "./AppError";

const API_URL = import.meta.env.VITE_API_URL;

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem("accessToken");

  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const resposta = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const dados = await resposta.json().catch(() => null);

  if (resposta.status === 401 && token) {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    window.location.href = "/";
    throw new AppError("Sessão expirada. Faça login novamente.", "NAO_AUTENTICADO", 401);
  }

  if (!resposta.ok) {
    throw new AppError(
      dados?.message || "Ocorreu um erro na requisição.",
      dados?.code || "ERRO_DESCONHECIDO",
      resposta.status,
    );
  }

  return dados;
}

export default API_URL;
