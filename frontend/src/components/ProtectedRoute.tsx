import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function ProtectedRoute({
  children,
  requiredRole,
}: ProtectedRouteProps) {
  const { isAuthenticated, user, carregando } = useAuth();

  if (carregando) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-400"
        role="status"
      >
        Verificando sessão...
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && user?.perfil !== requiredRole) {
    return <Navigate to="/chaves" replace />;
  }

  return <>{children}</>;
}
