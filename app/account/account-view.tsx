"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/app/components/app-shell";
import {
  updatePrivacySettingAction,
  createCheckoutSessionAction,
  createPortalSessionAction,
  changePasswordAction,
} from "./actions";
import type { Plan, PrivacyField, PrivacySettings } from "./types";

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

function Toggle({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      disabled={disabled}
      role="switch"
      aria-checked={enabled}
      className={[
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#177e89] focus-visible:ring-offset-2",
        enabled ? "bg-[#177e89]" : "bg-gray-200",
        disabled ? "opacity-50 cursor-not-allowed" : "",
      ].join(" ")}
    >
      <span
        className={[
          "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200",
          enabled ? "translate-x-4" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-4">
        <h2 className="text-sm font-semibold text-[#323031]">{title}</h2>
        <p className="mt-0.5 text-xs text-[#323031]/50">{description}</p>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Privacy section
// ---------------------------------------------------------------------------

const PRIVACY_FIELDS: { field: PrivacyField; label: string; description: string }[] = [
  {
    field: "show_interests",
    label: "Show my interests on my public profile",
    description: "Your learning focus areas and interest tags",
  },
  {
    field: "show_edunits_count",
    label: "Show how many ed-units I've completed",
    description: "Total, completed, and in-progress counts",
  },
  {
    field: "show_progress_pct",
    label: "Show my progress percentage on courses",
    description: "The pathway progress ring on your public profile",
  },
  {
    field: "show_planned_units",
    label: "Show courses I'm planning to take",
    description: "Planned items in your learning record",
  },
  {
    field: "show_learning_record",
    label: "Show my full learning record",
    description: "All courses, certifications, and experiences",
  },
];

function PrivacySection({
  initialSettings,
}: {
  initialSettings: PrivacySettings;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [savingField, setSavingField] = useState<PrivacyField | null>(null);
  const [, startTransition] = useTransition();

  function handleToggle(field: PrivacyField, value: boolean) {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setSavingField(field);
    startTransition(async () => {
      await updatePrivacySettingAction(field, value);
      setSavingField(null);
    });
  }

  return (
    <SectionCard
      title="Privacy"
      description="Control what others can see on your public profile. All fields are hidden by default."
    >
      <ul className="divide-y divide-gray-50">
        {PRIVACY_FIELDS.map(({ field, label, description }) => (
          <li key={field} className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#323031]">{label}</p>
              <p className="mt-0.5 text-xs text-[#323031]/50">{description}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {savingField === field && (
                <span className="text-[10px] font-medium text-[#177e89]">Saved</span>
              )}
              <Toggle
                enabled={settings[field]}
                onChange={(v) => handleToggle(field, v)}
                disabled={savingField === field}
              />
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Billing section
// ---------------------------------------------------------------------------

const FREE_FEATURES = [
  "Create your learner profile",
  "Add and display ed-units",
  "Access community & musings",
  "Basic progress tracking",
  "Limited AI use (5 prompts/day)",
];

const SUBSCRIBER_FEATURES = [
  "Everything in Free, plus:",
  "Full AI pathway builder & guidance",
  "Exclusive deals on courses & certs",
  "Cap & gown celebration events",
  "Premium profile badge & visibility",
];

const FOUNDING_FEATURES = [
  "Everything in Subscriber, forever",
  "Locked-in founding member pricing",
  "Founding member badge on profile",
  "Early access to all new features",
];

const FOUNDING_SPOTS_TOTAL = 1000;

function Check() {
  return <span className="mr-2 shrink-0 text-[#177e89]">✓</span>;
}

function PricingTable() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [, startCheckout] = useTransition();

  function checkout(plan: Plan) {
    startCheckout(async () => {
      const result = await createCheckoutSessionAction(plan);
      if (result.url) window.location.href = result.url;
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* FREE */}
      <div className="flex flex-col rounded-xl border border-gray-200 bg-gray-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#323031]/50">Free</p>
        <p className="mt-2 text-2xl font-bold text-[#323031]">$0</p>
        <p className="text-xs text-[#323031]/40">Always free</p>
        <ul className="mt-5 flex-1 space-y-2 text-sm text-[#323031]/70">
          {FREE_FEATURES.map((f) => (
            <li key={f} className="flex items-start">
              <Check />
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <span className="block w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-center text-sm font-medium text-[#323031]/40">
            Current plan
          </span>
        </div>
      </div>

      {/* SUBSCRIBER */}
      <div className="flex flex-col overflow-hidden rounded-xl border-2 border-[#177e89] bg-white shadow-md">
        <div className="bg-[#177e89] py-1.5 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white">
            Most popular
          </span>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#177e89]">Subscriber</p>
          <div className="mt-2">
            <p className="text-2xl font-bold text-[#323031]">
              {billing === "monthly" ? "$24.49" : "$18.33"}
              <span className="text-sm font-normal text-[#323031]/50">/mo</span>
            </p>
            {billing === "annual" && (
              <p className="text-xs text-[#323031]/50">$220 billed annually — save 25%</p>
            )}
            {billing === "monthly" && (
              <p className="text-xs text-[#323031]/50">billed monthly</p>
            )}
          </div>

          {/* Billing toggle */}
          <div className="mt-3 flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs font-medium">
            <button
              onClick={() => setBilling("monthly")}
              className={`flex-1 rounded-md px-3 py-1.5 transition-colors ${
                billing === "monthly"
                  ? "bg-white text-[#323031] shadow-sm"
                  : "text-[#323031]/50 hover:text-[#323031]/80"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`flex-1 rounded-md px-3 py-1.5 transition-colors ${
                billing === "annual"
                  ? "bg-white text-[#323031] shadow-sm"
                  : "text-[#323031]/50 hover:text-[#323031]/80"
              }`}
            >
              Annual
            </button>
          </div>

          <ul className="mt-5 flex-1 space-y-2 text-sm text-[#323031]/70">
            {SUBSCRIBER_FEATURES.map((f) => (
              <li key={f} className="flex items-start">
                <Check />
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <button
              onClick={() => checkout(billing)}
              className="w-full rounded-lg bg-[#177e89] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#084c61]"
            >
              Subscribe
            </button>
          </div>
        </div>
      </div>

      {/* FOUNDING MEMBER */}
      <div className="flex flex-col rounded-xl border border-[#ffc857]/60 bg-[#ffc857]/5 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#b8860b]">
          Founding Member
        </p>
        <p className="mt-2 text-2xl font-bold text-[#323031]">$200</p>
        <p className="text-xs text-[#323031]/50">one-time · lifetime access</p>
        <p className="mt-1 text-xs font-medium text-[#b8860b]">
          Limited to {FOUNDING_SPOTS_TOTAL.toLocaleString()} members
        </p>
        <ul className="mt-5 flex-1 space-y-2 text-sm text-[#323031]/70">
          {FOUNDING_FEATURES.map((f) => (
            <li key={f} className="flex items-start">
              <Check />
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <button
            onClick={() => checkout("founding_member")}
            className="w-full rounded-lg bg-[#084c61] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#177e89]"
          >
            Become a Founding Member
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function BillingSection({
  plan,
  planRenewalDate,
  planCanceling,
  planCancelAt,
}: {
  plan: Plan;
  planRenewalDate: string | null;
  planCanceling: boolean;
  planCancelAt: string | null;
}) {
  const [, startPortal] = useTransition();
  const [, startCheckout] = useTransition();

  function openPortal() {
    startPortal(async () => {
      const result = await createPortalSessionAction();
      if (result.url) window.location.href = result.url;
    });
  }

  function upgrade(upgradePlan: Plan) {
    startCheckout(async () => {
      const result = await createCheckoutSessionAction(upgradePlan);
      if (result.url) window.location.href = result.url;
    });
  }

  const isSubscriber = plan === "monthly" || plan === "annual";

  return (
    <SectionCard title="Billing" description="Your current plan and membership status.">
      <div className="px-6 py-5">
        {/* Founding member */}
        {plan === "founding_member" && (
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffc857]/20 text-xl">
              ★
            </div>
            <div>
              <p className="font-semibold text-[#323031]">Founding Member</p>
              <p className="mt-0.5 text-sm text-[#323031]/50">
                Lifetime access — thank you for being part of the founding community.
              </p>
            </div>
          </div>
        )}

        {/* Active subscriber — canceling */}
        {isSubscriber && planCanceling && planCancelAt && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-semibold text-amber-900">
              Your {plan === "monthly" ? "Monthly" : "Annual"} subscription has been canceled.
            </p>
            <p className="mt-1 text-sm text-amber-800">
              You&apos;ll have full access until{" "}
              <span className="font-medium">{formatDate(planCancelAt)}</span>, then move to the
              free plan automatically.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={openPortal}
                className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-800"
              >
                Reactivate subscription
              </button>
              <button
                onClick={openPortal}
                className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-50"
              >
                Manage billing
              </button>
            </div>
          </div>
        )}

        {/* Active subscriber — healthy */}
        {isSubscriber && !planCanceling && (
          <div className="space-y-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold text-[#323031]">
                  {plan === "monthly" ? "Monthly" : "Annual"} Subscriber
                </p>
                {planRenewalDate && (
                  <p className="mt-0.5 text-sm text-[#323031]/50">
                    Next billing date: {formatDate(planRenewalDate)}
                  </p>
                )}
              </div>
              <button
                onClick={openPortal}
                className="shrink-0 self-start rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#323031] transition-colors hover:bg-gray-50"
              >
                Manage billing
              </button>
            </div>

            {/* Upgrade options */}
            <div className="space-y-2 border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-[#323031]/50">Upgrade your plan</p>
              {plan === "monthly" && (
                <button
                  onClick={() => upgrade("annual")}
                  className="flex w-full items-center justify-between rounded-lg border border-[#177e89]/30 bg-[#177e89]/5 px-4 py-3 text-left transition-colors hover:bg-[#177e89]/10"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#177e89]">Upgrade to Annual</p>
                    <p className="text-xs text-[#323031]/50">$220/yr — save 25% vs monthly</p>
                  </div>
                  <span className="text-sm text-[#177e89]">→</span>
                </button>
              )}
              <button
                onClick={() => upgrade("founding_member")}
                className="flex w-full items-center justify-between rounded-lg border border-[#ffc857]/50 bg-[#ffc857]/8 px-4 py-3 text-left transition-colors hover:bg-[#ffc857]/15"
              >
                <div>
                  <p className="text-sm font-semibold text-[#b8860b]">Become a Founding Member</p>
                  <p className="text-xs text-[#323031]/50">$200 one-time · lifetime access, locked in forever</p>
                </div>
                <span className="text-sm text-[#b8860b]">→</span>
              </button>
            </div>
          </div>
        )}

        {/* Free plan */}
        {plan === "free" && (
          <div className="space-y-6">
            <div>
              <p className="font-semibold text-[#323031]">Free plan</p>
              <p className="mt-0.5 text-sm text-[#323031]/50">
                Upgrade to unlock AI guidance, exclusive deals, and more.
              </p>
            </div>
            <PricingTable />
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Change Password section
// ---------------------------------------------------------------------------

function ChangePasswordSection() {
  const [, startTransition] = useTransition();
  const [result, setResult] = useState<{ error?: string; success?: boolean } | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const current = (form.elements.namedItem("currentPassword") as HTMLInputElement).value;
    const next = (form.elements.namedItem("newPassword") as HTMLInputElement).value;
    const confirm = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value;

    setConfirmError(null);
    setResult(null);

    if (next !== confirm) {
      setConfirmError("Passwords do not match.");
      return;
    }
    if (next.length < 8) {
      setConfirmError("New password must be at least 8 characters.");
      return;
    }

    startTransition(async () => {
      const r = await changePasswordAction(current, next);
      setResult(r);
      if (r.success) (e.target as HTMLFormElement).reset();
    });
  }

  return (
    <SectionCard title="Change Password" description="Update your account password.">
      <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#323031]">
            Current password
          </label>
          <input
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#323031] placeholder-gray-400 outline-none focus:border-[#177e89] focus:ring-1 focus:ring-[#177e89]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#323031]">
            New password
          </label>
          <input
            name="newPassword"
            type="password"
            required
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#323031] placeholder-gray-400 outline-none focus:border-[#177e89] focus:ring-1 focus:ring-[#177e89]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#323031]">
            Confirm new password
          </label>
          <input
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#323031] placeholder-gray-400 outline-none focus:border-[#177e89] focus:ring-1 focus:ring-[#177e89]"
          />
          {confirmError && (
            <p className="mt-1.5 text-xs text-rose-600">{confirmError}</p>
          )}
        </div>

        {result?.error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {result.error}
          </div>
        )}
        {result?.success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Password updated successfully.
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="rounded-lg bg-[#084c61] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#177e89]"
          >
            Update password
          </button>
        </div>
      </form>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function AccountView({
  currentUserName,
  privacySettings,
  plan,
  planRenewalDate,
  planCanceling,
  planCancelAt,
  showSuccessBanner,
  showCancelledBanner,
  unreadCount,
  unreadTidingsCount,
  pendingConnectionsCount,
}: {
  currentUserName: string;
  privacySettings: PrivacySettings;
  plan: Plan;
  planRenewalDate: string | null;
  planCanceling: boolean;
  planCancelAt: string | null;
  showSuccessBanner: boolean;
  showCancelledBanner: boolean;
  unreadCount: number;
  unreadTidingsCount: number;
  pendingConnectionsCount: number;
}) {
  const router = useRouter();

  // After Stripe redirects back with ?success=true, the webhook may still be in-flight.
  // Refresh the server component data after a short delay so the updated plan appears.
  useEffect(() => {
    if (!showSuccessBanner) return;
    const timer = setTimeout(() => router.refresh(), 2500);
    return () => clearTimeout(timer);
  }, [showSuccessBanner, router]);

  return (
    <AppShell
      currentUserName={currentUserName}
      unreadCount={unreadCount}
      unreadTidingsCount={unreadTidingsCount}
      pendingConnectionsCount={pendingConnectionsCount}
      activePage="account"
    >
      <main className="mx-auto max-w-2xl px-4 py-8">
        {showSuccessBanner && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
            {plan === "founding_member" ? (
              <>
                <p className="font-semibold text-emerald-800">
                  Welcome to the founding member community!
                </p>
                <p className="mt-0.5 text-sm text-emerald-700">
                  Your lifetime access is now active. Thanks for supporting Elikonas.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-emerald-800">You&apos;re subscribed!</p>
                <p className="mt-0.5 text-sm text-emerald-700">
                  Your subscription is now active. Welcome to the full Elikonas experience.
                </p>
              </>
            )}
          </div>
        )}
        {showCancelledBanner && !showSuccessBanner && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-sm text-amber-800">
              Purchase cancelled — you can upgrade any time.
            </p>
          </div>
        )}

        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[#323031]">Account Settings</h1>
          <p className="mt-0.5 text-sm text-[#323031]/50">
            Manage your plan, privacy, and security.
          </p>
        </div>

        <div className="space-y-5">
          <BillingSection
            plan={plan}
            planRenewalDate={planRenewalDate}
            planCanceling={planCanceling}
            planCancelAt={planCancelAt}
          />
          <PrivacySection initialSettings={privacySettings} />
          <ChangePasswordSection />
        </div>
      </main>
    </AppShell>
  );
}
