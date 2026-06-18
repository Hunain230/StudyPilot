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
  const [activeTab, setActiveTab] = useState<"summary" | "flashcards" | "quiz" | "revision">("summary");

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
        <button
          onClick={() => setActiveTab("flashcards")}
          className={`px-5 py-3 font-label text-label-md border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "flashcards" ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-base">style</span>
          Flashcards ({flashcards.length})
        </button>
        <button
          onClick={() => setActiveTab("quiz")}
          className={`px-5 py-3 font-label text-label-md border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "quiz" ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-base">quiz</span>
          Practice Quiz ({guide.quizQuestions?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("revision")}
          className={`px-5 py-3 font-label text-label-md border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "revision" ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-base">list_alt</span>
          Revision Notes
        </button>
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
      </main>
    </div>
  );
}
