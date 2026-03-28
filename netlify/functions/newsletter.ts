import { neon } from "@netlify/neon";
import { generateToken, jsonResponse, getSiteUrl } from "./auth-utils";

const sql = neon();

// Supports Brevo (recommended, no domain needed) or Resend
const BREVO_API_KEY = process.env.BREVO_API_KEY || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL || "aminsiddique95@gmail.com";
const FROM_NAME = process.env.NEWSLETTER_FROM_NAME || "Reliable Data Engineering";

function buildWelcomeHtml(siteUrl: string, unsubscribeUrl: string): string {
  const articles = [
    { slug: "article_context_engineering", title: "Context Engineering for AI Agents", desc: "Why the way you feed context to AI agents matters more than the model itself." },
    { slug: "article_claude_code", title: "Claude Code: The AI Developer Tool", desc: "How Claude Code changes the way engineers ship software." },
    { slug: "article_our_2m_data_lakehouse_is_just_postgres_with_extra_", title: "Our $2M Data Lakehouse Is Just Postgres", desc: "Sometimes the boring choice is the right architecture." },
  ];

  const articleCards = articles.map(a => `
    <a href="${siteUrl}/posts/${a.slug}/" style="display:block;text-decoration:none;background:#1a2332;border:1px solid #1a3a4a;border-radius:8px;padding:16px;margin-bottom:10px">
      <div style="font-size:15px;font-weight:600;color:#2dd4bf;margin-bottom:4px">${a.title}</div>
      <div style="font-size:13px;color:#94a3b8;line-height:1.4">${a.desc}</div>
    </a>
  `).join("");

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#0a0f18;font-family:'Segoe UI',system-ui,-apple-system,sans-serif">
      <div style="max-width:580px;margin:0 auto;padding:0">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#0f1923 0%,#162231 100%);padding:40px 32px 32px;text-align:center;border-bottom:2px solid #2dd4bf">
          <div style="font-size:13px;font-weight:600;color:#2dd4bf;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px">Welcome aboard</div>
          <h1 style="margin:0;font-size:26px;font-weight:700;color:#e2e8f0;line-height:1.3">Reliable Data Engineering</h1>
          <p style="margin:16px 0 0;font-size:15px;color:#94a3b8;line-height:1.5">
            You're in. New articles on data engineering, AI tools,<br>and modern infrastructure — straight to your inbox.
          </p>
        </div>

        <!-- Body -->
        <div style="background:#0f1923;padding:32px">

          <!-- What you'll get -->
          <div style="margin-bottom:32px">
            <h2 style="font-size:14px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px">What you'll get</h2>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
              <tr>
                <td style="padding:10px 12px;border-bottom:1px solid #1a3a4a">
                  <span style="font-size:16px;margin-right:8px">&#128218;</span>
                  <span style="font-size:14px;color:#e2e8f0">Deep dives on tools and architectures</span>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 12px;border-bottom:1px solid #1a3a4a">
                  <span style="font-size:16px;margin-right:8px">&#128161;</span>
                  <span style="font-size:14px;color:#e2e8f0">Honest reviews — no marketing fluff</span>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 12px;border-bottom:1px solid #1a3a4a">
                  <span style="font-size:16px;margin-right:8px">&#128640;</span>
                  <span style="font-size:14px;color:#e2e8f0">Practical guides you can use today</span>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 12px">
                  <span style="font-size:16px;margin-right:8px">&#128274;</span>
                  <span style="font-size:14px;color:#e2e8f0">No spam. Unsubscribe anytime.</span>
                </td>
              </tr>
            </table>
          </div>

          <!-- Popular articles -->
          <div style="margin-bottom:32px">
            <h2 style="font-size:14px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px">Start reading</h2>
            ${articleCards}
            <a href="${siteUrl}/posts/" style="display:inline-block;margin-top:8px;font-size:13px;color:#2dd4bf;text-decoration:none;font-weight:600">
              Browse all articles &#8594;
            </a>
          </div>

          <!-- CTA -->
          <div style="background:linear-gradient(135deg,#162231 0%,#1a2332 100%);border:1px solid #1a3a4a;border-radius:10px;padding:24px;text-align:center;margin-bottom:8px">
            <div style="font-size:15px;color:#e2e8f0;margin-bottom:4px;font-weight:600">Get more from every article</div>
            <div style="font-size:13px;color:#94a3b8;margin-bottom:16px">Bookmark posts, highlight text, track your reading, and join the conversation.</div>
            <a href="${siteUrl}/api/auth/google" style="display:inline-block;background:#2dd4bf;color:#0f1923;padding:10px 28px;border-radius:6px;font-size:14px;font-weight:700;text-decoration:none">
              Create free account
            </a>
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

async function sendWelcomeEmail(toEmail: string, unsubscribeToken: string) {
  const siteUrl = getSiteUrl();
  const unsubscribeUrl = `${siteUrl}/api/newsletter?action=unsubscribe&token=${unsubscribeToken}`;
  const subject = "Welcome to Reliable Data Engineering!";
  const html = buildWelcomeHtml(siteUrl, unsubscribeUrl);

  try {
    // Prefer Brevo (no domain verification needed — just verify your sender email)
    if (BREVO_API_KEY) {
      console.log("[newsletter] Sending welcome email via Brevo to:", toEmail);
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
      const resBody = await res.text();
      console.log("[newsletter] Brevo response:", res.status, resBody);
      return;
    }

    // Fallback to Resend (requires verified domain)
    if (RESEND_API_KEY) {
      console.log("[newsletter] Sending welcome email via Resend to:", toEmail);
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
      const resBody = await res.text();
      console.log("[newsletter] Resend response:", res.status, resBody);
      return;
    }

    console.log("[newsletter] No email provider configured (BREVO_API_KEY and RESEND_API_KEY are both empty)");
  } catch (err) {
    console.error("[newsletter] Failed to send welcome email:", err);
  }
}

export default async (req: Request) => {
  const url = new URL(req.url);

  // GET: Handle unsubscribe
  if (req.method === "GET") {
    const token = url.searchParams.get("token");
    const action = url.searchParams.get("action");

    if (action === "unsubscribe" && token) {
      const [subscriber] = await sql`
        UPDATE newsletter_subscribers
        SET subscribed = FALSE
        WHERE unsubscribe_token = ${token}
        RETURNING email
      `;

      if (subscriber) {
        const siteUrl = getSiteUrl();
        return new Response(
          `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Unsubscribed</title></head>
           <body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#111">
           <div style="text-align:center;color:#e5e7eb">
             <h1 style="font-size:1.5rem">Unsubscribed</h1>
             <p>You have been unsubscribed from the newsletter.</p>
             <a href="${siteUrl}" style="color:#3b82f6;text-decoration:none;margin-top:1rem;display:inline-block">Back to site</a>
           </div></body></html>`,
          { status: 200, headers: { "Content-Type": "text/html" } }
        );
      }

      return jsonResponse({ error: "Invalid unsubscribe token" }, 400);
    }

    return jsonResponse({ error: "Invalid request" }, 400);
  }

  // POST: Subscribe
  if (req.method === "POST") {
    const body = await req.json();
    const { email, name } = body;

    if (!email) {
      return jsonResponse({ error: "Email is required" }, 400);
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return jsonResponse({ error: "Invalid email address" }, 400);
    }

    if (email.length > 255) {
      return jsonResponse({ error: "Email too long" }, 400);
    }

    // Check if already subscribed
    const [existing] = await sql`
      SELECT id, subscribed FROM newsletter_subscribers WHERE email = ${email.toLowerCase()}
    `;

    if (existing) {
      if (existing.subscribed) {
        return jsonResponse({ message: "Already subscribed" });
      }
      // Re-subscribe
      const [resubbed] = await sql`
        UPDATE newsletter_subscribers SET subscribed = TRUE WHERE id = ${existing.id}
        RETURNING unsubscribe_token
      `;
      await sendWelcomeEmail(email.toLowerCase(), resubbed.unsubscribe_token);
      return jsonResponse({ message: "Welcome back! Re-subscribed successfully." });
    }

    const unsubscribeToken = generateToken();

    await sql`
      INSERT INTO newsletter_subscribers (email, name, unsubscribe_token)
      VALUES (${email.toLowerCase()}, ${name || null}, ${unsubscribeToken})
    `;

    await sendWelcomeEmail(email.toLowerCase(), unsubscribeToken);

    return jsonResponse({ message: "Subscribed successfully!" }, 201);
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
};

export const config = {
  path: "/api/newsletter",
};
