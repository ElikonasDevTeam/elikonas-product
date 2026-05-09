"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { User } from "@supabase/supabase-js";
import type { EdUnit, EdUnitStatus } from "@/types";
import { addSuggestedCourseAction } from "./actions";
import type { CatalogCourse } from "@/lib/catalog/search";
import type { ConversationSummary, DbMessage } from "./conversation-actions";
import {
  createConversationAction,
  saveMessageAction,
  deleteConversationAction,
  updateConversationTitleAction,
  fetchConversationMessagesAction,
} from "./conversation-actions";
import { AppShell } from "@/app/components/app-shell";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_PROMPTS = [
  "What should I learn next?",
  "Am I on track for my goals?",
  "How long until I'm job-ready?",
];

const STATUS_DOT: Record<EdUnitStatus, string> = {
  completed: "bg-emerald-400",
  in_progress: "bg-[#177e89]",
  planned: "bg-gray-300",
};

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
    </svg>
  );
}

function EliAvatar({ size = "lg" }: { size?: "lg" | "sm" }) {
  const dim = size === "lg" ? "h-14 w-14 text-xl" : "h-7 w-7 text-xs";
  return (
    <div className={`${dim} shrink-0 flex items-center justify-center rounded-full bg-[#084c61] font-bold text-[#ffc857]`}>
      E
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <EliAvatar size="sm" />
      <div className="rounded-2xl rounded-bl-md border border-gray-100 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-br-md bg-[#084c61] px-4 py-3 text-sm leading-relaxed text-white">
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-end gap-2">
      <EliAvatar size="sm" />
      <div className="max-w-[75%] rounded-2xl rounded-bl-md border border-gray-100 bg-white px-4 py-3 text-sm leading-relaxed text-[#323031] shadow-sm">
        {message.content}
      </div>
    </div>
  );
}

function SuggestionCard({ course, onAdded }: { course: CatalogCourse; onAdded: () => void }) {
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const result = await addSuggestedCourseAction(course.title, course.provider, course.topic);
      if (!result.error) onAdded();
    });
  }

  return (
    <div className="flex flex-col justify-between gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
      <div className="min-w-0">
        <p className="text-xs font-semibold leading-snug text-[#323031]">{course.title}</p>
        <p className="mt-0.5 text-[11px] text-[#323031]/60">{course.provider}</p>
        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
          {course.duration_estimate && (
            <span className="text-[10px] text-[#323031]/40">⏱ {course.duration_estimate}</span>
          )}
          {course.cost && (
            <span className="text-[10px] text-[#323031]/40">💰 {course.cost}</span>
          )}
        </div>
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={handleAdd}
          disabled={isPending}
          className={[
            "flex-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors",
            isPending ? "cursor-not-allowed bg-[#084c61]/40" : "bg-[#084c61] hover:bg-[#177e89]",
          ].join(" ")}
        >
          {isPending ? "Adding…" : "+ Add"}
        </button>
        {course.url && (
          <a
            href={course.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-medium text-[#323031]/60 transition-colors hover:bg-gray-50"
          >
            View →
          </a>
        )}
      </div>
    </div>
  );
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
}: {
  conversation: ConversationSummary;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      role="button"
      onClick={onSelect}
      className={`group relative flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
        isActive ? "bg-[#084c61]/10" : "hover:bg-gray-50"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${isActive ? "font-medium text-[#084c61]" : "text-[#323031]"}`}>
          {conversation.title}
        </p>
        <p className="text-[11px] text-[#323031]/40">{formatRelativeDate(conversation.updated_at)}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="shrink-0 rounded p-1 text-[#323031]/30 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
        aria-label="Delete conversation"
      >
        <TrashIcon />
      </button>
    </div>
  );
}

