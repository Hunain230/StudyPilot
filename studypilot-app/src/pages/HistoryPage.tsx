export default function HistoryPage() {
  const heatmapRows = [
    ["bg-outline-variant/20","bg-outline-variant/20","bg-primary/20","bg-primary/60"],
    ["bg-primary/20","bg-primary/80","bg-primary/40","bg-primary"],
    ["bg-outline-variant/20","bg-outline-variant/20","bg-primary/20","bg-primary/60"],
    ["bg-primary","bg-primary/80","bg-primary/90","bg-primary"],
    ["bg-primary/40","bg-primary/20","bg-primary/60","bg-primary/80"],
    ["bg-outline-variant/20","bg-outline-variant/20","bg-primary/20","bg-primary/30"],
    ["bg-primary/10","bg-primary/20","bg-primary/40","bg-primary/50"],
  ];

  const badges = [
    { name: "First Guide", icon: "auto_stories", color: "bg-primary-fixed text-primary", unlocked: true },
    { name: "7-Day Run", icon: "local_fire_department", color: "bg-secondary-fixed text-secondary", unlocked: true },
    { name: "Quiz Master", icon: "lock", color: "bg-surface-container text-outline", unlocked: false },
    { name: "Top Scholar", icon: "lock", color: "bg-surface-container text-outline", unlocked: false },
    { name: "Deep Diver", icon: "lock", color: "bg-surface-container text-outline", unlocked: false },
    { name: "Speed Demon", icon: "lock", color: "bg-surface-container text-outline", unlocked: false },
  ];

  const activities = [
    { group: "Today", items: [
      { icon: "psychology", color: "bg-primary", label: "Reviewed 42 Flashcards", detail: "Subject: Database Systems • 10:30 AM", time: "15m" },
      { icon: "quiz", color: "bg-tertiary", label: "Completed Database Quiz #3", detail: "Score: 8/10 • 09:15 AM", time: "25m" },
    ]},
    { group: "Yesterday", items: [
      { icon: "cloud_upload", color: "bg-secondary", label: 'Uploaded "Modern AI Principles.pdf"', detail: "Generated study guide & flashcards • 4:45 PM", time: "2m" },
      { icon: "forum", color: "bg-primary-container", label: 'AI Mentor Session: "Explain Transactions"', detail: "Interactive tutoring session • 2:30 PM", time: "45m" },
    ]},
  ];

  const subjects = [
    { name: "Database Systems", hours: "42 hrs", pct: "75%", color: "bg-primary" },
    { name: "AI & ML", hours: "28 hrs", pct: "50%", color: "bg-secondary" },
    { name: "Physics II", hours: "14 hrs", pct: "25%", color: "bg-tertiary" },
  ];

  const barHeights = ["40%","65%","50%","85%","30%","95%","70%"];

  return (
    <>
      {/* Header */}
      <div className="mb-10">
        <h2 className="font-headline text-headline-lg text-on-surface">Learning History</h2>
        <p className="text-body-lg text-on-surface-variant mt-1">Track your study journey, learning progress, and academic growth over time.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-10">
        {[
          { icon: "auto_stories", label: "Guides Created", value: "18", iconBg: "bg-primary-fixed", iconColor: "text-primary" },
          { icon: "style", label: "Flashcards Reviewed", value: "542", iconBg: "bg-secondary-fixed", iconColor: "text-secondary" },
          { icon: "quiz", label: "Quizzes Attempted", value: "37", iconBg: "bg-tertiary-fixed", iconColor: "text-tertiary" },
          { icon: "timer", label: "Study Hours", value: "84", iconBg: "bg-primary-container/10", iconColor: "text-primary-container" },
        ].map(s => (
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter mb-10">
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
                <p className="font-bold text-headline-md text-primary font-headline">12 Days</p>
              </div>
              <div className="text-center px-4 py-2 rounded-2xl bg-surface-container-low border border-outline-variant/20">
                <p className="text-label-sm text-on-surface-variant font-label">Longest</p>
                <p className="font-bold text-headline-md text-on-surface font-headline">27 Days</p>
              </div>
            </div>
          </div>
          {/* Heatmap */}
          <div className="space-y-4">
            <div className="flex justify-between text-label-sm text-on-surface-variant opacity-70 font-label">
              {["S","M","T","W","T","F","S"].map((d,i) => <span key={i}>{d}</span>)}
            </div>
            <div className="flex justify-between">
              {heatmapRows.map((col, i) => (
                <div key={i} className="flex flex-col gap-1 items-center">
                  {col.map((bg, j) => <div key={j} className={`heatmap-square ${bg}`} />)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="glass-card p-6 rounded-3xl">
          <h3 className="font-headline text-headline-md text-on-surface mb-6">Badges</h3>
          <div className="grid grid-cols-3 gap-4">
            {badges.map(b => (
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        {/* Activity Timeline */}
        <div className="lg:col-span-2 glass-card p-8 rounded-3xl">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-headline text-headline-md text-on-surface">Recent Activity</h3>
            <button className="text-primary text-label-md font-bold hover:underline font-label">View All</button>
          </div>
          <div className="space-y-8 relative">
            <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-outline-variant/30 -z-10" />
            {activities.map(group => (
              <div key={group.group}>
                <p className="text-label-sm font-bold text-on-surface-variant mb-6 uppercase tracking-wider pl-12 font-label">{group.group}</p>
                <div className="space-y-6">
                  {group.items.map(item => (
                    <div key={item.label} className="flex items-center gap-6 pl-2">
                      <div className={`w-8 h-8 rounded-full ${item.color} flex items-center justify-center text-white ring-4 ring-white`}>
                        <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-body-md font-semibold text-on-surface">{item.label}</p>
                        <p className="text-body-sm text-on-surface-variant">{item.detail}</p>
                      </div>
                      <span className="text-label-sm text-outline-variant font-label">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Analytics Sidebar */}
        <div className="space-y-gutter">
          {/* Study Time Trend */}
          <div className="glass-card p-6 rounded-3xl">
            <h4 className="text-label-md font-bold text-on-surface mb-4 font-label">Study Time Trend</h4>
            <div className="h-32 flex items-end justify-between gap-1">
              {barHeights.map((h, i) => (
                <div
                  key={i}
                  className={`w-full rounded-t-lg transition-all hover:bg-primary ${i === barHeights.length - 1 ? "bg-primary" : "bg-primary/20"}`}
                  style={{ height: h }}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-on-surface-variant mt-2 font-label uppercase">
              <span>Mon</span><span>Sun</span>
            </div>
          </div>

          {/* Subject Activity */}
          <div className="glass-card p-6 rounded-3xl">
            <h4 className="text-label-md font-bold text-on-surface mb-6 font-label">Subject Activity</h4>
            <div className="space-y-5">
              {subjects.map(s => (
                <div key={s.name}>
                  <div className="flex justify-between text-body-sm mb-1.5">
                    <span className="text-on-surface font-medium">{s.name}</span>
                    <span className="text-on-surface-variant">{s.hours}</span>
                  </div>
                  <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                    <div className={`h-full ${s.color} rounded-full`} style={{ width: s.pct }} />
                  </div>
                </div>
              ))}
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
