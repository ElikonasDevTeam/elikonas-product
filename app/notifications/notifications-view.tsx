"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { markReadAction, markAllReadAction } from "./actions";
import type { NotificationType } from "@/types";
import { NavUserMenu } from "@/app/components/nav-user-menu";

export interface NotificationData {
  id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  created_at: string;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function NotificationIcon({ type }: { type: NotificationType }) {
  const configs: Record<NotificationType, { bg: string; icon: React.ReactNode }> = {
    new_like: {
      bg: "bg-rose-50",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-rose-500">
          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
        </svg>
      ),
    },
    new_comment: {
      bg: "bg-blue-50",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-blue-500">
          <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97z" clipRule="evenodd" />
        </svg>
      ),
    },
    new_connection: {
      bg: "bg-violet-50",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-violet-500">
          <path d="M6.25 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM3.25 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM19.75 7.5a.75.75 0 00-1.5 0v2.25H16a.75.75 0 000 1.5h2.25v2.25a.75.75 0 001.5 0v-2.25H22a.75.75 0 000-1.5h-2.25V7.5z" />
        </svg>
      ),
    },
    connection_accepted: {
      bg: "bg-emerald-50",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-emerald-500">
          <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
        </svg>
      ),
    },
    system: {
      bg: "bg-[#ffc857]/20",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-[#084c61]">
          <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
        </svg>
      ),
    },
  };

  const { bg, icon } = configs[type];
  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${bg}`}>
      {icon}
    </div>
  );
}

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: NotificationData;
  onMarkRead: (id: string) => void;
}) {
  return (
    <button
      onClick={() => !notification.read && onMarkRead(notification.id)}
      className={[
        "w-full rounded-xl border px-4 py-3.5 text-left transition-colors",
        notification.read
          ? "border-gray-100 bg-white"
          : "border-[#177e89]/20 bg-[#177e89]/5 hover:bg-[#177e89]/8",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <NotificationIcon type={notification.type} />
        <div className="min-w-0 flex-1">
          <p
            className={[
              "text-sm leading-snug text-[#323031]",
              notification.read ? "font-normal" : "font-medium",
            ].join(" ")}
          >
            {notification.message}
          </p>
          <p className="mt-1 text-xs text-[#323031]/40">
            {relativeTime(notification.created_at)}
          </p>
        </div>
        {!notification.read && (
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#177e89]" />
        )}
      </div>
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#084c61]/10">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#084c61" className="h-7 w-7">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
      </div>
      <p className="font-semibold text-[#323031]">You&apos;re all caught up</p>
      <p className="max-w-xs text-sm text-[#323031]/50">
        Notifications will appear here when someone likes your musings or connects with you.
      </p>
    </div>
  );
}

export function NotificationsView({
  initialNotifications,
  unreadCount: initialUnreadCount,
  unreadTidingsCount,
  pendingConnectionsCount,
  currentUserName,
}: {
  initialNotifications: NotificationData[];
  unreadCount: number;
  unreadTidingsCount: number;
  pendingConnectionsCount: number;
  currentUserName: string;
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isPending, startTransition] = useTransition();

  const unreadCount = notifications.filter((n) => !n.read).length;

  function handleMarkRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    startTransition(async () => {
      await markReadAction(id);
    });
  }

  function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    startTransition(async () => {
      await markAllReadAction();
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-[#084c61] px-6 py-0">
        <div className="mx-auto flex max-w-4xl items-center gap-8">
          <img src="/images/logo-white.svg" alt="Elikonas" className="h-8 w-auto py-3" />
          <div className="flex items-end gap-1">
            <Link href="/profile" className="px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80 transition-colors">
              My Profile
            </Link>
            <Link href="/ai-guide" className="px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80 transition-colors">
              AI Guide
            </Link>
            <Link href="/musings" className="px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80 transition-colors">
              Community
            </Link>
            <Link href="/groups" className="px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80 transition-colors">
              Groups
            </Link>
            <Link href="/tidings" className="relative px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80 transition-colors">
              ✉ Tidings
              {unreadTidingsCount > 0 && (
                <span className="absolute right-0.5 top-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#177e89] px-1 text-[10px] font-bold text-white">
                  {unreadTidingsCount > 99 ? "99+" : unreadTidingsCount}
                </span>
              )}
            </Link>
            <span className="relative border-b-2 border-white px-3 py-3.5 text-sm font-medium text-white">
              Notifications
            </span>
            <Link href="/people" className="relative px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80 transition-colors">
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
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#323031]">Notifications</h1>
            {unreadCount > 0 && (
              <p className="mt-0.5 text-sm text-[#323031]/50">
                {unreadCount} unread
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={isPending}
              className="rounded-lg border border-gray-200 px-3.5 py-2 text-xs font-medium text-[#323031] transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* List */}
        {notifications.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onMarkRead={handleMarkRead}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
