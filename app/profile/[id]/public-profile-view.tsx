"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AppShell } from "@/app/components/app-shell";
import { connectAction, acceptConnectionAction, declineConnectionAction } from "@/app/people/actions";
import type { PrivacySettings } from "@/app/account/types";
import type { EdUnit, EdUnitStatus } from "@/types";

export type ConnectionStatus =
  | "none"
  | "pending_outgoing"
  | "pending_incoming"
  | "connected";

export interface PublicProfile {
  id: string;
  full_name: string | null;
  interests: string[];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] ?? "?").toUpperCase();
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
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}
    >
      {label}
    </span>
  );
}

function CategoryTag({ category }: { category: string }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-[#084c61]/8 px-2.5 py-0.5 text-xs font-medium text-[#084c61]">
      {category}
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

function ConnectionButton({
  profileId,
  connectionId,
  initialStatus,
}: {
  profileId: string;
  connectionId: string | null;
  initialStatus: ConnectionStatus;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [, startTransition] = useTransition();

  function handleConnect() {
    setStatus("pending_outgoing");
    startTransition(async () => {
      await connectAction(profileId);
    });
  }

  function handleAccept() {
    if (!connectionId) return;
    setStatus("connected");
    startTransition(async () => {
      await acceptConnectionAction(connectionId);
    });
  }

  function handleDecline() {
    if (!connectionId) return;
    setStatus("none");
    startTransition(async () => {
      await declineConnectionAction(connectionId);
    });
  }

  if (status === "connected") {
    return (
      <Link
        href="/tidings"
        className="rounded-lg bg-[#084c61] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#177e89]"
      >
        ✉ Message
      </Link>
    );
  }

  if (status === "pending_outgoing") {
    return (
      <span className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
        Pending
      </span>
    );
  }

  if (status === "pending_incoming") {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleAccept}
          className="rounded-lg bg-[#084c61] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#177e89]"
        >
          Accept
        </button>
        <button
          onClick={handleDecline}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#323031]/60 transition-colors hover:bg-gray-50"
        >
          Decline
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="rounded-lg bg-[#084c61] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#177e89]"
    >
      Connect
    </button>
  );
}

export function PublicProfileView({
  profile,
  edUnits,
  connectionStatus,
  connectionId,
  currentUserName,
  privacySettings,
  unreadCount,
  unreadTidingsCount,
  pendingConnectionsCount,
}: {
  profile: PublicProfile;
  edUnits: EdUnit[];
  connectionStatus: ConnectionStatus;
  connectionId: string | null;
  currentUserName: string;
  privacySettings: PrivacySettings;
  unreadCount: number;
  unreadTidingsCount: number;
  pendingConnectionsCount: number;
}) {
  const displayName = profile.full_name || "Unknown";
  const ini = getInitials(displayName);

  const total = edUnits.length;
  const completed = edUnits.filter((u) => u.status === "completed").length;
  const inProgress = edUnits.filter((u) => u.status === "in_progress").length;
  const planned = edUnits.filter((u) => u.status === "planned").length;
  const pathwayPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const {
    show_interests,
    show_edunits_count,
    show_progress_pct,
    show_planned_units,
    show_learning_record,
  } = privacySettings;

  return (
    <AppShell
      currentUserName={currentUserName}
      unreadCount={unreadCount}
      unreadTidingsCount={unreadTidingsCount}
      pendingConnectionsCount={pendingConnectionsCount}
      activePage="public-profile"
    >
      <main className="mx-auto max-w-4xl space-y-5 px-6 py-8">
        {/* Profile card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {/* Identity */}
            <div className="flex flex-col items-center gap-3 text-center sm:min-w-[200px] sm:items-start sm:text-left">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#084c61] text-2xl font-bold text-white">
                {ini}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-[#323031]">{displayName}</h1>
              </div>
              {show_interests && profile.interests.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
                  {profile.interests.map((interest) => (
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

            {/* Progress + stats — only shown when at least one is enabled */}
            {(show_progress_pct || show_edunits_count) && (
              <div className="flex flex-1 flex-wrap items-center justify-around gap-6">
                {show_progress_pct && <ProgressRing pct={pathwayPct} />}
                {show_edunits_count && (
                  <div className="grid grid-cols-2 gap-x-10 gap-y-4">
                    <Stat number={total} label="Total ed-units" />
                    <Stat number={completed} label="Completed" />
                    <Stat number={inProgress} label="In progress" />
                    {show_planned_units && <Stat number={planned} label="Planned" />}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Connection action */}
          <div className="mt-5 flex justify-end border-t border-gray-100 pt-5">
            <ConnectionButton
              profileId={profile.id}
              connectionId={connectionId}
              initialStatus={connectionStatus}
            />
          </div>
        </div>

        {/* Learning record */}
        {show_learning_record && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-[#323031]">Learning Record</h2>
            {edUnits.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
                <p className="text-sm text-[#323031]/50">No learning recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {edUnits
                  .filter((u) => show_planned_units || u.status !== "planned")
                  .map((unit) => (
                    <EdUnitRow key={unit.id} unit={unit} />
                  ))}
              </div>
            )}
          </div>
        )}
        {!show_learning_record && !show_progress_pct && !show_edunits_count && !show_interests && (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
            <p className="text-sm text-[#323031]/50">
              This member hasn&apos;t made their profile public yet.
            </p>
          </div>
        )}
      </main>
    </AppShell>
  );
}
