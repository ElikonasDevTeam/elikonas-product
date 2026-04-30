"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function saveOnboardingAction(
  goal: string,
  interests: string[]
): Promise<{ message: string } | never> {
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    data: {
      goal,
      interests,
      onboarding_completed: true,
    },
  });

  if (error) {
    return { message: "Something went wrong saving your preferences. Please try again." };
  }

  redirect("/profile");
}
