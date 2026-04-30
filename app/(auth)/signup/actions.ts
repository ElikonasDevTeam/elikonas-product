"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const ALPHA_INVITE_CODE = "FOUNDING2026";

export type SignupError = {
  field?: "fullName" | "email" | "password" | "confirmPassword" | "inviteCode";
  message: string;
};

export async function signupAction(
  _prev: SignupError | null,
  formData: FormData
): Promise<SignupError | null> {
  const fullName = (formData.get("fullName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const inviteCode = (formData.get("inviteCode") as string)?.trim().toUpperCase();

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
      data: { full_name: fullName, founding_member: true },
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

  // If email confirmation is required, data.session will be null.
  // Redirect to check-email so the user knows to confirm before logging in.
  if (!data.session) {
    redirect("/check-email");
  }

  redirect("/onboarding");
}
