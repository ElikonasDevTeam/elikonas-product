"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export interface ConversationSummary {
  id: string;
  title: string;
  updated_at: string;
}

export interface DbMessage {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
}

async function getUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}

export async function createConversationAction(): Promise<{ id?: string; error?: string }> {
  const { supabase, user } = await getUser();
  const { data, error } = await supabase
    .from("eli_conversations")
    .insert({ user_id: user.id })
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { id: data.id };
}

export async function saveMessageAction(
  conversationId: string,
  role: "user" | "assistant",
  content: string
): Promise<{ id?: string; error?: string }> {
  const { supabase, user } = await getUser();

  // Bump updated_at on the conversation
  await supabase
    .from("eli_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("user_id", user.id);

  const { data, error } = await supabase
    .from("eli_messages")
    .insert({ conversation_id: conversationId, role, content })
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { id: data.id };
}

export async function deleteConversationAction(
  conversationId: string
): Promise<{ error?: string }> {
  const { supabase, user } = await getUser();
  const { error } = await supabase
    .from("eli_conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  return {};
}

export async function updateConversationTitleAction(
  conversationId: string,
  title: string
): Promise<{ error?: string }> {
  const { supabase, user } = await getUser();
  const { error } = await supabase
    .from("eli_conversations")
    .update({ title: title.trim() || "New conversation" })
    .eq("id", conversationId)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  return {};
}

export async function fetchConversationMessagesAction(
  conversationId: string
): Promise<{ messages?: DbMessage[]; error?: string }> {
  const { supabase } = await getUser();
  const { data, error } = await supabase
    .from("eli_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) return { error: error.message };
  return { messages: (data ?? []) as DbMessage[] };
}
