"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { GROUP_TOPICS } from "./constants";

function parseHashtags(text: string): string[] {
  const matches = text.match(/#[a-zA-Z]\w*/g) ?? [];
  return [...new Set(matches.map((t) => t.slice(1).toLowerCase()))];
}

export async function createGroupAction(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const topic = (formData.get("topic") as string)?.trim();
  const isPrivate = formData.get("is_private") === "true";

  if (!name || name.length < 3) return { error: "Group name must be at least 3 characters." };
  if (!description || description.length < 10) return { error: "Description must be at least 10 characters." };
  if (!GROUP_TOPICS.includes(topic as never)) return { error: "Please select a valid topic." };

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert({ name, description, topic, is_private: isPrivate, created_by: user.id, member_count: 1 })
    .select("id")
    .single();

  if (groupError) return { error: groupError.message };

  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id, role: "admin" });

  if (memberError) return { error: memberError.message };

  revalidatePath("/groups");
  return {};
}

export async function updateGroupAction(
  groupId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const topic = (formData.get("topic") as string)?.trim();
  const isPrivate = formData.get("is_private") === "true";

  if (!name || name.length < 3) return { error: "Group name must be at least 3 characters." };
  if (!description || description.length < 10) return { error: "Description must be at least 10 characters." };
  if (!GROUP_TOPICS.includes(topic as never)) return { error: "Please select a valid topic." };

  const { error } = await supabase
    .from("groups")
    .update({ name, description, topic, is_private: isPrivate, updated_at: new Date().toISOString() })
    .eq("id", groupId)
    .eq("created_by", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
  return {};
}

export async function deleteGroupAction(groupId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("groups")
    .delete()
    .eq("id", groupId)
    .eq("created_by", user.id);

  if (error) return { error: error.message };

  revalidatePath("/groups");
  redirect("/groups");
}

export async function joinGroupAction(groupId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("group_members")
    .insert({ group_id: groupId, user_id: user.id, role: "member" });

  if (error) return { error: error.message };

  await supabase.rpc("increment_group_member_count", { gid: groupId });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  return {};
}

export async function leaveGroupAction(groupId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  await supabase.rpc("decrement_group_member_count", { gid: groupId });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  return {};
}

export async function createGroupPostAction(
  groupId: string,
  body: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const trimmed = body.trim();
  if (trimmed.length < 5) return { error: "Post needs at least 5 characters." };

  const meta = user.user_metadata ?? {};
  const authorName: string = meta.full_name || user.email || "Member";
  const hashtags = parseHashtags(trimmed);

  const { error } = await supabase.from("group_posts").insert({
    group_id: groupId,
    user_id: user.id,
    author_name: authorName,
    body: trimmed,
    hashtags,
    like_count: 0,
  });

  if (error) return { error: error.message };

  revalidatePath(`/groups/${groupId}`);
  return {};
}

export async function deleteGroupPostAction(
  postId: string,
  groupId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("group_posts")
    .delete()
    .eq("id", postId);

  if (error) return { error: error.message };

  revalidatePath(`/groups/${groupId}`);
  return {};
}

export async function toggleGroupPostLikeAction(
  postId: string,
  groupId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.rpc("toggle_group_post_like", { p_post_id: postId });

  revalidatePath(`/groups/${groupId}`);
  return {};
}
