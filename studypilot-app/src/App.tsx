import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import DashboardLayout from "./components/layout/DashboardLayout";
import MyGuidesPage from "./pages/MyGuidesPage";
import CreateGuidePage from "./pages/CreateGuidePage";
import HistoryPage from "./pages/HistoryPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />

        {/* Dashboard Routes (with shared layout) */}
        <Route element={<DashboardLayout />}>
          <Route path="/guides" element={<MyGuidesPage />} />
          <Route path="/guides/new" element={<CreateGuidePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/resources" element={<MyGuidesPage />} />
          <Route path="/settings" element={<HistoryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
