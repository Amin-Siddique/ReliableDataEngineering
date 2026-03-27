import { neon } from "@netlify/neon";
import { getUserFromSession, getSessionIdFromCookie, jsonResponse } from "./auth-utils";

const sql = neon();

export default async (req: Request) => {
  const sessionId = getSessionIdFromCookie(req);
  const user = sessionId ? await getUserFromSession(sessionId) : null;

  if (!user) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  // GET: List reading history
  if (req.method === "GET") {
    const history = await sql`
      SELECT post_slug, progress, last_read_at
      FROM reading_history
      WHERE user_id = ${user.id}
      ORDER BY last_read_at DESC
    `;

    return jsonResponse({ history });
  }

  // POST: Update reading progress
  if (req.method === "POST") {
    const body = await req.json();
    const { slug, progress } = body;

    if (!slug || progress === undefined) {
      return jsonResponse({ error: "Missing slug or progress" }, 400);
    }

    const clampedProgress = Math.min(1, Math.max(0, parseFloat(progress)));

    await sql`
      INSERT INTO reading_history (user_id, post_slug, progress, last_read_at)
      VALUES (${user.id}, ${slug}, ${clampedProgress}, NOW())
      ON CONFLICT (user_id, post_slug)
      DO UPDATE SET
        progress = GREATEST(reading_history.progress, ${clampedProgress}),
        last_read_at = NOW()
    `;

    return jsonResponse({ success: true, progress: clampedProgress });
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
};

export const config = {
  path: "/api/reading-history",
};
