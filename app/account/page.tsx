import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountView } from "./account-view";
import { DEFAULT_PRIVACY, type Plan, type PrivacySettings } from "./types";

export const metadata: Metadata = {
  title: "Account Settings — Elikonas",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; cancelled?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const meta = user.user_metadata ?? {};
  const currentUserName: string = meta.full_name || user.email || "Learner";

  // Derive plan from metadata — webhook sets this on checkout completion
  let plan: Plan = (meta.plan as Plan) ?? "free";
  // founding_member flag is the source of truth for lifetime access
  if (meta.founding_member === true) plan = "founding_member";

  const planRenewalDate: string | null = (meta.plan_renewal_date as string) ?? null;
  const planCanceling: boolean = meta.plan_canceling === true;
  const planCancelAt: string | null = (meta.plan_cancel_at as string) ?? null;

  const { success, cancelled } = await searchParams;

  const [
    { count: unreadCount },
    { count: unreadTidingsCount },
    { count: pendingConnectionsCount },
    { data: privacyData },
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
      .from("user_privacy_settings")
      .select(
        "show_interests, show_edunits_count, show_progress_pct, show_planned_units, show_learning_record"
      )
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const privacySettings: PrivacySettings = privacyData
    ? {
        show_interests: privacyData.show_interests,
        show_edunits_count: privacyData.show_edunits_count,
        show_progress_pct: privacyData.show_progress_pct,
        show_planned_units: privacyData.show_planned_units,
        show_learning_record: privacyData.show_learning_record,
      }
    : DEFAULT_PRIVACY;

  return (
    <AccountView
      currentUserName={currentUserName}
      privacySettings={privacySettings}
      plan={plan}
      planRenewalDate={planRenewalDate}
      planCanceling={planCanceling}
      planCancelAt={planCancelAt}
      showSuccessBanner={success === "true"}
      showCancelledBanner={cancelled === "true"}
      unreadCount={unreadCount ?? 0}
      unreadTidingsCount={unreadTidingsCount ?? 0}
      pendingConnectionsCount={pendingConnectionsCount ?? 0}
    />
  );
}
