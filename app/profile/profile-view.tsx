"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { AppShell } from "@/app/components/app-shell";
import type { Credential, EdUnit, EdUnitStatus } from "@/types";
import type { RIASECScores } from "@/types/onet";
import { LearningModal } from "./learning-modal";
import { CredentialModal } from "./credential-modal";
import { deleteCredentialAction } from "./credential-actions";
import { Avatar } from "@/app/components/avatar";
import { AvatarModal } from "./avatar-modal";

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

// completed_at is a plain "YYYY-MM-DD" date with no time component — parsed
// via Date(y, m, d) rather than new Date(isoString), which would parse as
// UTC midnight and can render as the previous day in negative-UTC-offset
// timezones.
function formatCompletedDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ExternalLinkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-3 w-3"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
      />
    </svg>
  );
}

function CredentialBadge({ credentials }: { credentials: Credential[] }) {
  if (credentials.length === 0) return null;
  // v1 only ever creates one credential per ed_unit via the UI, but the
  // schema allows more (e.g. a later accredited entry alongside this one) —
  // show the most recent one.
  const latest = credentials[0];

  // Links to a route that generates a signed URL fresh on every click and
  // redirects to it, rather than a signed URL baked in at page-render time
  // (which would expire if this page sits open longer than that URL's TTL).
  return (
    <a
      href={`/api/credentials/${latest.id}/file`}
      target="_blank"
      rel="noopener noreferrer"
      title={latest.self_attest ? "Self-attested proof uploaded" : "Proof uploaded"}
      className="inline-flex items-center gap-1 rounded-full bg-[#177e89]/10 px-2.5 py-1 text-xs font-medium text-[#177e89] hover:bg-[#177e89]/20"
    >
      📎 Proof
    </a>
  );
}

function DeleteCredentialButton({ credentialId }: { credentialId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(deleteCredentialAction, null);

  useEffect(() => {
    if (state && "success" in state) router.refresh();
  }, [state, router]);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Delete this proof? This can't be undone.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={credentialId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-[#323031]/70 transition-colors hover:border-[#db3a34]/30 hover:bg-[#db3a34]/5 hover:text-[#db3a34] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {state && "error" in state && (
        <p className="mt-1 text-xs text-[#db3a34]">{state.error}</p>
      )}
    </form>
  );
}

