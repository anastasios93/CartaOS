/**
 * POST /api/conductor
 * Real AI chat endpoint backed by Claude. Grounds responses in the user's
 * deal portfolio context plus the platform's market intelligence.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { chatWithCartaOS } from "@/server/services/claude";
import { cleanError } from "@/server/agents/utils";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      })
    )
    .min(1),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI is not configured. Add ANTHROPIC_API_KEY to enable the AI Advisor." },
      { status: 503 }
    );
  }

  try {
    const reply = await chatWithCartaOS(body.messages);
    return NextResponse.json({ reply });
  } catch (err) {
    return NextResponse.json({ error: cleanError(err) }, { status: 500 });
  }
}
