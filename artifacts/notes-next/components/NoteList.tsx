"use client";

import { useState, useRef, useCallback } from "react";
import { Pin, Star, Archive } from "lucide-react";
import {
  ClaySearch, ClayPlus, ClayStar, ClayStarFill, ClayArchive, ClayTrash,
  ClayRestore, ClayFileText, ClayStickyNote, ClayPin, ClayPinFill, ClayClose,
} from "./ClayIcons";
import type { Note } from "@/lib/api";
import type { View } from "./AppShell";

function formatDate(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function wc(t: string) { return t.trim() ? t.trim().split(/\s+/).length : 0; }
function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function highlightText(text: string, query: string) {
  if (!query || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="search-highlight">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

/* Deterministic pastel accent per note (first char code) */
const ACCENT_COLORS = [
  "#818cf8", "#34d399", "#f59e0b", "#f87171",
  "#60a5fa", "#c084fc", "#fb923c", "#4ade80", "#e879f9"
];
function noteAccent(id: string) {
  const code = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
  return ACCENT_COLORS[code % ACCENT_COLORS.length];
}

interface ContextMenuState { x: number; y: number; note: Note; }

interface Props {
  notes: Note[];
  view: View;
  search: string;
  selectedId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onSearch: (q: string) => void;
  onNew: () => void;
  onToggleStar: (note: Note) => void;
  onTogglePin: (note: Note) => void;
  onArchive: (note: Note) => void;
  onTrash: (note: Note) => void;
  onRestore: (note: Note) => void;
  onDeleteForever: (id: string) => void;
  onToast?: (msg: string, type?: "success" | "info" | "warning" | "error") => void;
}

const viewLabel: Record<View, string> = {
  notes: "All Notes", starred: "Starred", archived: "Archived",
  trash: "Trash", pinned: "Pinned", tag: "Tag",
};

const emptyMessages: Record<View, string> = {
  notes: "No notes yet", starred: "No starred notes", archived: "Nothing archived",
  trash: "Trash is empty", pinned: "No pinned notes", tag: "No notes with this tag",
};

const emptyHints: Record<View, string> = {
  notes: "Hit + or ⌘N to write your first note",
  starred: "Star notes you want to find quickly",
  archived: "Archive notes to keep things tidy",
  trash: "Deleted notes land here",
  pinned: "Pin important notes for quick access",
  tag: "Assign tags to notes from the editor",
};

export function NoteList({ notes, view, search, selectedId, loading, onSelect, onSearch, onNew, onToggleStar, onTogglePin, onArchive, onTrash, onRestore, onDeleteForever, onToast }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [animatingNew, setAnimatingNew] = useState(false);

  function handleNew() {
    setAnimatingNew(true);
    setTimeout(() => setAnimatingNew(false), 400);
    onNew();
  }

  function handleContextMenu(e: React.MouseEvent, note: Note) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, note });
  }

  const closeContext = useCallback(() => setContextMenu(null), []);

  return (
    <div className="panel-list" style={{ width: 296, display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}
      onClick={closeContext}>

      {/* Header */}
      <div style={{ padding: "14px 14px 10px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", letterSpacing: -0.3, display: "flex", alignItems: "center", gap: 8 }}>
            {viewLabel[view]}
            {notes.length > 0 && (
              <span className="count-badge" style={{ background: "var(--bg-hover)", color: "var(--text-faint)", fontWeight: 600 }}>
                {notes.length}
              </span>
            )}
          </span>
          {view !== "trash" && (
            <button
              onClick={handleNew}
              className="new-note-btn"
              style={{
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                border: "none", borderRadius: "50%",
                width: 28, height: 28,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "white", flexShrink: 0,
                boxShadow: "0 2px 12px rgba(99,102,241,0.45)",
                animation: animatingNew ? "bounceIn 0.4s ease" : "none"
              }}
              title="New note (⌘N)">
              <ClayPlus size={20} />
            </button>
          )}
        </div>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", lineHeight: 0 }}><ClaySearch size={15} /></span>
          <input
            className="search-input"
            type="search"
            placeholder="Search notes…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => onSearch("")}
              style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex", padding: 2, borderRadius: 4, lineHeight: 0 }}>
              <ClayClose size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--border)", marginBottom: 2, flexShrink: 0 }} />

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* Skeleton */}
        {loading && (
          <div className="notes-list-body">
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ padding: "14px", background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", opacity: 1 - i * 0.18 }}>
                <div className="skeleton" style={{ height: 13, width: `${60 + i * 8}%`, marginBottom: 9 }} />
                <div className="skeleton" style={{ height: 11, width: "88%", marginBottom: 5 }} />
                <div className="skeleton" style={{ height: 11, width: "65%", marginBottom: 10 }} />
                <div className="skeleton" style={{ height: 10, width: 48 }} />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && notes.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">
              {search ? <ClaySearch size={56} /> : <ClayStickyNote size={56} />}
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", opacity: 0.5, marginTop: 4 }}>
              {search ? `No results for "${search}"` : emptyMessages[view]}
            </p>
            <p style={{ fontSize: 12, color: "var(--text-faint)", textAlign: "center", maxWidth: 220 }}>
              {search ? "Try a different search term" : emptyHints[view]}
            </p>
            {search && (
              <button onClick={() => onSearch("")}
                style={{ marginTop: 10, fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2 }}>
                Clear search
              </button>
            )}
          </div>
        )}

        {/* Note cards — card-gap layout */}
        {!loading && notes.length > 0 && (
          <div className="notes-list-body">
            {notes.map((note, i) => {
              const words = wc(stripHtml(note.content));
              const accent = noteAccent(note.id);
              const isSelected = selectedId === note.id;
              const isHovered = hoveredId === note.id;

              return (
                <div
                  key={note.id}
                  className={`note-card ${isSelected ? "selected" : ""}`}
                  style={{ "--card-index": Math.min(i, 14) } as React.CSSProperties}
                  onClick={() => onSelect(note.id)}
                  onContextMenu={(e) => handleContextMenu(e, note)}
                  onMouseEnter={() => setHoveredId(note.id)}
                  onMouseLeave={() => setHoveredId(null)}>

                  {/* Color accent strip */}
                  <div style={{
                    position: "absolute", left: 0, top: 10, bottom: 10, width: 3,
                    borderRadius: "0 3px 3px 0",
                    background: isSelected || isHovered ? accent : "transparent",
                    transition: "background 0.18s",
                    boxShadow: isSelected ? `0 0 8px ${accent}80` : "none"
                  }} />

                  {/* Title row */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6, marginBottom: 5 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontWeight: 650, fontSize: 13, color: "var(--text-primary)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        display: "flex", alignItems: "center", gap: 5
                      }}>
                        {note.pinned && <Pin size={9} style={{ color: "var(--pin)", fill: "var(--pin)", flexShrink: 0 }} />}
                        {note.title
                          ? highlightText(note.title, search)
                          : <span style={{ color: "var(--text-faint)", fontStyle: "italic", fontWeight: 400 }}>Untitled</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
                      {note.starred && <Star size={10} style={{ color: "#f59e0b", fill: "#f59e0b" }} />}
                      {note.archived && !note.trashed && <Archive size={9} style={{ color: "var(--text-faint)", opacity: 0.7 }} />}
                    </div>
                  </div>

                  {/* Preview */}
                  <div style={{
                    fontSize: 12, color: "var(--note-preview)", lineHeight: 1.5,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                    overflow: "hidden", marginBottom: 8
                  }}>
                    {note.content
                      ? (() => { const plain = stripHtml(note.content).slice(0, 130); return search ? highlightText(plain, search) : plain; })()
                      : <span style={{ fontStyle: "italic", color: "var(--text-faint)" }}>No content yet</span>}
                  </div>

                  {/* Footer */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                    <span style={{ fontSize: 10.5, color: "var(--note-date)", fontWeight: 500 }}>
                      {formatDate(note.updatedAt || note.createdAt)}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      {words > 0 && !isHovered && (
                        <span className="wc-badge">{words}w</span>
                      )}
                      {isHovered && (
                        <div style={{ display: "flex", gap: 1, animation: "fadeIn 0.1s ease" }} onClick={e => e.stopPropagation()}>
                          {view === "trash" ? (
                            <>
                              <ActionBtn title="Restore" onClick={() => { onRestore(note); onToast?.("Note restored", "success"); }}><ClayRestore size={16} /></ActionBtn>
                              <ActionBtn title="Delete forever" onClick={() => { onDeleteForever(note.id); onToast?.("Deleted permanently", "warning"); }} danger><ClayTrash size={16} /></ActionBtn>
                            </>
                          ) : (
                            <>
                              <ActionBtn title={note.pinned ? "Unpin" : "Pin"} onClick={() => onTogglePin(note)}>
                                <ClayPin size={16} />
                              </ActionBtn>
                              <ActionBtn title={note.starred ? "Unstar" : "Star"} onClick={() => onToggleStar(note)}>
                                {note.starred ? <ClayStarFill size={16} /> : <ClayStar size={16} />}
                              </ActionBtn>
                              <ActionBtn title={note.archived ? "Unarchive" : "Archive"} onClick={() => onArchive(note)}>
                                <ClayArchive size={16} />
                              </ActionBtn>
                              <ActionBtn title="Move to trash" onClick={() => onTrash(note)} danger>
                                <ClayTrash size={16} />
                              </ActionBtn>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer bar */}
      <div style={{
        padding: "6px 14px", borderTop: "1px solid var(--border)",
        fontSize: 11, color: "var(--text-faint)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0, background: "var(--bg-sidebar)"
      }}>
        <span style={{ fontWeight: 500 }}>{notes.length} {notes.length === 1 ? "note" : "notes"}</span>
        {search && <span style={{ color: "var(--accent)", fontWeight: 600 }}>filtered</span>}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div className="context-menu"
          style={{ left: Math.min(contextMenu.x, window.innerWidth - 195), top: Math.min(contextMenu.y, window.innerHeight - 230) }}
          onClick={e => e.stopPropagation()}>
          <div style={{ padding: "5px 12px 7px", fontSize: 11, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 0.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 165 }}>
            {contextMenu.note.title || "Untitled"}
          </div>
          <div className="context-divider" />
          <ContextItem icon={<ClayPin size={15} />} label={contextMenu.note.pinned ? "Unpin" : "Pin"} onClick={() => { onTogglePin(contextMenu.note); closeContext(); }} />
          <ContextItem icon={<ClayStar size={15} />} label={contextMenu.note.starred ? "Unstar" : "Star"} onClick={() => { onToggleStar(contextMenu.note); closeContext(); }} />
          <ContextItem icon={<ClayArchive size={15} />} label={contextMenu.note.archived ? "Unarchive" : "Archive"} onClick={() => { onArchive(contextMenu.note); closeContext(); }} />
          <div className="context-divider" />
          <ContextItem icon={<ClayTrash size={15} />} label="Move to Trash" danger onClick={() => { onTrash(contextMenu.note); onToast?.("Moved to trash", "warning"); closeContext(); }} />
        </div>
      )}
    </div>
  );
}

function ActionBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean; }) {
  return (
    <button title={title} onClick={onClick}
      style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 5px", borderRadius: 6, color: "var(--text-faint)", display: "flex", alignItems: "center", transition: "all 0.1s" }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = danger ? "rgba(248,113,113,0.14)" : "var(--bg-hover)";
        el.style.color = danger ? "#f87171" : "var(--text-primary)";
        el.style.transform = "scale(1.18)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = "none"; el.style.color = "var(--text-faint)"; el.style.transform = "none";
      }}>
      {children}
    </button>
  );
}

function ContextItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean; }) {
  return (
    <div className={`context-item ${danger ? "danger" : ""}`} onClick={onClick}>
      {icon} {label}
    </div>
  );
}
