"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const ALPHA_INVITE_CODE = "FOUNDING2026";

export type SignupError = {
  field?: "firstName" | "lastName" | "email" | "password" | "confirmPassword" | "country" | "phone" | "inviteCode";
  message: string;
};

export async function signupAction(
  _prev: SignupError | null,
  formData: FormData
): Promise<SignupError | null> {
  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName = (formData.get("lastName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const country = (formData.get("country") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || null;
  const smsOptIn = formData.get("smsOptIn") === "on";
  const inviteCode = (formData.get("inviteCode") as string)?.trim().toUpperCase();

  if (!firstName) {
    return { field: "firstName", message: "First name is required." };
  }
  if (!lastName) {
    return { field: "lastName", message: "Last name is required." };
  }
  if (!country) {
    return { field: "country", message: "Please select your country." };
  }

  if (inviteCode !== ALPHA_INVITE_CODE) {
    return { field: "inviteCode", message: "Invalid invite code. Please check your code and try again." };
  }

  if (password !== confirmPassword) {
    return { field: "confirmPassword", message: "Passwords do not match." };
  }

  const supabase = await createClient();

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
      },
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("email")) {
      return { field: "email", message: "Please enter a valid email address." };
    }
    if (msg.includes("password") || msg.includes("weak")) {
      return {
        field: "password",
        message: "Password is too weak. Use at least 8 characters with letters, numbers, and symbols.",
      };
    }
    if (msg.includes("already registered") || msg.includes("already exists")) {
      return { field: "email", message: "An account with this email already exists." };
    }
    return { message: error.message };
  }

  // Record consent at signup time for both flows.
  if (data.user) {
    await supabase.from("consent_records").insert({
      user_id: data.user.id,
      tos_version: "v1",
      privacy_version: "v1",
      consented_at: new Date().toISOString(),
    });
  }

  if (!data.session) {
    // Email confirmation required — user must confirm before they can authenticate.
    // Profile will be synced in onboarding once they log in.
    redirect("/check-email");
  }

  // Immediate session (no email confirmation) — sync profile now.
  if (data.user) {
    await supabase.from("profiles").upsert(
      {
        id: data.user.id,
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        email: data.user.email ?? null,
        country,
        phone,
        sms_notifications_enabled: phone ? smsOptIn : false,
      },
      { onConflict: "id" }
    );
  }

  redirect("/onboarding");
}
