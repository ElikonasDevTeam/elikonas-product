"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
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
