import { neon } from "@netlify/neon";

const sql = neon();

export default async (req: Request) => {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");

  if (!slug) {
    return new Response(JSON.stringify({ error: "Missing slug parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // GET: Return view count
  if (req.method === "GET") {
    const [result] = await sql`
      SELECT count FROM views WHERE post_slug = ${slug}
    `;

    return new Response(JSON.stringify({
      count: result?.count || 0
    }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // POST: Increment view count
  if (req.method === "POST") {
    await sql`
      INSERT INTO views (post_slug, count, updated_at)
      VALUES (${slug}, 1, NOW())
      ON CONFLICT (post_slug)
      DO UPDATE SET count = views.count + 1, updated_at = NOW()
    `;

    const [result] = await sql`
      SELECT count FROM views WHERE post_slug = ${slug}
    `;

    return new Response(JSON.stringify({
      count: result?.count || 0
    }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = {
  path: "/api/views",
};