export function AiGuideView({
  user,
  edUnits,
  suggestions,
  initialConversations,
  initialConversationId,
  initialMessages,
  unreadCount,
  unreadTidingsCount,
  pendingConnectionsCount,
}: {
  user: User;
  edUnits: EdUnit[];
  suggestions: CatalogCourse[];
  initialConversations: ConversationSummary[];
  initialConversationId: string | null;
  initialMessages: DbMessage[];
  unreadCount: number;
  unreadTidingsCount: number;
  pendingConnectionsCount: number;
}) {
  const meta = user.user_metadata ?? {};
  const fullName: string = meta.full_name || user.email || "Learner";
  const firstName = fullName.split(" ")[0];
  const interests: string[] = Array.isArray(meta.interests) ? meta.interests : [];
  const isEmpty = edUnits.length === 0;

  const normalGreetingContent = `Hi ${firstName}! I'm Eli — your education guide here on Elikonas. I know your profile and your goals, and I'm here to help you think through your next steps. What would you like to explore?`;

  const [activeConversationId, setActiveConversationId] = useState<string | null>(initialConversationId);
  const [conversations, setConversations] = useState<ConversationSummary[]>(initialConversations);
  const [messages, setMessages] = useState<Message[]>(() => {
    if (initialMessages.length > 0) {
      return initialMessages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
    }
    return isEmpty ? [] : [{ id: "initial", role: "assistant" as const, content: normalGreetingContent }];
  });
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visibleSuggestions = suggestions.filter((c) => !dismissed.has(c.id));

  const initFired = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idCounter = useRef(0);

  function nextId() {
    return `msg-${++idCounter.current}`;
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // On first visit (no existing conversations): create a conversation and show Eli's greeting.
  useEffect(() => {
    if (initFired.current || initialConversationId !== null) return;
    initFired.current = true;

    (async () => {
      const { id: convId, error } = await createConversationAction();
      if (error || !convId) {
        // Can't save — show greeting in UI only
        if (!isEmpty) setMessages([{ id: "initial", role: "assistant", content: normalGreetingContent }]);
        return;
      }

      setActiveConversationId(convId);
      setConversations([{ id: convId, title: "New conversation", updated_at: new Date().toISOString() }]);

      if (isEmpty) {
        // Personalized AI greeting for first-timers with empty records
        const assistantId = "msg-init";
        setMessages([{ id: assistantId, role: "assistant", content: "" }]);
        setIsStreaming(true);

        try {
          const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isInit: true }),
          });
          if (!response.ok || !response.body) throw new Error("Request failed");

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let accumulated = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            accumulated += decoder.decode(value, { stream: true });
            setMessages([{ id: assistantId, role: "assistant", content: accumulated }]);
          }
          accumulated += decoder.decode();
          setMessages([{ id: assistantId, role: "assistant", content: accumulated }]);
          await saveMessageAction(convId, "assistant", accumulated);
        } catch {
          const fallback = `Hi ${firstName}! I'm Eli — your education guide. What would you like to explore?`;
          setMessages([{ id: assistantId, role: "assistant", content: fallback }]);
          await saveMessageAction(convId, "assistant", fallback);
        } finally {
          setIsStreaming(false);
          inputRef.current?.focus();
        }
      } else {
        // Static greeting for users who have a learning record
        setMessages([{ id: "initial", role: "assistant", content: normalGreetingContent }]);
        await saveMessageAction(convId, "assistant", normalGreetingContent);
        inputRef.current?.focus();
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLoadConversation(convId: string) {
    if (convId === activeConversationId || isStreaming) return;
    const { messages: dbMessages, error } = await fetchConversationMessagesAction(convId);
    if (error) return;
    setActiveConversationId(convId);
    setMessages(
      (dbMessages ?? []).map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
      }))
    );
    setInput("");
    inputRef.current?.focus();
  }

  async function handleNewConversation() {
    if (isStreaming) return;
    const { id: convId, error } = await createConversationAction();
    if (error || !convId) return;

    const newConv: ConversationSummary = {
      id: convId,
      title: "New conversation",
      updated_at: new Date().toISOString(),
    };
    setActiveConversationId(convId);
    setConversations((prev) => [newConv, ...prev]);
    setMessages([{ id: nextId(), role: "assistant", content: normalGreetingContent }]);
    setInput("");
    await saveMessageAction(convId, "assistant", normalGreetingContent);
    inputRef.current?.focus();
  }

  async function handleDeleteConversation(convId: string) {
    const newList = conversations.filter((c) => c.id !== convId);
    setConversations(newList);

    if (activeConversationId === convId) {
      if (newList.length > 0) {
        const { messages: dbMessages } = await fetchConversationMessagesAction(newList[0].id);
        setActiveConversationId(newList[0].id);
        setMessages(
          (dbMessages ?? []).map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
          }))
        );
      } else {
        setActiveConversationId(null);
        setMessages([{ id: nextId(), role: "assistant", content: normalGreetingContent }]);
      }
    }

    deleteConversationAction(convId); // fire and forget — cascade handles messages
  }

  async function handleSend(overrideContent?: string) {
    const content = (overrideContent ?? input).trim();
    if (!content || isStreaming) return;

    setInput("");
    const userMsgId = nextId();
    const assistantId = nextId();

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content },
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setIsStreaming(true);

    try {
      // Ensure we have an active conversation
      let convId = activeConversationId;
      if (!convId) {
        const { id, error } = await createConversationAction();
        if (error || !id) throw new Error("Failed to create conversation");
        convId = id;
        setActiveConversationId(id);
        // Save any existing greeting before the user's first message
        const firstMsg = messages[0];
        if (firstMsg?.role === "assistant") {
          await saveMessageAction(id, "assistant", firstMsg.content);
        }
        setConversations((prev) => [
          { id, title: "New conversation", updated_at: new Date().toISOString() },
          ...prev,
        ]);
      }

      // Title from first user message
      const hasUserMessages = messages.some((m) => m.role === "user");
      await saveMessageAction(convId, "user", content);
      if (!hasUserMessages) {
        const title = content.length > 40 ? content.slice(0, 40) + "…" : content;
        updateConversationTitleAction(convId, title); // fire and forget
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, title } : c))
        );
      }

      // Stream from API — it reads full history from DB (user message already saved above)
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convId }),
      });
      if (!response.ok || !response.body) throw new Error("Request failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { id: assistantId, role: "assistant", content: accumulated },
        ]);
      }
      accumulated += decoder.decode();
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { id: assistantId, role: "assistant", content: accumulated },
      ]);

      await saveMessageAction(convId, "assistant", accumulated);

      // Bubble updated conversation to top of list
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === convId ? { ...c, updated_at: new Date().toISOString() } : c
        );
        return [...updated].sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      });
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          id: assistantId,
          role: "assistant",
          content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }

  const lastMessage = messages[messages.length - 1];
  const showTyping = isStreaming && lastMessage?.role === "assistant" && lastMessage.content === "";

  return (
    <AppShell
      currentUserName={fullName}
      unreadCount={unreadCount}
      unreadTidingsCount={unreadTidingsCount}
      pendingConnectionsCount={pendingConnectionsCount}
      activePage="ai-guide"
      fullHeight={true}
    >
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden w-72 shrink-0 flex-col border-r border-gray-100 bg-white lg:flex">
          {/* New conversation button */}
          <div className="shrink-0 border-b border-gray-100 p-3">
            <button
              onClick={handleNewConversation}
              disabled={isStreaming}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-[#084c61] transition-colors hover:bg-[#084c61]/5 disabled:opacity-40"
            >
              + New conversation
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col gap-5 p-4">

              {/* Conversation history */}
              {conversations.length > 0 && (
                <div>
                  <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-widest text-[#323031]/40">
                    History
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {conversations.map((conv) => (
                      <ConversationItem
                        key={conv.id}
                        conversation={conv}
                        isActive={conv.id === activeConversationId}
                        onSelect={() => handleLoadConversation(conv.id)}
                        onDelete={() => handleDeleteConversation(conv.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <hr className="border-gray-100" />

              {/* Eli identity */}
              <div className="flex flex-col items-center gap-2 text-center">
                <EliAvatar size="lg" />
                <div>
                  <p className="font-semibold text-[#323031]">Eli</p>
                  <div className="mt-0.5 flex items-center justify-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-xs text-[#323031]/50">Online</span>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-[#323031]/60">
                  I know your profile, your pace, and your goals. I can help you plan next steps, compare programs, or think through where you&apos;re headed.
                </p>
              </div>

              <hr className="border-gray-100" />

              {/* Suggested prompts */}
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#323031]/40">
                  Suggested
                </p>
                <div className="flex flex-col gap-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSend(prompt)}
                      disabled={isStreaming}
                      className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-left text-sm text-[#323031] transition-colors hover:border-[#177e89]/40 hover:bg-[#177e89]/5 disabled:opacity-40"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Catalog suggestion cards — sidebar, always visible when record is empty */}
              {isEmpty && visibleSuggestions.length > 0 && (
                <>
                  <hr className="border-gray-100" />
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#323031]/40">
                      Suggested starting points
                    </p>
                    <div className="flex flex-col gap-2">
                      {visibleSuggestions.map((course) => (
                        <SuggestionCard
                          key={course.id}
                          course={course}
                          onAdded={() =>
                            setDismissed((prev) => new Set([...prev, course.id]))
                          }
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Your Pathway */}
              {edUnits.length > 0 && (
                <>
                  <hr className="border-gray-100" />
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#323031]/40">
                      Your Pathway
                    </p>
                    <div className="flex flex-col gap-2">
                      {edUnits.map((unit) => (
                        <div key={unit.id} className="flex items-center gap-2.5">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[unit.status]}`} />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-[#323031]">{unit.name}</p>
                            <p className="truncate text-[10px] text-[#323031]/40">{unit.provider}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Interests */}
              {interests.length > 0 && (
                <>
                  <hr className="border-gray-100" />
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#323031]/40">
                      Interests
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {interests.map((interest) => (
                        <span
                          key={interest}
                          className="rounded-full bg-[#177e89]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#177e89]"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </aside>

        {/* Chat */}
        <div className="flex flex-1 flex-col overflow-hidden bg-gray-50">
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto flex max-w-2xl flex-col gap-4">
              {messages.map((m) =>
                m.role === "assistant" && m.content === "" && isStreaming ? null : (
                  <MessageBubble key={m.id} message={m} />
                )
              )}
              {showTyping && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4">
            <div className="mx-auto flex max-w-2xl gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask Eli anything…"
                disabled={isStreaming}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#323031] placeholder-[#323031]/40 outline-none transition-all focus:border-[#177e89] focus:ring-2 focus:ring-[#177e89]/20 disabled:opacity-50"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isStreaming}
                className="rounded-xl bg-[#084c61] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#177e89] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
