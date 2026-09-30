import { neon } from "@netlify/neon";

const sql = neon();

const SITE_URL = process.env.SITE_URL || "https://reliabledataengineering.com";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function generateSessionId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "";
  for (let i = 0; i < 64; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 64; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

export function getSiteUrl(): string {
  return SITE_URL;
}

export async function upsertUser(provider: string, providerId: string, email: string | null, displayName: string, avatarUrl: string | null) {
  const [user] = await sql`
    INSERT INTO users (provider, provider_id, email, display_name, avatar_url)
    VALUES (${provider}, ${providerId}, ${email}, ${displayName}, ${avatarUrl})
    ON CONFLICT (provider, provider_id)
    DO UPDATE SET email = COALESCE(EXCLUDED.email, users.email),
                  avatar_url = EXCLUDED.avatar_url
    RETURNING id, provider, provider_id, email, display_name, avatar_url
  `;
  return user;
}

export async function createSession(userId: number): Promise<string> {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await sql`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (${sessionId}, ${userId}, ${expiresAt.toISOString()})
  `;

  return sessionId;
}

export async function getUserFromSession(sessionId: string) {
  if (!sessionId) return null;

  const [result] = await sql`
    SELECT u.id, u.provider, u.email, u.display_name, u.avatar_url,
           u.bio, u.website, u.location, u.custom_avatar_url, u.created_at,
           s.expires_at
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ${sessionId} AND s.expires_at > NOW()
  `;

  return result || null;
}

export async function deleteSession(sessionId: string) {
  await sql`DELETE FROM sessions WHERE id = ${sessionId}`;
}

export function getSessionIdFromCookie(req: Request): string | null {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/session=([^;]+)/);
  return match ? match[1] : null;
}

export function setSessionCookie(sessionId: string): string {
  const maxAge = SESSION_DURATION_MS / 1000;
  return `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return "session=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0";
}

export function jsonResponse(data: object, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

export async function createNotification(
  userId: number,
  type: string,
  message: string,
  options: {
    sourceUserId?: number | null;
    sourceUserName?: string;
    commentId?: number | null;
    postSlug?: string;
  } = {}
) {
  // Don't notify yourself
  if (options.sourceUserId && options.sourceUserId === userId) return;

  await sql`
    INSERT INTO notifications (user_id, type, source_user_id, source_user_name, comment_id, post_slug, message)
    VALUES (
      ${userId},
      ${type},
      ${options.sourceUserId || null},
      ${options.sourceUserName || null},
      ${options.commentId || null},
      ${options.postSlug || null},
      ${message}
    )
  `;
}

export function redirectResponse(url: string, extraHeaders: Record<string, string> = {}) {
  return new Response(null, {
    status: 302,
    headers: { Location: url, ...extraHeaders },
  });
}
