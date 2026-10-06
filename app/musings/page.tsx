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

  const [
    { count: unreadCount },
    { count: unreadTidingsCount },
    { count: pendingConnectionsCount },
    { data: ownProfile },
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
    supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle(),
  ]);

  let musings: MusingData[] = [];
  try {
    const { data: rawMusings, error: musingsError } = await supabase
      .from("musings")
      .select("id, user_id, author_name, author_tagline, hashtags, body, visibility, created_at")
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

      // musings.author_name is denormalized onto the row — avatar_url isn't,
      // so it's fetched here the same way as every other multi-user surface:
      // two separate .in() queries (no FK between profiles and
      // user_privacy_settings) merged in application code. Own musings
      // always show the photo regardless of the flag.
      const authorIds = [...new Set(rawMusings.map((m) => m.user_id))];
      const [{ data: authorProfiles }, { data: authorPrivacy }] = await Promise.all([
        supabase.from("profiles").select("id, avatar_url").in("id", authorIds),
        supabase.from("user_privacy_settings").select("user_id, show_profile_photo").in("user_id", authorIds),
      ]);
      const showPhotoMap = Object.fromEntries(
        (authorPrivacy ?? []).map((p) => [p.user_id, p.show_profile_photo])
      );
      const avatarMap = Object.fromEntries(
        (authorProfiles ?? []).map((p) => [p.id, p.avatar_url as string | null])
      );
      const currentUserId = user.id;
      function authorAvatarUrl(authorId: string): string | null {
        if (authorId === currentUserId) return avatarMap[authorId] ?? null;
        return showPhotoMap[authorId] ? avatarMap[authorId] ?? null : null;
      }

      musings = rawMusings.map((m) => ({
        id: m.id,
        user_id: m.user_id,
        author_name: m.author_name,
        author_avatar_url: authorAvatarUrl(m.user_id),
        author_tagline: m.author_tagline ?? null,
        hashtags: Array.isArray(m.hashtags) ? m.hashtags : [],
        body: m.body,
        visibility: (m.visibility === "public" ? "public" : "inner_circle") as "public" | "inner_circle",
        created_at: m.created_at,
        like_count: likeCountMap[m.id] ?? 0,
        is_liked: userLikedSet.has(m.id),
        comment_count: 0,
      }));
    }
  } catch (err) {
    console.error("[musings/page] unexpected error:", err);
  }

  // Compute top 10 hashtags by frequency across all fetched musings.
  // SQL equivalent: SELECT unnest(hashtags) tag, count(*) FROM musings GROUP BY tag ORDER BY count DESC LIMIT 10
  const tagCounts = new Map<string, number>();
  for (const m of musings) {
    for (const tag of m.hashtags) {
      if (tag) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const topHashtags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag);

  return (
    <MusingsView
      initialMusings={musings}
      currentUserId={user.id}
      authorName={authorName}
      authorAvatarUrl={ownProfile?.avatar_url ?? null}
      unreadCount={unreadCount ?? 0}
      unreadTidingsCount={unreadTidingsCount ?? 0}
      pendingConnectionsCount={pendingConnectionsCount ?? 0}
      topHashtags={topHashtags}
    />
  );
}
