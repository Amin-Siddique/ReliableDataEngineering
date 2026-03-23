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

  // GET: Return all comments for a post
  if (req.method === "GET") {
    const comments = await sql`
      SELECT id, author_name, content, created_at
      FROM comments
      WHERE post_slug = ${slug}
      ORDER BY created_at DESC
    `;

    return new Response(JSON.stringify({ comments }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // POST: Add a new comment
  if (req.method === "POST") {
    const body = await req.json();
    const { authorName, content } = body;

    if (!authorName || !content) {
      return new Response(JSON.stringify({ error: "Missing authorName or content" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Basic validation
    if (authorName.length > 100) {
      return new Response(JSON.stringify({ error: "Author name too long (max 100 chars)" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (content.length > 2000) {
      return new Response(JSON.stringify({ error: "Comment too long (max 2000 chars)" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Basic spam prevention: no links
    if (content.includes("http://") || content.includes("https://")) {
      return new Response(JSON.stringify({ error: "Links are not allowed in comments" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const [newComment] = await sql`
      INSERT INTO comments (post_slug, author_name, content)
      VALUES (${slug}, ${authorName}, ${content})
      RETURNING id, author_name, content, created_at
    `;

    return new Response(JSON.stringify({ comment: newComment }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = {
  path: "/api/comments",
};
