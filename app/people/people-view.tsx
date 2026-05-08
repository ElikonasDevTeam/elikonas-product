"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { connectAction, acceptConnectionAction, declineConnectionAction } from "./actions";
import { AppShell } from "@/app/components/app-shell";

export interface ConnectionData {
  id: string;
  other_user_id: string;
  other_user_name: string;
  interests: string[];
  connection_type: string | null;
  created_at: string;
}

export interface IncomingRequestData {
  id: string;
  requester_id: string;
  requester_name: string;
  interests: string[];
  created_at: string;
}

interface SearchResult {
  id: string;
  full_name: string | null;
  interests: string[];
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const dim =
    size === "lg"
      ? "h-12 w-12 text-base"
      : size === "md"
      ? "h-10 w-10 text-sm"
      : "h-8 w-8 text-xs";
  return (
    <div
      className={`${dim} shrink-0 flex items-center justify-center rounded-full bg-[#084c61] font-bold text-[#ffc857]`}
    >
      {initials(name)}
    </div>
  );
}

function PersonCard({
  userId,
  name,
  interests,
  connectionType,
  footer,
}: {
  userId: string;
  name: string;
  interests: string[];
  connectionType?: string | null;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Link href={`/profile/${userId}`}>
          <Avatar name={name} size="lg" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={`/profile/${userId}`}
            className="block truncate font-semibold text-[#323031] transition-colors hover:text-[#177e89]"
          >
            {name}
          </Link>
          {connectionType ? (
            <span className="mt-0.5 inline-block rounded-full bg-[#177e89]/10 px-2 py-0.5 text-[11px] font-medium text-[#177e89]">
              {connectionType}
            </span>
          ) : interests.length > 0 ? (
            <p className="mt-0.5 truncate text-xs text-[#323031]/50">
              {interests.slice(0, 3).join(" · ")}
            </p>
          ) : null}
        </div>
      </div>
      {footer}
    </div>
  );
}

