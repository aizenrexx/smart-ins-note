"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { fetchNotes, fetchTags, type Note, type Tag } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import {
  ClayBook, ClayNotes, ClayStar, ClayPin, ClayArchive,
  ClayTrash, ClayHash, ClayAnalyze, ClayHome,
} from "@/components/ClayIcons";
import "./analyze.css";

/* ── Stop-words for word-frequency analysis ── */
const STOP = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with","by",
  "from","as","is","was","are","were","be","been","has","have","had","do",
  "does","did","will","would","could","should","may","might","that","this",
  "these","those","it","its","i","you","he","she","we","they","my","your",
  "his","her","our","their","what","which","who","how","when","where","why",
  "not","no","so","if","then","than","just","also","very","too","more","most",
  "can","all","any","some","one","two","three","about","up","out","into","like",
  "there","here","now","only","even","back","after","before","over","under",
  "between","such","each","other","new","get","got","use","used","make","made",
]);

/* ── Helpers ── */
function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
}
function wordCount(text: string) {
  const t = stripHtml(text);
  if (!t) return 0;
  return t.split(/\s+/).filter(w => w.length > 1).length;
}
function totalWords(notes: Note[]) {
  return notes.reduce((s, n) => s + wordCount(n.title + " " + n.content), 0);
}
function readingMinutes(words: number) { return Math.max(1, Math.round(words / 200)); }

function topWords(notes: Note[], n = 15) {
  const freq: Record<string, number> = {};
  for (const note of notes) {
    const text = stripHtml(note.title + " " + note.content).toLowerCase();
    for (const raw of text.split(/[^a-z']+/)) {
      const w = raw.replace(/^'+|'+$/g, "");
      if (w.length < 3 || STOP.has(w)) continue;
      freq[w] = (freq[w] ?? 0) + 1;
    }
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, n);
}

function activityMap(notes: Note[], weeks = 15) {
  const map: Record<string, number> = {};
  const now = new Date();
  for (const note of notes) {
    const d = note.updatedAt ?? note.createdAt;
    if (!d) continue;
    const key = d.slice(0, 10);
    map[key] = (map[key] ?? 0) + 1;
  }
  const days: { key: string; count: number; date: Date }[] = [];
  const start = new Date(now);
  start.setDate(start.getDate() - weeks * 7 + 1);
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, count: map[key] ?? 0, date: d });
  }
  return days;
}

function notesByHour(notes: Note[]) {
  const hours = Array.from({ length: 24 }, () => 0);
  for (const n of notes) {
    const d = new Date(n.createdAt ?? "");
    if (!isNaN(d.getTime())) hours[d.getHours()]++;
  }
  return hours;
}

function lengthBuckets(notes: Note[]) {
  const buckets = { micro: 0, short: 0, medium: 0, long: 0, epic: 0 };
  for (const n of notes) {
    const w = wordCount(n.content);
    if (w < 20) buckets.micro++;
    else if (w < 100) buckets.short++;
    else if (w < 400) buckets.medium++;
    else if (w < 1000) buckets.long++;
    else buckets.epic++;
  }
  return buckets;
}

function streak(notes: Note[]) {
  if (!notes.length) return 0;
  const days = new Set<string>();
  for (const n of notes) {
    const d = n.updatedAt ?? n.createdAt;
    if (d) days.add(d.slice(0, 10));
  }
  const sorted = [...days].sort().reverse();
  let count = 0;
  const today = new Date().toISOString().slice(0, 10);
  let cursor = today;
  for (const d of sorted) {
    if (d === cursor) { count++; const x = new Date(cursor); x.setDate(x.getDate() - 1); cursor = x.toISOString().slice(0, 10); }
    else break;
  }
  return count;
}

/* ── Animated counter ── */
function useCounter(target: number, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return; }
    const steps = 40;
    const step = target / steps;
    let cur = 0;
    const id = setInterval(() => {
      cur = Math.min(cur + step, target);
      setVal(Math.round(cur));
      if (cur >= target) clearInterval(id);
    }, duration / steps);
    return () => clearInterval(id);
  }, [target, duration]);
  return val;
}

