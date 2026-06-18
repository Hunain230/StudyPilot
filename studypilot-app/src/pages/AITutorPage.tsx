import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useOutletContext } from "react-router-dom";
import type { UserProfile } from "../components/layout/DashboardLayout";
import { guideService } from "../services/guide.service";
import { tutorService } from "../services/tutor.service";
import type {
  TutorAskMode,
  TutorHistoryMessage,
  TutorMode,
  TutorSource,
} from "../services/tutor.service";

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
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
  mode?: TutorMode;
  liked?: boolean;
  disliked?: boolean;
}

interface HistoryConvo {
  id: string;
  title: string;
  time: string;
  group: "Today" | "Yesterday" | "Last Week";
  pinned?: boolean;
}

interface TutorLayoutContext {
  user: UserProfile;
  isMaximized: boolean;
  setIsMaximized: (value: boolean) => void;
}

/* ─────────────────────────────────────────
   Mock history data (replace with API)
───────────────────────────────────────── */
const MOCK_HISTORY: HistoryConvo[] = [
  { id: "h1", title: "Linked List Explanation", time: "2h ago", group: "Today", pinned: true },
  { id: "h2", title: "Operating Systems Notes", time: "4h ago", group: "Today" },
  { id: "h3", title: "SQL Triggers Guide", time: "6h ago", group: "Today" },
  { id: "h4", title: "AI Lab Preparation", time: "Yesterday", group: "Yesterday" },
  { id: "h5", title: "ANN Practice Questions", time: "Yesterday", group: "Yesterday" },
  { id: "h6", title: "DSA Revision", time: "Yesterday", group: "Yesterday" },
  { id: "h7", title: "Database Final Revision", time: "5 days ago", group: "Last Week" },
  { id: "h8", title: "OS MCQs Practice", time: "6 days ago", group: "Last Week" },
  { id: "h9", title: "Calculus Practice", time: "7 days ago", group: "Last Week" },
];

const ACTION_CHIPS = [
  { icon: "school", label: "Explain Topic" },
  { icon: "quiz", label: "Generate Quiz" },
  { icon: "style", label: "Flashcards" },
  { icon: "event_note", label: "Study Plan" },
  { icon: "summarize", label: "Summarize Notes" },
  { icon: "terminal", label: "Coding Problem" },
  { icon: "help_outline", label: "Practice Questions" },
  { icon: "list_alt", label: "Generate MCQs" },
];

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
function formatHistory(messages: TutorHistoryMessage[]): ChatMessage[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt,
  }));
}

