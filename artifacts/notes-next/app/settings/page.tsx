"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Eye, EyeOff, Lock, Palette, Save, ShieldCheck, Sparkles, User, Bell, Mail, SunMoon, SlidersHorizontal } from "lucide-react";
import { apiChangePassword, apiUpdateProfile, clearAuth, getAvatarColor, getAvatarUrl, getBio, getUser, saveAuth, saveAvatarColor, saveAvatarUrl, saveBio } from "@/lib/auth";
import { useTheme } from "@/lib/providers";
import { ClayBook, ClaySettings, ClaySun, ClayMoon } from "@/components/ClayIcons";

function Card({ children, subtle = false }: { children: React.ReactNode; subtle?: boolean }) {
  return <div style={{ background: subtle ? "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))" : "var(--bg-editor)", border: "1px solid var(--border)", borderRadius: 22, padding: 22, boxShadow: subtle ? "0 8px 30px rgba(0,0,0,0.08)" : "var(--card-shadow)" }}>{children}</div>;
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.4, color: "var(--text-faint)", marginBottom: 6 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>{subtitle}</div>}
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
      style={{ width: "100%", padding: "13px 14px", borderRadius: 14, border: "1px solid var(--border)", background: readOnly ? "var(--bg-hover)" : "var(--bg-app)", color: "var(--text-primary)", outline: "none", boxSizing: "border-box", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
    />
  );
}

