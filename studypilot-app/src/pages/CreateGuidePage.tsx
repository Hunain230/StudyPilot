import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { guideService } from "../services/guide.service";
import { uploadService } from "../services/upload.service";
import { analyticsService } from "../services/analytics.service";
import { useStreak } from "../hooks/useStreak";

const tabs = ["pdf", "youtube", "notes"] as const;
type Tab = typeof tabs[number];

type ComponentKey = "summary" | "flashcards" | "quiz" | "mindMap" | "studyPlan" | "revisionSheet";

const COMPONENT_SETTINGS: { key: ComponentKey; label: string; icon: string; iconColor: string; defaultChecked: boolean }[] = [
  { key: "summary",      label: "Summary",        icon: "summarize",    iconColor: "text-primary",   defaultChecked: true  },
  { key: "flashcards",   label: "Flashcards",     icon: "style",        iconColor: "text-secondary", defaultChecked: true  },
  { key: "quiz",         label: "Quiz",            icon: "quiz",         iconColor: "text-tertiary",  defaultChecked: true  },
  { key: "mindMap",      label: "Mind Map",        icon: "account_tree", iconColor: "text-primary",   defaultChecked: false },
  { key: "studyPlan",    label: "Study Plan",      icon: "calendar_month", iconColor: "text-secondary", defaultChecked: false },
  { key: "revisionSheet",label: "Revision Sheet",  icon: "description",  iconColor: "text-tertiary",  defaultChecked: false },
];

type StepState = "idle" | "active" | "done" | "error";

interface StepperStep {
  icon: string;
  label: string;
  color: string;
  state: StepState;
}

