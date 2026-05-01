"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { MessageData } from "./tidings-view";

export async function sendMessageAction(
  threadId: string,
  body: string
): Promise<{ message?: MessageData; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: thread, error: threadError } = await supabase
    .from("tidings_threads")
    .select("participant_a, participant_b")
    .eq("id", threadId)
    .single();

  if (threadError || !thread) {
    console.error("[sendMessageAction] thread fetch error:", threadError?.message);
    return { error: "Thread not found." };
  }

  const recipientId =
    thread.participant_a === user.id ? thread.participant_b : thread.participant_a;

  const { data: message, error: insertError } = await supabase
    .from("tidings_messages")
    .insert({
      thread_id: threadId,
      sender_id: user.id,
      recipient_id: recipientId,
      body: body.trim(),
    })
    .select()
    .single();

  if (insertError) {
    console.error("[sendMessageAction] insert error:", insertError.message, "| code:", insertError.code);
    return { error: insertError.message };
  }

  await supabase
    .from("tidings_threads")
    .update({
      last_message_preview: body.trim().slice(0, 120),
      last_message_at: message.created_at,
    })
    .eq("id", threadId);

  return { message: message as MessageData };
}

export async function startThreadAction(
  otherUserId: string
): Promise<{ threadId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Enforce participant_a < participant_b so the unique constraint works
  const [a, b] = [user.id, otherUserId].sort();

  const { data: existing } = await supabase
    .from("tidings_threads")
    .select("id")
    .eq("participant_a", a)
    .eq("participant_b", b)
    .maybeSingle();

  if (existing) return { threadId: existing.id };

  const { data: thread, error } = await supabase
    .from("tidings_threads")
    .insert({ participant_a: a, participant_b: b })
    .select("id")
    .single();

  if (error) {
    console.error("[startThreadAction] error:", error.message, "| code:", error.code);
    return { error: error.message };
  }

  revalidatePath("/tidings");
  return { threadId: thread.id };
}

export async function markThreadReadAction(threadId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from("tidings_messages")
    .update({ read: true })
    .eq("thread_id", threadId)
    .eq("recipient_id", user.id)
    .eq("read", false);

  revalidatePath("/tidings");
}