function TextArea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={4} style={{ width: "100%", padding: "13px 14px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--bg-app)", color: "var(--text-primary)", outline: "none", boxSizing: "border-box", resize: "vertical", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }} />;
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
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at top left, rgba(99,102,241,0.12), transparent 30%), radial-gradient(circle at top right, rgba(34,211,238,0.08), transparent 28%), var(--bg-app)", color: "var(--text-primary)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", minHeight: "100vh" }}>
        <aside style={{ borderRight: "1px solid var(--border)", background: "linear-gradient(180deg, rgba(255,255,255,0.04), transparent 20%), var(--bg-sidebar)", padding: 18, boxSizing: "border-box", position: "sticky", top: 0, height: "100vh" }}>
          <Link href="/notes" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", color: "var(--text-muted)", marginBottom: 22, fontSize: 13, fontWeight: 600 }}>
            <ArrowLeft size={16} /> Back to Notes
          </Link>
          <div style={{ padding: 16, borderRadius: 20, background: "linear-gradient(135deg, rgba(99,102,241,0.14), rgba(139,92,246,0.08))", border: "1px solid rgba(99,102,241,0.18)", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 54, height: 54, borderRadius: 18, background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}cc)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, boxShadow: "0 14px 30px rgba(99,102,241,0.24)" }}>{(name || user?.name || "?").slice(0, 2).toUpperCase()}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name || user?.name || "Loading..."}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email ?? ""}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
              <ClayBook size={20} />
              Personalized workspace controls
            </div>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { id: "profile", label: "Profile", icon: <User size={15} /> },
              { id: "security", label: "Security", icon: <Lock size={15} /> },
              { id: "appearance", label: "Appearance", icon: <Palette size={15} /> },
              { id: "account", label: "Account", icon: <ShieldCheck size={15} /> },
            ].map((item) => (
              <a key={item.id} href={`#${item.id}`} style={{ textDecoration: "none", color: "var(--text-muted)", padding: "11px 12px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--bg-hover)", display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 600 }}>
                {item.icon}
                {item.label}
              </a>
            ))}
          </div>
          <div style={{ marginTop: 18, padding: 16, borderRadius: 18, background: "var(--bg-editor)", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: "var(--text-muted)", fontSize: 12, fontWeight: 700 }}>
              <ClaySettings size={18} /> Quick actions
            </div>
            <button onClick={toggle} style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-app)", color: "var(--text-primary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
              {dark ? <ClaySun size={20} /> : <ClayMoon size={20} />} {dark ? "Dark" : "Light"} mode
            </button>
            <div style={{ fontSize: 12, color: "var(--text-faint)", lineHeight: 1.6 }}>Tweak your identity, security, and theme from one clean panel.</div>
          </div>
        </aside>

        <main style={{ overflowY: "auto" }}>
          <div style={{ maxWidth: 1060, margin: "0 auto", padding: 28 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, marginBottom: 24 }}>
              <div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 999, background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.16)", color: "var(--accent)", fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
                  <Bell size={14} /> Smart Ins-Note Settings
                </div>
                <h1 style={{ fontSize: 34, lineHeight: 1.05, letterSpacing: -1.2, margin: 0 }}>Modern account controls, polished for quick editing.</h1>
                <p style={{ marginTop: 10, fontSize: 15, color: "var(--text-muted)", maxWidth: 720, lineHeight: 1.7 }}>Keep your profile, password, and theme in sync with a refined dashboard that feels lightweight and premium.</p>
              </div>
              <div style={{ display: "grid", gap: 10, minWidth: 220 }}>
                <div style={{ padding: "14px 16px", borderRadius: 18, background: "linear-gradient(135deg, rgba(99,102,241,0.14), rgba(34,211,238,0.08))", border: "1px solid rgba(99,102,241,0.16)" }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Signed in as</div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{name || user?.name || "Loading..."}</div>
                </div>
                <div style={{ padding: "14px 16px", borderRadius: 18, background: "var(--bg-editor)", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Theme</div>
                  <div style={{ fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>{dark ? <ClayMoon size={18} /> : <ClaySun size={18} />} {dark ? "Dark" : "Light"}</div>
                </div>
              </div>
            </div>

            {status && <div style={{ marginBottom: 14, padding: "12px 14px", borderRadius: 14, background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.2)", color: "#10b981", display: "flex", alignItems: "center", gap: 8 }}><CheckCircle size={16} /> {status}</div>}
            {error && <div style={{ marginBottom: 14, padding: "12px 14px", borderRadius: 14, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", color: "#f87171" }}>{error}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1.3fr .9fr", gap: 18, alignItems: "start" }}>
              <div style={{ display: "grid", gap: 18 }}>
                <section id="profile">
                  <Card>
                    <SectionTitle title="Profile" subtitle="Update your name, bio, and avatar." />
                    <div style={{ display: "grid", gap: 16 }}>
                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>Display name</div>
                        <Input value={name} onChange={setName} placeholder="Your name" />
                      </div>
                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>Bio</div>
                        <TextArea value={bio} onChange={setBio} placeholder="A short bio..." />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                        <div style={{ display: "grid", gap: 8 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>Avatar color</div>
                          <input value={avatarColor} onChange={(e) => setAvatarColor(e.target.value)} style={{ width: "100%", height: 46, border: "1px solid var(--border)", borderRadius: 14, background: "var(--bg-app)", padding: 6 }} />
                        </div>
                        <div style={{ display: "grid", gap: 8 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>Avatar URL</div>
                          <Input value={avatarUrl} onChange={setAvatarUrl} placeholder="https://..." />
                        </div>
                      </div>
                      <button onClick={saveProfile} disabled={saving} style={{ width: "fit-content", padding: "11px 18px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 14px 24px rgba(99,102,241,0.2)" }}>
                        <Save size={16} /> Save Profile
                      </button>
                    </div>
                  </Card>
                </section>

                <section id="security">
                  <Card subtle>
                    <SectionTitle title="Security" subtitle="Change your password with a quick strength check." />
                    <div style={{ display: "grid", gap: 14 }}>
                      <div style={{ position: "relative" }}>
                        <Input value={currentPw} onChange={setCurrentPw} type={showPw ? "text" : "password"} placeholder="Current password" />
                        <button onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: 12, top: 12, background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                      </div>
                      <Input value={newPw} onChange={setNewPw} type="password" placeholder="New password" />
                      <div style={{ height: 7, borderRadius: 999, background: "var(--bg-hover)", overflow: "hidden" }}>
                        <div style={{ width: `${strength * 25}%`, height: "100%", background: strength >= 3 ? "#10b981" : strength >= 2 ? "#f59e0b" : "#f87171", borderRadius: 999 }} />
                      </div>
                      <Input value={confirmPw} onChange={setConfirmPw} type="password" placeholder="Confirm new password" />
                      <button onClick={savePassword} disabled={saving} style={{ width: "fit-content", padding: "11px 18px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#111827,#374151)", color: "white", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                        <Lock size={16} /> Change Password
                      </button>
                    </div>
                  </Card>
                </section>
              </div>

              <div style={{ display: "grid", gap: 18, position: "sticky", top: 24 }}>
                <Card subtle>
                  <SectionTitle title="Appearance" subtitle="Switch between light and dark mode." />
                  <div style={{ display: "grid", gap: 12 }}>
                    <button onClick={toggle} style={{ padding: "13px 16px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--bg-app)", color: "var(--text-primary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 10 }}><Palette size={16} /> Theme</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)" }}>{dark ? <ClayMoon size={18} /> : <ClaySun size={18} />} {dark ? "Dark" : "Light"}</span>
                    </button>
                    <div style={{ padding: 14, borderRadius: 14, background: "linear-gradient(135deg, rgba(99,102,241,0.10), rgba(34,211,238,0.06))", border: "1px solid rgba(99,102,241,0.14)", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>
                      A cleaner layout, softer cards, stronger hierarchy, and subtle gradients to make the page feel modern.
                    </div>
                  </div>
                </Card>

                <Card subtle>
                  <SectionTitle title="Account" subtitle="Sign out and keep your workspace tidy." />
                  <div style={{ display: "grid", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--text-muted)" }}>
                      <ShieldCheck size={16} /> Token stored in this browser
                    </div>
                    <button onClick={signOut} style={{ padding: "11px 16px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--bg-app)", color: "var(--text-primary)", cursor: "pointer", fontWeight: 700 }}>
                      Sign out
                    </button>
                    <div style={{ fontSize: 12, color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 8 }}>
                      <Sparkles size={14} /> Modern settings refresh complete
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}