import { Link, useLocation } from "react-router-dom";

const navItems = [
  { label: "Dashboard", icon: "dashboard", href: "/guides" },
  { label: "My Guides", icon: "auto_stories", href: "/guides" },
  { label: "New Guide", icon: "add_circle", href: "/guides/new" },
  { label: "Resources", icon: "library_books", href: "/resources" },
  { label: "History", icon: "history", href: "/history" },
  { label: "Settings", icon: "settings", href: "/settings" },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-[280px] h-screen fixed left-0 top-0 bg-white/70 backdrop-blur-xl border-r border-outline-variant/30 flex flex-col py-unit px-margin-mobile z-50">
      {/* Brand */}
      <div className="mb-10 px-4 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-on-primary">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
        </div>
        <div>
          <h1 className="font-headline text-headline-md font-bold text-primary">ScholarStudy</h1>
          <p className="text-xs text-on-surface-variant font-label">Silent Mentor</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href ||
            (item.href === "/guides" && location.pathname === "/guides") ||
            (item.href === "/guides/new" && location.pathname === "/guides/new") ||
            (item.href === "/history" && location.pathname === "/history");

          return (
            <Link
              key={item.label}
              to={item.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors font-label text-label-md ${
                isActive
                  ? "text-primary font-bold bg-surface-container-low sidebar-active"
                  : "text-on-surface-variant hover:bg-primary/5"
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="mt-auto px-4 py-6">
        {/* Upgrade Card */}
        <div className="glass-card p-4 rounded-2xl mb-6 bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
          <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">Current Plan: Free</p>
          <h4 className="text-body-md font-bold text-on-surface mb-4">Get 10x more power</h4>
          <button className="w-full py-2.5 bg-secondary text-on-secondary rounded-xl font-bold text-label-md shadow-md hover:scale-[1.02] transition-transform">
            Upgrade to Pro
          </button>
        </div>

        {/* User Profile */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-primary-fixed overflow-hidden bg-surface-container">
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-primary font-bold text-sm">
                SJ
              </div>
            </div>
            <div>
              <p className="text-label-md font-bold text-on-surface">Scholar J.</p>
              <Link
                to="/"
                className="flex items-center gap-1 text-body-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
                Log out
              </Link>
            </div>
          </div>
          <button className="p-2 text-on-surface-variant hover:bg-primary/5 rounded-full transition-colors">
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
