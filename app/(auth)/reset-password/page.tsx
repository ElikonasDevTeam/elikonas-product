import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Set new password — Elikonas",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const code = params.code ?? null;

  let sessionReady = false;
  let initialError: string | null = null;

  if (code) {
    // PKCE flow: Supabase appended ?code= to the redirectTo URL.
    // Exchange it server-side so the session lands in cookies before the form renders.
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[reset-password/page] exchangeCodeForSession error:", error.message);
      initialError = "This reset link is invalid or has expired. Please request a new one.";
    } else {
      redirect("/reset-password/set");
    }
  }
  // If no code, the client component will handle the implicit flow
  // (PASSWORD_RECOVERY event from the URL hash).

  return (
    <div className="w-full max-w-md px-4 py-12">
      <div className="mb-8 text-center">
        <img src="/images/logo-color.svg" alt="Elikonas" className="mx-auto h-10 w-auto" />
        <h1 className="mt-6 text-2xl font-semibold text-[#323031]">Set new password</h1>
        <p className="mt-2 text-sm text-[#323031]/50">
          Choose a strong password for your account.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white px-8 py-8 shadow-sm">
        <ResetPasswordForm sessionReady={sessionReady} initialError={initialError} />
      </div>
    </div>
  );
}
