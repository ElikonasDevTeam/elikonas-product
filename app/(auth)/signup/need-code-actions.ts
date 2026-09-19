"use server";

import { requestFoundingCode } from "@/lib/mailchimp/client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type NeedCodeState = { status: "idle" | "success" | "error"; message?: string };

export async function requestFoundingCodeAction(
  _prev: NeedCodeState,
  formData: FormData
): Promise<NeedCodeState> {
  const email = (formData.get("email") as string)?.trim();

  if (!email || !EMAIL_RE.test(email)) {
    return { status: "error", message: "Enter a valid email address." };
  }

  const result = await requestFoundingCode(email);
  if (!result.ok) {
    return { status: "error", message: result.error };
  }

  return { status: "success" };
}
