import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in — Elikonas",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const message = params.message ?? null;

  return (
    <div className="w-full max-w-md px-4 py-12">
      <div className="mb-8 text-center">
        <img src="/images/logo-color.svg" alt="Elikonas" className="mx-auto h-10 w-auto" />
        <h1 className="mt-6 text-2xl font-semibold text-[#323031]">Sign in</h1>
        <p className="mt-2 text-sm text-[#323031]/50">
          Welcome back.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white px-8 py-8 shadow-sm">
        <LoginForm message={message} />
      </div>
    </div>
  );
}
