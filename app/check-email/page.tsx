import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Check your email — Elikonas",
};

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#084c61]/5 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src="/images/logo-color.svg" alt="Elikonas" className="mx-auto h-10 w-auto" />
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white px-8 py-10 shadow-sm text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#177e89]/10">
            <span className="text-2xl">✉️</span>
          </div>
          <h1 className="text-xl font-semibold text-[#323031]">Check your inbox</h1>
          <p className="mt-3 text-sm leading-relaxed text-[#323031]/60">
            We sent a confirmation link to your email address. Click it to activate your account and get started.
          </p>
          <p className="mt-4 text-xs text-[#323031]/40">
            Didn&apos;t receive it? Check your spam folder, or{" "}
            <Link href="/signup" className="font-medium text-[#177e89] hover:text-[#084c61] transition-colors">
              try signing up again
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
