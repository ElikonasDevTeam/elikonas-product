"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { stripe } from "@/lib/stripe/client";
import type { PrivacyField } from "./types";

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

export async function createCheckoutSessionAction(): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: user.id,
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: 20000,
          product_data: {
            name: "Elikonas Founding Member — Lifetime Access",
            description: "One-time payment for lifetime access, locked in at founding member pricing.",
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/account?success=true`,
    cancel_url: `${appUrl}/account?cancelled=true`,
  });

  if (!session.url) return { error: "Failed to create checkout session." };
  return { url: session.url };
}
