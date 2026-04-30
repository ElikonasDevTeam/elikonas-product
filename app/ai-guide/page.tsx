import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EdUnit } from "@/types";
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

  const [{ data: edUnits }, { count: unreadCount }] = await Promise.all([
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
  ]);

  return (
    <AiGuideView
      user={user}
      edUnits={(edUnits ?? []) as EdUnit[]}
      unreadCount={unreadCount ?? 0}
    />
  );
}
