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

  // Create users table (OAuth)
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      provider VARCHAR(20) NOT NULL,
      provider_id VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      display_name VARCHAR(100) NOT NULL,
      avatar_url TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(provider, provider_id)
    )
  `;

  // Create sessions table
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(64) PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Add email/password auth fields to users table
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`;
  await sql`ALTER TABLE users ALTER COLUMN provider_id DROP NOT NULL`;

  // Add profile fields to users table
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS website VARCHAR(255)`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(100)`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_avatar_url TEXT`;

  // Add user_id and parent_id columns to comments (for auth + threading)
  await sql`ALTER TABLE comments ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`;
  await sql`ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE`;
  await sql`ALTER TABLE comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP`;

  // Create bookmarks table
  await sql`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      post_slug VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, post_slug)
    )
  `;

  // Create newsletter subscribers table
  await sql`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(100),
      subscribed BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      unsubscribe_token VARCHAR(64) NOT NULL
    )
  `;

  // Create reading history table
  await sql`
    CREATE TABLE IF NOT EXISTS reading_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      post_slug VARCHAR(255) NOT NULL,
      progress REAL DEFAULT 0,
      last_read_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, post_slug)
    )
  `;

  // Create reactions table
  await sql`
    CREATE TABLE IF NOT EXISTS reactions (
      id SERIAL PRIMARY KEY,
      post_slug VARCHAR(255) NOT NULL,
      fingerprint VARCHAR(64) NOT NULL,
      reaction_type VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(post_slug, fingerprint, reaction_type)
    )
  `;

  // Create indexes for faster queries
  await sql`CREATE INDEX IF NOT EXISTS idx_likes_post_slug ON likes(post_slug)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_comments_post_slug ON comments(post_slug)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_views_post_slug ON views(post_slug)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_reading_history_user ON reading_history(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id)`;

  return new Response(JSON.stringify({ success: true, message: "Database tables created" }), {
    headers: { "Content-Type": "application/json" },
  });
};

export const config = {
  path: "/api/db-setup",
};
