"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavUserMenu } from "./nav-user-menu";

// ── Icon components ──────────────────────────────────────────────────────────

type IconProps = { className?: string };

function PersonIcon({ className }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function SpeechBubbleIcon({ className }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SparkleIcon({ className }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" />
    </svg>
  );
}

function BellIcon({ className }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function MailIcon({ className }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function UsersIcon({ className }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function GroupsIcon({ className }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function BookIcon({ className }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function LibraryIcon({ className }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function PinIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
    </svg>
  );
}

// ── Top-nav icon button with tooltip ────────────────────────────────────────

function NavIconButton({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ComponentType<IconProps>;
  label: string;
  active: boolean;
}) {
  return (
    <div className="group relative flex h-14 flex-col items-center justify-center">
      <Link
        href={href}
        aria-label={label}
        className={[
          "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
          active ? "text-[#ffc857]" : "text-white/60 hover:text-white",
        ].join(" ")}
      >
        <Icon className="h-5 w-5" />
      </Link>
      {active && (
        <span className="absolute bottom-0 h-0.5 w-6 rounded-full bg-[#ffc857]" />
      )}
      <span className="pointer-events-none absolute top-full left-1/2 z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#323031]/90 px-2 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
        {label}
      </span>
    </div>
  );
}

// ── Top-nav badge button (notifications / tidings) ───────────────────────────

function NavBadgeButton({
  href,
  icon: Icon,
  label,
  count,
  badgeColor,
  active,
}: {
  href: string;
  icon: React.ComponentType<IconProps>;
  label: string;
  count: number;
  badgeColor: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={count > 0 ? `${label}, ${count} unread` : label}
      className={[
        "relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
        active ? "text-[#ffc857]" : "text-white/60 hover:text-white",
      ].join(" ")}
    >
      <Icon className="h-5 w-5" />
      {count > 0 && (
        <span className={`absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full ${badgeColor} px-1 text-[9px] font-bold text-white leading-none`}>
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

// ── Sidebar link ─────────────────────────────────────────────────────────────

function SidebarLink({
  href,
  icon: Icon,
  label,
  active,
  badge,
  badgeColor = "bg-amber-500",
  onClick,
}: {
  href: string;
  icon: React.ComponentType<IconProps>;
  label: string;
  active: boolean;
  badge?: number;
  badgeColor?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-[#177e89]/10 text-[#177e89]"
          : "text-[#323031]/70 hover:bg-gray-100 hover:text-[#323031]",
      ].join(" ")}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-[#177e89]" : "text-[#323031]/35"}`} />
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className={`flex h-5 min-w-5 items-center justify-center rounded-full ${badgeColor} px-1 text-[10px] font-bold text-white leading-none`}>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

// ── Public API ───────────────────────────────────────────────────────────────

export type ActivePage =
  | "profile"
  | "musings"
  | "ai-guide"
  | "groups"
  | "people"
  | "bookstore"
  | "learning-library"
  | "tidings"
  | "notifications"
  | "account"
  | "public-profile"
  | "assessment";

export function AppShell({
  currentUserName,
  unreadCount,
  unreadTidingsCount,
  pendingConnectionsCount,
  activePage,
  fullHeight = false,
  children,
}: {
  currentUserName: string;
  unreadCount: number;
  unreadTidingsCount: number;
  pendingConnectionsCount: number;
  activePage: ActivePage;
  fullHeight?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("elikonas-sidebar-pinned") === "true";
    setPinned(saved);
    if (saved) setOpen(true);
    setHydrated(true);
  }, []);

  function togglePin() {
    const next = !pinned;
    setPinned(next);
    setOpen(next);
    localStorage.setItem("elikonas-sidebar-pinned", String(next));
  }

  const visible = open || pinned;

  return (
    <div className={fullHeight ? "flex h-screen flex-col overflow-hidden" : "flex min-h-screen flex-col"}>
      {/* ── Top nav ──────────────────────────────────────────────────────── */}
      <nav className="relative z-20 shrink-0 bg-[#084c61]">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
          {/* Logo */}
          <Link href="/" className="mr-6 shrink-0" aria-label="Elikonas home">
            <img
              src="/images/logo-white.svg"
              alt="elikonas"
              className="h-7 w-auto"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
                const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (fb) fb.style.display = "block";
              }}
            />
            <span style={{ display: "none" }} className="text-lg font-bold tracking-tight text-white">
              elikonas
            </span>
          </Link>

          {/* Center: 3 primary pages */}
          <div className="flex flex-1 items-center justify-center gap-2">
            <NavIconButton
              href="/profile"
              icon={PersonIcon}
              label="My Profile"
              active={activePage === "profile" || activePage === "public-profile"}
            />
            <NavIconButton
              href="/musings"
              icon={SpeechBubbleIcon}
              label="Musings"
              active={activePage === "musings"}
            />
            <NavIconButton
              href="/ai-guide"
              icon={SparkleIcon}
              label="Eli"
              active={activePage === "ai-guide"}
            />
          </div>

          {/* Right: notifications, tidings, avatar */}
          <div className="flex shrink-0 items-center gap-0.5">
            <NavBadgeButton
              href="/notifications"
              icon={BellIcon}
              label="Notifications"
              count={unreadCount}
              badgeColor="bg-rose-500"
              active={activePage === "notifications"}
            />
            <NavBadgeButton
              href="/tidings"
              icon={MailIcon}
              label="Tidings"
              count={unreadTidingsCount}
              badgeColor="bg-[#177e89]"
              active={activePage === "tidings"}
            />
            <div className="ml-2">
              <NavUserMenu userName={currentUserName} />
            </div>
          </div>
        </div>
      </nav>

      {/* ── Page body ────────────────────────────────────────────────────── */}
      <div className={`relative flex flex-1 ${fullHeight ? "overflow-hidden" : ""}`}>
        {/* Backdrop (overlay mode only) */}
        {hydrated && visible && !pinned && (
          <div
            className="fixed inset-0 top-14 z-20 bg-black/30"
            onClick={() => setOpen(false)}
          />
        )}

        {/* Sidebar */}
        {hydrated && (
          <aside
            className={[
              "fixed bottom-0 left-0 top-14 z-30 flex w-64 flex-col bg-white shadow-xl transition-transform duration-200",
              visible ? "translate-x-0" : "-translate-x-full",
            ].join(" ")}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#323031]/35">
                Menu
              </span>
              <button
                onClick={togglePin}
                aria-label={pinned ? "Unpin sidebar" : "Pin sidebar open"}
                title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
                className={[
                  "rounded-lg p-1.5 transition-colors",
                  pinned
                    ? "text-[#177e89] hover:bg-[#177e89]/10"
                    : "text-[#323031]/35 hover:bg-gray-100 hover:text-[#323031]",
                ].join(" ")}
              >
                <PinIcon filled={pinned} className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-0.5 p-3">
              <SidebarLink
                href="/people"
                icon={UsersIcon}
                label="People"
                active={activePage === "people"}
                badge={pendingConnectionsCount}
                onClick={!pinned ? () => setOpen(false) : undefined}
              />
              <SidebarLink
                href="/groups"
                icon={GroupsIcon}
                label="Groups"
                active={activePage === "groups"}
                onClick={!pinned ? () => setOpen(false) : undefined}
              />
              <SidebarLink
                href="/bookstore"
                icon={BookIcon}
                label="Book Store"
                active={activePage === "bookstore"}
                onClick={!pinned ? () => setOpen(false) : undefined}
              />
              <SidebarLink
                href="/learning-library"
                icon={LibraryIcon}
                label="Learning Library"
                active={activePage === "learning-library"}
                onClick={!pinned ? () => setOpen(false) : undefined}
              />
            </nav>
          </aside>
        )}

        {/* Sidebar toggle tab */}
        {hydrated && !pinned && (
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            style={{ left: open ? "256px" : "0px" }}
            className="fixed top-1/2 z-40 flex h-12 w-5 -translate-y-1/2 items-center justify-center rounded-r-lg bg-[#084c61] text-white shadow-md transition-[left] duration-200 hover:bg-[#177e89]"
          >
            {open ? (
              <ChevronLeftIcon className="h-3 w-3" />
            ) : (
              <ChevronRightIcon className="h-3 w-3" />
            )}
          </button>
        )}

        {/* Main content */}
        <div
          className={[
            "flex min-w-0 flex-1 flex-col transition-[margin-left] duration-200",
            fullHeight ? "overflow-hidden" : "bg-gray-50",
            hydrated && pinned ? "ml-64" : "",
          ].join(" ")}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