export function PeopleView({
  initialConnections,
  incomingRequests: initialIncomingRequests,
  outgoingRequestUserIds: initialOutgoingIds,
  currentUserId,
  currentUserName,
  unreadNotificationsCount,
  unreadTidingsCount,
}: {
  initialConnections: ConnectionData[];
  incomingRequests: IncomingRequestData[];
  outgoingRequestUserIds: string[];
  currentUserId: string;
  currentUserName: string;
  unreadNotificationsCount: number;
  unreadTidingsCount: number;
}) {
  const [connections, setConnections] = useState(initialConnections);
  const [incomingRequests, setIncomingRequests] = useState(initialIncomingRequests);
  const [outgoingIds, setOutgoingIds] = useState(
    () => new Set(initialOutgoingIds)
  );
  const [connectedIds, setConnectedIds] = useState(
    () => new Set(initialConnections.map((c) => c.other_user_id))
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, interests")
        .neq("id", currentUserId)
        .ilike("full_name", `%${searchQuery.trim()}%`)
        .limit(20);
      setSearchResults(
        (data ?? []).map((p) => ({
          id: p.id,
          full_name: p.full_name ?? null,
          interests: Array.isArray(p.interests) ? p.interests : [],
        }))
      );
      setIsSearching(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, currentUserId]);

  function handleConnect(userId: string) {
    setOutgoingIds((prev) => new Set([...prev, userId]));
    startTransition(async () => {
      await connectAction(userId);
    });
  }

  function handleAccept(req: IncomingRequestData) {
    setIncomingRequests((prev) => prev.filter((r) => r.id !== req.id));
    const newConn: ConnectionData = {
      id: req.id,
      other_user_id: req.requester_id,
      other_user_name: req.requester_name,
      interests: req.interests,
      connection_type: null,
      created_at: new Date().toISOString(),
    };
    setConnections((prev) => [newConn, ...prev]);
    setConnectedIds((prev) => new Set([...prev, req.requester_id]));
    startTransition(async () => {
      await acceptConnectionAction(req.id);
    });
  }

  function handleDecline(reqId: string) {
    setIncomingRequests((prev) => prev.filter((r) => r.id !== reqId));
    startTransition(async () => {
      await declineConnectionAction(reqId);
    });
  }

  const pendingCount = incomingRequests.length;

  return (
    <AppShell
      currentUserName={currentUserName}
      unreadCount={unreadNotificationsCount}
      unreadTidingsCount={unreadTidingsCount}
      pendingConnectionsCount={pendingCount}
      activePage="people"
    >
      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[#323031]">People</h1>
          {pendingCount > 0 && (
            <p className="mt-0.5 text-sm text-[#323031]/50">
              {pendingCount} pending connection {pendingCount === 1 ? "request" : "requests"}
            </p>
          )}
        </div>

        {/* Incoming Requests */}
        {incomingRequests.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#323031]/40">
              Connection Requests
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {incomingRequests.map((req) => (
                <PersonCard
                  key={req.id}
                  userId={req.requester_id}
                  name={req.requester_name}
                  interests={req.interests}
                  footer={
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(req)}
                        className="flex-1 rounded-lg bg-[#084c61] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#177e89]"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleDecline(req.id)}
                        className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#323031]/60 transition-colors hover:bg-gray-50"
                      >
                        Decline
                      </button>
                    </div>
                  }
                />
              ))}
            </div>
          </section>
        )}

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#323031]/30"
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                clipRule="evenodd"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people by name…"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-[#323031] placeholder-[#323031]/40 shadow-sm outline-none transition-all focus:border-[#177e89] focus:ring-2 focus:ring-[#177e89]/20"
            />
          </div>
        </div>

        {/* Search Results or Connections Grid */}
        {searchQuery.trim() ? (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#323031]/40">
              {isSearching
                ? "Searching…"
                : searchResults.length === 0
                ? "No results"
                : "Search results"}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {searchResults.map((result) => {
                const isConnected = connectedIds.has(result.id);
                const isPendingOut = outgoingIds.has(result.id);
                const displayName = result.full_name || "Unknown";
                return (
                  <PersonCard
                    key={result.id}
                    userId={result.id}
                    name={displayName}
                    interests={result.interests}
                    footer={
                      isConnected ? (
                        <span className="flex items-center justify-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-[#323031]/40">
                          Connected
                        </span>
                      ) : isPendingOut ? (
                        <span className="flex items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
                          Pending
                        </span>
                      ) : (
                        <button
                          onClick={() => handleConnect(result.id)}
                          className="rounded-lg bg-[#084c61] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#177e89]"
                        >
                          Connect
                        </button>
                      )
                    }
                  />
                );
              })}
            </div>
          </section>
        ) : (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#323031]/40">
              Your Connections{connections.length > 0 ? ` (${connections.length})` : ""}
            </h2>
            {connections.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#084c61]/5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-6 w-6 text-[#084c61]/40"
                  >
                    <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-[#323031]">No connections yet</p>
                <p className="mt-1 text-sm text-[#323031]/50">
                  Search for people above to get started.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {connections.map((conn) => (
                  <PersonCard
                    key={conn.id}
                    userId={conn.other_user_id}
                    name={conn.other_user_name}
                    interests={conn.interests}
                    connectionType={conn.connection_type}
                    footer={
                      <Link
                        href="/tidings"
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-[#323031]/60 transition-colors hover:border-[#177e89]/30 hover:text-[#177e89]"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-3.5 w-3.5"
                        >
                          <path d="M3.505 2.365A41.369 41.369 0 019 2c1.863 0 3.697.124 5.495.365 1.247.167 2.18 1.108 2.435 2.268a4.45 4.45 0 00-.577-.069 43.141 43.141 0 00-4.706 0C9.229 4.696 7.5 6.727 7.5 8.998v2.24c0 1.413.67 2.735 1.76 3.562l-2.98 2.98A.75.75 0 015 17.25v-3.443c-.501-.048-1-.106-1.495-.172C2.033 13.438 1 12.162 1 10.72V5.28c0-1.441 1.033-2.717 2.505-2.914z" />
                          <path d="M14 6c-.762 0-1.52.02-2.271.062C10.157 6.148 9 7.472 9 8.998v2.24c0 1.519 1.141 2.841 2.705 2.93.757.043 1.519.063 2.295.063h.5c.952 0 1.8.201 2.5.4V16.25a.75.75 0 01-1.28.53l-2.98-2.98A20.614 20.614 0 0114 13.5h.5c1.33 0 2.167-1.387 2.167-2.75V8.998C16.667 7.472 15.51 6.148 14 6.063A41.369 41.369 0 0014 6z" />
                        </svg>
                        Message
                      </Link>
                    }
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </AppShell>
  );
}
