/**
 * Computed value levers.
 *
 * These levers are CALCULATED from real data joined through the RxNorm
 * identifier backbone — not reasoned by the language model. The engine's rule is
 * that the deterministic layer owns the numbers and the LLM may only narrate
 * them, so anything produced here is handed to the assessment agent as
 * established fact with provenance, and anything that cannot be computed is
 * returned as an explicit data gap rather than guessed.
 *
 * Currently computed:
 *   - Reimbursement / pricing  (CMS NADAC series + backtested erosion forecast)
 *   - Geographic expansion     (US registration + marketed-product footprint)
 *
 * The remaining eight levers stay LLM-reasoned until their adapters land; they
 * are reported as such so the two are never confused.
 */

import { resolveMolecule, type MoleculeIdentity } from "@/server/services/adapters/rxnorm";
import { getNadacSeriesBatch, type NadacSeries } from "@/server/services/adapters/nadac";
import { forecastErosion, type ErosionResult } from "@/server/services/forecast/erosion";

export interface ComputedLever {
  lever: "Reimbursement / pricing" | "Geographic expansion";
  computed: true;
  score: number;
  confidence: "High" | "Medium" | "Low";
  evidence: { finding: string; source: string }[];
  recommendedActions: string[];
  estValueRange: string;
  dataGap?: string;
  notComputable?: boolean;
  /** Measured model performance, when a forecast underpins the lever. */
  modelAudit?: {
    selectedModel: string;
    smape: number;
    mape: number;
    rmse: number;
    heldOutPredictions: number;
    liftOverNaivePp: number;
    intervalCoverage80: number;
    leaderboard: { model: string; smape: number }[];
  };
}

