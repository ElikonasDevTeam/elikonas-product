"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useActionState } from "react";
import { postMusingAction, toggleLikeAction } from "./actions";
import { CATEGORIES } from "@/types";
import { NavUserMenu } from "@/app/components/nav-user-menu";

export interface MusingData {
  id: string;
  user_id: string;
  author_name: string;
  author_tagline: string | null;
  hashtags: string[];
  visibility: "public" | "inner_circle";
  body: string;
  created_at: string;
  like_count: number;
  is_liked: boolean;
  comment_count: number;
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
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

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const dim = size === "md" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs";
  return (
    <div className={`${dim} shrink-0 flex items-center justify-center rounded-full bg-[#084c61] font-bold text-[#ffc857]`}>
      {initials(name)}
    </div>
  );
}

function HashtagBadge({
  tag,
  active,
  onClick,
}: {
  tag: string;
  active: boolean;
  onClick: (tag: string) => void;
}) {
  return (
    <button
      onClick={() => onClick(tag)}
      className={[
        "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors",
        active
          ? "bg-[#177e89] text-white"
          : "bg-[#177e89]/10 text-[#177e89] hover:bg-[#177e89]/20",
      ].join(" ")}
    >
      #{tag}
    </button>
  );
}

function MusingCard({
  musing,
  activeHashtag,
  onHashtagClick,
}: {
  musing: MusingData;
  activeHashtag: string | null;
  onHashtagClick: (tag: string) => void;
}) {
  const [optimisticLiked, addOptimisticLiked] = useOptimistic(musing.is_liked);
  const [optimisticCount, addOptimisticCount] = useOptimistic(musing.like_count);
  const [isPending, startTransition] = useTransition();

  function handleLike() {
    startTransition(async () => {
      addOptimisticLiked(!optimisticLiked);
      addOptimisticCount(optimisticLiked ? optimisticCount - 1 : optimisticCount + 1);
      await toggleLikeAction(musing.id, optimisticLiked);
    });
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar name={musing.author_name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[#323031]">{musing.author_name}</span>
            {musing.author_tagline && (
              <span className="text-xs text-[#323031]/50">{musing.author_tagline}</span>
            )}
            <span className="ml-auto text-xs text-[#323031]/40">{relativeTime(musing.created_at)}</span>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-[#323031]">{musing.body}</p>

          {musing.hashtags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {musing.hashtags.map((tag) => (
                <HashtagBadge
                  key={tag}
                  tag={tag}
                  active={activeHashtag === tag}
                  onClick={onHashtagClick}
                />
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={handleLike}
              disabled={isPending}
              className={[
                "flex items-center gap-1.5 text-xs font-medium transition-colors",
                optimisticLiked
                  ? "text-[#177e89]"
                  : "text-[#323031]/40 hover:text-[#177e89]",
              ].join(" ")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={optimisticLiked ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={2}
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                />
              </svg>
              {optimisticCount}
            </button>
            <span className="flex items-center gap-1.5 text-xs text-[#323031]/40">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"
                />
              </svg>
              {musing.comment_count}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComposeBox({
  authorName,
  onPosted,
}: {
  authorName: string;
  onPosted: () => void;
}) {
  const [state, formAction, isPending] = useActionState(postMusingAction, null);
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<"inner_circle" | "public">("inner_circle");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && !state.error) {
      setBody("");
      formRef.current?.reset();
      onPosted();
    }
  }, [state, onPosted]);

  return (
    <form ref={formRef} action={formAction} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <input type="hidden" name="visibility" value={visibility} />
      <div className="flex gap-3">
        <Avatar name={authorName} />
        <div className="flex-1">
          <textarea
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share a thought, resource, or milestone… use #hashtags to tag your post"
            rows={3}
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#323031] placeholder-[#323031]/40 outline-none transition-all focus:border-[#177e89] focus:bg-white focus:ring-2 focus:ring-[#177e89]/20"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            {/* Visibility toggle */}
            <div className="flex items-center gap-1.5 text-xs text-[#323031]/50">
              <span>Post to:</span>
              <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                <button
                  type="button"
                  onClick={() => setVisibility("inner_circle")}
                  className={[
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                    visibility === "inner_circle"
                      ? "bg-white text-[#084c61] shadow-sm"
                      : "text-[#323031]/50 hover:text-[#323031]/70",
                  ].join(" ")}
                >
                  🔒 Inner circle
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility("public")}
                  className={[
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                    visibility === "public"
                      ? "bg-white text-[#084c61] shadow-sm"
                      : "text-[#323031]/50 hover:text-[#323031]/70",
                  ].join(" ")}
                >
                  🌐 Public
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {state?.error && (
                <p className="text-xs text-red-500">{state.error}</p>
              )}
              <button
                type="submit"
                disabled={isPending || !body.trim()}
                className="rounded-lg bg-[#084c61] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#177e89] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isPending ? "Posting…" : "Post musing"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#084c61]/10">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#084c61" className="h-7 w-7">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
        </svg>
      </div>
      <p className="font-semibold text-[#323031]">No musings yet</p>
      <p className="max-w-xs text-sm text-[#323031]/50">
        {label === "All"
          ? "Be the first to share a thought with the community."
          : `No musings tagged #${label} yet — be the first.`}
      </p>
    </div>
  );
}

const CATEGORY_FILTERS = ["All", ...CATEGORIES] as const;

export function MusingsView({
  initialMusings,
  currentUserId,
  authorName,
  unreadCount,
  unreadTidingsCount,
  pendingConnectionsCount,
}: {
  initialMusings: MusingData[];
  currentUserId: string;
  authorName: string;
  unreadCount: number;
  unreadTidingsCount: number;
  pendingConnectionsCount: number;
}) {
  const [musings, setMusings] = useState(initialMusings);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [hashtagFilter, setHashtagFilter] = useState<string | null>(null);

  useEffect(() => {
    setMusings(initialMusings);
  }, [initialMusings]);

  function handleHashtagClick(tag: string) {
    setHashtagFilter((prev) => (prev === tag ? null : tag));
  }

  function handleCategoryClick(cat: string) {
    setCategoryFilter(cat);
    setHashtagFilter(null);
  }

  const filtered = musings.filter((m) => {
    if (hashtagFilter) return m.hashtags.includes(hashtagFilter);
    if (categoryFilter !== "All") return m.hashtags.includes(categoryFilter.toLowerCase().replace(/[^a-z0-9]/g, ""));
    return true;
  });

  const activeFilterLabel = hashtagFilter ?? categoryFilter;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Nav */}
      <nav className="shrink-0 bg-[#084c61] px-6 py-0">
        <div className="mx-auto flex max-w-6xl items-center gap-8">
          <img src="/images/logo-white.svg" alt="Elikonas" className="h-8 w-auto py-3" />
          <div className="flex items-end gap-1">
            <Link href="/profile" className="px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80 transition-colors">
              My Profile
            </Link>
            <Link href="/ai-guide" className="px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80 transition-colors">
              AI Guide
            </Link>
            <span className="border-b-2 border-white px-3 py-3.5 text-sm font-medium text-white">
              Community
            </span>
            <Link href="/groups" className="px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80 transition-colors">
              Groups
            </Link>
            <Link href="/tidings" className="relative px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80 transition-colors">
              ✉ Tidings
              {unreadTidingsCount > 0 && (
                <span className="absolute right-0.5 top-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#177e89] px-1 text-[10px] font-bold text-white">
                  {unreadTidingsCount > 99 ? "99+" : unreadTidingsCount}
                </span>
              )}
            </Link>
            <Link href="/notifications" className="relative px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80 transition-colors">
              Notifications
              {unreadCount > 0 && (
                <span className="absolute right-0.5 top-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
            <Link href="/people" className="relative px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80 transition-colors">
              People
              {pendingConnectionsCount > 0 && (
                <span className="absolute right-0.5 top-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                  {pendingConnectionsCount > 99 ? "99+" : pendingConnectionsCount}
                </span>
              )}
            </Link>
          </div>
          <NavUserMenu userName={authorName} />
        </div>
      </nav>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden bg-gray-50">
        <div className="mx-auto flex w-full max-w-2xl flex-col overflow-hidden px-4 py-6">

          {/* Compose */}
          <ComposeBox authorName={authorName} onPosted={() => {}} />

          {/* Filter tabs */}
          <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => handleCategoryClick(f)}
                className={[
                  "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                  !hashtagFilter && categoryFilter === f
                    ? "bg-[#084c61] text-white"
                    : "bg-white text-[#323031]/60 hover:bg-gray-100",
                ].join(" ")}
              >
                {f}
              </button>
            ))}
            {hashtagFilter && (
              <button
                onClick={() => setHashtagFilter(null)}
                className="shrink-0 flex items-center gap-1 rounded-full bg-[#177e89] px-3.5 py-1.5 text-xs font-medium text-white"
              >
                #{hashtagFilter}
                <span className="ml-0.5 opacity-70">×</span>
              </button>
            )}
          </div>

          {/* Feed */}
          <div className="mt-4 flex flex-1 flex-col gap-3 overflow-y-auto pb-6">
            {filtered.length === 0 ? (
              <EmptyState label={activeFilterLabel} />
            ) : (
              filtered.map((m) => (
                <MusingCard
                  key={m.id}
                  musing={m}
                  activeHashtag={hashtagFilter}
                  onHashtagClick={handleHashtagClick}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
