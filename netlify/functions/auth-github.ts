import {
  upsertUser,
  createSession,
  getSiteUrl,
  setSessionCookie,
  redirectResponse,
  jsonResponse,
} from "./auth-utils";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";

export default async (req: Request) => {
  const url = new URL(req.url);
  const siteUrl = getSiteUrl();

  // Step 1: Redirect to GitHub OAuth
  if (!url.searchParams.has("code")) {
    const redirectUri = `${siteUrl}/api/auth/github/callback`;
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: "read:user user:email",
    });

    return redirectResponse(`https://github.com/login/oauth/authorize?${params}`);
  }

  // Step 2: Handle callback with authorization code
  const code = url.searchParams.get("code");
  if (!code) {
    return jsonResponse({ error: "Missing authorization code" }, 400);
  }

  try {
    const redirectUri = `${siteUrl}/api/auth/github/callback`;

    // Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return redirectResponse(`${siteUrl}/?auth_error=github_token_failed`);
    }

    // Get user info
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/json",
        "User-Agent": "ReliableDataEngineering",
      },
    });

    const userInfo = await userRes.json();
    if (!userRes.ok) {
      return redirectResponse(`${siteUrl}/?auth_error=github_userinfo_failed`);
    }

    // Try to get email if not public
    let email = userInfo.email;
    if (!email) {
      const emailRes = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: "application/json",
          "User-Agent": "ReliableDataEngineering",
        },
      });
      if (emailRes.ok) {
        const emails = await emailRes.json();
        const primary = emails.find((e: { primary: boolean }) => e.primary);
        email = primary?.email || emails[0]?.email || null;
      }
    }

    // Upsert user and create session
    const user = await upsertUser(
      "github",
      userInfo.id.toString(),
      email || null,
      userInfo.name || userInfo.login || "GitHub User",
      userInfo.avatar_url || null
    );

    const sessionId = await createSession(user.id);

    return redirectResponse(siteUrl + "/", {
      "Set-Cookie": setSessionCookie(sessionId),
    });
  } catch {
    return redirectResponse(`${siteUrl}/?auth_error=github_failed`);
  }
};

export const config = {
  path: ["/api/auth/github", "/api/auth/github/callback"],
};
