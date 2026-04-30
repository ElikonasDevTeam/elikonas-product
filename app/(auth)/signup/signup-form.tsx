"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signupAction, type SignupError } from "./actions";

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
  minLength,
}: {
  id: string;
  name: string;
  type: string;
  label: string;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-[#323031] mb-1.5">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
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

export function SignupForm() {
  const [state, action, pending] = useActionState<SignupError | null, FormData>(
    signupAction,
    null
  );

  const [passwordValue, setPasswordValue] = useState("");
  const [confirmValue, setConfirmValue] = useState("");
  const passwordsMatch = confirmValue === "" || passwordValue === confirmValue;

  const fieldError = (field: SignupError["field"]) =>
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
        id="fullName"
        name="fullName"
        type="text"
        label="Full name"
        placeholder="Jane Smith"
        autoComplete="name"
        required
        error={fieldError("fullName")}
      />

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

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-[#323031] mb-1.5">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Min. 8 characters"
          required
          minLength={8}
          value={passwordValue}
          onChange={(e) => setPasswordValue(e.target.value)}
          className={[
            "w-full rounded-lg border px-4 py-2.5 text-sm text-[#323031] placeholder-[#323031]/40",
            "outline-none transition-all duration-150",
            "focus:border-[#177e89] focus:ring-2 focus:ring-[#177e89]/20",
            fieldError("password")
              ? "border-[#db3a34] bg-[#db3a34]/5"
              : "border-gray-200 bg-white hover:border-gray-300",
          ].join(" ")}
        />
        <FieldError message={fieldError("password")} />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#323031] mb-1.5">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          required
          value={confirmValue}
          onChange={(e) => setConfirmValue(e.target.value)}
          className={[
            "w-full rounded-lg border px-4 py-2.5 text-sm text-[#323031] placeholder-[#323031]/40",
            "outline-none transition-all duration-150",
            "focus:border-[#177e89] focus:ring-2 focus:ring-[#177e89]/20",
            !passwordsMatch || fieldError("confirmPassword")
              ? "border-[#db3a34] bg-[#db3a34]/5"
              : "border-gray-200 bg-white hover:border-gray-300",
          ].join(" ")}
        />
        {!passwordsMatch && (
          <p className="mt-1.5 text-sm text-[#db3a34]">Passwords do not match.</p>
        )}
        <FieldError message={fieldError("confirmPassword")} />
      </div>

      <div>
        <label htmlFor="inviteCode" className="block text-sm font-medium text-[#323031] mb-1.5">
          Invite code
          <span className="ml-2 inline-flex items-center rounded-full bg-[#ffc857]/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#084c61] uppercase">
            Alpha access
          </span>
        </label>
        <input
          id="inviteCode"
          name="inviteCode"
          type="text"
          placeholder="Enter your invite code"
          required
          className={[
            "w-full rounded-lg border px-4 py-2.5 text-sm text-[#323031] placeholder-[#323031]/40 uppercase tracking-wider",
            "outline-none transition-all duration-150",
            "focus:border-[#177e89] focus:ring-2 focus:ring-[#177e89]/20",
            fieldError("inviteCode")
              ? "border-[#db3a34] bg-[#db3a34]/5"
              : "border-gray-200 bg-white hover:border-gray-300",
          ].join(" ")}
        />
        <FieldError message={fieldError("inviteCode")} />
      </div>

      <button
        type="submit"
        disabled={pending || !passwordsMatch}
        className={[
          "mt-2 w-full rounded-lg px-4 py-3 text-sm font-semibold text-white transition-all duration-150",
          pending || !passwordsMatch
            ? "cursor-not-allowed bg-[#084c61]/40"
            : "bg-[#084c61] hover:bg-[#177e89] active:scale-[0.99]",
        ].join(" ")}
      >
        {pending ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-[#323031]/50">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-[#177e89] hover:text-[#084c61] transition-colors"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
