import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { analyticsService } from "../services/analytics.service";
import type { OverviewStats, QuizTrendData, WeakTopicItem, ScorePrediction } from "../services/analytics.service";
import { guideService } from "../services/guide.service";
import type { UserProfile } from "../components/layout/DashboardLayout";

export default function DashboardPage() {
  const { user } = useOutletContext<{ user: UserProfile }>();
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [quizTrend, setQuizTrend] = useState<QuizTrendData | null>(null);
  const [weakTopics, setWeakTopics] = useState<WeakTopicItem[]>([]);
  const [guides, setGuides] = useState<any[]>([]);
  
  // Prediction States
  const [prediction, setPrediction] = useState<ScorePrediction | null>(null);
  const [selectedGuideId, setSelectedGuideId] = useState<string>("");
  const [examDate, setExamDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [overviewData, guidesData, weakTopicsData] = await Promise.all([
          analyticsService.getOverview(),
          guideService.getAll(),
          analyticsService.getWeakTopics()
        ]);

        setOverview(overviewData);
        setGuides(guidesData || []);
        setWeakTopics(weakTopicsData?.weakTopics || []);

        if (guidesData && guidesData.length > 0) {
          const readyGuides = guidesData.filter((g: any) => g.status === "ready");
          if (readyGuides.length > 0) {
            setSelectedGuideId(readyGuides[0].id);
          } else {
            setSelectedGuideId(guidesData[0].id);
          }
        }

        // Try loading general quiz trend
        try {
          const trendData = await analyticsService.getQuizTrend();
          setQuizTrend(trendData);
        } catch (trendErr) {
          console.error("No quiz trend found or failed to load", trendErr);
        }
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handlePredict = async () => {
    if (!selectedGuideId) return;
    setPredicting(true);
    setPredictionError(null);
    try {
      const pred = await analyticsService.getPredict(selectedGuideId, examDate);
      setPrediction(pred);
    } catch (err: any) {
      console.error(err);
      setPredictionError(err.response?.data?.error?.message || err.response?.data?.message || "Prediction failed. Ensure you have quiz attempts for this guide.");
    } finally {
      setPredicting(false);
    }
  };

  // Helper to format source icon
  const getSourceIcon = (type: string) => {
    switch (type) {
      case "youtube": return "smart_display";
      case "notes": return "edit_note";
      case "mixed": return "layers";
      default: return "description";
    }
  };

  // Build Quiz Trend SVG points
  const renderTrendChart = () => {
    if (!quizTrend || !quizTrend.labels || quizTrend.labels.length === 0 || !quizTrend.datasets || quizTrend.datasets[0].data.length === 0) {
      return (
        <div className="h-40 flex flex-col items-center justify-center text-center text-on-surface-variant/60">
          <span className="material-symbols-outlined text-4xl mb-2 text-outline-variant">show_chart</span>
          <p className="text-body-sm font-medium">No quiz attempts yet. Complete a quiz to view your progress trend.</p>
        </div>
      );
    }

    const dataPoints = quizTrend.datasets[0].data;
    const labels = quizTrend.labels;
    const width = 500;
    const height = 160;
    const padding = 20;

    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const xPoints = dataPoints.map((_, i) => 
      dataPoints.length > 1 ? padding + (i * chartWidth) / (dataPoints.length - 1) : width / 2
    );
    const yPoints = dataPoints.map(val => 
      padding + chartHeight - (val / 100) * chartHeight
    );

    let pathD = `M ${xPoints[0]} ${yPoints[0]}`;
    for (let i = 1; i < dataPoints.length; i++) {
      pathD += ` L ${xPoints[i]} ${yPoints[i]}`;
    }

    return (
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4" />
          <line x1={padding} y1={padding + chartHeight / 2} x2={width - padding} y2={padding + chartHeight / 2} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4" />
          <line x1={padding} y1={padding + chartHeight} x2={width - padding} y2={padding + chartHeight} stroke="#e2e8f0" strokeWidth="1" />

          {/* Area under curve */}
          {dataPoints.length > 1 && (
            <path
              d={`${pathD} L ${xPoints[xPoints.length - 1]} ${padding + chartHeight} L ${xPoints[0]} ${padding + chartHeight} Z`}
              fill="url(#gradient-area)"
              opacity="0.15"
            />
          )}

          {/* Line path */}
          <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Dots */}
          {dataPoints.map((val, i) => (
            <g key={i}>
              <circle cx={xPoints[i]} cy={yPoints[i]} r="5" fill="#ffffff" stroke="#2563eb" strokeWidth="2.5" className="cursor-pointer" />
              <text x={xPoints[i]} y={yPoints[i] - 8} fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle" fill="#0b1c30">
                {Math.round(val)}%
              </text>
            </g>
          ))}

          {/* X axis labels */}
          {labels.map((lbl, i) => {
            // Only show up to 5 labels to avoid clutter
            const step = Math.max(1, Math.floor(labels.length / 5));
            if (i % step !== 0 && i !== labels.length - 1) return null;
            return (
              <text key={i} x={xPoints[i]} y={height - 2} fontSize="8" fontFamily="sans-serif" textAnchor="middle" fill="#64748b">
                {lbl}
              </text>
            );
          })}

          <defs>
            <linearGradient id="gradient-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center py-24">
        <span className="material-symbols-outlined animate-spin text-primary text-5xl">progress_activity</span>
      </div>
    );
  }

  const recentGuidesList = guides.slice(0, 3);

  return (
    <>
      {/* Welcome & Quick Action */}
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-headline text-headline-lg font-bold text-on-surface">Welcome back, {user.name}!</h2>
          <p className="font-body text-body-md text-on-surface-variant mt-1">Keep up the momentum. Here is your academic engine overview.</p>
        </div>
        <Link
          to="/guides/new"
          className="bg-primary text-on-primary px-6 py-3 rounded-full font-label text-label-md hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-primary/10 active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Create New Guide
        </Link>
      </header>

      {/* Analytics Overview Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          {
            icon: "timer",
            label: "Study Time",
            value: `${overview?.totalStudyMinutes || 0}m`,
            iconBg: "bg-primary-fixed",
            iconColor: "text-primary",
            desc: "Minutes spent in sessions"
          },
          {
            icon: "quiz",
            label: "Quiz Avg Score",
            value: `${overview?.averageQuizScore || 0}%`,
            iconBg: "bg-secondary-fixed",
            iconColor: "text-secondary",
            desc: `Across ${overview?.totalQuizAttempts || 0} attempts`
          },
          {
            icon: "style",
            label: "Flashcards Mastered",
            value: `${overview?.masteredCards || 0}/${overview?.totalFlashcardsReviewed || 0}`,
            iconBg: "bg-tertiary-fixed",
            iconColor: "text-tertiary",
            desc: "Cards with 2+ repetitions"
          },
          {
            icon: "local_fire_department",
            label: "Study Streak",
            value: `${overview?.currentStudyStreak || 0} Days`,
            iconBg: "bg-error/10",
            iconColor: "text-error",
            desc: `Longest streak: ${overview?.longestStreak || 0} days`
          }
        ].map(card => (
          <div key={card.label} className="glass-card p-6 rounded-3xl flex flex-col justify-between hover:translate-y-[-2px] transition-transform">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 rounded-2xl ${card.iconBg} ${card.iconColor} flex items-center justify-center`}>
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>{card.icon}</span>
              </div>
              <div>
                <p className="text-label-sm text-on-surface-variant font-label uppercase tracking-wider">{card.label}</p>
                <p className="font-headline text-headline-md font-bold text-on-surface mt-0.5">{card.value}</p>
              </div>
            </div>
            <p className="text-body-sm text-on-surface-variant opacity-70 border-t border-slate-100 pt-3">{card.desc}</p>
          </div>
        ))}
      </section>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Left Column: Progress Chart & Guides */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          
          {/* Progress Chart */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline text-headline-md font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">analytics</span>
                Quiz Performance Trend
              </h3>
              <span className="text-label-sm text-on-surface-variant font-label uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full">Last 30 Days</span>
            </div>
            {renderTrendChart()}
          </div>

          {/* Recent Study Guides */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-headline text-headline-md font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">auto_stories</span>
                Recent Study Guides
              </h3>
              <Link to="/guides" className="text-primary hover:underline text-label-md font-bold font-label flex items-center gap-1">
                View All Guides
                <span className="material-symbols-outlined text-base">chevron_right</span>
              </Link>
            </div>
            
            {recentGuidesList.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {recentGuidesList.map(g => (
                  <div key={g.id} className="glass-card p-5 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:translate-y-[-1px] transition-transform">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="bg-primary/10 text-primary px-3 py-0.5 rounded-full text-label-sm font-label">{g.subject || "General"}</span>
                        <span className="text-label-sm text-on-surface-variant opacity-60 font-label flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">{getSourceIcon(g.sourceType)}</span>
                          {g.sourceType.toUpperCase()}
                        </span>
                      </div>
                      <h4 className="font-headline text-headline-sm font-bold text-on-surface pt-1">{g.title}</h4>
                      <p className="text-body-sm text-on-surface-variant line-clamp-1 max-w-lg">{g.description || "No description provided."}</p>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                      <div className="text-left md:text-right hidden sm:block">
                        <p className="text-label-sm text-on-surface-variant font-label">Quiz Readiness</p>
                        <p className="text-body-md font-bold text-primary font-body">{g.status === "ready" ? "Ready" : g.status}</p>
                      </div>
                      <Link 
                        to={`/guides/${g.id}`}
                        className={`w-full md:w-auto px-5 py-2.5 bg-primary text-on-primary rounded-xl font-label text-label-sm text-center flex items-center justify-center gap-1.5 hover:brightness-110 transition-all ${g.status !== 'ready' ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <span className="material-symbols-outlined text-base">play_arrow</span>
                        Study Workspace
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card p-12 rounded-3xl text-center">
                <span className="material-symbols-outlined text-5xl text-outline-variant opacity-40 mb-3">auto_stories</span>
                <h4 className="font-headline text-headline-sm font-bold text-on-surface">No guides yet</h4>
                <p className="text-body-sm text-on-surface-variant max-w-sm mx-auto mt-1 mb-6">Create a guide from notes, PDF lectures, or YouTube videos to start studying.</p>
                <Link to="/guides/new" className="bg-primary text-on-primary px-6 py-2.5 rounded-xl text-label-sm font-bold font-label inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">add</span>
                  Create Guide
                </Link>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Predictor & Weak Topics */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          
          {/* Exam Readiness Predictor */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant shadow-sm space-y-4">
            <h3 className="font-headline text-headline-md font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">auto_awesome</span>
              AI Score Predictor
            </h3>
            <p className="text-body-sm text-on-surface-variant">Forecasts your exam score using linear regression on quiz attempts and topic coverage.</p>
            
            {guides.length > 0 ? (
              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <label className="font-label text-label-sm text-on-surface-variant block ml-1" htmlFor="predict-guide">Select Guide</label>
                  <select 
                    id="predict-guide"
                    className="w-full bg-[#F1F5F9] border-transparent focus:border-primary border-2 rounded-xl py-2 px-3 outline-none transition-all font-body text-body-sm"
                    value={selectedGuideId}
                    onChange={(e) => setSelectedGuideId(e.target.value)}
                  >
                    {guides.map(g => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-label text-label-sm text-on-surface-variant block ml-1" htmlFor="predict-date">Target Exam Date</label>
                  <input
                    id="predict-date"
                    type="date"
                    className="w-full bg-[#F1F5F9] border-transparent focus:border-primary border-2 rounded-xl py-2 px-3 outline-none transition-all font-body text-body-sm"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                  />
                </div>

                <button
                  onClick={handlePredict}
                  disabled={predicting || !selectedGuideId}
                  className="w-full py-3 bg-secondary text-on-secondary font-label text-label-sm font-bold rounded-xl active:scale-[0.98] transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {predicting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">psychology</span>
                      Predict Score
                    </>
                  )}
                </button>

                {predictionError && (
                  <p className="text-body-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-200/50">{predictionError}</p>
                )}

                {prediction && (
                  <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl space-y-3 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-label-sm font-bold text-on-surface-variant font-label">Projected Score</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-label ${
                        prediction.confidence === 'high' ? 'bg-green-100 text-green-700' :
                        prediction.confidence === 'medium' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {prediction.confidence} Confidence
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-headline-lg font-bold text-primary font-headline">
                        {prediction.projectedScore !== null ? `${Math.round(prediction.projectedScore)}%` : 'N/A'}
                      </span>
                      <span className="text-label-sm text-on-surface-variant font-label uppercase">
                        Trend: {prediction.trend}
                      </span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant opacity-70">
                      {prediction.projectedScore !== null 
                        ? "Linear regression projects this score based on your study patterns. Continue reviewing weak topics to improve confidence."
                        : "Need at least 2 quiz attempts in this guide to build a projection trend."}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-body-sm text-on-surface-variant opacity-70 pt-2 text-center">Create a study guide first to access AI score forecasts.</p>
            )}
          </div>

          {/* Weak Topics Heatmap / List */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant shadow-sm space-y-4">
            <h3 className="font-headline text-headline-md font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-error">warning</span>
              Weak Topics
            </h3>
            <p className="text-body-sm text-on-surface-variant">Focus study time on these extracted topics where accuracy drops below 60%.</p>
            
            {weakTopics.length > 0 ? (
              <div className="space-y-4 pt-2">
                {weakTopics.map(w => (
                  <div key={w.topic} className="space-y-1.5">
                    <div className="flex justify-between text-body-sm">
                      <span className="font-semibold text-on-surface truncate max-w-[180px]">{w.topic}</span>
                      <span className="font-bold text-error font-label">{w.accuracy}% Acc</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-error rounded-full" style={{ width: `${w.accuracy}%` }} />
                    </div>
                    <p className="text-[11px] text-on-surface-variant opacity-70">Attempted {w.totalAttempted} times. Needs focus.</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200/50 p-4 rounded-2xl text-center">
                <span className="material-symbols-outlined text-green-600 text-3xl mb-1">verified</span>
                <p className="text-body-sm font-semibold text-green-800">All topics are strong!</p>
                <p className="text-[11px] text-green-700 mt-0.5">Keep maintaining your high score accuracy.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
