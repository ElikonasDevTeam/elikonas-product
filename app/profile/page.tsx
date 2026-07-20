import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EdUnit } from "@/types";
import type { RIASECScores } from "@/types/onet";
import { ProfileView } from "./profile-view";

export const metadata: Metadata = {
  title: "My Profile — Elikonas",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    { data: edUnits },
    { count: unreadCount },
    { count: unreadTidingsCount },
    { count: pendingConnectionsCount },
    { data: latestAssessmentRow },
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
      .from("assessment_sessions")
      .select("id, riasec_scores, completed_at")
      .eq("user_id", user.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const latestAssessment = latestAssessmentRow?.riasec_scores
    ? {
        id: latestAssessmentRow.id as string,
        riasec_scores: latestAssessmentRow.riasec_scores as RIASECScores,
      }
    : null;

  return (
    <ProfileView
      user={user}
      edUnits={(edUnits ?? []) as EdUnit[]}
      unreadCount={unreadCount ?? 0}
      unreadTidingsCount={unreadTidingsCount ?? 0}
      pendingConnectionsCount={pendingConnectionsCount ?? 0}
      latestAssessment={latestAssessment}
    />
  );
}
