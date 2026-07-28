/**
 * POST /api/run/execution — Pillar 3.
 *
 * Execution cannot be entered cold any more than Strategy can (§2): the request
 * names a Run that already carries a strategy, which is loaded, owner-checked
 * and fed to the execution agent along with the chosen route. The resulting
 * Execution is persisted onto that same Run, so one Run remains the spine.
 *
 * Streams the same SSE event shape as the orchestrator so the run console and
 * agent-stream hook work unchanged.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/server/db";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { SSEEvent } from "@/types/hub";
import type { Diagnosis, Strategy } from "@/types/run";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  runId: z.string().min(1),
  /** Which route to plan. Defaults to the one strategy recommended. */
  routeKey: z.string().max(120).optional(),
  /** Plan start; defaults to today. Kept explicit so the plan is reproducible. */
  startDate: z.string().max(40).optional(),
  context: z.string().max(4000).default(""),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  let body;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 });
  }

  // Owner-scoped load — a run belonging to another tenant is simply not found.
  const run = await db.run
    .findFirst({ where: { id: body.runId, userId: session.user.id } })
    .catch(() => null);
  if (!run) {
    return new Response(JSON.stringify({ error: "Run not found" }), { status: 404 });
  }

  const strategy = run.strategy as unknown as Strategy | null;
  if (!strategy || !Array.isArray(strategy.routes) || !strategy.routes.length) {
    return new Response(
      JSON.stringify({ error: "This run has no completed strategy. Model a strategy first." }),
      { status: 409 },
    );
  }

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  let captured: unknown = null;
  let capturedError: string | null = null;
  const log: { at: string; kind: string; message: string; source?: string; phase?: string }[] = [];

  const sendEvent = (event: SSEEvent | { type: "done" }) => {
    if ("agent" in event) {
      const at = new Date().toISOString();
      if (event.type === "result") {
        captured = (event.data as { execution?: unknown })?.execution ?? null;
        log.push({ at, kind: "result", message: "plan built", source: event.agent, phase: "execution" });
      } else if (event.type === "error") {
        capturedError = event.error;
        log.push({ at, kind: "error", message: event.error, source: event.agent, phase: "execution" });
      } else if (event.type === "status") {
        log.push({ at, kind: "status", message: event.message, source: event.agent, phase: "execution" });
      }
    }
    writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`)).catch(() => {});
  };

  (async () => {
    try {
      await db.run.update({ where: { id: run.id }, data: { status: "execution_running" } }).catch(() => {});
      const { runExecutionAgent } = await import("@/server/agents/execution");
      sendEvent({ agent: "execution", type: "status", status: "idle", message: "Queued…" });
      await runExecutionAgent(
        {
          assetName: run.assetQuery,
          therapeuticArea: "",
          developmentStage: "",
          dealDirection: "Out-licensing",
          geographies: run.geographies,
          exactGeographies: true,
          assetType: run.assetType as "off_patent" | "innovative",
          context: body.context,
          strategy,
          diagnosis: (run.diagnosis as unknown as Diagnosis) ?? undefined,
          routeKey: body.routeKey,
          startDate: body.startDate,
        },
        sendEvent,
      );
      sendEvent({ type: "done" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Execution plan failed";
      capturedError = msg;
      sendEvent({ agent: "execution", type: "error", error: msg });
      sendEvent({ type: "done" });
    } finally {
      // Persist BEFORE closing the writer. Closing it ends the response body,
      // and the platform is free to tear the function down the moment the
      // response completes — anything awaited after that never lands.
      // Persistence is best-effort and must never break the stream.
      try {
        const existingLog = Array.isArray(run.log) ? (run.log as unknown[]) : [];
        await db.run.update({
          where: { id: run.id },
          data: {
            status: captured ? "complete" : "error",
            execution: (captured ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            log: [...existingLog, ...log] as Prisma.InputJsonValue,
            error: captured ? null : capturedError,
          },
        });
      } catch {
        /* ignore */
      }
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
