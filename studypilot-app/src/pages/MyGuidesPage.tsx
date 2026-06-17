import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { guideService } from "../services/guide.service";

export interface GuideListItem {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  sourceType: "pdf" | "youtube" | "notes" | "mixed";
  status: "processing" | "ready" | "failed";
  createdAt: string;
  _count: {
    flashcards: number;
    quizQuestions: number;
  };
}

export default function MyGuidesPage() {
  const [search, setSearch] = useState("");
  const [guidesList, setGuidesList] = useState<GuideListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGuides = async () => {
      try {
        setLoading(true);
        const data = await guideService.getAll();
        setGuidesList(data || []);
      } catch (err: any) {
        console.error(err);
        setError("Failed to load your study guides. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchGuides();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this guide?")) {
      try {
        await guideService.delete(id);
        setGuidesList(prev => prev.filter(g => g.id !== id));
      } catch (err) {
        console.error(err);
        alert("Failed to delete the study guide.");
      }
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "youtube": return "smart_display";
      case "notes": return "edit_note";
      case "mixed": return "layers";
      default: return "description";
    }
  };

  const getSubjectColor = (subject: string | null) => {
    if (!subject) return "primary";
    const sub = subject.toLowerCase();
    if (sub.includes("math") || sub.includes("calc")) return "secondary";
    if (sub.includes("art") || sub.includes("design")) return "error";
    if (sub.includes("science") || sub.includes("chem") || sub.includes("phys")) return "tertiary";
    if (sub.includes("business") || sub.includes("econ")) return "secondary-container";
    return "primary";
  };

  const filtered = guidesList.filter(g => g.title.toLowerCase().includes(search.toLowerCase()));

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
      {loading ? (
        <div className="flex-grow flex items-center justify-center py-24">
          <span className="material-symbols-outlined animate-spin text-primary text-5xl">progress_activity</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-3xl border border-red-200/50 text-center my-12">
          <p className="font-medium">{error}</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((g) => {
            const isCompleted = g.status === "ready";
            const progress = g.status === "ready" ? 100 : g.status === "failed" ? 0 : 30;
            const subjectColor = getSubjectColor(g.subject);
            
            return (
              <div key={g.id} className={`glass-card glass-card-hover rounded-3xl p-6 flex flex-col ${isCompleted ? "border-primary/20 bg-primary/5" : ""}`}>
                {/* Tag + Delete */}
                <div className="flex justify-between items-start mb-4">
                  <span className={`bg-${subjectColor}/10 text-${subjectColor} px-3 py-1 rounded-full text-label-sm font-label`}>
                    {g.subject || "General"}
                  </span>
                  <button 
                    onClick={() => handleDelete(g.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors text-on-surface-variant"
                    title="Delete Guide"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>

                {/* Title & Source */}
                <h3 className="font-headline text-headline-md mb-1">{g.title}</h3>
                <div className="flex items-center gap-2 mb-6">
                  <span className="material-symbols-outlined text-sm text-secondary">{getSourceIcon(g.sourceType)}</span>
                  <span className="text-label-sm text-on-surface-variant font-label">Source: {g.sourceType.toUpperCase()}</span>
                </div>

                {/* Stats */}
                <div className="space-y-4 mb-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-label-sm font-bold font-label">Status</span>
                      <span className="text-label-sm font-bold text-primary font-label uppercase text-[11px]">
                        {g.status}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${
                          g.status === "failed" ? "bg-red-500" : g.status === "ready" ? "bg-primary" : "bg-amber-500 animate-pulse"
                        }`}
                        style={{ width: `${progress}%` }} 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/40 p-3 rounded-2xl">
                      <p className="text-label-sm text-on-surface-variant mb-1 font-label">Flashcards</p>
                      <p className="font-headline text-headline-md">{g._count.flashcards}</p>
                    </div>
                    <div className="bg-white/40 p-3 rounded-2xl">
                      <p className="text-label-sm text-on-surface-variant mb-1 font-label">Quizzes</p>
                      <p className="font-headline text-headline-md">{g._count.quizQuestions}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">
                      {isCompleted ? "verified" : g.status === "failed" ? "error" : "schedule"}
                    </span>
                    <span className="text-label-sm font-medium font-label">
                      {isCompleted ? "Ready for Study" : g.status === "failed" ? "Failed to generate" : "AI is generating guide..."}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-auto pt-6 border-t border-outline-variant/20 flex flex-col gap-3">
                  <div className="flex justify-between text-label-sm text-on-surface-variant opacity-60 mb-2 font-label">
                    <span>Created {new Date(g.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      disabled={g.status === "processing"}
                      className={`flex-1 ${isCompleted ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface opacity-50 cursor-not-allowed"} py-2.5 rounded-xl font-label text-label-md hover:brightness-110 transition-all flex items-center justify-center gap-2`}
                    >
                      <span className="material-symbols-outlined text-base">play_arrow</span>
                      Study Guide
                    </button>
                    <button className="p-2.5 border border-outline-variant rounded-xl hover:bg-white transition-all text-on-surface-variant" title="Export PDF">
                      <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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
