import { neon } from "@netlify/neon";
import { getUserFromSession, getSessionIdFromCookie, jsonResponse } from "./auth-utils";

const sql = neon();

export default async (req: Request) => {
  const sessionId = getSessionIdFromCookie(req);
  const user = sessionId ? await getUserFromSession(sessionId) : null;

  if (!user) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  // GET: Return full profile with stats
  if (req.method === "GET") {
    const [bookmarkCount] = await sql`
      SELECT COUNT(*) as count FROM bookmarks WHERE user_id = ${user.id}
    `;
    const [commentCount] = await sql`
      SELECT COUNT(*) as count FROM comments WHERE user_id = ${user.id}
    `;
    const [articlesRead] = await sql`
      SELECT COUNT(*) as count FROM reading_history WHERE user_id = ${user.id}
    `;

    return jsonResponse({
      profile: {
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
      stats: {
        bookmarks: parseInt(bookmarkCount.count),
        comments: parseInt(commentCount.count),
        articlesRead: parseInt(articlesRead.count),
      },
    });
  }

  // PUT: Update profile
  if (req.method === "PUT") {
    const body = await req.json();
    const { displayName, bio, website, location, customAvatarUrl } = body;

    // Validate
    if (displayName !== undefined && (typeof displayName !== "string" || displayName.length > 100)) {
      return jsonResponse({ error: "Display name must be under 100 characters" }, 400);
    }
    if (bio !== undefined && (typeof bio !== "string" || bio.length > 500)) {
      return jsonResponse({ error: "Bio must be under 500 characters" }, 400);
    }
    if (website !== undefined && typeof website === "string" && website.length > 0) {
      if (website.length > 255) {
        return jsonResponse({ error: "Website URL too long" }, 400);
      }
      // Basic URL validation
      if (!website.startsWith("http://") && !website.startsWith("https://")) {
        return jsonResponse({ error: "Website must start with http:// or https://" }, 400);
      }
    }
    if (location !== undefined && (typeof location !== "string" || location.length > 100)) {
      return jsonResponse({ error: "Location must be under 100 characters" }, 400);
    }

    const [updated] = await sql`
      UPDATE users SET
        display_name = COALESCE(${displayName || null}, display_name),
        bio = ${bio !== undefined ? bio : user.bio},
        website = ${website !== undefined ? (website || null) : user.website},
        location = ${location !== undefined ? (location || null) : user.location},
        custom_avatar_url = ${customAvatarUrl !== undefined ? (customAvatarUrl || null) : user.custom_avatar_url}
      WHERE id = ${user.id}
      RETURNING id, display_name, bio, website, location, custom_avatar_url, avatar_url, email
    `;

    return jsonResponse({
      profile: {
        id: updated.id,
        displayName: updated.display_name,
        bio: updated.bio || "",
        website: updated.website || "",
        location: updated.location || "",
        avatarUrl: updated.custom_avatar_url || updated.avatar_url,
        oauthAvatarUrl: updated.avatar_url,
        email: updated.email,
      },
    });
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
};

export const config = {
  path: "/api/profile",
};
