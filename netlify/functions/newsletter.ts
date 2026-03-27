import { neon } from "@netlify/neon";
import { generateToken, jsonResponse, getSiteUrl } from "./auth-utils";

const sql = neon();

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
      await sql`UPDATE newsletter_subscribers SET subscribed = TRUE WHERE id = ${existing.id}`;
      return jsonResponse({ message: "Welcome back! Re-subscribed successfully." });
    }

    const unsubscribeToken = generateToken();

    await sql`
      INSERT INTO newsletter_subscribers (email, name, unsubscribe_token)
      VALUES (${email.toLowerCase()}, ${name || null}, ${unsubscribeToken})
    `;

    return jsonResponse({ message: "Subscribed successfully!" }, 201);
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
};

export const config = {
  path: "/api/newsletter",
};
