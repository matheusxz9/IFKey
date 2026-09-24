import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
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

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <aside className="flex w-64 flex-col border-r border-gray-800 bg-gray-900">
        <div className="flex items-center gap-3 border-b border-gray-800 px-5 py-5">
          <img src={logoIfkey} alt="IFKey" className="h-9 w-9 object-contain" />
          <span className="text-lg font-bold">IFKey</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          <NavLink to="/chaves" className={linkClass}>
            Chaves
          </NavLink>
          <NavLink to="/historico" className={linkClass}>
            Histórico
          </NavLink>

          {isAdmin && (
            <>
              <p className="px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Administração
              </p>
              <NavLink to="/admin/chaves" className={linkClass}>
                Gerenciar Chaves
              </NavLink>
              <NavLink to="/admin/solicitantes" className={linkClass}>
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

      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
