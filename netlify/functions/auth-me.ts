import {
  getUserFromSession,
  deleteSession,
  getSessionIdFromCookie,
  clearSessionCookie,
  jsonResponse,
} from "./auth-utils";

export default async (req: Request) => {
  const sessionId = getSessionIdFromCookie(req);

  // GET: Return current user
  if (req.method === "GET") {
    if (!sessionId) {
      return jsonResponse({ user: null });
    }

    const user = await getUserFromSession(sessionId);
    if (!user) {
      return jsonResponse({ user: null }, 200, {
        "Set-Cookie": clearSessionCookie(),
      });
    }

    return jsonResponse({
      user: {
        id: user.id,
        provider: user.provider,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.custom_avatar_url || user.avatar_url,
        oauthAvatarUrl: user.avatar_url,
        bio: user.bio || "",
        website: user.website || "",
        location: user.location || "",
        createdAt: user.created_at,
      },
    });
  }

  // POST: Logout
  if (req.method === "POST") {
    if (sessionId) {
      await deleteSession(sessionId);
    }

    return jsonResponse({ success: true }, 200, {
      "Set-Cookie": clearSessionCookie(),
    });
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
};

export const config = {
  path: ["/api/auth/me", "/api/auth/logout"],
};
