"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const ALPHA_INVITE_CODE = "FOUNDING2026";

// Same public Mailchimp embedded-form endpoint used by subscribe.html and
// newsletter.html — no API key needed, this is the unauthenticated endpoint
// Mailchimp's own embed forms POST to. Calling it server-side (rather than
// from the browser) avoids the CORS opacity a client-side fetch would have,
// so failures here are actually visible in logs instead of failing silently.
const MAILCHIMP_URL =
  "https://elikonas.us4.list-manage.com/subscribe/post?u=2d3e21399e1d37ecbfa72d7b8&id=750f1fce6a&f_id=001dc2e1f0";

async function subscribeToNewsletter({
  firstName,
  lastName,
  email,
  phone,
}: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}) {
  try {
    const body = new URLSearchParams({
      FNAME: firstName,
      LNAME: lastName,
      EMAIL: email,
      "group[13974][1]": "", // Elikonas Newsletter group — see governance/newsletter.html
      tags: "signup-page",
      // Honeypot — must stay empty. Real submitters never fill this in.
      b_2d3e21399e1d37ecbfa72d7b8_750f1fce6a: "",
    });
    if (phone) {
      body.set("SMSPHONE", phone);
      body.set("SMSPHONE[country]", "US");
    }

    const res = await fetch(MAILCHIMP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      console.error(
        `[signupAction] newsletter subscription failed: HTTP ${res.status} for ${email}`
      );
    }
  } catch (err) {
    // Never let a Mailchimp hiccup block or fail account creation.
    console.error("[signupAction] newsletter subscription error:", err);
  }
}

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
  const newsletterOptIn = formData.get("newsletterOptIn") === "on";
  const newsletterSmsOptIn = formData.get("newsletterSmsOptIn") === "on";
  const newsletterPhone = (formData.get("newsletterPhone") as string)?.trim() || "";

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

  // Best-effort newsletter opt-in. Never blocks or fails signup — if
  // Mailchimp is unreachable or rejects the submission, the account still
  // gets created; we just log it so it's visible in Netlify's function logs.
  if (newsletterOptIn) {
    await subscribeToNewsletter({
      firstName,
      lastName,
      email,
      phone: newsletterSmsOptIn ? newsletterPhone : null,
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
