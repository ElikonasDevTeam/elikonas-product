/*
  SQL MIGRATION — run once in Supabase SQL editor.

  -- Tables
  create table groups (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text not null,
    topic text not null,
    is_private boolean not null default false,
    created_by uuid not null references auth.users(id) on delete cascade,
    member_count integer not null default 1,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create table group_members (
    id uuid primary key default gen_random_uuid(),
    group_id uuid not null references groups(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null default 'member' check (role in ('member','admin')),
    joined_at timestamptz not null default now(),
    unique(group_id, user_id)
  );

  create table group_posts (
    id uuid primary key default gen_random_uuid(),
    group_id uuid not null references groups(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    author_name text not null,
    body text not null,
    hashtags text[] not null default '{}',
    like_count integer not null default 0,
    created_at timestamptz not null default now()
  );

  create table group_post_likes (
    id uuid primary key default gen_random_uuid(),
    post_id uuid not null references group_posts(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    unique(post_id, user_id)
  );

  -- RLS
  alter table groups enable row level security;
  alter table group_members enable row level security;
  alter table group_posts enable row level security;
  alter table group_post_likes enable row level security;

  create policy "Authenticated users can view accessible groups"
    on groups for select to authenticated
    using (
      not is_private
      or created_by = auth.uid()
      or exists (select 1 from group_members where group_id = groups.id and user_id = auth.uid())
    );
  create policy "Authenticated users can create groups"
    on groups for insert to authenticated with check (auth.uid() = created_by);
  create policy "Only creator can update groups"
    on groups for update to authenticated using (auth.uid() = created_by);
  create policy "Only creator can delete groups"
    on groups for delete to authenticated using (auth.uid() = created_by);

  create policy "Anyone authenticated can view memberships"
    on group_members for select to authenticated using (true);
  create policy "Users can join public groups or own created groups"
    on group_members for insert to authenticated
    with check (
      auth.uid() = user_id and (
        exists (select 1 from groups where id = group_id and not is_private)
        or exists (select 1 from groups where id = group_id and created_by = auth.uid())
      )
    );
  create policy "Members can leave; creators can remove members"
    on group_members for delete to authenticated
    using (
      auth.uid() = user_id
      or exists (select 1 from groups where id = group_id and created_by = auth.uid())
    );

  create policy "Members can view posts in their groups (public groups open to all)"
    on group_posts for select to authenticated
    using (
      exists (select 1 from groups g where g.id = group_id and not g.is_private)
      or exists (select 1 from group_members gm where gm.group_id = group_posts.group_id and gm.user_id = auth.uid())
    );
  create policy "Members can post"
    on group_posts for insert to authenticated
    with check (
      auth.uid() = user_id
      and exists (select 1 from group_members gm where gm.group_id = group_posts.group_id and gm.user_id = auth.uid())
    );
  create policy "Author or group creator can delete posts"
    on group_posts for delete to authenticated
    using (
      auth.uid() = user_id
      or exists (select 1 from groups where id = group_id and created_by = auth.uid())
    );

  create policy "Anyone authenticated can view likes"
    on group_post_likes for select to authenticated using (true);
  create policy "Users can like posts in groups they belong to"
    on group_post_likes for insert to authenticated
    with check (auth.uid() = user_id);
  create policy "Users can remove their own likes"
    on group_post_likes for delete to authenticated using (auth.uid() = user_id);

  -- Helper functions
  create or replace function increment_group_member_count(gid uuid)
  returns void language sql security definer as $$
    update groups set member_count = member_count + 1 where id = gid;
  $$;
  grant execute on function increment_group_member_count(uuid) to authenticated;

  create or replace function decrement_group_member_count(gid uuid)
  returns void language sql security definer as $$
    update groups set member_count = greatest(0, member_count - 1) where id = gid;
  $$;
  grant execute on function decrement_group_member_count(uuid) to authenticated;

  create or replace function toggle_group_post_like(p_post_id uuid)
  returns boolean language plpgsql security definer as $$
  declare
    already_liked boolean;
    p_user_id uuid := auth.uid();
  begin
    select exists(
      select 1 from group_post_likes where post_id = p_post_id and user_id = p_user_id
    ) into already_liked;
    if already_liked then
      delete from group_post_likes where post_id = p_post_id and user_id = p_user_id;
      update group_posts set like_count = greatest(0, like_count - 1) where id = p_post_id;
      return false;
    else
      insert into group_post_likes (post_id, user_id) values (p_post_id, p_user_id);
      update group_posts set like_count = like_count + 1 where id = p_post_id;
      return true;
    end if;
  end;
  $$;
  grant execute on function toggle_group_post_like(uuid) to authenticated;
*/

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GroupsView, type GroupData, type MyMembership } from "./groups-view";

export const metadata: Metadata = { title: "Groups — Elikonas" };

export default async function GroupsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const meta = user.user_metadata ?? {};
  const currentUserName: string = meta.full_name || user.email || "Learner";

  const [
    { data: allGroups },
    { data: myMemberships },
    { count: unreadCount },
    { count: unreadTidingsCount },
    { count: pendingConnectionsCount },
  ] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, description, topic, is_private, created_by, member_count, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("group_members")
      .select("group_id, role")
      .eq("user_id", user.id),
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

  const membershipMap = new Map(
    (myMemberships ?? []).map((m) => [m.group_id, m.role as "member" | "admin"])
  );

  const groups: GroupData[] = (allGroups ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    topic: g.topic,
    is_private: g.is_private,
    created_by: g.created_by,
    member_count: g.member_count,
    created_at: g.created_at,
  }));

  const memberships: MyMembership[] = (myMemberships ?? []).map((m) => ({
    group_id: m.group_id,
    role: m.role as "member" | "admin",
  }));

  return (
    <GroupsView
      groups={groups}
      memberships={memberships}
      currentUserId={user.id}
      currentUserName={currentUserName}
      unreadCount={unreadCount ?? 0}
      unreadTidingsCount={unreadTidingsCount ?? 0}
      pendingConnectionsCount={pendingConnectionsCount ?? 0}
    />
  );
}
