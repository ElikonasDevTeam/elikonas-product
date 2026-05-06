"use client";

import { useState, useTransition, useOptimistic } from "react";
import Link from "next/link";
import { NavUserMenu } from "@/app/components/nav-user-menu";
import {
  joinGroupAction,
  leaveGroupAction,
  createGroupPostAction,
  deleteGroupPostAction,
  toggleGroupPostLikeAction,
  updateGroupAction,
  deleteGroupAction,
} from "../actions";
import { GROUP_TOPICS } from "../constants";

export interface GroupData {
  id: string;
  name: string;
  description: string;
  topic: string;
  is_private: boolean;
  created_by: string;
  member_count: number;
}

export interface GroupPostData {
  id: string;
  user_id: string;
  author_name: string;
  body: string;
  hashtags: string[];
  like_count: number;
  created_at: string;
  is_liked: boolean;
}

export interface GroupMemberInfo {
  user_id: string;
  role: "member" | "admin";
  joined_at: string;
  full_name: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const cls =
    size === "lg"
      ? "h-12 w-12 text-base"
      : size === "sm"
      ? "h-7 w-7 text-[11px]"
      : "h-9 w-9 text-sm";
  return (
    <div className={`${cls} shrink-0 flex items-center justify-center rounded-full bg-[#084c61] font-bold text-[#ffc857]`}>
      {initials(name)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit Group Modal
// ---------------------------------------------------------------------------

function EditGroupModal({
  group,
  onClose,
}: {
  group: GroupData;
  onClose: () => void;
}) {
  const [isPrivate, setIsPrivate] = useState(group.is_private);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("is_private", String(isPrivate));
    startTransition(async () => {
      const result = await updateGroupAction(group.id, fd);
      if (result.error) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-[#323031]">Edit group</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#323031]">Group name</label>
            <input
              name="name"
              required
              defaultValue={group.name}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#177e89] focus:ring-1 focus:ring-[#177e89]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#323031]">Description</label>
            <textarea
              name="description"
              required
              rows={3}
              defaultValue={group.description}
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#177e89] focus:ring-1 focus:ring-[#177e89]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#323031]">Topic</label>
            <select
              name="topic"
              required
              defaultValue={group.topic}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#177e89] focus:ring-1 focus:ring-[#177e89]"
            >
              {GROUP_TOPICS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[#323031]">{isPrivate ? "Private" : "Public"}</p>
              <p className="text-xs text-[#323031]/50">
                {isPrivate ? "Invite only" : "Anyone can join"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPrivate((v) => !v)}
              role="switch"
              aria-checked={isPrivate}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${isPrivate ? "bg-[#084c61]" : "bg-gray-200"}`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isPrivate ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </div>
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-[#323031]/60 hover:bg-gray-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-[#084c61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#177e89]">Save changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete Confirm Modal
// ---------------------------------------------------------------------------

function DeleteGroupModal({ groupId, onClose }: { groupId: string; onClose: () => void }) {
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteGroupAction(groupId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-[#323031]">Delete group?</h2>
        <p className="mt-2 text-sm text-[#323031]/60">
          This will permanently delete the group, all posts, and remove all members. This cannot be undone.
        </p>
        {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-[#323031]/60 hover:bg-gray-50">Cancel</button>
          <button onClick={handleDelete} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">Delete group</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Post card
// ---------------------------------------------------------------------------

function PostCard({
  post,
  groupId,
  currentUserId,
  isAdmin,
}: {
  post: GroupPostData;
  groupId: string;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [optimisticLiked, setOptimisticLiked] = useOptimistic(post.is_liked);
  const [optimisticCount, setOptimisticCount] = useOptimistic(post.like_count);
  const [, startTransition] = useTransition();
  const [deleted, setDeleted] = useState(false);

  function handleLike() {
    const next = !optimisticLiked;
    startTransition(async () => {
      setOptimisticLiked(next);
      setOptimisticCount((c) => c + (next ? 1 : -1));
      await toggleGroupPostLikeAction(post.id, groupId);
    });
  }

  function handleDelete() {
    if (!confirm("Delete this post?")) return;
    startTransition(async () => {
      const result = await deleteGroupPostAction(post.id, groupId);
      if (!result.error) setDeleted(true);
    });
  }

  if (deleted) return null;

  return (
    <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
      <div className="flex gap-3">
        <Avatar name={post.author_name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-sm font-semibold text-[#323031]">{post.author_name}</span>
              <span className="ml-2 text-xs text-[#323031]/40">{relativeTime(post.created_at)}</span>
            </div>
            {(post.user_id === currentUserId || isAdmin) && (
              <button
                onClick={handleDelete}
                className="shrink-0 text-xs text-[#323031]/30 hover:text-rose-500"
              >
                ✕
              </button>
            )}
          </div>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-[#323031]/80">{post.body}</p>
          {post.hashtags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {post.hashtags.map((tag) => (
                <span key={tag} className="rounded-full bg-[#177e89]/10 px-2 py-0.5 text-[11px] font-medium text-[#177e89]">
                  #{tag}
                </span>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center gap-4">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                optimisticLiked ? "text-[#177e89]" : "text-[#323031]/40 hover:text-[#177e89]"
              }`}
            >
              <span>{optimisticLiked ? "♥" : "♡"}</span>
              <span>{optimisticCount}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compose box
// ---------------------------------------------------------------------------

function ComposeBox({ groupId }: { groupId: string }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = body.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const result = await createGroupPostAction(groupId, trimmed);
      if (result.error) {
        setError(result.error);
      } else {
        setBody("");
      }
    });
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <form onSubmit={handleSubmit}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Share something with the group… (use #hashtags)"
          className="w-full resize-none text-sm text-[#323031] placeholder-gray-400 outline-none"
        />
        {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
        <div className="mt-3 flex justify-end border-t border-gray-100 pt-3">
          <button
            type="submit"
            disabled={!body.trim()}
            className="rounded-lg bg-[#084c61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#177e89] disabled:opacity-40"
          >
            Post
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Member list sidebar card
// ---------------------------------------------------------------------------

function MemberListCard({
  members,
  groupId,
}: {
  members: GroupMemberInfo[];
  groupId: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-[#323031]">Members</h3>
      <ul className="space-y-2.5">
        {members.map((m) => (
          <li key={m.user_id} className="flex items-center gap-2.5">
            <Avatar name={m.full_name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#323031]">{m.full_name}</p>
              {m.role === "admin" && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#177e89]">Admin</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Group header
// ---------------------------------------------------------------------------

function GroupHeader({
  group,
  isMember,
  isAdmin,
  onEdit,
  onDelete,
}: {
  group: GroupData;
  isMember: boolean;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [joined, setJoined] = useState(isMember);
  const [, startTransition] = useTransition();

  function handleJoin() {
    setJoined(true);
    startTransition(async () => {
      const result = await joinGroupAction(group.id);
      if (result.error) setJoined(false);
    });
  }

  function handleLeave() {
    if (isAdmin) return;
    setJoined(false);
    startTransition(async () => {
      const result = await leaveGroupAction(group.id);
      if (result.error) setJoined(true);
    });
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-[#323031]">{group.name}</h1>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${group.is_private ? "bg-gray-100 text-gray-500" : "bg-emerald-50 text-emerald-700"}`}>
              {group.is_private ? "🔒 Private" : "🌐 Public"}
            </span>
          </div>
          <p className="mt-2 text-sm text-[#323031]/60">{group.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-[#084c61]/8 px-2.5 py-0.5 text-xs font-medium text-[#084c61]">
              {group.topic}
            </span>
            <span className="text-xs text-[#323031]/40">
              {group.member_count} {group.member_count === 1 ? "member" : "members"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button
                onClick={onEdit}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-[#323031]/60 hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                onClick={onDelete}
                className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
              >
                Delete
              </button>
            </>
          )}
          {joined ? (
            !isAdmin && (
              <button
                onClick={handleLeave}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-[#323031]/50 hover:bg-gray-50"
              >
                Leave group
              </button>
            )
          ) : group.is_private ? (
            <span className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-[#323031]/40">
              Private — invite only
            </span>
          ) : (
            <button
              onClick={handleJoin}
              className="rounded-lg bg-[#177e89] px-4 py-2 text-sm font-semibold text-white hover:bg-[#084c61]"
            >
              Join group
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function GroupView({
  group,
  posts,
  members,
  isMember,
  isAdmin,
  currentUserId,
  currentUserName,
  unreadCount,
  unreadTidingsCount,
  pendingConnectionsCount,
}: {
  group: GroupData;
  posts: GroupPostData[];
  members: GroupMemberInfo[];
  isMember: boolean;
  isAdmin: boolean;
  currentUserId: string;
  currentUserName: string;
  unreadCount: number;
  unreadTidingsCount: number;
  pendingConnectionsCount: number;
}) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const isLockedOut = group.is_private && !isMember;

  return (
    <div className="min-h-screen bg-gray-50">
      {showEditModal && (
        <EditGroupModal group={group} onClose={() => setShowEditModal(false)} />
      )}
      {showDeleteModal && (
        <DeleteGroupModal groupId={group.id} onClose={() => setShowDeleteModal(false)} />
      )}

      {/* Nav */}
      <nav className="bg-[#084c61] px-6 py-0">
        <div className="mx-auto flex max-w-4xl items-center gap-8">
          <img src="/images/logo-white.svg" alt="Elikonas" className="h-8 w-auto py-3" />
          <div className="flex items-end gap-1">
            <Link href="/profile" className="px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80">My Profile</Link>
            <Link href="/ai-guide" className="px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80">AI Guide</Link>
            <Link href="/musings" className="px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80">Community</Link>
            <Link href="/groups" className="px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80">Groups</Link>
            <Link href="/tidings" className="relative px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80">
              ✉ Tidings
              {unreadTidingsCount > 0 && (
                <span className="absolute right-0.5 top-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#177e89] px-1 text-[10px] font-bold text-white">
                  {unreadTidingsCount > 99 ? "99+" : unreadTidingsCount}
                </span>
              )}
            </Link>
            <Link href="/notifications" className="relative px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80">
              Notifications
              {unreadCount > 0 && (
                <span className="absolute right-0.5 top-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
            <Link href="/people" className="relative px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80">
              People
              {pendingConnectionsCount > 0 && (
                <span className="absolute right-0.5 top-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                  {pendingConnectionsCount > 99 ? "99+" : pendingConnectionsCount}
                </span>
              )}
            </Link>
          </div>
          <NavUserMenu userName={currentUserName} />
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Breadcrumb */}
        <p className="mb-4 text-sm text-[#323031]/40">
          <Link href="/groups" className="hover:text-[#084c61] hover:underline">Groups</Link>
          {" / "}
          <span className="text-[#323031]/60">{group.name}</span>
        </p>

        {/* Group header */}
        <div className="mb-6">
          <GroupHeader
            group={group}
            isMember={isMember}
            isAdmin={isAdmin}
            onEdit={() => setShowEditModal(true)}
            onDelete={() => setShowDeleteModal(true)}
          />
        </div>

        {/* Locked state */}
        {isLockedOut ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
            <p className="text-3xl">🔒</p>
            <p className="mt-3 font-semibold text-[#323031]">Private group</p>
            <p className="mt-1 text-sm text-[#323031]/50">
              This group is invite only. Ask a member to add you.
            </p>
          </div>
        ) : (
          /* Two-column layout */
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {/* Main — feed */}
            <div className="flex-1 space-y-4">
              {isMember && <ComposeBox groupId={group.id} />}

              {posts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center">
                  <p className="text-sm text-[#323031]/40">No posts yet. Start the conversation!</p>
                </div>
              ) : (
                posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    groupId={group.id}
                    currentUserId={currentUserId}
                    isAdmin={isAdmin}
                  />
                ))
              )}
            </div>

            {/* Sidebar */}
            <div className="w-full space-y-4 lg:w-72 lg:shrink-0">
              <MemberListCard members={members} groupId={group.id} />
              {/* Group info card */}
              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-[#323031]">About this group</h3>
                <dl className="space-y-2 text-xs text-[#323031]/60">
                  <div className="flex justify-between">
                    <dt>Topic</dt>
                    <dd className="font-medium text-[#323031]">{group.topic}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Visibility</dt>
                    <dd className="font-medium text-[#323031]">{group.is_private ? "Private" : "Public"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Members</dt>
                    <dd className="font-medium text-[#323031]">{group.member_count}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
