"use client";

import { useActionState } from "react";
import Link from "next/link";
import { sendResetEmailAction, type ForgotPasswordState } from "./actions";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<ForgotPasswordState, FormData>(
    sendResetEmailAction,
    null
  );

  if (state?.success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-emerald-500">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-sm font-medium text-[#323031]">Check your inbox</p>
        <p className="mt-2 text-sm text-[#323031]/60">
          If an account with that email exists, you&apos;ll receive a password reset link shortly.
        </p>
        <Link
          href="/login"
          className="mt-5 block text-sm font-medium text-[#177e89] hover:text-[#084c61] transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <div className="rounded-lg border border-[#db3a34]/30 bg-[#db3a34]/5 px-4 py-3 text-sm text-[#db3a34]">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-[#323031]">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="jane@example.com"
          required
          className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-[#323031] placeholder-[#323031]/40 outline-none transition-all focus:border-[#177e89] focus:ring-2 focus:ring-[#177e89]/20 hover:border-gray-300"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className={[
          "mt-2 w-full rounded-lg px-4 py-3 text-sm font-semibold text-white transition-all duration-150",
          pending
            ? "cursor-not-allowed bg-[#084c61]/40"
            : "bg-[#084c61] hover:bg-[#177e89] active:scale-[0.99]",
        ].join(" ")}
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>

      <p className="text-center text-sm text-[#323031]/50">
        Remembered it?{" "}
        <Link
          href="/login"
          className="font-medium text-[#177e89] hover:text-[#084c61] transition-colors"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
