import {
  upsertUser,
  createSession,
  getSiteUrl,
  setSessionCookie,
  redirectResponse,
  jsonResponse,
} from "./auth-utils";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

export default async (req: Request) => {
  const url = new URL(req.url);
  const siteUrl = getSiteUrl();

  // Step 1: Redirect to Google OAuth
  if (!url.searchParams.has("code")) {
    const redirectUri = `${siteUrl}/api/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "select_account",
    });

    return redirectResponse(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  }

  // Step 2: Handle callback with authorization code
  const code = url.searchParams.get("code");
  if (!code) {
    return jsonResponse({ error: "Missing authorization code" }, 400);
  }

  try {
    const redirectUri = `${siteUrl}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokenRes.ok) {
      return redirectResponse(`${siteUrl}/?auth_error=google_token_failed`);
    }

    // Get user info
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const userInfo = await userInfoRes.json();
    if (!userInfoRes.ok) {
      return redirectResponse(`${siteUrl}/?auth_error=google_userinfo_failed`);
    }

    // Upsert user and create session
    const user = await upsertUser(
      "google",
      userInfo.id,
      userInfo.email || null,
      userInfo.name || userInfo.email || "Google User",
      userInfo.picture || null
    );

    const sessionId = await createSession(user.id);

    return redirectResponse(siteUrl + "/", {
      "Set-Cookie": setSessionCookie(sessionId),
    });
  } catch {
    return redirectResponse(`${siteUrl}/?auth_error=google_failed`);
  }
};

export const config = {
  path: ["/api/auth/google", "/api/auth/google/callback"],
};
