/*
  SQL MIGRATION — run in Supabase SQL editor.

  If you have NOT created the musings tables yet, run the full block:

    create table if not exists musings (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      author_name text not null,
      author_tagline text,
      hashtags text[] not null default '{}',
      body text not null,
      created_at timestamptz not null default now()
    );

    create table if not exists musing_likes (
      id uuid primary key default gen_random_uuid(),
      musing_id uuid not null references musings(id) on delete cascade,
      user_id uuid not null references auth.users(id) on delete cascade,
      created_at timestamptz not null default now(),
      unique(musing_id, user_id)
    );

    alter table musings enable row level security;
    alter table musing_likes enable row level security;

    create policy "Anyone authenticated can read musings"
      on musings for select to authenticated using (true);
    create policy "Users can insert their own musings"
      on musings for insert to authenticated with check (auth.uid() = user_id);
    create policy "Users can delete their own musings"
      on musings for delete to authenticated using (auth.uid() = user_id);

    create policy "Anyone authenticated can read likes"
      on musing_likes for select to authenticated using (true);
    create policy "Users can insert their own likes"
      on musing_likes for insert to authenticated with check (auth.uid() = user_id);
    create policy "Users can delete their own likes"
      on musing_likes for delete to authenticated using (auth.uid() = user_id);

  If the musings table ALREADY EXISTS from a prior migration, run just these alter statements:

    alter table musings drop column if exists topic;
    alter table musings add column if not exists hashtags text[] not null default '{}';
*/

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MusingsView, type MusingData } from "./musings-view";

export default async function MusingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const meta = user.user_metadata ?? {};
  const authorName: string = meta.full_name || user.email || "Learner";

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false);

  let musings: MusingData[] = [];
  try {
    const { data: rawMusings, error: musingsError } = await supabase
      .from("musings")
      .select("id, user_id, author_name, author_tagline, hashtags, body, created_at")
      .order("created_at", { ascending: false });

    if (musingsError) {
      console.error("[musings/page] fetch error:", musingsError.message, "| code:", musingsError.code);
    } else if (rawMusings && rawMusings.length > 0) {
      const musingIds = rawMusings.map((m) => m.id);

      const { data: likes, error: likesError } = await supabase
        .from("musing_likes")
        .select("musing_id, user_id")
        .in("musing_id", musingIds);

      if (likesError) {
        console.error("[musings/page] likes fetch error:", likesError.message);
      }

      const likeCountMap: Record<string, number> = {};
      const userLikedSet = new Set<string>();
      for (const like of likes ?? []) {
        likeCountMap[like.musing_id] = (likeCountMap[like.musing_id] ?? 0) + 1;
        if (like.user_id === user.id) userLikedSet.add(like.musing_id);
      }

      musings = rawMusings.map((m) => ({
        id: m.id,
        user_id: m.user_id,
        author_name: m.author_name,
        author_tagline: m.author_tagline ?? null,
        hashtags: Array.isArray(m.hashtags) ? m.hashtags : [],
        body: m.body,
        created_at: m.created_at,
        like_count: likeCountMap[m.id] ?? 0,
        is_liked: userLikedSet.has(m.id),
        comment_count: 0,
      }));
    }
  } catch (err) {
    console.error("[musings/page] unexpected error:", err);
  }

  return (
    <MusingsView
      initialMusings={musings}
      currentUserId={user.id}
      authorName={authorName}
      unreadCount={unreadCount ?? 0}
    />
  );
}
