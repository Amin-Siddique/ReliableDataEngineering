import { neon } from "@netlify/neon";
import { getUserFromSession, getSessionIdFromCookie, jsonResponse } from "./auth-utils";

const sql = neon();

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export default async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const sessionId = getSessionIdFromCookie(req);
  const user = sessionId ? await getUserFromSession(sessionId) : null;

  if (!user) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const contentType = req.headers.get("content-type") || "";

  if (!contentType.includes("multipart/form-data")) {
    return jsonResponse({ error: "Expected multipart/form-data" }, 400);
  }

  const formData = await req.formData();
  const file = formData.get("avatar");

  if (!file || !(file instanceof File)) {
    return jsonResponse({ error: "No file uploaded" }, 400);
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return jsonResponse({ error: "Invalid file type. Use JPEG, PNG, GIF, or WebP." }, 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return jsonResponse({ error: "File too large. Maximum size is 5 MB." }, 400);
  }

  const buffer = await file.arrayBuffer();
  const base64 = btoa(
    String.fromCharCode(...new Uint8Array(buffer))
  );
  const dataUrl = `data:${file.type};base64,${base64}`;

  await sql`
    UPDATE users SET custom_avatar_url = ${dataUrl} WHERE id = ${user.id}
  `;

  return jsonResponse({
    avatarUrl: dataUrl,
  });
};

export const config = {
  path: "/api/avatar-upload",
};
