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

  // GET: Return like count and whether user has liked
  if (req.method === "GET") {
    const fingerprint = url.searchParams.get("fp") || "";

    const [countResult] = await sql`
      SELECT COUNT(*) as count FROM likes WHERE post_slug = ${slug}
    `;

    let hasLiked = false;
    if (fingerprint) {
      const [likeResult] = await sql`
        SELECT 1 FROM likes WHERE post_slug = ${slug} AND fingerprint = ${fingerprint}
      `;
      hasLiked = !!likeResult;
    }

    return new Response(JSON.stringify({
      count: parseInt(countResult.count),
      hasLiked
    }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // POST: Add or remove like (toggle)
  if (req.method === "POST") {
    const body = await req.json();
    const fingerprint = body.fingerprint;

    if (!fingerprint) {
      return new Response(JSON.stringify({ error: "Missing fingerprint" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if already liked
    const [existing] = await sql`
      SELECT id FROM likes WHERE post_slug = ${slug} AND fingerprint = ${fingerprint}
    `;

    if (existing) {
      // Unlike
      await sql`DELETE FROM likes WHERE post_slug = ${slug} AND fingerprint = ${fingerprint}`;
    } else {
      // Like
      await sql`INSERT INTO likes (post_slug, fingerprint) VALUES (${slug}, ${fingerprint})`;
    }

    // Return updated count
    const [countResult] = await sql`
      SELECT COUNT(*) as count FROM likes WHERE post_slug = ${slug}
    `;

    return new Response(JSON.stringify({
      count: parseInt(countResult.count),
      hasLiked: !existing
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
  path: "/api/likes",
};
