import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Credential, EdUnit } from "@/types";
import type { RIASECScores } from "@/types/onet";
import { ProfileView } from "./profile-view";

export const metadata: Metadata = {
  title: "My Profile — Elikonas",
  description: "Your Elikonas learning profile and record.",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.user_metadata?.onboarding_completed !== true) redirect("/onboarding");

  const [
    { data: edUnits },
    { count: unreadCount },
    { count: unreadTidingsCount },
    { count: pendingConnectionsCount },
    { data: latestAssessmentRow },
    { data: profileRow },
    { data: credentialRows },
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
      .select(
        "id, realistic_score, investigative_score, artistic_score, social_score, enterprising_score, conventional_score, completed_at"
      )
      .eq("user_id", user.id)
      .not("completed_at", "is", null)
      .not("realistic_score", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("profiles").select("slug").eq("id", user.id).maybeSingle(),
    supabase
      .from("credentials")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const credentials = (credentialRows ?? []) as Credential[];

  // Grouped by ed_unit_id and keyed as a plain object (not a Map) so it
  // passes cleanly as a prop to the client component below. Deliberately
  // does NOT generate signed URLs here — a signed URL generated at render
  // time and baked into the page would expire if the page sits open (or
  // gets served from cache) longer than its TTL. The badge links to
  // /api/credentials/[id]/file instead, which generates one fresh on
  // every click.
  const credentialsByEdUnit: Record<string, Credential[]> = {};
  for (const c of credentials) {
    (credentialsByEdUnit[c.ed_unit_id] ??= []).push(c);
  }

  const latestAssessment = latestAssessmentRow?.realistic_score != null
    ? {
        id: latestAssessmentRow.id as string,
        riasec_scores: {
          realistic:     latestAssessmentRow.realistic_score,
          investigative: latestAssessmentRow.investigative_score,
          artistic:      latestAssessmentRow.artistic_score,
          social:        latestAssessmentRow.social_score,
          enterprising:  latestAssessmentRow.enterprising_score,
          conventional:  latestAssessmentRow.conventional_score,
        } as RIASECScores,
      }
    : null;

  return (
    <ProfileView
      user={user}
      edUnits={(edUnits ?? []) as EdUnit[]}
      credentialsByEdUnit={credentialsByEdUnit}
      unreadCount={unreadCount ?? 0}
      unreadTidingsCount={unreadTidingsCount ?? 0}
      pendingConnectionsCount={pendingConnectionsCount ?? 0}
      latestAssessment={latestAssessment}
      profileSlug={profileRow?.slug ?? null}
    />
  );
}
