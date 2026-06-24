/**
 * POST /api/market-worthiness  → run the Market-Worthiness Engine for { asset, geography },
 *                                persist the verdict (best-effort), return the §6 verdict object.
 * GET  /api/market-worthiness  → list the current user's recent evaluations.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/server/db";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { evaluateMarketWorthiness } from "@/server/services/market-worthiness";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const Schema = z.object({
  asset: z.string().min(1),
  geography: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  let input: z.infer<typeof Schema>;
  try {
    input = Schema.parse(await req.json());
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 });
  }

  try {
    const verdict = await evaluateMarketWorthiness(input.asset, input.geography);

    // Best-effort persistence (no-op until the Evaluation table is migrated to the DB).
    try {
      await db.evaluation.create({
        data: {
          userId: session.user.id,
          asset: verdict.asset as Prisma.InputJsonValue,
          geography: verdict.geography,
          assetValueScore: verdict.asset_value_score,
          marketAttractivenessScore: verdict.market_attractiveness_score,
          worthinessScore: verdict.worthiness_score,
          confidence: verdict.confidence,
          verdict: verdict.verdict,
          conditions: verdict.conditions as Prisma.InputJsonValue,
          bindingConstraint: verdict.binding_constraint,
          decisiveDrivers: verdict.decisive_drivers as Prisma.InputJsonValue,
          subscores: verdict.subscores as Prisma.InputJsonValue,
          rnpv: verdict.rnpv as Prisma.InputJsonValue,
          provenance: verdict.provenance as Prisma.InputJsonValue,
          summary: verdict.summary ?? null,
        },
      });
    } catch {
      // Persistence is best-effort — never block the verdict.
    }

    return new Response(JSON.stringify(verdict), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Evaluation failed";
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  try {
    const items = await db.evaluation.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return new Response(JSON.stringify(items), { headers: { "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } });
  }
}
