import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountView } from "./account-view";
import { DEFAULT_PRIVACY, type PrivacySettings } from "./actions";

export const metadata: Metadata = {
  title: "Account Settings — Elikonas",
};

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const meta = user.user_metadata ?? {};
  const currentUserName: string = meta.full_name || user.email || "Learner";

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
      unreadCount={unreadCount ?? 0}
      unreadTidingsCount={unreadTidingsCount ?? 0}
      pendingConnectionsCount={pendingConnectionsCount ?? 0}
    />
  );
}
