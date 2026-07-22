/*
  SQL MIGRATION — run once in Supabase SQL editor.

  -- Allow authenticated users to view any user's learning record (for public profiles):
  -- (If you already have a self-only policy, drop it first)
  -- drop policy if exists "Users can view own ed_units" on ed_units;
  create policy "Authenticated users can view all ed_units"
    on ed_units for select to authenticated
    using (true);

  -- Optional: add founding_member to profiles so the badge shows on public profiles.
  -- After running the People migration that added the interests column:
  -- alter table profiles add column if not exists founding_member boolean not null default false;
  -- update profiles p set founding_member = coalesce(
  --   (select (raw_user_meta_data->>'founding_member')::boolean from auth.users where id = p.id),
  --   false
  -- );
*/

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { PublicProfileView, type ConnectionStatus } from "./public-profile-view";
import { DEFAULT_PRIVACY, type PrivacySettings } from "@/app/account/types";
import type { EdUnit } from "@/types";

export const metadata: Metadata = {
  title: "Profile — Elikonas",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: slugOrId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // This page must resolve for signed-out visitors too, but `profiles` RLS is
  // authenticated-only — read through the service-role client instead, hand-picking only
  // public-safe columns (never email/phone/country, which also live on this table).
  const admin = getAdminClient();

  const { data: bySlug } = await admin
    .from("profiles")
    .select("id, full_name, interests, slug")
    .eq("slug", slugOrId)
    .maybeSingle();

  let profileRow = bySlug;

  // Fall back to a raw-UUID lookup for links shared before slugs existed.
  if (!profileRow && UUID_RE.test(slugOrId)) {
    const { data: byId } = await admin
      .from("profiles")
      .select("id, full_name, interests, slug")
      .eq("id", slugOrId)
      .maybeSingle();
    if (byId) {
      if (byId.slug) redirect(`/profile/${byId.slug}`);
      profileRow = byId;
    }
  }

  if (!profileRow) redirect("/people");

  const profileId = profileRow.id;
  if (user && profileId === user.id) redirect("/profile");

  const [{ data: edUnitsData }, { data: privacyData }] = await Promise.all([
    admin
      .from("ed_units")
      .select("*")
      .eq("user_id", profileId)
      .order("created_at", { ascending: false }),
    admin
      .from("user_privacy_settings")
      .select(
        "show_interests, show_edunits_count, show_progress_pct, show_planned_units, show_learning_record"
      )
      .eq("user_id", profileId)
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

  const profile = {
    id: profileRow.id,
    full_name: profileRow.full_name ?? null,
    interests: Array.isArray(profileRow.interests) ? (profileRow.interests as string[]) : [],
  };
  const edUnits = (edUnitsData ?? []) as EdUnit[];

  if (!user) {
    return (
      <PublicProfileView
        profile={profile}
        edUnits={edUnits}
        privacySettings={privacySettings}
        viewer={{ signedIn: false }}
      />
    );
  }

  const meta = user.user_metadata ?? {};
  const currentUserName: string = meta.full_name || user.email || "Learner";

  const [
    { data: connData },
    { count: notifCount },
    { count: tidingsCount },
    { count: pendingConnCount },
  ] = await Promise.all([
    supabase
      .from("connections")
      .select("id, requester_id, addressee_id, status")
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${profileId}),and(requester_id.eq.${profileId},addressee_id.eq.${user.id})`
      )
      .maybeSingle(),
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

  let connectionStatus: ConnectionStatus = "none";
  let connectionId: string | null = null;

  if (connData) {
    connectionId = connData.id;
    if (connData.status === "accepted") {
      connectionStatus = "connected";
    } else if (connData.status === "pending") {
      connectionStatus =
        connData.requester_id === user.id ? "pending_outgoing" : "pending_incoming";
    }
  }

  return (
    <PublicProfileView
      profile={profile}
      edUnits={edUnits}
      privacySettings={privacySettings}
      viewer={{
        signedIn: true,
        currentUserName,
        unreadCount: notifCount ?? 0,
        unreadTidingsCount: tidingsCount ?? 0,
        pendingConnectionsCount: pendingConnCount ?? 0,
        connectionStatus,
        connectionId,
      }}
    />
  );
}
