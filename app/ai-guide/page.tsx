import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EdUnit } from "@/types";
import type { CatalogCourse } from "@/lib/catalog/search";
import type { ConversationSummary, DbMessage } from "./conversation-actions";
import { AiGuideView } from "./ai-guide-view";

export const metadata: Metadata = {
  title: "AI Guide — Elikonas",
};

export default async function AiGuidePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const interests: string[] = Array.isArray(user.user_metadata?.interests)
    ? user.user_metadata.interests
    : [];

  const [
    { data: edUnitsData },
    { count: unreadCount },
    { count: unreadTidingsCount },
    { count: pendingConnectionsCount },
    { data: convData },
  ] = await Promise.all([
    supabase
      .from("ed_units")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false),
    supabase
      .from("tidings_messages")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("read", false),
    supabase
      .from("connections")
      .select("*", { count: "exact", head: true })
      .eq("addressee_id", user.id)
      .eq("status", "pending"),
    supabase
      .from("eli_conversations")
      .select("id, title, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50),
  ]);

  const edUnits = (edUnitsData ?? []) as EdUnit[];
  const initialConversations = (convData ?? []) as ConversationSummary[];
  const initialConversationId = initialConversations[0]?.id ?? null;

  // Fetch messages for most recent conversation
  let initialMessages: DbMessage[] = [];
  if (initialConversationId) {
    const { data: msgData } = await supabase
      .from("eli_messages")
      .select("*")
      .eq("conversation_id", initialConversationId)
      .order("created_at", { ascending: true });
    initialMessages = (msgData ?? []) as DbMessage[];
  }

  // Suggestion cards for users with empty learning records
  let catalogSuggestions: CatalogCourse[] = [];
  if (edUnits.length === 0) {
    let q = supabase
      .from("ed_units_catalog")
      .select("id,title,provider,topic,format,duration_estimate,cost,url,description")
      .eq("is_active", true);
    if (interests.length > 0) q = q.in("topic", interests);
    const { data } = await q.limit(4);
    catalogSuggestions = (data ?? []) as CatalogCourse[];
  }

  return (
    <AiGuideView
      user={user}
      edUnits={edUnits}
      suggestions={catalogSuggestions}
      initialConversations={initialConversations}
      initialConversationId={initialConversationId}
      initialMessages={initialMessages}
      unreadCount={unreadCount ?? 0}
      unreadTidingsCount={unreadTidingsCount ?? 0}
      pendingConnectionsCount={pendingConnectionsCount ?? 0}
    />
  );
}
