import { Suspense, useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ErrorBoundary from "./ErrorBoundary";
import logoIfkey from "../assets/logo-ifkey.png";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? "bg-green-600/20 text-green-400"
      : "text-gray-400 hover:bg-gray-800 hover:text-white"
  }`;

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const botaoMenuRef = useRef<HTMLButtonElement>(null);
  const menuFoiAbertoRef = useRef(false);

  useEffect(() => {
    if (menuAberto) {
      asideRef.current?.focus();
      menuFoiAbertoRef.current = true;
      return;
    }

    if (menuFoiAbertoRef.current) {
      menuFoiAbertoRef.current = false;
      botaoMenuRef.current?.focus();
    }
  }, [menuAberto]);

  useEffect(() => {
    if (!menuAberto) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuAberto(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuAberto]);

  function handleLogout() {
    setMenuAberto(false);
    logout();
    navigate("/");
  }

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      {menuAberto && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          aria-hidden="true"
          onClick={() => setMenuAberto(false)}
        />
      )}

      <aside
        ref={asideRef}
        id="menu-principal"
        tabIndex={-1}
        className={`fixed bottom-0 left-0 top-0 z-40 flex w-64 flex-col overflow-y-auto border-r border-gray-800 bg-gray-900 transition-[transform,visibility] duration-200 md:sticky md:bottom-auto md:left-auto md:h-screen md:visible md:translate-x-0 ${
          menuAberto ? "visible translate-x-0" : "invisible -translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-gray-800 px-5 py-5">
          <img src={logoIfkey} alt="" className="h-9 w-9 object-contain" />
          <span className="text-lg font-bold">IFKey</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          <NavLink to="/chaves" className={linkClass} onClick={() => setMenuAberto(false)}>
            Chaves
          </NavLink>
          <NavLink to="/historico" className={linkClass} onClick={() => setMenuAberto(false)}>
            Histórico
          </NavLink>

          {isAdmin && (
            <>
              <p className="px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Administração
              </p>
              <NavLink to="/admin/chaves" className={linkClass} onClick={() => setMenuAberto(false)}>
                Gerenciar Chaves
              </NavLink>
              <NavLink to="/admin/solicitantes" className={linkClass} onClick={() => setMenuAberto(false)}>
                Gerenciar Solicitantes
              </NavLink>
            </>
          )}
        </nav>

        <div className="border-t border-gray-800 px-5 py-4">
          <p className="truncate text-sm text-gray-400">{user?.nome}</p>
          <p className="truncate text-xs text-gray-500">{user?.login}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 w-full rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white cursor-pointer"
          >
            Sair
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-800 bg-gray-900 px-4 py-3 md:hidden">
          <button
            ref={botaoMenuRef}
            type="button"
            onClick={() => setMenuAberto((aberto) => !aberto)}
            aria-expanded={menuAberto}
            aria-controls="menu-principal"
            aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
            className="rounded-md p-2 text-gray-300 hover:bg-gray-800 hover:text-white cursor-pointer"
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <img src={logoIfkey} alt="" className="h-7 w-7 object-contain" />
          <span className="text-lg font-bold">IFKey</span>
        </header>

        <main className="min-w-0 flex-1 p-4 md:p-6">
          <ErrorBoundary key={location.pathname}>
            <Suspense
              fallback={
                <div className="p-8 text-center text-gray-400" role="status">
                  Carregando...
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
