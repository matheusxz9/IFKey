import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("accessToken");
  });

  useEffect(() => {
    if (token && !user) {
      carregarUsuario();
    }
  }, [token]);

  async function carregarUsuario() {
    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const resposta = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!resposta.ok) {
        logout();
        return;
      }

      const dados = await resposta.json();
      setUser(dados);
      localStorage.setItem("user", JSON.stringify(dados));
    } catch {
      logout();
    }
  }

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

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
