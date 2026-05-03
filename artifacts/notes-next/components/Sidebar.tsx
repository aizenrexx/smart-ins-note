"use client";

import { useState } from "react";
import { X, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useTheme } from "@/lib/providers";
import Link from "next/link";
import type { View } from "./AppShell";
import type { Tag as TagType } from "@/lib/api";
import {
  ClayNotes, ClayPin, ClayStar, ClayArchive, ClayTrash,
  ClayHash, ClaySettings, ClayKeyboard, ClayHome,
  ClaySun, ClayMoon, ClayBook,
} from "./ClayIcons";

interface Props {
  view: View;
  activeTagId: string | null;
  tags: TagType[];
  counts: Record<string, number>;
  onViewChange: (v: View) => void;
  onTagClick: (id: string) => void;
  onCreateTag: (name: string) => void;
  onDeleteTag: (id: string) => void;
  onShowShortcuts: () => void;
  onOpenSettings: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const TAG_COLORS = ["#818cf8", "#34d399", "#f59e0b", "#f87171", "#60a5fa", "#c084fc", "#fb923c", "#4ade80"];

const NAV_ITEMS: { id: View; label: string; Icon: React.FC<{ size?: number }>; accentColor: string }[] = [
  { id: "notes",    label: "Notes",    Icon: ClayNotes,   accentColor: "#a78bfa" },
  { id: "pinned",   label: "Pinned",   Icon: ClayPin,     accentColor: "#f87171" },
  { id: "starred",  label: "Starred",  Icon: ClayStar,    accentColor: "#fbbf24" },
  { id: "archived", label: "Archived", Icon: ClayArchive, accentColor: "#60a5fa" },
  { id: "trash",    label: "Trash",    Icon: ClayTrash,   accentColor: "#fb7185" },
];

export function Sidebar({ view, activeTagId, tags, counts, onViewChange, onTagClick, onCreateTag, onDeleteTag, onShowShortcuts, onOpenSettings, collapsed, onToggleCollapse }: Props) {
  const { dark, toggle } = useTheme();
  const [addingTag, setAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  function submitTag() {
    const name = newTagName.trim();
    if (!name) { setAddingTag(false); return; }
    onCreateTag(name);
    setNewTagName("");
    setAddingTag(false);
  }

  /* ── Collapsed rail ── */
  if (collapsed) {
    return (
      <div className="panel-sidebar" style={{ width: 60, display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 0 12px", gap: 4 }}>
        {/* Logo */}
        <div style={{ marginBottom: 6 }}>
          <ClayBook size={32} />
        </div>

        <button onClick={onToggleCollapse} title="Expand sidebar"
          style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", borderRadius: 8, color: "var(--text-faint)", display: "flex", marginBottom: 4, transition: "all 0.13s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-faint)"; (e.currentTarget as HTMLElement).style.background = "none"; }}>
          <ChevronRight size={13} />
        </button>

        {NAV_ITEMS.map(item => (
          <button key={item.id}
            title={`${item.label}${counts[item.id] ? ` (${counts[item.id]})` : ""}`}
            onClick={() => onViewChange(item.id)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "5px", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s cubic-bezier(0.34,1.56,0.64,1)", position: "relative",
              transform: view === item.id ? "scale(1.12)" : hoveredNav === item.id ? "scale(1.05)" : "scale(1)",
              opacity: view === item.id ? 1 : hoveredNav === item.id ? 0.9 : 0.65,
            }}
            onMouseEnter={() => setHoveredNav(item.id)}
            onMouseLeave={() => setHoveredNav(null)}>
            <item.Icon size={30} />
            {counts[item.id] > 0 && (
              <span style={{
                position: "absolute", top: 2, right: 2, minWidth: 14, height: 14,
                borderRadius: 7, background: item.accentColor, color: "white",
                fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0 3px", boxShadow: `0 1px 4px ${item.accentColor}88`,
              }}>{counts[item.id] > 99 ? "99+" : counts[item.id]}</span>
            )}
          </button>
        ))}

        <div style={{ flex: 1 }} />
        <button onClick={toggle} title={dark ? "Light mode" : "Dark mode"}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 5, borderRadius: 9, display: "flex", transition: "transform 0.15s", opacity: 0.7 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.1)"; (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}>
          {dark ? <ClaySun size={26} /> : <ClayMoon size={26} />}
        </button>
      </div>
    );
  }

  /* ── Full sidebar ── */
  return (
    <div className="panel-sidebar" style={{ width: 226, display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>

      {/* Brand header */}
      <div style={{ padding: "14px 14px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", flex: 1, minWidth: 0 }}>
          <ClayBook size={30} />
          <span style={{
            fontWeight: 800, fontSize: 13, letterSpacing: -0.4,
            background: "linear-gradient(90deg,var(--accent),var(--accent-2))",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            Smart Ins-Note
          </span>
        </Link>
        <div style={{ display: "flex", gap: 2, flexShrink: 0, alignItems: "center" }}>
          <button onClick={toggle} title={dark ? "Light mode" : "Dark mode"}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 3, borderRadius: 7, display: "flex", transition: "transform 0.15s", opacity: 0.7 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.12)"; (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}>
            {dark ? <ClaySun size={22} /> : <ClayMoon size={22} />}
          </button>
          <button onClick={onToggleCollapse} title="Collapse sidebar"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "5px 5px", borderRadius: 7, color: "var(--text-faint)", display: "flex", transition: "all 0.13s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = "var(--text-faint)"; }}>
            <ChevronLeft size={13} />
          </button>
        </div>
      </div>

      {/* Nav items */}
      <div style={{ padding: "0 8px 6px" }}>
        {NAV_ITEMS.map((item) => {
          const isActive = view === item.id;
          return (
            <div key={item.id}
              onClick={() => onViewChange(item.id)}
              onMouseEnter={() => setHoveredNav(item.id)}
              onMouseLeave={() => setHoveredNav(null)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "6px 8px",
                borderRadius: 10, cursor: "pointer",
                background: isActive
                  ? `linear-gradient(135deg, ${item.accentColor}20, ${item.accentColor}10)`
                  : hoveredNav === item.id ? "var(--bg-hover)" : "none",
                border: isActive ? `1px solid ${item.accentColor}30` : "1px solid transparent",
                marginBottom: 2, transition: "all 0.15s cubic-bezier(0.4,0,0.2,1)",
              }}>
              <div style={{
                transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                transform: isActive ? "scale(1.08)" : hoveredNav === item.id ? "scale(1.04)" : "scale(1)",
                flexShrink: 0,
              }}>
                <item.Icon size={24} />
              </div>
              <span style={{
                flex: 1, fontSize: 13, fontWeight: isActive ? 700 : 500,
                color: isActive ? item.accentColor : "var(--text-muted)",
                transition: "color 0.13s",
              }}>
                {item.label}
              </span>
              {counts[item.id] > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, minWidth: 18, height: 18, borderRadius: 9,
                  background: isActive ? item.accentColor : "var(--bg-hover)",
                  color: isActive ? "white" : "var(--text-faint)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "0 5px", transition: "all 0.15s",
                  boxShadow: isActive ? `0 1px 6px ${item.accentColor}55` : "none",
                }}>
                  {counts[item.id]}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--border)", margin: "4px 14px 10px" }} />

      {/* Tags section */}
      <div style={{ padding: "0 8px", flex: 1, overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 4px 8px 6px" }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.1, color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 6 }}>
            <ClayHash size={16} />
            Tags
          </span>
          <button onClick={() => setAddingTag(true)}
            title="New tag"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 4px", borderRadius: 6, color: "var(--text-faint)", display: "flex", transition: "all 0.13s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--accent)"; (e.currentTarget as HTMLElement).style.transform = "rotate(45deg) scale(1.1)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = "var(--text-faint)"; (e.currentTarget as HTMLElement).style.transform = "none"; }}>
            <Plus size={12} />
          </button>
        </div>

        {addingTag && (
          <div style={{ padding: "4px 4px 8px", animation: "fadeInUp 0.15s ease" }}>
            <input autoFocus value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submitTag(); if (e.key === "Escape") { setAddingTag(false); setNewTagName(""); } }}
              onBlur={submitTag}
              placeholder="Tag name…"
              style={{ width: "100%", background: "var(--bg-hover)", border: "1px solid var(--accent)", borderRadius: 7, padding: "6px 10px", fontSize: 12, color: "var(--text-primary)", outline: "none", boxShadow: "0 0 0 3px rgba(99,102,241,0.15)" }}
            />
            <div style={{ display: "flex", gap: 5, marginTop: 7, paddingLeft: 2, flexWrap: "wrap" }}>
              {TAG_COLORS.map(c => (
                <button key={c} onClick={() => setNewTagColor(c)}
                  style={{ width: 14, height: 14, borderRadius: "50%", background: c, border: newTagColor === c ? "2px solid var(--text-primary)" : "2px solid transparent", cursor: "pointer", padding: 0, transition: "transform 0.1s", transform: newTagColor === c ? "scale(1.35)" : "none" }} />
              ))}
            </div>
          </div>
        )}

        {tags.length === 0 && !addingTag && (
          <div style={{ padding: "6px 8px 4px", fontSize: 11.5, color: "var(--text-faint)", fontStyle: "italic" }}>
            No tags — click + to add
          </div>
        )}

        {tags.map((tag, i) => (
          <div key={tag.id}
            className={`nav-item ${view === "tag" && activeTagId === tag.id ? "active" : ""}`}
            onClick={() => onTagClick(tag.id)}
            onMouseEnter={() => setHoveredTag(tag.id)}
            onMouseLeave={() => setHoveredTag(null)}
            style={{ animation: `fadeInUp 0.15s ease both`, animationDelay: `${i * 25}ms` }}>
            <div className="tag-dot" style={{ background: TAG_COLORS[i % TAG_COLORS.length], boxShadow: view === "tag" && activeTagId === tag.id ? `0 0 6px ${TAG_COLORS[i % TAG_COLORS.length]}` : "none" }} />
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12.5 }}>{tag.name}</span>
            {hoveredTag === tag.id && (
              <button onClick={e => { e.stopPropagation(); onDeleteTag(tag.id); }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 3px", borderRadius: 5, color: "var(--text-faint)", display: "flex", transition: "all 0.1s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.14)"; (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = "var(--text-faint)"; }}>
                <X size={10} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 10px 12px", display: "flex", flexDirection: "column", gap: 2, borderTop: "1px solid var(--border)" }}>

        {/* Settings */}
        <Link href="/settings"
          style={{
            background: "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.12))",
            border: "1px solid rgba(99,102,241,0.22)", borderRadius: 10,
            padding: "7px 10px", cursor: "pointer", color: "var(--accent)",
            fontSize: 11.5, display: "flex", alignItems: "center", gap: 9,
            fontWeight: 600, transition: "all 0.15s", textDecoration: "none",
          }}
          onMouseEnter={(e: React.MouseEvent) => { (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.2))"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 16px rgba(99,102,241,0.18)"; }}
          onMouseLeave={(e: React.MouseEvent) => { (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.12))"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
          <ClaySettings size={22} />
          Settings
          <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.55, fontWeight: 400 }}>⌘,</span>
        </Link>

        {/* Shortcuts */}
        <button onClick={onShowShortcuts}
          style={{ background: "none", border: "none", borderRadius: 9, padding: "7px 10px", cursor: "pointer", color: "var(--text-faint)", fontSize: 11.5, display: "flex", alignItems: "center", gap: 9, width: "100%", transition: "all 0.12s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = "var(--text-faint)"; }}>
          <ClayKeyboard size={22} />
          Shortcuts
          <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.5 }}>⌘/</span>
        </button>

        {/* Back to Home */}
        <Link href="/"
          style={{ border: "none", borderRadius: 9, padding: "7px 10px", cursor: "pointer", color: "var(--text-faint)", fontSize: 11.5, display: "flex", alignItems: "center", gap: 9, textDecoration: "none", background: "none", transition: "all 0.12s" }}
          onMouseEnter={(e: React.MouseEvent) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
          onMouseLeave={(e: React.MouseEvent) => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = "var(--text-faint)"; }}>
          <ClayHome size={22} />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
