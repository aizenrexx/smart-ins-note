import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

const INSFORGE_API_KEY = process.env.INSFORGE_API_KEY!;
const INSFORGE_API_BASE_URL = process.env.INSFORGE_API_BASE_URL!;
const JWT_SECRET = process.env.SESSION_SECRET || "smart-ins-note-secret";

const baseHeaders = {
  "x-api-key": INSFORGE_API_KEY,
  "Content-Type": "application/json",
};

function usersUrl(suffix = "") {
  return `${INSFORGE_API_BASE_URL}/api/database/records/users${suffix}`;
}

const RegisterBody = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1).default(""),
});

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const ProfileBody = z.object({
  name: z.string().min(1, "Name must be at least 1 character").max(80),
});

const ChangePasswordBody = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

router.post("/auth/register", async (req, res) => {
  try {
    const { email, password, name } = RegisterBody.parse(req.body);

    const checkRes = await fetch(`${usersUrl()}?email=eq.${encodeURIComponent(email)}`, { headers: baseHeaders });
    const existing = await checkRes.json() as Array<unknown>;
    if (existing.length > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const password_hash = await bcrypt.hash(password, 12);

    const createRes = await fetch(usersUrl(), {
      method: "POST",
      headers: { ...baseHeaders, Prefer: "return=representation" },
      body: JSON.stringify([{ email, password_hash, name }]),
    });

    const raw = await createRes.json() as Array<Record<string, unknown>>;
    if (!createRes.ok) {
      req.log.error({ raw }, "Failed to create user");
      res.status(500).json({ error: "Failed to register" });
      return;
    }

    const user = raw[0];
    const token = jwt.sign({ id: user["id"], email, name }, JWT_SECRET, { expiresIn: "30d" });
    res.status(201).json({ token, user: { id: user["id"], email, name } });
  } catch (err) {
    req.log.error({ err }, "Register error");
    res.status(400).json({ error: err instanceof z.ZodError ? err.issues[0].message : "Registration failed" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = LoginBody.parse(req.body);

    const fetchRes = await fetch(`${usersUrl()}?email=eq.${encodeURIComponent(email)}`, { headers: baseHeaders });
    const rows = await fetchRes.json() as Array<Record<string, unknown>>;

    if (!rows.length) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user["password_hash"] as string);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const name = user["name"] as string;
    const token = jwt.sign({ id: user["id"], email, name }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, user: { id: user["id"], email, name } });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(400).json({ error: "Login failed" });
  }
});

router.get("/auth/me", async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return; }
    const token = auth.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; email: string; name: string };
    res.json({ user: { id: payload.id, email: payload.email, name: payload.name } });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

router.patch("/auth/profile", requireAuth, async (req, res) => {
  try {
    const { name } = ProfileBody.parse(req.body);
    const userId = req.user!.id;

    const patchRes = await fetch(`${usersUrl()}?id=eq.${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: { ...baseHeaders, Prefer: "return=representation" },
      body: JSON.stringify({ name }),
    });

    if (!patchRes.ok) {
      const raw = await patchRes.json().catch(() => ({})) as Record<string, unknown>;
      req.log.error({ raw }, "Failed to update profile");
      res.status(500).json({ error: "Failed to update profile" });
      return;
    }

    const token = jwt.sign(
      { id: userId, email: req.user!.email, name },
      JWT_SECRET,
      { expiresIn: "30d" }
    );
    res.json({ token, user: { id: userId, email: req.user!.email, name } });
  } catch (err) {
    req.log.error({ err }, "Profile update error");
    res.status(400).json({ error: err instanceof z.ZodError ? err.issues[0].message : "Failed to update profile" });
  }
});

router.post("/auth/change-password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = ChangePasswordBody.parse(req.body);
    const userId = req.user!.id;

    const fetchRes = await fetch(`${usersUrl()}?id=eq.${encodeURIComponent(userId)}`, { headers: baseHeaders });
    const rows = await fetchRes.json() as Array<Record<string, unknown>>;

    if (!rows.length) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const user = rows[0];
    const valid = await bcrypt.compare(currentPassword, user["password_hash"] as string);
    if (!valid) {
      res.status(400).json({ error: "Current password is incorrect" });
      return;
    }

    const password_hash = await bcrypt.hash(newPassword, 12);
    const patchRes = await fetch(`${usersUrl()}?id=eq.${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: baseHeaders,
      body: JSON.stringify({ password_hash }),
    });

    if (!patchRes.ok) {
      req.log.error({}, "Failed to update password");
      res.status(500).json({ error: "Failed to update password" });
      return;
    }

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    req.log.error({ err }, "Change password error");
    res.status(400).json({ error: err instanceof z.ZodError ? err.issues[0].message : "Failed to change password" });
  }
});

export default router;
