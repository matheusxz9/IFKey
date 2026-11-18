import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Botao } from "../components/ui/Botao";
import { Alerta } from "../components/ui/Alerta";
import { Campo, Entrada } from "../components/ui/Campos";
import { useAuth, type User } from "../contexts/AuthContext";
import logoIfkey from "../assets/logo-ifkey.png";
import { CHAVE_STATE_OAUTH, gerarStateOAuth } from "../utils/oauth";

interface RespostaDemo {
  message?: string | string[];
  accessToken?: string;
  refreshToken?: string;
  user?: User;
}

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loginDemo, setLoginDemo] = useState("");
  const [senhaDemo, setSenhaDemo] = useState("");
  const [erroDemo, setErroDemo] = useState("");
  const [enviandoDemo, setEnviandoDemo] = useState(false);
  const demoHabilitado = import.meta.env.VITE_DEMO_LOGIN_ENABLED === "true";

  function entrarComSuap() {
    const state = gerarStateOAuth();
    sessionStorage.setItem(CHAVE_STATE_OAUTH, state);

    const params = new URLSearchParams({
      client_id: import.meta.env.VITE_CLIENT_ID,
      response_type: "code",
      redirect_uri: import.meta.env.VITE_REDIRECT_URI,
      scope: "identificacao email",
      state,
    });

    window.location.href = `https://suap.ifrn.edu.br/o/authorize/?${params.toString()}`;
  }

  async function entrarComDemo(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroDemo("");
    setEnviandoDemo(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const resposta = await fetch(`${API_URL}/auth/demo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: loginDemo.trim(),
          senha: senhaDemo,
        }),
      });

      const corpo = (await resposta.json().catch(() => null)) as
        | RespostaDemo
        | null;

      if (!resposta.ok) {
        const mensagem = Array.isArray(corpo?.message)
          ? corpo.message.filter(Boolean).join(" ")
          : corpo?.message;
        setErroDemo(
          mensagem || "Não foi possível entrar com o perfil de demonstração.",
        );
        return;
      }

      if (!corpo?.accessToken || !corpo.refreshToken || !corpo.user) {
        setErroDemo("Resposta inválida do servidor de login.");
        return;
      }

      localStorage.setItem("refreshToken", corpo.refreshToken);
      login(corpo.accessToken, corpo.user);

      navigate("/chaves", { replace: true });
    } catch {
      setErroDemo(
        "Não foi possível conectar ao servidor de login. Tente novamente.",
      );
    } finally {
      setEnviandoDemo(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-tela lg:grid-cols-[1.05fr_1fr]">
      <section className="halo-marca flex flex-col justify-between gap-10 border-b border-linha bg-superficie px-6 py-10 lg:border-r lg:border-b-0 lg:px-14 lg:py-14">
        <div className="flex items-center gap-3">
          <img src={logoIfkey} alt="" className="h-10 w-10 object-contain" />
          <span className="text-lg font-semibold text-texto">IFKey</span>
        </div>

        <div className="max-w-lg">
          <p className="text-3xl leading-[1.15] font-semibold tracking-tight text-texto lg:text-[2.5rem]">
            Controle de empréstimo de chaves das salas e laboratórios.
          </p>
          <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-texto-fraco">
            Registre empréstimos e devoluções, acompanhe as chaves em uso e consulte
            o histórico de cada solicitante.
          </p>
        </div>

        <p className="max-w-[60ch] text-sm leading-relaxed text-texto-fraco">
          Instituto Federal de Educação, Ciência e Tecnologia do Rio Grande do Norte
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-12 lg:px-10">
        <div className="w-full max-w-sm">
          <h1 className="text-xl leading-snug text-texto">
            Acesso do Administrador / Solicitante
          </h1>
          <p className="mt-2 text-base leading-relaxed text-texto-fraco">
            Entre com sua conta institucional do SUAP para continuar.
          </p>

          <Botao
            variante="primario"
            className="mt-7 w-full py-3"
            onClick={entrarComSuap}
          >
            Entrar com SUAP
          </Botao>

          <p className="mt-5 text-sm leading-relaxed text-texto-fraco">
            O acesso é liberado para administradores, gestores e solicitantes já
            cadastrados no IFKey.
          </p>

          {demoHabilitado && (
            <>
              <div className="my-6 flex items-center gap-3" aria-hidden="true">
                <span className="h-px flex-1 bg-linha" />
                <span className="text-xs text-texto-fraco">ou</span>
                <span className="h-px flex-1 bg-linha" />
              </div>

              <form className="space-y-4" onSubmit={entrarComDemo}>
                <div>
                  <h2 className="text-base font-medium text-texto">
                    Acesso de demonstração
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-texto-fraco">
                    Perfis de teste para avaliação, sem usar a conta do SUAP.
                  </p>
                </div>

                {erroDemo && <Alerta>{erroDemo}</Alerta>}

                <Campo label="Usuário" htmlFor="demo-login">
                  <Entrada
                    id="demo-login"
                    value={loginDemo}
                    onChange={(evento) => setLoginDemo(evento.target.value)}
                    autoComplete="username"
                    placeholder="demo.admin"
                    disabled={enviandoDemo}
                  />
                </Campo>

                <Campo label="Senha" htmlFor="demo-senha">
                  <Entrada
                    id="demo-senha"
                    type="password"
                    value={senhaDemo}
                    onChange={(evento) => setSenhaDemo(evento.target.value)}
                    autoComplete="current-password"
                    disabled={enviandoDemo}
                  />
                </Campo>

                <Botao
                  variante="secundario"
                  type="submit"
                  className="w-full py-3"
                  carregando={enviandoDemo}
                  disabled={!loginDemo.trim() || !senhaDemo}
                >
                  Entrar na demonstração
                </Botao>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
