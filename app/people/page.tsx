/*
  SQL MIGRATION — run once in Supabase SQL editor.

  ── 1. Add interests column to profiles ──────────────────────────────────────

  alter table profiles add column if not exists interests text[] not null default '{}';


  ── 2. connections table ──────────────────────────────────────────────────────

  create table if not exists connections (
    id              uuid primary key default gen_random_uuid(),
    requester_id    uuid not null references auth.users(id) on delete cascade,
    addressee_id    uuid not null references auth.users(id) on delete cascade,
    status          text not null default 'pending'
                      check (status in ('pending', 'accepted', 'declined')),
    connection_type text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique(requester_id, addressee_id)
  );

  alter table connections enable row level security;

  create policy "Users can read their own connections"
    on connections for select to authenticated
    using (auth.uid() = requester_id or auth.uid() = addressee_id);

  create policy "Users can send connection requests"
    on connections for insert to authenticated
    with check (auth.uid() = requester_id);

  create policy "Addressees can update connection status"
    on connections for update to authenticated
    using (auth.uid() = addressee_id);
*/

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PeopleView, type ConnectionData, type IncomingRequestData } from "./people-view";

export const metadata: Metadata = {
  title: "People — Elikonas",
};

export default async function PeoplePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const meta = user.user_metadata ?? {};
  const currentUserName: string = meta.full_name || user.email || "Learner";

  let connections: ConnectionData[] = [];
  let incomingRequests: IncomingRequestData[] = [];
  let outgoingRequestUserIds: string[] = [];
  let unreadNotificationsCount = 0;
  let unreadTidingsCount = 0;

  try {
    const [
      { data: acceptedRaw },
      { data: incomingRaw },
      { data: outgoingRaw },
      { count: notifCount },
      { count: tidingsCount },
    ] = await Promise.all([
      supabase
        .from("connections")
        .select("id, requester_id, addressee_id, connection_type, created_at")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted")
        .order("created_at", { ascending: false }),
      supabase
        .from("connections")
        .select("id, requester_id, created_at")
        .eq("addressee_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("connections")
        .select("addressee_id")
        .eq("requester_id", user.id)
        .eq("status", "pending"),
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
    ]);

    unreadNotificationsCount = notifCount ?? 0;
    unreadTidingsCount = tidingsCount ?? 0;
    outgoingRequestUserIds = (outgoingRaw ?? []).map((c) => c.addressee_id);

    // Collect all other-user IDs we need profiles for
    const acceptedOtherIds = (acceptedRaw ?? []).map((c) =>
      c.requester_id === user.id ? c.addressee_id : c.requester_id
    );
    const incomingRequesterIds = (incomingRaw ?? []).map((c) => c.requester_id);
    const allProfileIds = [...new Set([...acceptedOtherIds, ...incomingRequesterIds])];

    const { data: profilesData } =
      allProfileIds.length > 0
        ? await supabase
            .from("profiles")
            .select("id, full_name, interests")
            .in("id", allProfileIds)
        : { data: [] };

    const profileMap = Object.fromEntries(
      (profilesData ?? []).map((p) => [
        p.id,
        {
          name: p.full_name ?? "Unknown",
          interests: Array.isArray(p.interests) ? (p.interests as string[]) : [],
        },
      ])
    );

    connections = (acceptedRaw ?? []).map((c) => {
      const otherId =
        c.requester_id === user.id ? c.addressee_id : c.requester_id;
      const profile = profileMap[otherId] ?? { name: "Unknown", interests: [] };
      return {
        id: c.id,
        other_user_id: otherId,
        other_user_name: profile.name,
        interests: profile.interests,
        connection_type: (c.connection_type as string | null) ?? null,
        created_at: c.created_at,
      };
    });

    incomingRequests = (incomingRaw ?? []).map((c) => {
      const profile = profileMap[c.requester_id] ?? {
        name: "Unknown",
        interests: [],
      };
      return {
        id: c.id,
        requester_id: c.requester_id,
        requester_name: profile.name,
        interests: profile.interests,
        created_at: c.created_at,
      };
    });
  } catch (err) {
    console.error("[people/page] unexpected error:", err);
  }

  return (
    <PeopleView
      initialConnections={connections}
      incomingRequests={incomingRequests}
      outgoingRequestUserIds={outgoingRequestUserIds}
      currentUserId={user.id}
      currentUserName={currentUserName}
      unreadNotificationsCount={unreadNotificationsCount}
      unreadTidingsCount={unreadTidingsCount}
    />
  );
}
