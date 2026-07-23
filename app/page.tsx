import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Elikonas — Your learning, your record, your path",
  description:
    "A portable, learner-owned record for the skills you've built — in class, on the job, and everywhere in between.",
};

const FEATURES = [
  {
    title: "Chart your own path",
    body: "Set your own learning goals, whatever they are, and build a plan that fits your life, not a syllabus.",
  },
  {
    title: "Guided by Eli",
    body: "Your AI guide helps you find what to learn next, based on your interests and the record you're already building.",
  },
  {
    title: "Learn your way",
    body: "Hands-on, self-paced, or classroom. What you learn matters more than how you got there.",
  },
  {
    title: "A record that's yours",
    body: "Every credential lives in one place you own — portable, shareable, and never locked behind someone else's system.",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/profile");

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#084c61] focus:shadow-lg"
      >
        Skip to main content
      </a>

      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight text-[#084c61]">
            Elikonas
          </span>
          <nav aria-label="Account" className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-md px-4 py-2 text-sm font-medium text-[#084c61] transition-colors hover:bg-[#084c61]/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#177e89]"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-[#ffc857] px-4 py-2 text-sm font-semibold text-[#323031] transition-colors hover:bg-[#ffd57a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#084c61]"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-[#084c61]">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2 md:items-center md:py-28">
            <div>
              <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl">
                Your learning,
                <br />
                <span className="text-[#ffc857]">your record,</span>
                <br />
                your path.
              </h1>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-white/80">
                Elikonas is a home for everything you learn — in a classroom, on
                the job, or on your own — gathered into one record that
                belongs to you, guided by an AI companion who helps you decide
                what&apos;s next.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/signup"
                  className="rounded-md bg-[#ffc857] px-6 py-3 text-sm font-semibold text-[#323031] transition-colors hover:bg-[#ffd57a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Start your record
                </Link>
                <Link
                  href="/login"
                  className="rounded-md border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Log in
                </Link>
              </div>
            </div>

            {/* Signature: a constellation of ed-units, forming a personal path */}
            <div className="mx-auto w-full max-w-sm md:max-w-none" aria-hidden="true">
              <svg
                viewBox="0 0 400 340"
                className="h-auto w-full motion-safe:[&_.path-line]:animate-[draw_1.8s_ease-out_forwards]"
              >
                <style>{`
                  .path-line {
                    stroke-dasharray: 520;
                    stroke-dashoffset: 520;
                  }
                  @keyframes draw {
                    to { stroke-dashoffset: 0; }
                  }
                  @media (prefers-reduced-motion: reduce) {
                    .path-line { stroke-dashoffset: 0; animation: none; }
                  }
                `}</style>
                <path
                  className="path-line"
                  d="M40 280 L120 210 L110 130 L200 90 L260 150 L340 60"
                  fill="none"
                  stroke="#ffc857"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.85"
                />
                {[
                  [40, 280],
                  [120, 210],
                  [110, 130],
                  [200, 90],
                  [260, 150],
                ].map(([cx, cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r="6" fill="#ffffff" opacity="0.9" />
                ))}
                <circle cx="340" cy="60" r="10" fill="#ffc857" />
                <circle cx="340" cy="60" r="18" fill="#ffc857" opacity="0.25" />
              </svg>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="max-w-xl text-2xl font-semibold tracking-tight text-[#323031] sm:text-3xl">
              Built for people who learn outside the lines.
            </h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div key={f.title}>
                  <div
                    className="mb-4 h-1 w-10 rounded-full bg-[#177e89]"
                    aria-hidden="true"
                  />
                  <h3 className="text-base font-semibold text-[#323031]">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#323031]/70">
                    {f.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission strip */}
        <section className="border-t border-black/5 bg-[#f6f9f9] py-16">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <p className="text-lg leading-relaxed text-[#323031]">
              Elikonas is a Public Benefit Corporation. Expanding access to
              education and workforce development for non-traditional
              learners isn&apos;t a side effect of what we build — it&apos;s the
              reason we&apos;re building it.
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-[#084c61] py-16">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 text-center">
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">
              Your record starts with one entry.
            </h2>
            <Link
              href="/signup"
              className="rounded-md bg-[#ffc857] px-8 py-3 text-sm font-semibold text-[#323031] transition-colors hover:bg-[#ffd57a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Create your account
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/5 bg-white py-8">
        <div className="mx-auto max-w-6xl px-6 text-sm text-[#323031]/50">
          © {new Date().getFullYear()} Elikonas Public Benefit Corporation
        </div>
      </footer>
    </>
  );
}
