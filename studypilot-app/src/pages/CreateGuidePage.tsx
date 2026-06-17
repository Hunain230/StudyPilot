import { Link } from "react-router-dom";
import { useState } from "react";

const tabs = ["pdf", "youtube", "notes"] as const;
type Tab = typeof tabs[number];

const recentGuides = [
  { title: "Calculus II", stats: "24 Flashcards • 15min ago", color: "primary-container" },
  { title: "Database Systems", stats: "12 Topics • 2h ago", color: "secondary-container" },
  { title: "Organic Chemistry", stats: "32 Flashcards • Yesterday", color: "tertiary-container" },
];

const settings = [
  { label: "Summary", icon: "summarize", iconColor: "text-primary", checked: true },
  { label: "Flashcards", icon: "style", iconColor: "text-secondary", checked: true },
  { label: "Quiz", icon: "quiz", iconColor: "text-tertiary", checked: true, hasDifficulty: true },
  { label: "Mind Map", icon: "account_tree", iconColor: "text-on-surface-variant", checked: false, dimmed: true },
  { label: "Study Plan", icon: "calendar_month", iconColor: "text-primary", checked: true },
  { label: "Revision Sheet", icon: "description", iconColor: "text-secondary", checked: false },
  { label: "AI Doubt Solver", icon: "psychology", iconColor: "text-tertiary", checked: true },
];

