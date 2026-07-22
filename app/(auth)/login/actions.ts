"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type LoginError = {
  field?: "email" | "password";
  message: string;
};

export async function loginAction(
  _prev: LoginError | null,
  formData: FormData
): Promise<LoginError | null> {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("email not confirmed")) {
      return {
        message: "Please check your inbox and confirm your email before signing in.",
      };
    }
    // Generic message — avoids leaking whether the email exists
    return {
      message: "Incorrect email or password. Please try again.",
    };
  }

  if (data.user?.user_metadata?.onboarding_completed !== true) {
    redirect("/onboarding");
  }

  redirect("/profile");
}
