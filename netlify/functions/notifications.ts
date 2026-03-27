import { neon } from "@netlify/neon";
import { getUserFromSession, getSessionIdFromCookie, jsonResponse } from "./auth-utils";

const sql = neon();

export default async (req: Request) => {
  const sessionId = getSessionIdFromCookie(req);
  const user = sessionId ? await getUserFromSession(sessionId) : null;

  if (!user) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  // GET: List notifications
  if (req.method === "GET") {
    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get("unread") === "true";
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);

    let notifications;
    if (unreadOnly) {
      notifications = await sql`
        SELECT id, type, source_user_name, comment_id, post_slug, message, read, created_at
        FROM notifications
        WHERE user_id = ${user.id} AND read = FALSE
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    } else {
      notifications = await sql`
        SELECT id, type, source_user_name, comment_id, post_slug, message, read, created_at
        FROM notifications
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    }

    const [countResult] = await sql`
      SELECT COUNT(*) as count FROM notifications WHERE user_id = ${user.id} AND read = FALSE
    `;

    return jsonResponse({
      notifications,
      unreadCount: parseInt(countResult.count),
    });
  }

  // PUT: Mark notifications as read
  if (req.method === "PUT") {
    const body = await req.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      await sql`UPDATE notifications SET read = TRUE WHERE user_id = ${user.id} AND read = FALSE`;
    } else if (notificationId) {
      await sql`UPDATE notifications SET read = TRUE WHERE id = ${notificationId} AND user_id = ${user.id}`;
    } else {
      return jsonResponse({ error: "Missing notificationId or markAllRead" }, 400);
    }

    return jsonResponse({ success: true });
  }

  // DELETE: Clear all read notifications
  if (req.method === "DELETE") {
    await sql`DELETE FROM notifications WHERE user_id = ${user.id} AND read = TRUE`;
    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
};

export const config = {
  path: "/api/notifications",
};
