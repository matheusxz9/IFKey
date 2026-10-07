import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
        const API_URL = import.meta.env.VITE_API_URL;
        const resposta = await fetch(`${API_URL}/auth/suap`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const corpo = (await resposta.json().catch(() => null)) as {
          message?: string | string[];
          accessToken?: string;
          refreshToken?: string;
          user?: User;
        } | null;

        if (!resposta.ok) {
          const mensagem = Array.isArray(corpo?.message)
            ? corpo.message.filter(Boolean).join(" ")
            : corpo?.message;
          setErro(mensagem || "Erro ao realizar o login.");
          return;
        }

        if (!corpo?.accessToken || !corpo.refreshToken || !corpo.user) {
          setErro("Resposta inválida do servidor de login.");
          return;
        }

        localStorage.setItem("refreshToken", corpo.refreshToken);
        login(corpo.accessToken, corpo.user);

        navigate("/chaves", { replace: true });
      } catch {
        setErro(
          "Não foi possível conectar ao servidor de login. Verifique se o backend está rodando.",
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
