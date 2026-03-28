import { neon } from "@netlify/neon";
import { jsonResponse, getSiteUrl } from "./auth-utils";

const sql = neon();

const BREVO_API_KEY = process.env.BREVO_API_KEY || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL || "aminsiddique95@gmail.com";
const FROM_NAME = process.env.NEWSLETTER_FROM_NAME || "Reliable Data Engineering";
const ADMIN_SECRET = process.env.NEWSLETTER_ADMIN_SECRET || "";

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

export default async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Auth: require admin secret
  if (!ADMIN_SECRET) {
    return jsonResponse({ error: "NEWSLETTER_ADMIN_SECRET not configured" }, 500);
  }

  const body = await req.json();
  const { secret, slug, title, description } = body;

  if (secret !== ADMIN_SECRET) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  if (!slug || !title || !description) {
    return jsonResponse({ error: "Missing required fields: slug, title, description" }, 400);
  }

  const siteUrl = getSiteUrl();

  // Get all active subscribers
  const subscribers = await sql`
    SELECT email, unsubscribe_token FROM newsletter_subscribers WHERE subscribed = TRUE
  `;

  if (subscribers.length === 0) {
    return jsonResponse({ message: "No active subscribers", sent: 0 });
  }

  const subject = `New: ${title}`;
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  // Send to each subscriber (with their unique unsubscribe link)
  for (const sub of subscribers) {
    const unsubscribeUrl = `${siteUrl}/api/newsletter?action=unsubscribe&token=${sub.unsubscribe_token}`;
    const html = buildNewArticleHtml(siteUrl, unsubscribeUrl, title, description, slug);

    try {
      const result = await sendEmail(sub.email, subject, html);
      if (result.ok) {
        sent++;
      } else {
        failed++;
        errors.push(`${sub.email}: ${result.status} ${result.body}`);
      }
    } catch (err) {
      failed++;
      errors.push(`${sub.email}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }

    // Small delay to avoid rate limiting (Brevo: 300/day on free)
    if (sent % 10 === 0) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log(`[send-newsletter] Sent: ${sent}, Failed: ${failed}, Total subscribers: ${subscribers.length}`);
  if (errors.length > 0) {
    console.log("[send-newsletter] Errors:", errors.join("; "));
  }

  return jsonResponse({
    message: `Newsletter sent to ${sent} subscriber${sent !== 1 ? "s" : ""}`,
    sent,
    failed,
    total: subscribers.length,
  });
};

export const config = {
  path: "/api/send-newsletter",
};
