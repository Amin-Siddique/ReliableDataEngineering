import { neon } from "@netlify/neon";
import {
  createSession,
  getSiteUrl,
  setSessionCookie,
  jsonResponse,
} from "./auth-utils";

const sql = neon();

// PBKDF2-based password hashing using Web Crypto API (no native dependencies)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join("");
  const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, _hashHex] = stored.split(":");
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex === _hashHex;
}

export default async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const url = new URL(req.url);
  const action = url.pathname.endsWith("/login") ? "login" : "signup";
  const body = await req.json();
  const { email, password, displayName } = body;
  const siteUrl = getSiteUrl();

  // Validate
  if (!email || !password) {
    return jsonResponse({ error: "Email and password are required" }, 400);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return jsonResponse({ error: "Invalid email address" }, 400);
  }

  if (password.length < 8) {
    return jsonResponse({ error: "Password must be at least 8 characters" }, 400);
  }

  if (password.length > 128) {
    return jsonResponse({ error: "Password too long" }, 400);
  }

  if (action === "signup") {
    if (!displayName || displayName.length > 100) {
      return jsonResponse({ error: "Display name is required (max 100 chars)" }, 400);
    }

    // Check if email already exists
    const [existing] = await sql`
      SELECT id, provider FROM users WHERE email = ${email.toLowerCase()}
    `;

    if (existing) {
      if (existing.provider === "email") {
        return jsonResponse({ error: "An account with this email already exists. Try signing in." }, 409);
      }
      return jsonResponse({ error: `This email is linked to a ${existing.provider} account. Sign in with ${existing.provider} instead.` }, 409);
    }

    const passwordHash = await hashPassword(password);

    const [user] = await sql`
      INSERT INTO users (provider, provider_id, email, display_name, password_hash)
      VALUES ('email', ${email.toLowerCase()}, ${email.toLowerCase()}, ${displayName}, ${passwordHash})
      RETURNING id
    `;

    const sessionId = await createSession(user.id);

    return jsonResponse({ success: true, redirect: siteUrl + "/" }, 201, {
      "Set-Cookie": setSessionCookie(sessionId),
    });
  }

  if (action === "login") {
    const [user] = await sql`
      SELECT id, password_hash, provider FROM users WHERE email = ${email.toLowerCase()}
    `;

    if (!user) {
      return jsonResponse({ error: "No account found with this email" }, 401);
    }

    if (user.provider !== "email" || !user.password_hash) {
      return jsonResponse({ error: `This email uses ${user.provider} sign-in. Use the ${user.provider} button instead.` }, 401);
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return jsonResponse({ error: "Incorrect password" }, 401);
    }

    const sessionId = await createSession(user.id);

    return jsonResponse({ success: true, redirect: siteUrl + "/" }, 200, {
      "Set-Cookie": setSessionCookie(sessionId),
    });
  }

  return jsonResponse({ error: "Invalid action" }, 400);
};

export const config = {
  path: ["/api/auth/email/signup", "/api/auth/email/login"],
};