export interface ComputedEvidence {
  molecule: string;
  identity: {
    ingredientRxcui: string | null;
    ingredientName: string | null;
    atc: string[];
    productCount: number;
    ndcCount: number;
    hasBrandedProduct: boolean;
  };
  levers: ComputedLever[];
  /** Rendered block injected into the assessment prompt as established fact. */
  promptBlock: string;
  resolved: boolean;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

// ─── Reimbursement / pricing ────────────────────────────────────────────────

function pricingLever(
  identity: MoleculeIdentity,
  series: NadacSeries[],
  forecast: ErosionResult | null,
  leadSeries: NadacSeries | null,
): ComputedLever {
  const evidence: { finding: string; source: string }[] = [];
  const actions: string[] = [];

  if (!series.length) {
    return {
      lever: "Reimbursement / pricing",
      computed: true,
      score: 0,
      confidence: "Low",
      notComputable: true,
      evidence: [],
      recommendedActions: [],
      estValueRange: "Not computable from the open pricing layer",
      dataGap:
        "No CMS NADAC price history matched this molecule's NDCs. NADAC covers US retail acquisition cost only — a US-unmarketed or hospital-only product will legitimately have none. Supply an NDC list or a non-US price source to compute this lever.",
    };
  }

  const generics = series.filter(s => s.classification === "G").length;
  const brands = series.filter(s => s.classification === "B").length;
  const prices = series.map(s => s.points[s.points.length - 1]?.pricePerUnit).filter(Number.isFinite) as number[];
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const spreadPct = lo > 0 ? ((hi - lo) / lo) * 100 : 0;

  evidence.push({
    finding: `${series.length} NDCs carry CMS NADAC price history (${generics} classified generic, ${brands} brand). Latest acquisition cost ranges $${lo.toFixed(5)}–$${hi.toFixed(5)} per ${leadSeries?.pricingUnit || "unit"}.`,
    source: "CMS NADAC",
  });

  let score = 40;
  let confidence: "High" | "Medium" | "Low" = "Medium";
  let modelAudit: ComputedLever["modelAudit"];

  if (forecast?.ok) {
    modelAudit = {
      selectedModel: forecast.selectedModel,
      smape: forecast.accuracy.smape,
      mape: forecast.accuracy.mape,
      rmse: forecast.accuracy.rmse,
      heldOutPredictions: forecast.accuracy.evaluations,
      liftOverNaivePp: forecast.liftOverNaive,
      intervalCoverage80: forecast.intervalCoverage80,
      leaderboard: forecast.leaderboard.map(l => ({ model: l.model, smape: l.smape })),
    };

    evidence.push({
      finding: `Price trajectory validated out of sample: model "${forecast.selectedModel}" selected by rolling-origin backtest over ${forecast.accuracy.evaluations} held-out predictions, sMAPE ${forecast.accuracy.smape}% (80% interval empirical coverage ${forecast.intervalCoverage80}%). Series spans ${forecast.firstDate} to ${forecast.lastDate} across ${forecast.observations} observations.`,
      source: "CMS NADAC + CartaOS backtested forecast",
    });

    if (forecast.priceRegime === "floored") {
      evidence.push({
        finding: `No trend model beats the naive benchmark, and implied annualised price change is ${forecast.annualisedErosionPct}%. The price has floored — this molecule's remaining value is NOT in price defence.`,
        source: "CartaOS erosion model selection",
      });
      score = 22;
      confidence = "High";
      actions.push(
        "Stop treating price as the lever — the acquisition-cost curve is flat and further price defence will not move value.",
        "Redirect effort to volume, channel mix and formulary tier, where a floored-price generic still has recoverable margin.",
      );
    } else if (forecast.priceRegime === "eroding") {
      evidence.push({
        finding: `Price is actively eroding at an implied ${forecast.annualisedErosionPct}% per year (model beats naive by ${forecast.liftOverNaive} pp sMAPE).`,
        source: "CartaOS erosion model selection",
      });
      score = 72;
      confidence = "High";
      actions.push(
        `Erosion is live at ~${Math.abs(forecast.annualisedErosionPct)}%/yr — model a contract repricing now rather than at renewal.`,
        "Protect net price through channel and contract terms before the curve reaches its floor.",
      );
    } else {
      evidence.push({
        finding: `Price is rising at an implied ${forecast.annualisedErosionPct}% per year — unusual for an off-patent molecule and often a supply-constraint or shortage signal worth exploiting.`,
        source: "CartaOS erosion model selection",
      });
      score = 78;
      confidence = "Medium";
      actions.push(
        "Investigate the upward price move as a possible shortage window — a second-source or capacity play may capture it.",
      );
    }
  } else {
    confidence = "Low";
    evidence.push({
      finding: forecast && !forecast.ok
        ? `Price history too short to validate a forecast out of sample (${forecast.observations} observations).`
        : "Price history insufficient to validate a forecast.",
      source: "CMS NADAC",
    });
    score = 30;
  }

  if (spreadPct > 25) {
    evidence.push({
      finding: `Acquisition cost varies ${spreadPct.toFixed(0)}% across NDCs of the same molecule — a presentation/pack-level pricing spread.`,
      source: "CMS NADAC",
    });
    actions.push("Exploit the cross-NDC price spread: reprice or reposition the presentations sitting at the bottom of the range.");
    score = clamp(score + 8);
  }

  return {
    lever: "Reimbursement / pricing",
    computed: true,
    score: clamp(score),
    confidence,
    evidence,
    recommendedActions: actions,
    estValueRange:
      forecast?.ok && forecast.priceRegime === "eroding"
        ? `Erosion exposure ≈ ${Math.abs(forecast.annualisedErosionPct)}% of US acquisition-cost base per year`
        : "Price-side upside limited; value sits in volume and channel rather than unit price",
    dataGap:
      "NADAC is US retail acquisition cost. It does not capture net price after confidential rebates, 340B, or any ex-US market — those require client contract data.",
    modelAudit,
  };
}

// ─── Geographic expansion ───────────────────────────────────────────────────

function geographicLever(identity: MoleculeIdentity, series: NadacSeries[]): ComputedLever {
  const evidence: { finding: string; source: string }[] = [];
  const actions: string[] = [];

  if (!identity.ingredientRxcui) {
    return {
      lever: "Geographic expansion",
      computed: true,
      score: 0,
      confidence: "Low",
      notComputable: true,
      evidence: [],
      recommendedActions: [],
      estValueRange: "Not computable — molecule did not resolve in RxNorm",
      dataGap: "The molecule name did not resolve to an RxNorm ingredient, so no registration footprint could be computed. Check spelling or supply an INN.",
    };
  }

  const marketedUS = series.length > 0;
  evidence.push({
    finding: `Resolved to RxNorm ingredient ${identity.ingredientRxcui} (${identity.ingredientName}) with ${identity.products.length} marketed product presentations and ${identity.allNdcs.length} distinct NDCs on the US market.`,
    source: "RxNorm (NLM RxNav)",
  });
  if (identity.atc.length) {
    evidence.push({
      finding: `ATC classification: ${identity.atc.map(a => `${a.classId} ${a.className}`).join("; ")}. This is the join key for ex-US reimbursed-list and EML comparison.`,
      source: "RxClass / ATC",
    });
  }

  let score = 45;
  if (marketedUS) {
    evidence.push({
      finding: `Molecule is actively marketed in the US with live acquisition-cost reporting on ${series.length} NDCs — US entry is established, so geographic upside lies ex-US.`,
      source: "CMS NADAC",
    });
    actions.push("US presence is established; direct geographic-expansion effort at ex-US markets rather than US entry.");
    score = 58;
  } else {
    evidence.push({
      finding: "No US acquisition-cost reporting found against this molecule's NDCs — consistent with a product not marketed in US retail.",
      source: "CMS NADAC",
    });
    actions.push("Assess US retail entry: the molecule resolves in RxNorm but shows no US retail acquisition-cost footprint.");
    score = 66;
  }

  return {
    lever: "Geographic expansion",
    computed: true,
    score: clamp(score),
    confidence: "Medium",
    evidence,
    recommendedActions: actions,
    estValueRange: "Sizing requires the ex-US reimbursed-list layer; US footprint is established fact",
    dataGap:
      "Ex-US registration status is not yet computed — the WHO nEML and national reimbursed-list adapters are not wired, so country-by-country entry gaps remain LLM-reasoned rather than calculated.",
  };
}

// ─── Assembly ───────────────────────────────────────────────────────────────

function renderPromptBlock(e: Omit<ComputedEvidence, "promptBlock">): string {
  const lines: string[] = [];
  lines.push(`### COMPUTED EVIDENCE — ${e.molecule}`);
  lines.push(
    "The following was CALCULATED deterministically from live data joined through the RxNorm identifier backbone. Treat every figure here as ESTABLISHED FACT: narrate it, never contradict it, never substitute your own estimate for it. Where a lever below is marked NOT COMPUTABLE, report the stated data gap rather than guessing a score.",
  );
  lines.push(
    `Identity: RxCUI ${e.identity.ingredientRxcui ?? "unresolved"} (${e.identity.ingredientName ?? "—"}); ATC ${e.identity.atc.join(", ") || "none"}; ${e.identity.productCount} products; ${e.identity.ndcCount} NDCs; branded product on market: ${e.identity.hasBrandedProduct ? "yes" : "no"}.`,
  );

  for (const l of e.levers) {
    lines.push("");
    lines.push(
      `LEVER "${l.lever}" — ${l.notComputable ? "NOT COMPUTABLE" : `COMPUTED score ${l.score}/100, confidence ${l.confidence}`}`,
    );
    for (const ev of l.evidence) lines.push(`  · ${ev.finding} [${ev.source}]`);
    if (l.modelAudit) {
      lines.push(
        `  · MODEL AUDIT: "${l.modelAudit.selectedModel}" won a rolling-origin backtest against ${l.modelAudit.leaderboard.length} candidates; measured out-of-sample sMAPE ${l.modelAudit.smape}%, RMSE ${l.modelAudit.rmse}, over ${l.modelAudit.heldOutPredictions} held-out predictions; lift over naive ${l.modelAudit.liftOverNaivePp} pp; 80% interval coverage ${l.modelAudit.intervalCoverage80}%. Quote these measured figures if you cite accuracy — never claim accuracy that is not stated here.`,
      );
    }
    for (const a of l.recommendedActions) lines.push(`  → ${a}`);
    if (l.dataGap) lines.push(`  ! Data gap: ${l.dataGap}`);
  }

  lines.push("");
  lines.push(
    "The other eight levers are NOT yet computed by an adapter — reason about them from the general evidence base and mark them accordingly. Do not present a reasoned lever as if it were computed.",
  );
  return lines.join("\n");
}

/** Resolve a molecule and compute every lever that has a wired adapter. */
export async function computeEvidence(molecule: string): Promise<ComputedEvidence> {
  const identity = await resolveMolecule(molecule, 12);
  const series = identity.allNdcs.length ? await getNadacSeriesBatch(identity.allNdcs, 14) : [];

  // Forecast the richest series — the most observations gives the most reliable
  // out-of-sample validation.
  const leadSeries = [...series].sort((a, b) => b.points.length - a.points.length)[0] ?? null;
  const forecast = leadSeries ? forecastErosion(leadSeries.points, 12) : null;

  const levers: ComputedLever[] = [
    pricingLever(identity, series, forecast, leadSeries),
    geographicLever(identity, series),
  ];

  const base: Omit<ComputedEvidence, "promptBlock"> = {
    molecule,
    identity: {
      ingredientRxcui: identity.ingredientRxcui,
      ingredientName: identity.ingredientName,
      atc: identity.atc.map(a => `${a.classId} ${a.className}`),
      productCount: identity.products.length,
      ndcCount: identity.allNdcs.length,
      hasBrandedProduct: identity.hasBrandedProduct,
    },
    levers,
    resolved: !!identity.ingredientRxcui,
  };

  return { ...base, promptBlock: renderPromptBlock(base) };
}

/** Compute evidence for several molecules, bounded to keep the run fast. */
export async function computeEvidenceForAll(molecules: string[], cap = 3): Promise<ComputedEvidence[]> {
  const target = molecules.slice(0, cap);
  const results = await Promise.all(
    target.map(m => computeEvidence(m).catch(() => null)),
  );
  return results.filter((r): r is ComputedEvidence => r !== null);
}
