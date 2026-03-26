/**
 * POST /api/orchestrator
 * SSE endpoint: deploys 4 AI agents in parallel, streams events back to client.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import type { SSEEvent, AgentId } from "@/types/hub";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const IntakeSchema = z.object({
  assetName: z.string().min(1),
  therapeuticArea: z.string().min(1),
  developmentStage: z.string().min(1),
  dealDirection: z.enum(["Out-licensing", "In-licensing", "Co-development", "Option Agreement", "M&A / Acquisition"]),
  geographies: z.array(z.enum(["US", "EU", "JP", "CN", "ROW"])).min(1),
  context: z.string().default(""),
});

export async function POST(req: Request) {
  // Auth check
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  // Parse & validate body
  let intake;
  try {
    const body = await req.json();
    intake = IntakeSchema.parse(body);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 });
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  const sendEvent = (event: SSEEvent | { type: "done" }) => {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    writer.write(encoder.encode(data)).catch(() => {});
  };

  // Run agents in background (don't await — stream starts immediately)
  (async () => {
    try {
      // Dynamic import to avoid bundling issues
      const [
        { runBenchmarkingAgent },
        { runPartnerAgent },
        { runNegotiationAgent },
        { runTermSheetAgent },
      ] = await Promise.all([
        import("@/server/agents/benchmarking"),
        import("@/server/agents/partner"),
        import("@/server/agents/negotiation"),
        import("@/server/agents/termsheet"),
      ]);

      const agents: { id: AgentId; run: (intake: any, write: (e: SSEEvent) => void) => Promise<void> }[] = [
        { id: "benchmarking", run: runBenchmarkingAgent },
        { id: "partner", run: runPartnerAgent },
        { id: "negotiation", run: runNegotiationAgent },
        { id: "termsheet", run: runTermSheetAgent },
      ];

      // Send initial status for all agents
      for (const agent of agents) {
        sendEvent({ agent: agent.id, type: "status", status: "idle", message: "Queued..." });
      }

      // Run all 4 in parallel
      await Promise.allSettled(
        agents.map(agent => agent.run(intake, sendEvent))
      );

      sendEvent({ type: "done" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Orchestrator error";
      sendEvent({ agent: "benchmarking", type: "error", error: msg });
      sendEvent({ type: "done" });
    } finally {
      writer.close().catch(() => {});
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
