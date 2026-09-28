import { lazy } from "react";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import SuapCallbackPage from "./pages/SuapCallbackPage";
import NotFoundPage from "./pages/NotFoundPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

const ChavesPage = lazy(() => import("./pages/ChavesPage"));
const HistoricoPage = lazy(() => import("./pages/HistoricoPage"));
const GestaoChavesPage = lazy(() => import("./pages/GestaoChavesPage"));
const GestaoSolicitantesPage = lazy(() => import("./pages/GestaoSolicitantesPage"));
const GestaoAdministradoresPage = lazy(() => import("./pages/GestaoAdministradoresPage"));

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login/suap/callback" element={<SuapCallbackPage />} />

        <Route
          element={
            <ProtectedRoute
              allowedRoles={["ADMINISTRADOR", "GESTOR", "SOLICITANTE"]}
            >
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/chaves" element={<ChavesPage />} />
          <Route path="/historico" element={<HistoricoPage />} />

          <Route
            element={
              <ProtectedRoute
                allowedRoles={["ADMINISTRADOR", "GESTOR"]}
              >
                <Outlet />
              </ProtectedRoute>
            }
          >
            <Route path="/admin/chaves" element={<GestaoChavesPage />} />
            <Route path="/admin/solicitantes" element={<GestaoSolicitantesPage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute allowedRoles={["ADMINISTRADOR"]}>
                <Outlet />
              </ProtectedRoute>
            }
          >
            <Route path="/admin/administradores" element={<GestaoAdministradoresPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