/* ── Heat color ── */
function heatColor(count: number, max: number) {
  if (!count) return "rgba(99,102,241,0.06)";
  const pct = count / Math.max(max, 1);
  if (pct < 0.25) return "rgba(99,102,241,0.25)";
  if (pct < 0.5)  return "rgba(99,102,241,0.50)";
  if (pct < 0.75) return "rgba(99,102,241,0.72)";
  return "#6366f1";
}

/* ── Stat card ── */
function StatCard({ icon, label, value, color, sub, delay, floatAnim, glowClass }: {
  icon: React.ReactNode; label: string; value: number; color: string;
  sub?: string; delay: number; floatAnim: string; glowClass: string;
}) {
  const v = useCounter(value);
  return (
    <div className={`ana-card fx-glass-1 ${glowClass}`} style={{
      borderRadius: 18, padding: "20px 22px", flex: 1, minWidth: 130,
      animation: `sl07 0.6s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms both`,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at top left, ${color}18, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ animation: `${floatAnim} 4s ease-in-out infinite`, display: "inline-block", marginBottom: 10 }}>
        {icon}
      </div>
      <div className="fx-num-pop" style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1, animationDelay: `${delay + 200}ms` }}>
        {v.toLocaleString()}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 10.5, color: "var(--text-faint)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* ════ MAIN PAGE ════ */
