import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-tela px-4 py-12">
      <section className="w-full max-w-md rounded-xl border border-linha bg-superficie px-6 py-10 text-center">
        <h1
          aria-label="404 — Página não encontrada"
          className="font-mono text-3xl leading-none text-texto-fraco"
        >
          404
        </h1>
        <p className="mt-4 text-lg leading-snug text-texto">
          Página não encontrada
        </p>
        <p className="mt-2 text-sm leading-relaxed text-texto-fraco">
          O endereço acessado não existe ou foi movido.
        </p>
        <Link
          to="/"
          className="mt-7 inline-flex items-center justify-center rounded-lg bg-verde px-4 py-2.5 text-sm font-semibold text-tinta transition-colors hover:bg-verde-vivo"
        >
          Voltar para o início
        </Link>
      </section>
    </main>
  );
}
