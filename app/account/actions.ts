"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { stripe } from "@/lib/stripe/client";
import type { Plan, PrivacyField } from "./types";
import { FOUNDING_MEMBER_CAP } from "./constants";

// Keep in sync with the `reserved` array in generate_unique_profile_slug() (Supabase SQL).
const RESERVED_SLUGS = new Set([
  "account", "ai-guide", "api", "assessment", "auth", "bookstore",
  "check-email", "forgot-password", "groups", "learner", "learning-library",
  "login", "musings", "notifications", "onboarding", "people", "profile",
  "provider", "register", "reset-password", "signup", "tidings", "in",
  "admin", "support", "settings", "help", "about", "elikonas",
]);
const SLUG_FORMAT = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;

export async function updatePrivacySettingAction(
  field: PrivacyField,
  value: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.from("user_privacy_settings").upsert(
    { user_id: user.id, [field]: value, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("[updatePrivacySettingAction] error:", error.message);
    return { error: "Failed to save setting." };
  }

  revalidatePath("/account");
  return {};
}

export async function updateProfileSlugAction(
  rawSlug: string
): Promise<{ error?: string; slug?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const slug = rawSlug.trim().toLowerCase();

  if (!SLUG_FORMAT.test(slug)) {
    return {
      error: "3–30 characters: lowercase letters, numbers, and hyphens only. No leading/trailing hyphen.",
    };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { error: "That username is reserved. Please choose another." };
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("slug", slug)
    .neq("id", user.id)
    .maybeSingle();
  if (existing) {
    return { error: "That username is already taken." };
  }

  const { error } = await supabase.from("profiles").update({ slug }).eq("id", user.id);
  if (error) {
    console.error("[updateProfileSlugAction] error:", error.message);
    return { error: "Failed to save username." };
  }

  revalidatePath("/account");
  revalidatePath(`/profile/${slug}`);
  return { slug };
}

export async function createCheckoutSessionAction(
  plan: Plan
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const priceMap: Record<string, string | undefined> = {
    monthly: process.env.STRIPE_PRICE_MONTHLY,
    annual: process.env.STRIPE_PRICE_ANNUAL,
    founding_member: process.env.STRIPE_PRICE_FOUNDING,
  };

  const priceId = priceMap[plan];
  if (!priceId) return { error: "Invalid plan." };

  if (plan === "founding_member") {
    const { data: counter } = await supabase
      .from("founding_member_counter")
      .select("claimed")
      .eq("id", true)
      .maybeSingle();
    if ((counter?.claimed ?? 0) >= FOUNDING_MEMBER_CAP) {
      return { error: "Founding member spots are full." };
    }
  }

  const isSubscription = plan === "monthly" || plan === "annual";

  const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    mode: isSubscription ? "subscription" : "payment",
    client_reference_id: user.id,
    customer_email: user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/account?success=true`,
    cancel_url: `${appUrl}/account?cancelled=true`,
  };

  if (isSubscription) {
    sessionParams.subscription_data = {
      metadata: { user_id: user.id },
    };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  if (!session.url) return { error: "Failed to create checkout session." };
  return { url: session.url };
}

export async function createPortalSessionAction(): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const customerId = user.user_metadata?.stripe_customer_id as string | undefined;
  if (!customerId) return { error: "No billing account found." };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    configuration: process.env.STRIPE_PORTAL_CONFIG,
    return_url: `${appUrl}/account`,
  });

  return { url: session.url };
}

export async function changePasswordAction(
  currentPassword: string,
  newPassword: string
): Promise<{ error?: string; success?: boolean }> {
  if (newPassword.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return { error: "Not authenticated." };

  // Verify current password by re-signing in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInError) {
    return { error: "Current password is incorrect." };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (updateError) {
    return { error: "Failed to update password. Please try again." };
  }

  return { success: true };
}
