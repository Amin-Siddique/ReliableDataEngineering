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

  // GET: List highlights
  if (req.method === "GET") {
    const slug = url.searchParams.get("slug");

    if (slug) {
      // Highlights for a specific post
      const highlights = await sql`
        SELECT id, post_slug, selected_text, note, color, start_offset, end_offset, container_path, created_at
        FROM highlights
        WHERE user_id = ${user.id} AND post_slug = ${slug}
        ORDER BY start_offset ASC
      `;
      return jsonResponse({ highlights });
    }

    // All highlights for the user (grouped by post)
    const highlights = await sql`
      SELECT id, post_slug, selected_text, note, color, start_offset, end_offset, container_path, created_at
      FROM highlights
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 100
    `;
    return jsonResponse({ highlights });
  }

  // POST: Create a highlight
  if (req.method === "POST") {
    const body = await req.json();
    const { postSlug, selectedText, note, color, startOffset, endOffset, containerPath } = body;

    if (!postSlug || !selectedText || startOffset === undefined || endOffset === undefined || !containerPath) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    if (selectedText.length > 2000) {
      return jsonResponse({ error: "Selection too long (max 2000 chars)" }, 400);
    }

    if (note && note.length > 1000) {
      return jsonResponse({ error: "Note too long (max 1000 chars)" }, 400);
    }

    const validColors = ["yellow", "green", "blue", "pink", "purple"];
    const highlightColor = validColors.includes(color) ? color : "yellow";

    const [highlight] = await sql`
      INSERT INTO highlights (user_id, post_slug, selected_text, note, color, start_offset, end_offset, container_path)
      VALUES (${user.id}, ${postSlug}, ${selectedText}, ${note || null}, ${highlightColor}, ${startOffset}, ${endOffset}, ${containerPath})
      RETURNING id, post_slug, selected_text, note, color, start_offset, end_offset, container_path, created_at
    `;

    return jsonResponse({ highlight }, 201);
  }

  // PUT: Update a highlight (add/edit note or change color)
  if (req.method === "PUT") {
    const body = await req.json();
    const { highlightId, note, color } = body;

    if (!highlightId) {
      return jsonResponse({ error: "Missing highlightId" }, 400);
    }

    const [existing] = await sql`SELECT id, user_id, note, color FROM highlights WHERE id = ${highlightId}`;
    if (!existing || existing.user_id !== user.id) {
      return jsonResponse({ error: "Not authorized" }, 403);
    }

    if (note !== undefined && note.length > 1000) {
      return jsonResponse({ error: "Note too long (max 1000 chars)" }, 400);
    }

    const validColors = ["yellow", "green", "blue", "pink", "purple"];

    const [updated] = await sql`
      UPDATE highlights SET
        note = ${note !== undefined ? (note || null) : existing.note},
        color = ${color && validColors.includes(color) ? color : existing.color},
        updated_at = NOW()
      WHERE id = ${highlightId}
      RETURNING id, post_slug, selected_text, note, color, start_offset, end_offset, container_path, created_at
    `;

    return jsonResponse({ highlight: updated });
  }

  // DELETE: Remove a highlight
  if (req.method === "DELETE") {
    const body = await req.json();
    const { highlightId } = body;

    if (!highlightId) {
      return jsonResponse({ error: "Missing highlightId" }, 400);
    }

    const [existing] = await sql`SELECT id, user_id FROM highlights WHERE id = ${highlightId}`;
    if (!existing || existing.user_id !== user.id) {
      return jsonResponse({ error: "Not authorized" }, 403);
    }

    await sql`DELETE FROM highlights WHERE id = ${highlightId}`;
    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
};

export const config = {
  path: "/api/highlights",
};
