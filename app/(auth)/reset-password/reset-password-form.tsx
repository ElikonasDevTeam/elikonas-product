"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm({
  code,
  initialError,
}: {
  code: string | null;
  initialError: string | null;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // PKCE flow: exchange the code client-side so the session lands in the browser directly.
  useEffect(() => {
    if (!code) return;

    const supabase = createClient();

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        console.error('[ResetPasswordForm] exchangeCodeForSession error:', error.message)
        setError("This reset link is invalid or has expired. Please request a new one.");
        return;
      }
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setReady(true);
        } else {
          setError("Auth session missing. Please request a new reset link.");
        }
      });
    });
  }, [code]);

  // Implicit flow: listen for PASSWORD_RECOVERY event from URL hash.
  useEffect(() => {
    if (code) return;

    const supabase = createClient();

    // Primary: listen for PASSWORD_RECOVERY (implicit flow) or INITIAL_SESSION
    // with an active session (hash was already processed before subscription).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (
          event === "PASSWORD_RECOVERY" ||
          (event === "INITIAL_SESSION" && session)
        ) {
          setReady(true);
        }
      }
    );

    // Fallback: if the browser client processed the URL hash before this
    // component mounted (race condition), the event will not fire again.
    // getSession() returns the already-established recovery session.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    // Timeout: stop spinning after 12 s and show the "link expired" error.
    const timeout = setTimeout(() => {
      setError("This reset link is invalid or has expired. Please request a new one.");
    }, 12000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [code]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      console.error("[ResetPasswordForm] updateUser error:", updateError.message);
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    // Sign out so the user lands on a clean login state
    await supabase.auth.signOut();
    setTimeout(() => router.push("/login"), 2000);
  }

  if (initialError) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#db3a34]/10">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-[#db3a34]">
            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-sm font-medium text-[#323031]">Link expired or invalid</p>
        <p className="mt-2 text-sm text-[#323031]/60">{initialError}</p>
        <Link
          href="/forgot-password"
          className="mt-5 block text-sm font-medium text-[#177e89] hover:text-[#084c61] transition-colors"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-emerald-500">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-sm font-medium text-[#323031]">Password updated</p>
        <p className="mt-2 text-sm text-[#323031]/60">Redirecting you to sign in…</p>
      </div>
    );
  }

  if (!ready && error) {
    // Timeout fired — show the expired-link state (same as initialError UI).
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#db3a34]/10">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-[#db3a34]">
            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-sm font-medium text-[#323031]">Link expired or invalid</p>
        <p className="mt-2 text-sm text-[#323031]/60">{error}</p>
        <Link
          href="/forgot-password"
          className="mt-5 block text-sm font-medium text-[#177e89] hover:text-[#084c61] transition-colors"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="text-center">
        <div className="flex justify-center gap-1.5 py-4">
          {[0, 150, 300].map((d) => (
            <span
              key={d}
              className="h-2 w-2 rounded-full bg-gray-300 animate-bounce"
              style={{ animationDelay: `${d}ms` }}
            />
          ))}
        </div>
        <p className="text-sm text-[#323031]/50">Verifying your reset link…</p>
        <p className="mt-3 text-xs text-[#323031]/40">
          Link not working?{" "}
          <Link href="/forgot-password" className="text-[#177e89] hover:text-[#084c61]">
            Request a new one
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-[#db3a34]/30 bg-[#db3a34]/5 px-4 py-3 text-sm text-[#db3a34]">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-[#323031]">
          New password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          required
          className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-[#323031] placeholder-[#323031]/40 outline-none transition-all focus:border-[#177e89] focus:ring-2 focus:ring-[#177e89]/20 hover:border-gray-300"
        />
      </div>

      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-[#323031]">
          Confirm new password
        </label>
        <input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          placeholder="Repeat your new password"
          required
          className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-[#323031] placeholder-[#323031]/40 outline-none transition-all focus:border-[#177e89] focus:ring-2 focus:ring-[#177e89]/20 hover:border-gray-300"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className={[
          "mt-2 w-full rounded-lg px-4 py-3 text-sm font-semibold text-white transition-all duration-150",
          loading
            ? "cursor-not-allowed bg-[#084c61]/40"
            : "bg-[#084c61] hover:bg-[#177e89] active:scale-[0.99]",
        ].join(" ")}
      >
        {loading ? "Updating…" : "Set new password"}
      </button>
    </form>
  );
}
