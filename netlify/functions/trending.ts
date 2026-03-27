import { neon } from "@netlify/neon";

const sql = neon();

export default async (req: Request) => {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rows = await sql`
    SELECT post_slug, count
    FROM views
    ORDER BY count DESC
    LIMIT 5
  `;

  return new Response(JSON.stringify({ trending: rows }), {
    headers: { "Content-Type": "application/json" },
  });
};

export const config = {
  path: "/api/trending",
};
