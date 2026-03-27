import { neon } from "@netlify/neon";
import { jsonResponse } from "./auth-utils";

const sql = neon();

export default async (req: Request) => {
  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");

  if (!slug) {
    return jsonResponse({ error: "Missing slug parameter" }, 400);
  }

  // Return all highlights with notes for this article, with user info
  const notes = await sql`
    SELECT
      h.id, h.selected_text, h.note, h.color,
      h.start_offset, h.end_offset, h.container_path, h.created_at,
      u.display_name, u.avatar_url
    FROM highlights h
    JOIN users u ON u.id = h.user_id
    WHERE h.post_slug = ${slug} AND h.note IS NOT NULL AND h.note != ''
    ORDER BY h.start_offset ASC
  `;

  return jsonResponse({ notes });
};

export const config = {
  path: "/api/public-notes",
};
