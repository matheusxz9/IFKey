import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { TelaCarregando } from "./ui/Estado";

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
    return <TelaCarregando mensagem="Verificando sessão..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.perfil)) {
    return <Navigate to="/chaves" replace />;
  }

  return <>{children}</>;
}
