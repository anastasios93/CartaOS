/**
 * History-preserving backfill: copies legacy HubRequest/HubResult rows (the
 * simulated-plan history) and Evaluation rows (standalone market-worthiness
 * verdicts) into the unified Run table.
 *
 * Idempotent: each Run carries legacyId (unique) = the source row id, so
 * re-running skips anything already copied. Legacy tables are left untouched;
 * they are deleted in the final refactor phase once nothing reads them.
 *
 * Run with: npx tsx scripts/backfill-runs.ts
 */

import { PrismaClient } from "@prisma/client";
import { normalizeLegacyGeography, DEFAULT_GEOGRAPHIES } from "../config/geographies";

const db = new PrismaClient();

function geosFrom(values: string[]): string[] {
  const out = new Set<string>();
  for (const v of values) for (const code of normalizeLegacyGeography(v)) out.add(code);
  return out.size ? [...out] : DEFAULT_GEOGRAPHIES;
}

async function backfillHubRequests() {
  const requests = await db.hubRequest.findMany({
    include: { results: true },
    orderBy: { createdAt: "asc" },
  });
  let copied = 0;
  for (const r of requests) {
    const exists = await db.run.findUnique({ where: { legacyId: r.id } });
    if (exists) continue;

    const strategyResult = r.results.find((x) => x.agentId === "outLicensingStrategy");
    const executionResult = r.results.find((x) => x.agentId === "executionPlan");
    // The legacy "assessment" (verdict/COS/levers) is diagnosis-shaped; the
    // execution-plan agent output is strategy/execution-shaped. Store both raw
    // under a `legacy` envelope — the new UI reads them via a compatibility
    // view until Phase 3/5 re-run them natively.
    await db.run.create({
      data: {
        userId: r.userId,
        assetQuery: r.assetName,
        assetType: "off_patent",
        geographies: geosFrom(r.geographies),
        status: r.status === "complete" ? "diagnosed" : r.status === "error" ? "error" : "draft",
        diagnosis: strategyResult?.result
          ? { legacy: { agent: "outLicensingStrategy", result: strategyResult.result } }
          : undefined,
        execution: executionResult?.result
          ? { legacy: { agent: "executionPlan", result: executionResult.result } }
          : undefined,
        log: r.results.map((x) => ({
          at: x.createdAt.toISOString(),
          kind: x.error ? "error" : "result",
          message: x.error ?? `${x.agentId} completed`,
          source: x.agentId,
        })),
        legacySource: "hub_request",
        legacyId: r.id,
        createdAt: r.createdAt,
        updatedAt: r.completedAt ?? r.createdAt,
      },
    });
    copied++;
  }
  return { total: requests.length, copied };
}

async function backfillEvaluations() {
  const evals = await db.evaluation.findMany({ orderBy: { createdAt: "asc" } });
  let copied = 0;
  for (const e of evals) {
    const exists = await db.run.findUnique({ where: { legacyId: e.id } });
    if (exists) continue;

    const asset = (e.asset ?? {}) as { name?: string };
    await db.run.create({
      data: {
        userId: e.userId,
        assetQuery: asset.name ?? "unknown",
        assetType: "off_patent",
        geographies: geosFrom([e.geography]),
        status: "diagnosed",
        diagnosis: {
          branch: "off_patent",
          verdict: e.verdict === "NO_GO" ? "NO_GO" : e.verdict === "GO" ? "GO" : "CONDITIONAL",
          worthinessScore: e.worthinessScore,
          thesis: e.summary ?? undefined,
          legacy: {
            engine: "market_worthiness_v1",
            subscores: e.subscores,
            decisiveDrivers: e.decisiveDrivers,
            conditions: e.conditions,
            bindingConstraint: e.bindingConstraint,
            rnpv: e.rnpv,
            provenance: e.provenance,
            confidence: e.confidence,
          },
        },
        legacySource: "evaluation",
        legacyId: e.id,
        createdAt: e.createdAt,
        updatedAt: e.createdAt,
      },
    });
    copied++;
  }
  return { total: evals.length, copied };
}

async function main() {
  const hub = await backfillHubRequests();
  const evals = await backfillEvaluations();
  const runs = await db.run.count();
  console.log(`HubRequests: ${hub.copied}/${hub.total} copied (rest already present)`);
  console.log(`Evaluations: ${evals.copied}/${evals.total} copied (rest already present)`);
  console.log(`Run table now holds ${runs} rows`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
