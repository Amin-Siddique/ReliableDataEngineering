import { neon } from "@netlify/neon";
import { generateToken, jsonResponse, getSiteUrl } from "./auth-utils";

const sql = neon();

// Supports Brevo (recommended, no domain needed) or Resend
const BREVO_API_KEY = process.env.BREVO_API_KEY || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL || "aminsiddique95@gmail.com";
const FROM_NAME = process.env.NEWSLETTER_FROM_NAME || "Reliable Data Engineering";

function buildWelcomeHtml(siteUrl: string, unsubscribeUrl: string): string {
  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px 20px;color:#1f2937">
      <h1 style="font-size:24px;font-weight:700;color:#111827;margin-bottom:8px">Welcome to Reliable Data Engineering</h1>
      <p style="font-size:16px;line-height:1.6;color:#374151">
        Thanks for subscribing! You'll get notified when new articles drop — no spam, just practical guides on data engineering, AI, and the tools shaping modern infrastructure.
      </p>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />

      <h2 style="font-size:18px;font-weight:600;color:#111827;margin-bottom:12px">While you're here, check out some reader favorites:</h2>

      <ul style="padding-left:20px;line-height:2;color:#374151">
        <li><a href="${siteUrl}/posts/article_context_engineering/" style="color:#3b82f6;text-decoration:none">Context Engineering for AI Agents</a></li>
        <li><a href="${siteUrl}/posts/article_claude_code/" style="color:#3b82f6;text-decoration:none">Claude Code: The AI Developer Tool</a></li>
        <li><a href="${siteUrl}/posts/article_our_2m_data_lakehouse_is_just_postgres_with_extra_/" style="color:#3b82f6;text-decoration:none">Our $2M Data Lakehouse Is Just Postgres</a></li>
        <li><a href="${siteUrl}/posts/" style="color:#3b82f6;text-decoration:none">Browse all articles →</a></li>
      </ul>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />

      <p style="font-size:14px;line-height:1.6;color:#374151">
        You can also <a href="${siteUrl}/api/auth/google" style="color:#3b82f6;text-decoration:none">create an account</a> to bookmark articles, track your reading progress, and join the conversation in comments.
      </p>

      <p style="font-size:12px;color:#9ca3af;margin-top:32px">
        You're receiving this because you subscribed at ${siteUrl}.<br />
        <a href="${unsubscribeUrl}" style="color:#9ca3af">Unsubscribe</a>
      </p>
    </div>
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
      sendWelcomeEmail(email.toLowerCase(), resubbed.unsubscribe_token);
      return jsonResponse({ message: "Welcome back! Re-subscribed successfully." });
    }

    const unsubscribeToken = generateToken();

    await sql`
      INSERT INTO newsletter_subscribers (email, name, unsubscribe_token)
      VALUES (${email.toLowerCase()}, ${name || null}, ${unsubscribeToken})
    `;

    // Send welcome email (fire and forget)
    sendWelcomeEmail(email.toLowerCase(), unsubscribeToken);

    return jsonResponse({ message: "Subscribed successfully!" }, 201);
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
};

export const config = {
  path: "/api/newsletter",
};
