/**
 * Market-Worthiness Engine.
 * Evaluates an asset against a single market/geography and returns a decisive
 * GO / CONDITIONAL GO / NO-GO verdict (the §6 contract), grounded in the live
 * commercial-green evidence layer (aggregateGlobalData) with LLM synthesis for
 * the qualitative dimensions only. Quantitative verdict mapping is deterministic.
 */

import Anthropic from "@anthropic-ai/sdk";
import { aggregateGlobalData, summarizeGlobalData } from "./global-pharma";
import { CONSULTING_DIRECTIVE, SOURCE_REFERENCE } from "./source-reference";
import { extractJSON } from "@/server/agents/utils";
import {
  WORTHINESS_CONFIG,
  type WorthinessResult,
  type WorthinessVerdict,
} from "@/types/market-worthiness";

const clamp = (n: any, lo = 0, hi = 100): number => {
  const v = typeof n === "number" && isFinite(n) ? n : 0;
  return Math.max(lo, Math.min(hi, Math.round(v)));
};

const WORTHINESS_PROMPT = `You are the CartaOS Market-Worthiness Engine. Given ONE asset and ONE market/geography, decide whether the asset is worth pursuing there — and if conditional, on what terms. You return a single decisive verdict as STRICT JSON only (no prose outside the JSON).

Run four stages:
STAGE 1 — Asset value profile (intrinsic, then localise exclusivity to the geography). Score: clinical differentiation (efficacy/safety vs standard of care, mechanism novelty — Open Targets, ChEMBL, Europe PMC); development stage & probability of success (ClinicalTrials.gov, approvals/labels); exclusivity runway LOCALISED to the geography (patents + regulatory protection — USPTO/EPO, Orange/Purple Book US, SPC/data-exclusivity EU); manufacturing feasibility (COGS/quality realism — openFDA enforcement, GMP). → asset_value_score 0–100.
STAGE 2 — Market attractiveness for THIS geography. Score: addressable opportunity (epidemiology-anchored treatable population × realistic price — WHO GHO, World Bank, Eurostat); access pathway feasibility (regulatory route + reimbursement/HTA hurdle & timeline); pricing environment (net-price expectation, reference/tender pressure — CMS US is GROSS only, NRDL/VBP CN); competitive intensity (incumbents, pipeline, biosimilar/generic erosion timing); channel feasibility & cost-to-serve (match channel to the asset's commercial fingerprint/modality — never assume a default route); local barriers (local-trial/localisation/partner requirements); strategic factors (trade/FTA, corridor effects). → market_attractiveness_score 0–100.
STAGE 3 — Worthiness verdict. Combine asset value and market attractiveness, penalise by cost-to-enter and risk. GO = clearly worth it, no binding constraint. CONDITIONAL = attractive but gated — LIST the explicit conditions that flip it to GO. NO_GO = below bar OR a binding constraint exists — NAME the single binding constraint. Give 2–3 decisive drivers.
STAGE 4 — Financial sanity check (where data allows). Compute a transparent rNPV with a stated discount rate, PoS, ramp and erosion — every figure a labelled assumption, never a fact. If the rNPV disagrees with the verdict, say so in summary.

Return ONLY this JSON shape:
{
  "asset": { "name": "", "inn": "", "modality": "", "stage": "", "owner": "" },
  "geography": "",
  "verdict": "GO | CONDITIONAL | NO_GO",
  "worthiness_score": 0,
  "confidence": 0.0,
  "asset_value_score": 0,
  "market_attractiveness_score": 0,
  "decisive_drivers": ["", ""],
  "conditions": [""],
  "binding_constraint": null,
  "subscores": {
    "asset": { "differentiation": 0, "stage_pos": 0, "exclusivity_runway": 0, "manufacturing": 0 },
    "market": { "opportunity": 0, "access": 0, "pricing": 0, "competition": 0, "channel": 0, "local_barriers": 0, "strategic": 0 }
  },
  "rnpv": { "value": null, "discount_rate": null, "assumptions": [] },
  "provenance": [ { "claim": "", "source": "", "type": "fact | inference | assumption", "confidence": 0.0 } ],
  "summary": ""
}

GUARDRAILS:
- Exactly ONE verdict. CONDITIONAL must list conditions; NO_GO must name the single binding constraint.
- Never present an estimate as a fact: set provenance.type (fact | inference | assumption) for every material claim, naming the source.
- confidence (0–1) reflects DATA COMPLETENESS — partial data → lower confidence and explicit gaps in summary, never an optimistic default. Net pricing, sales/volume and channel economics have NO open API: treat as assumptions and lower confidence accordingly. US open pricing (CMS) is gross, not net.
- Per-geography, never averaged. Channel feasibility must follow the asset's modality/fingerprint.
- All scores 0–100; confidence 0–1; worthiness_score consistent with the asset and market scores.
- summary ≤ 3 sentences: the verdict and why. Use the CartaOS client voice; no bracket tags.`;

