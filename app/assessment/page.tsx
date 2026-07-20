import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getQuestions } from "@/lib/onet/client";
import { AssessmentView } from "./assessment-view";
import type { ONetQuestion } from "@/types/onet";

export const metadata: Metadata = {
  title: "Interest Assessment — Elikonas",
};

export default async function AssessmentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let questions: ONetQuestion[] = [];
  let fetchError: string | null = null;
  try {
    const res = await getQuestions();
    questions = res.question ?? [];
  } catch (err) {
    fetchError =
      err instanceof Error
        ? err.message
        : "Failed to load assessment questions";
  }

  return <AssessmentView questions={questions} fetchError={fetchError} />;
}