export default function CreateGuidePage() {
  const [activeTab, setActiveTab] = useState<Tab>("pdf");
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      alert("Your study guide is being prepared! Head to the Library in a few moments.");
    }, 3000);
  };

  return (
    <>
      {/* Header & Stats */}
      <section className="mb-10">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="font-headline text-headline-lg text-on-surface mb-2">Create New Study Guide</h2>
            <p className="text-body-lg text-on-surface-variant max-w-2xl">Transform notes, PDFs, and YouTube lectures into summaries, flashcards, quizzes, study plans, and AI-powered learning resources.</p>
          </div>
          <div className="hidden lg:flex gap-4">
            <div className="glass-card px-4 py-3 rounded-2xl text-center min-w-[120px]">
              <p className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-1 font-label">Total Guides</p>
              <p className="font-headline text-headline-md text-primary">24</p>
            </div>
            <div className="glass-card px-4 py-3 rounded-2xl text-center min-w-[120px]">
              <p className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-1 font-label">Study Streak</p>
              <p className="font-headline text-headline-md text-secondary">7 Days</p>
            </div>
            <div className="glass-card px-4 py-3 rounded-2xl text-center min-w-[120px]">
              <p className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-1 font-label">Learning Hours</p>
              <p className="font-headline text-headline-md text-tertiary">48h</p>
            </div>
          </div>
        </div>

        {/* AI Workflow */}
        <div className="w-full bg-surface-container-low rounded-2xl p-6 border border-outline-variant/30 flex items-center justify-around relative overflow-hidden">
          {[
            { icon: "cloud_upload", label: "Upload", color: "bg-primary", active: true },
            { icon: "smart_toy", label: "Processing", color: "bg-secondary", active: true },
            { icon: "list_alt", label: "Topic Extraction", color: "bg-tertiary", active: false },
            { icon: "check_circle", label: "Completed", color: "bg-surface-container-highest", active: false },
          ].map((step, i, arr) => (
            <div key={step.label} className="flex items-center flex-1">
              <div className={`flex flex-col items-center gap-2 z-10 ${!step.active ? "opacity-50" : ""}`}>
                <div className={`w-12 h-12 rounded-full ${step.color} flex items-center justify-center ${step.active ? "text-white" : "text-on-surface-variant"}`}>
                  <span className="material-symbols-outlined">{step.icon}</span>
                </div>
                <span className="text-label-md font-medium font-label">{step.label}</span>
              </div>
              {i < arr.length - 1 && (
                <div className="flex-1 h-px bg-outline-variant mx-4 relative z-10">
                  {i === 0 && <div className="absolute inset-0 bg-primary w-full origin-left animate-pulse-gentle" />}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Two Column Grid */}
      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Left: Source Selection */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant shadow-sm">
            <h3 className="font-headline text-headline-md mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">source</span>
              Choose Your Learning Source
            </h3>

            {/* Tabs */}
            <div className="flex border-b border-outline-variant mb-8 overflow-x-auto">
              {(["pdf", "youtube", "notes"] as const).map(tab => (
                <button
                  key={tab}
                  className={`px-6 py-3 font-medium transition-all whitespace-nowrap ${activeTab === tab ? "text-primary border-b-2 border-primary" : "text-on-surface-variant hover:text-primary"}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === "pdf" ? "PDF Upload" : tab === "youtube" ? "YouTube Lecture" : "Notes Input"}
                </button>
              ))}
            </div>

            {/* PDF */}
            {activeTab === "pdf" && (
              <div className="space-y-6">
                <div className="border-2 border-dashed border-outline-variant rounded-2xl p-12 flex flex-col items-center justify-center bg-surface-container-low/30 hover:bg-surface-container-low/50 transition-colors cursor-pointer group">
                  <span className="material-symbols-outlined text-4xl text-outline mb-4 group-hover:scale-110 transition-transform">upload_file</span>
                  <p className="text-body-lg font-medium text-on-surface">Drag & drop your files here</p>
                  <p className="text-body-sm text-on-surface-variant mt-1">or <span className="text-primary font-semibold underline">browse files</span> from your computer</p>
                </div>
                <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/50">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-error">picture_as_pdf</span>
                      <span className="text-body-md font-medium">lecture_notes.pdf (2.4MB)</span>
                    </div>
                    <span className="text-label-md text-primary font-label">65%</span>
                  </div>
                  <div className="w-full bg-outline-variant/30 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-primary h-full w-[65%] rounded-full transition-all duration-500" />
                  </div>
                </div>
              </div>
            )}

            {/* YouTube */}
            {activeTab === "youtube" && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="block text-label-md font-semibold text-on-surface-variant font-label">YouTube Video URL</label>
                  <div className="flex gap-3">
                    <input className="flex-1 px-4 py-3 rounded-xl border border-outline-variant bg-surface focus:ring-2 focus:ring-primary outline-none font-body" placeholder="https://youtube.com/watch?v=..." type="text" />
                    <button className="px-6 py-3 bg-primary text-on-primary rounded-xl font-medium flex items-center gap-2 hover:opacity-90">
                      <span className="material-symbols-outlined">download</span>
                      Import Transcript
                    </button>
                  </div>
                </div>
                <div className="relative aspect-video rounded-2xl overflow-hidden group bg-gradient-to-br from-inverse-surface to-primary/90 flex items-center justify-center">
                  <div className="text-center text-white">
                    <span className="material-symbols-outlined text-6xl opacity-60 mb-2">smart_display</span>
                    <p className="font-medium opacity-80">Paste a YouTube URL to preview</p>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {activeTab === "notes" && (
              <div className="space-y-4">
                <label className="block text-label-md font-semibold text-on-surface-variant font-label">Enter Your Notes or Text Content</label>
                <div className="input-soft rounded-2xl p-6 border border-outline-variant">
                  <textarea className="w-full bg-transparent border-none focus:ring-0 min-h-[300px] text-body-md resize-none font-body outline-none" placeholder="Paste or type your study material here..." />
                  <div className="flex justify-end pt-4 border-t border-outline-variant/30 mt-4">
                    <p className="text-label-sm text-on-surface-variant font-label">0 words | 0 characters</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Preview Panel */}
          <div className="bg-surface-container p-8 rounded-3xl border border-outline-variant shadow-sm relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
            <h3 className="font-headline text-headline-md mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">visibility</span>
              Estimated Output
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: "segment", value: "12", label: "Topics Detected", color: "text-secondary" },
                { icon: "style", value: "40", label: "Flashcards", color: "text-primary" },
                { icon: "quiz", value: "15", label: "Quiz Questions", color: "text-tertiary" },
                { icon: "schedule", value: "3h", label: "Study Time", color: "text-secondary" },
              ].map(s => (
                <div key={s.label} className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 text-center">
                  <span className={`material-symbols-outlined ${s.color} mb-2`}>{s.icon}</span>
                  <p className="text-2xl font-bold text-on-surface">{s.value}</p>
                  <p className="text-label-sm text-on-surface-variant font-label">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Settings */}
        <div className="col-span-12 lg:col-span-4 lg:sticky lg:top-24">
          <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant shadow-sm">
            <h3 className="font-headline text-headline-md mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">settings_suggest</span>
              AI Learning Settings
            </h3>
            <div className="space-y-4">
              {settings.map(s => (
                <div key={s.label} className={`flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant/30 ${s.dimmed ? "opacity-70" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined ${s.iconColor}`}>{s.icon}</span>
                    <span className="font-medium">{s.label}</span>
                  </div>
                  <input defaultChecked={s.checked} className="w-5 h-5 text-primary rounded-md border-outline-variant focus:ring-primary" type="checkbox" />
                </div>
              ))}
            </div>
            <button
              className="w-full mt-8 py-5 bg-gradient-to-r from-primary to-secondary text-on-primary rounded-2xl font-bold text-body-lg shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 group"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <div className="flex items-center gap-3">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Processing Content...</span>
                </div>
              ) : (
                <>
                  <span>Generate Study Guide</span>
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                </>
              )}
            </button>
            <p className="text-center text-label-sm text-on-surface-variant mt-4 font-label">Estimated time: 2-3 minutes</p>
          </div>
        </div>
      </div>

      {/* Recently Created */}
      <section className="mt-16">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-headline text-headline-md">Recently Created Guides</h3>
          <Link to="/guides" className="text-primary font-medium hover:underline flex items-center gap-1">
            View Library
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recentGuides.map(g => (
            <div key={g.title} className="glass-card p-6 rounded-2xl flex items-center gap-4 hover:bg-surface-container-high/50 transition-colors cursor-pointer group">
              <div className={`w-16 h-16 rounded-xl bg-${g.color} flex items-center justify-center overflow-hidden`}>
                <span className="material-symbols-outlined text-2xl text-white/80">auto_stories</span>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-body-md group-hover:text-primary transition-colors">{g.title}</h4>
                <p className="text-body-sm text-on-surface-variant">{g.stats}</p>
              </div>
              <span className="material-symbols-outlined text-outline-variant group-hover:text-primary">chevron_right</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
