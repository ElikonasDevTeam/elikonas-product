"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { moderateContent } from "./moderation";

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

  // Moderate content before saving. Any API failure falls back to saving + flagging for manual review.
  type PendingReport = { reason: string; details: string };
  let pendingReport: PendingReport | null = null;
  let blockPost = false;

  try {
    const mod = await moderateContent(body);

    if (mod.verdict === "block" && mod.confidence === "high") {
      blockPost = true;
    } else if (mod.verdict === "block" || mod.verdict === "flag") {
      pendingReport = {
        reason: "ai_moderation_flag",
        details: `verdict=${mod.verdict} confidence=${mod.confidence}: ${mod.reason}`,
      };
    }
  } catch (err) {
    console.error("[postMusingAction] moderation error:", err);
    pendingReport = {
      reason: "moderation_check_failed",
      details: err instanceof Error ? err.message : String(err),
    };
  }

  if (blockPost) {
    return { error: "We weren't able to post this musing. Please review our Community Guidelines and try again." };
  }

  console.log("[postMusingAction] inserting for user:", user.id, "| hashtags:", hashtags, "| visibility:", visibility);

  const { data: newMusing, error: insertError } = await supabase
    .from("musings")
    .insert({
      user_id: user.id,
      author_name,
      author_tagline,
      hashtags,
      body,
      visibility,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("[postMusingAction] insert error:", insertError.message, "| code:", insertError.code, "| details:", insertError.details);
    return { error: `Failed to post: ${insertError.message} (${insertError.code})` };
  }

  if (pendingReport && newMusing) {
    const { error: reportError } = await supabase.from("reports").insert({
      reporter_id: null,
      content_type: "musing",
      content_id: newMusing.id,
      reason: pendingReport.reason,
      details: pendingReport.details,
    });
    if (reportError) {
      console.error("[postMusingAction] report insert error:", reportError.message);
    }
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

export type ReportResult = { success: true } | { error: "already_reported" | string };

export async function submitReportAction(
  musingId: string,
  reason: string,
  details: string
): Promise<ReportResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) redirect("/login");

  const [{ data: musing }, { data: existing }] = await Promise.all([
    supabase
      .from("musings")
      .select("body, user_id")
      .eq("id", musingId)
      .single(),
    supabase
      .from("reports")
      .select("id")
      .eq("reporter_id", user.id)
      .eq("content_type", "musing")
      .eq("content_id", musingId)
      .maybeSingle(),
  ]);

  if (existing) return { error: "already_reported" };

  let posterEmail: string | null = null;
  if (musing?.user_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", musing.user_id)
      .maybeSingle();
    posterEmail = profile?.email ?? null;
  }

  const { error: insertError } = await supabase.from("reports").insert({
    reporter_id: user.id,
    content_type: "musing",
    content_id: musingId,
    reason,
    details: details.trim() || null,
    musing_content: musing?.body ?? null,
    poster_email: posterEmail,
    reporter_email: user.email ?? null,
  });

  if (insertError) {
    if (insertError.code === "23505") return { error: "already_reported" };
    return { error: insertError.message };
  }

  return { success: true };
}
