import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EdUnit } from "@/types";
import type { CatalogCourse } from "@/lib/catalog/search";
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

  const [
    { data: edUnitsData },
    { count: unreadCount },
    { count: unreadTidingsCount },
    { count: pendingConnectionsCount },
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
  ]);

  const edUnits = (edUnitsData ?? []) as EdUnit[];
  const interests: string[] = Array.isArray(user.user_metadata?.interests)
    ? user.user_metadata.interests
    : [];

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
      unreadCount={unreadCount ?? 0}
      unreadTidingsCount={unreadTidingsCount ?? 0}
      pendingConnectionsCount={pendingConnectionsCount ?? 0}
    />
  );
}
