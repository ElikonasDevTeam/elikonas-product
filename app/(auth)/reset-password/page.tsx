import type { Metadata } from "next";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Set new password — Elikonas",
};

export default function ResetPasswordPage() {
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
        <ResetPasswordForm sessionReady={false} initialError={null} />
      </div>
    </div>
  );
}
