import { neon } from "@netlify/neon";

const sql = neon();

export default async () => {
  // Create likes table
  await sql`
    CREATE TABLE IF NOT EXISTS likes (
      id SERIAL PRIMARY KEY,
      post_slug VARCHAR(255) NOT NULL,
      fingerprint VARCHAR(64) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(post_slug, fingerprint)
    )
  `;

  // Create comments table
  await sql`
    CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      post_slug VARCHAR(255) NOT NULL,
      author_name VARCHAR(100) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Create views table
  await sql`
    CREATE TABLE IF NOT EXISTS views (
      id SERIAL PRIMARY KEY,
      post_slug VARCHAR(255) NOT NULL UNIQUE,
      count INTEGER DEFAULT 0,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Create indexes for faster queries
  await sql`CREATE INDEX IF NOT EXISTS idx_likes_post_slug ON likes(post_slug)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_comments_post_slug ON comments(post_slug)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_views_post_slug ON views(post_slug)`;

  return new Response(JSON.stringify({ success: true, message: "Database tables created" }), {
    headers: { "Content-Type": "application/json" },
  });
};

export const config = {
  path: "/api/db-setup",
};
