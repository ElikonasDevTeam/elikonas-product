"use client";

import { useTransition, useState } from "react";
import { saveOnboardingAction } from "./actions";

const GOALS = [
  {
    id: "career-change",
    title: "Career change",
    description: "I want to move into a new field",
  },
  {
    id: "skill-building",
    title: "Skill building",
    description: "I want to grow within my current path",
  },
  {
    id: "degree-completion",
    title: "Degree completion",
    description: "I want to finish what I started",
  },
  {
    id: "exploring",
    title: "Just exploring",
    description: "I'm not sure yet — I want to look around",
  },
];

const INTERESTS = [
  "Data & AI",
  "Healthcare",
  "Technology",
  "Business",
  "Trades & Skilled Work",
  "Education",
  "Creative Arts",
  "Public Service",
];

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex gap-1.5">
        <div className="h-1 flex-1 rounded-full bg-[#084c61]" />
        <div
          className={[
            "h-1 flex-1 rounded-full transition-colors duration-300",
            step === 2 ? "bg-[#084c61]" : "bg-gray-200",
          ].join(" ")}
        />
      </div>
      <p className="text-xs font-medium text-[#323031]/40 tracking-wide uppercase">
        Step {step} of 2
      </p>
    </div>
  );
}

export function OnboardingFlow() {
  const [step, setStep] = useState<1 | 2>(1);
  const [goal, setGoal] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleInterest(interest: string) {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  }

  function handleContinue() {
    if (step === 1 && goal) {
      setStep(2);
    }
  }

  function handleSubmit() {
    if (!goal || interests.length === 0) return;
    setError(null);
    startTransition(async () => {
      const result = await saveOnboardingAction(goal, interests);
      if (result) setError(result.message);
    });
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-8 py-8 shadow-sm">
      <StepIndicator step={step} />

      {step === 1 && (
        <>
          <h2 className="mb-1 text-lg font-semibold text-[#323031]">
            What&apos;s your main goal?
          </h2>
          <p className="mb-5 text-sm text-[#323031]/50">
            This helps us surface the most relevant pathways for you.
          </p>

          <div className="space-y-2.5">
            {GOALS.map((g) => {
              const selected = goal === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGoal(g.id)}
                  className={[
                    "w-full rounded-xl border px-4 py-3.5 text-left transition-all duration-150",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#177e89]/40",
                    selected
                      ? "border-[#177e89] bg-[#177e89]/5"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={[
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        selected ? "border-[#177e89]" : "border-gray-300",
                      ].join(" ")}
                    >
                      {selected && (
                        <span className="h-2 w-2 rounded-full bg-[#177e89]" />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-[#323031]">{g.title}</p>
                      <p className="text-xs text-[#323031]/50">{g.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!goal}
            className={[
              "mt-6 w-full rounded-lg px-4 py-3 text-sm font-semibold text-white transition-all duration-150",
              !goal
                ? "cursor-not-allowed bg-[#084c61]/40"
                : "bg-[#084c61] hover:bg-[#177e89] active:scale-[0.99]",
            ].join(" ")}
          >
            Continue
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <h2 className="mb-1 text-lg font-semibold text-[#323031]">
            What areas interest you?
          </h2>
          <p className="mb-5 text-sm text-[#323031]/50">
            Select all that apply — you can always change these later.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {INTERESTS.map((interest) => {
              const selected = interests.includes(interest);
              return (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={[
                    "rounded-lg border px-3 py-2.5 text-sm font-medium transition-all duration-150",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#177e89]/40",
                    selected
                      ? "border-[#084c61] bg-[#084c61] text-white"
                      : "border-gray-200 bg-white text-[#323031] hover:border-gray-300 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {interest}
                </button>
              );
            })}
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-[#db3a34]/30 bg-[#db3a34]/5 px-4 py-3 text-sm text-[#db3a34]">
              {error}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={isPending}
              className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-[#323031] transition-all duration-150 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={interests.length === 0 || isPending}
              className={[
                "flex-1 rounded-lg px-4 py-3 text-sm font-semibold text-white transition-all duration-150",
                interests.length === 0 || isPending
                  ? "cursor-not-allowed bg-[#084c61]/40"
                  : "bg-[#084c61] hover:bg-[#177e89] active:scale-[0.99]",
              ].join(" ")}
            >
              {isPending ? "Saving…" : "Finish"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
