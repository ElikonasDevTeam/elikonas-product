"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function saveOnboardingAction(
  goal: string,
  interests: string[]
): Promise<{ message: string } | never> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.updateUser({
    data: {
      goal,
      interests,
      onboarding_completed: true,
    },
  });

  if (error || !user) {
    return { message: "Something went wrong saving your preferences. Please try again." };
  }

  // Sync profile now that we have a confirmed, authenticated user.
  // This replaces the dropped auth.users trigger and is safe — errors here
  // don't affect auth and the user can still proceed.
  const meta = user.user_metadata ?? {};
  const fullName: string | null = meta.full_name ?? null;
  const savedInterests: string[] = Array.isArray(meta.interests) ? meta.interests : interests;
  await supabase.from("profiles").upsert(
    { id: user.id, full_name: fullName, email: user.email ?? null, interests: savedInterests },
    { onConflict: "id" }
  );

  redirect("/onboarding/welcome");
}
