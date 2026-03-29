import { neon } from "@netlify/neon";
import { jsonResponse, getSiteUrl } from "./auth-utils";

const sql = neon();
const ADMIN_SECRET = process.env.NEWSLETTER_ADMIN_SECRET || "";

interface RssItem {
  slug: string;
  title: string;
}

function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const titleMatch = itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
                       itemXml.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);

    if (titleMatch && linkMatch) {
      const linkPath = linkMatch[1].trim();
      const slugMatch = linkPath.match(/\/posts\/([^/]+)\/?$/);
      const slug = slugMatch ? slugMatch[1] : "";
      if (slug) {
        items.push({ slug, title: titleMatch[1].trim() });
      }
    }
  }
  return items;
}

// One-time endpoint: seeds the newsletter_sent_articles table with all existing articles
// so deploy-succeeded only sends emails for truly new articles.
// Call once after first deploy, then you can remove this function.
export default async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!ADMIN_SECRET) {
    return jsonResponse({ error: "NEWSLETTER_ADMIN_SECRET not configured" }, 500);
  }

  const body = await req.json();
  if (body.secret !== ADMIN_SECRET) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const siteUrl = getSiteUrl();

  // Ensure table exists
  await sql`
    CREATE TABLE IF NOT EXISTS newsletter_sent_articles (
      id SERIAL PRIMARY KEY,
      post_slug VARCHAR(255) NOT NULL UNIQUE,
      title TEXT,
      sent_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Fetch RSS
  const res = await fetch(`${siteUrl}/rss.xml`);
  if (!res.ok) {
    return jsonResponse({ error: `Failed to fetch RSS: ${res.status}` }, 500);
  }
  const rssXml = await res.text();
  const items = parseRssItems(rssXml);

  // Insert all existing articles
  let seeded = 0;
  for (const item of items) {
    await sql`
      INSERT INTO newsletter_sent_articles (post_slug, title)
      VALUES (${item.slug}, ${item.title})
      ON CONFLICT (post_slug) DO NOTHING
    `;
    seeded++;
  }

  return jsonResponse({
    message: `Seeded ${seeded} existing articles into newsletter_sent_articles`,
    articles: items.map(i => i.slug),
  });
};

export const config = {
  path: "/api/seed-sent-articles",
};
