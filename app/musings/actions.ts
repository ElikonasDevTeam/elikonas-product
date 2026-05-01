"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseHashtags(text: string): string[] {
  const matches = text.match(/#[a-zA-Z]\w*/g) ?? [];
  return [...new Set(matches.map((t) => t.slice(1).toLowerCase()))];
}

export async function postMusingAction(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const body = (formData.get("body") as string)?.trim();
  const rawVisibility = formData.get("visibility") as string | null;
  const visibility: "public" | "inner_circle" =
    rawVisibility === "public" ? "public" : "inner_circle";

  if (!body || body.length < 10) {
    return { error: "Your musing needs a bit more — at least 10 characters." };
  }

  const meta = user.user_metadata ?? {};
  const author_name: string = meta.full_name || user.email || "Learner";
  const author_tagline: string | null = meta.tagline ?? null;
  const hashtags = parseHashtags(body);

  console.log("[postMusingAction] inserting for user:", user.id, "| hashtags:", hashtags, "| visibility:", visibility);

  const { error: insertError } = await supabase.from("musings").insert({
    user_id: user.id,
    author_name,
    author_tagline,
    hashtags,
    body,
    visibility,
  });

  if (insertError) {
    console.error("[postMusingAction] insert error:", insertError.message, "| code:", insertError.code, "| details:", insertError.details);
    return { error: `Failed to post: ${insertError.message} (${insertError.code})` };
  }

  revalidatePath("/musings");
  return {};
}

export async function toggleLikeAction(
  musingId: string,
  currentlyLiked: boolean
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  if (currentlyLiked) {
    const { error } = await supabase
      .from("musing_likes")
      .delete()
      .eq("musing_id", musingId)
      .eq("user_id", user.id);
    if (error) console.error("[toggleLikeAction] delete error:", error.message);
  } else {
    const { error } = await supabase.from("musing_likes").insert({
      musing_id: musingId,
      user_id: user.id,
    });
    if (error) console.error("[toggleLikeAction] insert error:", error.message);
  }

  revalidatePath("/musings");
}
