import { neon } from "@netlify/neon";
import { generateToken, jsonResponse, getSiteUrl } from "./auth-utils";

const sql = neon();
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL || "Reliable Data Engineering <onboarding@resend.dev>";

async function sendWelcomeEmail(toEmail: string, unsubscribeToken: string) {
  if (!RESEND_API_KEY) return; // Skip if no API key configured

  const siteUrl = getSiteUrl();
  const unsubscribeUrl = `${siteUrl}/api/newsletter?action=unsubscribe&token=${unsubscribeToken}`;

  const html = `
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

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [toEmail],
        subject: "Welcome to Reliable Data Engineering!",
        html,
      }),
    });
  } catch {
    // Don't fail the subscription if email sending fails
    console.error("Failed to send welcome email");
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

    return jsonResponse({ message: "Subscribed successfully! Check your inbox for a welcome email." }, 201);
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
};

export const config = {
  path: "/api/newsletter",
};
