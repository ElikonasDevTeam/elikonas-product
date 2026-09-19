import { createHash } from "crypto";

const API_KEY = process.env.MAILCHIMP_API_KEY;
const AUDIENCE_ID = process.env.MAILCHIMP_FOUNDING_CODE_AUDIENCE_ID;
const TAG = process.env.MAILCHIMP_FOUNDING_CODE_TAG;

function datacenter(apiKey: string): string {
  const dc = apiKey.split("-").pop();
  if (!dc) {
    throw new Error('MAILCHIMP_API_KEY is missing its datacenter suffix (e.g. "-us4").');
  }
  return dc;
}

function subscriberHash(email: string): string {
  return createHash("md5").update(email.trim().toLowerCase()).digest("hex");
}

export type FoundingCodeResult = { ok: true } | { ok: false; error: string };

// Adds an email to the founding-code request audience and tags it so the
// Mailchimp automation configured on that tag sends the code. Deliberately
// does NOT set the newsletter interest group, and never overwrites an
// existing contact's subscribe/unsubscribe status (status_if_new only
// applies to brand-new contacts) — so this can never put someone on the
// main newsletter list or resubscribe someone who previously opted out.
// Only the signup form's own newsletter checkbox does that
// (see app/(auth)/signup/actions.ts).
export async function requestFoundingCode(email: string): Promise<FoundingCodeResult> {
  if (!API_KEY || !AUDIENCE_ID || !TAG) {
    console.error(
      "[mailchimp] MAILCHIMP_API_KEY / MAILCHIMP_FOUNDING_CODE_AUDIENCE_ID / MAILCHIMP_FOUNDING_CODE_TAG not set"
    );
    return { ok: false, error: "Founding code requests aren't configured yet." };
  }

  const dc = datacenter(API_KEY);
  const hash = subscriberHash(email);
  const base = `https://${dc}.api.mailchimp.com/3.0/lists/${AUDIENCE_ID}`;
  const auth = "Basic " + Buffer.from(`anystring:${API_KEY}`).toString("base64");
  const genericError = "Something went wrong sending your code. Please try again.";

  const memberRes = await fetch(`${base}/members/${hash}`, {
    method: "PUT",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      email_address: email,
      status_if_new: "subscribed",
    }),
  });

  if (!memberRes.ok) {
    const body = await memberRes.text().catch(() => "");
    console.error(`[mailchimp] founding-code member upsert failed: HTTP ${memberRes.status} ${body}`);
    return { ok: false, error: genericError };
  }

  const tagRes = await fetch(`${base}/members/${hash}/tags`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({ tags: [{ name: TAG, status: "active" }] }),
  });

  if (!tagRes.ok) {
    const body = await tagRes.text().catch(() => "");
    console.error(`[mailchimp] founding-code tag failed: HTTP ${tagRes.status} ${body}`);
    return { ok: false, error: genericError };
  }

  return { ok: true };
}
