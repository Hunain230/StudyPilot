import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { guideService } from "../services/guide.service";
import { uploadService } from "../services/upload.service";

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
  { label: "Quiz", icon: "quiz", iconColor: "text-tertiary", checked: true },
  { label: "Mind Map", icon: "account_tree", iconColor: "text-on-surface-variant", checked: false, dimmed: true },
  { label: "Study Plan", icon: "calendar_month", iconColor: "text-primary", checked: true },
  { label: "Revision Sheet", icon: "description", iconColor: "text-secondary", checked: false },
  { label: "AI Doubt Solver", icon: "psychology", iconColor: "text-tertiary", checked: true },
];

export default function CreateGuidePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("pdf");
  const [generating, setGenerating] = useState(false);

  // Guide Metadata
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  
  // Sources
  const [notesText, setNotesText] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      setError("Please provide a Guide Title.");
      return;
    }
    if (activeTab === "pdf" && !selectedFile) {
      setError("Please upload a PDF or image file.");
      return;
    }
    if (activeTab === "youtube" && !youtubeUrl) {
      setError("Please provide a YouTube video URL.");
      return;
    }
    if (activeTab === "notes" && !notesText) {
      setError("Please enter notes or text study material.");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      // 1. Create the guide in processing state
      const guide = await guideService.create({
        title,
        description,
        subject,
        sourceType: activeTab,
        notesText: activeTab === "notes" ? notesText : undefined,
        youtubeUrl: activeTab === "youtube" ? youtubeUrl : undefined,
      });

      // 2. If it's a PDF upload, upload the file
      if (activeTab === "pdf" && selectedFile) {
        setUploadProgress(10);
        // Simulate upload progress
        const interval = setInterval(() => {
          setUploadProgress((p) => (p < 80 ? p + 15 : p));
        }, 300);

        try {
          await uploadService.uploadFile(selectedFile, guide.id);
          setUploadProgress(100);
          clearInterval(interval);
        } catch (uploadErr) {
          clearInterval(interval);
          throw uploadErr;
        }
      }

      // Simulate AI Processing time briefly for UX, then redirect
      setTimeout(() => {
        setGenerating(false);
        navigate("/guides");
      }, 1000);

    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to create study guide. Please try again.");
      setGenerating(false);
    }
  };

  return (
    <form onSubmit={handleGenerate}>
      {/* Header & Stats */}
      <section className="mb-10">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="font-headline text-headline-lg text-on-surface mb-2">Create New Study Guide</h2>
            <p className="text-body-lg text-on-surface-variant max-w-2xl font-body">Transform notes, PDFs, and YouTube lectures into summaries, flashcards, quizzes, study plans, and AI-powered learning resources.</p>
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
            { icon: "smart_toy", label: "Processing", color: "bg-secondary", active: generating },
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
                  {i === 0 && generating && <div className="absolute inset-0 bg-primary w-full origin-left animate-pulse-gentle" />}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-200/50 mb-6 font-body font-medium">
          {error}
        </div>
      )}

      {/* Two Column Grid */}
      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Left: Metadata & Source Selection */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          
          {/* Metadata Card */}
          <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant shadow-sm space-y-4">
            <h3 className="font-headline text-headline-md mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">edit_document</span>
              Guide Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-label text-label-md text-on-surface-variant block ml-1" htmlFor="guide-title">Guide Title *</label>
                <input 
                  className="input-soft w-full px-4 py-3 rounded-xl border border-outline-variant bg-[#F1F5F9] focus:bg-white focus:border-primary border-2 outline-none font-body text-on-surface"
                  id="guide-title"
                  placeholder="e.g. Database Systems Exam Prep"
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="font-label text-label-md text-on-surface-variant block ml-1" htmlFor="guide-subject">Subject</label>
                <input 
                  className="input-soft w-full px-4 py-3 rounded-xl border border-outline-variant bg-[#F1F5F9] focus:bg-white focus:border-primary border-2 outline-none font-body text-on-surface"
                  id="guide-subject"
                  placeholder="e.g. Computer Science"
                  type="text" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="font-label text-label-md text-on-surface-variant block ml-1" htmlFor="guide-desc">Description</label>
              <input 
                className="input-soft w-full px-4 py-3 rounded-xl border border-outline-variant bg-[#F1F5F9] focus:bg-white focus:border-primary border-2 outline-none font-body text-on-surface"
                id="guide-desc"
                placeholder="e.g. Chapters 1-5 notes and study questions"
                type="text" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Sources Card */}
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
                  type="button"
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
                <label className="border-2 border-dashed border-outline-variant rounded-2xl p-12 flex flex-col items-center justify-center bg-surface-container-low/30 hover:bg-surface-container-low/50 transition-colors cursor-pointer group">
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    accept="application/pdf,image/*"
                  />
                  <span className="material-symbols-outlined text-4xl text-outline mb-4 group-hover:scale-110 transition-transform">upload_file</span>
                  <p className="text-body-lg font-medium text-on-surface">
                    {selectedFile ? selectedFile.name : "Drag & drop your files here"}
                  </p>
                  <p className="text-body-sm text-on-surface-variant mt-1">
                    {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : "or browse files from your computer"}
                  </p>
                </label>
                {selectedFile && uploadProgress > 0 && (
                  <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/50">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-error">picture_as_pdf</span>
                        <span className="text-body-md font-medium font-body">{selectedFile.name}</span>
                      </div>
                      <span className="text-label-md text-primary font-label">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-outline-variant/30 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-primary h-full rounded-full transition-all duration-500" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* YouTube */}
            {activeTab === "youtube" && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="block text-label-md font-semibold text-on-surface-variant font-label">YouTube Video URL</label>
                  <div className="flex gap-3">
                    <input 
                      className="flex-1 px-4 py-3 rounded-xl border border-outline-variant bg-[#F1F5F9] focus:bg-white focus:border-primary border-2 outline-none font-body text-on-surface" 
                      placeholder="https://youtube.com/watch?v=..." 
                      type="text" 
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                    />
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
                <div className="input-soft rounded-2xl p-6 border-2 border-outline-variant bg-[#F1F5F9] focus-within:bg-white focus-within:border-primary">
                  <textarea 
                    className="w-full bg-transparent border-none min-h-[300px] text-body-md resize-none font-body outline-none text-on-surface" 
                    placeholder="Paste or type your study material here..." 
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                  />
                  <div className="flex justify-end pt-4 border-t border-outline-variant/30 mt-4">
                    <p className="text-label-sm text-on-surface-variant font-label">
                      {notesText.split(/\s+/).filter(Boolean).length} words | {notesText.length} characters
                    </p>
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
                { icon: "segment", value: activeTab === "notes" ? "8" : "12", label: "Topics Detected", color: "text-secondary" },
                { icon: "style", value: activeTab === "notes" ? "25" : "40", label: "Flashcards", color: "text-primary" },
                { icon: "quiz", value: activeTab === "notes" ? "10" : "15", label: "Quiz Questions", color: "text-tertiary" },
                { icon: "schedule", value: activeTab === "notes" ? "2h" : "3h", label: "Study Time", color: "text-secondary" },
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
                    <span className="font-medium font-body">{s.label}</span>
                  </div>
                  <input defaultChecked={s.checked} className="w-5 h-5 text-primary rounded-md border-outline-variant focus:ring-primary" type="checkbox" disabled={s.dimmed} />
                </div>
              ))}
            </div>
            <button
              type="submit"
              className="w-full mt-8 py-5 bg-gradient-to-r from-primary to-secondary text-on-primary rounded-2xl font-bold text-body-lg shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 group"
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
                <p className="text-body-sm text-on-surface-variant font-body">{g.stats}</p>
              </div>
              <span className="material-symbols-outlined text-outline-variant group-hover:text-primary">chevron_right</span>
            </div>
          ))}
        </div>
      </section>
    </form>
  );
}
