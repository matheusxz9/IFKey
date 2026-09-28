import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({
  children,
  allowedRoles,
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

  if (allowedRoles && user && !allowedRoles.includes(user.perfil)) {
    return <Navigate to="/chaves" replace />;
  }

  return <>{children}</>;
}
