export async function loginSuap() {
  const resposta = await fetch(`http://localhost:5173/login/suap/callback`);

  if (!resposta.ok) {
    throw new Error("Erro ao logar pelo Suap.");
  }

  return resposta.json();
}
