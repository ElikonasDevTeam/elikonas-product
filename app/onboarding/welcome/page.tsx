import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Welcome to the alpha — Elikonas",
};

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
            Elikonas is still growing, and your feedback shapes what comes next. Once you&apos;ve
            had a chance to explore, you&apos;ll find a quick feedback survey in the app&apos;s
            side menu. For now, here&apos;s a look at what&apos;s coming on our roadmap.
          </p>

          <div className="mt-6">
            <Link
              href="https://elikonas.com/roadmap"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-[#177e89]/30 bg-[#177e89]/5 px-4 py-3 text-sm font-semibold text-[#177e89] transition-colors hover:bg-[#177e89]/10"
            >
              See the Roadmap
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
