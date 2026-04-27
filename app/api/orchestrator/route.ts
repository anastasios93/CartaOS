/**
 * POST /api/orchestrator
 * SSE endpoint: deploys 4 AI agents in parallel, then runs synthesis agent.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import type { SSEEvent, AgentId, AgentResult } from "@/types/hub";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const IntakeSchema = z.object({
  assetName: z.string().min(1),
  therapeuticArea: z.string().default(""),
  developmentStage: z.string().default(""),
  dealDirection: z.enum(["Out-licensing", "In-licensing", "Co-development", "Option Agreement", "M&A / Acquisition"]).default("Out-licensing"),
  geographies: z.array(z.enum(["US", "EU", "JP", "CN", "ROW"])).default(["US", "EU", "JP", "CN", "ROW"]),
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
        { runSynthesisAgent },
        { runExecutionPlanAgent },
      ] = await Promise.all([
        import("@/server/agents/benchmarking"),
        import("@/server/agents/partner"),
        import("@/server/agents/negotiation"),
        import("@/server/agents/termsheet"),
        import("@/server/agents/synthesis"),
        import("@/server/agents/execution-plan"),
      ]);

      const CORE_IDS: AgentId[] = ["benchmarking", "partner", "negotiation", "termsheet"];

      const agents: { id: AgentId; run: (intake: any, write: (e: SSEEvent) => void) => Promise<void> }[] = [
        { id: "benchmarking", run: runBenchmarkingAgent },
        { id: "partner", run: runPartnerAgent },
        { id: "negotiation", run: runNegotiationAgent },
        { id: "termsheet", run: runTermSheetAgent },
      ];

      // Send initial status for all agents (including synthesis & execution plan)
      const POST_AGENTS: AgentId[] = ["synthesis", "executionPlan"];
      for (const id of [...CORE_IDS, ...POST_AGENTS]) {
        const isPost = POST_AGENTS.includes(id);
        sendEvent({ agent: id, type: "status", status: "idle", message: isPost ? "Waiting for diagnosis & strategy..." : "Queued..." });
      }

      // Collect results from the 4 core agents
      const collectedResults: AgentResult[] = [];
      const originalSendEvent = sendEvent;
      const capturingSendEvent = (event: SSEEvent | { type: "done" }) => {
        // Capture result events to pass to synthesis
        if ("type" in event && event.type === "result" && "data" in event) {
          collectedResults.push((event as Extract<SSEEvent, { type: "result" }>).data);
        }
        originalSendEvent(event);
      };

      // Run all 4 core agents in parallel
      await Promise.allSettled(
        agents.map(agent => agent.run(intake, capturingSendEvent))
      );

      // Run synthesis + execution plan agents in PARALLEL with collected results
      if (collectedResults.length > 0) {
        await Promise.allSettled([
          runSynthesisAgent(intake, collectedResults, sendEvent),
          runExecutionPlanAgent(intake, collectedResults, sendEvent),
        ]);
      } else {
        for (const id of ["synthesis", "executionPlan"] as AgentId[]) {
          sendEvent({ agent: id, type: "error", error: "No agent results to synthesize — all upstream agents failed." });
          sendEvent({ agent: id, type: "status", status: "error", message: "No upstream results available" });
        }
      }

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
