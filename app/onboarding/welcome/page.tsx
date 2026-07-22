import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Welcome to the alpha — Elikonas",
};

// TODO(katie): replace with the real 2-minute survey URL once it exists.
const SURVEY_URL = "https://elikonas.com/survey";

export default function OnboardingWelcomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#084c61]/5 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src="/images/logo-color.svg" alt="Elikonas" className="mx-auto h-10 w-auto" />
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white px-8 py-8 shadow-sm">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xl text-[#ffc857]">★</span>
            <h1 className="text-lg font-semibold text-[#323031]">
              You&apos;re a founding member — welcome to the alpha.
            </h1>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#323031]/60">
            Elikonas is still growing, and your feedback shapes what comes next. Check out
            what&apos;s live now and what&apos;s coming on our roadmap, and tell us what matters
            most to you.
          </p>

          <div className="mt-6 space-y-2.5">
            <Link
              href="https://elikonas.com/roadmap"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-[#177e89]/30 bg-[#177e89]/5 px-4 py-3 text-sm font-semibold text-[#177e89] transition-colors hover:bg-[#177e89]/10"
            >
              See the Roadmap
              <span aria-hidden="true">↗</span>
            </Link>
            <Link
              href={SURVEY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-[#323031] transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              Take the 2-Minute Survey
              <span aria-hidden="true">↗</span>
            </Link>
          </div>

          <Link
            href="/profile"
            className="mt-6 block w-full rounded-lg bg-[#084c61] px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#177e89]"
          >
            Continue to your profile
          </Link>
        </div>
      </div>
    </div>
  );
}
