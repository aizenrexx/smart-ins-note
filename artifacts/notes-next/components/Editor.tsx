"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, ChevronDown } from "lucide-react";
import {
  ClayStar, ClayArchive, ClayTrash, ClayFileText, ClayPin,
  ClayDownload, ClayType, ClaySparkles, ClayAI,
  ClayMaximize, ClayMinimize, ClayZoomIn, ClayZoomOut, ClayClose,
} from "./ClayIcons";
import type { Note } from "@/lib/api";
import { hasGeminiKey, aiSummarize, aiImproveWriting, aiGenerateTitle, aiContinueWriting, aiFixGrammar, aiMakeShorter, aiMakeLonger, aiBrainstorm, aiFormatMarkdown } from "@/lib/gemini";
import { RichTextEditor } from "./RichTextEditor";

function formatFullDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function exportNote(title: string, content: string) {
  const filename = (title || "untitled").replace(/[^a-z0-9]/gi, "_").toLowerCase() + ".html";
  const blob = new Blob([`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body><h1>${title}</h1>${content}</body></html>`], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

type AiAction = { label: string; emoji: string; desc: string; fn: (c: string) => Promise<string>; };

function stripHtmlForAi(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const AI_ACTIONS: AiAction[] = [
  { label: "Summarize", emoji: "📝", desc: "Get a concise summary", fn: aiSummarize },
  { label: "Improve Writing", emoji: "✨", desc: "Enhance clarity & flow", fn: aiImproveWriting },
  { label: "Fix Grammar", emoji: "🔧", desc: "Correct errors", fn: aiFixGrammar },
  { label: "Continue Writing", emoji: "➡️", desc: "AI continues your text", fn: aiContinueWriting },
  { label: "Make Shorter", emoji: "📉", desc: "Condense by ~40%", fn: aiMakeShorter },
  { label: "Make Longer", emoji: "📈", desc: "Expand with more detail", fn: aiMakeLonger },
  { label: "Brainstorm", emoji: "💡", desc: "Generate related ideas", fn: aiBrainstorm },
  { label: "Format Markdown", emoji: "📄", desc: "Structure as markdown", fn: aiFormatMarkdown },
  { label: "Generate Title", emoji: "🏷️", desc: "Suggest a note title", fn: aiGenerateTitle },
];

interface Props {
  note: Note | null;
  onChange: (id: string, field: "title" | "content", value: string) => void;
  onToggleStar: (note: Note) => void;
  onTogglePin: (note: Note) => void;
  onTrash: (note: Note) => void;
  onArchive: (note: Note) => void;
  onOpenSettings: () => void;
  onToast?: (msg: string, type?: "success" | "info" | "warning" | "error") => void;
  focusMode?: boolean;
  onExitFocus?: () => void;
}

type SaveStatus = "idle" | "saving" | "saved";

export function Editor({ note, onChange, onToggleStar, onTogglePin, onTrash, onArchive, onOpenSettings, onToast, focusMode, onExitFocus }: Props) {
  const [localTitle, setLocalTitle] = useState("");
  const [localContent, setLocalContent] = useState("");
  const [showWordCount, setShowWordCount] = useState(true);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ label: string; text: string } | null>(null);
  const [aiError, setAiError] = useState("");
  const [geminiEnabled, setGeminiEnabled] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [fontSize, setFontSize] = useState(15);
  const [zenMode, setZenMode] = useState(false);
  const [copiedAi, setCopiedAi] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedId = useRef<string | null>(null);

  useEffect(() => { setGeminiEnabled(hasGeminiKey()); }, [showAiMenu]);

  useEffect(() => {
    if (!note) return;
    if (note.id !== lastSavedId.current) {
      setLocalTitle(note.title);
      setLocalContent(note.content);
      lastSavedId.current = note.id;
      setAiResult(null);
      setAiError("");
      setSaveStatus("idle");
    }
  }, [note]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.shiftKey && e.key === "F") { e.preventDefault(); setZenMode(z => !z); }
      if (meta && e.key === "=") { e.preventDefault(); setFontSize(f => Math.min(f + 1, 24)); }
      if (meta && e.key === "-") { e.preventDefault(); setFontSize(f => Math.max(f - 1, 11)); }
      if (e.key === "Escape") {
        setShowAiMenu(false); setAiResult(null); setAiError("");
        if (zenMode) setZenMode(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zenMode]);

  const scheduleSave = useCallback(
    (field: "title" | "content", value: string) => {
      if (!note) return;
      setSaveStatus("saving");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        onChange(note.id, field, value);
        setSaveStatus("saved");
        savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
      }, 600);
    },
    [note, onChange]
  );

  async function runAiAction(action: AiAction) {
    if (!note) return;
    setShowAiMenu(false);
    setAiLoading(true);
    setAiError("");
    setAiResult(null);
    try {
      const plainText = stripHtmlForAi(localContent) || "(empty note)";
      const text = await action.fn(plainText);
      setAiResult({ label: action.label, text });
      onToast?.(`✨ ${action.label} complete`, "success");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI error");
      onToast?.("AI error — check your API key", "error");
    } finally {
      setAiLoading(false);
    }
  }

  function applyAiResult(field: "title" | "content") {
    if (!aiResult || !note) return;
    if (field === "title") {
      setLocalTitle(aiResult.text);
      onChange(note.id, "title", aiResult.text);
      onToast?.("Title applied", "success");
    } else {
      const html = `<p>${aiResult.text.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
      setLocalContent(html);
      onChange(note.id, "content", html);
      onToast?.("Content replaced", "success");
    }
    setAiResult(null);
  }

  function copyAiResult() {
    if (!aiResult) return;
    navigator.clipboard.writeText(aiResult.text);
    setCopiedAi(true);
    setTimeout(() => setCopiedAi(false), 1500);
    onToast?.("Copied to clipboard", "info");
  }

  if (!note) {
    return (
      <div className="panel-editor" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ animation: "floatIcon 3s ease-in-out infinite", opacity: 0.55 }}>
          <ClayFileText size={72} />
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", opacity: 0.4, marginBottom: 6, letterSpacing: -0.3 }}>No note selected</p>
          <p style={{ fontSize: 12.5, color: "var(--text-faint)" }}>Pick a note from the list or create a new one</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", maxWidth: 340, marginTop: 4 }}>
          {[
            { key: "⌘N", label: "New note" },
            { key: "⌘K", label: "Search" },
            { key: "⌘/", label: "Shortcuts" },
            { key: "⌘,", label: "AI Settings" },
          ].map(h => (
            <span key={h.key} style={{
              fontSize: 11.5, background: "var(--bg-hover)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "5px 11px", color: "var(--text-faint)",
              display: "flex", alignItems: "center", gap: 6
            }}>
              <kbd style={{ background: "var(--border)", padding: "1px 5px", borderRadius: 4, fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>{h.key}</kbd>
              {h.label}
            </span>
          ))}
        </div>
        <style>{`@keyframes floatIcon { 0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)} }`}</style>
      </div>
    );
  }

  const editorContent = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}
      onClick={() => setShowAiMenu(false)}>

      {/* Reading progress */}
      <div className="reading-progress">
        <div className="reading-progress-fill" style={{ width: saveStatus === "saving" ? "60%" : saveStatus === "saved" ? "100%" : "0%" }} />
      </div>

      {/* Top toolbar */}
      <div style={{ borderBottom: "1px solid var(--border)", padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, flexShrink: 0, marginTop: 2 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
          {formatFullDate(note.updatedAt || note.createdAt)}
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span className={`save-dot ${saveStatus}`} />
            {saveStatus === "saving" && <span style={{ fontSize: 10, color: "#f59e0b", animation: "fadeIn 0.2s ease" }}>Saving…</span>}
            {saveStatus === "saved" && <span style={{ fontSize: 10, color: "#10b981", animation: "fadeIn 0.2s ease" }}>Saved ✓</span>}
          </span>
        </span>

        <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
          {/* AI Button */}
          <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowAiMenu(m => !m)}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, border: `1px solid ${geminiEnabled ? "rgba(99,102,241,0.4)" : "var(--border)"}`, background: showAiMenu ? "rgba(99,102,241,0.12)" : geminiEnabled ? "rgba(99,102,241,0.06)" : "none", cursor: "pointer", color: geminiEnabled ? "#818cf8" : "var(--text-muted)", fontSize: 12, fontWeight: 600, transition: "all 0.15s" }}>
              {aiLoading
                ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite", color: "#818cf8" }} />
                : <span className="ai-sparkle" style={{ lineHeight: 0 }}><ClaySparkles size={16} /></span>}
              AI
              <ChevronDown size={10} style={{ transition: "transform 0.15s", transform: showAiMenu ? "rotate(180deg)" : "none" }} />
            </button>

            {showAiMenu && (
              <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "var(--bg-editor)", border: "1px solid var(--border)", borderRadius: 13, padding: 7, zIndex: 50, width: 248, boxShadow: "0 16px 50px rgba(0,0,0,0.28)", animation: "scaleIn 0.12s ease" }}>
                {!geminiEnabled ? (
                  <div style={{ padding: "14px 16px", textAlign: "center" }}>
                    <span style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><ClaySparkles size={36} /></span>
                    <p style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 700, marginBottom: 6 }}>AI not set up</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>Add your Gemini API key to enable AI.</p>
                    <button onClick={() => { setShowAiMenu(false); onOpenSettings(); }}
                      style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      Open Settings
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ padding: "4px 10px 8px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--text-muted)" }}>
                      ✨ Gemini AI
                    </div>
                    {AI_ACTIONS.map((action, i) => (
                      <button key={action.label} onClick={() => runAiAction(action)}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, border: "none", background: "none", cursor: "pointer", textAlign: "left", transition: "background 0.08s", animation: `fadeInUp 0.15s ease both`, animationDelay: `${i * 25}ms` }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                        <span style={{ fontSize: 16, flexShrink: 0 }}>{action.emoji}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{action.label}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{action.desc}</div>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 1px" }} />

          {/* Font size */}
          <button className="font-ctrl-btn" onClick={() => setFontSize(f => Math.max(f - 1, 11))} title="Decrease font size (⌘-)" style={{ lineHeight: 0 }}><ClayZoomOut size={17} /></button>
          <span style={{ fontSize: 10, color: "var(--text-muted)", minWidth: 22, textAlign: "center" }}>{fontSize}</span>
          <button className="font-ctrl-btn" onClick={() => setFontSize(f => Math.min(f + 1, 24))} title="Increase font size (⌘=)" style={{ lineHeight: 0 }}><ClayZoomIn size={17} /></button>

          <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 1px" }} />

          <EditorBtn title="Word count" active={showWordCount} activeColor="var(--accent)" onClick={() => setShowWordCount(s => !s)}>
            <ClayType size={17} />
          </EditorBtn>
          <EditorBtn title="Zen mode (⌘⇧F)" active={zenMode} activeColor="#8b5cf6" onClick={() => setZenMode(z => !z)}>
            {zenMode ? <ClayMinimize size={17} /> : <ClayMaximize size={17} />}
          </EditorBtn>
          <EditorBtn title="Export as HTML" active={false} activeColor="var(--accent)" onClick={() => { exportNote(localTitle, localContent); onToast?.("Exported as .html", "info"); }}>
            <ClayDownload size={17} />
          </EditorBtn>

          <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 1px" }} />

          <EditorBtn title={note.pinned ? "Unpin" : "Pin"} active={!!note.pinned} activeColor="var(--pin)" onClick={() => { onTogglePin(note); onToast?.(note.pinned ? "Unpinned" : "Pinned 📌", "info"); }}>
            <ClayPin size={17} />
          </EditorBtn>
          <EditorBtn title={note.starred ? "Unstar" : "Star"} active={!!note.starred} activeColor="#f59e0b" onClick={() => { onToggleStar(note); onToast?.(note.starred ? "Unstarred" : "Starred ⭐", "info"); }}>
            <ClayStar size={17} />
          </EditorBtn>
          <EditorBtn title={note.archived ? "Unarchive" : "Archive"} active={!!note.archived} activeColor="var(--accent)" onClick={() => { onArchive(note); onToast?.(note.archived ? "Unarchived" : "Archived", "info"); }}>
            <ClayArchive size={17} />
          </EditorBtn>
          <EditorBtn title="Move to trash" active={false} activeColor="#f87171" onClick={() => { onTrash(note); onToast?.("Moved to trash", "warning"); }}>
            <ClayTrash size={17} />
          </EditorBtn>
        </div>
      </div>

      {/* AI loading bar */}
      {aiLoading && <div className="ai-loading-bar" />}

      {/* AI Result Panel */}
      {(aiLoading || aiResult || aiError) && (
        <div className="ai-result-panel" style={{ borderBottom: "1px solid var(--border)", padding: "12px 20px", background: "rgba(99,102,241,0.04)", flexShrink: 0 }}>
          {aiLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#818cf8", fontSize: 13 }}>
              <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
              <span>Gemini is thinking…</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>This may take a few seconds</span>
            </div>
          )}
          {aiError && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#f87171", fontSize: 13 }}>
              <span>⚠ {aiError}</span>
              <button onClick={() => setAiError("")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", lineHeight: 0 }}><ClayClose size={16} /></button>
            </div>
          )}
          {aiResult && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", display: "flex", alignItems: "center", gap: 6 }}>
                  <ClayAI size={16} /> {aiResult.label}
                </span>
                <button onClick={() => setAiResult(null)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 3, borderRadius: 4, transition: "background 0.1s", lineHeight: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                  <ClayClose size={15} />
                </button>
              </div>
              <div style={{ background: "var(--bg-editor)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--text-primary)", lineHeight: 1.65, maxHeight: 150, overflowY: "auto", marginBottom: 10, fontFamily: "inherit", animation: "fadeInUp 0.18s ease" }}>
                {aiResult.text}
              </div>
              <div style={{ display: "flex", gap: 7 }}>
                {aiResult.label === "Generate Title" ? (
                  <button onClick={() => applyAiResult("title")}
                    style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    Apply as Title
                  </button>
                ) : (
                  <button onClick={() => applyAiResult("content")}
                    style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    Replace Content
                  </button>
                )}
                <button onClick={() => {
                  const appended = localContent + `<hr><p><strong>AI — ${aiResult.label}</strong></p><p>${aiResult.text.replace(/\n/g, "<br>")}</p>`;
                  setLocalContent(appended); onChange(note.id, "content", appended); setAiResult(null);
                  onToast?.("AI result appended", "success");
                }}
                  style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid var(--border)", background: "none", color: "var(--text-primary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Append
                </button>
                <button onClick={copyAiResult}
                  style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid var(--border)", background: copiedAi ? "rgba(16,185,129,0.1)" : "none", color: copiedAi ? "#10b981" : "var(--text-muted)", fontSize: 12, cursor: "pointer", transition: "all 0.2s" }}>
                  {copiedAi ? "Copied ✓" : "Copy"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Title */}
      <div style={{ padding: "20px 32px 0", flexShrink: 0 }}>
        <textarea
          className="editor-title"
          value={localTitle}
          onChange={(e) => { setLocalTitle(e.target.value); scheduleSave("title", e.target.value); }}
          placeholder="Title"
          rows={1}
          style={{ minHeight: 36, overflow: "hidden", marginBottom: 10, fontSize: Math.max(fontSize + 7, 18) }}
          onInput={(e) => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }}
        />
        <div style={{ height: 1, background: "var(--border)", marginBottom: 0 }} />
      </div>

      {/* Rich Text Editor */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <RichTextEditor
          content={localContent}
          onChange={(html) => { setLocalContent(html); scheduleSave("content", html); }}
          fontSize={fontSize}
          zenMode={zenMode}
        />
      </div>

      {/* Status bar — only word count toggle; RichTextEditor has its own built-in */}
      {!showWordCount && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "5px 32px", display: "flex", gap: 14, alignItems: "center", flexShrink: 0 }}>
          {geminiEnabled && (
            <span style={{ fontSize: 11, color: "#818cf8", display: "flex", alignItems: "center", gap: 4 }}>
              <ClaySparkles size={13} /> AI ready
            </span>
          )}
          {zenMode && <span style={{ fontSize: 11, color: "#8b5cf6", fontWeight: 600, letterSpacing: 0.3 }}>ZEN MODE</span>}
        </div>
      )}
    </div>
  );

  if (zenMode || focusMode) {
    return (
      <div className="focus-mode-overlay">
        <button className="focus-exit-btn" onClick={() => { setZenMode(false); onExitFocus?.(); }}>
          <ClayMinimize size={14} /> Exit {zenMode ? "Zen" : "Focus"} Mode
          <span style={{ opacity: 0.6, fontSize: 10 }}>Esc</span>
        </button>
        {editorContent}
      </div>
    );
  }

  return (
    <div className="panel-editor" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      {editorContent}
    </div>
  );
}

function EditorBtn({ children, onClick, title, active, activeColor }: {
  children: React.ReactNode; onClick: () => void; title: string; active: boolean; activeColor: string;
}) {
  return (
    <button title={title} onClick={onClick}
      style={{ background: active ? `${activeColor}18` : "none", border: "none", cursor: "pointer", padding: "5px 7px", borderRadius: 6, color: active ? activeColor : "var(--text-muted)", display: "flex", alignItems: "center", transition: "all 0.12s" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.1)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = active ? `${activeColor}18` : "none"; (e.currentTarget as HTMLButtonElement).style.transform = "none"; }}>
      {children}
    </button>
  );
}
