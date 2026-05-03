"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User, Lock, Sparkles, Palette, LogOut, ArrowLeft,
  CheckCircle, XCircle, Loader2, Eye, EyeOff, Save,
  Camera, Trash2, ExternalLink, Wifi, WifiOff, RefreshCw,
  Server, Brain, Zap, ChevronRight, ShieldCheck, Moon, Sun,
  BookOpen, Hash, Star, FileText, BarChart2,
} from "lucide-react";
import {
  getUser, saveAuth, clearAuth, getBio, saveBio,
  getAvatarColor, saveAvatarColor, getAvatarUrl, saveAvatarUrl,
  apiUpdateProfile, apiChangePassword, getToken,
} from "@/lib/auth";
import { useTheme } from "@/lib/providers";
import { getActiveProvider, setActiveProvider } from "@/lib/ai-engine";

type Section = "profile" | "security" | "ai" | "appearance" | "account";

const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#10b981", "#14b8a6",
  "#3b82f6", "#06b6d4", "#84cc16", "#a855f7",
];

const PROVIDERS = [
  { id: "openai", name: "OpenAI", emoji: "🤖", color: "#10b981", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"], placeholder: "sk-...", docsUrl: "https://platform.openai.com/api-keys", desc: "GPT-4o, GPT-4 Turbo", testUrl: (k: string) => `https://api.openai.com/v1/models`, testHeaders: (k: string) => ({ Authorization: `Bearer ${k}` }) },
  { id: "anthropic", name: "Anthropic", emoji: "✦", color: "#f59e0b", models: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"], placeholder: "sk-ant-...", docsUrl: "https://console.anthropic.com/settings/keys", desc: "Claude 3.5 Sonnet, Haiku", testUrl: (_k: string) => "https://api.anthropic.com/v1/models", testHeaders: (k: string) => ({ "x-api-key": k, "anthropic-version": "2023-06-01" }) },
  { id: "gemini", name: "Gemini", emoji: "♊", color: "#6366f1", models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"], placeholder: "AIza...", docsUrl: "https://aistudio.google.com/apikey", desc: "Gemini 2.0 Flash, 1.5 Pro", testUrl: (k: string) => `https://generativelanguage.googleapis.com/v1beta/models?key=${k}`, testHeaders: (_k: string) => ({} as Record<string, string>) },
  { id: "groq", name: "Groq", emoji: "⚡", color: "#f97316", models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"], placeholder: "gsk_...", docsUrl: "https://console.groq.com/keys", desc: "Llama 3.3 70B, Mixtral", testUrl: (_k: string) => "https://api.groq.com/openai/v1/models", testHeaders: (k: string) => ({ Authorization: `Bearer ${k}` }) },
  { id: "mistral", name: "Mistral", emoji: "🌊", color: "#8b5cf6", models: ["mistral-large-latest", "mistral-small-latest", "codestral-latest"], placeholder: "...", docsUrl: "https://console.mistral.ai/api-keys", desc: "Mistral Large, Codestral", testUrl: (_k: string) => "https://api.mistral.ai/v1/models", testHeaders: (k: string) => ({ Authorization: `Bearer ${k}` }) },
  { id: "openrouter", name: "OpenRouter", emoji: "🔀", color: "#ec4899", models: ["openai/gpt-4o", "anthropic/claude-3.5-sonnet", "meta-llama/llama-3.1-405b"], placeholder: "sk-or-...", docsUrl: "https://openrouter.ai/settings/keys", desc: "300+ models via one key", testUrl: (_k: string) => "https://openrouter.ai/api/v1/models", testHeaders: (k: string) => ({ Authorization: `Bearer ${k}` }) },
  { id: "xai", name: "xAI Grok", emoji: "𝕏", color: "#94a3b8", models: ["grok-2", "grok-2-vision-1212", "grok-beta"], placeholder: "xai-...", docsUrl: "https://console.x.ai", desc: "Grok 2, Grok Beta", testUrl: (_k: string) => "https://api.x.ai/v1/models", testHeaders: (k: string) => ({ Authorization: `Bearer ${k}` }) },
  { id: "cohere", name: "Cohere", emoji: "🌀", color: "#38bdf8", models: ["command-r-plus", "command-r", "command-light"], placeholder: "...", docsUrl: "https://dashboard.cohere.com/api-keys", desc: "Command R+, Command R", testUrl: (_k: string) => "https://api.cohere.com/v1/models", testHeaders: (k: string) => ({ Authorization: `Bearer ${k}` }) },
];

const LS = "smart-ins-note-ai-";
const GEMINI_COMPAT = "smart-ins-note-gemini-key";
const getKey = (id: string) => typeof window !== "undefined" ? localStorage.getItem(`${LS}${id}`) ?? "" : "";
const saveKey = (id: string, v: string) => v ? localStorage.setItem(`${LS}${id}`, v) : localStorage.removeItem(`${LS}${id}`);
const getOllamaUrl = () => typeof window !== "undefined" ? localStorage.getItem(`${LS}ollama-url`) ?? "" : "";
const saveOllamaUrl = (v: string) => v ? localStorage.setItem(`${LS}ollama-url`, v) : localStorage.removeItem(`${LS}ollama-url`);

interface OllamaModel { name: string; modified_at?: string; size?: number; details?: { parameter_size?: string; family?: string }; }

function getInitials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function Avatar({ name, color, url, size = 72 }: { name: string; color: string; url?: string; size?: number }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: url && !imgErr ? "transparent" : `linear-gradient(135deg, ${color}, ${color}cc)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.33, fontWeight: 800, color: "white",
      boxShadow: `0 4px 24px ${color}55`, overflow: "hidden", flexShrink: 0,
      border: `3px solid ${color}44`,
    }}>
      {url && !imgErr
        ? <img src={url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setImgErr(true)} />
        : getInitials(name)
      }
    </div>
  );
}

function SuccessBanner({ msg }: { msg: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", marginBottom: 20 }}>
      <CheckCircle size={16} color="#10b981" />
      <span style={{ fontSize: 13, color: "#10b981", fontWeight: 600 }}>{msg}</span>
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", marginBottom: 20 }}>
      <XCircle size={16} color="#f87171" />
      <span style={{ fontSize: 13, color: "#f87171", fontWeight: 600 }}>{msg}</span>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "6px 0 0", lineHeight: 1.6 }}>{subtitle}</p>}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.9, color: "var(--text-muted)", marginBottom: 7 }}>{children}</label>;
}

function Input({ value, onChange, type = "text", placeholder, readOnly, right }: {
  value: string; onChange?: (v: string) => void;
  type?: string; placeholder?: string; readOnly?: boolean; right?: React.ReactNode;
}) {
  return (
    <div style={{ position: "relative" }}>
      <input
        type={type} value={value} readOnly={readOnly}
        placeholder={placeholder}
        onChange={e => onChange?.(e.target.value)}
        style={{
          width: "100%", padding: right ? "10px 40px 10px 14px" : "10px 14px",
          background: readOnly ? "var(--bg-hover)" : "var(--bg-editor)",
          border: "1px solid var(--border)", borderRadius: 11,
          color: readOnly ? "var(--text-muted)" : "var(--text-primary)",
          fontSize: 14, outline: "none", boxSizing: "border-box",
          cursor: readOnly ? "not-allowed" : "text",
        }}
      />
      {right && <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>{right}</div>}
    </div>
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      style={{
        width: "100%", padding: "10px 14px",
        background: "var(--bg-editor)", border: "1px solid var(--border)", borderRadius: 11,
        color: "var(--text-primary)", fontSize: 14, outline: "none",
        resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box",
      }}
    />
  );
}

function PrimaryBtn({ onClick, loading, disabled, children }: { onClick?: () => void; loading?: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled || loading}
      style={{
        padding: "10px 22px", borderRadius: 11, border: "none", fontWeight: 700, fontSize: 13, cursor: disabled || loading ? "not-allowed" : "pointer",
        background: disabled || loading ? "var(--bg-hover)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
        color: disabled || loading ? "var(--text-muted)" : "white",
        display: "flex", alignItems: "center", gap: 8, opacity: disabled || loading ? 0.6 : 1, transition: "all 0.15s",
      }}>
      {loading && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
      {children}
    </button>
  );
}

/* ─── Profile Section ─────────────────────────────────────────────────────── */
function ProfileSection() {
  const user = getUser();
  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(() => getBio());
  const [avatarColor, setAvatarColor] = useState(() => getAvatarColor());
  const [avatarUrl, setAvatarUrl] = useState(() => getAvatarUrl());
  const [avatarUrlInput, setAvatarUrlInput] = useState(() => getAvatarUrl());
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function handleSave() {
    if (!name.trim()) { setError("Name cannot be empty"); return; }
    setSaving(true); setSuccess(""); setError("");
    try {
      const { token, user: updated } = await apiUpdateProfile(name.trim());
      saveAuth(token, updated);
      saveBio(bio);
      saveAvatarColor(avatarColor);
      saveAvatarUrl(avatarUrlInput.trim());
      setAvatarUrl(avatarUrlInput.trim());
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally { setSaving(false); }
  }

  return (
    <div>
      <SectionHeader title="Profile" subtitle="Manage your public profile information." />
      {success && <SuccessBanner msg={success} />}
      {error && <ErrorBanner msg={error} />}

      {/* Avatar */}
      <div style={{ marginBottom: 28 }}>
        <FieldLabel>Profile Photo</FieldLabel>
        <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "20px", background: "var(--bg-editor)", border: "1px solid var(--border)", borderRadius: 14 }}>
          <Avatar name={name || user?.name || "?"} color={avatarColor} url={avatarUrl} size={80} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10 }}>Choose a color</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {AVATAR_COLORS.map(c => (
                <button key={c} onClick={() => setAvatarColor(c)}
                  style={{
                    width: 26, height: 26, borderRadius: "50%", background: c, border: avatarColor === c ? "3px solid var(--text-primary)" : "2px solid transparent",
                    cursor: "pointer", padding: 0, transition: "transform 0.1s",
                    transform: avatarColor === c ? "scale(1.3)" : "scale(1)",
                    boxShadow: avatarColor === c ? `0 0 8px ${c}88` : "none",
                  }} />
              ))}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>Or use a photo URL</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={avatarUrlInput} onChange={e => setAvatarUrlInput(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                style={{ flex: 1, padding: "7px 11px", background: "var(--bg-hover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--text-primary)", outline: "none" }}
              />
              {avatarUrlInput && (
                <button onClick={() => { setAvatarUrlInput(""); }}
                  style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-hover)", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Name */}
      <div style={{ marginBottom: 20 }}>
        <FieldLabel>Display Name</FieldLabel>
        <Input value={name} onChange={setName} placeholder="Your name" />
      </div>

      {/* Email */}
      <div style={{ marginBottom: 20 }}>
        <FieldLabel>Email Address</FieldLabel>
        <Input value={user?.email ?? ""} readOnly />
        <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 6 }}>Email cannot be changed.</p>
      </div>

      {/* Bio */}
      <div style={{ marginBottom: 28 }}>
        <FieldLabel>Bio</FieldLabel>
        <Textarea value={bio} onChange={setBio} placeholder="Tell us a little about yourself…" rows={3} />
        <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 6 }}>Stored locally on your device.</p>
      </div>

      <PrimaryBtn onClick={handleSave} loading={saving}>
        <Save size={14} /> Save Profile
      </PrimaryBtn>
    </div>
  );
}

/* ─── Security Section ────────────────────────────────────────────────────── */
function SecuritySection() {
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const strength = !newPw ? 0 : newPw.length < 8 ? 1 : newPw.length < 12 ? 2 : /[A-Z]/.test(newPw) && /[0-9]/.test(newPw) ? 4 : 3;
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];
  const strengthColors = ["", "#f87171", "#f59e0b", "#34d399", "#10b981"];

  async function handleChange() {
    if (!current) { setError("Enter your current password"); return; }
    if (newPw.length < 8) { setError("New password must be at least 8 characters"); return; }
    if (newPw !== confirm) { setError("Passwords don't match"); return; }
    setSaving(true); setSuccess(""); setError("");
    try {
      await apiChangePassword(current, newPw);
      setSuccess("Password changed successfully!");
      setCurrent(""); setNewPw(""); setConfirm("");
      setTimeout(() => setSuccess(""), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to change password");
    } finally { setSaving(false); }
  }

  return (
    <div>
      <SectionHeader title="Security" subtitle="Keep your account safe with a strong password." />
      {success && <SuccessBanner msg={success} />}
      {error && <ErrorBanner msg={error} />}

      <div style={{ background: "var(--bg-editor)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={17} color="#818cf8" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Change Password</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Use a long, unique password for best security.</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <FieldLabel>Current Password</FieldLabel>
            <Input type={showCurrent ? "text" : "password"} value={current} onChange={setCurrent}
              placeholder="Your current password"
              right={<button onClick={() => setShowCurrent(s => !s)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 0 }}>{showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}</button>} />
          </div>

          <div>
            <FieldLabel>New Password</FieldLabel>
            <Input type={showNew ? "text" : "password"} value={newPw} onChange={setNewPw}
              placeholder="At least 8 characters"
              right={<button onClick={() => setShowNew(s => !s)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 0 }}>{showNew ? <EyeOff size={15} /> : <Eye size={15} />}</button>} />
            {newPw && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 4, background: i <= strength ? strengthColors[strength] : "var(--border)", transition: "background 0.2s" }} />
                  ))}
                </div>
                <span style={{ fontSize: 11, color: strengthColors[strength], fontWeight: 600 }}>{strengthLabels[strength]}</span>
              </div>
            )}
          </div>

          <div>
            <FieldLabel>Confirm New Password</FieldLabel>
            <Input type="password" value={confirm} onChange={setConfirm} placeholder="Repeat new password" />
            {confirm && confirm !== newPw && (
              <p style={{ fontSize: 11, color: "#f87171", marginTop: 5 }}>Passwords don&apos;t match</p>
            )}
          </div>

          <PrimaryBtn onClick={handleChange} loading={saving} disabled={!current || !newPw || !confirm}>
            <Lock size={14} /> Update Password
          </PrimaryBtn>
        </div>
      </div>

      {/* Session info */}
      <div style={{ marginTop: 24, padding: 18, background: "var(--bg-editor)", border: "1px solid var(--border)", borderRadius: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>Active Session</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>You are signed in on this device. Your session token expires in 30 days.</div>
        <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 9, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
          <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>Session active</span>
        </div>
      </div>
    </div>
  );
}

/* ─── AI Section ──────────────────────────────────────────────────────────── */
function ProviderPanel({ p }: { p: typeof PROVIDERS[0] }) {
  const savedInit = p.id === "gemini"
    ? (getKey(p.id) || (typeof window !== "undefined" ? localStorage.getItem(GEMINI_COMPAT) ?? "" : ""))
    : getKey(p.id);

  const [key, setKey] = useState(savedInit);
  const [show, setShow] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string; ms?: number } | null>(null);
  const [selectedModel, setSelectedModel] = useState(p.models[0]);
  const [active, setActive] = useState(() => getActiveProvider());
  const dirty = key !== savedInit;
  const isActive = active?.provider === p.id;

  function doSave() {
    saveKey(p.id, key.trim());
    if (p.id === "gemini") {
      if (key.trim()) localStorage.setItem(GEMINI_COMPAT, key.trim());
      else localStorage.removeItem(GEMINI_COMPAT);
    }
    setResult(null);
  }

  async function doTest() {
    if (!key.trim()) return;
    setTesting(true); setResult(null);
    const t0 = Date.now();
    try {
      const res = await fetch(p.testUrl(key.trim()), { headers: p.testHeaders(key.trim()) });
      const ms = Date.now() - t0;
      if (res.ok) setResult({ ok: true, msg: "Connected!", ms });
      else {
        const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
        setResult({ ok: false, msg: body?.error?.message ?? `HTTP ${res.status}` });
      }
    } catch { setResult({ ok: false, msg: "Network error" }); }
    finally { setTesting(false); }
  }

  function handleSetActive() {
    doSave();
    const ap = { provider: p.id, model: selectedModel };
    setActiveProvider(ap);
    setActive(ap);
    window.dispatchEvent(new Event("ai-provider-changed"));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${p.color}22`, border: `1.5px solid ${p.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{p.emoji}</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>{p.name}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.desc}</div>
        </div>
        {isActive && (
          <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#818cf8" }} />Active
          </span>
        )}
      </div>

      <div>
        <FieldLabel>API Key</FieldLabel>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <input type={show ? "text" : "password"} value={key} onChange={e => { setKey(e.target.value); setResult(null); }} placeholder={p.placeholder}
              style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 38px 9px 12px", fontSize: 13, color: "var(--text-primary)", outline: "none", boxSizing: "border-box", fontFamily: "monospace" }} />
            <button onClick={() => setShow(s => !s)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 0 }}>
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button onClick={doSave} disabled={!key.trim() || !dirty}
            style={{ padding: "9px 14px", borderRadius: 10, border: "none", background: (!key.trim() || !dirty) ? "var(--bg-hover)" : "#6366f1", cursor: (!key.trim() || !dirty) ? "not-allowed" : "pointer", color: (!key.trim() || !dirty) ? "var(--text-muted)" : "white", fontSize: 12, fontWeight: 700, opacity: (!key.trim() || !dirty) ? 0.5 : 1, flexShrink: 0 }}>Save</button>
          <button onClick={doTest} disabled={testing || !key.trim()}
            style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-hover)", cursor: (testing || !key.trim()) ? "not-allowed" : "pointer", color: (testing || !key.trim()) ? "var(--text-muted)" : "var(--text-primary)", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, flexShrink: 0, opacity: (testing || !key.trim()) ? 0.5 : 1 }}>
            {testing ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Zap size={12} />}
            {testing ? "…" : "Test"}
          </button>
        </div>
        {result && (
          <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 9, display: "flex", alignItems: "center", gap: 8, background: result.ok ? "rgba(16,185,129,0.07)" : "rgba(239,68,68,0.07)", border: `1px solid ${result.ok ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}` }}>
            {result.ok ? <CheckCircle size={13} color="#10b981" /> : <XCircle size={13} color="#f87171" />}
            <span style={{ fontSize: 12, color: result.ok ? "#10b981" : "#f87171", fontWeight: 600 }}>{result.ok ? `Connected · ${result.ms}ms` : result.msg}</span>
          </div>
        )}
        <a href={p.docsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--text-muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3, marginTop: 8 }}>
          Get API key <ExternalLink size={10} />
        </a>
      </div>

      <div>
        <FieldLabel>Model</FieldLabel>
        <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}
          style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 12px", fontSize: 13, color: "var(--text-primary)", outline: "none" }}>
          {p.models.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <button onClick={handleSetActive} disabled={!key.trim()}
        style={{ padding: "11px", borderRadius: 11, border: "none", background: !key.trim() ? "var(--bg-hover)" : "linear-gradient(135deg,#6366f1,#8b5cf6)", color: !key.trim() ? "var(--text-muted)" : "white", fontWeight: 700, fontSize: 13, cursor: !key.trim() ? "not-allowed" : "pointer", opacity: !key.trim() ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
        <Sparkles size={14} />
        {isActive ? "Active — Update Model" : "Use This Provider"}
      </button>
    </div>
  );
}

function OllamaProviderPanel() {
  const [url, setUrl] = useState(() => getOllamaUrl());
  const [savedUrl, setSavedUrl] = useState(() => getOllamaUrl());
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [active, setActive] = useState(() => getActiveProvider());
  const dirty = url !== savedUrl;
  const isActive = active?.provider === "ollama";

  const doTest = useCallback(async () => {
    const base = url.trim().replace(/\/+$/, "");
    if (!base) return;
    setTesting(true); setStatus("idle"); setModels([]); setPingMs(null); setVersion(null); setErrMsg("");
    try {
      const t0 = Date.now();
      const vRes = await fetch(`${base}/api/version`, { signal: AbortSignal.timeout(8000) });
      const ms = Date.now() - t0;
      if (!vRes.ok) throw new Error(`HTTP ${vRes.status}`);
      const vData = await vRes.json() as { version?: string };
      setPingMs(ms); setVersion(vData.version ?? "unknown");
      const mRes = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(10000) });
      let detectedModels: OllamaModel[] = [];
      if (mRes.ok) { const md = await mRes.json() as { models?: OllamaModel[] }; detectedModels = md.models ?? []; }
      setModels(detectedModels);
      const firstModel = detectedModels[0]?.name ?? "llama3";
      setSelectedModel(firstModel);
      const ap = { provider: "ollama", model: firstModel };
      setActiveProvider(ap); setActive(ap);
      window.dispatchEvent(new Event("ai-provider-changed"));
      setStatus("ok"); saveOllamaUrl(base); setSavedUrl(base); setUrl(base);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Connection failed";
      setStatus("error"); setErrMsg(msg.includes("timeout") ? "Timed out" : msg);
    } finally { setTesting(false); }
  }, [url]);

  function fmtSize(b?: number) {
    if (!b) return "";
    const gb = b / 1073741824;
    return gb > 1 ? `${gb.toFixed(1)} GB` : `${(b / 1048576).toFixed(0)} MB`;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(99,102,241,0.1)", border: "1.5px solid rgba(99,102,241,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🖥</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>Ollama</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Local or cloud GPU — no API key needed</div>
        </div>
        {isActive && (
          <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#818cf8" }} />Active
          </span>
        )}
      </div>

      <div>
        <FieldLabel>Base URL</FieldLabel>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={url} onChange={e => { setUrl(e.target.value); setStatus("idle"); }} placeholder="http://localhost:11434"
            style={{ flex: 1, background: "var(--bg-app)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 12px", fontSize: 13, color: "var(--text-primary)", outline: "none", fontFamily: "monospace" }} />
          <button onClick={doTest} disabled={testing || !url.trim()}
            style={{ padding: "9px 14px", borderRadius: 10, border: "none", background: (testing || !url.trim()) ? "var(--bg-hover)" : "#6366f1", cursor: (testing || !url.trim()) ? "not-allowed" : "pointer", color: (testing || !url.trim()) ? "var(--text-muted)" : "white", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, flexShrink: 0, opacity: (testing || !url.trim()) ? 0.5 : 1 }}>
            {testing ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={13} />}
            {testing ? "Testing…" : "Connect"}
          </button>
        </div>
        {dirty && savedUrl && (
          <button onClick={() => { saveOllamaUrl(url.trim()); setSavedUrl(url.trim()); }} style={{ marginTop: 6, fontSize: 11, color: "#818cf8", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Save URL without testing</button>
        )}
      </div>

      {status !== "idle" && (
        <div style={{ padding: "10px 14px", borderRadius: 11, display: "flex", alignItems: "center", gap: 10, background: status === "ok" ? "rgba(16,185,129,0.07)" : "rgba(239,68,68,0.07)", border: `1px solid ${status === "ok" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}` }}>
          {status === "ok" ? <Wifi size={16} color="#10b981" /> : <WifiOff size={16} color="#f87171" />}
          <div>
            {status === "ok" ? <><div style={{ fontSize: 12, fontWeight: 700, color: "#10b981" }}>Connected!</div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>Ollama {version} · {pingMs}ms · {models.length} model{models.length !== 1 ? "s" : ""}</div></> : <><div style={{ fontSize: 12, fontWeight: 700, color: "#f87171" }}>Connection failed</div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>{errMsg}</div></>}
          </div>
        </div>
      )}

      {models.length > 0 && (
        <div>
          <FieldLabel>Detected Models — click to activate</FieldLabel>
          <div style={{ border: "1px solid var(--border)", borderRadius: 11, overflow: "hidden" }}>
            {models.map((m, i) => {
              const isSel = (selectedModel || active?.model) === m.name;
              return (
                <button key={m.name} onClick={() => { setSelectedModel(m.name); const ap = { provider: "ollama", model: m.name }; setActiveProvider(ap); setActive(ap); window.dispatchEvent(new Event("ai-provider-changed")); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: isSel ? "rgba(99,102,241,0.08)" : "transparent", border: "none", borderTop: i > 0 ? "1px solid var(--border)" : "none", cursor: "pointer", textAlign: "left" }}>
                  <Brain size={13} color={isSel ? "#818cf8" : "var(--text-muted)"} />
                  <span style={{ flex: 1, fontSize: 12, fontWeight: isSel ? 700 : 500, color: isSel ? "#818cf8" : "var(--text-primary)" }}>{m.name}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{fmtSize(m.size)}</span>
                  {isSel && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#818cf8" }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

type AISelectedPanel = "openai" | "anthropic" | "gemini" | "groq" | "mistral" | "openrouter" | "xai" | "cohere" | "ollama";

function AISection() {
  const [selected, setSelected] = useState<AISelectedPanel>("ollama");
  const [active, setActive] = useState(() => getActiveProvider());

  useEffect(() => {
    function refresh() { setActive(getActiveProvider()); }
    window.addEventListener("ai-provider-changed", refresh);
    return () => window.removeEventListener("ai-provider-changed", refresh);
  }, []);

  const hasKey = (id: string) => {
    if (id === "ollama") return !!getOllamaUrl();
    if (id === "gemini") return !!(getKey(id) || (typeof window !== "undefined" ? localStorage.getItem(GEMINI_COMPAT) : ""));
    return !!getKey(id);
  };

  const selectedProvider = PROVIDERS.find(p => p.id === selected);

  return (
    <div>
      <SectionHeader title="AI Providers" subtitle="Configure which AI model powers your Smart Notes assistant." />
      {active && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", marginBottom: 24 }}>
          <Sparkles size={15} color="#818cf8" />
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Active: <strong style={{ color: "#818cf8" }}>{active.provider === "ollama" ? "Ollama" : PROVIDERS.find(p => p.id === active.provider)?.name ?? active.provider}</strong> · {active.model}</span>
        </div>
      )}

      <div style={{ display: "flex", gap: 20 }}>
        {/* Provider list */}
        <div style={{ width: 180, flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Cloud</div>
          {PROVIDERS.map(p => (
            <button key={p.id} onClick={() => setSelected(p.id as AISelectedPanel)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 9, border: "none", background: selected === p.id ? "rgba(99,102,241,0.12)" : "transparent", cursor: "pointer", textAlign: "left", marginBottom: 2, transition: "background 0.12s" }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: selected === p.id ? `${p.color}22` : "var(--bg-hover)", border: `1px solid ${selected === p.id ? p.color + "55" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{p.emoji}</div>
              <span style={{ flex: 1, fontSize: 12, fontWeight: selected === p.id ? 700 : 500, color: selected === p.id ? "var(--text-primary)" : "var(--text-muted)" }}>{p.name}</span>
              {active?.provider === p.id && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#818cf8", flexShrink: 0 }} />}
              {active?.provider !== p.id && hasKey(p.id) && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />}
            </button>
          ))}
          <div style={{ height: 1, background: "var(--border)", margin: "10px 4px" }} />
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Local</div>
          <button onClick={() => setSelected("ollama")}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 9, border: "none", background: selected === "ollama" ? "rgba(99,102,241,0.12)" : "transparent", cursor: "pointer", textAlign: "left", transition: "background 0.12s" }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: selected === "ollama" ? "rgba(99,102,241,0.15)" : "var(--bg-hover)", border: `1px solid ${selected === "ollama" ? "rgba(99,102,241,0.4)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🖥</div>
            <span style={{ flex: 1, fontSize: 12, fontWeight: selected === "ollama" ? 700 : 500, color: selected === "ollama" ? "var(--text-primary)" : "var(--text-muted)" }}>Ollama</span>
            {active?.provider === "ollama" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#818cf8" }} />}
          </button>
          <div style={{ marginTop: 12, padding: "10px 8px 4px", fontSize: 10, color: "var(--text-faint)", lineHeight: 1.6 }}>🔒 Keys stored in your browser only</div>
        </div>

        {/* Right panel */}
        <div style={{ flex: 1, background: "var(--bg-editor)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, minHeight: 300 }}>
          {selected === "ollama"
            ? <OllamaProviderPanel />
            : selectedProvider
              ? <ProviderPanel key={selectedProvider.id} p={selectedProvider} />
              : null
          }
        </div>
      </div>
    </div>
  );
}

/* ─── Appearance Section ──────────────────────────────────────────────────── */
function AppearanceSection() {
  const { dark, toggle } = useTheme();
  return (
    <div>
      <SectionHeader title="Appearance" subtitle="Customize how Smart Ins-Note looks for you." />

      <div style={{ background: "var(--bg-editor)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 11, background: dark ? "rgba(250,204,21,0.12)" : "rgba(99,102,241,0.1)", border: `1px solid ${dark ? "rgba(250,204,21,0.25)" : "rgba(99,102,241,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {dark ? <Moon size={18} color="#fbbf24" /> : <Sun size={18} color="#6366f1" />}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{dark ? "Dark Mode" : "Light Mode"}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{dark ? "Easy on the eyes in low light." : "Clean look in bright environments."}</div>
            </div>
          </div>
          <button onClick={toggle}
            style={{
              width: 52, height: 28, borderRadius: 14, border: "none", cursor: "pointer",
              background: dark ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "var(--border-strong)",
              position: "relative", transition: "background 0.2s", flexShrink: 0,
            }}>
            <div style={{
              position: "absolute", top: 3, left: dark ? 26 : 3, width: 22, height: 22, borderRadius: "50%",
              background: "white", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
            }} />
          </button>
        </div>
      </div>

      <div style={{ background: "var(--bg-editor)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>Theme Preview</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ padding: 14, borderRadius: 10, background: dark ? "#0f0f12" : "#ffffff", border: "1px solid var(--border)", textAlign: "center" }}>
            <Moon size={18} color={dark ? "#818cf8" : "var(--text-faint)"} style={{ marginBottom: 6 }} />
            <div style={{ fontSize: 11, fontWeight: 600, color: dark ? "#818cf8" : "var(--text-faint)" }}>Dark</div>
          </div>
          <div style={{ padding: 14, borderRadius: 10, background: dark ? "#1c1c24" : "#f0f0f3", border: "1px solid var(--border)", textAlign: "center" }}>
            <Sun size={18} color={!dark ? "#6366f1" : "var(--text-faint)"} style={{ marginBottom: 6 }} />
            <div style={{ fontSize: 11, fontWeight: 600, color: !dark ? "#6366f1" : "var(--text-faint)" }}>Light</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Account Section ─────────────────────────────────────────────────────── */
function AccountSection() {
  const router = useRouter();
  const user = getUser();
  const token = getToken();
  const [noteCount, setNoteCount] = useState<number | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch("/api/notes", { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } })
      .then(r => r.json() as Promise<unknown[]>)
      .then(d => setNoteCount(Array.isArray(d) ? d.length : null))
      .catch(() => setNoteCount(null));
  }, [token]);

  function handleSignOut() {
    setSigningOut(true);
    clearAuth();
    router.push("/notes-next/auth");
  }

  return (
    <div>
      <SectionHeader title="Account" subtitle="Manage your account and data." />

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
        <div style={{ padding: 18, background: "var(--bg-editor)", border: "1px solid var(--border)", borderRadius: 14, textAlign: "center" }}>
          <FileText size={20} color="#818cf8" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>{noteCount ?? "—"}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>Notes</div>
        </div>
        <div style={{ padding: 18, background: "var(--bg-editor)", border: "1px solid var(--border)", borderRadius: 14, textAlign: "center" }}>
          <Star size={20} color="#fbbf24" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>∞</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>Storage</div>
        </div>
        <div style={{ padding: 18, background: "var(--bg-editor)", border: "1px solid var(--border)", borderRadius: 14, textAlign: "center" }}>
          <Hash size={20} color="#10b981" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>Pro</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>Plan</div>
        </div>
      </div>

      {/* Account info */}
      <div style={{ background: "var(--bg-editor)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.9, marginBottom: 14 }}>Account Info</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Name</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{user?.name || "—"}</span>
          </div>
          <div style={{ height: 1, background: "var(--border)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Email</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{user?.email || "—"}</span>
          </div>
          <div style={{ height: 1, background: "var(--border)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>User ID</span>
            <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-faint)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{user?.id || "—"}</span>
          </div>
        </div>
      </div>

      {/* Sign out */}
      <div style={{ background: "var(--bg-editor)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Sign Out</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>You will be redirected to the login page.</div>
          </div>
          <button onClick={handleSignOut} disabled={signingOut}
            style={{ padding: "9px 18px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-hover)", cursor: signingOut ? "not-allowed" : "pointer", color: "var(--text-muted)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            {signingOut ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <LogOut size={13} />}
            Sign Out
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 14, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#f87171", marginBottom: 6 }}>Danger Zone</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
          To permanently delete your account and all data, contact support. This action cannot be undone.
        </div>
      </div>
    </div>
  );
}

/* ─── Main Settings Page ──────────────────────────────────────────────────── */
const SECTIONS: { id: Section; label: string; icon: React.FC<{ size?: number; color?: string }> }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Lock },
  { id: "ai", label: "AI Providers", icon: Sparkles },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "account", label: "Account", icon: BarChart2 },
];

export default function SettingsPage() {
  const [section, setSection] = useState<Section>("profile");
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [avatarColor, setAvatarColor] = useState("#6366f1");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    setUser(getUser());
    setAvatarColor(getAvatarColor());
    setAvatarUrl(getAvatarUrl());

    function onStorage() {
      setUser(getUser());
      setAvatarColor(getAvatarColor());
      setAvatarUrl(getAvatarUrl());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-app)", overflow: "hidden" }}>

      {/* Left sidebar */}
      <div style={{
        width: 240, flexShrink: 0, background: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column",
      }}>
        {/* Back button */}
        <div style={{ padding: "14px 14px 10px" }}>
          <Link href="/notes-next/notes" style={{ display: "inline-flex", alignItems: "center", gap: 7, textDecoration: "none", color: "var(--text-muted)", fontSize: 13, fontWeight: 500, padding: "6px 10px", borderRadius: 8, background: "var(--bg-hover)", transition: "all 0.12s" }}>
            <ArrowLeft size={14} />
            Back to Notes
          </Link>
        </div>

        {/* User card */}
        <div style={{ padding: "16px 16px 14px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar name={user?.name ?? "?"} color={avatarColor} url={avatarUrl} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name ?? "Loading…"}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email ?? ""}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: "10px 10px", flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.1, color: "var(--text-faint)", padding: "4px 8px 8px" }}>Settings</div>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px",
                borderRadius: 10, border: "none", cursor: "pointer", textAlign: "left", marginBottom: 2,
                background: section === s.id ? "rgba(99,102,241,0.12)" : "transparent",
                color: section === s.id ? "var(--accent)" : "var(--text-muted)",
                fontWeight: section === s.id ? 700 : 500, fontSize: 13,
                transition: "all 0.12s",
              }}>
              <s.icon size={15} color={section === s.id ? "var(--accent)" : "var(--text-faint)"} />
              {s.label}
              {section === s.id && <ChevronRight size={13} style={{ marginLeft: "auto" }} />}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, color: "var(--text-faint)", lineHeight: 1.6 }}>
            <span style={{ fontWeight: 700, color: "var(--text-muted)" }}>Smart Ins-Note</span>
            <br />Synced with Insforge
          </div>
        </div>
      </div>

      {/* Right content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 40px 60px" }}>
          {section === "profile" && <ProfileSection />}
          {section === "security" && <SecuritySection />}
          {section === "ai" && <AISection />}
          {section === "appearance" && <AppearanceSection />}
          {section === "account" && <AccountSection />}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