export default function CreateGuidePage() {
  const navigate = useNavigate();
  const streak = useStreak();
  const pollRef = useRef<number | null>(null);

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

  // Component selection
  const [selectedComponents, setSelectedComponents] = useState<ComponentKey[]>(
    COMPONENT_SETTINGS.filter(s => s.defaultChecked).map(s => s.key)
  );

  // Stepper state
  const [steps, setSteps] = useState<StepperStep[]>([
    { icon: "cloud_upload", label: "Upload",          color: "bg-primary",   state: "active" },
    { icon: "smart_toy",    label: "Processing",      color: "bg-secondary", state: "idle"   },
    { icon: "list_alt",     label: "Topic Extraction",color: "bg-tertiary",  state: "idle"   },
    { icon: "check_circle", label: "Completed",       color: "bg-surface-container-highest", state: "idle" },
  ]);

  // Header stats
  const [totalGuides, setTotalGuides] = useState<number | null>(null);
  const [learningHours, setLearningHours] = useState<number | null>(null);
  const [recentGuides, setRecentGuides] = useState<any[]>([]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [guides, overview] = await Promise.all([
          guideService.getAll(),
          analyticsService.getOverview().catch(() => null),
        ]);
        setTotalGuides((guides || []).length);
        setRecentGuides((guides || []).slice(0, 3));
        if (overview) {
          setLearningHours(Math.round((overview.totalStudyMinutes || 0) / 60));
        }
      } catch {
        // Silently ignore stat load failures
      }
    };
    loadStats();
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const setStepState = (index: number, state: StepState) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, state } : s));
  };

  const toggleComponent = (key: ComponentKey) => {
    setSelectedComponents(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const startPolling = (guideId: string) => {
    let processingActivated = false;

    pollRef.current = window.setInterval(async () => {
      try {
        const { status } = await guideService.getStatus(guideId);

        if (status === "processing" && !processingActivated) {
          processingActivated = true;
          setStepState(1, "active");
          setTimeout(() => setStepState(2, "active"), 5000);
        }

        if (status === "ready") {
          clearInterval(pollRef.current!);
          // Mark all steps done
          setSteps(prev => prev.map((s, i) => ({
            ...s,
            state: i < 3 ? "done" : "done",
          })));
          setStepState(3, "done");
          setGenerating(false);
          // Brief pause before redirect
          setTimeout(() => navigate(`/guides/${guideId}`), 1800);
        }

        if (status === "failed") {
          clearInterval(pollRef.current!);
          setStepState(1, "error");
          setError("AI generation failed. Please try again with different content.");
          setGenerating(false);
        }
      } catch {
        // Poll silently on network errors
      }
    }, 2500);
  };

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
    if (selectedComponents.length === 0) {
      setError("Please select at least one component to generate.");
      return;
    }

    setGenerating(true);
    setError(null);
    setUploadProgress(0);

    // Reset stepper
    setSteps([
      { icon: "cloud_upload", label: "Upload",          color: "bg-primary",   state: "active" },
      { icon: "smart_toy",    label: "Processing",      color: "bg-secondary", state: "idle"   },
      { icon: "list_alt",     label: "Topic Extraction",color: "bg-tertiary",  state: "idle"   },
      { icon: "check_circle", label: "Completed",       color: "bg-surface-container-highest", state: "idle" },
    ]);

    try {
      // 1. Create the guide record in processing state
      const guide = await guideService.create({
        title,
        description,
        subject,
        sourceType: activeTab,
        notesText: activeTab === "notes" ? notesText : undefined,
        youtubeUrl: activeTab === "youtube" ? youtubeUrl : undefined,
        selectedComponents,
      });

      // 2. If PDF, upload the file with real progress tracking
      if (activeTab === "pdf" && selectedFile) {
        await uploadService.uploadFile(
          selectedFile,
          guide.id,
          selectedComponents,
          (percent) => setUploadProgress(percent)
        );
        setUploadProgress(100);
        setStepState(0, "done");
      } else {
        // For notes/youtube, upload step is instant
        setStepState(0, "done");
      }

      // 3. Start polling for status
      startPolling(guide.id);

    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error?.message || err.response?.data?.message || "Failed to create study guide. Please try again.");
      setGenerating(false);
      setStepState(0, "error");
    }
  };

  const getStepClass = (state: StepState, color: string) => {
    if (state === "done") return "bg-green-500";
    if (state === "error") return "bg-red-500";
    if (state === "active") return color;
    return "bg-surface-container-highest";
  };

  const getStepIcon = (step: StepperStep) => {
    if (step.state === "done") return "check_circle";
    if (step.state === "error") return "error";
    return step.icon;
  };

  const getConnectorClass = (leftState: StepState) => {
    if (leftState === "done") return "bg-green-400";
    if (leftState === "active") return "bg-primary/60 animate-pulse";
    return "bg-outline-variant";
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
              <p className="font-headline text-headline-md text-primary">
                {totalGuides !== null ? (totalGuides === 0 ? "—" : totalGuides) : <span className="animate-pulse">—</span>}
              </p>
            </div>
            <div className="glass-card px-4 py-3 rounded-2xl text-center min-w-[120px]">
              <p className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-1 font-label">Study Streak</p>
              <p className="font-headline text-headline-md text-secondary">
                {streak.current === 0 ? "—" : `${streak.current} Day${streak.current !== 1 ? "s" : ""}`}
              </p>
            </div>
            <div className="glass-card px-4 py-3 rounded-2xl text-center min-w-[120px]">
              <p className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-1 font-label">Learning Hours</p>
              <p className="font-headline text-headline-md text-tertiary">
                {learningHours !== null ? (learningHours === 0 ? "—" : `${learningHours}h`) : <span className="animate-pulse">—</span>}
              </p>
            </div>
          </div>
        </div>

        {/* AI Workflow Stepper */}
        <div className="w-full bg-surface-container-low rounded-2xl p-6 border border-outline-variant/30 flex items-center justify-around relative overflow-hidden">
          {steps.map((step, i, arr) => (
            <div key={step.label} className="flex items-center flex-1">
              <div className={`flex flex-col items-center gap-2 z-10 ${step.state === "idle" ? "opacity-40" : ""} transition-opacity duration-500`}>
                <div className={`w-12 h-12 rounded-full ${getStepClass(step.state, step.color)} flex items-center justify-center transition-all duration-500 ${step.state === "active" ? "shadow-lg ring-2 ring-offset-2 ring-primary/30 animate-pulse" : ""}`}>
                  <span className={`material-symbols-outlined ${step.state === "idle" ? "text-on-surface-variant" : "text-white"}`} style={{ fontVariationSettings: step.state === "done" ? "'FILL' 1" : "'FILL' 0" }}>
                    {getStepIcon(step)}
                  </span>
                </div>
                <span className={`text-label-md font-medium font-label ${step.state === "active" ? "text-primary font-bold" : step.state === "done" ? "text-green-600 font-bold" : ""}`}>
                  {step.label}
                </span>
              </div>
              {i < arr.length - 1 && (
                <div className="flex-1 h-1 mx-4 rounded-full overflow-hidden bg-outline-variant/30">
                  <div className={`h-full rounded-full transition-all duration-700 ${getConnectorClass(step.state)}`} style={{ width: step.state === "done" ? "100%" : step.state === "active" ? "60%" : "0%" }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-200/50 mb-6 font-body font-medium flex items-center gap-3">
          <span className="material-symbols-outlined">error</span>
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
                {/* Upload Progress Bar */}
                {selectedFile && uploadProgress > 0 && (
                  <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/50">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-error">picture_as_pdf</span>
                        <span className="text-body-md font-medium font-body">{selectedFile.name}</span>
                      </div>
                      <span className={`text-label-md font-label font-bold ${uploadProgress >= 100 ? "text-green-600" : "text-primary"}`}>
                        {uploadProgress >= 100 ? "✓ Uploaded" : `${uploadProgress}%`}
                      </span>
                    </div>
                    <div className="w-full bg-outline-variant/30 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${uploadProgress >= 100 ? "bg-green-500" : "bg-primary"}`}
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

          {/* Estimated Output Panel */}
          <div className="bg-surface-container p-8 rounded-3xl border border-outline-variant shadow-sm relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
            <h3 className="font-headline text-headline-md mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">visibility</span>
              Estimated Output
            </h3>
            {(() => {
              const hasContent =
                (activeTab === "pdf" && selectedFile) ||
                (activeTab === "youtube" && youtubeUrl.trim().length > 0) ||
                (activeTab === "notes" && notesText.trim().length > 0);

              const stats = [
                {
                  icon: "segment",
                  value: hasContent ? (activeTab === "notes" ? "8" : "12") : "—",
                  label: "Topics Detected",
                  color: "text-secondary",
                },
                {
                  icon: "style",
                  value: hasContent
                    ? selectedComponents.includes("flashcards")
                      ? activeTab === "notes" ? "25" : "40"
                      : "—"
                    : "—",
                  label: "Flashcards",
                  color: "text-primary",
                },
                {
                  icon: "quiz",
                  value: hasContent
                    ? selectedComponents.includes("quiz")
                      ? activeTab === "notes" ? "10" : "15"
                      : "—"
                    : "—",
                  label: "Quiz Questions",
                  color: "text-tertiary",
                },
                {
                  icon: "schedule",
                  value: hasContent ? (activeTab === "notes" ? "2h" : "3h") : "—",
                  label: "Study Time",
                  color: "text-secondary",
                },
              ];

              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {stats.map(s => (
                    <div key={s.label} className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 text-center">
                      <span className={`material-symbols-outlined ${s.value === "—" ? "text-on-surface-variant/40" : s.color} mb-2`}>{s.icon}</span>
                      <p className={`text-2xl font-bold ${s.value === "—" ? "text-on-surface-variant/40" : "text-on-surface"}`}>{s.value}</p>
                      <p className={`text-label-sm font-label ${s.value === "—" ? "text-on-surface-variant/40" : "text-on-surface-variant"}`}>{s.label}</p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right: Settings */}
        <div className="col-span-12 lg:col-span-4 lg:sticky lg:top-24">
          <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant shadow-sm">
            <h3 className="font-headline text-headline-md mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">settings_suggest</span>
              AI Learning Settings
            </h3>
            <p className="text-label-sm text-on-surface-variant mb-4 font-label">Select what to generate. Only chosen components will be created.</p>
            <div className="space-y-3">
              {COMPONENT_SETTINGS.map(s => {
                const isChecked = selectedComponents.includes(s.key);
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => toggleComponent(s.key)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                      isChecked
                        ? "bg-primary/5 border-primary/30"
                        : "bg-surface-container-low border-outline-variant/30 hover:bg-surface-container"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`material-symbols-outlined ${isChecked ? s.iconColor : "text-on-surface-variant"}`}>{s.icon}</span>
                      <span className={`font-medium font-body ${isChecked ? "text-on-surface" : "text-on-surface-variant"}`}>{s.label}</span>
                    </div>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      isChecked ? "bg-primary border-primary" : "border-outline-variant"
                    }`}>
                      {isChecked && (
                        <span className="material-symbols-outlined text-white text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedComponents.length === 0 && (
              <p className="text-label-sm text-red-500 mt-3 font-label">⚠ Select at least one component.</p>
            )}

            <button
              type="submit"
              className="w-full mt-8 py-5 bg-gradient-to-r from-primary to-secondary text-on-primary rounded-2xl font-bold text-body-lg shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 group disabled:opacity-60 disabled:pointer-events-none"
              disabled={generating || selectedComponents.length === 0}
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
            {generating ? (
              <p className="text-center text-label-sm text-primary mt-4 font-label animate-pulse">AI is generating your guide... please wait</p>
            ) : (
              <p className="text-center text-label-sm text-on-surface-variant mt-4 font-label">Estimated time: 2-3 minutes</p>
            )}
          </div>
        </div>
      </div>

      {/* Recently Created */}
      {recentGuides.length > 0 && (
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
              <Link
                key={g.id}
                to={g.status === "ready" ? `/guides/${g.id}` : "#"}
                className={`glass-card p-6 rounded-2xl flex items-center gap-4 hover:bg-surface-container-high/50 transition-colors group ${g.status !== "ready" ? "opacity-60 cursor-default" : "cursor-pointer"}`}
              >
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
                  <span className="material-symbols-outlined text-2xl text-primary/80">auto_stories</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-body-md group-hover:text-primary transition-colors truncate">{g.title}</h4>
                  <p className="text-body-sm text-on-surface-variant font-body">
                    {g._count?.flashcards || 0} Flashcards · {g._count?.quizQuestions || 0} Quiz Qs
                  </p>
                  <span className={`text-[10px] font-bold font-label uppercase ${
                    g.status === "ready" ? "text-green-600" : g.status === "failed" ? "text-red-500" : "text-amber-500"
                  }`}>{g.status}</span>
                </div>
                <span className="material-symbols-outlined text-outline-variant group-hover:text-primary">chevron_right</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </form>
  );
}
