"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type LoginError } from "./actions";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-sm text-[#db3a34]">{message}</p>;
}

function Input({
  id,
  name,
  type,
  label,
  placeholder,
  autoComplete,
  error,
  required,
  labelRight,
}: {
  id: string;
  name: string;
  type: string;
  label: string;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
  required?: boolean;
  labelRight?: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="block text-sm font-medium text-[#323031]">
          {label}
        </label>
        {labelRight}
      </div>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        className={[
          "w-full rounded-lg border px-4 py-2.5 text-sm text-[#323031] placeholder-[#323031]/40",
          "outline-none transition-all duration-150",
          "focus:border-[#177e89] focus:ring-2 focus:ring-[#177e89]/20",
          error
            ? "border-[#db3a34] bg-[#db3a34]/5"
            : "border-gray-200 bg-white hover:border-gray-300",
        ].join(" ")}
      />
      <FieldError message={error} />
    </div>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginError | null, FormData>(
    loginAction,
    null
  );

  const fieldError = (field: LoginError["field"]) =>
    state?.field === field ? state!.message : undefined;

  const generalError = state && !state.field ? state.message : undefined;

  return (
    <form action={action} className="space-y-4">
      {generalError && (
        <div className="rounded-lg border border-[#db3a34]/30 bg-[#db3a34]/5 px-4 py-3 text-sm text-[#db3a34]">
          {generalError}
        </div>
      )}

      <Input
        id="email"
        name="email"
        type="email"
        label="Email address"
        placeholder="jane@example.com"
        autoComplete="email"
        required
        error={fieldError("email")}
      />

      <Input
        id="password"
        name="password"
        type="password"
        label="Password"
        placeholder="Your password"
        autoComplete="current-password"
        required
        error={fieldError("password")}
        labelRight={
          <Link
            href="/reset-password"
            className="text-xs font-medium text-[#177e89] hover:text-[#084c61] transition-colors"
          >
            Forgot password?
          </Link>
        }
      />

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
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-sm text-[#323031]/50">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-[#177e89] hover:text-[#084c61] transition-colors"
        >
          Create account
        </Link>
      </p>
    </form>
  );
}