/** Deterministic verdict mapping — thresholds from config, not the LLM's say-so. */
function applyThresholds(v: WorthinessResult, asset: string, geography: string): WorthinessResult {
  const cfg = WORTHINESS_CONFIG;
  const av = clamp(v.asset_value_score);
  const ma = clamp(v.market_attractiveness_score);
  // Blend if the model didn't give a coherent worthiness; otherwise trust it, clamped.
  const blended = Math.round(av * cfg.weights.assetValue + ma * cfg.weights.marketAttractiveness);
  const worthiness = clamp(v.worthiness_score || blended);

  const hasConstraint = !!(v.binding_constraint && String(v.binding_constraint).trim());
  let verdict: WorthinessVerdict;
  if (hasConstraint) verdict = "NO_GO";
  else if (worthiness >= cfg.goThreshold) verdict = "GO";
  else if (worthiness >= cfg.goThreshold - cfg.conditionalBand) verdict = "CONDITIONAL";
  else verdict = "NO_GO";

  const conditions = Array.isArray(v.conditions) ? v.conditions.filter(Boolean) : [];
  let binding = hasConstraint ? String(v.binding_constraint) : null;
  // Enforce the invariants the contract requires.
  if (verdict === "NO_GO" && !binding) {
    binding = conditions[0] ?? "Worthiness below threshold for this market on current evidence.";
  }

  return {
    ...v,
    asset: v.asset ?? { name: asset, inn: "", modality: "", stage: "", owner: "" },
    geography: v.geography || geography,
    verdict,
    worthiness_score: worthiness,
    asset_value_score: av,
    market_attractiveness_score: ma,
    confidence: Math.max(0, Math.min(1, typeof v.confidence === "number" ? v.confidence : 0.5)),
    decisive_drivers: Array.isArray(v.decisive_drivers) ? v.decisive_drivers.filter(Boolean).slice(0, 3) : [],
    conditions: verdict === "CONDITIONAL" && conditions.length === 0
      ? ["Confirm reimbursement/HTA pathway and a net price that clears the margin hurdle."]
      : conditions,
    binding_constraint: verdict === "NO_GO" ? binding : null,
  };
}

export async function evaluateMarketWorthiness(asset: string, geography: string): Promise<WorthinessResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Pull the live commercial-green evidence layer for the asset.
  let evidence = "";
  try {
    const base = asset.split("(")[0].trim();
    const data = await aggregateGlobalData(base, undefined, { includeNews: true, includePatents: true });
    evidence = summarizeGlobalData(data);
  } catch {
    // Graceful degradation — missing evidence must lower confidence, handled in-prompt.
  }

  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 6000,
    system: `${WORTHINESS_PROMPT}\n\n${SOURCE_REFERENCE}\n\n${CONSULTING_DIRECTIVE}`,
    messages: [{
      role: "user",
      content: `## Asset
${asset}

## Market / geography (evaluate THIS market only)
${geography}

## Live evidence base (commercial-green sources)
${evidence || "Evidence base unavailable — rely on clearly-labelled assumptions and LOWER the confidence accordingly."}

Return ONLY the verdict JSON for ${asset} in ${geography}.`,
    }],
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "";
  const parsed = extractJSON<WorthinessResult>(text);
  return applyThresholds(parsed, asset, geography);
}
