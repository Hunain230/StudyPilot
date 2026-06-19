import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { guideService } from "../services/guide.service";
import { quizService } from "../services/quiz.service";
import { flashcardService } from "../services/flashcard.service";

interface KeyConcept {
  term: string;
  definition: string;
}

interface TopicHierarchyItem {
  topic: string;
  subtopics: string[];
}

interface Flashcard {
  id: string;
  question?: string;
  answer?: string;
  front?: string;
  back?: string;
  difficulty: "easy" | "medium" | "hard" | string;
  orderIndex: number;
  sm2?: {
    easeFactor: number;
    interval: number;
    repetitions: number;
    nextReviewAt: string;
    isDue: boolean;
  };
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  orderIndex: number;
}

interface RevisionSection {
  id: string;
  heading: string;
  bulletPoints: string[];
}

interface RevisionSheet {
  id: string;
  title: string;
  sections: RevisionSection[];
}

interface Guide {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  sourceType: "pdf" | "youtube" | "notes";
  status: "processing" | "ready" | "failed";
  createdAt: string;
  selectedComponents?: string[] | null;
  content?: {
    shortSummary: string;
    detailedSummary: string;
    keyConcepts: KeyConcept[];
    topics: string[];
    topicHierarchy: TopicHierarchyItem[];
    metadata: {
      estimatedReadingTime: string;
      difficulty: "beginner" | "intermediate" | "advanced";
      subject: string;
      language: string;
      wordCount: number;
    };
  };
  flashcards?: Flashcard[];
  quizQuestions?: QuizQuestion[];
  revisionSheet?: RevisionSheet;
}

