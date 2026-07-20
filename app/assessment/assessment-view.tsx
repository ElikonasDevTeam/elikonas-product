"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startAssessment, saveProgress, submitAssessment } from "./actions";
import type { ONetQuestion } from "@/types/onet";

interface Props {
  questions: ONetQuestion[];
  fetchError: string | null;
}

type Phase = "intro" | "questions" | "submitting" | "error";

const RESPONSE_OPTIONS = [
  { value: 1, label: "Strongly Dislike" },
  { value: 2, label: "Dislike" },
  { value: 3, label: "Unsure" },
  { value: 4, label: "Like" },
  { value: 5, label: "Strongly Like" },
] as const;

const SECTION_SIZE = 12;
const TOTAL_QUESTIONS = 60;
const TOTAL_SECTIONS = TOTAL_QUESTIONS / SECTION_SIZE;

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#177e89]">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function MinimalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-4">
          <Link href="/" aria-label="Elikonas home">
            <img
              src="/images/logo-color.svg"
              alt="elikonas"
              className="h-7 w-auto"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
                const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (fb) fb.style.display = "block";
              }}
            />
            <span style={{ display: "none" }} className="text-base font-bold text-[#084c61]">
              elikonas
            </span>
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        {children}
      </main>
    </div>
  );
}

export function AssessmentView({ questions, fetchError }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [phase, setPhase] = useState<Phase>(fetchError ? "error" : "intro");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<number[]>(
    new Array(TOTAL_QUESTIONS).fill(0)
  );
  const [currentSection, setCurrentSection] = useState(0);
  const [error, setError] = useState<string | null>(fetchError);

  const sectionStart = currentSection * SECTION_SIZE;
  const sectionQuestions = questions.slice(
    sectionStart,
    sectionStart + SECTION_SIZE
  );
  const sectionAnsweredCount = sectionQuestions.filter(
    (_, i) => answers[sectionStart + i] > 0
  ).length;
  const sectionComplete = sectionAnsweredCount === sectionQuestions.length;
  const totalAnswered = answers.filter((a) => a > 0).length;
  const progressPct = Math.round((totalAnswered / TOTAL_QUESTIONS) * 100);
  const isLastSection = currentSection === TOTAL_SECTIONS - 1;

  function setAnswer(absoluteIndex: number, value: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[absoluteIndex] = value;
      return next;
    });
  }

  function handleStart() {
    startTransition(async () => {
      const result = await startAssessment();
      if ("error" in result) {
        setError(result.error);
        setPhase("error");
        return;
      }
      setSessionId(result.sessionId);
      setPhase("questions");
    });
  }

  function handleNext() {
    if (!sessionId || !sectionComplete) return;
    startTransition(async () => {
      await Promise.all(
        sectionQuestions.map((_, i) =>
          saveProgress(sessionId, sectionStart + i + 1, answers[sectionStart + i])
        )
      );

      if (!isLastSection) {
        setCurrentSection((c) => c + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      setPhase("submitting");
      const result = await submitAssessment(sessionId, answers);
      if ("error" in result) {
        setError(result.error);
        setPhase("error");
        return;
      }
      router.push(`/assessment/results?session=${result.sessionId}`);
    });
  }

  function handlePrevious() {
    if (currentSection === 0) return;
    setCurrentSection((c) => c - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (phase === "error") {
    return (
      <MinimalLayout>
        <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-sm text-center">
          <p className="font-semibold text-[#db3a34] mb-2">Something went wrong</p>
          <p className="text-sm text-gray-500 mb-6">
            {error ?? "An unexpected error occurred. Please try again."}
          </p>
          <Link
            href="/profile"
            className="text-sm font-medium text-[#177e89] hover:underline"
          >
            Back to profile
          </Link>
        </div>
      </MinimalLayout>
    );
  }

  if (phase === "submitting") {
    return (
      <MinimalLayout>
        <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-sm text-center">
          <div className="mb-4 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#084c61] border-t-transparent" />
          </div>
          <p className="font-semibold text-[#084c61]">Scoring your results...</p>
          <p className="mt-1 text-sm text-gray-500">
            This usually takes a few seconds.
          </p>
        </div>
      </MinimalLayout>
    );
  }

  if (phase === "intro") {
    return (
      <MinimalLayout>
        <div className="mx-auto w-full max-w-lg">
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <div className="mb-6 flex justify-center">
              <span className="inline-flex items-center rounded-full bg-[#084c61]/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#084c61]">
                O*NET Interest Profiler
              </span>
            </div>

            <h1 className="mb-3 text-center text-2xl font-bold text-[#323031]">
              Discover Your Career Interests
            </h1>
            <p className="mb-6 text-center text-sm leading-relaxed text-gray-500">
              Answer 60 questions about activities you&apos;d enjoy or dislike.
              In about 10 minutes, you&apos;ll see which career areas match your
              natural interests — backed by the U.S. Department of Labor&apos;s
              O*NET database.
            </p>

            <div className="mb-6 space-y-2.5 rounded-xl bg-gray-50 p-4">
              {[
                "60 questions in 5 sections of 12",
                "About 10 minutes to complete",
                "Personalized RIASEC profile + career suggestions",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <CheckIcon />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleStart}
              disabled={isPending || questions.length === 0}
              className="w-full rounded-xl bg-[#084c61] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#177e89] disabled:opacity-50"
            >
              {isPending ? "Starting..." : "Start assessment"}
            </button>

            <div className="mt-4 text-center">
              <Link
                href="/profile"
                className="text-sm text-gray-400 transition-colors hover:text-gray-600"
              >
                Maybe later
              </Link>
            </div>
          </div>

          <p className="mt-4 text-center text-[10px] leading-relaxed text-gray-400">
            This product uses O*NET Web Services by the U.S. Department of Labor,
            Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license.
          </p>
        </div>
      </MinimalLayout>
    );
  }

  // Phase: questions
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky progress header */}
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <Link href="/" aria-label="Elikonas home">
              <img
                src="/images/logo-color.svg"
                alt="elikonas"
                className="h-6 w-auto"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                  const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
                  if (fb) fb.style.display = "block";
                }}
              />
              <span
                style={{ display: "none" }}
                className="text-base font-bold text-[#084c61]"
              >
                elikonas
              </span>
            </Link>
            <span className="text-xs font-medium text-gray-500">
              Section {currentSection + 1} of {TOTAL_SECTIONS}
            </span>
          </div>
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-[#177e89] transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-1 text-right text-[10px] text-gray-400">
            {progressPct}% complete
          </p>
        </div>
      </div>

      {/* Questions */}
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h2 className="mb-1 text-lg font-bold text-[#323031]">
          Section {currentSection + 1}: Questions {sectionStart + 1}–
          {sectionStart + SECTION_SIZE}
        </h2>
        <p className="mb-6 text-sm text-gray-500">
          How much would you enjoy each of the following activities?
        </p>

        <div className="space-y-4">
          {sectionQuestions.map((q, i) => {
            const absoluteIndex = sectionStart + i;
            const currentAnswer = answers[absoluteIndex];
            return (
              <div key={q.index} className="rounded-xl bg-white p-4 shadow-sm">
                <p className="mb-3 text-sm font-medium text-[#323031]">
                  <span className="mr-1.5 text-gray-400">{q.index}.</span>
                  {q.text}
                </p>
                <div className="grid grid-cols-5 gap-1.5">
                  {RESPONSE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAnswer(absoluteIndex, opt.value)}
                      aria-label={opt.label}
                      aria-pressed={currentAnswer === opt.value}
                      className={[
                        "min-h-[48px] rounded-lg border px-1 py-1.5 text-center text-[10px] font-medium leading-tight transition-all",
                        currentAnswer === opt.value
                          ? "border-[#177e89] bg-[#177e89] text-white"
                          : "border-gray-200 text-gray-500 hover:border-[#177e89] hover:text-[#177e89]",
                      ].join(" ")}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentSection === 0 || isPending}
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>

          {!sectionComplete && (
            <p className="text-center text-xs text-gray-400">
              {sectionAnsweredCount}/{SECTION_SIZE} answered
            </p>
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={!sectionComplete || isPending}
            className="rounded-xl bg-[#084c61] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#177e89] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending
              ? "Saving..."
              : isLastSection
              ? "Complete assessment"
              : "Next section"}
          </button>
        </div>
      </div>
    </div>
  );
}
