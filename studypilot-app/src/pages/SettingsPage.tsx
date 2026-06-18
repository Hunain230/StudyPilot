import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { userService } from "../services/user.service";
import type { UserProfile } from "../components/layout/DashboardLayout";
import { api } from "../lib/axios";

export default function SettingsPage() {
  const { user, setUser } = useOutletContext<{ user: UserProfile; setUser: (u: UserProfile) => void }>();
  const [activeTab, setActiveTab] = useState<"account" | "study" | "diagnostics">("account");
  
  // Profile Form States
  const [name, setName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Study preference states (stored in local storage as client-side preferences)
  const [readinessThreshold, setReadinessThreshold] = useState<number>(70);
  const [defaultDuration, setDefaultDuration] = useState<number>(30);
  const [aiSolverTone, setAiSolverTone] = useState<string>("academic");

  // Diagnostics states
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [checkingDiagnostics, setCheckingDiagnostics] = useState(false);

  useEffect(() => {
    // Load study preferences from localStorage if they exist
    const threshold = localStorage.getItem("studypilot_pref_threshold");
    const duration = localStorage.getItem("studypilot_pref_duration");
    const tone = localStorage.getItem("studypilot_pref_tone");

    if (threshold) setReadinessThreshold(Number(threshold));
    if (duration) setDefaultDuration(Number(duration));
    if (tone) setAiSolverTone(tone);
  }, []);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(null);
    setSaveError(null);
    try {
      const updated = await userService.updateProfile({ name, avatarUrl: avatarUrl || undefined });
      if (setUser) {
        setUser(updated);
      }
      setSaveSuccess("Profile updated successfully!");
    } catch (err: any) {
      console.error(err);
      setSaveError(err.response?.data?.error?.message || err.response?.data?.message || "Failed to update profile details.");
    } finally {
      setSaving(false);
    }
  };

  const handlePreferencesSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("studypilot_pref_threshold", readinessThreshold.toString());
    localStorage.setItem("studypilot_pref_duration", defaultDuration.toString());
    localStorage.setItem("studypilot_pref_tone", aiSolverTone);
    alert("Preferences saved successfully!");
  };

  const checkDiagnostics = async () => {
    setCheckingDiagnostics(true);
    setHealthStatus(null);
    try {
      const res = await api.get("/health");
      setHealthStatus(res.data);
    } catch (err: any) {
      console.error(err);
      setHealthStatus({
        status: "error",
        message: err.message || "Failed to connect to backend academic engine."
      });
    } finally {
      setCheckingDiagnostics(false);
    }
  };

  const getInitials = (n: string) => {
    return n
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <>
      {/* Header */}
      <header className="mb-8">
        <h2 className="font-headline text-headline-lg font-bold text-on-surface">Workspace Settings</h2>
        <p className="font-body text-body-md text-on-surface-variant mt-1">Configure account options, customized study thresholds, and perform diagnostic health checks.</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-outline-variant/30 mb-8 pb-px">
        {[
          { id: "account", label: "Account Profile", icon: "person" },
          { id: "study", label: "Study Prefs", icon: "school" },
          { id: "diagnostics", label: "Diagnostics", icon: "settings_suggest" },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === "diagnostics" && !healthStatus) {
                  checkDiagnostics();
                }
              }}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-label text-label-md transition-colors ${
                isActive
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-on-surface-variant hover:text-primary"
              }`}
            >
              <span className="material-symbols-outlined text-base" style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Settings Panel Content */}
      <main className="max-w-3xl">
        {activeTab === "account" && (
          <form onSubmit={handleProfileSave} className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant shadow-sm space-y-6">
            <h3 className="font-headline text-headline-md font-bold text-on-surface flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">person_outline</span>
              Account Information
            </h3>
            
            {saveSuccess && (
              <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-200/50 font-body font-medium">
                {saveSuccess}
              </div>
            )}
            {saveError && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200/50 font-body font-medium">
                {saveError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-6 pb-4 border-b border-slate-100">
              <div className="w-20 h-20 rounded-full border-2 border-primary-fixed overflow-hidden bg-surface-container flex-shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-primary font-bold text-xl">
                    {getInitials(name || user.name)}
                  </div>
                )}
              </div>
              <div className="text-center sm:text-left space-y-1">
                <h4 className="font-headline text-headline-sm font-bold text-on-surface">{name || user.name}</h4>
                <p className="text-body-sm text-on-surface-variant opacity-75">{user.email}</p>
                <p className="text-[11px] text-on-surface-variant font-label uppercase">Member since {new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="font-label text-label-md text-on-surface-variant block ml-1" htmlFor="settings-name">Full Name</label>
                <input 
                  className="input-soft w-full px-4 py-3 rounded-xl border border-outline-variant bg-[#F1F5F9] focus:bg-white focus:border-primary border-2 outline-none font-body text-on-surface"
                  id="settings-name"
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="font-label text-label-md text-on-surface-variant block ml-1" htmlFor="settings-avatar">Avatar Image URL</label>
                <input 
                  className="input-soft w-full px-4 py-3 rounded-xl border border-outline-variant bg-[#F1F5F9] focus:bg-white focus:border-primary border-2 outline-none font-body text-on-surface"
                  id="settings-avatar"
                  placeholder="https://example.com/avatar.jpg"
                  type="url" 
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                />
                <p className="text-[11px] text-on-surface-variant opacity-70 ml-1">Leave empty to use automatic letter initials avatar.</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3.5 bg-primary text-on-primary font-label text-label-sm font-bold rounded-xl active:scale-[0.98] transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving Profile...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">save</span>
                  Save Account Changes
                </>
              )}
            </button>
          </form>
        )}

        {activeTab === "study" && (
          <form onSubmit={handlePreferencesSave} className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant shadow-sm space-y-6">
            <h3 className="font-headline text-headline-md font-bold text-on-surface flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">school</span>
              Study Configurations
            </h3>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="font-label text-label-md text-on-surface-variant block ml-1" htmlFor="pref-threshold">
                  Exam Readiness Pass Threshold ({readinessThreshold}%)
                </label>
                <input
                  type="range"
                  id="pref-threshold"
                  min="50"
                  max="90"
                  step="5"
                  value={readinessThreshold}
                  onChange={(e) => setReadinessThreshold(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <p className="text-[11px] text-on-surface-variant opacity-70 ml-1">Targets below this threshold will be flagged as "At Risk" in guides.</p>
              </div>

              <div className="space-y-2">
                <label className="font-label text-label-md text-on-surface-variant block ml-1" htmlFor="pref-duration">
                  Default Study Session Duration (minutes)
                </label>
                <select
                  id="pref-duration"
                  value={defaultDuration}
                  onChange={(e) => setDefaultDuration(Number(e.target.value))}
                  className="w-full bg-[#F1F5F9] border-transparent focus:border-primary border-2 rounded-xl py-3 px-4 outline-none transition-all font-body text-body-sm"
                >
                  <option value={15}>15 Minutes (Micro sessions)</option>
                  <option value={30}>30 Minutes (Standard Pomodoro)</option>
                  <option value={45}>45 Minutes (Extended study)</option>
                  <option value={60}>60 Minutes (Deep focus blocks)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="font-label text-label-md text-on-surface-variant block ml-1" htmlFor="pref-tone">
                  AI Doubt Solver Response Tone
                </label>
                <select
                  id="pref-tone"
                  value={aiSolverTone}
                  onChange={(e) => setAiSolverTone(e.target.value)}
                  className="w-full bg-[#F1F5F9] border-transparent focus:border-primary border-2 rounded-xl py-3 px-4 outline-none transition-all font-body text-body-sm"
                >
                  <option value="academic">Academic & In-depth (Formal cited explanations)</option>
                  <option value="simplistic">Simplistic & Intuitive (ELI5 analogies)</option>
                  <option value="concise">Bullet points only (Quick review summaries)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="px-8 py-3.5 bg-primary text-on-primary font-label text-label-sm font-bold rounded-xl active:scale-[0.98] transition-all hover:opacity-90 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">save</span>
              Save Preferences
            </button>
          </form>
        )}

        {activeTab === "diagnostics" && (
          <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-headline text-headline-md font-bold text-on-surface flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">settings_suggest</span>
                Academic Engine Diagnostics
              </h3>
              <button
                onClick={checkDiagnostics}
                disabled={checkingDiagnostics}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-primary disabled:opacity-50 transition-colors"
                title="Refresh Status"
              >
                <span className={`material-symbols-outlined text-xl ${checkingDiagnostics ? 'animate-spin' : ''}`}>sync</span>
              </button>
            </div>

            {checkingDiagnostics ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
                <p className="text-body-sm text-on-surface-variant">Checking backend connection status...</p>
              </div>
            ) : healthStatus ? (
              <div className="space-y-4">
                <div className={`p-5 rounded-2xl border flex items-center gap-4 ${
                  healthStatus.status === 'ok' 
                    ? 'bg-green-50 border-green-200/50 text-green-800' 
                    : 'bg-red-50 border-red-200/50 text-red-800'
                }`}>
                  <span className="material-symbols-outlined text-3xl">
                    {healthStatus.status === 'ok' ? 'check_circle' : 'error'}
                  </span>
                  <div>
                    <h4 className="font-bold font-headline text-headline-sm uppercase">
                      {healthStatus.status === 'ok' ? 'System Online' : 'System Error'}
                    </h4>
                    <p className="text-body-sm opacity-90 mt-0.5">
                      {healthStatus.status === 'ok' ? 'Successfully connected to backend express services.' : healthStatus.message}
                    </p>
                  </div>
                </div>

                {healthStatus.status === 'ok' && (
                  <div className="border border-slate-100 rounded-2xl p-5 space-y-3">
                    <h4 className="font-bold text-label-md font-label uppercase tracking-wider text-on-surface-variant">Diagnostics parameters</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-on-surface-variant font-label">Engine Version</span>
                        <p className="font-headline text-body-lg font-bold text-on-surface mt-0.5">v1.0.0 Stable</p>
                      </div>
                      <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-on-surface-variant font-label">Server Time</span>
                        <p className="font-headline text-body-lg font-bold text-on-surface mt-0.5">
                          {new Date(healthStatus.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-body-sm text-on-surface-variant opacity-75">Click refresh to diagnose backend engine connections.</p>
            )}
          </div>
        )}
      </main>
    </>
  );
}
