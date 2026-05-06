import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  GroupView,
  type GroupData,
  type GroupPostData,
  type GroupMemberInfo,
} from "./group-view";

export const metadata: Metadata = { title: "Group — Elikonas" };

export default async function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: groupId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const meta = user.user_metadata ?? {};
  const currentUserName: string = meta.full_name || user.email || "Learner";

  const [
    { data: groupData },
    { data: membership },
    { data: rawPosts },
    { data: memberRows },
    { count: totalMemberCount },
    { count: unreadCount },
    { count: unreadTidingsCount },
    { count: pendingConnectionsCount },
  ] = await Promise.all([
    supabase.from("groups").select("*").eq("id", groupId).maybeSingle(),
    supabase
      .from("group_members")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("group_posts")
      .select("id, user_id, author_name, body, hashtags, like_count, created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false }),
    supabase
      .from("group_members")
      .select("user_id, role, joined_at")
      .eq("group_id", groupId)
      .order("joined_at", { ascending: true })
      .limit(10),
    supabase
      .from("group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId),
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

  if (!groupData) redirect("/groups");

  // Fetch profile names for visible members
  const memberUserIds = (memberRows ?? []).map((m) => m.user_id);
  const { data: memberProfiles } =
    memberUserIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", memberUserIds)
      : { data: [] };
  const profileMap = new Map((memberProfiles ?? []).map((p) => [p.id, p.full_name]));

  // Fetch current user's likes
  const postIds = (rawPosts ?? []).map((p) => p.id);
  const { data: myLikes } =
    postIds.length > 0
      ? await supabase
          .from("group_post_likes")
          .select("post_id")
          .eq("user_id", user.id)
          .in("post_id", postIds)
      : { data: [] };
  const likedSet = new Set((myLikes ?? []).map((l) => l.post_id));

  const group: GroupData = {
    id: groupData.id,
    name: groupData.name,
    description: groupData.description,
    topic: groupData.topic,
    is_private: groupData.is_private,
    created_by: groupData.created_by,
    member_count: totalMemberCount ?? groupData.member_count,
  };

  const posts: GroupPostData[] = (rawPosts ?? []).map((p) => ({
    id: p.id,
    user_id: p.user_id,
    author_name: p.author_name,
    body: p.body,
    hashtags: p.hashtags as string[],
    like_count: p.like_count,
    created_at: p.created_at,
    is_liked: likedSet.has(p.id),
  }));

  const members: GroupMemberInfo[] = (memberRows ?? []).map((m) => ({
    user_id: m.user_id,
    role: m.role as "member" | "admin",
    joined_at: m.joined_at,
    full_name: profileMap.get(m.user_id) ?? "Member",
  }));

  const isMember = !!membership;
  const isAdmin = membership?.role === "admin";
  const isCreator = groupData.created_by === user.id;

  return (
    <GroupView
      group={group}
      posts={posts}
      members={members}
      isMember={isMember}
      isAdmin={isAdmin || isCreator}
      currentUserId={user.id}
      currentUserName={currentUserName}
      unreadCount={unreadCount ?? 0}
      unreadTidingsCount={unreadTidingsCount ?? 0}
      pendingConnectionsCount={pendingConnectionsCount ?? 0}
    />
  );
}