export default function GuideDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "flashcards" | "quiz" | "revision" | "mindmap" | "studyplan">("summary");

  // Flashcards state
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [submittedQuestions, setSubmittedQuestions] = useState<Record<string, boolean>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizStartTime, setQuizStartTime] = useState<number>(Date.now());
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  // Study Plan state
  const [examDate, setExamDate] = useState<string>("");
  const [studyPlan, setStudyPlan] = useState<any | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === "quiz") {
      setQuizStartTime(Date.now());
    }
  }, [activeTab]);

  useEffect(() => {
    const fetchGuideDetails = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await guideService.getById(id);
        setGuide(data);

        // Fetch detailed card spaced-repetition stats
        try {
          const cardsData = await flashcardService.getCards(id);
          if (cardsData && cardsData.success) {
            setFlashcards(cardsData.cards);
          } else {
            setFlashcards(data.flashcards || []);
          }
        } catch (cardErr) {
          console.error("Failed to load cards with SM2 metrics:", cardErr);
          setFlashcards(data.flashcards || []);
        }
      } catch (err: any) {
        console.error(err);
        setError("Failed to load study guide details. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchGuideDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center py-24">
        <div className="text-center">
          <span className="material-symbols-outlined animate-spin text-primary text-5xl mb-4">progress_activity</span>
          <p className="text-on-surface-variant font-label text-label-md">Loading your study workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="max-w-xl mx-auto my-12 text-center">
        <div className="bg-red-50 text-red-600 p-8 rounded-3xl border border-red-200/50">
          <span className="material-symbols-outlined text-4xl mb-2">error</span>
          <p className="font-headline text-headline-md font-bold mb-4">Oops! Something went wrong</p>
          <p className="text-body-md mb-6">{error || "We couldn't retrieve this study guide."}</p>
          <Link to="/guides" className="bg-primary text-on-primary px-6 py-2.5 rounded-full inline-block font-label text-label-md">
            Back to My Guides
          </Link>
        </div>
      </div>
    );
  }

  // Handle flashcard navigation
  const handleNextCard = () => {
    if (!flashcards || flashcards.length === 0) return;
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex((prev) => (prev + 1) % flashcards.length);
    }, 150);
  };

  const handlePrevCard = () => {
    if (!flashcards || flashcards.length === 0) return;
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
    }, 150);
  };

  // Submit flashcard review (quality 0-5)
  const handleRateCard = async (quality: number) => {
    if (!flashcards || flashcards.length === 0) return;
    const currentCard = flashcards[currentCardIndex];
    setSubmittingReview(true);
    try {
      const response = await flashcardService.submitReview(currentCard.id, quality);
      if (response.success) {
        // Update the card locally in state
        setFlashcards(prev => prev.map((c, idx) => {
          if (idx === currentCardIndex) {
            return {
              ...c,
              sm2: {
                easeFactor: response.updated.easeFactor,
                interval: response.updated.interval,
                repetitions: response.updated.repetitions,
                nextReviewAt: response.updated.nextReviewAt,
                isDue: false, // marked as reviewed
              }
            };
          }
          return c;
        }));
        
        // Brief delay for transition feedback before moving to next card
        setTimeout(() => {
          handleNextCard();
        }, 250);
      }
    } catch (err) {
      console.error("Failed to submit card review", err);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Reset flashcards SM2 progress
  const handleResetFlashcards = async () => {
    if (!id) return;
    try {
      const res = await flashcardService.resetProgress(id);
      if (res.success) {
        // Reload flashcards
        const cardsData = await flashcardService.getCards(id);
        if (cardsData && cardsData.success) {
          setFlashcards(cardsData.cards);
        }
        setCurrentCardIndex(0);
        setIsFlipped(false);
        setShowResetConfirm(false);
      }
    } catch (err) {
      console.error("Failed to reset flashcard progress", err);
    }
  };

  // Handle quiz option selection
  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (quizSubmitted || submittedQuestions[questionId]) return;
    setSelectedAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  // Submit a single question check (locally only)
  const handleSubmitQuestion = (questionId: string) => {
    setSubmittedQuestions(prev => ({ ...prev, [questionId]: true }));
  };

  // Submit entire quiz
  const handleSubmitAllQuiz = async () => {
    if (!guide.quizQuestions || !id) return;
    setSubmittingQuiz(true);
    try {
      const answersPayload = guide.quizQuestions.map((q) => {
        const selected = selectedAnswers[q.id];
        return {
          questionId: q.id,
          selectedOption: selected !== undefined ? selected : undefined,
        };
      });

      const timeTakenSec = Math.max(5, Math.round((Date.now() - quizStartTime) / 1000));

      const response = await quizService.submitAttempt(id, {
        answers: answersPayload.filter(a => a.selectedOption !== undefined),
        timeTakenSeconds: timeTakenSec,
      });

      if (response.success) {
        setQuizScore(response.correct);
        setQuizSubmitted(true);
        // Mark all as submitted
        const allSubmitted: Record<string, boolean> = {};
        guide.quizQuestions.forEach((q) => {
          allSubmitted[q.id] = true;
        });
        setSubmittedQuestions(allSubmitted);
      }
    } catch (err) {
      console.error("Failed to submit quiz attempt", err);
      alert("Failed to submit quiz attempt. Please select at least one answer.");
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleResetQuiz = () => {
    setSelectedAnswers({});
    setSubmittedQuestions({});
    setQuizScore(null);
    setQuizSubmitted(false);
    setQuizStartTime(Date.now());
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "youtube": return "smart_display";
      case "notes": return "edit_note";
      default: return "description";
    }
  };

  const metadata = guide.content?.metadata;
  const wordCount = metadata?.wordCount || 0;
  const readingTime = metadata?.estimatedReadingTime || `${Math.ceil(wordCount / 200) || 5} mins`;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header Back Navigation & Info */}
      <header className="mb-6">
        <Link to="/guides" className="inline-flex items-center gap-2 text-primary font-label text-label-md hover:underline mb-4">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to My Guides
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-label-sm font-label">
                {guide.subject || metadata?.subject || "General"}
              </span>
              <span className="bg-secondary/10 text-secondary px-3 py-1 rounded-full text-label-sm font-label capitalize">
                {metadata?.difficulty || "Intermediate"}
              </span>
              <span className="flex items-center gap-1 text-on-surface-variant text-label-sm font-label">
                <span className="material-symbols-outlined text-sm">{getSourceIcon(guide.sourceType)}</span>
                {guide.sourceType.toUpperCase()}
              </span>
            </div>
            <h1 className="font-headline text-headline-lg font-bold text-on-surface">{guide.title}</h1>
          </div>
          <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-outline-variant/30">
            <div className="text-center px-4 border-r border-outline-variant/30">
              <p className="text-[10px] text-on-surface-variant font-label uppercase">Est. Read Time</p>
              <p className="font-headline text-headline-md font-bold text-primary">{readingTime}</p>
            </div>
            <div className="text-center px-4">
              <p className="text-[10px] text-on-surface-variant font-label uppercase">Words Processed</p>
              <p className="font-headline text-headline-md font-bold text-secondary">{wordCount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs Menu */}
      <nav className="flex border-b border-outline-variant/30 mb-8 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab("summary")}
          className={`px-5 py-3 font-label text-label-md border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "summary" ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-base">chrome_reader_mode</span>
          Study Guide
        </button>
        {flashcards && flashcards.length > 0 && (
          <button
            onClick={() => setActiveTab("flashcards")}
            className={`px-5 py-3 font-label text-label-md border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "flashcards" ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-base">style</span>
            Flashcards ({flashcards.length})
          </button>
        )}
        {guide.quizQuestions && guide.quizQuestions.length > 0 && (
          <button
            onClick={() => setActiveTab("quiz")}
            className={`px-5 py-3 font-label text-label-md border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "quiz" ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-base">quiz</span>
            Practice Quiz ({guide.quizQuestions.length})
          </button>
        )}
        {guide.revisionSheet && guide.revisionSheet.sections && guide.revisionSheet.sections.length > 0 && (
          <button
            onClick={() => setActiveTab("revision")}
            className={`px-5 py-3 font-label text-label-md border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "revision" ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-base">list_alt</span>
            Revision Notes
          </button>
        )}
        {guide.content?.topicHierarchy && guide.content.topicHierarchy.length > 0 &&
         guide.selectedComponents?.includes("mindMap") && (
          <button
            onClick={() => setActiveTab("mindmap")}
            className={`px-5 py-3 font-label text-label-md border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "mindmap" ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-base">account_tree</span>
            Mind Map
          </button>
        )}
        {guide.selectedComponents?.includes("studyPlan") && (
          <button
            onClick={() => setActiveTab("studyplan")}
            className={`px-5 py-3 font-label text-label-md border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "studyplan" ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-base">calendar_month</span>
            Study Plan
          </button>
        )}
      </nav>

      {/* Main Workspace Area */}
      <main className="flex-grow">
        {/* Tab 1: Summary */}
        {activeTab === "summary" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Short Summary Card */}
              <div className="glass-card rounded-3xl p-8 border-primary/10 bg-primary/[0.02]">
                <h3 className="font-headline text-headline-md font-bold mb-4 text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined">lightbulb</span>
                  Key Summary
                </h3>
                <p className="font-body text-body-lg text-on-surface leading-relaxed">
                  {guide.content?.shortSummary}
                </p>
              </div>

              {/* Detailed Summary Card */}
              <div className="glass-card rounded-3xl p-8 space-y-4">
                <h3 className="font-headline text-headline-md font-bold text-on-surface">Detailed Explanations</h3>
                <div className="font-body text-body-md text-on-surface-variant space-y-4 whitespace-pre-line leading-relaxed">
                  {guide.content?.detailedSummary}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* Key Concepts Card */}
              <div className="glass-card rounded-3xl p-6">
                <h3 className="font-headline text-headline-md font-bold mb-4 text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined">menu_book</span>
                  Key Concepts
                </h3>
                <div className="space-y-4">
                  {guide.content?.keyConcepts && guide.content.keyConcepts.length > 0 ? (
                    guide.content.keyConcepts.map((concept, idx) => (
                      <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="font-headline text-body-md font-bold text-primary mb-1">{concept.term}</p>
                        <p className="font-body text-body-sm text-on-surface-variant">{concept.definition}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-body-sm text-on-surface-variant italic">No concepts generated.</p>
                  )}
                </div>
              </div>

              {/* Topic Hierarchy Card */}
              <div className="glass-card rounded-3xl p-6">
                <h3 className="font-headline text-headline-md font-bold mb-4 text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined">account_tree</span>
                  Topic Outline
                </h3>
                <div className="space-y-4 font-body">
                  {guide.content?.topicHierarchy && guide.content.topicHierarchy.length > 0 ? (
                    guide.content.topicHierarchy.map((topicNode, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center gap-2 font-bold text-on-surface text-body-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                          <span>{topicNode.topic}</span>
                        </div>
                        <ul className="pl-6 space-y-1">
                          {topicNode.subtopics.map((sub, sIdx) => (
                            <li key={sIdx} className="text-body-sm text-on-surface-variant flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[10px] text-slate-400">arrow_forward</span>
                              {sub}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))
                  ) : (
                    <p className="text-body-sm text-on-surface-variant italic">No outline generated.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Flashcards */}
        {activeTab === "flashcards" && (
          <div className="max-w-2xl mx-auto flex flex-col items-center py-6">
            {flashcards && flashcards.length > 0 ? (
              <>
                <div className="flex justify-between items-center w-full max-w-2xl mb-4">
                  <p className="font-label text-label-sm text-on-surface-variant font-bold">
                    CARD {currentCardIndex + 1} OF {flashcards.length}
                  </p>
                  {showResetConfirm ? (
                    <div className="flex items-center gap-2 bg-red-50 p-1.5 rounded-xl border border-red-100 animate-fade-in">
                      <span className="text-[10px] font-label font-bold text-red-700 uppercase pl-1.5">Reset Progress?</span>
                      <button
                        onClick={handleResetFlashcards}
                        className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-lg text-[10px] font-label font-bold transition-colors"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setShowResetConfirm(false)}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded-lg text-[10px] font-label font-bold transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowResetConfirm(true)}
                      className="text-xs text-red-600 hover:text-red-700 font-label font-bold flex items-center gap-1 hover:underline bg-red-50 px-3 py-1.5 rounded-xl border border-red-100 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">restart_alt</span>
                      Reset Progress
                    </button>
                  )}
                </div>

                {/* Flip Card Container */}
                <div 
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="w-full h-80 cursor-pointer group focus:outline-none mb-8 relative select-none"
                  style={{ perspective: "1000px" }}
                >
                  <div 
                    className="w-full h-full relative rounded-3xl border border-primary/10 transition-transform duration-500 shadow-sm"
                    style={{ 
                      transformStyle: "preserve-3d", 
                      transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" 
                    }}
                  >
                    {/* Front Side */}
                    <div 
                      className="absolute inset-0 bg-white rounded-3xl p-8 flex flex-col justify-between items-center text-center"
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-label font-bold uppercase self-start">
                          {flashcards[currentCardIndex].difficulty}
                        </span>
                        {flashcards[currentCardIndex].sm2 && flashcards[currentCardIndex].sm2!.repetitions > 0 && (
                          <span className="text-slate-400 text-[10px] font-label font-medium uppercase">
                            Interval: {flashcards[currentCardIndex].sm2!.interval}d | Reps: {flashcards[currentCardIndex].sm2!.repetitions}
                          </span>
                        )}
                        {flashcards[currentCardIndex].sm2?.isDue && (
                          <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[9px] font-label font-bold uppercase animate-pulse">
                            Due
                          </span>
                        )}
                      </div>
                      <div className="flex-grow flex items-center justify-center max-w-md">
                        <p className="font-headline text-headline-md font-bold text-on-surface">
                          {flashcards[currentCardIndex].front || flashcards[currentCardIndex].question}
                        </p>
                      </div>
                      <p className="text-label-sm text-primary font-label flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-sm">touch_app</span>
                        Click card to flip
                      </p>
                    </div>

                    {/* Back Side */}
                    <div 
                      className="absolute inset-0 bg-primary/[0.03] rounded-3xl p-8 flex flex-col justify-between items-center text-center"
                      style={{ 
                        backfaceVisibility: "hidden", 
                        transform: "rotateY(180deg)" 
                      }}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-label font-bold uppercase self-start">
                          Answer
                        </span>
                        {flashcards[currentCardIndex].sm2 && (
                          <span className="text-primary/60 text-[10px] font-label font-medium uppercase">
                            EF: {Number(flashcards[currentCardIndex].sm2!.easeFactor).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div className="flex-grow flex items-center justify-center max-w-md">
                        <p className="font-body text-body-lg text-on-surface leading-relaxed">
                          {flashcards[currentCardIndex].back || flashcards[currentCardIndex].answer}
                        </p>
                      </div>
                      <p className="text-label-sm text-slate-500 font-label flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-sm">touch_app</span>
                        Click to view question
                      </p>
                    </div>
                  </div>
                </div>

                {/* Controls and SM2 quality ratings */}
                {isFlipped ? (
                  <div className="w-full max-w-md bg-white p-5 rounded-3xl border border-outline-variant/30 shadow-sm mb-8 flex flex-col items-center gap-3 animate-fade-in">
                    <p className="text-label-sm font-label text-on-surface-variant font-bold uppercase">How well did you recall this?</p>
                    <div className="grid grid-cols-4 gap-2.5 w-full">
                      <button
                        onClick={() => handleRateCard(1)}
                        disabled={submittingReview}
                        className="bg-red-50 hover:bg-red-100 text-red-700 px-3 py-3 rounded-2xl text-xs font-label font-bold flex flex-col items-center gap-1.5 border border-red-200 transition-colors disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-lg">sentiment_very_dissatisfied</span>
                        Forgot
                      </button>
                      <button
                        onClick={() => handleRateCard(3)}
                        disabled={submittingReview}
                        className="bg-orange-50 hover:bg-orange-100 text-orange-700 px-3 py-3 rounded-2xl text-xs font-label font-bold flex flex-col items-center gap-1.5 border border-orange-200 transition-colors disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-lg">sentiment_dissatisfied</span>
                        Hard
                      </button>
                      <button
                        onClick={() => handleRateCard(4)}
                        disabled={submittingReview}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-3 rounded-2xl text-xs font-label font-bold flex flex-col items-center gap-1.5 border border-blue-200 transition-colors disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-lg">sentiment_satisfied</span>
                        Good
                      </button>
                      <button
                        onClick={() => handleRateCard(5)}
                        disabled={submittingReview}
                        className="bg-green-50 hover:bg-green-100 text-green-700 px-3 py-3 rounded-2xl text-xs font-label font-bold flex flex-col items-center gap-1.5 border border-green-200 transition-colors disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-lg">mood</span>
                        Easy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-6 mb-8">
                    <button 
                      onClick={handlePrevCard}
                      className="p-3 bg-white border border-outline-variant/30 rounded-2xl hover:bg-slate-50 transition-colors flex items-center justify-center"
                      title="Previous Card"
                    >
                      <span className="material-symbols-outlined">arrow_back_ios_new</span>
                    </button>
                    <button 
                      onClick={() => setIsFlipped(true)}
                      className="bg-primary text-on-primary hover:brightness-110 px-8 py-3 rounded-full font-label text-label-md transition-colors"
                    >
                      Flip Card
                    </button>
                    <button 
                      onClick={handleNextCard}
                      className="p-3 bg-white border border-outline-variant/30 rounded-2xl hover:bg-slate-50 transition-colors flex items-center justify-center"
                      title="Next Card"
                    >
                      <span className="material-symbols-outlined">arrow_forward_ios</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-body-md text-on-surface-variant italic">No flashcards available for this study guide.</p>
            )}
          </div>
        )}

        {/* Tab 3: Practice Quiz */}
        {activeTab === "quiz" && (
          <div className="max-w-3xl mx-auto space-y-8 pb-12">
            {/* Quiz Results Panel */}
            {quizSubmitted && quizScore !== null && guide.quizQuestions && (
              <div className="bg-primary/5 border border-primary/20 rounded-3xl p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                  <h3 className="font-headline text-headline-md font-bold mb-2">Practice Quiz Completed!</h3>
                  <p className="font-body text-body-md text-on-surface-variant">
                    You scored <strong className="text-primary font-bold text-lg">{quizScore}</strong> out of <strong>{guide.quizQuestions.length}</strong> ({(quizScore / guide.quizQuestions.length * 100).toFixed(0)}%).
                  </p>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={handleResetQuiz}
                    className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-label text-label-md hover:brightness-115 transition-all"
                  >
                    Retry Practice Quiz
                  </button>
                </div>
              </div>
            )}

            {/* Questions List */}
            {guide.quizQuestions && guide.quizQuestions.length > 0 ? (
              <div className="space-y-6">
                {guide.quizQuestions.map((q, qIdx) => {
                  const isSubmitted = submittedQuestions[q.id];
                  const selectedOption = selectedAnswers[q.id];
                  const isCorrect = selectedOption === q.correctAnswerIndex;

                  return (
                    <div key={q.id} className={`glass-card rounded-3xl p-6 md:p-8 ${
                      isSubmitted 
                        ? isCorrect 
                          ? "border-green-300 bg-green-50/10" 
                          : "border-red-300 bg-red-50/10"
                        : ""
                    }`}>
                      <div className="flex justify-between items-start mb-4">
                        <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-label-sm font-label font-bold">
                          Question {qIdx + 1}
                        </span>
                        {isSubmitted && (
                          <span className={`flex items-center gap-1 font-label text-label-sm font-bold ${isCorrect ? "text-green-600" : "text-red-600"}`}>
                            <span className="material-symbols-outlined text-base">
                              {isCorrect ? "check_circle" : "cancel"}
                            </span>
                            {isCorrect ? "CORRECT" : "INCORRECT"}
                          </span>
                        )}
                      </div>

                      <h4 className="font-headline text-body-lg font-bold mb-6 text-on-surface">
                        {q.question}
                      </h4>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {q.options.map((option, oIdx) => {
                          const isSelected = selectedOption === oIdx;
                          const isCorrectAnswer = oIdx === q.correctAnswerIndex;
                          
                          let btnStyle = "bg-slate-50 border-slate-200 text-on-surface-variant hover:bg-slate-100";
                          if (isSelected) {
                            btnStyle = "bg-primary/10 border-primary text-primary font-medium";
                          }
                          if (isSubmitted) {
                            if (isCorrectAnswer) {
                              btnStyle = "bg-green-100 border-green-500 text-green-800 font-bold";
                            } else if (isSelected) {
                              btnStyle = "bg-red-100 border-red-500 text-red-800 font-medium";
                            } else {
                              btnStyle = "bg-slate-50/50 border-slate-100 text-on-surface-variant opacity-60";
                            }
                          }

                          return (
                            <button
                              key={oIdx}
                              disabled={isSubmitted}
                              onClick={() => handleSelectOption(q.id, oIdx)}
                              className={`w-full text-left p-4 border-2 rounded-2xl transition-all font-body text-body-sm flex items-start gap-3 ${btnStyle}`}
                            >
                              <span className="font-label font-bold text-xs uppercase bg-white/80 border border-slate-300 w-6 h-6 rounded-lg flex items-center justify-center shrink-0">
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <span>{option}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation box */}
                      {isSubmitted && (
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 font-body">
                          <p className="text-label-sm text-on-surface-variant font-bold mb-1 uppercase font-label">Explanation</p>
                          <p className="text-body-sm text-on-surface-variant leading-relaxed">
                            {q.explanation}
                          </p>
                        </div>
                      )}

                      {/* Submit single button */}
                      {!isSubmitted && selectedOption !== undefined && !quizSubmitted && (
                        <button
                          onClick={() => handleSubmitQuestion(q.id)}
                          className="mt-2 text-primary hover:text-primary-variant font-label text-label-sm font-bold flex items-center gap-1"
                        >
                          Check Answer
                          <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Submit All Quiz Button */}
                {!quizSubmitted && (
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={handleSubmitAllQuiz}
                      disabled={submittingQuiz}
                      className="bg-primary text-on-primary px-8 py-3 rounded-2xl font-label text-label-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {submittingQuiz ? (
                        <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined">assignment_turned_in</span>
                      )}
                      {submittingQuiz ? "Submitting Quiz..." : "Submit Entire Quiz"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-body-md text-on-surface-variant italic">No quiz questions generated for this guide.</p>
            )}
          </div>
        )}

        {/* Tab 4: Revision Outline */}
        {activeTab === "revision" && (
          <div className="max-w-3xl mx-auto glass-card rounded-3xl p-8 space-y-8 pb-12">
            <div className="border-b border-outline-variant/30 pb-4">
              <h3 className="font-headline text-headline-md font-bold text-on-surface">
                {guide.revisionSheet?.title || `${guide.title} Revision Notes`}
              </h3>
              <p className="font-body text-body-sm text-on-surface-variant">
                Structured outline reference sheets for quick review and memorization.
              </p>
            </div>

            <div className="space-y-8 font-body leading-relaxed">
              {guide.revisionSheet?.sections && guide.revisionSheet.sections.length > 0 ? (
                guide.revisionSheet.sections.map((section, sIdx) => (
                  <div key={section.id || sIdx} className="space-y-3">
                    <h4 className="font-headline text-body-lg font-bold text-primary flex items-center gap-2 border-l-4 border-secondary pl-3">
                      {section.heading}
                    </h4>
                    <ul className="pl-6 space-y-2 list-disc text-on-surface-variant text-body-md">
                      {section.bulletPoints.map((point, pIdx) => (
                        <li key={pIdx}>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <p className="text-body-md text-on-surface-variant italic">No revision notes available.</p>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Mind Map */}
        {activeTab === "mindmap" && guide.content?.topicHierarchy && (
          <MindMapView
            subject={guide.subject || guide.content.metadata?.subject || "Study Guide"}
            topicHierarchy={guide.content.topicHierarchy}
          />
        )}

        {/* Tab 6: Study Plan */}
        {activeTab === "studyplan" && (
          <StudyPlanView
            guideId={guide.id}
            topics={guide.content?.topics || []}
            examDate={examDate}
            setExamDate={setExamDate}
            studyPlan={studyPlan}
            setStudyPlan={setStudyPlan}
            loadingPlan={loadingPlan}
            setLoadingPlan={setLoadingPlan}
            planError={planError}
            setPlanError={setPlanError}
          />
        )}
      </main>
    </div>
  );
}

/* ── Study Plan Component ────────────────────────────────────────────────── */

interface StudyPlanViewProps {
  guideId: string;
  topics: string[];
  examDate: string;
  setExamDate: (v: string) => void;
  studyPlan: any | null;
  setStudyPlan: (v: any) => void;
  loadingPlan: boolean;
  setLoadingPlan: (v: boolean) => void;
  planError: string | null;
  setPlanError: (v: string | null) => void;
}

const SESSION_TYPE_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  STUDY:      { bg: "bg-primary/10",    text: "text-primary",   icon: "menu_book" },
  REVIEW:     { bg: "bg-secondary/10",  text: "text-secondary", icon: "replay" },
  QUIZ:       { bg: "bg-tertiary/10",   text: "text-tertiary",  icon: "quiz" },
  FLASHCARDS: { bg: "bg-green-500/10",  text: "text-green-600", icon: "style" },
};

function StudyPlanView({
  guideId, examDate, setExamDate,
  studyPlan, setStudyPlan, loadingPlan, setLoadingPlan, planError, setPlanError,
}: StudyPlanViewProps) {
  const today = new Date();
  const minDate = new Date(today.getTime() + 2 * 86400000).toISOString().split("T")[0];

  const generatePlan = async () => {
    if (!examDate) { setPlanError("Please pick your exam date first."); return; }
    setPlanError(null);
    setLoadingPlan(true);
    try {
      const { api } = await import("../lib/axios");
      const { data } = await api.get(`/v1/planner/suggest`, {
        params: { guideId, examDate },
      });
      setStudyPlan(data);
    } catch (err: any) {
      setPlanError(err.response?.data?.error?.message || "Failed to generate study plan. Please try again.");
    } finally {
      setLoadingPlan(false);
    }
  };

  const formatDay = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const totalSessions = studyPlan?.suggestedPlan?.reduce((sum: number, day: any) => sum + (day.sessions?.length || 0), 0) || 0;
  const totalMins = studyPlan?.suggestedPlan?.reduce((sum: number, day: any) =>
    sum + (day.sessions?.reduce((s: number, sess: any) => s + (sess.durationMinutes || 0), 0) || 0), 0) || 0;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-primary text-2xl">calendar_month</span>
        </div>
        <div>
          <h3 className="font-headline text-headline-md font-bold text-on-surface">AI Study Plan</h3>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Enter your exam date and let AI build a personalised 7-day schedule targeting your weak areas.
          </p>
        </div>
      </div>

      {/* Exam Date Input */}
      <div className="glass-card rounded-3xl p-6 border border-outline-variant/30 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-label-md font-label font-semibold text-on-surface-variant mb-2">
              Exam Date
            </label>
            <input
              type="date"
              min={minDate}
              value={examDate}
              onChange={e => setExamDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-outline-variant bg-surface-container-low focus:border-primary focus:bg-surface-container outline-none font-body text-on-surface transition-all"
            />
          </div>
          <button
            onClick={generatePlan}
            disabled={loadingPlan || !examDate}
            className="px-6 py-3.5 bg-gradient-to-r from-primary to-secondary text-on-primary rounded-xl font-bold flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
          >
            {loadingPlan ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Generating...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                Generate Plan
              </>
            )}
          </button>
        </div>
        {planError && (
          <p className="mt-3 text-label-sm text-red-500 flex items-center gap-1 font-label">
            <span className="material-symbols-outlined text-sm">error</span>
            {planError}
          </p>
        )}
      </div>

      {/* Plan Result */}
      {studyPlan && (
        <div className="space-y-6 animate-in">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Days Until Exam", value: studyPlan.daysUntilExam ?? "—", icon: "event", color: "text-primary" },
              { label: "Total Sessions",  value: totalSessions, icon: "checklist", color: "text-secondary" },
              { label: "Total Study Time", value: `${Math.round(totalMins / 60)}h ${totalMins % 60}m`, icon: "schedule", color: "text-tertiary" },
            ].map(s => (
              <div key={s.label} className="glass-card rounded-2xl p-4 text-center border border-outline-variant/30">
                <span className={`material-symbols-outlined ${s.color} mb-1`}>{s.icon}</span>
                <p className={`font-headline text-headline-md font-bold ${s.color}`}>{s.value}</p>
                <p className="text-label-sm text-on-surface-variant font-label">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Rationale */}
          {studyPlan.rationale && (
            <div className="glass-card rounded-2xl p-5 border border-primary/20 bg-primary/[0.02] flex gap-4">
              <span className="material-symbols-outlined text-primary text-2xl mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
              <div>
                <p className="text-label-md font-label font-bold text-primary mb-1">AI Rationale</p>
                <p className="text-body-sm text-on-surface-variant font-body leading-relaxed">{studyPlan.rationale}</p>
              </div>
            </div>
          )}

          {/* Day-by-Day Schedule */}
          <div className="space-y-4">
            {(studyPlan.suggestedPlan || []).map((day: any, di: number) => (
              <div key={di} className="glass-card rounded-2xl border border-outline-variant/30 overflow-hidden">
                {/* Day Header */}
                <div className="bg-surface-container px-5 py-3 flex items-center justify-between border-b border-outline-variant/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center text-label-md font-bold font-label">
                      {di + 1}
                    </div>
                    <span className="font-label text-label-lg font-bold text-on-surface">{formatDay(day.day)}</span>
                  </div>
                  <span className="text-label-sm text-on-surface-variant font-label">
                    {day.sessions?.length || 0} session{(day.sessions?.length || 0) !== 1 ? "s" : ""}
                  </span>
                </div>
                {/* Sessions */}
                <div className="p-4 space-y-2">
                  {(day.sessions || []).map((sess: any, si: number) => {
                    const cfg = SESSION_TYPE_COLORS[sess.type] || SESSION_TYPE_COLORS.STUDY;
                    return (
                      <div key={si} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${cfg.bg} border border-transparent`}>
                        <span className={`material-symbols-outlined ${cfg.text} text-lg`}>{cfg.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-body-md font-semibold text-on-surface truncate">{sess.topic}</p>
                          <p className={`text-label-sm font-label ${cfg.text} font-bold`}>{sess.type}</p>
                        </div>
                        <span className="text-label-sm text-on-surface-variant font-label whitespace-nowrap">
                          {sess.durationMinutes} min
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Regenerate */}
          <div className="text-center pt-2">
            <button
              onClick={generatePlan}
              className="text-label-sm text-primary font-label font-bold hover:underline flex items-center gap-1 mx-auto"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Regenerate Plan
            </button>
          </div>
        </div>
      )}

      {/* Empty state before generating */}
      {!studyPlan && !loadingPlan && (
        <div className="text-center py-16 text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl opacity-30 mb-3">event_note</span>
          <p className="font-label text-label-lg font-semibold opacity-50">Pick your exam date above to get started</p>
          <p className="text-body-sm opacity-30 mt-1">AI will build a personalised schedule based on your topics</p>
        </div>
      )}
    </div>
  );
}

/* ── Mind Map Component ─────────────────────────────────────────────────── */

interface MindMapViewProps {
  subject: string;
  topicHierarchy: TopicHierarchyItem[];
}

function MindMapView({ subject, topicHierarchy }: MindMapViewProps) {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(topicHierarchy.map(t => t.topic)));

  const toggleExpand = (topic: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });
  };

  const topics = topicHierarchy.slice(0, 8); // max 8 main topics for readability
  const centerX = 500;
  const centerY = 350;
  const orbitRadius = 220;
  const subOrbitRadius = 95;

  // Assign colors per topic
  const topicColors = [
    "#4F46E5", "#7C3AED", "#2563EB", "#059669",
    "#D97706", "#DC2626", "#0891B2", "#9333EA"
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-headline text-headline-md font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">account_tree</span>
            Mind Map
          </h3>
          <p className="text-body-sm text-on-surface-variant mt-1">Click topics to expand/collapse subtopics. Click nodes to highlight.</p>
        </div>
        <button
          onClick={() => setExpanded(new Set(topics.map(t => t.topic)))}
          className="text-label-sm text-primary font-label font-bold hover:underline flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">unfold_more</span>
          Expand All
        </button>
      </div>

      <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-3xl border border-outline-variant/30 p-4 overflow-hidden">
        <svg
          viewBox="0 0 1000 700"
          className="w-full h-auto"
          style={{ minHeight: 400 }}
        >
          <defs>
            {topicColors.map((color, i) => (
              <radialGradient key={i} id={`tg-${i}`} cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor={color} stopOpacity="0.9" />
                <stop offset="100%" stopColor={color} stopOpacity="0.7" />
              </radialGradient>
            ))}
            <radialGradient id="center-gradient" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#4F46E5" />
              <stop offset="100%" stopColor="#7C3AED" />
            </radialGradient>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* Draw connector lines first (behind nodes) */}
          {topics.map((topicNode, i) => {
            const angle = (i / topics.length) * 2 * Math.PI - Math.PI / 2;
            const tx = centerX + orbitRadius * Math.cos(angle);
            const ty = centerY + orbitRadius * Math.sin(angle);
            const color = topicColors[i % topicColors.length];
            const isExpanded = expanded.has(topicNode.topic);

            return (
              <g key={`lines-${i}`}>
                {/* Center to topic line */}
                <line
                  x1={centerX} y1={centerY}
                  x2={tx} y2={ty}
                  stroke={color}
                  strokeWidth="2"
                  strokeOpacity="0.5"
                  strokeDasharray={isExpanded ? "none" : "6,4"}
                />
                {/* Subtopic lines */}
                {isExpanded && topicNode.subtopics.slice(0, 5).map((_, j) => {
                  const subCount = Math.min(topicNode.subtopics.length, 5);
                  const spread = Math.PI * 0.7;
                  const subAngle = angle + (j - (subCount - 1) / 2) * (spread / Math.max(subCount - 1, 1));
                  const sx = tx + subOrbitRadius * Math.cos(subAngle);
                  const sy = ty + subOrbitRadius * Math.sin(subAngle);
                  return (
                    <line
                      key={`sub-line-${j}`}
                      x1={tx} y1={ty}
                      x2={sx} y2={sy}
                      stroke={color}
                      strokeWidth="1.5"
                      strokeOpacity="0.35"
                    />
                  );
                })}
              </g>
            );
          })}

          {/* Subtopic nodes */}
          {topics.map((topicNode, i) => {
            const angle = (i / topics.length) * 2 * Math.PI - Math.PI / 2;
            const tx = centerX + orbitRadius * Math.cos(angle);
            const ty = centerY + orbitRadius * Math.sin(angle);
            const color = topicColors[i % topicColors.length];
            const isExpanded = expanded.has(topicNode.topic);

            return isExpanded ? topicNode.subtopics.slice(0, 5).map((sub, j) => {
              const subCount = Math.min(topicNode.subtopics.length, 5);
              const spread = Math.PI * 0.7;
              const subAngle = angle + (j - (subCount - 1) / 2) * (spread / Math.max(subCount - 1, 1));
              const sx = tx + subOrbitRadius * Math.cos(subAngle);
              const sy = ty + subOrbitRadius * Math.sin(subAngle);
              const isSelected = selectedTopic === sub;
              const maxChars = 14;
              const label = sub.length > maxChars ? sub.slice(0, maxChars) + "…" : sub;

              return (
                <g
                  key={`sub-${i}-${j}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedTopic(isSelected ? null : sub)}
                >
                  <circle
                    cx={sx} cy={sy} r={28}
                    fill={isSelected ? color : "white"}
                    stroke={color}
                    strokeWidth="2"
                    filter="url(#shadow)"
                  />
                  <text
                    x={sx} y={sy - 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="8"
                    fontWeight="600"
                    fill={isSelected ? "white" : color}
                    fontFamily="system-ui, sans-serif"
                  >
                    {label.split(" ").map((word, wi) => (
                      <tspan key={wi} x={sx} dy={wi === 0 ? 0 : 10}>{word}</tspan>
                    ))}
                  </text>
                </g>
              );
            }) : null;
          })}

          {/* Main topic nodes */}
          {topics.map((topicNode, i) => {
            const angle = (i / topics.length) * 2 * Math.PI - Math.PI / 2;
            const tx = centerX + orbitRadius * Math.cos(angle);
            const ty = centerY + orbitRadius * Math.sin(angle);
            const color = topicColors[i % topicColors.length];
            const isSelected = selectedTopic === topicNode.topic;
            const isExpanded = expanded.has(topicNode.topic);
            const maxChars = 16;
            const label = topicNode.topic.length > maxChars ? topicNode.topic.slice(0, maxChars) + "…" : topicNode.topic;

            return (
              <g
                key={`topic-${i}`}
                style={{ cursor: "pointer" }}
                onClick={() => {
                  setSelectedTopic(isSelected ? null : topicNode.topic);
                  toggleExpand(topicNode.topic);
                }}
              >
                <circle
                  cx={tx} cy={ty} r={42}
                  fill={`url(#tg-${i % topicColors.length})`}
                  filter="url(#shadow)"
                  stroke={isSelected ? "white" : "none"}
                  strokeWidth="3"
                  opacity={isExpanded ? 1 : 0.75}
                />
                <text
                  textAnchor="middle"
                  fontFamily="system-ui, sans-serif"
                  fill="white"
                  fontWeight="700"
                >
                  {label.split(" ").map((word, wi, arr) => (
                    <tspan
                      key={wi}
                      x={tx}
                      dy={wi === 0 ? `${-(arr.length - 1) * 5}` : "11"}
                      fontSize="9.5"
                    >
                      {word}
                    </tspan>
                  ))}
                </text>
                {/* Subtopic count badge */}
                {topicNode.subtopics.length > 0 && (
                  <g>
                    <circle cx={tx + 30} cy={ty - 30} r={12} fill="white" stroke={color} strokeWidth="1.5" />
                    <text x={tx + 30} y={ty - 30} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill={color} fontWeight="700">
                      {topicNode.subtopics.length}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Center node */}
          <g style={{ cursor: "default" }}>
            <circle cx={centerX} cy={centerY} r={60} fill="url(#center-gradient)" filter="url(#shadow)" />
            <circle cx={centerX} cy={centerY} r={55} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
            <text
              textAnchor="middle"
              fontFamily="system-ui, sans-serif"
              fill="white"
              fontWeight="700"
            >
              {subject.split(" ").slice(0, 3).map((word, wi, arr) => (
                <tspan
                  key={wi}
                  x={centerX}
                  dy={wi === 0 ? `${-(arr.length - 1) * 7}` : "14"}
                  fontSize={arr.length > 1 ? "11" : "13"}
                >
                  {word}
                </tspan>
              ))}
            </text>
          </g>
        </svg>
      </div>

      {/* Selected topic details panel */}
      {selectedTopic && (() => {
        const found = topicHierarchy.find(t => t.topic === selectedTopic || t.subtopics.includes(selectedTopic));
        const isMainTopic = topicHierarchy.some(t => t.topic === selectedTopic);
        const mainTopic = isMainTopic ? topicHierarchy.find(t => t.topic === selectedTopic) : found;
        return (
          <div className="mt-4 glass-card p-6 rounded-2xl border border-primary/20 bg-primary/[0.02] animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-headline text-body-lg font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined">hub</span>
                {selectedTopic}
              </h4>
              <button onClick={() => setSelectedTopic(null)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {mainTopic && mainTopic.subtopics.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {mainTopic.subtopics.map((sub, i) => (
                  <span key={i} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-label-sm font-label">{sub}</span>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
