"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { NavUserMenu } from "@/app/components/nav-user-menu";
import { createGroupAction, joinGroupAction, leaveGroupAction } from "./actions";
import { GROUP_TOPICS } from "./constants";

export interface GroupData {
  id: string;
  name: string;
  description: string;
  topic: string;
  is_private: boolean;
  created_by: string;
  member_count: number;
  created_at: string;
}

export interface MyMembership {
  group_id: string;
  role: "member" | "admin";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function TopicTag({ topic }: { topic: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#084c61]/8 px-2.5 py-0.5 text-xs font-medium text-[#084c61]">
      {topic}
    </span>
  );
}

function PrivacyBadge({ isPrivate }: { isPrivate: boolean }) {
  return isPrivate ? (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
      🔒 Private
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
      🌐 Public
    </span>
  );
}

// ---------------------------------------------------------------------------
// Create Group Modal
// ---------------------------------------------------------------------------

function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("is_private", String(isPrivate));
    startTransition(async () => {
      const result = await createGroupAction(fd);
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
        <h2 className="mb-4 text-lg font-semibold text-[#323031]">Create a group</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#323031]">Group name *</label>
            <input
              name="name"
              required
              placeholder="e.g. Data Science Learners"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#177e89] focus:ring-1 focus:ring-[#177e89]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#323031]">Description *</label>
            <textarea
              name="description"
              required
              rows={3}
              placeholder="What is this group about?"
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#177e89] focus:ring-1 focus:ring-[#177e89]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#323031]">Topic *</label>
            <select
              name="topic"
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#177e89] focus:ring-1 focus:ring-[#177e89]"
            >
              <option value="">Select a topic…</option>
              {GROUP_TOPICS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[#323031]">{isPrivate ? "Private" : "Public"}</p>
              <p className="text-xs text-[#323031]/50">
                {isPrivate ? "Invite only — members must be added manually" : "Anyone can discover and join"}
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
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-[#323031]/60 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#084c61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#177e89]"
            >
              Create group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Group card
// ---------------------------------------------------------------------------

function GroupCard({
  group,
  isMember,
  isCreator,
  currentUserId,
}: {
  group: GroupData;
  isMember: boolean;
  isCreator: boolean;
  currentUserId: string;
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
    if (isCreator) return;
    setJoined(false);
    startTransition(async () => {
      const result = await leaveGroupAction(group.id);
      if (result.error) setJoined(true);
    });
  }

  return (
    <div className="flex flex-col rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/groups/${group.id}`}
            className="font-semibold text-[#323031] hover:text-[#084c61] hover:underline"
          >
            {group.name}
          </Link>
          <p className="mt-1 line-clamp-2 text-xs text-[#323031]/60">{group.description}</p>
        </div>
        <PrivacyBadge isPrivate={group.is_private} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <TopicTag topic={group.topic} />
        <span className="text-xs text-[#323031]/40">
          {group.member_count} {group.member_count === 1 ? "member" : "members"}
        </span>
      </div>

      <div className="mt-4 flex justify-end border-t border-gray-50 pt-4">
        {joined ? (
          <div className="flex items-center gap-2">
            <Link
              href={`/groups/${group.id}`}
              className="rounded-lg bg-[#084c61] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#177e89]"
            >
              View group
            </Link>
            {!isCreator && (
              <button
                onClick={handleLeave}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-[#323031]/50 hover:bg-gray-50"
              >
                Leave
              </button>
            )}
          </div>
        ) : group.is_private ? (
          <span className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-[#323031]/40">
            Private
          </span>
        ) : (
          <button
            onClick={handleJoin}
            className="rounded-lg bg-[#177e89] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#084c61]"
          >
            Join
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function GroupsView({
  groups,
  memberships,
  currentUserId,
  currentUserName,
  unreadCount,
  unreadTidingsCount,
  pendingConnectionsCount,
}: {
  groups: GroupData[];
  memberships: MyMembership[];
  currentUserId: string;
  currentUserName: string;
  unreadCount: number;
  unreadTidingsCount: number;
  pendingConnectionsCount: number;
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [search, setSearch] = useState("");

  const membershipMap = useMemo(
    () => new Map(memberships.map((m) => [m.group_id, m.role])),
    [memberships]
  );

  const query = search.toLowerCase();
  const filtered = useMemo(
    () =>
      query
        ? groups.filter(
            (g) =>
              g.name.toLowerCase().includes(query) ||
              g.topic.toLowerCase().includes(query) ||
              g.description.toLowerCase().includes(query)
          )
        : groups,
    [groups, query]
  );

  const myGroups = filtered.filter((g) => membershipMap.has(g.id));
  const discoverGroups = filtered.filter((g) => !membershipMap.has(g.id));

  return (
    <div className="min-h-screen bg-gray-50">
      {showCreateModal && <CreateGroupModal onClose={() => setShowCreateModal(false)} />}

      {/* Nav */}
      <nav className="bg-[#084c61] px-6 py-0">
        <div className="mx-auto flex max-w-4xl items-center gap-8">
          <img src="/images/logo-white.svg" alt="Elikonas" className="h-8 w-auto py-3" />
          <div className="flex items-end gap-1">
            <Link href="/profile" className="px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80">My Profile</Link>
            <Link href="/ai-guide" className="px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80">AI Guide</Link>
            <Link href="/musings" className="px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80">Community</Link>
            <Link href="/groups" className="px-3 py-3.5 text-sm font-medium text-white transition-colors">Groups</Link>
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
        {/* Header row */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#323031]">Groups</h1>
            <p className="mt-0.5 text-sm text-[#323031]/50">Connect with learners who share your interests.</p>
          </div>
          <div className="flex gap-2">
            <input
              type="search"
              placeholder="Search groups…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#177e89] focus:ring-1 focus:ring-[#177e89] sm:w-56"
            />
            <button
              onClick={() => setShowCreateModal(true)}
              className="shrink-0 rounded-lg bg-[#084c61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#177e89]"
            >
              + Create a group
            </button>
          </div>
        </div>

        {/* My Groups */}
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#323031]/50">
            My Groups
          </h2>
          {myGroups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-10 text-center">
              <p className="text-sm text-[#323031]/40">
                {search ? "No matching groups." : "You haven't joined any groups yet."}
              </p>
              {!search && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-3 text-sm font-medium text-[#177e89] hover:underline"
                >
                  Create your first group →
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myGroups.map((g) => (
                <GroupCard
                  key={g.id}
                  group={g}
                  isMember={true}
                  isCreator={g.created_by === currentUserId}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          )}
        </section>

        {/* Discover */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#323031]/50">
            Discover
          </h2>
          {discoverGroups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-10 text-center">
              <p className="text-sm text-[#323031]/40">
                {search ? "No matching groups." : "No other groups yet — be the first to create one!"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {discoverGroups.map((g) => (
                <GroupCard
                  key={g.id}
                  group={g}
                  isMember={false}
                  isCreator={g.created_by === currentUserId}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
