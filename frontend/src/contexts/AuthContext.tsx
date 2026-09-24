import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";

export interface User {
  id: number;
  nome: string;
  login: string;
  perfil: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function parseUserFromStorage(): User | null {
  try {
    const saved = localStorage.getItem("user");
    if (!saved) return null;
    return JSON.parse(saved) as User;
  } catch {
    localStorage.removeItem("user");
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(parseUserFromStorage);

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("accessToken");
  });

  const tokenRef = useRef(token);
  tokenRef.current = token;

  useEffect(() => {
    if (!token || user) return;

    const controller = new AbortController();

    async function carregarUsuario() {
      try {
        const API_URL = import.meta.env.VITE_API_URL;
        const resposta = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${tokenRef.current}` },
          signal: controller.signal,
        });

        if (!resposta.ok) {
          logout();
          return;
        }

        const dados = await resposta.json();
        setUser(dados);
        localStorage.setItem("user", JSON.stringify(dados));
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        logout();
      }
    }

    carregarUsuario();

    return () => controller.abort();
  }, [token, user]);

  function login(novoToken: string, novoUser: User) {
    setToken(novoToken);
    setUser(novoUser);
    localStorage.setItem("accessToken", novoToken);
    localStorage.setItem("user", JSON.stringify(novoUser));
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isAdmin: user?.perfil === "ADMINISTRADOR",
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
