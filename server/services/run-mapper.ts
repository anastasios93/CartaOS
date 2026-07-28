/**
 * Maps the off-patent assessment agent's OutLicensingReport into the Run
 * spine's Diagnosis envelope (types/run.ts). The envelope fields are what the
 * pillars share; the full report rides along under `report` so the rich
 * results view renders unchanged. Pure mapping — no model calls, no scoring.
 */

import type { OutLicensingReport, ValueLever } from "@/types/hub";
import type { Diagnosis, DimensionScore, MarketScore, Verdict } from "@/types/run";

function mapVerdict(v: OutLicensingReport["verdict"]): Verdict {
  if (v === "Go") return "GO";
  if (v === "No-Go") return "NO_GO";
  return "CONDITIONAL";
}

function mapConfidence(c?: string): "high" | "medium" | "low" | undefined {
  const l = c?.toLowerCase();
  return l === "high" || l === "medium" || l === "low" ? l : undefined;
}

/** A value lever is dimension-shaped: scored, evidenced, sometimes computed. */
function leverToDimension(l: ValueLever): DimensionScore {
  return {
    key: l.lever,
    score: l.notComputable ? null : Math.max(0, Math.min(100, l.score ?? 0)),
    notComputable: l.notComputable ? (l.dataGap || "not computable from connected sources") : undefined,
    computed: !!l.computed,
    confidence: mapConfidence(l.confidence),
    summary: l.recommendedActions?.[0],
    evidence: (l.evidence ?? []).map((e) => ({
      claim: e.finding,
      kind: l.computed ? ("evidence" as const) : ("estimate" as const),
      source: e.source,
    })),
    sourcesConsulted: [...new Set((l.evidence ?? []).map((e) => e.source).filter(Boolean))],
  };
}

export function mapReportToDiagnosis(report: OutLicensingReport): Diagnosis {
  const perMarket: MarketScore[] = (report.regionalAnalysis ?? [])
    .map((r) => ({
      country: r.region,
      score: r.marketWorthiness?.score ?? r.attractivenessScore ?? null,
      verdict:
        r.marketWorthiness?.rating === "Not Worthy"
          ? ("NO_GO" as const)
          : r.marketWorthiness?.rating === "Marginal"
            ? ("CONDITIONAL" as const)
            : r.marketWorthiness
              ? ("GO" as const)
              : undefined,
      dimensions: [],
      summary: r.marketWorthiness?.thesis,
    }))
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    .map((m, i) => ({ ...m, rank: i + 1 }));

  return {
    branch: "off_patent",
    verdict: mapVerdict(report.verdict),
    verdictConfidence: mapConfidence(report.verdictConfidence),
    worthinessScore:
      report.weightedWorthiness?.score ??
      (perMarket.length
        ? Math.round(
            perMarket.reduce((a, m) => a + (m.score ?? 0), 0) / perMarket.length,
          )
        : null),
    thesis: report.opportunityThesis ?? report.executiveSummary,
    dimensions: (report.valueLevers ?? []).map(leverToDimension),
    perMarket,
    topRisks: (report.portfolioRisks ?? []).slice(0, 3).map((r) => r.risk),
    swingFactors: report.whatWouldFlipIt ?? [],
    valueLevers: report.valueLevers as unknown as Record<string, unknown>[] | undefined,
    completedAt: new Date().toISOString(),
    // Full report for the rich results view — DiagnosisSchema is a loose object.
    report: report as unknown as Record<string, unknown>,
  } as Diagnosis;
}
