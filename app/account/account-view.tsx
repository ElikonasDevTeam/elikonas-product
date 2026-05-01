"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { NavUserMenu } from "@/app/components/nav-user-menu";
import { updatePrivacySettingAction } from "./actions";
import type { PrivacyField, PrivacySettings } from "./types";

const PRIVACY_FIELDS: {
  field: PrivacyField;
  label: string;
  description: string;
}[] = [
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

export function AccountView({
  currentUserName,
  privacySettings: initialSettings,
  unreadCount,
  unreadTidingsCount,
  pendingConnectionsCount,
}: {
  currentUserName: string;
  privacySettings: PrivacySettings;
  unreadCount: number;
  unreadTidingsCount: number;
  pendingConnectionsCount: number;
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
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-[#084c61] px-6 py-0">
        <div className="mx-auto flex max-w-4xl items-center gap-8">
          <img src="/images/logo-white.svg" alt="Elikonas" className="h-8 w-auto py-3" />
          <div className="flex items-end gap-1">
            <Link
              href="/profile"
              className="px-3 py-3.5 text-sm font-medium text-white/50 transition-colors hover:text-white/80"
            >
              My Profile
            </Link>
            <Link
              href="/ai-guide"
              className="px-3 py-3.5 text-sm font-medium text-white/50 transition-colors hover:text-white/80"
            >
              AI Guide
            </Link>
            <Link
              href="/musings"
              className="px-3 py-3.5 text-sm font-medium text-white/50 transition-colors hover:text-white/80"
            >
              Community
            </Link>
            <Link
              href="/tidings"
              className="relative px-3 py-3.5 text-sm font-medium text-white/50 transition-colors hover:text-white/80"
            >
              ✉ Tidings
              {unreadTidingsCount > 0 && (
                <span className="absolute right-0.5 top-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#177e89] px-1 text-[10px] font-bold text-white">
                  {unreadTidingsCount > 99 ? "99+" : unreadTidingsCount}
                </span>
              )}
            </Link>
            <Link
              href="/notifications"
              className="relative px-3 py-3.5 text-sm font-medium text-white/50 transition-colors hover:text-white/80"
            >
              Notifications
              {unreadCount > 0 && (
                <span className="absolute right-0.5 top-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
            <Link
              href="/people"
              className="relative px-3 py-3.5 text-sm font-medium text-white/50 transition-colors hover:text-white/80"
            >
              People
              {pendingConnectionsCount > 0 && (
                <span className="absolute right-0.5 top-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                  {pendingConnectionsCount > 99 ? "99+" : pendingConnectionsCount}
                </span>
              )}
            </Link>
          </div>
          <NavUserMenu userName={currentUserName} />
        </div>
      </nav>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[#323031]">Account Settings</h1>
          <p className="mt-0.5 text-sm text-[#323031]/50">
            Manage your profile visibility and preferences.
          </p>
        </div>

        {/* Privacy card */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-[#323031]">Privacy</h2>
            <p className="mt-0.5 text-xs text-[#323031]/50">
              Control what others can see on your public profile. All fields are hidden by default.
            </p>
          </div>

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
        </div>
      </main>
    </div>
  );
}
