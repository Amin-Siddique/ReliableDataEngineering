// Shared bulk-send helper for newsletter emails.
// Resend: sends through the batch endpoint (up to 100 emails per request) and
// retries 429/5xx with backoff. Brevo: one request per email, throttled.

import { createHash } from "node:crypto";

const BREVO_API_KEY = process.env.BREVO_API_KEY || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL || "aminsiddique95@gmail.com";
const FROM_NAME = process.env.NEWSLETTER_FROM_NAME || "Reliable Data Engineering";

const RESEND_BATCH_SIZE = 100;
const MAX_ATTEMPTS = 5;

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
}

export interface BulkSendResult {
  sent: number;
  failed: number;
  errors: string[];
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function retryDelayMs(res: Response, attempt: number): number {
  const retryAfter = Number(res.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter * 1000;
  return 1000 * 2 ** attempt;
}

// POST with retries on 429 and 5xx. The idempotency key lets Resend drop a
// retried batch it already accepted.
async function postWithRetry(url: string, init: RequestInit): Promise<{ ok: boolean; status: number; body: string }> {
  let last = { ok: false, status: 0, body: "" };
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, init);
      const body = await res.text();
      last = { ok: res.ok, status: res.status, body };
      if (res.ok) return last;
      if (res.status !== 429 && res.status < 500) return last;
      await sleep(retryDelayMs(res, attempt));
    } catch (err) {
      last = { ok: false, status: 0, body: err instanceof Error ? err.message : "Unknown error" };
      await sleep(1000 * 2 ** attempt);
    }
  }
  return last;
}

// Key covers the exact recipients, so a changed subscriber list never reuses a
// key with a different payload (Resend rejects that).
function batchIdempotencyKey(prefix: string, chunk: OutgoingEmail[]): string {
  const digest = createHash("sha256").update(chunk.map(e => e.to).join(",")).digest("hex").slice(0, 32);
  return `${prefix.slice(0, 200)}-${digest}`;
}

async function sendViaResendBatch(emails: OutgoingEmail[], idempotencyPrefix: string): Promise<BulkSendResult> {
  const result: BulkSendResult = { sent: 0, failed: 0, errors: [] };

  for (let i = 0; i < emails.length; i += RESEND_BATCH_SIZE) {
    const chunk = emails.slice(i, i + RESEND_BATCH_SIZE);
    const res = await postWithRetry("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": batchIdempotencyKey(idempotencyPrefix, chunk),
      },
      body: JSON.stringify(
        chunk.map(e => ({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: [e.to],
          subject: e.subject,
          html: e.html,
        }))
      ),
    });

    if (res.ok) {
      result.sent += chunk.length;
    } else {
      result.failed += chunk.length;
      result.errors.push(`batch ${i / RESEND_BATCH_SIZE} (${chunk.length} emails): ${res.status} ${res.body}`);
    }
  }

  return result;
}

async function sendViaBrevo(emails: OutgoingEmail[]): Promise<BulkSendResult> {
  const result: BulkSendResult = { sent: 0, failed: 0, errors: [] };

  for (const [index, e] of emails.entries()) {
    const res = await postWithRetry("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: [{ email: e.to }],
        subject: e.subject,
        htmlContent: e.html,
      }),
    });

    if (res.ok) {
      result.sent++;
    } else {
      result.failed++;
      result.errors.push(`${e.to}: ${res.status} ${res.body}`);
    }

    // Small delay every 10 emails to stay under provider rate limits
    if ((index + 1) % 10 === 0) await sleep(200);
  }

  return result;
}

// idempotencyPrefix must be stable for one logical send (e.g. per article),
// so a re-run within 24 hours doesn't email the same people twice via Resend.
export async function sendBulkEmails(emails: OutgoingEmail[], idempotencyPrefix: string): Promise<BulkSendResult> {
  if (emails.length === 0) return { sent: 0, failed: 0, errors: [] };
  if (BREVO_API_KEY) return sendViaBrevo(emails);
  if (RESEND_API_KEY) return sendViaResendBatch(emails, idempotencyPrefix);
  return { sent: 0, failed: emails.length, errors: ["No email provider configured"] };
}
