"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function addSuggestedCourseAction(
  name: string,
  provider: string,
  category: string
): Promise<{ error?: string }> {
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
    return { error: insertError.message };
  }

  console.log("[addSuggestedCourseAction] insert succeeded");
  return {};
}
