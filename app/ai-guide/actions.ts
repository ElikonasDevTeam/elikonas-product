"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function addSuggestedCourseAction(
  name: string,
  provider: string,
  category: string
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("[addSuggestedCourseAction] auth error:", authError);
    redirect("/login");
  }

  console.log("[addSuggestedCourseAction] inserting for user:", user.id, "| data:", { name, provider, category });

  const { error: insertError } = await supabase.from("ed_units").insert({
    user_id: user.id,
    name,
    provider,
    category,
    status: "planned",
    progress_pct: 0,
  });

  if (insertError) {
    console.error("[addSuggestedCourseAction] insert error:", insertError);
    // Surface the error code and message so we can diagnose (RLS, missing table, etc.)
    throw new Error(`Failed to save course: ${insertError.message} (code: ${insertError.code})`);
  }

  console.log("[addSuggestedCourseAction] insert succeeded, redirecting to /profile");
  redirect("/profile");
}
