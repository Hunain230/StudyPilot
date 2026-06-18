import { useState, useEffect } from "react";
import { resourceService } from "../services/resource.service";
import type { Resource, AISuggestion } from "../services/resource.service";
import { guideService } from "../services/guide.service";

const RESOURCE_TYPES = ["ALL", "VIDEO", "ARTICLE", "PAPER", "BOOK", "COURSE", "TOOL", "OTHER"] as const;

const typeIcons: Record<string, string> = {
  VIDEO: "smart_display",
  ARTICLE: "article",
  PAPER: "science",
  BOOK: "menu_book",
  COURSE: "school",
  TOOL: "build",
  OTHER: "category",
};

const typeColors: Record<string, string> = {
  VIDEO: "text-red-500 bg-red-50",
  ARTICLE: "text-blue-600 bg-blue-50",
  PAPER: "text-purple-600 bg-purple-50",
  BOOK: "text-amber-600 bg-amber-50",
  COURSE: "text-emerald-600 bg-emerald-50",
  TOOL: "text-cyan-600 bg-cyan-50",
  OTHER: "text-slate-500 bg-slate-50",
};

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [guides, setGuides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("ALL");

  // Add Resource form
  const [showAddForm, setShowAddForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formType, setFormType] = useState("ARTICLE");
  const [formTopic, setFormTopic] = useState("");
  const [formGuideId, setFormGuideId] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // AI Suggest
  const [suggestTopic, setSuggestTopic] = useState("");
  const [suggestType, setSuggestType] = useState("ALL");
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [resourcesData, guidesData] = await Promise.all([
          resourceService.getAll(),
          guideService.getAll(),
        ]);
        setResources(resourcesData);
        setGuides(guidesData || []);
      } catch (err: any) {
        console.error(err);
        setError("Failed to load resources.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    setSaving(true);
    try {
      const newResource = await resourceService.create({
        title: formTitle,
        url: formUrl || undefined,
        type: formType,
        topic: formTopic || undefined,
        guideId: formGuideId || undefined,
        notes: formNotes || undefined,
      });
      setResources((prev) => [newResource, ...prev]);
      setShowAddForm(false);
      setFormTitle(""); setFormUrl(""); setFormType("ARTICLE"); setFormTopic(""); setFormGuideId(""); setFormNotes("");
    } catch (err: any) {
      console.error(err);
      alert("Failed to save resource.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this resource?")) return;
    try {
      await resourceService.delete(id);
      setResources((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete resource.");
    }
  };

  const handleSuggest = async () => {
    if (!suggestTopic.trim()) return;
    setSuggesting(true);
    setSuggestError(null);
    setSuggestions([]);
    try {
      const result = await resourceService.suggest(suggestTopic, undefined, suggestType);
      setSuggestions(result.suggestions);
    } catch (err: any) {
      console.error(err);
      setSuggestError(err.response?.data?.error?.message || "Failed to get AI suggestions. Try again.");
    } finally {
      setSuggesting(false);
    }
  };

  const handleSaveSuggestion = async (s: AISuggestion) => {
    try {
      const newResource = await resourceService.create({
        title: s.title,
        url: s.url,
        type: s.type,
        topic: suggestTopic,
        notes: s.reason,
      });
      setResources((prev) => [newResource, ...prev]);
    } catch (err) {
      console.error(err);
      alert("Failed to save suggestion.");
    }
  };

  const filtered = activeFilter === "ALL" ? resources : resources.filter((r) => r.type === activeFilter);

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
      <header className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="font-headline text-headline-lg font-bold text-on-surface">Resources</h2>
            <p className="font-body text-body-sm text-on-surface-variant">
              Save bookmarks, articles, videos, and get AI-recommended learning materials.
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-label text-label-md hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-primary/10 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-base">{showAddForm ? "close" : "add"}</span>
            {showAddForm ? "Cancel" : "Add Resource"}
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-200/50 mb-6 font-body font-medium">{error}</div>
      )}

      {/* Add Resource Form */}
      {showAddForm && (
        <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant shadow-sm mb-8 animate-in">
          <h3 className="font-headline text-headline-md mb-6 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">bookmark_add</span>
            Save a Resource
          </h3>
          <form onSubmit={handleAddResource} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-label text-label-md text-on-surface-variant block ml-1">Title *</label>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-[#F1F5F9] focus:bg-white focus:border-primary border-2 outline-none font-body text-on-surface"
                  placeholder="e.g. React Hooks Guide"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="font-label text-label-md text-on-surface-variant block ml-1">URL</label>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-[#F1F5F9] focus:bg-white focus:border-primary border-2 outline-none font-body text-on-surface"
                  placeholder="https://..."
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="font-label text-label-md text-on-surface-variant block ml-1">Type</label>
                <select
                  className="w-full bg-[#F1F5F9] border-transparent focus:border-primary border-2 rounded-xl py-3 px-4 outline-none font-body"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                >
                  {RESOURCE_TYPES.filter((t) => t !== "ALL").map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="font-label text-label-md text-on-surface-variant block ml-1">Topic</label>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-[#F1F5F9] focus:bg-white focus:border-primary border-2 outline-none font-body text-on-surface"
                  placeholder="e.g. React, SQL, Physics"
                  value={formTopic}
                  onChange={(e) => setFormTopic(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="font-label text-label-md text-on-surface-variant block ml-1">Link to Guide</label>
                <select
                  className="w-full bg-[#F1F5F9] border-transparent focus:border-primary border-2 rounded-xl py-3 px-4 outline-none font-body"
                  value={formGuideId}
                  onChange={(e) => setFormGuideId(e.target.value)}
                >
                  <option value="">None</option>
                  {guides.map((g: any) => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="font-label text-label-md text-on-surface-variant block ml-1">Notes</label>
              <textarea
                className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-[#F1F5F9] focus:bg-white focus:border-primary border-2 outline-none font-body text-on-surface resize-none min-h-[80px]"
                placeholder="Why is this resource useful?"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={saving || !formTitle.trim()}
              className="bg-primary text-on-primary px-8 py-3 rounded-xl font-label text-label-md font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">save</span>
                  Save Resource
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Left: Resources List */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {RESOURCE_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setActiveFilter(t)}
                className={`px-4 py-2 rounded-full text-label-sm font-label font-medium transition-all ${
                  activeFilter === t
                    ? "bg-primary text-on-primary shadow-sm"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {t === "ALL" ? "All" : t.charAt(0) + t.slice(1).toLowerCase()}
                {t === "ALL" ? ` (${resources.length})` : ` (${resources.filter((r) => r.type === t).length})`}
              </button>
            ))}
          </div>

          {/* Resource Cards */}
          {filtered.length > 0 ? (
            <div className="space-y-4">
              {filtered.map((r) => {
                const colorClass = typeColors[r.type] || typeColors.OTHER;
                const icon = typeIcons[r.type] || typeIcons.OTHER;
                return (
                  <div key={r.id} className="glass-card glass-card-hover rounded-2xl p-5 flex items-start gap-4 group">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-headline text-body-lg font-bold text-on-surface truncate">{r.title}</h4>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-label ${colorClass}`}>
                          {r.type}
                        </span>
                      </div>
                      {r.url && (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary text-body-sm hover:underline truncate block max-w-md"
                        >
                          {r.url}
                        </a>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-on-surface-variant text-body-sm">
                        {r.topic && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">tag</span>
                            {r.topic}
                          </span>
                        )}
                        {r.guideTitle && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">auto_stories</span>
                            {r.guideTitle}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">schedule</span>
                          {new Date(r.savedAt).toLocaleDateString()}
                        </span>
                      </div>
                      {r.notes && (
                        <p className="text-body-sm text-on-surface-variant mt-2 line-clamp-2 bg-slate-50 px-3 py-2 rounded-lg">{r.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {r.url && (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                          title="Open Link"
                        >
                          <span className="material-symbols-outlined text-lg">open_in_new</span>
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-on-surface-variant hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-16 glass-card rounded-3xl">
              <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant opacity-30">library_books</span>
              </div>
              <h3 className="font-headline text-headline-md font-bold mb-2">
                {activeFilter === "ALL" ? "No resources saved yet" : `No ${activeFilter.toLowerCase()} resources`}
              </h3>
              <p className="text-body-md text-on-surface-variant max-w-sm mb-6">
                Save articles, videos, papers, and tools to build your study library. Use AI to discover resources for any topic.
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-primary text-on-primary px-6 py-2.5 rounded-xl font-label text-label-md hover:opacity-90 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base">add</span>
                Add Your First Resource
              </button>
            </div>
          )}
        </div>

        {/* Right: AI Suggest Panel */}
        <div className="col-span-12 lg:col-span-4 lg:sticky lg:top-24 space-y-6">
          {/* AI Suggest Card */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant shadow-sm space-y-4">
            <h3 className="font-headline text-headline-md font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              AI Resource Finder
            </h3>
            <p className="text-body-sm text-on-surface-variant">
              Enter a topic and our AI will find high-quality learning resources for you.
            </p>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="font-label text-label-sm text-on-surface-variant block ml-1">Topic *</label>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-[#F1F5F9] focus:bg-white focus:border-primary border-2 outline-none font-body text-on-surface"
                  placeholder="e.g. Binary Trees, SQL Joins..."
                  value={suggestTopic}
                  onChange={(e) => setSuggestTopic(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="font-label text-label-sm text-on-surface-variant block ml-1">Resource Type</label>
                <select
                  className="w-full bg-[#F1F5F9] border-transparent focus:border-primary border-2 rounded-xl py-2.5 px-4 outline-none font-body text-body-sm text-on-surface capitalize"
                  value={suggestType}
                  onChange={(e) => setSuggestType(e.target.value)}
                >
                  <option value="ALL">All Types</option>
                  <option value="VIDEO">Videos</option>
                  <option value="BOOK">Books</option>
                  <option value="ARTICLE">Articles</option>
                  <option value="TOOL">Tools</option>
                  <option value="COURSE">Courses</option>
                  <option value="PAPER">Papers</option>
                  <option value="OTHER">Others</option>
                </select>
              </div>

              <button
                onClick={handleSuggest}
                disabled={suggesting || !suggestTopic.trim()}
                className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-on-primary rounded-xl font-label text-label-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {suggesting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Finding Resources...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">psychology</span>
                    Find Resources
                  </>
                )}
              </button>
            </div>

            {suggestError && (
              <p className="text-body-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-200/50">{suggestError}</p>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-outline-variant/30">
                <p className="text-label-sm font-bold text-on-surface-variant font-label uppercase tracking-wider">
                  AI Suggestions for "{suggestTopic}"
                </p>
                {suggestions.map((s, i) => {
                  const colorClass = typeColors[s.type] || typeColors.OTHER;
                  const icon = typeIcons[s.type] || typeIcons.OTHER;
                  return (
                    <div key={i} className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30 space-y-2">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                          <span className="material-symbols-outlined text-base">{icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-body-sm font-bold text-on-surface">{s.title}</h5>
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary text-[11px] hover:underline truncate block"
                          >
                            {s.url}
                          </a>
                        </div>
                      </div>
                      <p className="text-[11px] text-on-surface-variant">{s.reason}</p>
                      <button
                        onClick={() => handleSaveSuggestion(s)}
                        className="text-primary text-label-sm font-bold font-label hover:underline flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">bookmark_add</span>
                        Save to Library
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stats Summary */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant shadow-sm">
            <h3 className="font-headline text-headline-sm font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">insights</span>
              Library Stats
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(typeIcons).map(([type, icon]) => {
                const count = resources.filter((r) => r.type === type).length;
                if (count === 0) return null;
                const colorClass = typeColors[type] || typeColors.OTHER;
                return (
                  <div key={type} className="flex items-center gap-2 p-2 rounded-lg">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
                      <span className="material-symbols-outlined text-sm">{icon}</span>
                    </div>
                    <div>
                      <p className="text-headline-sm font-bold text-on-surface font-headline">{count}</p>
                      <p className="text-[10px] text-on-surface-variant font-label uppercase tracking-wider">{type}</p>
                    </div>
                  </div>
                );
              })}
              {resources.length === 0 && (
                <p className="col-span-2 text-body-sm text-on-surface-variant text-center py-4">No resources saved yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
