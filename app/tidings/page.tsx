/*
  SQL MIGRATION — run once in Supabase SQL editor.

  ── 1. Profiles table (for user search) ─────────────────────────────────────

  create table if not exists profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text,
    email text,
    updated_at timestamptz not null default now()
  );

  alter table profiles enable row level security;

  create policy "Authenticated users can read profiles"
    on profiles for select to authenticated using (true);

  -- Trigger: sync full_name + email from auth.users on sign-up or metadata update
  create or replace function sync_profile_from_auth()
  returns trigger as $$
  begin
    insert into profiles (id, full_name, email)
    values (
      new.id,
      new.raw_user_meta_data->>'full_name',
      new.email
    )
    on conflict (id) do update set
      full_name = excluded.full_name,
      email     = excluded.email,
      updated_at = now();
    return new;
  end;
  $$ language plpgsql security definer;

  create or replace trigger on_auth_user_change
    after insert or update on auth.users
    for each row execute procedure sync_profile_from_auth();

  -- Backfill existing users
  insert into profiles (id, full_name, email)
  select id, raw_user_meta_data->>'full_name', email
  from auth.users
  on conflict (id) do update set
    full_name  = excluded.full_name,
    email      = excluded.email,
    updated_at = now();


  ── 2. Tidings threads ───────────────────────────────────────────────────────

  create table if not exists tidings_threads (
    id              uuid primary key default gen_random_uuid(),
    participant_a   uuid not null references auth.users(id) on delete cascade,
    participant_b   uuid not null references auth.users(id) on delete cascade,
    last_message_preview  text,
    last_message_at       timestamptz,
    created_at      timestamptz not null default now(),
    -- participant_a is always the lexicographically smaller UUID
    constraint participant_order check (participant_a < participant_b),
    unique(participant_a, participant_b)
  );

  alter table tidings_threads enable row level security;

  create policy "Participants can read their threads"
    on tidings_threads for select to authenticated
    using (auth.uid() = participant_a or auth.uid() = participant_b);

  create policy "Authenticated users can create threads"
    on tidings_threads for insert to authenticated
    with check (auth.uid() = participant_a or auth.uid() = participant_b);


  ── 3. Tidings messages ──────────────────────────────────────────────────────

  create table if not exists tidings_messages (
    id           uuid primary key default gen_random_uuid(),
    thread_id    uuid not null references tidings_threads(id) on delete cascade,
    sender_id    uuid not null references auth.users(id) on delete cascade,
    recipient_id uuid not null references auth.users(id) on delete cascade,
    body         text not null,
    read         boolean not null default false,
    created_at   timestamptz not null default now()
  );

  alter table tidings_messages enable row level security;

  create policy "Participants can read messages"
    on tidings_messages for select to authenticated
    using (auth.uid() = sender_id or auth.uid() = recipient_id);

  create policy "Users can send messages"
    on tidings_messages for insert to authenticated
    with check (auth.uid() = sender_id);

  create policy "Recipients can mark messages as read"
    on tidings_messages for update to authenticated
    using (auth.uid() = recipient_id);

  -- Enable Realtime (also enable the table in Supabase dashboard → Database → Replication)
  alter publication supabase_realtime add table tidings_messages;
*/

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TidingsView, type ThreadData } from "./tidings-view";

export const metadata: Metadata = {
  title: "✉ Tidings — Elikonas",
};

export default async function TidingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const meta = user.user_metadata ?? {};
  const currentUserName: string = meta.full_name || user.email || "Learner";

  let threads: ThreadData[] = [];
  let unreadNotificationsCount = 0;
  let pendingConnectionsCount = 0;

  try {
    const [
      { data: rawThreads, error: threadsError },
      { data: unreadMsgs },
      { count: notifCount },
      { count: pendingConnCount },
    ] = await Promise.all([
      supabase
        .from("tidings_threads")
        .select("id, participant_a, participant_b, last_message_preview, last_message_at")
        .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
        .order("last_message_at", { ascending: false }),
      supabase
        .from("tidings_messages")
        .select("thread_id")
        .eq("recipient_id", user.id)
        .eq("read", false),
      supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false),
      supabase
        .from("connections")
        .select("*", { count: "exact", head: true })
        .eq("addressee_id", user.id)
        .eq("status", "pending"),
    ]);

    if (threadsError) {
      console.error("[tidings/page] threads error:", threadsError.message);
    }

    unreadNotificationsCount = notifCount ?? 0;
    pendingConnectionsCount = pendingConnCount ?? 0;

    if (rawThreads && rawThreads.length > 0) {
      const otherIds = rawThreads.map((t) =>
        t.participant_a === user.id ? t.participant_b : t.participant_a
      );

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", otherIds);

      const profileMap = Object.fromEntries(
        (profilesData ?? []).map((p) => [p.id, p.full_name ?? "Unknown"])
      );

      const unreadMap: Record<string, number> = {};
      for (const m of unreadMsgs ?? []) {
        unreadMap[m.thread_id] = (unreadMap[m.thread_id] ?? 0) + 1;
      }

      threads = rawThreads.map((t) => {
        const otherId =
          t.participant_a === user.id ? t.participant_b : t.participant_a;
        return {
          id: t.id,
          other_user_id: otherId,
          other_user_name: profileMap[otherId] ?? "Unknown",
          last_message_preview: t.last_message_preview ?? null,
          last_message_at: t.last_message_at ?? null,
          unread_count: unreadMap[t.id] ?? 0,
        };
      });
    }
  } catch (err) {
    console.error("[tidings/page] unexpected error:", err);
  }

  return (
    <TidingsView
      initialThreads={threads}
      currentUserId={user.id}
      currentUserName={currentUserName}
      unreadNotificationsCount={unreadNotificationsCount}
      pendingConnectionsCount={pendingConnectionsCount}
    />
  );
}
