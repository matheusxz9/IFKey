import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import SuapCallbackPage from "./pages/SuapCallbackPage";
import ChavesPage from "./pages/ChavesPage";
import HistoricoPage from "./pages/HistoricoPage";
import GestaoChavesPage from "./pages/GestaoChavesPage";
import GestaoSolicitantesPage from "./pages/GestaoSolicitantesPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />

        <Route path="/login/suap/callback" element={<SuapCallbackPage />} />

        <Route path="/chaves" element={<ChavesPage />} />

        <Route path="/historico" element={<HistoricoPage />} />

        <Route path="/admin/chaves" element={<GestaoChavesPage />} />

        <Route path="/admin/solicitantes" element={<GestaoSolicitantesPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
