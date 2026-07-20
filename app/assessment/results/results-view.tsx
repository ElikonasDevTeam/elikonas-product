"use client";

import Link from "next/link";
import { AppShell } from "@/app/components/app-shell";
import type { RIASECScores, ONetCareer } from "@/types/onet";
import type { Plan } from "@/app/account/types";

const ONET_ATTRIBUTION =
  "This product uses the O*NET Web Services by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license.";

const RIASEC_INFO: Record<
  keyof RIASECScores,
  { code: string; name: string; tagline: string; description: string; examples: string }
> = {
  realistic: {
    code: "R",
    name: "Realistic",
    tagline: "The Doer",
    description:
      "You enjoy hands-on work with tools, machines, plants, or animals. Practical, mechanical, and often physically active.",
    examples: "Engineering, Construction, Agriculture, Technology",
  },
  investigative: {
    code: "I",
    name: "Investigative",
    tagline: "The Thinker",
    description:
      "You like to explore ideas, solve problems, and conduct research. Analytical, curious, and comfortable working independently.",
    examples: "Science, Medicine, Research, Data Analysis",
  },
  artistic: {
    code: "A",
    name: "Artistic",
    tagline: "The Creator",
    description:
      "You value self-expression and originality. You prefer unstructured situations and enjoy ideas, words, and art.",
    examples: "Design, Writing, Music, Film, Architecture",
  },
  social: {
    code: "S",
    name: "Social",
    tagline: "The Helper",
    description:
      "You enjoy working with and helping people. Cooperative, empathetic, and skilled at teaching, counseling, or service.",
    examples: "Education, Healthcare, Counseling, Social Work",
  },
  enterprising: {
    code: "E",
    name: "Enterprising",
    tagline: "The Persuader",
    description:
      "You like to lead, manage, and persuade others. Ambitious, assertive, and energized by launching and carrying out projects.",
    examples: "Business, Law, Management, Sales",
  },
  conventional: {
    code: "C",
    name: "Conventional",
    tagline: "The Organizer",
    description:
      "You prefer structured, orderly work with data and procedures. Organized, efficient, and methodical.",
    examples: "Accounting, Administration, Finance, Data Management",
  },
};

function ExternalLinkIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="ml-2 mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-300">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

interface Props {
  scores: RIASECScores;
  careers: ONetCareer[];
  plan: Plan;
  currentUserName: string;
  unreadCount: number;
  unreadTidingsCount: number;
  pendingConnectionsCount: number;
}

