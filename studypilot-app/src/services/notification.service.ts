/* ─────────────────────────────────────────
   Notification Service
   Backed by localStorage — no backend required.
   Drop-in ready to swap for a real API.
───────────────────────────────────────── */

export type NotifType =
  | "ai_response"
  | "guide_ready"
  | "quiz_result"
  | "streak"
  | "flashcard"
  | "reminder"
  | "system";

export interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string; // ISO string
  link?: string;     // optional route to navigate to
  icon?: string;     // material symbol name
}

const STORAGE_KEY = "sp_notifications_v1";

function load(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(notifs: Notification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs));
  } catch {}
}

function seed() {
  const existing = load();
  if (existing.length > 0) return; // already seeded

  const now = Date.now();
  const initial: Notification[] = [
    {
      id: "seed-1",
      type: "streak",
      title: "🔥 Keep your streak alive!",
      body: "You're on a 1-day streak. Study today to extend it!",
      read: false,
      createdAt: new Date(now - 1000 * 60 * 5).toISOString(),
      link: "/dashboard",
      icon: "local_fire_department",
    },
    {
      id: "seed-2",
      type: "guide_ready",
      title: "Guide ready to study",
      body: "Your guide is processed and ready. Start a session with AI Tutor.",
      read: false,
      createdAt: new Date(now - 1000 * 60 * 30).toISOString(),
      link: "/guides",
      icon: "menu_book",
    },
    {
      id: "seed-3",
      type: "reminder",
      title: "Daily study reminder",
      body: "You haven't studied in a while. Even 15 minutes makes a difference!",
      read: true,
      createdAt: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
      link: "/ai-tutor",
      icon: "notifications_active",
    },
    {
      id: "seed-4",
      type: "system",
      title: "Welcome to StudyPilot!",
      body: "Upload your first guide, then ask the AI Tutor anything about it.",
      read: true,
      createdAt: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
      link: "/guides/new",
      icon: "celebration",
    },
  ];
  save(initial);
}

// Initialise on module load
seed();

export const notificationService = {
  /** Get all notifications, newest first */
  getAll(): Notification[] {
    return load().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  /** Unread count */
  unreadCount(): number {
    return load().filter((n) => !n.read).length;
  },

  /** Mark a single notification as read */
  markRead(id: string) {
    const notifs = load().map((n) => (n.id === id ? { ...n, read: true } : n));
    save(notifs);
  },

  /** Mark all as read */
  markAllRead() {
    const notifs = load().map((n) => ({ ...n, read: true }));
    save(notifs);
  },

  /** Delete a single notification */
  remove(id: string) {
    save(load().filter((n) => n.id !== id));
  },

  /** Delete all */
  clearAll() {
    save([]);
  },

  /** Push a new notification programmatically (e.g. after AI responds) */
  push(payload: Omit<Notification, "id" | "read" | "createdAt">) {
    const notifs = load();
    const newNotif: Notification = {
      ...payload,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    save([newNotif, ...notifs]);
    // Dispatch a custom event so any open panel can react in real-time
    window.dispatchEvent(new CustomEvent("sp:notification", { detail: newNotif }));
    return newNotif;
  },

  /** Subscribe to real-time pushes */
  subscribe(callback: (n: Notification) => void) {
    const handler = (e: Event) => callback((e as CustomEvent<Notification>).detail);
    window.addEventListener("sp:notification", handler);
    return () => window.removeEventListener("sp:notification", handler);
  },
};
