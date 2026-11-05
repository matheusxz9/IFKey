import { Suspense, useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ErrorBoundary from "./ErrorBoundary";
import { Botao } from "./ui/Botao";
import { Icone, type NomeIcone } from "./ui/Icone";
import { Selo, type VarianteSelo } from "./ui/Selo";
import { Girando } from "./ui/Estado";
import { cn } from "../utils/classes";
import logoIfkey from "../assets/logo-ifkey.png";

function iniciaisDoNome(nome?: string) {
  if (!nome) return "IF";
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 1).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

const variantePerfil: Record<string, VarianteSelo> = {
  ADMINISTRADOR: "administrador",
  GESTOR: "gestor",
  SOLICITANTE: "solicitante",
};

const rotuloPerfil: Record<string, string> = {
  ADMINISTRADOR: "Administrador",
  GESTOR: "Gestor",
  SOLICITANTE: "Solicitante",
};

interface ItemMenuProps {
  para: string;
  rotulo: string;
  icone: NomeIcone;
  onNavegar: () => void;
}

function ItemMenu({ para, rotulo, icone, onNavegar }: ItemMenuProps) {
  return (
    <NavLink
      to={para}
      onClick={onNavegar}
      className={({ isActive }) =>
        cn(
          "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-veu-verde text-verde-claro"
            : "text-texto-medio hover:bg-superficie-ativa hover:text-texto",
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icone
            nome={icone}
            className={cn("h-4.5 w-4.5", !isActive && "text-texto-fraco")}
          />
          <span>{rotulo}</span>
          {isActive && (
            <span
              aria-hidden="true"
              className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-verde"
            />
          )}
        </>
      )}
    </NavLink>
  );
}

function TituloSecao({ children }: { children: string }) {
  return (
    <p className="px-3 pt-5 pb-1.5 text-xs font-semibold text-texto-fraco">
      {children}
    </p>
  );
}

export default function Layout() {
  const { user, canAccessAdmin, canAccessGestao, canAccessEmprestimos, logout } = useAuth();
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

  function fecharMenu() {
    setMenuAberto(false);
  }

  function handleLogout() {
    setMenuAberto(false);
    logout();
    navigate("/");
  }

  return (
    <div className="flex min-h-screen bg-tela text-texto">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-verde focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-tinta"
      >
        Pular para o conteúdo
      </a>

      {menuAberto && (
        <div
          className="animate-surgir-veu fixed inset-0 z-30 bg-black/60 md:hidden"
          aria-hidden="true"
          onClick={fecharMenu}
        />
      )}

      <aside
        ref={asideRef}
        id="menu-principal"
        tabIndex={-1}
        className={`fixed bottom-0 left-0 top-0 z-40 flex w-64 flex-col border-r border-linha bg-superficie transition-[transform,visibility] duration-200 md:sticky md:bottom-auto md:left-auto md:h-screen md:visible md:translate-x-0 ${
          menuAberto ? "visible translate-x-0" : "invisible -translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-linha px-4 py-4">
          <img src={logoIfkey} alt="" className="h-9 w-9 object-contain" />
          <div className="min-w-0">
            <p className="text-base leading-tight font-semibold text-texto">IFKey</p>
            <p className="truncate text-xs text-texto-fraco">Controle de chaves</p>
          </div>
        </div>

        <nav
          aria-label="Menu principal"
          className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3"
        >
          {canAccessEmprestimos && (
            <>
              <ItemMenu
                para="/chaves"
                rotulo="Chaves"
                icone="chave"
                onNavegar={fecharMenu}
              />
              <ItemMenu
                para="/historico"
                rotulo="Histórico"
                icone="relogio"
                onNavegar={fecharMenu}
              />
            </>
          )}

          {canAccessGestao && (
            <>
              <TituloSecao>Administração</TituloSecao>
              <ItemMenu
                para="/admin/chaves"
                rotulo="Gerenciar Chaves"
                icone="gaveteiro"
                onNavegar={fecharMenu}
              />
              <ItemMenu
                para="/admin/solicitantes"
                rotulo="Gerenciar Solicitantes"
                icone="pessoas"
                onNavegar={fecharMenu}
              />
            </>
          )}

          {canAccessAdmin && (
            <>
              <TituloSecao>Administradores</TituloSecao>
              <ItemMenu
                para="/admin/administradores"
                rotulo="Gerenciar Administradores"
                icone="escudo"
                onNavegar={fecharMenu}
              />
            </>
          )}
        </nav>

        <div className="border-t border-linha px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-verde/25 bg-veu-verde font-mono text-xs font-medium text-verde-claro">
              {iniciaisDoNome(user?.nome)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-texto">{user?.nome}</p>
              <p className="truncate font-mono text-xs text-texto-fraco">
                {user?.tipo === "admin" ? user?.login : user?.matricula}
              </p>
            </div>
          </div>

          {user && (
            <div className="mt-3 flex">
              <Selo variante={variantePerfil[user.perfil] ?? "devolvida"}>
                {rotuloPerfil[user.perfil] ?? user.perfil}
              </Selo>
            </div>
          )}

          <Botao
            variante="secundario"
            className="mt-3 w-full"
            onClick={handleLogout}
            icone={<Icone nome="sair" />}
          >
            Sair
          </Botao>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-linha bg-superficie/95 px-3 py-2.5 backdrop-blur md:hidden">
          <button
            ref={botaoMenuRef}
            type="button"
            onClick={() => setMenuAberto((aberto) => !aberto)}
            aria-expanded={menuAberto}
            aria-controls="menu-principal"
            aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
            className="cursor-pointer rounded-lg p-2 text-texto-medio transition-colors hover:bg-superficie-ativa hover:text-texto"
          >
            <Icone nome={menuAberto ? "fechar" : "menu"} className="h-5 w-5" />
          </button>
          <img src={logoIfkey} alt="" className="h-7 w-7 object-contain" />
          <span className="font-semibold text-texto">IFKey</span>
        </header>

        <main
          id="conteudo"
          tabIndex={-1}
          className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8"
        >
          <ErrorBoundary key={location.pathname}>
            <Suspense
              fallback={
                <div
                  role="status"
                  className="flex items-center justify-center gap-3 p-10 text-sm text-texto-fraco"
                >
                  <Girando className="text-verde-claro" />
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
