"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { useActionState } from "react";
import { postMusingAction, toggleLikeAction, submitReportAction } from "./actions";
import { AppShell } from "@/app/components/app-shell";

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

const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "hate_speech", label: "Hate speech" },
  { value: "sensitive_personal_information", label: "Sensitive personal information" },
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "other", label: "Other" },
] as const;

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

function ReportModal({
  musingId,
  onClose,
  onSuccess,
}: {
  musingId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;
    setSubmitting(true);
    setError(null);
    const result = await submitReportAction(musingId, reason, details);
    setSubmitting(false);
    if ("success" in result) {
      onSuccess();
    } else if (result.error === "already_reported") {
      setError("You've already reported this musing.");
    } else {
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#323031]">Report this musing</h2>
          <button
            onClick={onClose}
            className="text-[#323031]/40 hover:text-[#323031] transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-[#db3a34]/30 bg-[#db3a34]/5 px-4 py-3 text-sm text-[#db3a34]">
              {error}
            </div>
          )}

          <div className="space-y-2.5">
            {REPORT_REASONS.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="reason"
                  value={value}
                  checked={reason === value}
                  onChange={() => setReason(value)}
                  className="h-4 w-4 border-gray-300 text-[#084c61] focus:ring-[#177e89]"
                />
                <span className="text-sm text-[#323031]">{label}</span>
              </label>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#323031] mb-1.5">
              Additional details
              <span className="ml-1.5 text-xs font-normal text-[#323031]/40">Optional</span>
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Any additional context…"
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-[#323031] placeholder-[#323031]/40 outline-none transition-all focus:border-[#177e89] focus:bg-white focus:ring-2 focus:ring-[#177e89]/20"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-[#323031]/60 hover:text-[#323031] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!reason || submitting}
              className={[
                "rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all",
                !reason || submitting
                  ? "cursor-not-allowed bg-[#084c61]/40"
                  : "bg-[#084c61] hover:bg-[#177e89]",
              ].join(" ")}
            >
              {submitting ? "Submitting…" : "Submit report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-lg">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 shrink-0 text-emerald-500">
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
      </svg>
      <p className="text-sm font-medium text-emerald-700">{message}</p>
    </div>
  );
}

function MusingCard({
  musing,
  activeHashtag,
  onHashtagClick,
  currentUserId,
  onReport,
}: {
  musing: MusingData;
  activeHashtag: string | null;
  onHashtagClick: (tag: string) => void;
  currentUserId: string;
  onReport: (musingId: string) => void;
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

  const isOwnMusing = currentUserId === musing.user_id;

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
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-[#323031]/40">{relativeTime(musing.created_at)}</span>
              {!isOwnMusing && (
                <button
                  onClick={() => onReport(musing.id)}
                  title="Report this musing"
                  className="text-[#323031]/20 hover:text-[#db3a34]/60 transition-colors"
                  aria-label="Report this musing"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
                  </svg>
                </button>
              )}
            </div>
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

export function MusingsView({
  initialMusings,
  currentUserId,
  authorName,
  unreadCount,
  unreadTidingsCount,
  pendingConnectionsCount,
  topHashtags,
}: {
  initialMusings: MusingData[];
  currentUserId: string;
  authorName: string;
  unreadCount: number;
  unreadTidingsCount: number;
  pendingConnectionsCount: number;
  topHashtags: string[];
}) {
  const [musings, setMusings] = useState(initialMusings);
  const [hashtagFilter, setHashtagFilter] = useState<string | null>(null);
  const [reportingMusingId, setReportingMusingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setMusings(initialMusings);
  }, [initialMusings]);

  function handleHashtagClick(tag: string) {
    setHashtagFilter((prev) => (prev === tag ? null : tag));
  }

  const filtered = hashtagFilter
    ? musings.filter((m) => m.hashtags.includes(hashtagFilter))
    : musings;

  return (
    <AppShell
      currentUserName={authorName}
      unreadCount={unreadCount}
      unreadTidingsCount={unreadTidingsCount}
      pendingConnectionsCount={pendingConnectionsCount}
      activePage="musings"
      fullHeight
    >
      <div className="flex flex-1 overflow-hidden bg-gray-50">
        <div className="mx-auto flex w-full max-w-2xl flex-col overflow-hidden px-4 py-6">

          <ComposeBox authorName={authorName} onPosted={() => {}} />

          {/* Hashtag filter chips */}
          <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            <button
              onClick={() => setHashtagFilter(null)}
              className={[
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                !hashtagFilter
                  ? "bg-[#084c61] text-white"
                  : "bg-white text-[#323031]/60 hover:bg-gray-100",
              ].join(" ")}
            >
              All
            </button>
            {topHashtags.map((tag) => (
              <button
                key={tag}
                onClick={() => setHashtagFilter(hashtagFilter === tag ? null : tag)}
                className={[
                  "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                  hashtagFilter === tag
                    ? "bg-[#084c61] text-white"
                    : "bg-white text-[#323031]/60 hover:bg-gray-100",
                ].join(" ")}
              >
                #{tag}
              </button>
            ))}
          </div>

          {/* Feed */}
          <div className="mt-4 flex flex-1 flex-col gap-3 overflow-y-auto pb-6">
            {filtered.length === 0 ? (
              <EmptyState label={hashtagFilter ?? "All"} />
            ) : (
              filtered.map((m) => (
                <MusingCard
                  key={m.id}
                  musing={m}
                  activeHashtag={hashtagFilter}
                  onHashtagClick={handleHashtagClick}
                  currentUserId={currentUserId}
                  onReport={setReportingMusingId}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {reportingMusingId && (
        <ReportModal
          musingId={reportingMusingId}
          onClose={() => setReportingMusingId(null)}
          onSuccess={() => {
            setReportingMusingId(null);
            setToast("Thanks for the report — we'll review it shortly");
          }}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </AppShell>
  );
}
