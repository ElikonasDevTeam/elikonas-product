"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import type { EdUnit, EdUnitStatus } from "@/types";
import { getSuggestionsForInterests, type SuggestedCourse } from "./course-catalog";
import { addSuggestedCourseAction } from "./actions";

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

function SuggestionCard({ course }: { course: SuggestedCourse }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col justify-between gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-snug text-[#323031]">{course.name}</p>
        <p className="mt-1 text-xs text-[#323031]/60">{course.provider}</p>
        <p className="mt-1.5 text-[11px] text-[#323031]/40">⏱ {course.duration}</p>
      </div>
      <button
        onClick={() =>
          startTransition(() =>
            addSuggestedCourseAction(course.name, course.provider, course.category)
          )
        }
        disabled={isPending}
        className={[
          "w-full rounded-lg px-3 py-2 text-xs font-semibold text-white transition-colors",
          isPending
            ? "cursor-not-allowed bg-[#084c61]/40"
            : "bg-[#084c61] hover:bg-[#177e89]",
        ].join(" ")}
      >
        {isPending ? "Adding…" : "+ Add to my record"}
      </button>
    </div>
  );
}

export function AiGuideView({ user, edUnits }: { user: User; edUnits: EdUnit[] }) {
  const meta = user.user_metadata ?? {};
  const fullName: string = meta.full_name || user.email || "Learner";
  const firstName = fullName.split(" ")[0];
  const interests: string[] = Array.isArray(meta.interests) ? meta.interests : [];

  const isEmpty = edUnits.length === 0;
  const suggestions = isEmpty ? getSuggestionsForInterests(interests) : [];

  const normalGreeting: Message = {
    id: "initial",
    role: "assistant",
    content: `Hi ${firstName}! I'm Eli — your education guide here on Elikonas. I know your profile and your goals, and I'm here to help you think through your next steps. What would you like to explore?`,
  };

  const [messages, setMessages] = useState<Message[]>(isEmpty ? [] : [normalGreeting]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const initFired = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idCounter = useRef(0);

  function nextId() {
    return `msg-${++idCounter.current}`;
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showSuggestions]);

  // Fire the personalized init message once on mount when the record is empty.
  useEffect(() => {
    if (!isEmpty || initFired.current) return;
    initFired.current = true;

    const assistantId = `msg-init`;
    setMessages([{ id: assistantId, role: "assistant", content: "" }]);
    setIsStreaming(true);

    (async () => {
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
        setShowSuggestions(true);
      } catch {
        setMessages([{
          id: assistantId,
          role: "assistant",
          content: `Hi ${firstName}! I'm Eli — your education guide. I'm having a moment getting started, but I'm here to help. What would you like to explore?`,
        }]);
      } finally {
        setIsStreaming(false);
        inputRef.current?.focus();
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSend(overrideContent?: string) {
    const content = (overrideContent ?? input).trim();
    if (!content || isStreaming) return;

    setInput("");
    setShowSuggestions(false); // user has entered the conversation — hide suggestion cards

    const userMsg: Message = { id: nextId(), role: "user", content };
    const assistantId = nextId();
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "" };

    const newMessages = [...messages, userMsg];
    setMessages([...newMessages, assistantMsg]);
    setIsStreaming(true);

    const apiMessages = newMessages.map((m) => ({ role: m.role, content: m.content }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
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
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Nav */}
      <nav className="shrink-0 bg-[#084c61] px-6 py-0">
        <div className="mx-auto flex max-w-6xl items-center gap-8">
          <img src="/images/logo-white.svg" alt="Elikonas" className="h-8 w-auto py-3" />
          <div className="flex items-end gap-1">
            <Link
              href="/profile"
              className="px-3 py-3.5 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
            >
              My Profile
            </Link>
            <span className="border-b-2 border-white px-3 py-3.5 text-sm font-medium text-white">
              AI Guide
            </span>
            <span className="px-3 py-3.5 text-sm font-medium text-white/40">
              Community
            </span>
          </div>
        </div>
      </nav>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden w-72 shrink-0 flex-col overflow-y-auto border-r border-gray-100 bg-white lg:flex">
          <div className="flex flex-col gap-6 p-5">
            <div className="flex flex-col items-center gap-2 pt-1 text-center">
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

            <div>
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-[#323031]/40">
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

            {edUnits.length > 0 && (
              <>
                <hr className="border-gray-100" />
                <div>
                  <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-[#323031]/40">
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

            {interests.length > 0 && (
              <>
                <hr className="border-gray-100" />
                <div>
                  <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-[#323031]/40">
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

              {/* Course suggestion cards — shown after init message, hidden once user chats */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="pl-9">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#323031]/40">
                    Suggested starting points
                  </p>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {suggestions.map((course) => (
                      <SuggestionCard key={course.name} course={course} />
                    ))}
                  </div>
                </div>
              )}

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
    </div>
  );
}
