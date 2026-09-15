import API_URL from "./api";

export async function listarChaves() {
  const resposta = await fetch(`${API_URL}/chaves`);

  if (!resposta.ok) {
    throw new Error("Erro ao buscar as chaves.");
  }

  return resposta.json();
}