export default function AnalyzePage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    setAuthed(isLoggedIn());
  }, []);

  useEffect(() => {
    if (authed !== true) return;
    Promise.all([fetchNotes(), fetchTags()])
      .then(([n, t]) => { setNotes(n); setTags(t); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authed]);

  const active   = useMemo(() => notes.filter(n => !n.trashed && !n.archived), [notes]);
  const starred  = useMemo(() => notes.filter(n => n.starred && !n.trashed), [notes]);
  const pinned   = useMemo(() => notes.filter(n => n.pinned && !n.trashed), [notes]);
  const archived = useMemo(() => notes.filter(n => n.archived && !n.trashed), [notes]);
  const trashed  = useMemo(() => notes.filter(n => n.trashed), [notes]);

  const tw       = useMemo(() => totalWords(notes), [notes]);
  const rm       = useMemo(() => readingMinutes(tw), [tw]);
  const dayStreak = useMemo(() => streak(notes), [notes]);
  const avgLen   = useMemo(() => notes.length ? Math.round(tw / notes.length) : 0, [tw, notes]);
  const words    = useMemo(() => topWords(active, 15), [active]);
  const maxWord  = words[0]?.[1] ?? 1;
  const activity = useMemo(() => activityMap(notes, 15), [notes]);
  const maxAct   = useMemo(() => Math.max(...activity.map(d => d.count), 1), [activity]);
  const hours    = useMemo(() => notesByHour(notes), [notes]);
  const maxHour  = useMemo(() => Math.max(...hours, 1), [hours]);
  const buckets  = useMemo(() => lengthBuckets(active), [active]);
  const maxBucket = Math.max(...Object.values(buckets), 1);

  const WEEKDAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  const MONTHS   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  /* ── month labels for heatmap ── */
  const heatWeeks = useMemo(() => {
    const weeks: { month: number | null; days: typeof activity }[] = [];
    for (let i = 0; i < activity.length; i += 7) {
      const chunk = activity.slice(i, i + 7);
      const firstDay = chunk.find(d => d.date.getDate() <= 7);
      weeks.push({ month: firstDay ? firstDay.date.getMonth() : null, days: chunk });
    }
    return weeks;
  }, [activity]);

  /* ── Not logged in ── */
  if (authed === false) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-app)", flexDirection: "column", gap: 20 }}>
        <ClayBook size={56} />
        <div style={{ fontSize: 20, fontWeight: 700 }}>Please sign in to view your analysis</div>
        <Link href="/auth" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", padding: "10px 28px", borderRadius: 10, fontWeight: 600, textDecoration: "none" }}>
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)", color: "var(--text-primary)", position: "relative", overflow: "hidden" }}>

      {/* ── Aurora background blobs (animations: au01–au04) ── */}
      <div aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-10%", left: "-5%", width: 600, height: 500, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(99,102,241,0.10),transparent 70%)", animation: "au01 18s ease-in-out infinite", filter: "blur(40px)" }} />
        <div style={{ position: "absolute", top: "30%", right: "-10%", width: 500, height: 400, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(139,92,246,0.09),transparent 70%)", animation: "au02 22s ease-in-out infinite", filter: "blur(50px)" }} />
        <div style={{ position: "absolute", bottom: "10%", left: "20%", width: 400, height: 350, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(34,211,238,0.07),transparent 70%)", animation: "au03 16s ease-in-out infinite", filter: "blur(45px)" }} />
        <div style={{ position: "absolute", bottom: "-5%", right: "10%", width: 450, height: 350, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(232,121,249,0.07),transparent 70%)", animation: "au04 20s ease-in-out infinite", filter: "blur(50px)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "32px 24px 60px" }}>

        {/* ── Header (animations: sl01, sl02, sh01) ── */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ animation: "sl03 0.5s cubic-bezier(0.4,0,0.2,1) both" }}>
            <Link href="/notes" style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--text-faint)", fontSize: 12.5, fontWeight: 600, textDecoration: "none", padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-hover)", transition: "all 0.15s", marginBottom: 24 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--accent)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.3)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-faint)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}>
              ← Back to Notes
            </Link>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, animation: "sl01 0.6s cubic-bezier(0.4,0,0.2,1) 80ms both" }}>
            <div style={{ animation: "f01 5s ease-in-out infinite" }}>
              <ClayAnalyze size={52} />
            </div>
            <div>
              <h1 className="fx-text-1" style={{ fontSize: 30, fontWeight: 900, letterSpacing: -0.8, marginBottom: 4 }}>
                Note Analysis
              </h1>
              <p style={{ fontSize: 14, color: "var(--text-muted)", animation: "sl01 0.6s cubic-bezier(0.4,0,0.2,1) 160ms both" }}>
                Deep insights into your writing habits &amp; patterns
              </p>
            </div>
          </div>
        </div>

        {loading || authed === null ? (
          <LoadingState />
        ) : notes.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* ══ STAT CARDS ROW (6 cards, animations: sl07×6, f01–f06, g01–g06) ══ */}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
              <StatCard icon={<ClayNotes size={32} />}   label="Total Notes"   value={notes.length}  color="#818cf8" delay={0}   floatAnim="f01" glowClass="fx-neon-1" />
              <StatCard icon={<ClayAnalyze size={32} />} label="Words Written" value={tw}            color="#22d3ee" delay={80}  floatAnim="f02" glowClass="fx-neon-2" />
              <StatCard icon={<ClayBook size={32} />}    label="Reading Time"  value={rm}            color="#34d399" sub="minutes" delay={160} floatAnim="f03" glowClass="fx-neon-3" />
              <StatCard icon={<ClayStar size={32} />}    label="Day Streak"    value={dayStreak}     color="#fbbf24" delay={240} floatAnim="f04" glowClass="fx-neon-5" />
              <StatCard icon={<ClayHash size={32} />}    label="Tags Created"  value={tags.length}   color="#e879f9" delay={320} floatAnim="f05" glowClass="fx-neon-4" />
              <StatCard icon={<ClayPin size={32} />}     label="Avg Words/Note" value={avgLen}        color="#fb923c" delay={400} floatAnim="f06" glowClass="fx-neon-5" />
            </div>

            {/* ══ ACTIVITY HEATMAP (84 cells, animations: fx-heat-pop×84) ══ */}
            <div className="ana-card fx-glass-2 fx-neon-1" style={{ borderRadius: 20, padding: "24px 26px", marginBottom: 28, animation: "sl16 0.7s cubic-bezier(0.4,0,0.2,1) 200ms both" }}>
              <SectionTitle icon="🗓" label="Writing Activity" sub="Last 15 weeks" />
              <div style={{ overflowX: "auto", paddingBottom: 6 }}>
                <div style={{ display: "flex", gap: 3, alignItems: "flex-start" }}>

                  {/* Day labels */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingTop: 20, marginRight: 4 }}>
                    {WEEKDAYS.map((d, i) => (
                      <div key={d} style={{ height: 13, fontSize: 9, color: "var(--text-faint)", fontWeight: 600, lineHeight: "13px", display: i % 2 === 1 ? "block" : "none" }}>
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Heatmap grid */}
                  {heatWeeks.map((week, wi) => (
                    <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <div style={{ height: 16, fontSize: 9.5, color: "var(--text-faint)", fontWeight: 600, whiteSpace: "nowrap" }}>
                        {week.month !== null ? MONTHS[week.month] : ""}
                      </div>
                      {week.days.map((day, di) => (
                        <div key={day.key}
                          className="fx-heat-pop"
                          title={`${day.key}: ${day.count} note${day.count !== 1 ? "s" : ""}`}
                          style={{
                            width: 13, height: 13, borderRadius: 3,
                            background: heatColor(day.count, maxAct),
                            animationDelay: `${(wi * 7 + di) * 10 + 300}ms`,
                            transition: "transform 0.12s",
                            cursor: "default",
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.5)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; }}
                        />
                      ))}
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 12, justifyContent: "flex-end" }}>
                  <span style={{ fontSize: 10, color: "var(--text-faint)" }}>Less</span>
                  {[0.06, 0.25, 0.5, 0.72, 1].map((o, i) => (
                    <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: `rgba(99,102,241,${o})` }} />
                  ))}
                  <span style={{ fontSize: 10, color: "var(--text-faint)" }}>More</span>
                </div>
              </div>
            </div>

            {/* ══ MIDDLE ROW: Word Frequency + Status ══ */}
            <div style={{ display: "flex", gap: 18, marginBottom: 28, flexWrap: "wrap" }}>

              {/* Top Words (animations: sl08×15) */}
              <div className="ana-card fx-glass-3 fx-neon-2" style={{ flex: 2, minWidth: 300, borderRadius: 20, padding: "24px 26px", animation: "sl08 0.7s cubic-bezier(0.4,0,0.2,1) 280ms both" }}>
                <SectionTitle icon="💬" label="Top Words" sub="Most used across all notes" />
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {words.map(([word, count], i) => (
                    <div key={word} style={{ animation: `sl08 0.5s cubic-bezier(0.34,1.56,0.64,1) ${350 + i * 40}ms both` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, alignItems: "center" }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)" }}>{word}</span>
                        <span style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700 }}>{count}×</span>
                      </div>
                      <div style={{ height: 7, borderRadius: 4, background: "var(--bg-hover)", overflow: "hidden" }}>
                        <div className="fx-bar-grow" style={{
                          height: "100%", borderRadius: 4,
                          background: `linear-gradient(90deg,rgba(34,211,238,0.7),rgba(99,102,241,0.85))`,
                          "--bar-w": `${(count / maxWord) * 100}%`,
                          animationDelay: `${380 + i * 40}ms`,
                        } as React.CSSProperties} />
                      </div>
                    </div>
                  ))}
                  {words.length === 0 && <div style={{ color: "var(--text-faint)", fontSize: 13 }}>Write some notes to see word frequency!</div>}
                </div>
              </div>

              {/* Notes by Status (animations: sl09×5, sc01) */}
              <div className="ana-card fx-glass-5 fx-neon-4" style={{ flex: 1, minWidth: 220, borderRadius: 20, padding: "24px 26px", animation: "sl09 0.7s cubic-bezier(0.4,0,0.2,1) 320ms both" }}>
                <SectionTitle icon="📊" label="By Status" sub="Distribution" />
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { label: "Active",   count: active.length,   color: "#818cf8", icon: <ClayNotes size={18} /> },
                    { label: "Starred",  count: starred.length,  color: "#fbbf24", icon: <ClayStar size={18} /> },
                    { label: "Pinned",   count: pinned.length,   color: "#f87171", icon: <ClayPin size={18} /> },
                    { label: "Archived", count: archived.length, color: "#60a5fa", icon: <ClayArchive size={18} /> },
                    { label: "Trashed",  count: trashed.length,  color: "#a1a1aa", icon: <ClayTrash size={18} /> },
                  ].map((s, i) => (
                    <div key={s.label} style={{ animation: `sl09 0.5s cubic-bezier(0.34,1.56,0.64,1) ${400 + i * 60}ms both` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                        {s.icon}
                        <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>{s.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: s.color }}>{s.count}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: "var(--bg-hover)", overflow: "hidden" }}>
                        <div className="fx-bar-grow" style={{
                          height: "100%", borderRadius: 3,
                          background: `linear-gradient(90deg,${s.color}99,${s.color})`,
                          "--bar-w": `${notes.length ? (s.count / notes.length) * 100 : 0}%`,
                          animationDelay: `${450 + i * 60}ms`,
                        } as React.CSSProperties} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Donut-style total */}
                <div style={{ marginTop: 18, textAlign: "center" }}>
                  <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto", animation: "ro01 12s linear infinite" }}>
                    <svg viewBox="0 0 80 80" style={{ width: 80, height: 80 }}>
                      <DonutChart segments={[
                        { pct: notes.length ? active.length / notes.length : 0, color: "#818cf8" },
                        { pct: notes.length ? starred.length / notes.length : 0, color: "#fbbf24" },
                        { pct: notes.length ? pinned.length / notes.length : 0, color: "#f87171" },
                        { pct: notes.length ? archived.length / notes.length : 0, color: "#60a5fa" },
                        { pct: notes.length ? trashed.length / notes.length : 0, color: "#a1a1aa" },
                      ]} />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "var(--text-primary)", animation: "ro02 12s linear infinite" }}>
                      {notes.length}
                    </div>
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--text-faint)", marginTop: 6 }}>Total notes</div>
                </div>
              </div>
            </div>

            {/* ══ BOTTOM ROW: Length Distribution + Hour chart + Tags ══ */}
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 28 }}>

              {/* Length distribution (animations: sc07×5, sl16) */}
              <div className="ana-card fx-glass-4 fx-neon-3" style={{ flex: 1, minWidth: 200, borderRadius: 20, padding: "24px 26px", animation: "sl16 0.7s cubic-bezier(0.4,0,0.2,1) 360ms both" }}>
                <SectionTitle icon="📏" label="Note Length" sub="Word count buckets" />
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                  {[
                    { label: "Micro",  sub: "< 20 words",   count: buckets.micro,  color: "#a1a1aa" },
                    { label: "Short",  sub: "20–99 words",  count: buckets.short,  color: "#60a5fa" },
                    { label: "Medium", sub: "100–399",      count: buckets.medium, color: "#34d399" },
                    { label: "Long",   sub: "400–999",      count: buckets.long,   color: "#818cf8" },
                    { label: "Epic",   sub: "1000+ words",  count: buckets.epic,   color: "#e879f9" },
                  ].map((b, i) => (
                    <div key={b.label} style={{ animation: `sl16 0.5s cubic-bezier(0.34,1.56,0.64,1) ${440 + i * 55}ms both` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: b.color }}>{b.label}</span>
                          <span style={{ fontSize: 10.5, color: "var(--text-faint)", marginLeft: 6 }}>{b.sub}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 800 }}>{b.count}</span>
                      </div>
                      <div style={{ height: 7, borderRadius: 4, background: "var(--bg-hover)", overflow: "hidden" }}>
                        <div className="fx-bar-grow" style={{
                          height: "100%", borderRadius: 4,
                          background: `linear-gradient(90deg,${b.color}88,${b.color})`,
                          "--bar-w": `${(b.count / maxBucket) * 100}%`,
                          animationDelay: `${480 + i * 55}ms`,
                        } as React.CSSProperties} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Writing by hour (animations: wa01×24, fx-bar-grow-h×24) */}
              <div className="ana-card fx-glass-1 fx-neon-1" style={{ flex: 2, minWidth: 300, borderRadius: 20, padding: "24px 26px", animation: "sl08 0.7s cubic-bezier(0.4,0,0.2,1) 400ms both" }}>
                <SectionTitle icon="🕐" label="Writing by Hour" sub="When you create notes most" />
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 90, marginTop: 8 }}>
                  {hours.map((count, h) => {
                    const pct = (count / maxHour) * 100;
                    const barH = Math.max(pct * 0.85, count > 0 ? 6 : 2);
                    return (
                      <div key={h} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
                        title={`${h}:00 — ${count} note${count !== 1 ? "s" : ""}`}>
                        <div style={{
                          width: "100%", borderRadius: "3px 3px 0 0",
                          height: `${barH}%`,
                          background: count > 0
                            ? `linear-gradient(180deg,rgba(99,102,241,0.9),rgba(34,211,238,0.7))`
                            : "var(--bg-hover)",
                          animation: `fx-bar-grow-h 0.5s cubic-bezier(0.34,1.56,0.64,1) ${500 + h * 20}ms both`,
                          "--bar-h": `${barH}%`,
                          animationName: "barGrowH",
                          transition: "background 0.15s",
                        } as React.CSSProperties}
                        onMouseEnter={e => { if (count > 0) (e.currentTarget as HTMLElement).style.background = "linear-gradient(180deg,rgba(232,121,249,0.9),rgba(99,102,241,0.7))"; }}
                        onMouseLeave={e => { if (count > 0) (e.currentTarget as HTMLElement).style.background = "linear-gradient(180deg,rgba(99,102,241,0.9),rgba(34,211,238,0.7))"; }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                  {["12a","3a","6a","9a","12p","3p","6p","9p","12a"].map(l => (
                    <span key={l} style={{ fontSize: 9.5, color: "var(--text-faint)", fontWeight: 600 }}>{l}</span>
                  ))}
                </div>

                {/* Peak hour insight */}
                {maxHour > 0 && (() => {
                  const peakH = hours.indexOf(maxHour);
                  const ampm = peakH < 12 ? "AM" : "PM";
                  const h12 = peakH % 12 || 12;
                  return (
                    <div className="fx-grad-1" style={{ marginTop: 14, borderRadius: 10, padding: "9px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 18 }}>⚡</span>
                      <div>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-primary)" }}>
                          Peak hour: {h12}:00 {ampm}
                        </div>
                        <div style={{ fontSize: 10.5, color: "var(--text-faint)" }}>{maxHour} note{maxHour !== 1 ? "s" : ""} created at this hour</div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Tags cloud (animations: bo04×tags) */}
              <div className="ana-card fx-glass-5 fx-neon-4" style={{ flex: 1, minWidth: 200, borderRadius: 20, padding: "24px 26px", animation: "sl09 0.7s cubic-bezier(0.4,0,0.2,1) 440ms both" }}>
                <SectionTitle icon="🏷" label="Tags" sub={`${tags.length} tag${tags.length !== 1 ? "s" : ""} created`} />
                {tags.length === 0 ? (
                  <div style={{ color: "var(--text-faint)", fontSize: 13, fontStyle: "italic", marginTop: 8 }}>No tags yet</div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 8 }}>
                    {tags.map((tag, i) => {
                      const colors = ["#818cf8","#34d399","#f59e0b","#f87171","#60a5fa","#c084fc","#fb923c","#4ade80"];
                      const c = colors[i % colors.length];
                      return (
                        <span key={tag.id} style={{
                          padding: "4px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 700,
                          background: `${c}22`, color: c, border: `1px solid ${c}44`,
                          animation: `bo04 0.4s cubic-bezier(0.34,1.56,0.64,1) ${300 + i * 50}ms both`,
                          display: "inline-block",
                        }}>
                          #{tag.name}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Insight pills */}
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                  <InsightPill emoji="📝" text={`${active.length} active notes`} color="#818cf8" delay={500} />
                  <InsightPill emoji="⭐" text={`${starred.length} starred`} color="#fbbf24" delay={560} />
                  <InsightPill emoji="📌" text={`${pinned.length} pinned`} color="#f87171" delay={620} />
                  <InsightPill emoji="🗃" text={`${archived.length} archived`} color="#60a5fa" delay={680} />
                </div>
              </div>
            </div>

            {/* ══ WRITING INSIGHTS BANNER (animations: sh01, g17, gr01) ══ */}
            <div className="ana-card fx-grad-6 fx-neon-10" style={{ borderRadius: 20, padding: "24px 30px", marginBottom: 28, animation: "sl01 0.7s cubic-bezier(0.4,0,0.2,1) 500ms both", overflow: "hidden", position: "relative" }}>
              <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(99,102,241,0.15),transparent 70%)", animation: "au05 8s ease-in-out infinite", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: -30, left: "30%", width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(34,211,238,0.10),transparent 70%)", animation: "au06 10s ease-in-out infinite", pointerEvents: "none" }} />

              <div style={{ position: "relative" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-faint)", marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>✨ Writing Insights</div>
                <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
                  <Insight label="Total Notes" value={notes.length.toLocaleString()} />
                  <Insight label="Total Words" value={tw.toLocaleString()} />
                  <Insight label="Reading Time" value={`${rm} min`} />
                  <Insight label="Avg Length" value={`${avgLen} words`} />
                  <Insight label="Writing Streak" value={`${dayStreak} day${dayStreak !== 1 ? "s" : ""}`} />
                  <Insight label="Tags" value={tags.length.toLocaleString()} />
                  <Insight label="Starred" value={starred.length.toLocaleString()} />
                  <Insight label="Archived" value={archived.length.toLocaleString()} />
                </div>
              </div>
            </div>

            {/* ══ DECORATIVE FOOTER PARTICLES (animations: sp01–sp08, f07–f10) ══ */}
            <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 8, opacity: 0.4 }}>
              {["f07","f08","f09","f10","f11","f12"].map((anim, i) => (
                <div key={anim} style={{ width: 6, height: 6, borderRadius: "50%", background: ["#818cf8","#22d3ee","#34d399","#e879f9","#fbbf24","#f87171"][i], animation: `${anim} ${3 + i * 0.5}s ease-in-out infinite`, animationDelay: `${i * 200}ms` }} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function LoadingState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, paddingTop: 80 }}>
      <div style={{ animation: "ro01 1s linear infinite" }}>
        <ClayAnalyze size={52} />
      </div>
      <div style={{ animation: "g22 1.5s ease-in-out infinite", fontSize: 14, color: "var(--text-muted)" }}>Loading your analysis…</div>
      <div style={{ display: "flex", gap: 6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#6366f1", animation: `bo01 1.2s ease-in-out ${i * 200}ms infinite` }} />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: "center", paddingTop: 80, animation: "sl01 0.6s ease both" }}>
      <div style={{ animation: "f01 4s ease-in-out infinite", display: "inline-block", marginBottom: 16 }}>
        <ClayNotes size={64} />
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No notes yet!</div>
      <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>Create some notes to see your writing analytics.</div>
      <Link href="/notes" style={{ display: "inline-block", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", padding: "11px 28px", borderRadius: 10, fontWeight: 600, textDecoration: "none", animation: "bo15 2s ease-in-out infinite" }}>
        Start Writing
      </Link>
    </div>
  );
}

function SectionTitle({ icon, label, sub }: { icon: string; label: string; sub: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 18, animation: "f01 5s ease-in-out infinite" }}>{icon}</span>
        <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>{label}</span>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 2, paddingLeft: 26 }}>{sub}</div>
    </div>
  );
}

function InsightPill({ emoji, text, color, delay }: { emoji: string; text: string; color: string; delay: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 10, background: `${color}12`, border: `1px solid ${color}22`, animation: `sl03 0.4s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms both` }}>
      <span style={{ fontSize: 13 }}>{emoji}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color }}>{text}</span>
    </div>
  );
}

function Insight({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ animation: "sc06 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}>
      <div className="fx-text-1" style={{ fontSize: 22, fontWeight: 900 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  );
}

/* ── Simple donut SVG ── */
function DonutChart({ segments }: { segments: { pct: number; color: string }[] }) {
  const r = 28, cx = 40, cy = 40, strokeW = 8;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-hover)" strokeWidth={strokeW} />
      {segments.map((s, i) => {
        if (!s.pct) return null;
        const dash = s.pct * circ;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={s.color} strokeWidth={strokeW}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-(offset * circ)}
            strokeLinecap="round"
            style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dasharray 1s ease" }}
          />
        );
        offset += s.pct;
        return el;
      })}
    </>
  );
}
