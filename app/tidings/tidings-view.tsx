"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { sendMessageAction, startThreadAction, markThreadReadAction } from "./actions";
import { NavUserMenu } from "@/app/components/nav-user-menu";

export interface ThreadData {
  id: string;
  other_user_id: string;
  other_user_name: string;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface MessageData {
  id: string;
  thread_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read: boolean;
  created_at: string;
}

interface ProfileResult {
  id: string;
  full_name: string | null;
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

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const dim =
    size === "lg"
      ? "h-10 w-10 text-sm"
      : size === "md"
      ? "h-8 w-8 text-xs"
      : "h-6 w-6 text-[10px]";
  return (
    <div
      className={`${dim} shrink-0 flex items-center justify-center rounded-full bg-[#084c61] font-bold text-[#ffc857]`}
    >
      {initials(name)}
    </div>
  );
}

function ThreadItem({
  thread,
  isActive,
  onClick,
}: {
  thread: ThreadData;
  isActive: boolean;
  onClick: () => void;
}) {
  const hasUnread = thread.unread_count > 0;
  return (
    <button
      onClick={onClick}
      className={[
        "w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
        isActive ? "bg-[#084c61]/10" : "hover:bg-gray-50",
      ].join(" ")}
    >
      <Avatar name={thread.other_user_name} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <p
            className={[
              "truncate text-sm",
              hasUnread ? "font-semibold text-[#323031]" : "font-medium text-[#323031]",
            ].join(" ")}
          >
            {thread.other_user_name}
          </p>
          <span className="shrink-0 text-[11px] text-[#323031]/40">
            {relativeTime(thread.last_message_at)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <p
            className={[
              "truncate text-xs",
              hasUnread ? "font-medium text-[#323031]" : "text-[#323031]/50",
            ].join(" ")}
          >
            {thread.last_message_preview ?? "No messages yet"}
          </p>
          {hasUnread && (
            <span className="shrink-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#177e89] px-1 text-[10px] font-bold text-white">
              {thread.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function MessageBubble({
  message,
  isOwn,
}: {
  message: MessageData;
  isOwn: boolean;
}) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isOwn
            ? "rounded-br-sm bg-[#084c61] text-white"
            : "rounded-bl-sm border border-gray-100 bg-white text-[#323031] shadow-sm",
        ].join(" ")}
      >
        <p>{message.body}</p>
        <p
          className={`mt-1 text-[10px] ${
            isOwn ? "text-white/50" : "text-[#323031]/40"
          }`}
        >
          {relativeTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}

function NoThreadsState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
      <span className="text-4xl">✉</span>
      <p className="text-sm font-semibold text-[#323031]">No tidings yet</p>
      <p className="text-xs leading-relaxed text-[#323031]/50">
        Send your first tiding to a fellow learner.
      </p>
      <button
        onClick={onNew}
        className="mt-1 rounded-lg bg-[#084c61] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#177e89]"
      >
        Start a new tiding
      </button>
    </div>
  );
}

function NoConversationState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="text-5xl">✉</span>
      <p className="font-semibold text-[#323031]">Select a tiding</p>
      <p className="max-w-xs text-sm text-[#323031]/50">
        Choose a conversation from the left, or start a new tiding.
      </p>
    </div>
  );
}

export function TidingsView({
  initialThreads,
  currentUserId,
  currentUserName,
  unreadNotificationsCount,
  pendingConnectionsCount,
}: {
  initialThreads: ThreadData[];
  currentUserId: string;
  currentUserName: string;
  unreadNotificationsCount: number;
  pendingConnectionsCount: number;
}) {
  const [threads, setThreads] = useState(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProfileResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [, startTransition] = useTransition();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime subscription for active thread
  useEffect(() => {
    if (!activeThreadId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`tidings:${activeThreadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tidings_messages",
          filter: `thread_id=eq.${activeThreadId}`,
        },
        (payload) => {
          const msg = payload.new as MessageData;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          setThreads((prev) =>
            prev.map((t) =>
              t.id === activeThreadId
                ? {
                    ...t,
                    last_message_preview: msg.body,
                    last_message_at: msg.created_at,
                  }
                : t
            )
          );
          if (msg.recipient_id === currentUserId) {
            startTransition(() => markThreadReadAction(activeThreadId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeThreadId, currentUserId]);

  // Debounced user search
  useEffect(() => {
    if (!showSearch || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .ilike("full_name", `%${searchQuery.trim()}%`)
        .neq("id", currentUserId)
        .limit(8);
      setSearchResults((data ?? []) as ProfileResult[]);
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, showSearch, currentUserId]);

  // Focus search when opened
  useEffect(() => {
    if (showSearch) searchRef.current?.focus();
  }, [showSearch]);

  async function selectThread(threadId: string) {
    if (threadId === activeThreadId) return;
    setActiveThreadId(threadId);
    setMessages([]);
    setMessagesLoading(true);

    const supabase = createClient();
    const { data } = await supabase
      .from("tidings_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    setMessages((data ?? []) as MessageData[]);
    setMessagesLoading(false);

    // Optimistic unread clear
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, unread_count: 0 } : t))
    );
    startTransition(() => markThreadReadAction(threadId));
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function handleSend() {
    const body = inputValue.trim();
    if (!body || !activeThreadId || sending) return;
    setSending(true);
    setInputValue("");

    const { message, error } = await sendMessageAction(activeThreadId, body);
    if (error) console.error("[TidingsView] send error:", error);

    if (message) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeThreadId
            ? {
                ...t,
                last_message_preview: body,
                last_message_at: message.created_at,
              }
            : t
        )
      );
    }

    setSending(false);
    inputRef.current?.focus();
  }

  async function handleStartThread(profile: ProfileResult) {
    const name = profile.full_name || "Unknown";
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);

    const { threadId, error } = await startThreadAction(profile.id);
    if (error || !threadId) {
      console.error("[TidingsView] start thread error:", error);
      return;
    }

    if (!threads.find((t) => t.id === threadId)) {
      setThreads((prev) => [
        {
          id: threadId,
          other_user_id: profile.id,
          other_user_name: name,
          last_message_preview: null,
          last_message_at: null,
          unread_count: 0,
        },
        ...prev,
      ]);
    }

    await selectThread(threadId);
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Nav */}
      <nav className="shrink-0 bg-[#084c61] px-6 py-0">
        <div className="mx-auto flex max-w-7xl items-center gap-8">
          <img
            src="/images/logo-white.svg"
            alt="Elikonas"
            className="h-8 w-auto py-3"
          />
          <div className="flex items-end gap-1">
            <Link
              href="/profile"
              className="px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
            >
              My Profile
            </Link>
            <Link
              href="/ai-guide"
              className="px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
            >
              AI Guide
            </Link>
            <Link
              href="/musings"
              className="px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
            >
              Community
            </Link>
            <span className="border-b-2 border-white px-3 py-3.5 text-sm font-medium text-white">
              ✉ Tidings
            </span>
            <Link
              href="/notifications"
              className="relative px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
            >
              Notifications
              {unreadNotificationsCount > 0 && (
                <span className="absolute right-0.5 top-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
                </span>
              )}
            </Link>
            <Link
              href="/people"
              className="relative px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
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

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — thread list */}
        <aside className="flex w-80 shrink-0 flex-col border-r border-gray-200 bg-white">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5">
            <h2 className="font-semibold text-[#323031]">✉ Tidings</h2>
            <button
              onClick={() => setShowSearch((v) => !v)}
              className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-[#323031] transition-colors hover:bg-gray-50"
            >
              {showSearch ? "Cancel" : "New +"}
            </button>
          </div>

          {/* Search panel */}
          {showSearch && (
            <div className="border-b border-gray-100 p-3">
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search learners by name…"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-[#323031] placeholder-[#323031]/40 outline-none focus:border-[#177e89] focus:bg-white focus:ring-2 focus:ring-[#177e89]/20"
              />
              {searchLoading && (
                <p className="mt-2 px-1 text-xs text-[#323031]/40">Searching…</p>
              )}
              {!searchLoading && searchResults.length > 0 && (
                <div className="mt-2 flex flex-col gap-0.5">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleStartThread(p)}
                      className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-50"
                    >
                      <Avatar name={p.full_name || "?"} size="sm" />
                      <span className="text-sm text-[#323031]">
                        {p.full_name || "Unknown"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {!searchLoading &&
                searchQuery.trim() &&
                searchResults.length === 0 && (
                  <p className="mt-2 px-1 text-xs text-[#323031]/40">
                    No learners found.
                  </p>
                )}
            </div>
          )}

          {/* Thread list */}
          <div className="flex-1 overflow-y-auto p-2">
            {threads.length === 0 && !showSearch ? (
              <NoThreadsState onNew={() => setShowSearch(true)} />
            ) : (
              threads.map((t) => (
                <ThreadItem
                  key={t.id}
                  thread={t}
                  isActive={t.id === activeThreadId}
                  onClick={() => selectThread(t.id)}
                />
              ))
            )}
          </div>
        </aside>

        {/* Right panel — active conversation */}
        <div className="flex flex-1 flex-col overflow-hidden bg-gray-50">
          {!activeThread ? (
            <NoConversationState />
          ) : (
            <>
              {/* Conversation header */}
              <div className="shrink-0 flex items-center gap-3 border-b border-gray-200 bg-white px-5 py-4 shadow-sm">
                <Avatar name={activeThread.other_user_name} size="lg" />
                <div>
                  <p className="font-semibold text-[#323031]">
                    {activeThread.other_user_name}
                  </p>
                  <p className="text-xs text-[#323031]/40">Learner</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex gap-1.5">
                      {[0, 150, 300].map((d) => (
                        <span
                          key={d}
                          className="h-2 w-2 rounded-full bg-gray-300 animate-bounce"
                          style={{ animationDelay: `${d}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-16 text-center">
                    <span className="text-4xl">✉</span>
                    <p className="text-sm font-semibold text-[#323031]">
                      Start the tiding
                    </p>
                    <p className="text-xs text-[#323031]/50">
                      Send your first message to{" "}
                      {activeThread.other_user_name}.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {messages.map((m) => (
                      <MessageBubble
                        key={m.id}
                        message={m}
                        isOwn={m.sender_id === currentUserId}
                      />
                    ))}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="shrink-0 border-t border-gray-200 bg-white px-5 py-4">
                <div className="flex gap-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={`Tiding to ${activeThread.other_user_name}…`}
                    disabled={sending}
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#323031] placeholder-[#323031]/40 outline-none transition-all focus:border-[#177e89] focus:ring-2 focus:ring-[#177e89]/20 disabled:opacity-50"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || sending}
                    className="rounded-xl bg-[#084c61] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#177e89] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {sending ? "…" : "Send"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
