import { neon } from "@netlify/neon";

const sql = neon();

const VALID_REACTIONS = ["thumbsup", "fire", "lightbulb", "heart"];

export default async (req: Request) => {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");

  if (!slug) {
    return new Response(JSON.stringify({ error: "Missing slug parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // GET: Return reaction counts and user's reactions
  if (req.method === "GET") {
    const fingerprint = url.searchParams.get("fp") || "";

    const counts = await sql`
      SELECT reaction_type, COUNT(*) as count
      FROM reactions WHERE post_slug = ${slug}
      GROUP BY reaction_type
    `;

    const countsMap: Record<string, number> = {};
    for (const row of counts) {
      countsMap[row.reaction_type] = parseInt(row.count);
    }

    let userReactions: string[] = [];
    if (fingerprint) {
      const rows = await sql`
        SELECT reaction_type FROM reactions
        WHERE post_slug = ${slug} AND fingerprint = ${fingerprint}
      `;
      userReactions = rows.map(r => r.reaction_type);
    }

    return new Response(JSON.stringify({ counts: countsMap, userReactions }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // POST: Toggle a reaction
  if (req.method === "POST") {
    const body = await req.json();
    const { fingerprint, reactionType } = body;

    if (!fingerprint) {
      return new Response(JSON.stringify({ error: "Missing fingerprint" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!reactionType || !VALID_REACTIONS.includes(reactionType)) {
      return new Response(JSON.stringify({ error: "Invalid reaction type" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const [existing] = await sql`
      SELECT id FROM reactions
      WHERE post_slug = ${slug} AND fingerprint = ${fingerprint} AND reaction_type = ${reactionType}
    `;

    if (existing) {
      await sql`
        DELETE FROM reactions
        WHERE post_slug = ${slug} AND fingerprint = ${fingerprint} AND reaction_type = ${reactionType}
      `;
    } else {
      await sql`
        INSERT INTO reactions (post_slug, fingerprint, reaction_type)
        VALUES (${slug}, ${fingerprint}, ${reactionType})
      `;
    }

    // Return updated counts
    const counts = await sql`
      SELECT reaction_type, COUNT(*) as count
      FROM reactions WHERE post_slug = ${slug}
      GROUP BY reaction_type
    `;

    const countsMap: Record<string, number> = {};
    for (const row of counts) {
      countsMap[row.reaction_type] = parseInt(row.count);
    }

    const userRows = await sql`
      SELECT reaction_type FROM reactions
      WHERE post_slug = ${slug} AND fingerprint = ${fingerprint}
    `;

    return new Response(JSON.stringify({
      counts: countsMap,
      userReactions: userRows.map(r => r.reaction_type),
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
  path: "/api/reactions",
};
