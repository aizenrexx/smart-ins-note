"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X, Send, User, Sparkles, RotateCcw,
  FileText, Plus, Edit3, Trash2, Star, Search,
  Zap, Hash, Clock, Wrench, ChevronRight, Brain,
  Cpu, Atom, Wand2, Copy, Check, Mic, MicOff, Download,
  BarChart2, Files, Key, Globe,
} from "lucide-react";
import { type NoteRef, type ToolCallbacks, executeTool } from "@/lib/ai-engine";
import { aiChat, getAiKeys, type AiMessage, type AiToolCall, PROVIDER_LABELS, PROVIDER_COLORS } from "@/lib/ai-api";
import { AIKeyManager } from "@/components/AIKeyManager";
import { AIErrorPopup, type AiError } from "@/components/AIErrorPopup";

/* ─────────────────────────── TYPES ─────────────────────────── */
interface DisplayMessage {
  id: string;
  role: "user" | "assistant" | "action";
  content: string;
  error?: boolean;
  actionType?: string;
  toolCalls?: string[];
  usage?: { prompt: number; completion: number; total: number };
  durationMs?: number;
}

interface Props {
  notes: NoteRef[];
  onCreateNote: (title: string, content: string) => Promise<NoteRef>;
  onUpdateNote: (id: string, fields: Partial<NoteRef>) => Promise<NoteRef>;
  onDeleteNote: (id: string) => Promise<void>;
  onOpenNote: (id: string) => void;
  onToast: (msg: string, type?: "success" | "error" | "info") => void;
}

/* ─────────────────────────── PARTICLES ─────────────────────── */
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  dur: number;
  anim: string;
}

function det(i: number, salt: number) {
  return ((i * 2654435761 + salt * 40503) >>> 0) / 0xffffffff;
}
function makeParticles(n = 22): Particle[] {
  const colors = ["#6366f1", "#8b5cf6", "#e879f9", "#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#a78bfa"];
  const anims = ["f01", "f06", "f07", "f08", "f13", "f17", "au01", "au03"];
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    x: det(i, 1) * 100,
    y: det(i, 2) * 100,
    size: 2 + det(i, 3) * 4,
    color: colors[i % colors.length],
    delay: det(i, 4) * 4,
    dur: 4 + det(i, 5) * 6,
    anim: anims[i % anims.length],
  }));
}
const PARTICLES = makeParticles(22);

/* ─────────────────────────── SPARKLE ───────────────────────── */
function Sparkle({ style }: { style: React.CSSProperties }) {
  return (
    <span style={{
      position: "absolute", width: 6, height: 6, borderRadius: "50%",
      background: "white", boxShadow: "0 0 8px 2px rgba(255,255,255,0.9)",
      animation: "sparkBurst 0.6s ease-out forwards",
      ...style,
    }} />
  );
}

/* ─────────────────────────── ACTION ICON ───────────────────── */
function ActionIcon({ type }: { type?: string }) {
  if (type === "create_note") return <Plus size={11} />;
  if (type === "delete_note") return <Trash2 size={11} />;
  if (type === "update_note" || type === "open_note") return <Edit3 size={11} />;
  if (type === "list_notes" || type === "search_notes") return <Search size={11} />;
  if (type === "star_note") return <Star size={11} />;
  if (type === "get_note_stats") return <BarChart2 size={11} />;
  if (type === "duplicate_note") return <Files size={11} />;
  if (type === "bulk_update_notes") return <Edit3 size={11} />;
  return <Sparkles size={11} />;
}

const ACTION_COLORS: Record<string, string> = {
  create_note: "#34d399", delete_note: "#f87171", update_note: "#60a5fa",
  open_note: "#a78bfa", list_notes: "#e879f9", search_notes: "#fbbf24",
  star_note: "#fbbf24", get_note_stats: "#38bdf8", duplicate_note: "#fb923c",
  bulk_update_notes: "#60a5fa",
};

/* ─────────────────────────── TOOL CHIP ─────────────────────── */
function ToolChip({ name }: { name: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 6,
      background: "linear-gradient(135deg,rgba(99,102,241,0.18),rgba(168,85,247,0.18))",
      border: "1px solid rgba(139,92,246,0.3)",
      color: "#c4b5fd", fontSize: 10, fontFamily: "monospace", fontWeight: 700,
      animation: "sl20 0.3s ease",
    }}>
      <Cpu size={8} /> {name}
    </span>
  );
}

/* ─────────────────────────── WAVE LOADER ───────────────────── */
function WaveLoader() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, height: 24 }}>
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} style={{
          width: 3, height: 18, borderRadius: 3,
          background: `linear-gradient(180deg,${["#6366f1","#8b5cf6","#e879f9","#60a5fa","#34d399"][i]},transparent)`,
          animation: `wa01 ${0.8 + i * 0.1}s ${i * 0.1}s ease-in-out infinite`,
          transformOrigin: "bottom",
        }} />
      ))}
    </div>
  );
}

/* ─────────────────────────── ORBITAL BOT ───────────────────── */
function OrbitalBot({ size = 42 }: { size?: number }) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div style={{
        position: "absolute", inset: -6, borderRadius: "50%",
        border: "1.5px solid transparent",
        backgroundImage: "linear-gradient(#0d0a1e,#0d0a1e), conic-gradient(from 0deg,#6366f1,#e879f9,#60a5fa,#6366f1)",
        backgroundOrigin: "border-box", backgroundClip: "padding-box, border-box",
        animation: "ro01 3s linear infinite",
      }} />
      <div style={{
        position: "absolute", inset: -2, borderRadius: "50%",
        border: "1px dashed rgba(139,92,246,0.4)",
        animation: "ro02 5s linear infinite",
      }} />
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: "linear-gradient(135deg,#4f46e5,#7c3aed,#9333ea)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 0 20px rgba(99,102,241,0.6), 0 0 40px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
        animation: "g02 3s ease-in-out infinite",
      }}>
        <Brain size={size * 0.42} color="white" style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.8))" }} />
      </div>
      <div style={{
        position: "absolute", top: -4, left: "50%", marginLeft: -4,
        width: 8, height: 8, borderRadius: "50%",
        background: "radial-gradient(#e879f9,#8b5cf6)",
        boxShadow: "0 0 8px #e879f9",
        transformOrigin: `4px ${size / 2 + 4}px`,
        animation: "ro01 2s linear infinite",
      }} />
    </div>
  );
}

