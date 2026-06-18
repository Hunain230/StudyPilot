/**
 * Streak Service
 * ─────────────────────────────────────────
 * Tracks daily study activity client-side using localStorage.
 * A "study day" is any day the user records at least one activity
 * (AI question, guide view, quiz attempt, etc.).
 *
 * Streak rules:
 *  • If the user studied YESTERDAY and TODAY → streak continues
 *  • If the user last studied TODAY only      → streak is at least 1
 *  • If the last activity was 2+ days ago     → streak is broken (reset to 0)
 *
 * The service dispatches "sp:streak" CustomEvents so any listener
 * can react in real-time without polling.
 */

import { notificationService } from "./notification.service";

const STORAGE_KEY = "sp_streak_v1";

export interface StreakData {
  /** Sorted array of ISO date strings (YYYY-MM-DD) the user was active */
  activeDays: string[];
  /** Current streak count (computed, not stored) */
  current: number;
  /** Longest ever streak (stored) */
  longest: number;
  /** ISO date of the last recorded activity */
  lastActivityAt: string | null;
}

/* ── helpers ── */
function toDateStr(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 86_400_000;
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / msPerDay
  );
}

function load(): Omit<StreakData, "current"> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { activeDays: [], longest: 0, lastActivityAt: null };
}

function computeCurrentStreak(activeDays: string[]): number {
  if (!activeDays.length) return 0;

  const today = toDateStr();
  const yesterday = toDateStr(new Date(Date.now() - 86_400_000));

  // Sort descending
  const sorted = [...activeDays].sort((a, b) => (a < b ? 1 : -1));

  // Streak only active if last day is today or yesterday
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (daysBetween(sorted[i], sorted[i - 1]) === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function save(data: Omit<StreakData, "current">) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

/* Dispatch a custom event so components can react in real-time */
function dispatch(streak: StreakData) {
  window.dispatchEvent(
    new CustomEvent<StreakData>("sp:streak", { detail: streak })
  );
}

export const streakService = {
  /** Read current streak state */
  get(): StreakData {
    const raw = load();
    const current = computeCurrentStreak(raw.activeDays);
    return { ...raw, current };
  },

  /**
   * Record a study activity for today.
   * Call this whenever the user does something meaningful:
   *  - Sends an AI Tutor question
   *  - Opens a guide
   *  - Attempts a quiz
   *  - Reviews flashcards
   */
  recordActivity(): StreakData {
    const raw = load();
    const today = toDateStr();
    const prevStreak = computeCurrentStreak(raw.activeDays);

    // Add today if not already present
    const alreadyToday = raw.activeDays.includes(today);
    const activeDays = alreadyToday
      ? raw.activeDays
      : [...raw.activeDays, today];

    const current = computeCurrentStreak(activeDays);
    const longest = Math.max(raw.longest, current);

    const updated: Omit<StreakData, "current"> = {
      activeDays,
      longest,
      lastActivityAt: new Date().toISOString(),
    };
    save(updated);

    const result: StreakData = { ...updated, current };

    // Notify on streak milestones (only when today is newly added)
    if (!alreadyToday) {
      if (current === 1 && prevStreak === 0) {
        // Streak was broken, now restarting
        notificationService.push({
          type: "streak",
          title: "🔥 Streak restarted!",
          body: "You're back! Keep studying daily to build your streak.",
          link: "/dashboard",
          icon: "local_fire_department",
        });
      } else if (current > 1) {
        // Continuing streak — notify on milestones
        const milestones = [3, 7, 14, 30, 60, 100];
        if (milestones.includes(current)) {
          notificationService.push({
            type: "streak",
            title: `🔥 ${current}-Day Streak!`,
            body: `Incredible consistency! You've studied ${current} days in a row. Keep it up!`,
            link: "/dashboard",
            icon: "local_fire_department",
          });
        } else {
          // Daily increment notification
          notificationService.push({
            type: "streak",
            title: `🔥 ${current}-day streak!`,
            body: "Great job studying today. Come back tomorrow to keep it going!",
            link: "/dashboard",
            icon: "local_fire_department",
          });
        }
      }
    }

    dispatch(result);
    return result;
  },

  /**
   * Check if the streak has expired (user missed yesterday).
   * Call this on app startup to detect overnight breaks.
   */
  checkExpiry(): StreakData {
    const raw = load();
    const current = computeCurrentStreak(raw.activeDays);

    // If there was a streak before but now it's 0, the streak broke
    if (raw.activeDays.length > 0 && current === 0 && raw.lastActivityAt) {
      const lastDay = toDateStr(new Date(raw.lastActivityAt));
      const today = toDateStr();
      const gap = daysBetween(lastDay, today);

      if (gap >= 2) {
        // Push a "streak broken" notification
        notificationService.push({
          type: "reminder",
          title: "😔 Streak lost",
          body: `You missed a day and lost your streak. Start fresh today — even 5 minutes counts!`,
          link: "/ai-tutor",
          icon: "sentiment_dissatisfied",
        });
      }
    }

    const result: StreakData = { ...raw, current };
    dispatch(result);
    return result;
  },

  /** Subscribe to streak updates */
  subscribe(callback: (s: StreakData) => void): () => void {
    const handler = (e: Event) =>
      callback((e as CustomEvent<StreakData>).detail);
    window.addEventListener("sp:streak", handler);
    return () => window.removeEventListener("sp:streak", handler);
  },

  /**
   * Returns ms until the next midnight (local time).
   * Useful for scheduling a check when the day flips.
   */
  msUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0, 0, 0, 0
    );
    return midnight.getTime() - now.getTime();
  },
};
