import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, type User } from "../contexts/AuthContext";
import { Alerta } from "../components/ui/Alerta";
import { TelaCarregando } from "../components/ui/Estado";
import logoIfkey from "../assets/logo-ifkey.png";

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
      <main className="flex min-h-screen items-center justify-center bg-tela px-4 py-12">
        <section className="w-full max-w-md rounded-xl border border-linha bg-superficie p-6">
          <div className="mb-5 flex items-center gap-3">
            <img src={logoIfkey} alt="" className="h-8 w-8 object-contain" />
            <span className="font-semibold text-texto">IFKey</span>
          </div>

          <h1 className="text-lg leading-snug text-texto">Erro ao entrar</h1>

          <Alerta className="mt-4">{erro}</Alerta>

          <Link
            to="/"
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-verde px-4 py-2.5 text-sm font-semibold text-tinta transition-colors hover:bg-verde-vivo"
          >
            Voltar para o acesso
          </Link>
        </section>
      </main>
    );
  }

  return <TelaCarregando mensagem="Entrando no IFKey..." />;
}

export default SuapCallbackPage;
