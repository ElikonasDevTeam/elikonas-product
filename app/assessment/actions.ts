"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getResults, getOccupations } from "@/lib/onet/client";
import type { RIASECScores, ONetCareer } from "@/types/onet";

export async function startAssessment(): Promise<
  { sessionId: string } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data, error } = await supabase
    .from("assessment_sessions")
    .insert({ user_id: user.id })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to start assessment" };
  }
  return { sessionId: data.id };
}

export async function saveProgress(
  sessionId: string,
  questionNumber: number,
  answer: number
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("assessment_responses").upsert(
    {
      session_id: sessionId,
      question_number: questionNumber,
      answer,
      user_id: user.id,
    },
    { onConflict: "session_id,question_number" }
  );
}

export type SubmitResult =
  | { sessionId: string; scores: RIASECScores }
  | { error: string };

export async function submitAssessment(
  sessionId: string,
  answers: number[]
): Promise<SubmitResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  let scores: RIASECScores;
  try {
    scores = await getResults(answers);
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to score assessment",
    };
  }

  // Fetch and store career suggestions alongside scores (non-fatal if fails;
  // results page falls back to a live fetch when suggested_careers is null)
  let suggestedCareers: ONetCareer[] | null = null;
  try {
    const res = await getOccupations(scores);
    suggestedCareers = res.career ?? [];
  } catch {
    // intentionally silent — careers are a bonus, not required for results
  }

  const { error: updateError } = await supabase
    .from("assessment_sessions")
    .update({
      riasec_scores: scores,
      suggested_careers: suggestedCareers,
      completed_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (updateError) {
    return { error: updateError.message };
  }

  return { sessionId, scores };
}
