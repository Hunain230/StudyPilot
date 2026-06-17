import { Link } from "react-router-dom";
import { useState } from "react";

const guides = [
  { title: "Database Systems", subject: "Computer Science", subjectColor: "primary", source: "PDF", sourceIcon: "description", progress: 85, flashcards: 42, quizzes: 5, weakTopics: 2, weakColor: "error", created: "2d ago", lastOpened: "1h ago", completed: false },
  { title: "Calculus II", subject: "Math", subjectColor: "secondary", source: "YouTube", sourceIcon: "smart_display", progress: 45, flashcards: 28, quizzes: 3, weakTopics: 7, weakColor: "error", created: "1w ago", lastOpened: "5h ago", completed: false },
  { title: "Artificial Intelligence", subject: "CS", subjectColor: "primary", source: "Notes", sourceIcon: "edit_note", progress: 92, flashcards: 60, quizzes: 10, weakTopics: 1, weakColor: "primary", created: "3d ago", lastOpened: "30m ago", completed: false },
  { title: "Organic Chemistry", subject: "Science", subjectColor: "tertiary", source: "PDF", sourceIcon: "description", progress: 30, flashcards: 15, quizzes: 2, weakTopics: 12, weakColor: "error", created: "5d ago", lastOpened: "Yesterday", completed: false },
  { title: "Microeconomics", subject: "Business", subjectColor: "secondary-container", source: "YouTube", sourceIcon: "smart_display", progress: 68, flashcards: 35, quizzes: 4, weakTopics: 4, weakColor: "on-surface-variant", created: "4d ago", lastOpened: "2h ago", completed: false },
  { title: "Modern Art", subject: "Arts", subjectColor: "error", source: "Notes", sourceIcon: "edit_note", progress: 100, flashcards: 20, quizzes: 8, weakTopics: 0, weakColor: "green-600", created: "2w ago", lastOpened: "3d ago", completed: true },
];

export default function MyGuidesPage() {
  const [search, setSearch] = useState("");

  const filtered = guides.filter(g => g.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      {/* Header */}
      <header className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-headline text-headline-lg font-bold text-on-surface">My Guides</h2>
            <p className="font-body text-body-sm text-on-surface-variant">Manage and track your AI-generated study materials</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-full hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined text-primary">local_fire_department</span>
            </button>
            <Link
              to="/guides/new"
              className="bg-primary text-on-primary px-6 py-2 rounded-full font-label text-label-md hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">add</span>
              Create New
            </Link>
          </div>
        </div>
      </header>

      {/* Search & Filters */}
      <section className="mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96 group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">search</span>
            <input
              className="w-full bg-[#F1F5F9] focus:bg-white border-transparent focus:border-primary border-2 rounded-2xl py-3 pl-12 pr-4 outline-none transition-all font-body"
              placeholder="Search your guides..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <select className="bg-white border border-outline-variant rounded-xl px-4 py-2 text-label-md font-label outline-none focus:ring-2 focus:ring-primary/20">
              <option>All Subjects</option>
              <option>Computer Science</option>
              <option>Mathematics</option>
              <option>Science</option>
              <option>Business</option>
            </select>
            <select className="bg-white border border-outline-variant rounded-xl px-4 py-2 text-label-md font-label outline-none focus:ring-2 focus:ring-primary/20">
              <option>Sort: Newest</option>
              <option>Sort: Progress</option>
              <option>Sort: Subject</option>
              <option>Sort: Oldest</option>
            </select>
          </div>
        </div>
      </section>

      {/* Guide Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((g) => (
            <div key={g.title} className={`glass-card glass-card-hover rounded-3xl p-6 flex flex-col ${g.completed ? "border-primary/20 bg-primary/5" : ""}`}>
              {/* Tag + Menu */}
              <div className="flex justify-between items-start mb-4">
                <span className={`bg-${g.subjectColor}/10 text-${g.subjectColor} px-3 py-1 rounded-full text-label-sm font-label`}>{g.subject}</span>
                <button className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant">
                  <span className="material-symbols-outlined text-lg">more_vert</span>
                </button>
              </div>

              {/* Title & Source */}
              <h3 className="font-headline text-headline-md mb-1">{g.title}</h3>
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-sm text-secondary">{g.sourceIcon}</span>
                <span className="text-label-sm text-on-surface-variant font-label">Source: {g.source}</span>
              </div>

              {/* Stats */}
              <div className="space-y-4 mb-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-label-sm font-bold font-label">Progress</span>
                    <span className="text-label-sm font-bold text-primary font-label">{g.progress}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${g.progress}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/40 p-3 rounded-2xl">
                    <p className="text-label-sm text-on-surface-variant mb-1 font-label">Flashcards</p>
                    <p className="font-headline text-headline-md">{g.flashcards}</p>
                  </div>
                  <div className="bg-white/40 p-3 rounded-2xl">
                    <p className="text-label-sm text-on-surface-variant mb-1 font-label">Quizzes</p>
                    <p className="font-headline text-headline-md">{g.quizzes}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 text-${g.weakColor}`}>
                  <span className="material-symbols-outlined text-lg" style={g.completed ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                    {g.completed ? "verified" : g.weakTopics <= 1 ? "check_circle" : "warning"}
                  </span>
                  <span className="text-label-sm font-medium font-label">
                    {g.completed ? "Fully Mastered" : `${g.weakTopics} Weak Topic${g.weakTopics !== 1 ? "s" : ""} ${g.weakTopics <= 1 ? "Left" : "Identified"}`}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-auto pt-6 border-t border-outline-variant/20 flex flex-col gap-3">
                <div className="flex justify-between text-label-sm text-on-surface-variant opacity-60 mb-2 font-label">
                  <span>Created {g.created}</span>
                  <span>Last opened {g.lastOpened}</span>
                </div>
                <div className="flex gap-2">
                  <button className={`flex-1 ${g.completed ? "bg-surface-container-high text-on-surface" : "bg-primary text-on-primary"} py-2.5 rounded-xl font-label text-label-md hover:brightness-110 transition-all flex items-center justify-center gap-2`}>
                    <span className="material-symbols-outlined text-base">{g.completed ? "refresh" : "play_arrow"}</span>
                    {g.completed ? "Review" : "Continue"}
                  </button>
                  <button className="p-2.5 border border-outline-variant rounded-xl hover:bg-white transition-all text-on-surface-variant" title="Export PDF">
                    <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-24">
          <div className="w-24 h-24 bg-surface-container rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant opacity-30">library_books</span>
          </div>
          <h3 className="font-headline text-headline-lg mb-2">No study guides found</h3>
          <p className="text-body-md text-on-surface-variant max-w-md mb-8">Try a different search or upload notes, PDFs, or YouTube lectures to create your first guide.</p>
          <Link to="/guides/new" className="bg-primary text-on-primary px-8 py-3 rounded-2xl font-label text-label-md hover:shadow-lg transition-all flex items-center gap-3">
            <span className="material-symbols-outlined">add_circle</span>
            Create New Guide
          </Link>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 pt-8 border-t border-outline-variant/20 flex justify-between items-center text-on-surface-variant">
        <p className="text-label-sm font-label">© 2024 ScholarStudy Academic Engine</p>
        <div className="flex gap-4">
          <a className="text-label-sm hover:text-primary transition-colors font-label" href="#">Privacy</a>
          <a className="text-label-sm hover:text-primary transition-colors font-label" href="#">Terms</a>
        </div>
      </footer>
    </>
  );
}
