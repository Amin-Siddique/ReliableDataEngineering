import { neon } from "@netlify/neon";
import { getUserFromSession, getSessionIdFromCookie, jsonResponse } from "./auth-utils";

const sql = neon();

export default async (req: Request) => {
  const sessionId = getSessionIdFromCookie(req);
  const user = sessionId ? await getUserFromSession(sessionId) : null;

  if (!user) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");

  // GET: List bookmarks or check single bookmark
  if (req.method === "GET") {
    if (slug) {
      const [bookmark] = await sql`
        SELECT id FROM bookmarks WHERE user_id = ${user.id} AND post_slug = ${slug}
      `;
      return jsonResponse({ bookmarked: !!bookmark });
    }

    // List all bookmarks
    const bookmarks = await sql`
      SELECT post_slug, created_at FROM bookmarks
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
    `;
    return jsonResponse({ bookmarks });
  }

  // POST: Toggle bookmark
  if (req.method === "POST") {
    const body = await req.json();
    const postSlug = body.slug;

    if (!postSlug) {
      return jsonResponse({ error: "Missing slug" }, 400);
    }

    const [existing] = await sql`
      SELECT id FROM bookmarks WHERE user_id = ${user.id} AND post_slug = ${postSlug}
    `;

    if (existing) {
      await sql`DELETE FROM bookmarks WHERE user_id = ${user.id} AND post_slug = ${postSlug}`;
      return jsonResponse({ bookmarked: false });
    } else {
      await sql`INSERT INTO bookmarks (user_id, post_slug) VALUES (${user.id}, ${postSlug})`;
      return jsonResponse({ bookmarked: true });
    }
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
};

export const config = {
  path: "/api/bookmarks",
};
