import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import DashboardLayout from "./components/layout/DashboardLayout";
import DashboardPage from "./pages/DashboardPage";
import MyGuidesPage from "./pages/MyGuidesPage";
import CreateGuidePage from "./pages/CreateGuidePage";
import HistoryPage from "./pages/HistoryPage";
import GuideDetailsPage from "./pages/GuideDetailsPage";
import SettingsPage from "./pages/SettingsPage";

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
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/guides" element={<MyGuidesPage />} />
          <Route path="/guides/new" element={<CreateGuidePage />} />
          <Route path="/guides/:id" element={<GuideDetailsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/resources" element={<MyGuidesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          
          {/* Fallback to Dashboard when inside auth layout */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