/* ─────────────────────────── MAIN COMPONENT ────────────────── */
export function ChatBot({ notes, onCreateNote, onUpdateNote, onDeleteNote, onOpenNote, onToast }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [history, setHistory] = useState<AiMessage[]>([]);
  const [totalTokens, setTotalTokens] = useState(0);
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([]);
  const [sendAnim, setSendAnim] = useState(false);
  const [fabHover, setFabHover] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [hasKeys, setHasKeys] = useState<boolean | null>(null);
  const [currentModel, setCurrentModel] = useState<string>("");
  const [currentProvider, setCurrentProvider] = useState<string>("");
  const [aiError, setAiError] = useState<AiError | null>(null);
  const [showKeyManager, setShowKeyManager] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const notesRef = useRef<NoteRef[]>(notes);
  const sendBtnRef = useRef<HTMLButtonElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  notesRef.current = notes;

  useEffect(() => {
    getAiKeys().then(k => setHasKeys(k.length > 0));
  }, []);

  useEffect(() => {
    if (open) {
      getAiKeys().then(k => setHasKeys(k.length > 0));
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* Stop voice recognition when chat closes */
  useEffect(() => {
    if (!open && listening) {
      recognitionRef.current?.stop();
      setListening(false);
    }
  }, [open, listening]);

  function addDisplay(msg: Omit<DisplayMessage, "id">) {
    const id = `${Date.now()}-${messages.length + 1}`;
    setMessages(prev => [...prev, { ...msg, id }]);
  }

  function toggleDetails(id: string) {
    setExpandedDetails(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function burstSparkles() {
    if (!sendBtnRef.current) return;
    const rect = sendBtnRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const det = (i: number, salt: number) => {
      let x = (i + 1) * 1103515245 + salt * 12345;
      x ^= x << 13;
      x ^= x >> 17;
      x ^= x << 5;
      return ((x >>> 0) % 1000) / 1000;
    };
    const newS = Array.from({ length: 8 }, (_, i) => ({ id: Date.now() + i, x: cx + (det(i, 1) - 0.5) * 60, y: cy + (det(i, 2) - 0.5) * 60 }));
    setSparkles(newS);
    setTimeout(() => setSparkles([]), 700);
  }

  /* ── Copy message to clipboard ── */
  function copyMessage(id: string, content: string) {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  /* ── Export chat as text file ── */
  function exportChat() {
    if (messages.length === 0) return;
    const lines: string[] = [`Smart Ins-Note — Chat Export`, `Date: ${new Date().toLocaleString()}`, `Model: ${currentProvider ? `${currentProvider} / ${currentModel}` : "AI Brain"}`, `Tokens used: ${totalTokens}`, "", "─".repeat(60), ""];
    for (const m of messages) {
      if (m.role === "user") lines.push(`[You]\n${m.content}`, "");
      else if (m.role === "assistant") lines.push(`[AI Brain]\n${m.content}`, "");
      else if (m.role === "action") lines.push(`  ⚡ ${m.content}`, "");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `chat-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
    onToast("Chat exported!", "success");
  }

  /* ── Voice input (Web Speech API) ── */
  function toggleVoice() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onToast("Voice input not supported in this browser", "error");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = "bn-BD,en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(prev => (prev ? prev + " " : "") + transcript);
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
    onToast("Listening… speak now", "info");
  }

  /* Refs for callbacks */
  const onCreateNoteRef = useRef(onCreateNote); onCreateNoteRef.current = onCreateNote;
  const onUpdateNoteRef = useRef(onUpdateNote); onUpdateNoteRef.current = onUpdateNote;
  const onDeleteNoteRef = useRef(onDeleteNote); onDeleteNoteRef.current = onDeleteNote;
  const onOpenNoteRef = useRef(onOpenNote); onOpenNoteRef.current = onOpenNote;
  const onToastRef = useRef(onToast); onToastRef.current = onToast;

  const toolCallbacks: ToolCallbacks = {
    listNotes: () => notesRef.current,
    createNote: async (title, content) => {
      addDisplay({ role: "action", content: `Creating: "${title}"`, actionType: "create_note" });
      const note = await onCreateNoteRef.current(title, content);
      onToastRef.current(`✨ Created: "${title}"`, "success");
      return note;
    },
    updateNote: async (id, fields) => {
      const label = notesRef.current.find(n => n.id === id)?.title || id;
      addDisplay({ role: "action", content: `Updating: "${label}"`, actionType: "update_note" });
      return await onUpdateNoteRef.current(id, fields);
    },
    deleteNote: async (id) => {
      const label = notesRef.current.find(n => n.id === id)?.title || id;
      await onDeleteNoteRef.current(id);
      addDisplay({ role: "action", content: `Deleted: "${label}"`, actionType: "delete_note" });
      onToastRef.current(`Deleted: "${label}"`, "info");
    },
    openNote: (id) => {
      const label = notesRef.current.find(n => n.id === id)?.title || id;
      addDisplay({ role: "action", content: `Opened: "${label}"`, actionType: "open_note" });
      onOpenNoteRef.current(id);
    },
  };
  const toolCallbacksRef = useRef(toolCallbacks);
  toolCallbacksRef.current = toolCallbacks;

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    if (!hasKeys) {
      setShowKeyManager(true);
      onToastRef.current("Add an API key first — click here to open settings", "error");
      return;
    }
    burstSparkles();
    setSendAnim(true);
    setTimeout(() => setSendAnim(false), 400);
    setInput("");
    addDisplay({ role: "user", content: text });
    setLoading(true);

    const startMs = Date.now();
    let currentHistory: AiMessage[] = [...history, { role: "user", content: text }];
    const allToolCallNames: string[] = [];
    let totalUsage = { prompt: 0, completion: 0, total: 0 };
    let finalReply = "";
    let respModel = currentModel;
    let respProvider = currentProvider;

    try {
      let isFirstCall = true;
      let continueLoop = true;

      while (continueLoop) {
        const payload = isFirstCall
          ? { message: text, history }
          : { history: currentHistory };
        isFirstCall = false;

        const resp = await aiChat(payload);

        respModel = resp.model || respModel;
        respProvider = resp.provider || respProvider;
        if (resp.model) setCurrentModel(resp.model);
        if (resp.provider) setCurrentProvider(resp.provider);
        if (resp.usage) {
          totalUsage = {
            prompt: totalUsage.prompt + resp.usage.prompt,
            completion: totalUsage.completion + resp.usage.completion,
            total: totalUsage.total + resp.usage.total,
          };
        }

        if (resp.done) {
          finalReply = resp.reply ?? "";
          continueLoop = false;
        } else if (resp.toolCalls?.length) {
          const assistantMsg: AiMessage = {
            role: "assistant",
            content: null,
            tool_calls: resp.toolCalls.map(tc => ({
              id: tc.id,
              function: { name: tc.name, arguments: JSON.stringify(tc.args) },
            })),
          };
          currentHistory = [...currentHistory, assistantMsg];

          const toolResults: Array<{ id: string; name: string; result: string }> = [];
          for (const tc of resp.toolCalls) {
            allToolCallNames.push(tc.name);
            const result = await executeTool(tc.name, tc.args, toolCallbacksRef.current);
            toolResults.push({ id: tc.id, name: tc.name, result });
            currentHistory = [
              ...currentHistory,
              { role: "tool", content: result, tool_call_id: tc.id, name: tc.name },
            ];
          }

          const nextResp = await aiChat({ history: currentHistory, toolResults });
          respModel = nextResp.model || respModel;
          respProvider = nextResp.provider || respProvider;
          if (nextResp.model) setCurrentModel(nextResp.model);
          if (nextResp.provider) setCurrentProvider(nextResp.provider);
          if (nextResp.usage) {
            totalUsage = {
              prompt: totalUsage.prompt + nextResp.usage.prompt,
              completion: totalUsage.completion + nextResp.usage.completion,
              total: totalUsage.total + nextResp.usage.total,
            };
          }
          if (nextResp.done) {
            finalReply = nextResp.reply ?? "";
            continueLoop = false;
          }
        } else {
          continueLoop = false;
        }
      }

      addDisplay({
        role: "assistant",
        content: finalReply,
        toolCalls: allToolCallNames.length ? allToolCallNames : undefined,
        usage: totalUsage.total > 0 ? totalUsage : undefined,
        durationMs: Date.now() - startMs,
      });

      const updatedHistory: AiMessage[] = [
        ...history,
        { role: "user", content: text },
        { role: "assistant", content: finalReply },
      ];
      setHistory(updatedHistory);
      setTotalTokens(prev => prev + (totalUsage.total ?? 0));
      setHasKeys(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      const isNoKeys = msg.includes("NO_KEYS") || msg.includes("No API keys");
      if (isNoKeys) setHasKeys(false);
      addDisplay({ role: "assistant", content: msg, error: true });
      setAiError({
        provider: respProvider || "unknown",
        model: respModel || "unknown",
        message: msg,
        code: isNoKeys ? "NO_KEYS" : undefined,
      });
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, loading, history, hasKeys, currentModel, currentProvider]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function clearChat() { setMessages([]); setHistory([]); setTotalTokens(0); setExpandedDetails(new Set()); }

  const hasUnread = messages.length > 0;
  const providerLabel = currentModel
    ? `${PROVIDER_LABELS[currentProvider] ?? currentProvider} · ${currentModel}`
    : hasKeys === false
      ? "No API keys — add keys to start"
      : hasKeys === null
        ? "Loading…"
        : "Auto mode — ready";

  const SUGGESTIONS = [
    { icon: "✏️", text: "Create a note about today's tasks" },
    { icon: "⭐", text: "আমার সব starred note দেখাও" },
    { icon: "📊", text: "Show me stats about all my notes" },
    { icon: "📋", text: "Summarize my most recent note" },
    { icon: "📑", text: "Duplicate the most recent note" },
    { icon: "🌟", text: "Star all my notes at once" },
    { icon: "🔍", text: "Search notes about Bangladesh" },
    { icon: "🚀", text: "Create a random creative note" },
  ];

  return (
    <>
      <AIKeyManager open={showKeyManager} onClose={() => { setShowKeyManager(false); getAiKeys().then(k => setHasKeys(k.length > 0)); }} onToast={onToast} />
      <AIErrorPopup error={aiError} onDismiss={() => setAiError(null)} onOpenKeyManager={() => setShowKeyManager(true)} />

      {/* ════ GLOBAL STYLES ════ */}
      <style>{`
        @keyframes chatWindowIn {
          0% { opacity:0; transform:translateY(30px) scale(0.88); filter:blur(8px); }
          60% { opacity:1; transform:translateY(-6px) scale(1.01); filter:blur(0); }
          100% { opacity:1; transform:translateY(0) scale(1); filter:blur(0); }
        }
        @keyframes chatWindowOut {
          0% { opacity:1; transform:translateY(0) scale(1); }
          100% { opacity:0; transform:translateY(20px) scale(0.92); }
        }
        @keyframes fabEnter {
          0% { transform:scale(0) rotate(-180deg); opacity:0; }
          70% { transform:scale(1.15) rotate(8deg); opacity:1; }
          100% { transform:scale(1) rotate(0); opacity:1; }
        }
        @keyframes fabPulseRing {
          0% { transform:scale(1); opacity:0.7; }
          100% { transform:scale(2.2); opacity:0; }
        }
        @keyframes fabRainbow {
          0%,100% { box-shadow:0 0 20px rgba(99,102,241,0.7),0 8px 32px rgba(99,102,241,0.4); }
          25% { box-shadow:0 0 20px rgba(232,121,249,0.7),0 8px 32px rgba(232,121,249,0.4); }
          50% { box-shadow:0 0 20px rgba(96,165,250,0.7),0 8px 32px rgba(96,165,250,0.4); }
          75% { box-shadow:0 0 20px rgba(52,211,153,0.7),0 8px 32px rgba(52,211,153,0.4); }
        }
        @keyframes rainbowBorder {
          0%,100% { border-color:rgba(99,102,241,0.6); box-shadow:0 0 0 1px rgba(99,102,241,0.4); }
          25% { border-color:rgba(232,121,249,0.6); box-shadow:0 0 0 1px rgba(232,121,249,0.4); }
          50% { border-color:rgba(96,165,250,0.6); box-shadow:0 0 0 1px rgba(96,165,250,0.4); }
          75% { border-color:rgba(52,211,153,0.6); box-shadow:0 0 0 1px rgba(52,211,153,0.4); }
        }
        @keyframes sparkBurst {
          0% { transform:scale(0) rotate(0); opacity:1; }
          50% { transform:scale(1.5) rotate(180deg); opacity:0.8; }
          100% { transform:scale(0) rotate(360deg) translate(var(--dx,0px),var(--dy,0px)); opacity:0; }
        }
        @keyframes msgRight {
          0% { opacity:0; transform:translateX(40px) scale(0.9); }
          70% { transform:translateX(-4px) scale(1.01); }
          100% { opacity:1; transform:translateX(0) scale(1); }
        }
        @keyframes msgLeft {
          0% { opacity:0; transform:translateX(-40px) scale(0.9); }
          70% { transform:translateX(4px) scale(1.01); }
          100% { opacity:1; transform:translateX(0) scale(1); }
        }
        @keyframes actionPop {
          0% { opacity:0; transform:translateY(8px) scale(0.85); }
          70% { transform:translateY(-2px) scale(1.03); }
          100% { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes holoBorder {
          0% { background-position:0% 50%; }
          50% { background-position:100% 50%; }
          100% { background-position:0% 50%; }
        }
        @keyframes sendPulse {
          0% { transform:scale(1); }
          50% { transform:scale(0.88) rotate(-8deg); }
          100% { transform:scale(1); }
        }
        @keyframes particleDrift {
          0% { opacity:0; transform:translateY(0) scale(0); }
          20% { opacity:1; transform:translateY(-10px) scale(1); }
          80% { opacity:0.6; }
          100% { opacity:0; transform:translateY(-80px) scale(0.2); }
        }
        @keyframes glowPulse {
          0%,100% { text-shadow:0 0 8px rgba(165,180,252,0.5); }
          50% { text-shadow:0 0 20px rgba(232,121,249,0.9),0 0 40px rgba(99,102,241,0.5); }
        }
        @keyframes shimmerText {
          0% { background-position:-200% center; }
          100% { background-position:200% center; }
        }
        @keyframes auroraOrb1 {
          0%,100% { transform:translate(0%,0%) scale(1); opacity:0.12; }
          33% { transform:translate(30%,-20%) scale(1.15); opacity:0.18; }
          66% { transform:translate(-20%,30%) scale(0.9); opacity:0.08; }
        }
        @keyframes auroraOrb2 {
          0%,100% { transform:translate(0%,0%) scale(1); opacity:0.1; }
          33% { transform:translate(-40%,20%) scale(1.2); opacity:0.16; }
          66% { transform:translate(20%,-40%) scale(0.85); opacity:0.07; }
        }
        @keyframes countBadge {
          0% { transform:scale(0) rotate(-20deg); }
          70% { transform:scale(1.3) rotate(5deg); }
          100% { transform:scale(1) rotate(0); }
        }
        @keyframes inputFocusGlow {
          0%,100% { box-shadow:0 0 0 2px rgba(99,102,241,0.3),inset 0 1px 0 rgba(255,255,255,0.05); }
          50% { box-shadow:0 0 0 3px rgba(139,92,246,0.4),0 0 20px rgba(99,102,241,0.2),inset 0 1px 0 rgba(255,255,255,0.05); }
        }
        @keyframes detailSlide {
          from { opacity:0; transform:translateY(-8px) scaleY(0.85); transform-origin:top; }
          to { opacity:1; transform:translateY(0) scaleY(1); }
        }
        @keyframes micPulse {
          0%,100% { box-shadow:0 0 0 0 rgba(239,68,68,0.4); }
          50% { box-shadow:0 0 0 6px rgba(239,68,68,0); }
        }
        @keyframes copyPop {
          0% { transform:scale(0.6); opacity:0; }
          70% { transform:scale(1.15); }
          100% { transform:scale(1); opacity:1; }
        }
        .chatbot-particle { pointer-events:none; position:absolute; border-radius:50%; }
        .chatbot-msg-user { animation:msgRight 0.38s cubic-bezier(0.16,1,0.3,1) both; }
        .chatbot-msg-bot { animation:msgLeft 0.38s cubic-bezier(0.16,1,0.3,1) both; }
        .chatbot-msg-action { animation:actionPop 0.3s cubic-bezier(0.16,1,0.3,1) both; }
        .chatbot-suggestion:hover {
          border-color:rgba(139,92,246,0.5) !important;
          background:rgba(99,102,241,0.12) !important;
          color:#c4b5fd !important;
          transform:translateX(4px) scale(1.01);
        }
        .chatbot-suggestion { transition:all 0.22s cubic-bezier(0.16,1,0.3,1); }
        .chatbot-clear-btn:hover { color:#94a3b8 !important; background:rgba(99,102,241,0.12) !important; transform:rotate(-20deg) scale(1.1); }
        .chatbot-clear-btn { transition:all 0.25s cubic-bezier(0.16,1,0.3,1); }
        .chatbot-close-btn:hover { color:#fca5a5 !important; background:rgba(239,68,68,0.1) !important; transform:rotate(90deg) scale(1.1); }
        .chatbot-close-btn { transition:all 0.25s cubic-bezier(0.16,1,0.3,1); }
        .chatbot-detail-btn:hover { color:#a5b4fc !important; background:rgba(99,102,241,0.1) !important; }
        .chatbot-detail-btn { transition:all 0.2s; }
        .chatbot-export-btn:hover { color:#94a3b8 !important; background:rgba(99,102,241,0.12) !important; transform:scale(1.1); }
        .chatbot-export-btn { transition:all 0.25s cubic-bezier(0.16,1,0.3,1); }
        .chatbot-copy-btn:hover { opacity:1 !important; }
        .chatbot-copy-btn { transition:all 0.2s; }
        .chat-scroll::-webkit-scrollbar { width:3px; }
        .chat-scroll::-webkit-scrollbar-thumb { background:rgba(99,102,241,0.3); border-radius:10px; }
        .chat-scroll::-webkit-scrollbar-track { background:transparent; }
      `}</style>

      {/* ════ GLOBAL SPARKLES ════ */}
      {sparkles.map(s => (
        <Sparkle key={s.id} style={{ position: "fixed", left: s.x, top: s.y, zIndex: 9999 }} />
      ))}

      {/* ════ FAB BUTTON ════ */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 500 }}>
        {!open && [0, 1].map(i => (
          <div key={i} style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: "rgba(99,102,241,0.3)",
            animation: `fabPulseRing ${1.8 + i * 0.7}s ${i * 0.5}s ease-out infinite`,
          }} />
        ))}

        <button
          onClick={() => setOpen(o => !o)}
          onMouseEnter={() => setFabHover(true)}
          onMouseLeave={() => setFabHover(false)}
          title="AI Assistant"
          style={{
            position: "relative", width: 56, height: 56, borderRadius: "50%", border: "none",
            background: open
              ? "rgba(30,27,60,0.9)"
              : "linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#9333ea 100%)",
            color: "white",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            animation: open ? "none" : "fabRainbow 3s ease-in-out infinite",
            transition: "background 0.3s, transform 0.2s cubic-bezier(0.16,1,0.3,1)",
            transform: fabHover && !open ? "scale(1.08) translateY(-2px)" : "scale(1)",
            overflow: "hidden",
          }}
        >
          {!open && (
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: "linear-gradient(120deg,transparent 30%,rgba(255,255,255,0.25) 50%,transparent 70%)",
              animation: "sh04 2.5s ease infinite",
              pointerEvents: "none",
            }} />
          )}
          <div style={{ transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1), opacity 0.2s", transform: open ? "rotate(90deg)" : "rotate(0)", display: "flex" }}>
            {open ? <X size={22} /> : <Wand2 size={22} />}
          </div>
          {!open && hasUnread && (
            <div style={{
              position: "absolute", top: 2, right: 2,
              width: 14, height: 14, borderRadius: "50%",
              background: "linear-gradient(135deg,#10b981,#059669)",
              border: "2px solid #09090b",
              animation: "countBadge 0.4s cubic-bezier(0.16,1,0.3,1)",
              boxShadow: "0 0 8px rgba(16,185,129,0.6)",
            }} />
          )}
        </button>
      </div>

      {/* ════ CHAT WINDOW ════ */}
      {open && (
        <div style={{
          position: "fixed", bottom: 94, right: 24, zIndex: 499,
          width: 430, height: 680,
          display: "flex", flexDirection: "column",
          borderRadius: 24, overflow: "hidden",
          animation: "chatWindowIn 0.45s cubic-bezier(0.16,1,0.3,1) both",
          boxShadow: "0 32px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}>

          {/* Animated gradient outer border */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: 24, zIndex: 0, pointerEvents: "none",
            padding: 1,
            background: "linear-gradient(135deg,rgba(99,102,241,0.5),rgba(232,121,249,0.3),rgba(96,165,250,0.4),rgba(99,102,241,0.5))",
            backgroundSize: "300% 300%",
            animation: "holoBorder 5s ease infinite",
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }} />

          {/* Inner panel */}
          <div style={{
            position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%",
            background: "rgba(7,6,18,0.97)", backdropFilter: "blur(40px)", borderRadius: 23,
            overflow: "hidden",
          }}>

            {/* ── Aurora background orbs ── */}
            <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
              <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(99,102,241,0.15),transparent 70%)", top: "-10%", left: "-10%", animation: "auroraOrb1 12s ease-in-out infinite" }} />
              <div style={{ position: "absolute", width: 250, height: 250, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(232,121,249,0.1),transparent 70%)", bottom: "-5%", right: "-5%", animation: "auroraOrb2 15s ease-in-out infinite" }} />
              <div style={{ position: "absolute", width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(96,165,250,0.08),transparent 70%)", top: "40%", right: "10%", animation: "au03 10s ease-in-out infinite" }} />
              {PARTICLES.slice(0, 14).map(p => (
                <div key={p.id} className="chatbot-particle" style={{
                  left: `${p.x}%`, top: `${p.y}%`,
                  width: p.size, height: p.size,
                  background: p.color,
                  opacity: 0.25,
                  boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
                  animation: `${p.anim} ${p.dur}s ${p.delay}s ease-in-out infinite`,
                }} />
              ))}
            </div>

            {/* ── HEADER ── */}
            <div style={{
              position: "relative", zIndex: 2,
              display: "flex", alignItems: "center", gap: 11,
              padding: "14px 16px 13px",
              background: "linear-gradient(180deg,rgba(99,102,241,0.08),rgba(99,102,241,0.02))",
              borderBottom: "1px solid rgba(99,102,241,0.12)",
              flexShrink: 0,
            }}>
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 1,
                background: "linear-gradient(90deg,transparent,rgba(139,92,246,0.8),rgba(232,121,249,0.6),rgba(99,102,241,0.8),transparent)",
                animation: "sh07 4s ease-in-out infinite",
                backgroundSize: "200% 100%",
              }} />

              <OrbitalBot size={38} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 800, fontSize: 14, letterSpacing: -0.3,
                  background: "linear-gradient(135deg,#a5b4fc,#e879f9,#60a5fa)",
                  backgroundSize: "200% 100%",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  animation: "shimmerText 4s linear infinite",
                }}>
                  AI Brain
                </div>
                <div style={{
                  fontSize: 10, color: "#475569",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <div style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: hasKeys ? "#34d399" : "#ef4444",
                    boxShadow: hasKeys ? "0 0 6px #34d399" : "none",
                    flexShrink: 0,
                    animation: hasKeys ? "g05 2s ease-in-out infinite" : "none",
                  }} />
                  {currentProvider && <span style={{ color: PROVIDER_COLORS[currentProvider] ?? "#818cf8", fontWeight: 700 }}>{PROVIDER_LABELS[currentProvider] ?? currentProvider}</span>}
                  {currentProvider && currentModel && <span style={{ color: "#374151" }}> · </span>}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{currentModel || (hasKeys ? "Auto mode" : providerLabel)}</span>
                </div>
              </div>

              {/* Token counter */}
              {totalTokens > 0 && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 8,
                  background: "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.12))",
                  border: "1px solid rgba(99,102,241,0.25)",
                  animation: "g19 5s ease-in-out infinite",
                }}>
                  <Atom size={9} color="#a78bfa" style={{ animation: "ro01 3s linear infinite" }} />
                  <span style={{ fontSize: 10, color: "#a78bfa", fontWeight: 800, fontFamily: "monospace" }}>{totalTokens.toLocaleString()}</span>
                </div>
              )}

              {/* Key Manager button */}
              <button onClick={() => setShowKeyManager(true)} className="chatbot-export-btn" title="Manage API Keys"
                style={{ background: hasKeys === false ? "rgba(239,68,68,0.12)" : "none", border: hasKeys === false ? "1px solid rgba(239,68,68,0.3)" : "none", cursor: "pointer", color: hasKeys === false ? "#f87171" : "#374151", padding: "7px", borderRadius: 10, display: "flex" }}>
                <Key size={14} />
              </button>

              {/* Export chat button */}
              {messages.length > 0 && (
                <button onClick={exportChat} className="chatbot-export-btn" title="Export chat"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#374151", padding: "7px", borderRadius: 10, display: "flex" }}>
                  <Download size={14} />
                </button>
              )}

              <button onClick={clearChat} className="chatbot-clear-btn" title="Clear chat"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#374151", padding: "7px", borderRadius: 10, display: "flex" }}>
                <RotateCcw size={14} />
              </button>
              <button onClick={() => setOpen(false)} className="chatbot-close-btn" title="Close"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#374151", padding: "7px", borderRadius: 10, display: "flex" }}>
                <X size={16} />
              </button>
            </div>

            {/* ── MESSAGES ── */}
            <div className="chat-scroll" style={{
              flex: 1, overflowY: "auto", padding: "14px 14px 6px",
              display: "flex", flexDirection: "column", gap: 10,
              position: "relative", zIndex: 1,
            }}>

              {/* Empty state */}
              {messages.length === 0 && (
                <div style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", textAlign: "center", padding: "16px 12px",
                  animation: "sl07 0.5s cubic-bezier(0.16,1,0.3,1)",
                }}>
                  <div style={{ position: "relative", marginBottom: 20 }}>
                    <div style={{
                      width: 72, height: 72,
                      background: "linear-gradient(135deg,#4f46e5,#7c3aed,#9333ea,#e879f9)",
                      backgroundSize: "300% 300%",
                      animation: "mo09 6s ease-in-out infinite, holoBorder 4s ease infinite",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 0 40px rgba(99,102,241,0.5), 0 0 80px rgba(232,121,249,0.2)",
                    }}>
                      <Brain size={32} color="white" style={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,0.8))", animation: "sc04 2s ease-in-out infinite" }} />
                    </div>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        position: "absolute", width: 8, height: 8, borderRadius: "50%",
                        background: ["#6366f1", "#e879f9", "#60a5fa"][i],
                        boxShadow: `0 0 8px ${["#6366f1", "#e879f9", "#60a5fa"][i]}`,
                        top: "50%", left: "50%", marginTop: -4, marginLeft: -4,
                        transformOrigin: `4px ${40 + i * 8}px`,
                        animation: `ro0${i + 1} ${2 + i * 0.6}s linear infinite`,
                      }} />
                    ))}
                  </div>

                  <h3 style={{
                    fontSize: 16, fontWeight: 800, marginBottom: 6, letterSpacing: -0.3,
                    background: "linear-gradient(135deg,#a5b4fc,#e879f9,#60a5fa,#a5b4fc)",
                    backgroundSize: "300% 100%",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    animation: "shimmerText 3s linear infinite, glowPulse 3s ease-in-out infinite",
                  }}>
                    Intelligent AI Brain
                  </h3>
                  <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.75, maxWidth: 290, marginBottom: 20 }}>
                    Create · Edit · Delete · Search · Stats · Duplicate<br />
                    <span style={{ color: "#6366f1", fontWeight: 600 }}>Bengali & English</span> — both supported ✨
                  </p>

                  {/* Suggestions */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: 340 }}>
                    {SUGGESTIONS.map((s, i) => (
                      <button key={i} className="chatbot-suggestion"
                        onClick={() => { setInput(s.text); setTimeout(() => inputRef.current?.focus(), 0); }}
                        style={{
                          padding: "9px 13px", borderRadius: 12,
                          border: "1px solid rgba(99,102,241,0.15)",
                          background: "rgba(99,102,241,0.05)",
                          cursor: "pointer", color: "#4b5563",
                          fontSize: 12, textAlign: "left", lineHeight: 1.4,
                          fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8,
                          animationDelay: `${i * 0.05}s`, animation: `sl20 0.4s ${i * 0.06}s cubic-bezier(0.16,1,0.3,1) both`,
                        }}>
                        <span style={{ fontSize: 14 }}>{s.icon}</span>
                        <span>{s.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((msg) => (
                <div key={msg.id}>
                  {/* ACTION */}
                  {msg.role === "action" && (
                    <div className="chatbot-msg-action" style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 2px" }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                        background: `linear-gradient(135deg,${ACTION_COLORS[msg.actionType ?? ""] ?? "#6366f1"}22,${ACTION_COLORS[msg.actionType ?? ""] ?? "#6366f1"}11)`,
                        border: `1px solid ${ACTION_COLORS[msg.actionType ?? ""] ?? "#6366f1"}44`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: ACTION_COLORS[msg.actionType ?? ""] ?? "#6366f1",
                        animation: "sc09 0.4s cubic-bezier(0.16,1,0.3,1)",
                        boxShadow: `0 0 8px ${ACTION_COLORS[msg.actionType ?? ""] ?? "#6366f1"}33`,
                      }}>
                        <ActionIcon type={msg.actionType} />
                      </div>
                      <span style={{ fontSize: 11, color: "#4b5563", fontStyle: "italic", animation: "sl03 0.3s ease" }}>{msg.content}</span>
                      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,rgba(99,102,241,0.2),transparent)" }} />
                    </div>
                  )}

                  {/* USER */}
                  {msg.role === "user" && (
                    <div className="chatbot-msg-user" style={{ display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "flex-start" }}>
                      <div style={{
                        maxWidth: "80%", position: "relative", overflow: "hidden",
                        background: "linear-gradient(135deg,#3730a3,#5b21b6,#6d28d9)",
                        color: "white", borderRadius: "18px 18px 4px 18px",
                        padding: "10px 14px", fontSize: 13, lineHeight: 1.65,
                        wordBreak: "break-word",
                        boxShadow: "0 4px 24px rgba(79,70,229,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
                      }}>
                        <div style={{
                          position: "absolute", inset: 0, borderRadius: "inherit",
                          background: "linear-gradient(120deg,transparent 30%,rgba(255,255,255,0.08) 50%,transparent 70%)",
                          animation: "sh04 4s ease infinite",
                          pointerEvents: "none",
                        }} />
                        {msg.content}
                      </div>
                      <div style={{
                        width: 30, height: 30, borderRadius: 10, flexShrink: 0,
                        background: "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1))",
                        border: "1px solid rgba(99,102,241,0.25)",
                        display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1,
                      }}>
                        <User size={14} color="#818cf8" />
                      </div>
                    </div>
                  )}

                  {/* ASSISTANT */}
                  {msg.role === "assistant" && (
                    <div className="chatbot-msg-bot" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 10, flexShrink: 0,
                        background: msg.error
                          ? "rgba(239,68,68,0.1)"
                          : "linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.15))",
                        border: `1px solid ${msg.error ? "rgba(239,68,68,0.3)" : "rgba(99,102,241,0.25)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1,
                        animation: msg.error ? "none" : "g01 4s ease-in-out infinite",
                      }}>
                        {msg.error ? <Zap size={13} color="#f87171" /> : <Brain size={13} color="#818cf8" />}
                      </div>
                      <div style={{ maxWidth: "83%", minWidth: 0 }}>
                        <div style={{ position: "relative" }}>
                          <div style={{
                            position: "relative", overflow: "hidden",
                            background: msg.error
                              ? "rgba(239,68,68,0.06)"
                              : "linear-gradient(135deg,rgba(20,16,50,0.9),rgba(15,12,38,0.95))",
                            border: `1px solid ${msg.error ? "rgba(239,68,68,0.2)" : "rgba(99,102,241,0.18)"}`,
                            color: msg.error ? "#fca5a5" : "#e2e8f0",
                            borderRadius: "4px 18px 18px 18px",
                            padding: "10px 14px", fontSize: 13, lineHeight: 1.7,
                            wordBreak: "break-word", whiteSpace: "pre-wrap",
                            boxShadow: msg.error ? "none" : "0 2px 20px rgba(99,102,241,0.1), inset 0 1px 0 rgba(255,255,255,0.04)",
                            animation: msg.error ? "none" : "rainbowBorder 5s ease-in-out infinite",
                          }}>
                            {!msg.error && (
                              <div style={{
                                position: "absolute", inset: 0, borderRadius: "inherit",
                                background: "linear-gradient(120deg,transparent 35%,rgba(99,102,241,0.04) 50%,transparent 65%)",
                                animation: "sh04 6s ease infinite",
                                pointerEvents: "none",
                              }} />
                            )}
                            {msg.content}
                          </div>

                          {/* Copy button */}
                          {!msg.error && (
                            <button
                              className="chatbot-copy-btn"
                              onClick={() => copyMessage(msg.id, msg.content)}
                              title="Copy message"
                              style={{
                                position: "absolute", top: 6, right: 6,
                                width: 22, height: 22, borderRadius: 7,
                                background: copiedId === msg.id ? "rgba(52,211,153,0.18)" : "rgba(99,102,241,0.12)",
                                border: `1px solid ${copiedId === msg.id ? "rgba(52,211,153,0.35)" : "rgba(99,102,241,0.2)"}`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                cursor: "pointer", opacity: 0.7,
                                animation: copiedId === msg.id ? "copyPop 0.25s cubic-bezier(0.16,1,0.3,1)" : "none",
                              }}
                            >
                              {copiedId === msg.id
                                ? <Check size={10} color="#34d399" />
                                : <Copy size={10} color="#818cf8" />
                              }
                            </button>
                          )}
                        </div>

                        {/* Details */}
                        {!msg.error && (msg.toolCalls?.length || msg.usage) && (
                          <div style={{ marginTop: 6 }}>
                            <button className="chatbot-detail-btn"
                              onClick={() => toggleDetails(msg.id)}
                              style={{
                                display: "flex", alignItems: "center", gap: 5, background: "none",
                                border: "none", cursor: "pointer", color: "#374151", fontSize: 10.5,
                                padding: "3px 7px", borderRadius: 7, fontFamily: "inherit",
                              }}>
                              <ChevronRight size={10} style={{ transition: "transform 0.2s", transform: expandedDetails.has(msg.id) ? "rotate(90deg)" : "none" }} />
                              <span style={{ animation: "gr07 6s ease infinite" }}>Details</span>
                              {msg.usage && <span style={{ color: "#374151" }}>· {msg.usage.total} tokens</span>}
                              {msg.durationMs && <span style={{ color: "#374151" }}>· {(msg.durationMs / 1000).toFixed(1)}s</span>}
                            </button>

                            {expandedDetails.has(msg.id) && (
                              <div style={{
                                marginTop: 6, padding: "10px 12px", borderRadius: 12,
                                background: "linear-gradient(135deg,rgba(10,8,30,0.95),rgba(15,12,40,0.9))",
                                border: "1px solid rgba(99,102,241,0.15)",
                                animation: "detailSlide 0.25s cubic-bezier(0.16,1,0.3,1)",
                              }}>
                                {msg.toolCalls?.length ? (
                                  <div style={{ marginBottom: msg.usage ? 9 : 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 7 }}>
                                      <Wrench size={9} color="#6366f1" style={{ animation: "ro05 2s ease-in-out infinite" }} />
                                      <span style={{ fontSize: 9.5, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: 0.8 }}>Tools Used</span>
                                    </div>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                      {msg.toolCalls.map((tc, i) => <ToolChip key={i} name={tc} />)}
                                    </div>
                                  </div>
                                ) : null}
                                {msg.usage && (
                                  <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                                      <Hash size={9} color="#8b5cf6" />
                                      <span style={{ fontSize: 9.5, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: 0.8 }}>Tokens</span>
                                    </div>
                                    <div style={{ display: "flex", gap: 10, fontSize: 10.5, fontFamily: "monospace" }}>
                                      <span style={{ color: "#60a5fa" }}>↑{msg.usage.prompt}</span>
                                      <span style={{ color: "#a78bfa" }}>↓{msg.usage.completion}</span>
                                      <span style={{ color: "#34d399", fontWeight: 800 }}>={msg.usage.total}</span>
                                    </div>
                                  </div>
                                )}
                                {msg.durationMs && (
                                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8 }}>
                                    <Clock size={9} color="#6366f1" />
                                    <span style={{ fontSize: 10, color: "#475569" }}>
                                      <strong style={{ color: "#a5b4fc" }}>{(msg.durationMs / 1000).toFixed(2)}s</strong>
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* LOADING */}
              {loading && (
                <div className="chatbot-msg-bot" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 10,
                    background: "linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.15))",
                    border: "1px solid rgba(99,102,241,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    animation: "g01 2s ease-in-out infinite",
                  }}>
                    <Brain size={13} color="#818cf8" style={{ animation: "sc04 1s ease-in-out infinite" }} />
                  </div>
                  <div style={{
                    background: "linear-gradient(135deg,rgba(20,16,50,0.9),rgba(15,12,38,0.95))",
                    border: "1px solid rgba(99,102,241,0.18)",
                    borderRadius: "4px 18px 18px 18px",
                    padding: "12px 16px", display: "flex", alignItems: "center", gap: 6,
                    boxShadow: "0 2px 20px rgba(99,102,241,0.1)",
                  }}>
                    <WaveLoader />
                    <span style={{ fontSize: 11, color: "#4b5563", marginLeft: 4, animation: "gr07 2s ease-in-out infinite" }}>Thinking...</span>
                  </div>
                </div>
              )}

              <div ref={bottomRef} style={{ height: 1 }} />
            </div>

            {/* ── INPUT AREA ── */}
            <div style={{
              padding: "10px 12px 14px", borderTop: "1px solid rgba(99,102,241,0.1)",
              flexShrink: 0, position: "relative", zIndex: 2,
              background: "linear-gradient(180deg,rgba(99,102,241,0.02),rgba(7,6,18,0.6))",
            }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(99,102,241,0.4),rgba(232,121,249,0.3),rgba(99,102,241,0.4),transparent)", animation: "sh17 4s ease-in-out infinite", backgroundSize: "200% 100%" }} />

              {hasKeys === false && (
                <button
                  onClick={() => setShowKeyManager(true)}
                  style={{
                    marginBottom: 9, padding: "8px 12px", borderRadius: 10, width: "100%",
                    background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)",
                    fontSize: 11.5, color: "#fca5a5", textAlign: "center",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    animation: "bo05 2.5s ease-in-out infinite", cursor: "pointer",
                  }}>
                  <Key size={11} />
                  No API keys — click to add Gemini, Groq, OpenRouter keys
                </button>
              )}

              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                {/* Voice input button */}
                <button
                  onClick={toggleVoice}
                  title={listening ? "Stop listening" : "Voice input"}
                  style={{
                    width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                    background: listening
                      ? "rgba(239,68,68,0.15)"
                      : "rgba(30,27,60,0.5)",
                    border: `1px solid ${listening ? "rgba(239,68,68,0.4)" : "rgba(99,102,241,0.2)"}`,
                    color: listening ? "#f87171" : "#4b5563",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                    animation: listening ? "micPulse 1.2s ease-in-out infinite" : "none",
                    transition: "all 0.2s",
                  } as React.CSSProperties}
                >
                  {listening ? <MicOff size={15} /> : <Mic size={15} />}
                </button>

                <div style={{ flex: 1, position: "relative" }}>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything about your notes…"
                    rows={1}
                    style={{
                      width: "100%", resize: "none",
                      background: "rgba(20,16,50,0.5)",
                      border: "1px solid rgba(99,102,241,0.22)", borderRadius: 14,
                      padding: "10px 13px", fontSize: 13, color: "#e2e8f0",
                      outline: "none", maxHeight: 110, overflowY: "auto", lineHeight: 1.55,
                      fontFamily: "inherit", transition: "border-color 0.2s, box-shadow 0.2s",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
                    }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = "rgba(139,92,246,0.55)";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.15),inset 0 1px 0 rgba(255,255,255,0.04)";
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = "rgba(99,102,241,0.22)";
                      e.currentTarget.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.03)";
                    }}
                  />
                  {input && (
                    <div style={{
                      position: "absolute", bottom: -2, left: 8, right: 8, height: 2, borderRadius: 1,
                      background: "linear-gradient(90deg,#6366f1,#e879f9,#60a5fa)",
                      backgroundSize: "200% 100%",
                      animation: "sh17 2s ease-in-out infinite",
                      opacity: 0.7,
                    }} />
                  )}
                </div>

                <button
                  ref={sendBtnRef}
                  onClick={handleSend}
                  disabled={!input.trim() || loading || hasKeys === false}
                  style={{
                    width: 42, height: 42, borderRadius: 13, flexShrink: 0,
                    background: (!input.trim() || loading || hasKeys === false)
                      ? "rgba(30,27,60,0.5)"
                      : "linear-gradient(135deg,#4f46e5,#7c3aed,#9333ea)",
                    color: (!input.trim() || loading || hasKeys === false) ? "#374151" : "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: (!input.trim() || loading || hasKeys === false) ? "not-allowed" : "pointer",
                    transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)",
                    boxShadow: (!input.trim() || loading || hasKeys === false) ? "none" : "0 4px 20px rgba(79,70,229,0.4)",
                    animation: sendAnim ? "sendPulse 0.4s ease" : "none",
                    border: "1px solid rgba(99,102,241,0.2)",
                  }}
                >
                  {loading ? (
                    <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(99,102,241,0.3)", borderTopColor: "#818cf8", animation: "ro01 0.8s linear infinite" }} />
                  ) : (
                    <Send size={16} style={{ marginLeft: 1 }} />
                  )}
                </button>
              </div>

              {/* Footer hint */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 8 }}>
                <span style={{ fontSize: 9.5, color: "#1f2937" }}>
                  <kbd style={{ padding: "1px 5px", borderRadius: 4, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)", fontSize: 9, color: "#4b5563" }}>Enter</kbd>
                  {" "}send
                </span>
                <span style={{ fontSize: 9.5, color: "#1f2937" }}>
                  <kbd style={{ padding: "1px 5px", borderRadius: 4, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)", fontSize: 9, color: "#4b5563" }}>Shift+Enter</kbd>
                  {" "}newline
                </span>
                <FileText size={9} color="#1f2937" />
                <span style={{ fontSize: 9.5, color: "#1f2937" }}>markdown supported</span>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
