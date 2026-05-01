"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type PrivacyField =
  | "show_interests"
  | "show_edunits_count"
  | "show_progress_pct"
  | "show_planned_units"
  | "show_learning_record";

export interface PrivacySettings {
  show_interests: boolean;
  show_edunits_count: boolean;
  show_progress_pct: boolean;
  show_planned_units: boolean;
  show_learning_record: boolean;
}

export const DEFAULT_PRIVACY: PrivacySettings = {
  show_interests: false,
  show_edunits_count: false,
  show_progress_pct: false,
  show_planned_units: false,
  show_learning_record: false,
};

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
