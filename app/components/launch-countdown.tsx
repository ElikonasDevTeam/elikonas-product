"use client";

import { useEffect, useState } from "react";

// 9:00 AM PDT on August 28, 2026 = 16:00 UTC (PDT is UTC-7).
// Hardcoded as an explicit UTC timestamp rather than computed from a PDT
// string, so there's no ambiguity or DST-conversion risk in the browser.
const LAUNCH_TARGET = new Date("2026-08-28T16:00:00Z").getTime();

function getRemaining(now: number) {
  const diff = Math.max(0, LAUNCH_TARGET - now);
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    isDone: diff <= 0,
  };
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function LaunchCountdown() {
  // Start null so the server-rendered markup and the first client render
  // match exactly (avoids a hydration mismatch) — the real countdown fills
  // in a moment after mount, which is imperceptible for a once-a-second timer.
  const [remaining, setRemaining] = useState<ReturnType<typeof getRemaining> | null>(null);

  useEffect(() => {
    // Deliberately setting state synchronously here (not just subscribing to
    // an external system) — this is what avoids a hydration mismatch: the
    // server renders the placeholder, and the real countdown value is filled
    // in right after mount, guaranteed to run on the client only.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRemaining(getRemaining(Date.now()));
    const id = setInterval(() => {
      setRemaining(getRemaining(Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  if (!remaining) {
    // Placeholder during the brief pre-hydration moment — same layout shape,
    // no numbers yet, so nothing visually jumps once the real timer kicks in.
    return <div className="mt-6 h-[4.5rem]" aria-hidden="true" />;
  }

  if (remaining.isDone) {
    return (
      <p className="mt-6 text-2xl font-semibold text-[#ffc857]" role="status">
        Launching&hellip;
      </p>
    );
  }

  const segments = [
    { label: "Days", value: remaining.days },
    { label: "Hours", value: remaining.hours },
    { label: "Minutes", value: remaining.minutes },
    { label: "Seconds", value: remaining.seconds },
  ];

  return (
    // Deliberately not a live region: re-announcing this every second would
    // be unusable for screen reader users. Anyone tabbing to or reading
    // through this section gets a sensible snapshot (e.g. "12, Days, 4,
    // Hours...") at whatever moment they reach it, same as any other
    // countdown timer's accepted accessible behavior.
    <div className="mt-6 flex gap-4">
      {segments.map((seg) => (
        <div key={seg.label} className="text-center">
          <div className="text-3xl font-semibold tabular-nums text-white sm:text-4xl">
            {pad(seg.value)}
          </div>
          <div className="mt-1 text-xs font-medium uppercase tracking-wide text-white/60">
            {seg.label}
          </div>
        </div>
      ))}
    </div>
  );
}