function EdUnitRow({
  unit,
  credentials,
  onEdit,
  onAddProof,
  onReplaceProof,
}: {
  unit: EdUnit;
  credentials: Credential[];
  onEdit: () => void;
  onAddProof: () => void;
  onReplaceProof: (credentialId: string) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[#323031]">{unit.name}</p>
          <p className="mt-0.5 text-xs text-[#323031]/50">{unit.provider}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            {unit.course_url && (
              <a
                href={unit.course_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-[#177e89] hover:text-[#084c61]"
              >
                <ExternalLinkIcon />
                Course Link
              </a>
            )}
            {unit.completed_at && (
              <span className="text-xs text-[#323031]/50">
                Completed {formatCompletedDate(unit.completed_at)}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <CategoryTag category={unit.category} />
          <StatusBadge status={unit.status} />
          <CredentialBadge credentials={credentials} />
          {credentials.length === 0 ? (
            <button
              type="button"
              onClick={onAddProof}
              aria-label={`Add proof for ${unit.name}`}
              className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-[#323031]/70 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-[#323031]"
            >
              Add proof
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onReplaceProof(credentials[0].id)}
                aria-label={`Replace proof for ${unit.name}`}
                className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-[#323031]/70 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-[#323031]"
              >
                Replace
              </button>
              <DeleteCredentialButton credentialId={credentials[0].id} />
            </>
          )}
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${unit.name}`}
            className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-[#323031]/70 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-[#323031]"
          >
            Edit
          </button>
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

const RIASEC_NAMES: Record<string, { code: string; name: string }> = {
  realistic:     { code: "R", name: "Realistic" },
  investigative: { code: "I", name: "Investigative" },
  artistic:      { code: "A", name: "Artistic" },
  social:        { code: "S", name: "Social" },
  enterprising:  { code: "E", name: "Enterprising" },
  conventional:  { code: "C", name: "Conventional" },
};

export function ProfileView({
  user,
  edUnits,
  credentialsByEdUnit,
  unreadCount,
  unreadTidingsCount,
  pendingConnectionsCount,
  latestAssessment,
  profileSlug,
  avatarUrl,
  showProfilePhoto,
}: {
  user: User;
  edUnits: EdUnit[];
  credentialsByEdUnit: Record<string, Credential[]>;
  unreadCount: number;
  unreadTidingsCount: number;
  pendingConnectionsCount: number;
  latestAssessment: { id: string; riasec_scores: RIASECScores } | null;
  profileSlug: string | null;
  avatarUrl: string | null;
  showProfilePhoto: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<EdUnit | null>(null);
  const [addingProofForUnitId, setAddingProofForUnitId] = useState<string | null>(null);
  const [replacingCredentialId, setReplacingCredentialId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  const meta = user.user_metadata ?? {};
  const fullName: string = meta.full_name || user.email || "Learner";
  const interests: string[] = Array.isArray(meta.interests) ? meta.interests : [];
  const isFoundingMember: boolean = meta.founding_member === true;

  let plan = (meta.plan as string) ?? "free";
  if (meta.founding_member === true) plan = "founding_member";
  const isPaid = plan !== "free";

  const top3Areas = latestAssessment
    ? (Object.entries(latestAssessment.riasec_scores) as [string, number][])
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
    : [];

  const total = edUnits.length;
  const completed = edUnits.filter((u) => u.status === "completed").length;
  const inProgress = edUnits.filter((u) => u.status === "in_progress").length;
  const planned = edUnits.filter((u) => u.status === "planned").length;
  const pathwayPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const shareUrl = `https://elikonas.com/profile/${profileSlug ?? user.id}`;

  function handleShare() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      <AppShell
        currentUserName={fullName}
        unreadCount={unreadCount}
        unreadTidingsCount={unreadTidingsCount}
        pendingConnectionsCount={pendingConnectionsCount}
        activePage="profile"
      >
        <main className="mx-auto max-w-4xl px-6 py-8 space-y-5">
          {/* Profile card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              {/* Identity */}
              <div className="flex flex-col items-center gap-3 text-center sm:min-w-[200px] sm:items-start sm:text-left">
                <button
                  type="button"
                  onClick={() => setAvatarModalOpen(true)}
                  className="group relative rounded-full"
                  aria-label="Edit profile photo"
                >
                  <Avatar
                    name={fullName}
                    size="h-20 w-20 text-2xl"
                    colorClassName="bg-[#084c61] text-white"
                    initialsStrategy="first-last"
                    avatarUrl={avatarUrl}
                  />
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-[10px] font-medium text-white opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                    Edit
                  </span>
                </button>
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

          {/* Career Interests card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#323031]">Career Interests</h2>
              {latestAssessment && (
                <Link
                  href={`/assessment/results?session=${latestAssessment.id}`}
                  className="text-sm font-medium text-[#177e89] hover:underline"
                >
                  View full results
                </Link>
              )}
            </div>

            {latestAssessment ? (
              <>
                <div className="mb-5 space-y-3">
                  {top3Areas.map(([key, score]) => {
                    const info = RIASEC_NAMES[key];
                    const pct = Math.round((score / 50) * 100);
                    return (
                      <div key={key}>
                        <div className="mb-1 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#084c61] text-[10px] font-bold text-white">
                              {info.code}
                            </span>
                            <span className="text-sm font-medium text-[#323031]">
                              {info.name}
                            </span>
                          </div>
                          <span className="text-xs tabular-nums text-gray-400">
                            {score}/50
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-1.5 rounded-full bg-[#177e89]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {isPaid ? (
                  <Link
                    href="/assessment"
                    className="inline-flex items-center rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-[#323031] transition-colors hover:border-gray-300 hover:bg-gray-50"
                  >
                    Retake assessment
                  </Link>
                ) : (
                  <span title="Upgrade to retake" className="inline-block cursor-not-allowed">
                    <span className="pointer-events-none inline-flex items-center rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-[#323031] opacity-50">
                      Retake assessment
                    </span>
                  </span>
                )}
              </>
            ) : (
              <>
                <p className="mb-4 text-sm leading-relaxed text-gray-500">
                  Discover your career interest profile with a free 10-minute assessment from the U.S.
                  Department of Labor.
                </p>
                <Link
                  href="/assessment"
                  className="inline-flex items-center rounded-lg bg-[#084c61] px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#177e89]"
                >
                  Take the Interest Profiler
                </Link>
              </>
            )}
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
                  <EdUnitRow
                    key={unit.id}
                    unit={unit}
                    credentials={credentialsByEdUnit[unit.id] ?? []}
                    onEdit={() => setEditingUnit(unit)}
                    onAddProof={() => setAddingProofForUnitId(unit.id)}
                    onReplaceProof={(credentialId) => setReplacingCredentialId(credentialId)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </AppShell>

      {modalOpen && <LearningModal onClose={() => setModalOpen(false)} />}

      {editingUnit && (
        <LearningModal
          key={editingUnit.id}
          unit={editingUnit}
          onClose={() => setEditingUnit(null)}
        />
      )}

      {addingProofForUnitId && (
        <CredentialModal
          key={addingProofForUnitId}
          edUnitId={addingProofForUnitId}
          onClose={() => setAddingProofForUnitId(null)}
        />
      )}

      {replacingCredentialId && (
        <CredentialModal
          key={replacingCredentialId}
          replaceCredentialId={replacingCredentialId}
          onClose={() => setReplacingCredentialId(null)}
        />
      )}

      {avatarModalOpen && (
        <AvatarModal
          name={fullName}
          currentAvatarUrl={avatarUrl}
          currentShowProfilePhoto={showProfilePhoto}
          onClose={() => setAvatarModalOpen(false)}
        />
      )}
    </>
  );
}
