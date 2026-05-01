/*
  SQL MIGRATION — run once in Supabase SQL editor:

  create table if not exists notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    type text not null check (
      type in ('new_like', 'new_comment', 'new_connection', 'connection_accepted', 'system')
    ),
    message text not null,
    read boolean not null default false,
    created_at timestamptz not null default now()
  );

  alter table notifications enable row level security;

  create policy "Users can read their own notifications"
    on notifications for select to authenticated using (auth.uid() = user_id);

  create policy "Users can update their own notifications"
    on notifications for update to authenticated using (auth.uid() = user_id);

  -- Inserts should be done by backend triggers or service role in production.
  -- For dev/testing, enable this temporarily:
  -- create policy "Users can insert their own notifications"
  --   on notifications for insert to authenticated with check (auth.uid() = user_id);

  -- Optional: to seed a test notification manually via SQL:
  -- insert into notifications (user_id, type, message)
  -- values ('<your-user-uuid>', 'system', 'Welcome to Elikonas! Your journey starts here.');
*/

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotificationsView, type NotificationData } from "./notifications-view";

export const metadata: Metadata = {
  title: "Notifications — Elikonas",
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const meta = user.user_metadata ?? {};
  const currentUserName: string = meta.full_name || user.email || "Learner";

  const [{ count: unreadTidingsCount }, { count: pendingConnectionsCount }] =
    await Promise.all([
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

  let notifications: NotificationData[] = [];
  let unreadCount = 0;

  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, message, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[notifications/page] fetch error:", error.message, "| code:", error.code);
    } else {
      notifications = (data ?? []) as NotificationData[];
      unreadCount = notifications.filter((n) => !n.read).length;
    }
  } catch (err) {
    console.error("[notifications/page] unexpected error:", err);
  }

  return (
    <NotificationsView
      initialNotifications={notifications}
      unreadCount={unreadCount}
      unreadTidingsCount={unreadTidingsCount ?? 0}
      pendingConnectionsCount={pendingConnectionsCount ?? 0}
      currentUserName={currentUserName}
    />
  );
}
