import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  notificationService,
  type Notification,
} from "../../services/notification.service";

/* ── helpers ── */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const TYPE_COLORS: Record<string, string> = {
  ai_response:  "text-violet-400 bg-violet-400/10",
  guide_ready:  "text-emerald-400 bg-emerald-400/10",
  quiz_result:  "text-amber-400 bg-amber-400/10",
  streak:       "text-orange-400 bg-orange-400/10",
  flashcard:    "text-blue-400 bg-blue-400/10",
  reminder:     "text-rose-400 bg-rose-400/10",
  system:       "text-indigo-400 bg-indigo-400/10",
};

const DEFAULT_ICONS: Record<string, string> = {
  ai_response:  "psychology",
  guide_ready:  "menu_book",
  quiz_result:  "quiz",
  streak:       "local_fire_department",
  flashcard:    "style",
  reminder:     "notifications_active",
  system:       "info",
};

/* ─────────────────────────────────────────
   Bell button + dropdown panel
───────────────────────────────────────── */
export default function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [animateBell, setAnimateBell] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const refresh = useCallback(() => {
    const all = notificationService.getAll();
    setNotifs(all);
    setUnread(all.filter((n) => !n.read).length);
  }, []);

  /* Initial load + real-time subscription */
  useEffect(() => {
    refresh();
    const unsub = notificationService.subscribe(() => {
      refresh();
      setAnimateBell(true);
      setTimeout(() => setAnimateBell(false), 600);
    });
    return unsub;
  }, [refresh]);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = () => {
    setOpen((p) => !p);
    if (!open && unread > 0) {
      // Mark all read when opening
      setTimeout(() => {
        notificationService.markAllRead();
        refresh();
      }, 1200); // slight delay so the dots are still visible briefly
    }
  };

  const handleClick = (n: Notification) => {
    notificationService.markRead(n.id);
    refresh();
    if (n.link) navigate(n.link);
    setOpen(false);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    notificationService.remove(id);
    refresh();
  };

  const handleClearAll = () => {
    notificationService.clearAll();
    refresh();
  };

  return (
    <div ref={panelRef} className="relative" id="notification-panel">
      {/* ── Bell Button ── */}
      <button
        id="notification-bell-btn"
        onClick={toggle}
        className={`relative p-2 rounded-full transition-all duration-200
          ${open
            ? "bg-primary/10 text-primary"
            : "text-on-surface-variant hover:bg-primary/5 hover:text-on-surface"
          }
          ${animateBell ? "sp-notif-ring" : ""}
        `}
        aria-label="Notifications"
        title="Notifications"
      >
        <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: open ? "'FILL' 1" : "'FILL' 0" }}>
          notifications
        </span>

        {/* Unread badge */}
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-gradient-to-br from-rose-500 to-pink-500
              flex items-center justify-center text-[10px] font-bold text-white leading-none px-1
              shadow-[0_0_8px_rgba(239,68,68,0.6)]"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* ── Dropdown Panel ── */}
      {open && (
        <div
          className="absolute right-0 top-[calc(100%+10px)] w-[360px] z-50
            bg-surface-container-lowest border border-outline-variant/15
            rounded-2xl shadow-[0_12px_48px_rgba(0,0,0,0.2),0_4px_16px_rgba(0,0,0,0.08)]
            overflow-hidden sp-notif-panel-in"
          id="notification-dropdown"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-outline-variant/10">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                notifications
              </span>
              <h3 className="text-[14px] font-bold text-on-surface">Notifications</h3>
              {unread > 0 && (
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                  {unread} new
                </span>
              )}
            </div>
            {notifs.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-[12px] text-on-surface-variant/50 hover:text-on-surface-variant transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[420px] sp-notif-scroll">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant/30 text-2xl">
                    notifications_off
                  </span>
                </div>
                <p className="text-[13px] text-on-surface-variant/50 text-center">
                  You're all caught up!
                </p>
              </div>
            ) : (
              <div>
                {notifs.map((n) => {
                  const colorClass = TYPE_COLORS[n.type] ?? TYPE_COLORS.system;
                  const icon = n.icon ?? DEFAULT_ICONS[n.type] ?? "info";
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={`group relative flex gap-3 px-4 py-3 cursor-pointer transition-all duration-150
                        border-b border-outline-variant/6 last:border-none
                        ${n.read
                          ? "hover:bg-surface-container-low"
                          : "bg-primary/[0.03] hover:bg-primary/[0.06]"
                        }
                      `}
                      id={`notification-item-${n.id}`}
                    >
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${colorClass}`}>
                        <span className="material-symbols-outlined text-[17px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                          {icon}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-[13px] font-semibold leading-tight truncate ${n.read ? "text-on-surface/80" : "text-on-surface"}`}>
                            {n.title}
                          </p>
                          <span className="text-[10px] text-on-surface-variant/40 whitespace-nowrap flex-shrink-0 mt-0.5">
                            {timeAgo(n.createdAt)}
                          </span>
                        </div>
                        <p className="text-[12px] text-on-surface-variant/60 mt-0.5 leading-relaxed line-clamp-2">
                          {n.body}
                        </p>
                      </div>

                      {/* Unread dot */}
                      {!n.read && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary shadow-[0_0_6px_rgba(99,102,241,0.7)]" />
                      )}

                      {/* Delete button */}
                      <button
                        onClick={(e) => handleDelete(e, n.id)}
                        className="absolute right-3 top-2 opacity-0 group-hover:opacity-100 w-5 h-5 rounded-md flex items-center justify-center
                          text-on-surface-variant/40 hover:text-on-surface-variant hover:bg-surface-container-high transition-all"
                        title="Dismiss"
                      >
                        <span className="material-symbols-outlined text-[13px]">close</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div className="px-4 py-3 border-t border-outline-variant/10 flex items-center justify-between">
              <span className="text-[11px] text-on-surface-variant/40">
                {notifs.length} total · {unread} unread
              </span>
              <button
                onClick={() => { notificationService.markAllRead(); refresh(); }}
                className="text-[12px] font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Mark all read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
