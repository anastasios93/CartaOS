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
 *   - Geographic expansion     (WHO national EML footprint + US retail presence)
 *   - Formulary positioning    (CMS Medicare Part D spend, utilisation, competition)
 *
 * The remaining seven levers stay LLM-reasoned until their adapters land; they
 * are reported as such so the two are never confused.
 */

import { resolveMolecule, type MoleculeIdentity } from "@/server/services/adapters/rxnorm";
import { getNadacSeriesBatch, type NadacSeries } from "@/server/services/adapters/nadac";
import { forecastErosion, type ErosionResult } from "@/server/services/forecast/erosion";
import { getEmlFootprint, type EmlMatch } from "@/server/services/adapters/who-eml";
import { getPartDProfile, type PartDProfile } from "@/server/services/adapters/part-d";

export interface ComputedLever {
  lever: "Reimbursement / pricing" | "Geographic expansion" | "Formulary positioning";
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

function geographicLever(
  identity: MoleculeIdentity,
  series: NadacSeries[],
  eml: EmlMatch | null,
): ComputedLever {
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

  let score = marketedUS ? 45 : 55;
  let confidence: "High" | "Medium" | "Low" = "Medium";

  if (eml) {
    const n = eml.countries.length;
    const regions = Object.entries(eml.byRegion)
      .sort((a, b) => b[1] - a[1])
      .map(([r, c]) => `${r} ${c}`)
      .join(", ");

    evidence.push({
      finding: `${eml.medicineName} appears on the national essential medicines list of ${n} countries (${regions}).${eml.onWhoList ? " It is also on the WHO Model List of Essential Medicines." : " It is NOT on the WHO Model List."}`,
      source: "WHO Repository of National Essential Medicines Lists",
    });

    // A wide national-EML footprint means demonstrated public-sector demand in
    // markets the client may not serve — the clearest computed entry signal.
    const recent = eml.countries.filter(c => c.nemlYear >= 2015);
    if (recent.length) {
      evidence.push({
        finding: `${recent.length} of those national lists are from 2015 or later, including ${recent.slice(0, 8).map(c => c.name).join(", ")}${recent.length > 8 ? ` and ${recent.length - 8} more` : ""}.`,
        source: "WHO Repository of National Essential Medicines Lists",
      });
    }

    if (n >= 50) {
      score = 82;
      confidence = "High";
      actions.push(
        `Broad public-sector demand is demonstrated across ${n} national essential medicines lists — prioritise tender and public-procurement entry in the regions where you do not currently supply (${regions}).`,
      );
    } else if (n >= 15) {
      score = 68;
      confidence = "High";
      actions.push(
        `${n} countries list this molecule nationally — a mid-sized but real public-procurement footprint. Screen the ${regions} markets against your current registrations for entry gaps.`,
      );
    } else if (n > 0) {
      score = 48;
      actions.push(`Only ${n} countries list this molecule nationally; public-sector demand is narrow, so geographic upside rests on private/retail channels rather than tender.`);
    } else {
      score = 30;
      actions.push("No national essential medicines listings found — treat ex-US public-sector entry as unproven for this molecule.");
    }

    if (eml.onWhoList && n < 40) {
      actions.push(
        "The molecule is on the WHO Model List but carried by comparatively few national lists — that divergence is a classic under-adoption gap worth testing with health ministries.",
      );
      score = clamp(score + 6);
    }
  } else {
    evidence.push({
      finding: "No matching entry found in the WHO national essential medicines list repository for this ingredient name.",
      source: "WHO Repository of National Essential Medicines Lists",
    });
  }

  if (marketedUS) {
    evidence.push({
      finding: `Molecule is actively marketed in US retail with live acquisition-cost reporting on ${series.length} NDCs — US entry is established, so the geographic upside lies ex-US.`,
      source: "CMS NADAC",
    });
    actions.push("US retail presence is established; point geographic-expansion effort at ex-US markets rather than US entry.");
  } else {
    evidence.push({
      finding: "No US retail acquisition-cost reporting found against this molecule's NDCs — consistent with a product not sold into US retail.",
      source: "CMS NADAC",
    });
    actions.push("Assess US retail entry: the molecule resolves in RxNorm but shows no US retail acquisition-cost footprint.");
  }

  return {
    lever: "Geographic expansion",
    computed: true,
    score: clamp(score),
    confidence,
    evidence,
    recommendedActions: actions,
    estValueRange: eml
      ? `Demonstrated public-sector demand in ${eml.countries.length} national markets; per-market sizing needs local tender volumes`
      : "Sizing requires national tender volumes",
    dataGap:
      "National EML listing proves a country prioritises the molecule; it does NOT prove you hold a registration there, nor give tender price or volume. Confirm registration status and local tender data before committing to a market.",
  };
}

// ─── Formulary positioning ──────────────────────────────────────────────────

function formularyLever(profile: PartDProfile | null): ComputedLever {
  if (!profile || !profile.latest) {
    return {
      lever: "Formulary positioning",
      computed: true,
      score: 0,
      confidence: "Low",
      notComputable: true,
      evidence: [],
      recommendedActions: [],
      estValueRange: "Not computable from the open formulary layer",
      dataGap:
        "No Medicare Part D spending record matched this molecule. Part D covers self-administered (retail) drugs only, so a clinician-administered or hospital-only product will legitimately have none.",
    };
  }

  const evidence: { finding: string; source: string }[] = [];
  const actions: string[] = [];
  const L = profile.latest;

  evidence.push({
    finding: `Medicare Part D ${L.year}: $${(L.totalSpend / 1e6).toFixed(1)}M total spend across ${L.totalClaims.toLocaleString()} claims and ${L.totalBeneficiaries.toLocaleString()} beneficiaries, at a weighted $${L.avgSpendPerDosageUnit.toFixed(4)} per dosage unit ($${L.avgSpendPerClaim.toFixed(2)} per claim).`,
    source: "CMS Medicare Part D Spending by Drug",
  });

  if (profile.manufacturerCount > 0) {
    evidence.push({
      finding: `${profile.manufacturerCount} manufacturers reported against this molecule in Part D — a direct read on competitive intensity in the retail channel.`,
      source: "CMS Medicare Part D Spending by Drug",
    });
  }
  if (profile.brandNames.length) {
    evidence.push({
      finding: `Brands present in Part D alongside the generic: ${profile.brandNames.slice(0, 6).join(", ")}.`,
      source: "CMS Medicare Part D Spending by Drug",
    });
  }
  if (profile.years.length > 1) {
    const first = profile.years[0];
    evidence.push({
      finding: `Trend ${first.year}→${L.year}: total spend ${profile.spendCagrPct !== null ? `${profile.spendCagrPct > 0 ? "+" : ""}${profile.spendCagrPct}% CAGR` : "n/a"}, weighted cost per dosage unit ${profile.unitCostChangePct !== null ? `${profile.unitCostChangePct > 0 ? "+" : ""}${profile.unitCostChangePct}%` : "n/a"} over the window.`,
      source: "CMS Medicare Part D Spending by Drug",
    });
  }

  // Score: real retail demand plus room to move on access.
  let score = 40;
  if (L.totalSpend > 5e8) score = 80;
  else if (L.totalSpend > 1e8) score = 70;
  else if (L.totalSpend > 1e7) score = 58;
  else if (L.totalSpend > 1e6) score = 46;

  if (profile.manufacturerCount >= 15) {
    score = clamp(score - 12);
    actions.push(
      `With ${profile.manufacturerCount} manufacturers competing, tier position is contested and price-led. Compete on supply reliability and contracting terms rather than list price.`,
    );
  } else if (profile.manufacturerCount > 0 && profile.manufacturerCount <= 4) {
    score = clamp(score + 10);
    actions.push(
      `Only ${profile.manufacturerCount} manufacturers are active — a concentrated field gives real leverage in PBM and plan negotiations.`,
    );
  }

  if (profile.unitCostChangePct !== null && profile.unitCostChangePct < -20) {
    actions.push(
      `Weighted cost per dosage unit has fallen ${Math.abs(profile.unitCostChangePct)}% across the observed window — the access battle here is volume and tier retention, not price.`,
    );
  }
  if (profile.spendCagrPct !== null && profile.spendCagrPct > 5) {
    actions.push(`Part D spend is growing at ${profile.spendCagrPct}% CAGR — demand is expanding, so defend and extend formulary coverage now.`);
  }
  actions.push(
    "Pull the quarterly Part D Formulary files to confirm actual tier, prior-authorisation and step-therapy placement before acting on this lever.",
  );

  return {
    lever: "Formulary positioning",
    computed: true,
    score: clamp(score),
    confidence: profile.years.length > 1 ? "High" : "Medium",
    evidence,
    recommendedActions: actions,
    estValueRange: `$${(L.totalSpend / 1e6).toFixed(1)}M addressable Part D spend in ${L.year} across ${L.totalBeneficiaries.toLocaleString()} beneficiaries`,
    dataGap:
      "This is spend and utilisation, NOT formulary placement. Tier, prior authorisation, step therapy and quantity limits live in the quarterly CMS Part D Formulary files, which have no public API and are not wired — placement itself remains unverified.",
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
    `The other ${10 - e.levers.length} of the ten levers are NOT computed by an adapter — reason about them from the general evidence base and mark them accordingly. Do not present a reasoned lever as if it were computed.`,
  );
  return lines.join("\n");
}

/** Resolve a molecule and compute every lever that has a wired adapter. */
export async function computeEvidence(molecule: string): Promise<ComputedEvidence> {
  const identity = await resolveMolecule(molecule, 12);

  // The canonical RxNorm ingredient name is the join key into the ex-US EML and
  // Part D layers, so those run only once identity has resolved.
  const joinName = identity.ingredientName ?? molecule;

  const [series, eml, partD] = await Promise.all([
    identity.allNdcs.length ? getNadacSeriesBatch(identity.allNdcs, 14) : Promise.resolve([]),
    identity.ingredientRxcui ? getEmlFootprint(joinName).catch(() => null) : Promise.resolve(null),
    identity.ingredientRxcui ? getPartDProfile(joinName).catch(() => null) : Promise.resolve(null),
  ]);

  // Forecast the richest series — the most observations gives the most reliable
  // out-of-sample validation.
  const leadSeries = [...series].sort((a, b) => b.points.length - a.points.length)[0] ?? null;
  const forecast = leadSeries ? forecastErosion(leadSeries.points, 12) : null;

  const levers: ComputedLever[] = [
    pricingLever(identity, series, forecast, leadSeries),
    geographicLever(identity, series, eml),
    formularyLever(partD),
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
