const API_URL = "http://localhost:3000/api";

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

  if (!resposta.ok) {
    const erro = new Error(dados?.message || "Ocorreu um erro na requisição.");

    Object.assign(erro, {
      code: dados?.code,
      status: resposta.status,
    });

    throw erro;
  }

  return dados;
}

export default API_URL;
