import { useState, useEffect } from "react";
import { analyticsService } from "../services/analytics.service";
import type { OverviewStats } from "../services/analytics.service";
import { historyService } from "../services/history.service";
import type { ActivityEvent, ActivityCalendarItem } from "../services/history.service";
import { guideService } from "../services/guide.service";

const activityIcons: Record<string, { icon: string; color: string }> = {
  guide_created: { icon: "auto_stories", color: "bg-primary" },
  quiz_completed: { icon: "quiz", color: "bg-tertiary" },
  flashcard_review: { icon: "psychology", color: "bg-secondary" },
  file_uploaded: { icon: "cloud_upload", color: "bg-secondary" },
  doubt_session: { icon: "forum", color: "bg-primary-container" },
  study_session: { icon: "timer", color: "bg-primary" },
  guide_deleted: { icon: "delete", color: "bg-error" },
};

function getEventConfig(type: string) {
  return activityIcons[type] || { icon: "event", color: "bg-slate-500" };
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function groupEventsByDay(events: ActivityEvent[]): { group: string; items: ActivityEvent[] }[] {
  const groups: Record<string, ActivityEvent[]> = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  for (const ev of events) {
    const d = new Date(ev.occurredAt).toDateString();
    const label = d === today ? "Today" : d === yesterday ? "Yesterday" : new Date(ev.occurredAt).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
    if (!groups[label]) groups[label] = [];
    groups[label].push(ev);
  }

  return Object.entries(groups).map(([group, items]) => ({ group, items }));
}

export default function HistoryPage() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [calendar, setCalendar] = useState<ActivityCalendarItem[]>([]);
  const [guides, setGuides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [overviewData, activityData, calendarData, guidesData] = await Promise.all([
          analyticsService.getOverview(),
          historyService.getActivityLog(1, 30),
          historyService.getActivityCalendar(),
          guideService.getAll(),
        ]);
        setOverview(overviewData);
        setEvents(activityData.events);
        setCalendar(calendarData);
        setGuides(guidesData || []);
      } catch (err) {
        console.error("Failed to load history data", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Build heatmap from calendar data (last 28 days, 7 columns × 4 rows)
  const buildHeatmap = (): { bg: string; date: string; count: number }[][] => {
    const today = new Date();
    const cols: { bg: string; date: string; count: number }[][] = [];
    const calMap: Record<string, number> = {};
    for (const item of calendar) {
      calMap[item.date] = item.count;
    }

    for (let col = 6; col >= 0; col--) {
      const rows: { bg: string; date: string; count: number }[] = [];
      for (let row = 0; row < 4; row++) {
        const dayOffset = col * 4 + row;
        const d = new Date(today);
        d.setDate(d.getDate() - (27 - dayOffset));
        const dateStr = d.toISOString().split("T")[0];
        const count = calMap[dateStr] || 0;
        let bg = "bg-outline-variant/20";
        if (count >= 4) bg = "bg-primary";
        else if (count >= 3) bg = "bg-primary/80";
        else if (count >= 2) bg = "bg-primary/60";
        else if (count >= 1) bg = "bg-primary/30";
        rows.push({ bg, date: dateStr, count });
      }
      cols.push(rows);
    }
    return cols;
  };

  // Build subject breakdown from guides
  const subjectBreakdown = () => {
    const subjectMap: Record<string, number> = {};
    for (const g of guides) {
      const sub = g.subject || "General";
      subjectMap[sub] = (subjectMap[sub] || 0) + 1;
    }
    const entries = Object.entries(subjectMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = entries.length > 0 ? entries[0][1] : 1;
    const colors = ["bg-primary", "bg-secondary", "bg-tertiary", "bg-primary-container", "bg-secondary-container"];
    return entries.map(([name, count], i) => ({
      name,
      guides: `${count} guide${count > 1 ? "s" : ""}`,
      pct: `${Math.round((count / max) * 100)}%`,
      color: colors[i % colors.length],
    }));
  };

  // Compute badges from real data
  const badges = [
    {
      name: "First Guide",
      icon: overview && overview.totalGuidesStudied >= 1 ? "auto_stories" : "lock",
      color: overview && overview.totalGuidesStudied >= 1 ? "bg-primary-fixed text-primary" : "bg-surface-container text-outline",
      unlocked: !!(overview && overview.totalGuidesStudied >= 1),
    },
    {
      name: "7-Day Run",
      icon: overview && overview.longestStreak >= 7 ? "local_fire_department" : "lock",
      color: overview && overview.longestStreak >= 7 ? "bg-secondary-fixed text-secondary" : "bg-surface-container text-outline",
      unlocked: !!(overview && overview.longestStreak >= 7),
    },
    {
      name: "Quiz Master",
      icon: overview && overview.totalQuizAttempts >= 10 ? "emoji_events" : "lock",
      color: overview && overview.totalQuizAttempts >= 10 ? "bg-tertiary-fixed text-tertiary" : "bg-surface-container text-outline",
      unlocked: !!(overview && overview.totalQuizAttempts >= 10),
    },
    {
      name: "Top Scholar",
      icon: overview && overview.averageQuizScore >= 90 ? "school" : "lock",
      color: overview && overview.averageQuizScore >= 90 ? "bg-primary-fixed text-primary" : "bg-surface-container text-outline",
      unlocked: !!(overview && overview.averageQuizScore >= 90),
    },
    {
      name: "Deep Diver",
      icon: overview && overview.totalStudyMinutes >= 600 ? "scuba_diving" : "lock",
      color: overview && overview.totalStudyMinutes >= 600 ? "bg-secondary-fixed text-secondary" : "bg-surface-container text-outline",
      unlocked: !!(overview && overview.totalStudyMinutes >= 600),
    },
    {
      name: "Card Master",
      icon: overview && overview.masteredCards >= 50 ? "style" : "lock",
      color: overview && overview.masteredCards >= 50 ? "bg-tertiary-fixed text-tertiary" : "bg-surface-container text-outline",
      unlocked: !!(overview && overview.masteredCards >= 50),
    },
  ];

  const heatmapRows = buildHeatmap();
  const subjects = subjectBreakdown();
  const groupedEvents = groupEventsByDay(events);

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center py-24">
        <span className="material-symbols-outlined animate-spin text-primary text-5xl">progress_activity</span>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-10">
        <h2 className="font-headline text-headline-lg text-on-surface">Learning History</h2>
        <p className="text-body-lg text-on-surface-variant mt-1">Track your study journey, learning progress, and academic growth over time.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { icon: "auto_stories", label: "Guides Created", value: String(overview?.totalGuidesStudied || 0), iconBg: "bg-primary-fixed", iconColor: "text-primary" },
          { icon: "style", label: "Flashcards Reviewed", value: String(overview?.totalFlashcardsReviewed || 0), iconBg: "bg-secondary-fixed", iconColor: "text-secondary" },
          { icon: "quiz", label: "Quizzes Attempted", value: String(overview?.totalQuizAttempts || 0), iconBg: "bg-tertiary-fixed", iconColor: "text-tertiary" },
          { icon: "timer", label: "Study Minutes", value: String(overview?.totalStudyMinutes || 0), iconBg: "bg-primary-container/10", iconColor: "text-primary-container" },
        ].map((s) => (
          <div key={s.label} className="glass-card glass-card-hover p-6 rounded-2xl flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${s.iconBg} ${s.iconColor} flex items-center justify-center`}>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant font-label">{s.label}</p>
              <p className="font-headline text-headline-md text-on-surface">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Streak & Badges Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Streak Card */}
        <div className="lg:col-span-2 glass-card p-8 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
              <h3 className="font-headline text-headline-md text-on-surface mb-2">Learning Streak</h3>
              <p className="text-body-md text-on-surface-variant">Consistency is the key to mastery.</p>
            </div>
            <div className="flex gap-4">
              <div className="text-center px-4 py-2 rounded-2xl bg-surface-container-low border border-outline-variant/20">
                <p className="text-label-sm text-on-surface-variant font-label">Current</p>
                <p className="font-bold text-headline-md text-primary font-headline">{overview?.currentStudyStreak || 0} Days</p>
              </div>
              <div className="text-center px-4 py-2 rounded-2xl bg-surface-container-low border border-outline-variant/20">
                <p className="text-label-sm text-on-surface-variant font-label">Longest</p>
                <p className="font-bold text-headline-md text-on-surface font-headline">{overview?.longestStreak || 0} Days</p>
              </div>
            </div>
          </div>
          {/* Heatmap */}
          <div className="space-y-4">
            <div className="flex justify-between text-label-sm text-on-surface-variant opacity-70 font-label">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i}>{d}</span>)}
            </div>
            <div className="flex justify-between">
              {heatmapRows.map((col, i) => (
                <div key={i} className="flex flex-col gap-1 items-center">
                  {col.map((cell, j) => (
                    <div
                      key={j}
                      className={`heatmap-square ${cell.bg}`}
                      title={`${cell.date}: ${cell.count} session${cell.count !== 1 ? "s" : ""}`}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 justify-end text-[10px] text-on-surface-variant font-label">
              <span>Less</span>
              <div className="w-3 h-3 rounded-sm bg-outline-variant/20" />
              <div className="w-3 h-3 rounded-sm bg-primary/30" />
              <div className="w-3 h-3 rounded-sm bg-primary/60" />
              <div className="w-3 h-3 rounded-sm bg-primary" />
              <span>More</span>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="glass-card p-6 rounded-3xl">
          <h3 className="font-headline text-headline-md text-on-surface mb-6">Badges</h3>
          <div className="grid grid-cols-3 gap-4">
            {badges.map((b) => (
              <div key={b.name} className={`${b.unlocked ? "achievement-badge unlocked" : "achievement-badge"} flex flex-col items-center gap-2 text-center group cursor-help`}>
                <div className={`w-16 h-16 rounded-full ${b.color} flex items-center justify-center ${b.unlocked ? "shadow-lg" : ""} group-hover:scale-110 transition-transform`}>
                  <span className="material-symbols-outlined text-3xl" style={b.unlocked ? { fontVariationSettings: "'FILL' 1" } : undefined}>{b.icon}</span>
                </div>
                <span className={`text-label-sm font-bold font-label ${b.unlocked ? "text-on-surface" : "text-outline-variant"}`}>{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity & Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Timeline */}
        <div className="lg:col-span-2 glass-card p-8 rounded-3xl">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-headline text-headline-md text-on-surface">Recent Activity</h3>
          </div>
          {groupedEvents.length > 0 ? (
            <div className="space-y-8 relative">
              <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-outline-variant/30 -z-10" />
              {groupedEvents.map((group) => (
                <div key={group.group}>
                  <p className="text-label-sm font-bold text-on-surface-variant mb-6 uppercase tracking-wider pl-12 font-label">{group.group}</p>
                  <div className="space-y-6">
                    {group.items.map((item) => {
                      const config = getEventConfig(item.type);
                      return (
                        <div key={item.id} className="flex items-center gap-6 pl-2">
                          <div className={`w-8 h-8 rounded-full ${config.color} flex items-center justify-center text-white ring-4 ring-white`}>
                            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{config.icon}</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-body-md font-semibold text-on-surface">{item.description}</p>
                            <p className="text-body-sm text-on-surface-variant">
                              {item.guideName ? `Guide: ${item.guideName} • ` : ""}
                              {new Date(item.occurredAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                          <span className="text-label-sm text-outline-variant font-label">{timeAgo(item.occurredAt)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-4xl text-outline-variant opacity-40 mb-3">history</span>
              <h4 className="font-headline text-headline-sm text-on-surface mb-1">No activity yet</h4>
              <p className="text-body-sm text-on-surface-variant">Create study guides, take quizzes, and review flashcards to build your history.</p>
            </div>
          )}
        </div>

        {/* Analytics Sidebar */}
        <div className="space-y-6">
          {/* Subject Breakdown */}
          <div className="glass-card p-6 rounded-3xl">
            <h4 className="text-label-md font-bold text-on-surface mb-6 font-label">Subject Breakdown</h4>
            {subjects.length > 0 ? (
              <div className="space-y-5">
                {subjects.map((s) => (
                  <div key={s.name}>
                    <div className="flex justify-between text-body-sm mb-1.5">
                      <span className="text-on-surface font-medium">{s.name}</span>
                      <span className="text-on-surface-variant">{s.guides}</span>
                    </div>
                    <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                      <div className={`h-full ${s.color} rounded-full transition-all duration-700`} style={{ width: s.pct }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-body-sm text-on-surface-variant text-center py-4">No subjects yet.</p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="glass-card p-6 rounded-3xl">
            <h4 className="text-label-md font-bold text-on-surface mb-4 font-label">Quick Overview</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-body-sm text-on-surface-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-primary">style</span>
                  Mastered Cards
                </span>
                <span className="text-body-sm font-bold text-on-surface">{overview?.masteredCards || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-body-sm text-on-surface-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-secondary">quiz</span>
                  Avg Quiz Score
                </span>
                <span className="text-body-sm font-bold text-on-surface">{overview?.averageQuizScore || 0}%</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-body-sm text-on-surface-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-tertiary">schedule</span>
                  Last Active
                </span>
                <span className="text-body-sm font-bold text-on-surface">
                  {overview?.lastActiveAt ? timeAgo(overview.lastActiveAt) : "Never"}
                </span>
              </div>
            </div>
          </div>

          {/* Deep Insights CTA */}
          <div className="bg-primary p-6 rounded-3xl text-on-primary relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
              <span className="material-symbols-outlined text-8xl">auto_awesome</span>
            </div>
            <p className="font-bold text-label-md mb-2 font-label">Deep Insights</p>
            <p className="text-body-sm text-on-primary/80 mb-4">Unlock advanced cognitive tracking and AI-driven study planning.</p>
            <button className="bg-white text-primary px-4 py-2 rounded-xl text-label-sm font-bold shadow-md hover:bg-on-primary-container transition-colors font-label">Go Premium</button>
          </div>
        </div>
      </div>
    </>
  );
}