export function ResultsView({
  scores,
  careers,
  plan,
  currentUserName,
  unreadCount,
  unreadTidingsCount,
  pendingConnectionsCount,
}: Props) {
  const sortedAreas = (
    Object.entries(scores) as [keyof RIASECScores, number][]
  ).sort(([, a], [, b]) => b - a);

  const top3 = sortedAreas.slice(0, 3);
  const isPaid = plan !== "free";

  return (
    <AppShell
      currentUserName={currentUserName}
      unreadCount={unreadCount}
      unreadTidingsCount={unreadTidingsCount}
      pendingConnectionsCount={pendingConnectionsCount}
      activePage="assessment"
    >
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#323031]">
            Your Interest Profile
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Based on the O*NET Interest Profiler Short Form
          </p>
        </div>

        {/* Top 3 interest areas */}
        <section className="mb-10">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-[#323031]/50">
            Your top interests
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {top3.map(([key, score], rank) => {
              const info = RIASEC_INFO[key];
              const isFirst = rank === 0;
              const pct = Math.round((score / 50) * 100);
              return (
                <div
                  key={key}
                  className={[
                    "rounded-2xl p-5",
                    isFirst ? "bg-[#084c61] text-white" : "bg-white shadow-sm",
                  ].join(" ")}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div
                      className={[
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold",
                        isFirst
                          ? "bg-white/20 text-white"
                          : "bg-[#084c61] text-white",
                      ].join(" ")}
                    >
                      {info.code}
                    </div>
                    <div>
                      <p
                        className={`text-base font-bold ${
                          isFirst ? "text-white" : "text-[#323031]"
                        }`}
                      >
                        {info.name}
                      </p>
                      <p
                        className={`text-xs ${
                          isFirst ? "text-white/70" : "text-gray-400"
                        }`}
                      >
                        {info.tagline}
                      </p>
                    </div>
                  </div>

                  <p
                    className={`mb-3 text-xs leading-relaxed ${
                      isFirst ? "text-white/80" : "text-gray-500"
                    }`}
                  >
                    {info.description}
                  </p>

                  <p
                    className={`mb-3 text-[10px] font-medium uppercase tracking-wide ${
                      isFirst ? "text-white/60" : "text-gray-400"
                    }`}
                  >
                    {info.examples}
                  </p>

                  <div>
                    <div
                      className={`h-1.5 w-full overflow-hidden rounded-full ${
                        isFirst ? "bg-white/20" : "bg-gray-100"
                      }`}
                    >
                      <div
                        className={`h-full rounded-full ${
                          isFirst ? "bg-[#ffc857]" : "bg-[#177e89]"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p
                      className={`mt-1 text-right text-[10px] ${
                        isFirst ? "text-white/50" : "text-gray-400"
                      }`}
                    >
                      {score}/50
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Full RIASEC scores */}
        <section className="mb-10 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-[11px] font-semibold uppercase tracking-wider text-[#323031]/50">
            Full RIASEC profile
          </h2>
          <div className="space-y-4">
            {sortedAreas.map(([key, score]) => {
              const info = RIASEC_INFO[key];
              const pct = Math.round((score / 50) * 100);
              return (
                <div key={key}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#084c61] text-[10px] font-bold text-white">
                        {info.code}
                      </span>
                      <span className="text-sm font-medium text-[#323031]">
                        {info.name}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {info.tagline}
                      </span>
                    </div>
                    <span className="text-xs tabular-nums text-gray-400">
                      {score}/50
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-[#177e89] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Career suggestions */}
        {careers.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#323031]/50">
              Suggested careers
            </h2>
            <p className="mb-4 text-xs text-gray-400">
              Based on your top interest areas, from the O*NET database
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {careers.slice(0, 20).map((career) => (
                <a
                  key={career.code}
                  href={career.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start justify-between rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug text-[#323031]">
                      {career.title}
                    </p>
                    <p className="mt-0.5 text-[10px] text-gray-400">
                      {career.code}
                    </p>
                    {(career.tags.bright_outlook ||
                      career.tags.green ||
                      career.tags.apprenticeship) && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {career.tags.bright_outlook && (
                          <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600">
                            Bright Outlook
                          </span>
                        )}
                        {career.tags.green && (
                          <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600">
                            Green
                          </span>
                        )}
                        {career.tags.apprenticeship && (
                          <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-600">
                            Apprenticeship
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <ExternalLinkIcon />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Next steps */}
        <section className="mb-10 rounded-2xl bg-[#084c61]/5 p-6">
          <h2 className="mb-2 text-sm font-semibold text-[#084c61]">
            What to do next
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-gray-600">
            Your interest profile is a starting point. Talk to Eli to explore
            how your interests connect with your lived experience and the
            credentials that could open doors.
          </p>
          <Link
            href="/ai-guide"
            className="inline-flex items-center gap-2 rounded-xl bg-[#084c61] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#177e89]"
          >
            Talk to Eli
          </Link>
        </section>

        {/* Retake + attribution */}
        <div className="space-y-4 pb-8">
          {isPaid ? (
            <p className="text-center text-sm text-gray-400">
              Want to retake the assessment?{" "}
              <Link
                href="/assessment"
                className="text-[#177e89] hover:underline"
              >
                Start over
              </Link>
            </p>
          ) : (
            <p className="text-center text-sm text-gray-400">
              Retaking the assessment is available on paid plans.{" "}
              <Link href="/account" className="text-[#177e89] hover:underline">
                View plans
              </Link>
            </p>
          )}

          <p className="text-center text-[10px] leading-relaxed text-gray-300">
            {ONET_ATTRIBUTION}
          </p>
        </div>
      </div>
    </AppShell>
  );
}
