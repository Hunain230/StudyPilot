import { Link } from "react-router-dom";
import type { UserProfile } from "./DashboardLayout";
import NotificationPanel from "./NotificationPanel";
import { useStreak } from "../../hooks/useStreak";
import { useTheme } from "../../context/ThemeContext";

interface TopBarProps {
  user: UserProfile;
}

export default function TopBar({ user }: TopBarProps) {
  const streak = useStreak();
  const { isDark, toggleTheme } = useTheme();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <header className="fixed top-0 right-0 left-[280px] h-16 bg-surface-container-lowest/70 backdrop-blur-md border-b border-outline-variant/30 flex justify-between items-center px-gutter z-40 transition-colors">
      {/* Search */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant">search</span>
          <input
            className="w-full bg-surface-container-low border-none rounded-full pl-10 pr-4 py-2 text-body-sm focus:ring-2 focus:ring-primary focus:bg-white transition-all font-body"
            placeholder="Search guides, flashcards..."
            type="text"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-6">
        {/* Streak Badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${
          streak.current > 0
            ? "bg-secondary-fixed/30 border-secondary-fixed text-secondary"
            : "bg-surface-container-low border-outline-variant/30 text-on-surface-variant/40"
        }`} title={streak.current > 0 ? `${streak.current} days study streak!` : "Start a streak by studying today!"}>
          <span
            className={`material-symbols-outlined font-bold text-lg ${streak.current > 0 ? "text-secondary" : "text-on-surface-variant/40"}`}
            style={{ fontVariationSettings: streak.current > 0 ? "'FILL' 1" : "'FILL' 0" }}
          >
            local_fire_department
          </span>
          <span className={`text-label-md font-bold font-label ${streak.current > 0 ? "text-secondary" : "text-on-surface-variant/60"}`}>
            {streak.current} Day{streak.current === 1 ? "" : "s"} Streak
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <NotificationPanel />
          <button
            onClick={toggleTheme}
            className="p-2 text-on-surface-variant hover:bg-primary/5 rounded-full transition-colors active:scale-95"
            aria-label="Toggle Theme"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            <span className="material-symbols-outlined">
              {isDark ? "light_mode" : "dark_mode"}
            </span>
          </button>
          <Link to="/guides" className="w-10 h-10 rounded-full border-2 border-primary-fixed overflow-hidden block">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-primary font-bold text-sm">
                {getInitials(user.name)}
              </div>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
