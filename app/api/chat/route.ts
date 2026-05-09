import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic, CLAUDE_MODEL } from "@/lib/anthropic/client";
import { searchCatalog } from "@/lib/catalog/search";
import type { EdUnit } from "@/types";

const GOAL_LABELS: Record<string, string> = {
  "career-change": "career change — moving into a new field",
  "skill-building": "skill building — growing within their current path",
  "degree-completion": "degree completion — finishing what they started",
  "exploring": "exploring — not sure of direction yet",
};

function buildSystemPrompt(
  fullName: string,
  goal: string | null,
  interests: string[],
  edUnits: EdUnit[]
): string {
  const firstName = fullName.split(" ")[0];

  const record =
    edUnits.length > 0
      ? edUnits
          .map((u) => {
            const statusLabel =
              u.status === "in_progress"
                ? `in progress (${u.progress_pct}% complete)`
                : u.status;
            return `• "${u.name}" by ${u.provider} — ${u.category} — ${statusLabel}`;
          })
          .join("\n")
      : "No learning recorded yet.";

  return `You are Eli, a warm and knowledgeable education guide on Elikonas — an AI-powered marketplace built for non-traditional learners.

You are speaking with ${firstName} (full name: ${fullName}).
${goal ? `Their primary goal: ${GOAL_LABELS[goal] ?? goal}` : "They haven't set a primary goal yet."}
${interests.length > 0 ? `Their interests: ${interests.join(", ")}` : "They haven't selected interests yet."}

Their learning record:
${record}

Respond in a warm, encouraging, and specific tone. Every response must be 3 to 5 sentences of plain conversational prose. Never use markdown, bullet points, numbered lists, headers, asterisks, dashes as list markers, or any special formatting — write in flowing paragraphs only. Reference their specific courses, progress percentage, and goals whenever relevant to make the advice feel personal and grounded.`;
}

function buildInitSystemPrompt(
  fullName: string,
  goal: string | null,
  interests: string[]
): string {
  const firstName = fullName.split(" ")[0];
  const goalLabel = goal ? GOAL_LABELS[goal] ?? goal : null;

  return `You are Eli, a warm and knowledgeable education guide on Elikonas — an AI-powered marketplace built for non-traditional learners.

You are greeting ${firstName} for the very first time. They have just joined Elikonas and have not yet added any learning to their record.
${goalLabel ? `Their primary goal: ${goalLabel}` : "They haven't stated a primary goal yet."}
${interests.length > 0 ? `Their interests: ${interests.join(", ")}` : "They haven't selected interests yet."}

Write a warm, personal opening message of exactly 2 to 3 sentences. Reference their specific goal and at least one of their interests by name so it feels genuinely tailored to them. End by telling them you've hand-picked some courses to get them started — but do NOT name any specific courses; those will be shown separately as interactive cards. Write in plain flowing prose only — no markdown, no bullet points, no formatting of any kind.`;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { messages: rawMessages, isInit = false, conversationId } = body;

  const meta = user.user_metadata ?? {};
  const fullName: string = meta.full_name || user.email || "Learner";
  const goal: string | null = meta.goal ?? null;
  const interests: string[] = Array.isArray(meta.interests) ? meta.interests : [];

  console.log("[chat/route] user:", user.id, "| isInit:", isInit, "| conversationId:", conversationId, "| goal:", goal, "| interests:", interests, "| fullName:", fullName);

  let systemPrompt: string;
  let anthropicMessages: { role: "user" | "assistant"; content: string }[];

  if (isInit) {
    systemPrompt = buildInitSystemPrompt(fullName, goal, interests);
    anthropicMessages = [{ role: "user", content: "Please introduce yourself." }];
  } else {
    const { data: edUnits } = await supabase
      .from("ed_units")
      .select("*")
      .eq("user_id", user.id);

    systemPrompt = buildSystemPrompt(
      fullName,
      goal,
      interests,
      (edUnits ?? []) as EdUnit[]
    );

    if (conversationId) {
      // Fetch full conversation history from DB — this is the source of truth
      const { data: dbMessages } = await supabase
        .from("eli_messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      anthropicMessages = (dbMessages ?? []) as { role: "user" | "assistant"; content: string }[];
    } else {
      const messages = rawMessages ?? [];
      if (!messages.length) {
        return NextResponse.json({ error: "No messages or conversationId provided" }, { status: 400 });
      }
      anthropicMessages = messages;
    }
  }

  // Inject catalog context into the system prompt
  try {
    const lastUserContent = isInit
      ? ""
      : (anthropicMessages.filter((m) => m.role === "user").at(-1)?.content ?? "");
    const catalogCourses = await searchCatalog(lastUserContent, interests, 5);
    if (catalogCourses.length > 0) {
      const lines = catalogCourses.map((c) => {
        const parts: string[] = [`"${c.title}" by ${c.provider}`, c.topic];
        if (c.duration_estimate) parts.push(c.duration_estimate);
        if (c.cost) parts.push(c.cost);
        if (c.url) parts.push(c.url);
        return `• ${parts.join(" — ")}`;
      });
      systemPrompt += `\n\nRELEVANT COURSES FROM THE ELIKONAS CATALOG:\nWhen recommending specific courses, prefer these currently available options — use their exact titles and providers:\n${lines.join("\n")}`;
    }
  } catch (err) {
    console.error("[chat/route] catalog search error (non-fatal):", err);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log("[chat/route] calling Anthropic | model:", CLAUDE_MODEL, "| messages:", anthropicMessages.length);
        const messageStream = anthropic.messages.stream({
          model: CLAUDE_MODEL,
          max_tokens: 512,
          system: systemPrompt,
          messages: anthropicMessages,
        });

        for await (const chunk of messageStream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } catch (error) {
        console.error("[chat/route] Anthropic stream error:", error);
        controller.enqueue(
          encoder.encode("I'm having a moment — could you try asking that again?")
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
