import { anthropic, CLAUDE_MODEL } from "@/lib/anthropic/client";

export type ModerationVerdict = "pass" | "flag" | "block";
export type ModerationConfidence = "high" | "medium" | "low";

export interface ModerationResult {
  verdict: ModerationVerdict;
  reason: string;
  confidence: ModerationConfidence;
}

const SYSTEM_PROMPT = `You are a content moderator for Elikonas, a learning community platform for non-traditional learners. Review the following user-submitted content and determine if it violates our community guidelines.

BLOCK (do not allow to post) if the content contains:
- Direct threats or intimidating language toward a specific person
- Hate speech that demeans people based on race, ethnicity, gender, sexual orientation, religion, disability, or national origin
- Sharing of another person's private identifying information without consent
- Explicit illegal content

FLAG (allow to post but queue for human review) if the content contains:
- Possible personal attacks or name-calling that may be context-dependent
- Possible harassment that requires more context to evaluate
- Unsolicited commercial promotion that may or may not be learning-related
- Content that seems potentially problematic but is ambiguous

PASS (allow to post normally) if the content is:
- Learning experiences, personal stories, professional experiences
- Educational discussion even on difficult topics
- Honest feedback, disagreement, or critique focused on ideas not people
- Any content that is clearly within normal community discourse

Return ONLY a JSON object with no other text:
{ "verdict": "pass" | "flag" | "block", "reason": "brief explanation", "confidence": "high" | "medium" | "low" }`;

export async function moderateContent(content: string): Promise<ModerationResult> {
  console.log('[moderation] checking content:', content?.substring(0, 50))
  const message = await anthropic.messages.create(
    {
      model: CLAUDE_MODEL,
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    },
    { timeout: 8000 }
  );

  const raw = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
  // Strip markdown code fences in case the model wraps the response
  const json = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const parsed = JSON.parse(json);

  const verdict = parsed.verdict;
  const confidence = parsed.confidence;

  if (!["pass", "flag", "block"].includes(verdict)) {
    throw new Error(`Unexpected verdict: ${verdict}`);
  }
  if (!["high", "medium", "low"].includes(confidence)) {
    throw new Error(`Unexpected confidence: ${confidence}`);
  }

  return {
    verdict: verdict as ModerationVerdict,
    reason: typeof parsed.reason === "string" ? parsed.reason : "",
    confidence: confidence as ModerationConfidence,
  };
}
