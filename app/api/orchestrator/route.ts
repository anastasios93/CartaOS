/**
 * POST /api/orchestrator
 * SSE endpoint: deploys 4 AI agents in parallel, then runs synthesis agent.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/server/db";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { SSEEvent, AgentId, AgentResult } from "@/types/hub";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const CriteriaSchema = z
  .object({
    assets: z.array(z.string()).default([]),
    geographies: z.array(z.string()).default([]),
    therapeuticArea: z.string().optional(),
    valueQuestion: z.string().optional(),
    leverWeights: z
      .array(
        z.object({
          lever: z.enum([
            "Geographic expansion",
            "Indication expansion / repurposing",
            "Distribution channels",
            "Formulary positioning",
            "Administration / formulation",
            "Reimbursement / pricing",
            "Sales-force effectiveness",
            "Lifecycle / IP defense",
            "Supply / COGS arbitrage",
            "Portfolio synergy",
          ]),
          weight: z.number(),
        }),
      )
      .optional(),
    constraints: z.array(z.string()).optional(),
    thresholds: z
      .array(z.object({ metric: z.string(), operator: z.string(), value: z.string() }))
      .optional(),
    timeHorizon: z.string().optional(),
    notes: z.string().optional(),
  })
  .optional();

const IntakeSchema = z.object({
  assetName: z.string().min(1),
  therapeuticArea: z.string().default(""),
  developmentStage: z.string().default(""),
  dealDirection: z.enum(["Out-licensing", "In-licensing", "Co-development", "Option Agreement", "M&A / Acquisition"]).default("Out-licensing"),
  // ISO-3166 alpha-2 codes from the geography selector, or the legacy region
  // keys (US/EU/JP/CN/ROW) from the old intake form. Unknown tokens are
  // skipped by region expansion, never guessed.
  geographies: z.array(z.string().min(2).max(3)).min(1).default(["US", "EU", "JP", "CN", "ROW"]),
  exactGeographies: z.boolean().default(false),
  assetType: z.enum(["off_patent", "innovative"]).default("off_patent"),
  context: z.string().default(""),
  criteria: CriteriaSchema,
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

  const userId = session.user.id;

  // Create SSE stream
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  // Capture every agent's latest state so the whole run can be persisted to
  // HubRequest/HubResult and reopened later from the Simulated Plan tab.
  const captured: Record<string, { status?: string; sources?: unknown; result?: unknown; error?: string }> = {};
  const record = (event: SSEEvent | { type: "done" }) => {
    if (!("agent" in event)) return;
    const a = (captured[event.agent] ??= {});
    if (event.type === "status") a.status = event.status;
    else if (event.type === "sources") a.sources = event.sources;
    else if (event.type === "result") a.result = event.data;
    else if (event.type === "error") a.error = event.error;
  };

  const sendEvent = (event: SSEEvent | { type: "done" }) => {
    record(event);
    logEvent(event);
    const data = `data: ${JSON.stringify(event)}\n\n`;
    writer.write(encoder.encode(data)).catch(() => {});
  };

  // Persist the request immediately so it shows up in the user's history even
  // while it's still running. DB failures must never break the live stream.
  const hubRequestPromise = db.hubRequest
    .create({
      data: {
        userId,
        assetName: intake.assetName,
        therapeuticArea: intake.therapeuticArea,
        stage: intake.developmentStage,
        dealDirection: intake.dealDirection,
        geographies: intake.geographies,
        context: intake.context || null,
        status: "running",
      },
      select: { id: true },
    })
    .then(r => r.id)
    .catch(() => null);

  // The Run spine (transitional double-write next to HubRequest — the legacy
  // table goes away in the final phase once nothing reads it).
  const runLog: { at: string; kind: string; message: string; source?: string; phase?: string }[] = [];
  const logEvent = (event: SSEEvent | { type: "done" }) => {
    if (!("agent" in event)) return;
    const at = new Date().toISOString();
    if (event.type === "status") {
      runLog.push({ at, kind: "status", message: event.message, source: event.agent, phase: event.agent });
    } else if (event.type === "sources" && Array.isArray(event.sources)) {
      runLog.push({ at, kind: "source_hit", message: `${event.sources.length} sources consulted`, source: event.agent, phase: event.agent });
    } else if (event.type === "result") {
      runLog.push({ at, kind: "result", message: "completed", source: event.agent, phase: event.agent });
    } else if (event.type === "error") {
      runLog.push({ at, kind: "error", message: event.error, source: event.agent, phase: event.agent });
    }
  };
  const runRowPromise = db.run
    .create({
      data: {
        userId,
        assetQuery: intake.assetName,
        assetType: intake.assetType,
        geographies: intake.geographies,
        criteria: (intake.criteria ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        status: "diagnosis_running",
      },
      select: { id: true },
    })
    .then(r => r.id)
    .catch(() => null);

  // Run agents in background (don't await — stream starts immediately)
  (async () => {
    try {
      // Dynamic import to avoid bundling issues
      const [
        { runBenchmarkingAgent },
        { runPartnerAgent },
        { runNegotiationAgent },
        { runSynthesisAgent },
        { runExecutionPlanAgent },
        { runOutLicensingStrategyAgent },
      ] = await Promise.all([
        import("@/server/agents/benchmarking"),
        import("@/server/agents/partner"),
        import("@/server/agents/negotiation"),
        import("@/server/agents/synthesis"),
        import("@/server/agents/execution-plan"),
        import("@/server/agents/out-licensing-strategy"),
      ]);

      const CORE_IDS: AgentId[] = ["benchmarking", "partner", "negotiation"];

      const agents: { id: AgentId; run: (intake: any, write: (e: SSEEvent) => void) => Promise<void> }[] = [
        { id: "benchmarking", run: runBenchmarkingAgent },
        { id: "partner", run: runPartnerAgent },
        { id: "negotiation", run: runNegotiationAgent },
      ];

      // Send initial status for all agents (including synthesis, execution plan & out-licensing strategy)
      const POST_AGENTS: AgentId[] = ["synthesis", "executionPlan", "outLicensingStrategy"];
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

      // Run synthesis + execution plan + out-licensing strategy in PARALLEL
      if (collectedResults.length > 0) {
        await Promise.allSettled([
          runSynthesisAgent(intake, collectedResults, sendEvent),
          runExecutionPlanAgent(intake, collectedResults, sendEvent),
          runOutLicensingStrategyAgent(intake, collectedResults, sendEvent),
        ]);
      } else {
        for (const id of ["synthesis", "executionPlan", "outLicensingStrategy"] as AgentId[]) {
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

      // Persist captured results so the run is reopenable from history.
      try {
        const requestId = await hubRequestPromise;
        if (requestId) {
          const entries = Object.entries(captured);
          const anyResult = entries.some(([, v]) => v.result != null);
          await db.hubResult.createMany({
            data: entries.map(([agentId, v]) => ({
              requestId,
              agentId,
              status: v.error ? "error" : v.result != null ? "complete" : (v.status ?? "idle"),
              sources: (v.sources ?? []) as Prisma.InputJsonValue,
              result: v.result == null ? Prisma.JsonNull : (v.result as Prisma.InputJsonValue),
              error: v.error ?? null,
            })),
          });
          await db.hubRequest.update({
            where: { id: requestId },
            data: {
              status: anyResult ? "complete" : "error",
              completedAt: new Date(),
            },
          });
        }
      } catch {
        // Persistence is best-effort — never surface to the user.
      }

      // Persist the Run spine row: the assessment maps into the Diagnosis
      // envelope; the execution-plan output rides along for the later pillar.
      try {
        const runId = await runRowPromise;
        if (runId) {
          const { mapReportToDiagnosis } = await import("@/server/services/run-mapper");
          const strategyCapture = captured["outLicensingStrategy"];
          const executionCapture = captured["executionPlan"];
          const report = (strategyCapture?.result as { report?: unknown } | undefined)?.report;
          const diagnosis = report
            ? mapReportToDiagnosis(report as Parameters<typeof mapReportToDiagnosis>[0])
            : null;
          await db.run.update({
            where: { id: runId },
            data: {
              status: diagnosis ? "diagnosed" : "error",
              diagnosis: (diagnosis ?? Prisma.JsonNull) as Prisma.InputJsonValue,
              execution: executionCapture?.result
                ? ({ legacy: { agent: "executionPlan", result: (executionCapture.result as { plan?: unknown }).plan ?? executionCapture.result } } as Prisma.InputJsonValue)
                : Prisma.JsonNull,
              log: runLog as Prisma.InputJsonValue,
              error: diagnosis ? null : (strategyCapture?.error ?? "assessment produced no report"),
            },
          });
        }
      } catch {
        // Best-effort, same as above.
      }
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
