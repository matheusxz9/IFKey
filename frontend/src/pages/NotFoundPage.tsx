import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950">
      <section className="text-center">
        <h1 className="mb-2 text-6xl font-bold text-gray-700">404</h1>
        <p className="mb-6 text-gray-400">Página não encontrada</p>
        <Link
          to="/"
          className="rounded-md bg-green-600 px-5 py-2 font-semibold text-white hover:bg-green-700"
        >
          Voltar para o início
        </Link>
      </section>
    </main>
  );
}
