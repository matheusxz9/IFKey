import { useState } from "react";
import logoIfkey from "../assets/logo-ifkey.png";
import { loginSuap } from "../services/loginSuap";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950">
      <section className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-2xl">
        <img
          src={logoIfkey}
          alt="Logo IFKey"
          className="mx-auto mb-4 h-32 w-32 object-contain"
        />

        <p className="mb-6 text-center text-gray-400">
          Acesso do Administrador
        </p>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();

            if (!email) {
              setErro("O e-mail é obrigatório.");
              return;
            }

            if (!senha) {
              setErro("A senha é obrigatória.");
              return;
            }

            if (!email || !senha) {
              setErro("Preencha todos os campos.");
              return;
            }

            setErro("");
            setCarregando(true);

            setTimeout(() => {
              setCarregando(false);
            }, 1000);
          }}
        >
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-gray-300"
            >
              E-mail
            </label>

            <input
              id="email"
              type="email"
              placeholder="Digite seu e-mail"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-gray-700 bg-gray-800 px-4 py-2 text-white outline-none placeholder:text-gray-500 focus:border-green-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-gray-300"
            >
              Senha
            </label>

            <input
              id="password"
              type="password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              className="w-full rounded-md border border-gray-700 bg-gray-800 px-4 py-2 text-white outline-none placeholder:text-gray-500 focus:border-green-500"
            />
          </div>

          {erro && (
            <p className="rounded-md border border-red-900 bg-red-950/50 px-4 py-2 text-sm text-red-400">
              {erro}
            </p>
          )}
          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-md bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>
          <button
            type="button"
            disabled={carregando}
            className="w-full rounded-md bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
            onClick={() => loginSuap()}
          >
            {carregando ? "Entrando..." : "Entrar via Suap"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
