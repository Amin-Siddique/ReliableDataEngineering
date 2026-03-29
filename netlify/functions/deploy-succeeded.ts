import { neon } from "@netlify/neon";
import { getSiteUrl } from "./auth-utils";

const sql = neon();

const BREVO_API_KEY = process.env.BREVO_API_KEY || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL || "aminsiddique95@gmail.com";
const FROM_NAME = process.env.NEWSLETTER_FROM_NAME || "Reliable Data Engineering";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildNewArticleHtml(
  siteUrl: string,
  unsubscribeUrl: string,
  title: string,
  description: string,
  slug: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#0a0f18;font-family:'Segoe UI',system-ui,-apple-system,sans-serif">
      <div style="max-width:580px;margin:0 auto;padding:0">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#0f1923 0%,#162231 100%);padding:32px 32px 28px;text-align:center;border-bottom:2px solid #2dd4bf">
          <a href="${siteUrl}" style="font-size:20px;font-weight:700;color:#e2e8f0;text-decoration:none">Reliable Data Engineering</a>
        </div>

        <!-- Body -->
        <div style="background:#0f1923;padding:32px">

          <div style="font-size:12px;font-weight:600;color:#2dd4bf;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:16px">New Article</div>

          <!-- Article card -->
          <a href="${siteUrl}/posts/${escapeHtml(slug)}/" style="display:block;text-decoration:none;background:#1a2332;border:1px solid #1a3a4a;border-radius:10px;padding:24px;margin-bottom:24px">
            <div style="font-size:20px;font-weight:700;color:#e2e8f0;line-height:1.3;margin-bottom:8px">${escapeHtml(title)}</div>
            <div style="font-size:14px;color:#94a3b8;line-height:1.5;margin-bottom:16px">${escapeHtml(description)}</div>
            <div style="display:inline-block;background:#2dd4bf;color:#0f1923;padding:10px 24px;border-radius:6px;font-size:14px;font-weight:700;text-decoration:none">
              Read article &#8594;
            </div>
          </a>

          <div style="font-size:13px;color:#64748b;line-height:1.5;text-align:center">
            Enjoyed this? Share it with a friend or
            <a href="${siteUrl}" style="color:#2dd4bf;text-decoration:none">browse more articles</a>.
          </div>
        </div>

        <!-- Footer -->
        <div style="background:#0a0f18;padding:24px 32px;text-align:center;border-top:1px solid #1a3a4a">
          <div style="font-size:12px;color:#475569;line-height:1.6">
            You're receiving this because you subscribed at
            <a href="${siteUrl}" style="color:#64748b;text-decoration:none">${siteUrl.replace("https://", "")}</a>
            <br>
            <a href="${unsubscribeUrl}" style="color:#64748b;text-decoration:underline">Unsubscribe</a>
          </div>
        </div>

      </div>
    </body>
    </html>
  `;
}

async function sendEmail(toEmail: string, subject: string, html: string): Promise<{ ok: boolean; status: number; body: string }> {
  if (BREVO_API_KEY) {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: [{ email: toEmail }],
        subject,
        htmlContent: html,
      }),
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body };
  }

  if (RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [toEmail],
        subject,
        html,
      }),
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body };
  }

  return { ok: false, status: 0, body: "No email provider configured" };
}

interface RssItem {
  slug: string;
  title: string;
  description: string;
}

function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    const titleMatch = itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
                       itemXml.match(/<title>([\s\S]*?)<\/title>/);
    const descMatch = itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ||
                      itemXml.match(/<description>([\s\S]*?)<\/description>/);
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);

    if (titleMatch && linkMatch) {
      // Extract slug from link like https://site.com/posts/article_slug/
      const linkPath = linkMatch[1].trim();
      const slugMatch = linkPath.match(/\/posts\/([^/]+)\/?$/);
      const slug = slugMatch ? slugMatch[1] : "";

      if (slug) {
        items.push({
          slug,
          title: titleMatch[1].trim(),
          description: descMatch ? descMatch[1].trim() : "",
        });
      }
    }
  }

  return items;
}

// Netlify event-triggered function: runs after every successful deploy
export default async () => {
  console.log("[deploy-succeeded] Checking for new articles to notify subscribers...");

  const siteUrl = getSiteUrl();

  // Ensure the tracking table exists
  await sql`
    CREATE TABLE IF NOT EXISTS newsletter_sent_articles (
      id SERIAL PRIMARY KEY,
      post_slug VARCHAR(255) NOT NULL UNIQUE,
      title TEXT,
      sent_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Fetch the RSS feed from the deployed site
  let rssXml: string;
  try {
    const res = await fetch(`${siteUrl}/rss.xml`);
    if (!res.ok) {
      console.log(`[deploy-succeeded] Failed to fetch RSS: ${res.status}`);
      return;
    }
    rssXml = await res.text();
  } catch (err) {
    console.error("[deploy-succeeded] Error fetching RSS:", err);
    return;
  }

  const rssItems = parseRssItems(rssXml);
  console.log(`[deploy-succeeded] Found ${rssItems.length} articles in RSS feed`);

  if (rssItems.length === 0) return;

  // Get all slugs we've already sent newsletters for
  const sentRows = await sql`SELECT post_slug FROM newsletter_sent_articles`;
  const sentSlugs = new Set(sentRows.map((r: Record<string, any>) => r.post_slug as string));

  // Find new articles (in RSS but not in sent table)
  const newArticles = rssItems.filter(item => !sentSlugs.has(item.slug));

  if (newArticles.length === 0) {
    console.log("[deploy-succeeded] No new articles to send newsletters for");
    return;
  }

  console.log(`[deploy-succeeded] Found ${newArticles.length} new article(s):`, newArticles.map(a => a.slug));

  // Get all active subscribers
  const subscribers = await sql`
    SELECT email, unsubscribe_token FROM newsletter_subscribers WHERE subscribed = TRUE
  `;

  if (subscribers.length === 0) {
    console.log("[deploy-succeeded] No active subscribers — marking articles as sent anyway");
    for (const article of newArticles) {
      await sql`
        INSERT INTO newsletter_sent_articles (post_slug, title)
        VALUES (${article.slug}, ${article.title})
        ON CONFLICT (post_slug) DO NOTHING
      `;
    }
    return;
  }

  // Send newsletter for each new article
  for (const article of newArticles) {
    console.log(`[deploy-succeeded] Sending newsletter for: ${article.title}`);

    const subject = `New: ${article.title}`;
    let sent = 0;
    let failed = 0;

    for (const sub of subscribers) {
      const unsubscribeUrl = `${siteUrl}/api/newsletter?action=unsubscribe&token=${sub.unsubscribe_token}`;
      const html = buildNewArticleHtml(siteUrl, unsubscribeUrl, article.title, article.description, article.slug);

      try {
        const result = await sendEmail(sub.email, subject, html);
        if (result.ok) {
          sent++;
        } else {
          failed++;
          console.log(`[deploy-succeeded] Failed to send to ${sub.email}: ${result.status} ${result.body}`);
        }
      } catch (err) {
        failed++;
        console.error(`[deploy-succeeded] Error sending to ${sub.email}:`, err);
      }

      // Small delay to avoid rate limiting
      if (sent % 10 === 0) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    // Mark article as sent
    await sql`
      INSERT INTO newsletter_sent_articles (post_slug, title)
      VALUES (${article.slug}, ${article.title})
      ON CONFLICT (post_slug) DO NOTHING
    `;

    console.log(`[deploy-succeeded] Newsletter for "${article.title}": sent=${sent}, failed=${failed}, total=${subscribers.length}`);
  }

  console.log("[deploy-succeeded] Done processing new articles");
};
