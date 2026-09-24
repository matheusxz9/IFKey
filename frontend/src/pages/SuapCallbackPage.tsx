import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import { useAuth, type User } from "../contexts/AuthContext";

function SuapCallbackPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [erro, setErro] = useState("");
  const codeProcessadoRef = useRef(false);

  useEffect(() => {
    if (codeProcessadoRef.current) return;
    codeProcessadoRef.current = true;

    async function autenticar() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (!code) {
        setErro("Código de autenticação não encontrado.");
        return;
      }

      try {
        const dados = await apiFetch<{
          accessToken: string;
          administrador: User;
        }>("/auth/suap", {
          method: "POST",
          body: JSON.stringify({ code }),
        });

        login(dados.accessToken, dados.administrador);

        navigate("/chaves", { replace: true });
      } catch (error) {
        setErro(
          error instanceof Error ? error.message : "Erro ao realizar o login.",
        );
      }
    }
    autenticar();
  }, [navigate, login]);

  if (erro) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950">
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center">
          <h1 className="mb-3 text-xl font-bold text-red-500">
            Erro ao entrar
          </h1>

          <p className="text-gray-400">{erro}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950">
      <p className="text-gray-400" role="status">
        Entrando no IFKey...
      </p>
    </main>
  );
}

export default SuapCallbackPage;
