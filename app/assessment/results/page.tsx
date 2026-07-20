import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOccupations } from "@/lib/onet/client";
import { ResultsView } from "./results-view";
import type { RIASECScores, ONetCareer } from "@/types/onet";
import type { Plan } from "@/app/account/types";

export const metadata: Metadata = {
  title: "Your Interest Profile — Elikonas",
};

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session: sessionId } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!sessionId) redirect("/assessment");

  const meta = user.user_metadata ?? {};
  const currentUserName: string = meta.full_name || user.email || "Learner";
  let plan: Plan = (meta.plan as Plan) ?? "free";
  if (meta.founding_member === true) plan = "founding_member";

  const [
    { count: unreadCount },
    { count: unreadTidingsCount },
    { count: pendingConnectionsCount },
    { data: sessionData },
  ] = await Promise.all([
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
      .select(
        "realistic_score, investigative_score, artistic_score, social_score, enterprising_score, conventional_score, completed_at"
      )
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single(),
  ]);

  if (sessionData?.realistic_score == null) redirect("/assessment");

  const scores: RIASECScores = {
    realistic:     sessionData.realistic_score,
    investigative: sessionData.investigative_score,
    artistic:      sessionData.artistic_score,
    social:        sessionData.social_score,
    enterprising:  sessionData.enterprising_score,
    conventional:  sessionData.conventional_score,
  };

  let careers: ONetCareer[] = [];
  try {
    const res = await getOccupations(scores);
    careers = res.career ?? [];
  } catch {
    // Non-fatal — show results without career suggestions
  }

  return (
    <ResultsView
      scores={scores}
      careers={careers}
      plan={plan}
      currentUserName={currentUserName}
      unreadCount={unreadCount ?? 0}
      unreadTidingsCount={unreadTidingsCount ?? 0}
      pendingConnectionsCount={pendingConnectionsCount ?? 0}
    />
  );
}
