"use server";

import { createClient } from "@/lib/supabase/server";

export type ForgotPasswordState = { success?: true; error?: string } | null;

export async function sendResetEmailAction(
  _prev: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = (formData.get("email") as string)?.trim();

  if (!email) {
    return { error: "Please enter your email address." };
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });

  if (error) {
    console.error("[sendResetEmailAction] error:", error.message);
    // Don't surface specifics — always show the same message to prevent user enumeration
  }

  // Always return success so we don't reveal whether the email exists
  return { success: true };
}
