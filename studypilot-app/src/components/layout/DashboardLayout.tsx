import { Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { authService } from "../../services/auth.service";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
  _count?: {
    guides: number;
  };
}

export default function DashboardLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await authService.getMe();
        setUser(data);
      } catch (err) {
        console.error("Failed to authenticate user", err);
        // Interceptor will redirect to /login automatically, 
        // but just in case, handle it
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [navigate]);

  if (loading) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-5xl">progress_activity</span>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="bg-background font-body text-on-surface flex min-h-screen">
      {!isMaximized && <Sidebar user={user} />}
      <main className={`flex-1 relative min-h-screen ${isMaximized ? "ml-0" : "ml-[280px]"}`}>
        {/* Background Gradient */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(113,42,226,0.08),transparent),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.08),transparent)] bg-surface" />
        {!isMaximized && <TopBar user={user} />}
        <div className={isMaximized ? "h-screen" : "pt-24 pb-12 px-margin-desktop max-w-container-max mx-auto"}>
          <Outlet context={{ user, setUser, isMaximized, setIsMaximized }} />
        </div>
      </main>
    </div>
  );
}
