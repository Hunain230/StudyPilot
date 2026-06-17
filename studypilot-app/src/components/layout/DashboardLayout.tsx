import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function DashboardLayout() {
  return (
    <div className="bg-background font-body text-on-surface flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[280px] relative min-h-screen">
        {/* Background Gradient */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(113,42,226,0.08),transparent),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.08),transparent)] bg-surface" />
        <TopBar />
        <div className="pt-24 pb-12 px-margin-desktop max-w-container-max mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
