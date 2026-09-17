import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import SuapCallbackPage from "./pages/SuapCallbackPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login/suap/callback" element={<SuapCallbackPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
