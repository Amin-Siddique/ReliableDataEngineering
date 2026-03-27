import { neon } from "@netlify/neon";
import { getUserFromSession, getSessionIdFromCookie, jsonResponse } from "./auth-utils";

const sql = neon();

export default async (req: Request) => {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");

  // Get current user (optional for GET/POST, required for PUT/DELETE)
  const sessionId = getSessionIdFromCookie(req);
  const user = sessionId ? await getUserFromSession(sessionId) : null;

  if (!slug && req.method !== "PUT" && req.method !== "DELETE") {
    return jsonResponse({ error: "Missing slug parameter" }, 400);
  }

  // GET: Return all comments for a post (with user info and threading)
  if (req.method === "GET") {
    const comments = await sql`
      SELECT c.id, c.author_name, c.content, c.created_at, c.updated_at,
             c.parent_id, c.user_id,
             u.display_name as user_display_name,
             u.avatar_url as user_avatar_url,
             u.provider as user_provider
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.post_slug = ${slug}
      ORDER BY c.created_at ASC
    `;

    return jsonResponse({ comments, currentUserId: user?.id || null });
  }

  // POST: Add a new comment
  if (req.method === "POST") {
    const body = await req.json();
    const { authorName, content, parentId } = body;

    // If authenticated, use user's name; otherwise require authorName
    const name = user ? user.display_name : authorName;
    if (!name || !content) {
      return jsonResponse({ error: "Missing authorName or content" }, 400);
    }

    if (name.length > 100) {
      return jsonResponse({ error: "Author name too long (max 100 chars)" }, 400);
    }

    if (content.length > 2000) {
      return jsonResponse({ error: "Comment too long (max 2000 chars)" }, 400);
    }

    // Basic spam prevention: no links (skip for authenticated users)
    if (!user && (content.includes("http://") || content.includes("https://"))) {
      return jsonResponse({ error: "Links are not allowed in comments" }, 400);
    }

    // Validate parentId if provided
    if (parentId) {
      const [parent] = await sql`SELECT id FROM comments WHERE id = ${parentId} AND post_slug = ${slug}`;
      if (!parent) {
        return jsonResponse({ error: "Parent comment not found" }, 400);
      }
    }

    const [newComment] = await sql`
      INSERT INTO comments (post_slug, author_name, content, user_id, parent_id)
      VALUES (${slug}, ${name}, ${content}, ${user?.id || null}, ${parentId || null})
      RETURNING id, author_name, content, created_at, parent_id, user_id
    `;

    // Add user info to response
    const comment = {
      ...newComment,
      user_display_name: user?.display_name || null,
      user_avatar_url: user?.avatar_url || null,
      user_provider: user?.provider || null,
    };

    return jsonResponse({ comment }, 201);
  }

  // PUT: Edit own comment
  if (req.method === "PUT") {
    if (!user) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }

    const body = await req.json();
    const { commentId, content } = body;

    if (!commentId || !content) {
      return jsonResponse({ error: "Missing commentId or content" }, 400);
    }

    if (content.length > 2000) {
      return jsonResponse({ error: "Comment too long (max 2000 chars)" }, 400);
    }

    const [existing] = await sql`SELECT id, user_id FROM comments WHERE id = ${commentId}`;
    if (!existing || existing.user_id !== user.id) {
      return jsonResponse({ error: "Not authorized to edit this comment" }, 403);
    }

    const [updated] = await sql`
      UPDATE comments SET content = ${content}, updated_at = NOW()
      WHERE id = ${commentId}
      RETURNING id, author_name, content, created_at, updated_at, parent_id, user_id
    `;

    return jsonResponse({ comment: updated });
  }

  // DELETE: Delete own comment
  if (req.method === "DELETE") {
    if (!user) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }

    const body = await req.json();
    const { commentId } = body;

    if (!commentId) {
      return jsonResponse({ error: "Missing commentId" }, 400);
    }

    const [existing] = await sql`SELECT id, user_id FROM comments WHERE id = ${commentId}`;
    if (!existing || existing.user_id !== user.id) {
      return jsonResponse({ error: "Not authorized to delete this comment" }, 403);
    }

    await sql`DELETE FROM comments WHERE id = ${commentId}`;

    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
};

export const config = {
  path: "/api/comments",
};
