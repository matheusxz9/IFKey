import { Botao } from "../components/ui/Botao";
import logoIfkey from "../assets/logo-ifkey.png";

function LoginPage() {
  function entrarComSuap() {
    const params = new URLSearchParams({
      client_id: import.meta.env.VITE_CLIENT_ID,
      response_type: "code",
      redirect_uri: import.meta.env.VITE_REDIRECT_URI,
      scope: "identificacao email",
    });

    window.location.href = `https://suap.ifrn.edu.br/o/authorize/?${params.toString()}`;
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
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