/* ─────────────────────────────────────────
   CodeBlock
───────────────────────────────────────── */
function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const label = language?.trim() || "code";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const download = () => {
    const ext: Record<string, string> = {
      javascript: "js", typescript: "ts", python: "py",
      java: "java", cpp: "cpp", c: "c", html: "html", css: "css",
    };
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `snippet.${ext[label] ?? "txt"}`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="sp-code-block my-3 overflow-hidden rounded-2xl border border-white/[0.06] shadow-lg">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]" style={{ background: "rgba(15,17,22,0.9)" }}>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-white/30 ml-1">{label}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={download}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
            title="Download"
          >
            <span className="material-symbols-outlined text-[13px]">download</span>
          </button>
          <button
            onClick={copy}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
            title="Copy"
          >
            <span className="material-symbols-outlined text-[13px]">{copied ? "check" : "content_copy"}</span>
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>
      <pre
        className="overflow-auto p-5 text-[13px] leading-relaxed font-mono text-emerald-300 max-h-[440px]"
        style={{ background: "rgba(10,12,16,0.97)" }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

/* ─────────────────────────────────────────
   Markdown renderer
───────────────────────────────────────── */
function renderAnswer(text: string) {
  const lines = text.split("\n");
  const elements: ReactNode[] = [];
  let listItems: string[] = [];
  let orderedItems: string[] = [];
  let paragraphLines: string[] = [];
  let codeBlock: { language?: string; lines: string[] } | null = null;

  const renderInline = (value: string) => {
    const parts = value.replace(/`([^`]+)`/g, "$1").split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={i} className="font-semibold text-on-surface">{part.slice(2, -2)}</strong>;
      return part.replace(/\*/g, "");
    });
  };

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    elements.push(
      <p key={`p-${elements.length}`} className="leading-[1.75] text-on-surface/85">
        {renderInline(paragraphLines.join(" "))}
      </p>
    );
    paragraphLines = [];
  };

  const flushLists = () => {
    if (listItems.length) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc pl-5 space-y-1.5 text-on-surface/85">
          {listItems.map((item, i) => <li key={i} className="leading-relaxed">{renderInline(item)}</li>)}
        </ul>
      );
      listItems = [];
    }
    if (orderedItems.length) {
      elements.push(
        <ol key={`ol-${elements.length}`} className="list-decimal pl-5 space-y-1.5 text-on-surface/85">
          {orderedItems.map((item, i) => <li key={i} className="leading-relaxed">{renderInline(item)}</li>)}
        </ol>
      );
      orderedItems = [];
    }
  };

  for (const rawLine of lines) {
    const fence = rawLine.match(/^```\s*([\w.+-]*)\s*$/);
    if (fence) {
      if (codeBlock) {
        elements.push(<CodeBlock key={`code-${elements.length}`} code={codeBlock.lines.join("\n")} language={codeBlock.language} />);
        codeBlock = null;
      } else {
        flushParagraph(); flushLists();
        codeBlock = { language: fence[1] || undefined, lines: [] };
      }
      continue;
    }
    if (codeBlock) { codeBlock.lines.push(rawLine); continue; }

    const line = rawLine.trim();
    if (!line) { flushParagraph(); flushLists(); continue; }

    const hm = line.match(/^(#{1,6})\s+(.+)$/);
    if (hm) {
      flushParagraph(); flushLists();
      const level = hm[1].length;
      elements.push(
        <h4 key={`h-${elements.length}`} className={`font-semibold text-on-surface ${level <= 2 ? "text-[15px]" : "text-[13px]"} mt-3 mb-1`}>
          {renderInline(hm[2])}
        </h4>
      );
      continue;
    }

    const bm = line.match(/^[-*]\s+(.+)$/);
    if (bm) { flushParagraph(); orderedItems = []; listItems.push(bm[1]); continue; }
    const om = line.match(/^\d+\.\s+(.+)$/);
    if (om) { flushParagraph(); listItems = []; orderedItems.push(om[1]); continue; }

    flushLists();
    paragraphLines.push(line);
  }

  flushParagraph(); flushLists();
  if (codeBlock) elements.push(<CodeBlock key={`code-${elements.length}`} code={codeBlock.lines.join("\n")} language={codeBlock.language} />);
  return elements;
}

/* ─────────────────────────────────────────
   TypingDots
───────────────────────────────────────── */
function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-primary/60"
          style={{ animation: `sp-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────
   ModeDropdown
───────────────────────────────────────── */
function ModeDropdown({ value, onChange }: { value: TutorAskMode; onChange: (v: TutorAskMode) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const options = [
    { value: "web" as TutorAskMode, label: "Web Search", icon: "public", desc: "Live internet results" },
    { value: "simple" as TutorAskMode, label: "Simple", icon: "psychology", desc: "Quick answers, no search" },
  ];
  const cur = options.find((o) => o.value === value)!;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="sp-pill-btn flex items-center gap-1.5"
      >
        <span className="material-symbols-outlined text-[15px]">{cur.icon}</span>
        <span>{cur.label}</span>
        <span className="material-symbols-outlined text-[13px] opacity-50" style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }}>
          keyboard_arrow_down
        </span>
      </button>

      {open && (
        <div className="sp-dropdown absolute bottom-full left-0 mb-2 w-52">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${value === opt.value ? "text-primary" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"}`}
            >
              <span className="material-symbols-outlined text-[17px]">{opt.icon}</span>
              <div className="flex-1">
                <p className="text-[13px] font-medium">{opt.label}</p>
                <p className="text-[11px] opacity-50">{opt.desc}</p>
              </div>
              {value === opt.value && <span className="material-symbols-outlined text-[14px]">check</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   GuideDropdown
───────────────────────────────────────── */
function GuideDropdown({ guides, value, onChange }: { guides: GuideOption[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const selected = guides.find((g) => g.id === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="sp-pill-btn flex items-center gap-1.5 max-w-[160px]"
      >
        <span className="material-symbols-outlined text-[15px]">auto_stories</span>
        <span className="truncate">{selected ? selected.title : "No guide"}</span>
        <span className="material-symbols-outlined text-[13px] opacity-50 flex-shrink-0" style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }}>
          keyboard_arrow_down
        </span>
      </button>

      {open && (
        <div className="sp-dropdown absolute bottom-full left-0 mb-2 w-64 max-h-60 overflow-y-auto">
          <div className="px-3 py-2 border-b border-white/[0.06]">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/50">Guide Context</p>
          </div>
          {[{ id: "", title: "No guide context" }, ...guides].map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => { onChange(g.id); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${value === g.id ? "text-primary" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"}`}
            >
              <span className="material-symbols-outlined text-[15px]">{g.id ? "description" : "block"}</span>
              <span className="text-[13px] font-medium truncate">{g.title}</span>
              {value === g.id && <span className="material-symbols-outlined text-[13px] ml-auto flex-shrink-0">check</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   ChatHistorySidebar
───────────────────────────────────────── */
function ChatHistorySidebar({
  open,
  onClose,
  activeId,
  onSelect,
  searchQuery,
  onSearchChange,
}: {
  open: boolean;
  onClose: () => void;
  activeId: string | null;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (v: string) => void;
}) {
  const [pinned, setPinned] = useState<Set<string>>(new Set(["h1"]));
  const filtered = MOCK_HISTORY.filter((h) =>
    h.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const groups = ["Today", "Yesterday", "Last Week"] as const;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px] transition-opacity lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <aside
        className={`sp-history-sidebar ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-6 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/40">Conversations</p>
              <h3 className="text-[13px] font-bold text-on-surface leading-none mt-0.5">Chat History</h3>
            </div>
          </div>
          <button onClick={onClose} className="sp-icon-btn opacity-60 hover:opacity-100" title="Close">
            <span className="material-symbols-outlined text-[17px]">close</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-surface-container-low border border-outline-variant/10 focus-within:border-outline-variant/25 transition-colors">
            <span className="material-symbols-outlined text-[15px] text-on-surface-variant/40">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-transparent text-[13px] text-on-surface placeholder:text-on-surface-variant/35 outline-none"
            />
            {searchQuery && (
              <button onClick={() => onSearchChange("")} className="text-on-surface-variant/40 hover:text-on-surface-variant transition-colors">
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Pinned */}
        {!searchQuery && (
          <div className="px-3 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/35 mb-1 px-2">Pinned</p>
            {MOCK_HISTORY.filter((h) => pinned.has(h.id)).map((h) => (
              <HistoryItem key={h.id} item={h} active={activeId === h.id} onSelect={onSelect} pinned onPin={() => { const n = new Set(pinned); n.delete(h.id); setPinned(n); }} />
            ))}
          </div>
        )}

        {/* Groups */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-3">
          {groups.map((group) => {
            const items = filtered.filter((h) => h.group === group && (searchQuery || !pinned.has(h.id)));
            if (!items.length) return null;
            return (
              <div key={group}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/35 mb-1 px-2">{group}</p>
                <div className="space-y-0.5">
                  {items.map((h) => (
                    <HistoryItem key={h.id} item={h} active={activeId === h.id} onSelect={onSelect} onPin={() => { const n = new Set(pinned); n.add(h.id); setPinned(n); }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-outline-variant/10">
          <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold text-on-surface-variant hover:text-on-surface transition-all group">
            <span className="w-5 h-5 rounded-md bg-surface-container-high group-hover:bg-surface-container-highest flex items-center justify-center transition-colors">
              <span className="material-symbols-outlined text-[14px]">add</span>
            </span>
            New Conversation
          </button>
        </div>
      </aside>
    </>
  );
}

function HistoryItem({ item, active, onSelect, pinned, onPin }: { item: HistoryConvo; active: boolean; onSelect: (id: string) => void; pinned?: boolean; onPin: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
        active
          ? "bg-primary/10 text-primary"
          : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
      }`}
      onClick={() => onSelect(item.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Left icon */}
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
        active ? "bg-primary/15" : "bg-surface-container group-hover:bg-surface-container-high"
      }`}>
        <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          {pinned ? "push_pin" : "chat"}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium truncate leading-none">{item.title}</p>
        <p className="text-[11px] opacity-40 mt-0.5">{item.time}</p>
      </div>

      {hover && (
        <div className="flex items-center gap-0.5 flex-shrink-0 -mr-1">
          <button
            title={pinned ? "Unpin" : "Pin"}
            onClick={(e) => { e.stopPropagation(); onPin(); }}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-on-surface-variant/50 hover:text-on-surface hover:bg-surface-container-high transition-all"
          >
            <span className="material-symbols-outlined text-[12px]">push_pin</span>
          </button>
          <button
            title="Delete"
            onClick={(e) => e.stopPropagation()}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-on-surface-variant/50 hover:text-red-400 hover:bg-red-400/10 transition-all"
          >
            <span className="material-symbols-outlined text-[12px]">delete</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   SessionPanel
───────────────────────────────────────── */
function SessionPanel({ messages, onSave, onExport }: { messages: ChatMessage[]; onSave: () => void; onExport: () => void }) {
  const aiMessages = messages.filter((m) => m.role === "assistant");
  const totalWords = aiMessages.reduce((sum, m) => sum + m.content.split(" ").length, 0);

  return (
    <aside className="sp-session-panel">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 border-b border-outline-variant/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-secondary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-secondary text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/40">Session</p>
            <h3 className="text-[13px] font-bold text-on-surface leading-none mt-0.5">Overview</h3>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 pt-4 pb-2 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/35 mb-2">Activity</p>
        {[
          { icon: "chat_bubble", label: "Messages", value: messages.length, color: "text-blue-400" },
          { icon: "psychology", label: "AI Responses", value: aiMessages.length, color: "text-violet-400" },
          { icon: "text_fields", label: "Words", value: totalWords.toLocaleString(), color: "text-emerald-400" },
          { icon: "style", label: "Flashcards", value: 0, color: "text-amber-400" },
          { icon: "quiz", label: "Quizzes", value: 0, color: "text-rose-400" },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-surface-container-low transition-colors">
            <div className="flex items-center gap-2.5">
              <span className={`material-symbols-outlined text-[15px] ${stat.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
              <span className="text-[12px] text-on-surface-variant">{stat.label}</span>
            </div>
            <span className="text-[13px] font-bold text-on-surface tabular-nums">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="px-4 pb-6 pt-3 border-t border-outline-variant/10 mt-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/35 mb-2.5">Quick Actions</p>
        <div className="space-y-1.5">
          {[
            { icon: "save", label: "Save Chat", action: onSave, color: "text-blue-400" },
            { icon: "download", label: "Export Notes", action: onExport, color: "text-emerald-400" },
            { icon: "style", label: "Flashcards", action: () => {}, color: "text-amber-400", soon: true },
            { icon: "quiz", label: "Create Quiz", action: () => {}, color: "text-rose-400", soon: true },
          ].map((btn: any) => (
            <button
              key={btn.label}
              onClick={btn.action}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low text-[13px] font-medium transition-all text-left group"
            >
              <span className={`material-symbols-outlined text-[15px] ${btn.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{btn.icon}</span>
              <span className="flex-1">{btn.label}</span>
              {btn.soon && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant/40 font-medium">Soon</span>}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────
   MessageBubble
───────────────────────────────────────── */
function MessageBubble({ msg, onLike, onDislike, onCopy }: {
  msg: ChatMessage;
  onLike: () => void;
  onDislike: () => void;
  onCopy: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === "user";

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(msg.content); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    onCopy();
  };

  return (
    <div className={`sp-msg-row group ${isUser ? "justify-end" : "justify-start"}`}>
      {/* AI avatar */}
      {!isUser && (
        <div className="sp-ai-avatar">
          <span className="material-symbols-outlined text-primary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            psychology
          </span>
        </div>
      )}

      <div className={`sp-bubble ${isUser ? "sp-bubble-user" : "sp-bubble-ai"}`}>
        {isUser ? (
          <p className="text-sm leading-relaxed">{msg.content}</p>
        ) : (
          <div className="sp-ai-content text-sm space-y-3">{renderAnswer(msg.content)}</div>
        )}

        {/* Sources */}
        {msg.sources && msg.sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/[0.06] flex flex-wrap gap-1.5">
            {msg.sources.slice(0, 5).map((src, i) =>
              src.url ? (
                <a key={i} href={src.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/15 transition-all max-w-[180px]">
                  <span className="material-symbols-outlined text-[11px]">open_in_new</span>
                  <span className="truncate">{src.title}</span>
                </a>
              ) : (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-fixed/20 text-secondary text-[11px] font-medium max-w-[180px]">
                  <span className="material-symbols-outlined text-[11px]">auto_stories</span>
                  <span className="truncate">{src.title}</span>
                </span>
              )
            )}
          </div>
        )}

        {/* Hover actions */}
        {!isUser && (
          <div className="sp-msg-actions opacity-0 group-hover:opacity-100">
            <button onClick={handleCopy} className="sp-action-btn" title="Copy">
              <span className="material-symbols-outlined text-[14px]">{copied ? "check" : "content_copy"}</span>
            </button>
            <button onClick={onLike} className={`sp-action-btn ${msg.liked ? "text-green-400" : ""}`} title="Good response">
              <span className="material-symbols-outlined text-[14px]">thumb_up</span>
            </button>
            <button onClick={onDislike} className={`sp-action-btn ${msg.disliked ? "text-red-400" : ""}`} title="Bad response">
              <span className="material-symbols-outlined text-[14px]">thumb_down</span>
            </button>
            <button className="sp-action-btn" title="Regenerate">
              <span className="material-symbols-outlined text-[14px]">refresh</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Main Page
───────────────────────────────────────── */
export default function AITutorPage() {
  const { isMaximized, setIsMaximized } = useOutletContext<TutorLayoutContext>();
  const [guides, setGuides] = useState<GuideOption[]>([]);
  const [selectedGuideId, setSelectedGuideId] = useState("");
  const [searchMode, setSearchMode] = useState<TutorAskMode>("web");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const selectedGuide = useMemo(() => guides.find((g) => g.id === selectedGuideId), [guides, selectedGuideId]);


  /* Load — guides only; always start a fresh chat */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const guideData = await guideService.getAll();
        setGuides((guideData || []).filter((g: GuideOption) => g.status === "ready"));
        // Start with a clean slate every time the AI tab is opened
        setMessages([]);
      } catch (err: any) {
        setError("Failed to load AI Tutor. Please refresh.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);


  useEffect(() => {
    if (loading) return;
    // When guide selection changes, keep the current chat — just update context
    // (don't reload history; user explicitly chose a fresh session on open)
  }, [selectedGuideId, loading]);


  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);

  useEffect(() => {
    const el = textareaRef.current; if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [question]);

  const sendQuestion = useCallback(async (text = question) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: trimmed, createdAt: new Date().toISOString() };
    setMessages((p) => [...p, userMsg]);
    setQuestion(""); setSending(true); setError(null);

    try {
      const res = await tutorService.askTutor({ question: trimmed, guideId: selectedGuideId || null, mode: searchMode });
      const aiMsg: ChatMessage = { id: `a-${Date.now()}`, role: "assistant", content: res.answer, createdAt: new Date().toISOString(), sources: res.sources, mode: res.mode };
      setMessages((p) => [...p, aiMsg]);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "AI Tutor could not answer right now.");
      setMessages((p) => p.filter((m) => m.id !== userMsg.id));
    } finally {
      setSending(false);
    }
  }, [question, sending, selectedGuideId, searchMode]);

  const handleSubmit = (e: FormEvent) => { e.preventDefault(); sendQuestion(); };

  const toggleLike = (id: string) => setMessages((p) => p.map((m) => m.id === id ? { ...m, liked: !m.liked, disliked: false } : m));
  const toggleDislike = (id: string) => setMessages((p) => p.map((m) => m.id === id ? { ...m, disliked: !m.disliked, liked: false } : m));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-32">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined animate-spin text-primary text-2xl">progress_activity</span>
          </div>
          <p className="text-sm text-on-surface-variant">Loading AI Tutor…</p>
        </div>
      </div>
    );
  }

  const isEmpty = messages.length === 0;

  return (
    <>
      {/* ── Global styles injected via className + index.css sp- classes ── */}
      <div className="sp-workspace">

        {/* ── Chat History Sidebar ── */}
        <ChatHistorySidebar
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          activeId={activeHistoryId}
          onSelect={(id) => { setActiveHistoryId(id); setHistoryOpen(false); }}
          searchQuery={historySearch}
          onSearchChange={setHistorySearch}
        />

        {/* ── Main Column ── */}
        <div className="sp-main-col">

          {/* ── Premium Header ── */}
          <header className="sp-header">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setHistoryOpen(true)}
                className="sp-icon-btn"
                title="Chat History"
              >
                <span className="material-symbols-outlined text-[20px]">menu</span>
              </button>
              <div className="sp-header-divider" />
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[17px]" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                </div>
                <div>
                  <h1 className="text-[14px] font-bold text-on-surface leading-none">StudyPilot AI Tutor</h1>
                  <p className="text-[11px] text-on-surface-variant/60 mt-0.5">Your personal AI study companion</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 ml-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                <span className="text-[11px] text-emerald-400/80 font-medium">Ready to help</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedGuide && (
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-[12px] font-medium">
                  <span className="material-symbols-outlined text-[14px]">auto_stories</span>
                  <span className="max-w-[120px] truncate">{selectedGuide.title}</span>
                </div>
              )}
              <button
                onClick={() => { setMessages([]); setActiveHistoryId(null); }}
                className="sp-glass-btn hidden sm:flex"
                title="New Chat"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>New Chat</span>
              </button>
              <button onClick={() => setHistoryOpen(true)} className="sp-glass-btn hidden sm:flex" title="History">
                <span className="material-symbols-outlined text-[16px]">history</span>
                <span>History</span>
              </button>
              <button
                onClick={() => setSessionOpen((p) => !p)}
                className={`sp-glass-btn ${sessionOpen ? "bg-primary/10 text-primary border-primary/20" : ""}`}
                title="Session Panel"
              >
                <span className="material-symbols-outlined text-[16px]">dashboard</span>
                <span className="hidden sm:inline">Session</span>
              </button>
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                className="sp-icon-btn"
                title={isMaximized ? "Restore" : "Focus mode"}
              >
                <span className="material-symbols-outlined text-[18px]">{isMaximized ? "close_fullscreen" : "open_in_full"}</span>
              </button>
            </div>
          </header>

          {/* ── Error ── */}
          {error && (
            <div className="mx-auto w-full max-w-3xl px-4 pt-3">
              <div className="flex items-center gap-2.5 bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-3 rounded-2xl text-sm">
                <span className="material-symbols-outlined text-[18px]">error_outline</span>
                {error}
                <button className="ml-auto" onClick={() => setError(null)}>
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Messages ── */}
          <div className="sp-messages-area">
            {isEmpty ? (
              /* ── Empty state ── */
              <div className="sp-empty-state">
                <div className="mb-5 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-white/10 flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <span className="material-symbols-outlined text-2xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>travel_explore</span>
                  </div>
                  <h2 className="text-xl font-bold text-on-surface mb-1.5">What are we studying today?</h2>
                  <p className="text-[13px] text-on-surface-variant/60 max-w-sm">
                    Ask anything — explanations, quizzes, study plans, code problems, and more.
                  </p>
                </div>

                {/* Action chips */}
                <div className="flex flex-wrap gap-2 justify-center max-w-xl">
                  {ACTION_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      onClick={() => sendQuestion(chip.label + " for my current topic")}
                      disabled={sending}
                      className="sp-action-chip"
                    >
                      <span className="material-symbols-outlined text-[14px]">{chip.icon}</span>
                      <span>{chip.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* ── Conversation ── */
              <div className="sp-convo-list">
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    onLike={() => toggleLike(msg.id)}
                    onDislike={() => toggleDislike(msg.id)}
                    onCopy={() => {}}
                  />
                ))}

                {/* Typing indicator */}
                {sending && (
                  <div className="sp-msg-row justify-start">
                    <div className="sp-ai-avatar">
                      <span className="material-symbols-outlined text-primary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                    </div>
                    <div className="sp-bubble sp-bubble-ai">
                      <p className="text-[12px] text-on-surface-variant/60 mb-2">
                        {searchMode === "web" ? "Searching the web…" : "Thinking…"}
                      </p>
                      <TypingDots />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* ── Action chips above input (only when chat is active) ── */}
          {!isEmpty && (
            <div className="px-4 pb-1 flex gap-2 overflow-x-auto no-scrollbar mx-auto w-full max-w-3xl">
              {ACTION_CHIPS.slice(0, 4).map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => sendQuestion(chip.label + " for my current topic")}
                  disabled={sending}
                  className="sp-action-chip flex-shrink-0"
                >
                  <span className="material-symbols-outlined text-[14px]">{chip.icon}</span>
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── Composer ── */}
          <div className="sp-composer-wrap">
            <form onSubmit={handleSubmit} className="sp-composer">
              <textarea
                ref={textareaRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendQuestion(); }
                }}
                className="sp-composer-input"
                placeholder="Ask StudyPilot anything…"
                disabled={sending}
                rows={1}
                style={{ minHeight: "28px", maxHeight: "200px", outline: "none", boxShadow: "none" }}
              />

              {/* Toolbar */}
              <div className="flex items-center justify-between pt-2 px-1">
                <div className="flex items-center gap-1 flex-wrap">
                  <ModeDropdown value={searchMode} onChange={setSearchMode} />
                  {guides.length > 0 && (
                    <>
                      <div className="w-px h-4 bg-outline-variant/20 mx-0.5" />
                      <GuideDropdown guides={guides} value={selectedGuideId} onChange={setSelectedGuideId} />
                    </>
                  )}
                  <div className="hidden sm:block w-px h-4 bg-outline-variant/20 mx-0.5" />
                  <button type="button" title="Voice input" className="sp-pill-btn hidden sm:flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px]">mic</span>
                    <span className="hidden md:inline">Voice</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={sending || !question.trim()}
                  className="sp-send-btn"
                  title="Send"
                >
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    arrow_upward
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── Session Panel ── */}
        {sessionOpen && (
          <SessionPanel
            messages={messages}
            onSave={() => {}}
            onExport={() => {}}
          />
        )}
      </div>
    </>
  );
}
