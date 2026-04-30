"use client";

import { useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import type { EdUnit, EdUnitStatus } from "@/types";
import { AddLearningModal } from "./add-learning-modal";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg width="96" height="96" viewBox="0 0 96 96" className="rotate-[-90deg]">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke="#084c61"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold leading-none text-[#084c61]">{pct}%</span>
        <span className="mt-0.5 text-[10px] uppercase tracking-wide text-[#323031]/40">
          pathway
        </span>
      </div>
    </div>
  );
}

function Stat({ number, label }: { number: number; label: string }) {
  return (
    <div>
      <div className="text-2xl font-bold text-[#084c61]">{number}</div>
      <div className="text-xs text-[#323031]/50">{label}</div>
    </div>
  );
}

function CategoryTag({ category }: { category: string }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-[#084c61]/8 px-2.5 py-0.5 text-xs font-medium text-[#084c61]">
      {category}
    </span>
  );
}

const STATUS_CONFIG: Record<EdUnitStatus, { label: string; classes: string }> = {
  completed: {
    label: "✓ completed",
    classes: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  in_progress: {
    label: "● in progress",
    classes: "bg-[#177e89]/10 text-[#177e89] border border-[#177e89]/20",
  },
  planned: {
    label: "○ planned",
    classes: "bg-gray-100 text-gray-500 border border-gray-200",
  },
};

function StatusBadge({ status }: { status: EdUnitStatus }) {
  const { label, classes } = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
}

function EdUnitRow({ unit }: { unit: EdUnit }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[#323031]">{unit.name}</p>
          <p className="mt-0.5 text-xs text-[#323031]/50">{unit.provider}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <CategoryTag category={unit.category} />
          <StatusBadge status={unit.status} />
        </div>
      </div>
      {unit.status === "in_progress" && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs text-[#323031]/40">{unit.progress_pct}% complete</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-1.5 rounded-full bg-[#177e89] transition-all duration-500"
              style={{ width: `${unit.progress_pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#177e89]/10">
        <span className="text-2xl">📚</span>
      </div>
      <h3 className="text-sm font-semibold text-[#323031]">No learning recorded yet</h3>
      <p className="mt-1.5 text-sm text-[#323031]/50">
        Add your first ed-unit to start building your learning record.
      </p>
      <button
        onClick={onAdd}
        className="mt-5 rounded-lg bg-[#084c61] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#177e89]"
      >
        + Add learning
      </button>
    </div>
  );
}

export function ProfileView({ user, edUnits, unreadCount }: { user: User; edUnits: EdUnit[]; unreadCount: number }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const meta = user.user_metadata ?? {};
  const fullName: string = meta.full_name || user.email || "Learner";
  const initials = getInitials(fullName);
  const interests: string[] = Array.isArray(meta.interests) ? meta.interests : [];
  const isFoundingMember: boolean = meta.founding_member ?? true;

  const total = edUnits.length;
  const completed = edUnits.filter((u) => u.status === "completed").length;
  const inProgress = edUnits.filter((u) => u.status === "in_progress").length;
  const planned = edUnits.filter((u) => u.status === "planned").length;
  const pathwayPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const shareUrl = `https://elikonas.com/profile/${slugify(fullName)}`;

  function handleShare() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Nav */}
        <nav className="bg-[#084c61] px-6 py-0">
          <div className="mx-auto flex max-w-4xl items-center gap-8">
            <img src="/images/logo-white.svg" alt="Elikonas" className="h-8 w-auto py-3" />
            <div className="flex h-full items-end gap-1">
              <span className="border-b-2 border-white px-3 py-3.5 text-sm font-medium text-white">
                My Profile
              </span>
              <Link href="/ai-guide" className="px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80 transition-colors">
                AI Guide
              </Link>
              <Link href="/musings" className="px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80 transition-colors">
                Community
              </Link>
              <Link href="/notifications" className="relative px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80 transition-colors">
                Notifications
                {unreadCount > 0 && (
                  <span className="absolute right-0.5 top-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </nav>

        <main className="mx-auto max-w-4xl px-6 py-8 space-y-5">
          {/* Profile card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              {/* Identity */}
              <div className="flex flex-col items-center gap-3 text-center sm:min-w-[200px] sm:items-start sm:text-left">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#084c61] text-2xl font-bold text-white">
                  {initials}
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-[#323031]">{fullName}</h1>
                  {isFoundingMember && (
                    <div className="mt-1 flex items-center justify-center gap-1 sm:justify-start">
                      <span className="text-[#ffc857]">★</span>
                      <span className="text-xs font-medium text-[#323031]/60">
                        Founding Member
                      </span>
                    </div>
                  )}
                </div>
                {interests.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
                    {interests.map((interest) => (
                      <span
                        key={interest}
                        className="rounded-full bg-[#177e89]/10 px-2.5 py-0.5 text-xs font-medium text-[#177e89]"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Progress + stats */}
              <div className="flex flex-1 flex-wrap items-center justify-around gap-6">
                <ProgressRing pct={pathwayPct} />
                <div className="grid grid-cols-2 gap-x-10 gap-y-4">
                  <Stat number={total} label="Total ed-units" />
                  <Stat number={completed} label="Completed" />
                  <Stat number={inProgress} label="In progress" />
                  <Stat number={planned} label="Planned" />
                </div>
              </div>
            </div>
          </div>

          {/* Learning record */}
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#323031]">Learning Record</h2>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/account"
                  className="rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-[#323031] transition-colors hover:border-gray-300 hover:bg-gray-50"
                >
                  Edit profile
                </Link>
                <button
                  onClick={handleShare}
                  className="rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-[#323031] transition-colors hover:border-gray-300 hover:bg-gray-50"
                >
                  {copied ? "Copied!" : "Share record ↗"}
                </button>
                <button
                  onClick={() => setModalOpen(true)}
                  className="rounded-lg bg-[#084c61] px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#177e89]"
                >
                  + Add learning
                </button>
              </div>
            </div>

            {edUnits.length === 0 ? (
              <EmptyState onAdd={() => setModalOpen(true)} />
            ) : (
              <div className="space-y-2.5">
                {edUnits.map((unit) => (
                  <EdUnitRow key={unit.id} unit={unit} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {modalOpen && <AddLearningModal onClose={() => setModalOpen(false)} />}
    </>
  );
}
