"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, CheckCircle, Eye, EyeOff, Home, Lock, Palette, Save, ShieldCheck, Sparkles, User } from "lucide-react";
import { apiChangePassword, apiUpdateProfile, clearAuth, getAvatarColor, getAvatarUrl, getBio, getToken, getUser, saveAuth, saveAvatarColor, saveAvatarUrl, saveBio } from "@/lib/auth";
import { useTheme } from "@/lib/providers";

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: "var(--bg-editor)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>{children}</div>;
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>{title}</div>
      {subtitle && <div style={{ marginTop: 6, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{subtitle}</div>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", readOnly = false }: { value: string; onChange?: (v: string) => void; placeholder?: string; type?: string; readOnly?: boolean }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      type={type}
      readOnly={readOnly}
      style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: "1px solid var(--border)", background: readOnly ? "var(--bg-hover)" : "var(--bg-app)", color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }}
    />
  );
}

function TextArea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={4} style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-app)", color: "var(--text-primary)", outline: "none", boxSizing: "border-box", resize: "vertical" }} />;
}

export default function SettingsPage() {
  const router = useRouter();
  const { dark, toggle } = useTheme();
  const user = getUser();
  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState("");
  const [avatarColor, setAvatarColor] = useState("#6366f1");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setBio(getBio());
    setAvatarColor(getAvatarColor());
    setAvatarUrl(getAvatarUrl());
  }, []);

  const strength = useMemo(() => {
    if (!newPw) return 0;
    let score = 0;
    if (newPw.length >= 8) score++;
    if (newPw.length >= 12) score++;
    if (/[A-Z]/.test(newPw)) score++;
    if (/[0-9]/.test(newPw)) score++;
    return Math.min(score, 4);
  }, [newPw]);

  async function saveProfile() {
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const res = await apiUpdateProfile(name.trim() || user?.name || "");
      saveAuth(res.token, res.user);
      saveBio(bio);
      saveAvatarColor(avatarColor);
      saveAvatarUrl(avatarUrl);
      setStatus("Profile saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function savePassword() {
    if (!currentPw || !newPw || newPw !== confirmPw) {
      setError("Check your password fields");
      return;
    }
    setSaving(true);
    setError("");
    setStatus("");
    try {
      await apiChangePassword(currentPw, newPw);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setStatus("Password changed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to change password");
    } finally {
      setSaving(false);
    }
  }

  function signOut() {
    clearAuth();
    router.push("/auth");
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)", color: "var(--text-primary)" }}>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <aside style={{ width: 250, borderRight: "1px solid var(--border)", background: "var(--bg-sidebar)", padding: 16, boxSizing: "border-box" }}>
          <Link href="/notes" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", color: "var(--text-muted)", marginBottom: 18 }}>
            <ArrowLeft size={16} /> Back to Notes
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}cc)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800 }}>{(name || user?.name || "?").slice(0, 2).toUpperCase()}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name || user?.name || "Loading..."}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email ?? ""}</div>
            </div>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <a href="#profile" style={{ textDecoration: "none", color: "var(--text-muted)" }}>Profile</a>
            <a href="#security" style={{ textDecoration: "none", color: "var(--text-muted)" }}>Security</a>
            <a href="#appearance" style={{ textDecoration: "none", color: "var(--text-muted)" }}>Appearance</a>
            <a href="#account" style={{ textDecoration: "none", color: "var(--text-muted)" }}>Account</a>
          </div>
        </aside>

        <main style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ maxWidth: 860, margin: "0 auto", padding: 32 }}>
            {status && <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 12, background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.2)", color: "#10b981", display: "flex", alignItems: "center", gap: 8 }}><CheckCircle size={16} /> {status}</div>}
            {error && <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 12, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", color: "#f87171" }}>{error}</div>}

            <section id="profile" style={{ marginBottom: 24 }}>
              <SectionTitle title="Profile" subtitle="Update your name, bio, and avatar." />
              <Card>
                <div style={{ display: "grid", gap: 16 }}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>Display name</div>
                    <Input value={name} onChange={setName} placeholder="Your name" />
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>Bio</div>
                    <TextArea value={bio} onChange={setBio} placeholder="A short bio..." />
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>Avatar color</div>
                    <input value={avatarColor} onChange={(e) => setAvatarColor(e.target.value)} style={{ width: "100%", height: 42, border: "1px solid var(--border)", borderRadius: 12, background: "var(--bg-app)" }} />
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>Avatar URL</div>
                    <Input value={avatarUrl} onChange={setAvatarUrl} placeholder="https://..." />
                  </div>
                  <button onClick={saveProfile} disabled={saving} style={{ width: "fit-content", padding: "10px 16px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                    <Save size={16} /> Save Profile
                  </button>
                </div>
              </Card>
            </section>

            <section id="security" style={{ marginBottom: 24 }}>
              <SectionTitle title="Security" subtitle="Change your password." />
              <Card>
                <div style={{ display: "grid", gap: 14 }}>
                  <div style={{ position: "relative" }}>
                    <Input value={currentPw} onChange={setCurrentPw} type={showPw ? "text" : "password"} placeholder="Current password" />
                    <button onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: 10, top: 10, background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                  <Input value={newPw} onChange={setNewPw} type="password" placeholder="New password" />
                  <div style={{ height: 6, borderRadius: 999, background: "var(--bg-hover)", overflow: "hidden" }}>
                    <div style={{ width: `${strength * 25}%`, height: "100%", background: strength >= 3 ? "#10b981" : strength >= 2 ? "#f59e0b" : "#f87171" }} />
                  </div>
                  <Input value={confirmPw} onChange={setConfirmPw} type="password" placeholder="Confirm new password" />
                  <button onClick={savePassword} disabled={saving} style={{ width: "fit-content", padding: "10px 16px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#111827,#374151)", color: "white", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                    <Lock size={16} /> Change Password
                  </button>
                </div>
              </Card>
            </section>

            <section id="appearance" style={{ marginBottom: 24 }}>
              <SectionTitle title="Appearance" subtitle="Switch between light and dark mode." />
              <Card>
                <button onClick={toggle} style={{ padding: "10px 16px", borderRadius: 12, border: "1px solid var(--border)", background: dark ? "rgba(99,102,241,.14)" : "var(--bg-app)", color: "var(--text-primary)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Palette size={16} /> {dark ? "Dark" : "Light"} mode
                </button>
              </Card>
            </section>

            <section id="account">
              <SectionTitle title="Account" subtitle="Sign out and manage account access." />
              <Card>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>Signed in</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Your token is stored in this browser.</div>
                  </div>
                  <button onClick={signOut} style={{ padding: "10px 16px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-app)", color: "var(--text-primary)", cursor: "pointer" }}>
                    Sign out
                  </button>
                </div>
              </Card>
              <div style={{ marginTop: 16, fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8 }}>
                <ShieldCheck size={14} /> Settings are now available at this route.
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}