import { neon } from "@netlify/neon";
import {
  getUserFromSession,
  getSessionIdFromCookie,
  jsonResponse,
  createNotification,
} from "./auth-utils";

const sql = neon();

export default async (req: Request) => {
  const url = new URL(req.url);
  const commentIdParam = url.searchParams.get("commentId");

  const sessionId = getSessionIdFromCookie(req);
  const user = sessionId ? await getUserFromSession(sessionId) : null;

  // GET: Get like count and whether current user liked
  if (req.method === "GET") {
    if (!commentIdParam) {
      // Bulk fetch: get likes for all comments on a post
      const slug = url.searchParams.get("slug");
      if (!slug) {
        return jsonResponse({ error: "Missing slug or commentId" }, 400);
      }

      const counts = await sql`
        SELECT cl.comment_id, COUNT(*) as count
        FROM comment_likes cl
        JOIN comments c ON cl.comment_id = c.id
        WHERE c.post_slug = ${slug}
        GROUP BY cl.comment_id
      `;

      const countsMap: Record<number, number> = {};
      for (const row of counts) {
        countsMap[row.comment_id] = parseInt(row.count);
      }

      let userLikes: number[] = [];
      if (user) {
        const rows = await sql`
          SELECT cl.comment_id
          FROM comment_likes cl
          JOIN comments c ON cl.comment_id = c.id
          WHERE c.post_slug = ${slug} AND cl.user_id = ${user.id}
        `;
        userLikes = rows.map(r => r.comment_id);
      }

      return jsonResponse({ counts: countsMap, userLikes });
    }

    // Single comment
    const commentId = parseInt(commentIdParam);
    const [countResult] = await sql`
      SELECT COUNT(*) as count FROM comment_likes WHERE comment_id = ${commentId}
    `;

    let hasLiked = false;
    if (user) {
      const [liked] = await sql`
        SELECT 1 FROM comment_likes WHERE comment_id = ${commentId} AND user_id = ${user.id}
      `;
      hasLiked = !!liked;
    }

    return jsonResponse({
      count: parseInt(countResult.count),
      hasLiked,
    });
  }

  // POST: Toggle like (requires auth)
  if (req.method === "POST") {
    if (!user) {
      return jsonResponse({ error: "Sign in to like comments" }, 401);
    }

    const body = await req.json();
    const commentId = body.commentId;

    if (!commentId) {
      return jsonResponse({ error: "Missing commentId" }, 400);
    }

    // Check comment exists
    const [comment] = await sql`SELECT id, user_id, post_slug, author_name FROM comments WHERE id = ${commentId}`;
    if (!comment) {
      return jsonResponse({ error: "Comment not found" }, 404);
    }

    // Check if already liked
    const [existing] = await sql`
      SELECT id FROM comment_likes WHERE comment_id = ${commentId} AND user_id = ${user.id}
    `;

    if (existing) {
      // Unlike
      await sql`DELETE FROM comment_likes WHERE comment_id = ${commentId} AND user_id = ${user.id}`;
    } else {
      // Like
      await sql`INSERT INTO comment_likes (comment_id, user_id) VALUES (${commentId}, ${user.id})`;

      // Notify comment author
      if (comment.user_id && comment.user_id !== user.id) {
        await createNotification(
          comment.user_id,
          "like",
          `${user.display_name} liked your comment`,
          {
            sourceUserId: user.id,
            sourceUserName: user.display_name,
            commentId: commentId,
            postSlug: comment.post_slug,
          }
        );
      }
    }

    // Return updated count
    const [countResult] = await sql`
      SELECT COUNT(*) as count FROM comment_likes WHERE comment_id = ${commentId}
    `;

    return jsonResponse({
      count: parseInt(countResult.count),
      hasLiked: !existing,
    });
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
};

export const config = {
  path: "/api/comment-likes",
};
