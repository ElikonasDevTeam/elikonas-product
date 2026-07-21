import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic, CLAUDE_MODEL } from "@/lib/anthropic/client";
import { searchCatalog } from "@/lib/catalog/search";
import type { EdUnit } from "@/types";
import type { RIASECScores } from "@/types/onet";

const GOAL_LABELS: Record<string, string> = {
  "career-change": "career change — moving into a new field",
  "skill-building": "skill building — growing within their current path",
  "degree-completion": "degree completion — finishing what they started",
  "exploring": "exploring — not sure of direction yet",
};

const RIASEC_NAMES: Record<keyof RIASECScores, string> = {
  realistic:     "Realistic",
  investigative: "Investigative",
  artistic:      "Artistic",
  social:        "Social",
  enterprising:  "Enterprising",
  conventional:  "Conventional",
};

interface AssessmentContext {
  scores: RIASECScores;
  completedAt: string;
}

function buildAssessmentSection(assessment: AssessmentContext | null): string {
  if (!assessment) {
    return `This user has NOT completed the O*NET Interest Profiler assessment. If the conversation touches on career interests, learning goals, or pathway planning within the first 2–3 exchanges, introduce it naturally once using this framing: "There's a free, research-backed interest assessment from the U.S. Department of Labor that takes about 10 minutes and helps me give you much better pathway suggestions. Want to try it now? You can find it under Profile → Career Interests, or I can take you there directly." Introduce it once when relevant, then move on — don't repeat it every turn.
When drawing inferences about the user's interests from conversation alone, always use hedged language like "it sounds like you might enjoy..." or "based on what you've shared..." — never present your conversational read with the same authority as a validated assessment result.`;
  }

  const sorted = (Object.entries(assessment.scores) as [keyof RIASECScores, number][])
    .sort(([, a], [, b]) => b - a);
  const top3 = sorted.slice(0, 3);
  const rank = ["Top", "Second", "Third"] as const;
  const scoresText = top3
    .map(([key, score], i) => `- ${rank[i]} interest area: ${RIASEC_NAMES[key]} (score: ${score}/50)`)
    .join("\n");

  const monthsSince =
    (Date.now() - new Date(assessment.completedAt).getTime()) / (1000 * 60 * 60 * 24 * 30);
  const isStale = monthsSince >= 12;

  return `The user's O*NET Interest Profiler results (validated, research-backed):
${scoresText}
Use these to inform pathway recommendations. Reference them naturally when relevant — don't open every response with them. When drawing on these validated results you may say "your assessment showed..." or "based on your O*NET results...". This is linguistically distinct from conversational inferences, which must use hedged language like "it sounds like..." or "based on what you've shared..." — never present your own read of the conversation with the same authority as the validated scores.${
    isStale
      ? "\nTheir assessment was completed over a year ago. If they mention a career change, new direction, or shifting goals, gently suggest that retaking it could sharpen your recommendations."
      : ""
  }
If they ask about retaking the assessment, tell them it's available under Profile → Career Interests.`;
}

function buildSystemPrompt(
  fullName: string,
  goal: string | null,
  interests: string[],
  edUnits: EdUnit[],
  assessment: AssessmentContext | null
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

${buildAssessmentSection(assessment)}

Their learning record:
${record}

Respond in a warm, encouraging, and specific tone. Every response must be 3 to 5 sentences of plain conversational prose. Never use markdown, bullet points, numbered lists, headers, asterisks, dashes as list markers, or any special formatting — write in flowing paragraphs only. Reference their specific courses, progress percentage, and goals whenever relevant to make the advice feel personal and grounded.`;
}

function buildInitSystemPrompt(
  fullName: string,
  goal: string | null,
  interests: string[],
  assessment: AssessmentContext | null
): string {
  const firstName = fullName.split(" ")[0];
  const goalLabel = goal ? GOAL_LABELS[goal] ?? goal : null;

  return `You are Eli, a warm and knowledgeable education guide on Elikonas — an AI-powered marketplace built for non-traditional learners.

You are greeting ${firstName} for the very first time. They have just joined Elikonas and have not yet added any learning to their record.
${goalLabel ? `Their primary goal: ${goalLabel}` : "They haven't stated a primary goal yet."}
${interests.length > 0 ? `Their interests: ${interests.join(", ")}` : "They haven't selected interests yet."}

${buildAssessmentSection(assessment)}

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

  // Fetch assessment context for both init and regular paths
  const { data: assessmentRow } = await supabase
    .from("assessment_sessions")
    .select(
      "realistic_score, investigative_score, artistic_score, social_score, enterprising_score, conventional_score, completed_at"
    )
    .eq("user_id", user.id)
    .not("completed_at", "is", null)
    .not("realistic_score", "is", null)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const assessmentContext: AssessmentContext | null =
    assessmentRow?.realistic_score != null
      ? {
          scores: {
            realistic:     assessmentRow.realistic_score,
            investigative: assessmentRow.investigative_score,
            artistic:      assessmentRow.artistic_score,
            social:        assessmentRow.social_score,
            enterprising:  assessmentRow.enterprising_score,
            conventional:  assessmentRow.conventional_score,
          },
          completedAt: assessmentRow.completed_at,
        }
      : null;

  let systemPrompt: string;
  let anthropicMessages: { role: "user" | "assistant"; content: string }[];

  if (isInit) {
    systemPrompt = buildInitSystemPrompt(fullName, goal, interests, assessmentContext);
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
      (edUnits ?? []) as EdUnit[],
      assessmentContext
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
