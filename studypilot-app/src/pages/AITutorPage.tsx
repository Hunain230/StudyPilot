import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { guideService } from "../services/guide.service";
import { tutorService } from "../services/tutor.service";
import type { TutorHistoryMessage, TutorSource } from "../services/tutor.service";

interface GuideOption {
  id: string;
  title: string;
  subject: string | null;
  status: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  sources?: TutorSource[];
  mode?: "web" | "web_with_guide";
}

const suggestedPrompts = [
  "Explain this topic like I am preparing for an exam.",
  "Give me a quick example and common mistakes.",
  "Compare the current web explanation with my guide.",
  "Make a 5-minute revision checklist for this.",
];

function MascotAvatar() {
  return (
    <div className="relative w-24 h-24 rounded-[28px] bg-[#ffd84d] border-4 border-white shadow-xl shadow-primary/10 flex items-center justify-center overflow-hidden">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-14 h-5 bg-[#3a4658] rounded-full" />
      <div className="absolute top-5 left-1/2 -translate-x-1/2 flex gap-1">
        <div className="w-9 h-9 rounded-full bg-slate-300 border-[5px] border-[#3a4658] flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-on-surface" />
        </div>
        <div className="w-9 h-9 rounded-full bg-slate-300 border-[5px] border-[#3a4658] flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-on-surface" />
        </div>
      </div>
      <div className="absolute bottom-8 w-9 h-4 rounded-b-full border-b-4 border-on-surface" />
      <div className="absolute bottom-0 h-7 w-full bg-primary" />
      <div className="absolute bottom-2 flex gap-6">
        <div className="w-3 h-3 rounded-full bg-[#ffd84d]" />
        <div className="w-3 h-3 rounded-full bg-[#ffd84d]" />
      </div>
    </div>
  );
}

function renderAnswer(text: string) {
  const lines = text.split("\n");
  const elements = [];
  let listItems: string[] = [];
  let orderedItems: string[] = [];
  let paragraphLines: string[] = [];

  const renderInline = (value: string) => {
    const parts = value.replace(/`([^`]+)`/g, "$1").split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part.replace(/\*/g, "");
    });
  };

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    elements.push(
      <p key={`p-${elements.length}`} className="leading-relaxed">
        {renderInline(paragraphLines.join(" "))}
      </p>
    );
    paragraphLines = [];
  };

  const flushLists = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc pl-5 space-y-1">
          {listItems.map((item, index) => (
            <li key={index}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }

    if (orderedItems.length > 0) {
      elements.push(
        <ol key={`ol-${elements.length}`} className="list-decimal pl-5 space-y-1">
          {orderedItems.map((item, index) => (
            <li key={index}>{renderInline(item)}</li>
          ))}
        </ol>
      );
      orderedItems = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushLists();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushLists();
      const level = headingMatch[1].length;
      elements.push(
        <h4
          key={`h-${elements.length}`}
          className={`font-headline font-bold text-on-surface ${level <= 2 ? "text-body-lg" : "text-body-md"}`}
        >
          {renderInline(headingMatch[2])}
        </h4>
      );
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      orderedItems = [];
      listItems.push(bulletMatch[1]);
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      flushParagraph();
      listItems = [];
      orderedItems.push(orderedMatch[1]);
      continue;
    }

    flushLists();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushLists();

  return elements;
}

function formatHistory(messages: TutorHistoryMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
  }));
}

export default function AITutorPage() {
  const [guides, setGuides] = useState<GuideOption[]>([]);
  const [selectedGuideId, setSelectedGuideId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const selectedGuide = useMemo(
    () => guides.find((guide) => guide.id === selectedGuideId),
    [guides, selectedGuideId]
  );

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const [guideData, historyData] = await Promise.all([
          guideService.getAll(),
          tutorService.getTutorHistory(),
        ]);

        const readyGuides = (guideData || []).filter((guide: GuideOption) => guide.status === "ready");
        setGuides(readyGuides);
        setMessages(formatHistory(historyData || []));
      } catch (err: any) {
        console.error(err);
        setError("Failed to load AI Tutor. Please refresh and try again.");
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setError(null);
        const history = await tutorService.getTutorHistory({ guideId: selectedGuideId || null });
        setMessages(formatHistory(history || []));
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.error?.message || "Could not load tutor history for this guide.");
      }
    };

    if (!loading) {
      loadHistory();
    }
  }, [selectedGuideId, loading]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const sendQuestion = async (text = question) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setSending(true);
    setError(null);

    try {
      const response = await tutorService.askTutor({
        question: trimmed,
        guideId: selectedGuideId || null,
      });

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.answer,
        createdAt: new Date().toISOString(),
        sources: response.sources,
        mode: response.mode,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error?.message || "AI Tutor could not answer right now.");
      setMessages((prev) => prev.filter((message) => message.id !== userMessage.id));
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    sendQuestion();
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center py-24">
        <span className="material-symbols-outlined animate-spin text-primary text-5xl">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-surface-container-lowest border border-outline-variant/50 p-6 md:p-8 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-secondary to-[#ffd84d]" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <MascotAvatar />
            <div>
              <p className="text-label-sm font-label text-secondary uppercase tracking-wider mb-1">Web-first study companion</p>
              <h2 className="font-headline text-headline-lg font-bold text-on-surface">AI Tutor</h2>
              <p className="text-body-md text-on-surface-variant max-w-2xl">
                Ask anything. I search the web first, then connect the answer to your selected guide when it helps.
              </p>
            </div>
          </div>

          <div className="w-full lg:w-80">
            <label className="text-label-sm font-label text-on-surface-variant block mb-2">Reference Guide</label>
            <select
              value={selectedGuideId}
              onChange={(event) => setSelectedGuideId(event.target.value)}
              className="w-full bg-[#F1F5F9] border-transparent focus:border-primary border-2 rounded-2xl py-3 px-4 outline-none font-body text-on-surface"
            >
              <option value="">Web only</option>
              {guides.map((guide) => (
                <option key={guide.id} value={guide.id}>
                  {guide.title}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-on-surface-variant mt-2">
              {selectedGuide ? `Secondary context: ${selectedGuide.subject || "General"}` : "No guide selected. Answers use live web search only."}
            </p>
          </div>
        </div>
      </section>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-200/50 font-body font-medium">
          {error}
        </div>
      )}

      <section className="grid grid-cols-12 gap-6 items-start">
        <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-3xl border border-outline-variant/50 shadow-sm overflow-hidden">
          <div className="h-[560px] overflow-y-auto p-5 md:p-6 space-y-5">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="w-20 h-20 rounded-3xl bg-primary-fixed text-primary flex items-center justify-center mb-5">
                  <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>travel_explore</span>
                </div>
                <h3 className="font-headline text-headline-md font-bold text-on-surface mb-2">What are we studying today?</h3>
                <p className="text-body-md text-on-surface-variant max-w-md">
                  Try asking for a simple explanation, exam-focused breakdown, examples, or how your guide connects to the latest web material.
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[86%] rounded-3xl px-5 py-4 ${
                      message.role === "user"
                        ? "bg-primary text-on-primary rounded-br-md"
                        : "bg-surface-container-low text-on-surface border border-outline-variant/40 rounded-bl-md"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div className="space-y-3 text-body-sm">{renderAnswer(message.content)}</div>
                    ) : (
                      <p className="text-body-sm leading-relaxed">{message.content}</p>
                    )}

                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-outline-variant/30 flex flex-wrap gap-2">
                        {message.sources.slice(0, 6).map((source, index) => (
                          source.url ? (
                            <a
                              key={`${source.title}-${index}`}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-primary text-[11px] font-label hover:bg-primary-fixed transition-colors max-w-[220px]"
                              title={source.title}
                            >
                              <span className="material-symbols-outlined text-sm">open_in_new</span>
                              <span className="truncate">{source.title}</span>
                            </a>
                          ) : (
                            <span
                              key={`${source.title}-${index}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-fixed/60 text-secondary text-[11px] font-label max-w-[220px]"
                              title={source.title}
                            >
                              <span className="material-symbols-outlined text-sm">auto_stories</span>
                              <span className="truncate">{source.title}</span>
                            </span>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-surface-container-low border border-outline-variant/40 rounded-3xl rounded-bl-md px-5 py-4 flex items-center gap-3">
                  <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                  <span className="text-body-sm text-on-surface-variant">Searching the web and thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSubmit} className="border-t border-outline-variant/40 p-4 bg-white/70">
            <div className="flex gap-3">
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                className="flex-1 bg-[#F1F5F9] focus:bg-white border-transparent focus:border-primary border-2 rounded-2xl py-3 px-4 outline-none font-body text-on-surface"
                placeholder="Ask AI Tutor a question..."
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !question.trim()}
                className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center hover:opacity-90 disabled:opacity-50 transition-all active:scale-95"
                title="Send"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </form>
        </div>

        <aside className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/50 shadow-sm">
            <h3 className="font-headline text-headline-md font-bold text-on-surface flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary">bolt</span>
              Quick Prompts
            </h3>
            <div className="space-y-3">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendQuestion(prompt)}
                  disabled={sending}
                  className="w-full text-left p-3 rounded-2xl bg-surface-container-low hover:bg-primary-fixed/70 text-body-sm text-on-surface transition-colors disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-primary text-on-primary rounded-3xl p-6 relative overflow-hidden">
            <span className="material-symbols-outlined absolute -right-4 -top-4 text-[120px] opacity-10">public</span>
            <p className="font-label text-label-sm uppercase tracking-wider mb-2">Source Priority</p>
            <h3 className="font-headline text-headline-md font-bold mb-3">Web first, guide second</h3>
            <p className="text-body-sm text-on-primary/80">
              Current search results drive the answer. Your guide helps personalize the explanation when selected.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
