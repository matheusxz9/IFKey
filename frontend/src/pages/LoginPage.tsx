import logoIfkey from "../assets/logo-ifkey.png";

function LoginPage() {
  function entrarComSuap() {
    const params = new URLSearchParams({
      client_id: import.meta.env.VITE_CLIENT_ID,
      response_type: "code",
      redirect_uri: import.meta.env.VITE_REDIRECT_URI,
    });

    window.location.href = `https://suap.ifrn.edu.br/o/authorize/?${params.toString()}`;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950">
      <section className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-2xl">
        <img
          src={logoIfkey}
          alt="Logo IFKey"
          className="mx-auto mb-4 h-32 w-32 object-contain"
        />

        <p className="mb-8 text-center text-gray-400">
          Acesso do Administrador
        </p>

        <button
          type="button"
          onClick={entrarComSuap}
          className="w-full rounded-md bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 cursor-pointer"
        >
          Entrar com SUAP
        </button>
      </section>
    </main>
  );
}

export default LoginPage;
