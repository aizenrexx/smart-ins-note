const TOKEN_KEY = "smart-ins-note-token";
const USER_KEY = "smart-ins-note-user";
const BIO_KEY = "smart-ins-note-bio";
const AVATAR_COLOR_KEY = "smart-ins-note-avatar-color";
const AVATAR_URL_KEY = "smart-ins-note-avatar-url";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch { return null; }
}

export function saveAuth(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function getBio(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(BIO_KEY) || "";
}

export function saveBio(bio: string) {
  if (bio) localStorage.setItem(BIO_KEY, bio);
  else localStorage.removeItem(BIO_KEY);
}

export function getAvatarColor(): string {
  if (typeof window === "undefined") return "#6366f1";
  return localStorage.getItem(AVATAR_COLOR_KEY) || "#6366f1";
}

export function saveAvatarColor(color: string) {
  localStorage.setItem(AVATAR_COLOR_KEY, color);
}

export function getAvatarUrl(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(AVATAR_URL_KEY) || "";
}

export function saveAvatarUrl(url: string) {
  if (url) localStorage.setItem(AVATAR_URL_KEY, url);
  else localStorage.removeItem(AVATAR_URL_KEY);
}

const API = "/api";

function authHeaders(): Record<string, string> {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function apiRegister(email: string, password: string, name: string): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  const data = await res.json() as { token?: string; user?: AuthUser; error?: string };
  if (!res.ok) throw new Error(data.error || "Registration failed");
  return { token: data.token!, user: data.user! };
}

export async function apiLogin(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json() as { token?: string; user?: AuthUser; error?: string };
  if (!res.ok) throw new Error(data.error || "Login failed");
  return { token: data.token!, user: data.user! };
}

export async function apiUpdateProfile(name: string): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(`${API}/auth/profile`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ name }),
  });
  const data = await res.json() as { token?: string; user?: AuthUser; error?: string };
  if (!res.ok) throw new Error(data.error || "Failed to update profile");
  return { token: data.token!, user: data.user! };
}

export async function apiChangePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API}/auth/change-password`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await res.json() as { message?: string; error?: string };
  if (!res.ok) throw new Error(data.error || "Failed to change password");
}
