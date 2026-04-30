import { anthropic, CLAUDE_MODEL } from "@/lib/anthropic/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { prompt } = await request.json();

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  return NextResponse.json({ content: message.content });
}
