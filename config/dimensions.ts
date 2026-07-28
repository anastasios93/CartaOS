/**
 * Scoring dimensions per branch (§4.1 off-patent, §4.2 innovative) as
 * configuration — the shared diagnosis shell iterates these; changing a
 * weight, question or source routing is a config edit, not a code change.
 *
 * Off-patent and innovative deliberately share NO dimension set, source set
 * or prompt (§7): the two branches answer different questions.
 */

export interface DimensionDef {
  key: string;
  label: string;
  /** What the agent must establish — injected into the branch prompt verbatim. */
  question: string;
  /** Default weight; all weights in a branch sum to 100. Client criteria can re-weight. */
  weight: number;
  /** Source-registry ids (config/sources.ts) routed to this dimension. */
  sources: string[];
  /** True when a deterministic computed layer owns this number (LLM output is overridden). */
  computed?: boolean;
}

// ── 1A · Off-patent Market Worthiness (weight commercial + supply, not science) ──

export const OFF_PATENT_DIMENSIONS: DimensionDef[] = [
  {
    key: "exclusivity_runway",
    label: "Exclusivity runway",
    question:
      "Patent + SPC expiry, data/market exclusivity, paediatric extension, orphan status — established per selected country, not globally.",
    weight: 10,
    sources: ["orange_book", "uspto_patentsview", "epo_ops", "the_lens", "drugsfda", "ema"],
  },
  {
    key: "competitive_intensity",
    label: "Competitive intensity",
    question:
      "Approved and filed generics/biosimilars per market; filing pipeline; time since first entry; number of active manufacturers.",
    weight: 12,
    sources: ["drugsfda", "dailymed", "ema", "cima_spain", "health_canada", "part_d_spending", "clinical_trials"],
    computed: true,
  },
  {
    key: "price_erosion",
    label: "Price erosion",
    question:
      "Historical erosion curve for the molecule (and its class) in each market; entrants vs price index; current price regime (eroding / floored / rising).",
    weight: 12,
    sources: ["nadac", "cms_pricing", "part_d_spending"],
    computed: true,
  },
  {
    key: "access_route",
    label: "Access route",
    question:
      "Tender vs retail vs hospital channel per market; national procurement mechanics; local-presence and pricing-filing requirements.",
    weight: 10,
    sources: ["nice_uk", "pbs_australia", "part_d_geography", "who_eml"],
  },
  {
    key: "manufacturing_options",
    label: "Manufacturing options",
    question:
      "API/DMF/CEP availability and holders; formulation complexity; CDMO/CMO options; COGS band; capacity constraints.",
    weight: 12,
    sources: ["drugsfda", "dailymed", "unii_gsrs", "pubchem"],
  },
  {
    key: "ma_licensing",
    label: "Marketing-authorisation licensing",
    question:
      "Availability of an existing dossier to in-license; MA transfer burden; regulatory pathway per market (generic / hybrid / biosimilar / 505(b)(2)); reliance and mutual-recognition routes; site GMP standing.",
    weight: 10,
    sources: ["ema", "drugsfda", "health_canada", "cima_spain", "ema_spor"],
  },
  {
    key: "distribution_channels",
    label: "Distribution channels",
    question:
      "Wholesalers, distributors, tender agents, pharmacy chains, hospital groups per market; barriers to channel entry.",
    weight: 10,
    sources: ["part_d_geography", "gleif", "news"],
    computed: true,
  },
  {
    key: "value_add_opportunity",
    label: "Value-add opportunity",
    question:
      "Reformulation, fixed-dose combination, device combination, new route of administration, supply-shortage arbitrage.",
    weight: 10,
    sources: ["dailymed", "drugsfda", "clinical_trials", "pubmed"],
    computed: true,
  },
  {
    key: "commercial_return",
    label: "Commercial return",
    question:
      "Addressable volume, realistic share, launch cost stack, time to launch, break-even, NPV — stated with explicit assumptions.",
    weight: 14,
    sources: ["part_d_spending", "nadac", "who_gho", "sec_edgar"],
  },
];

// ── 1B · Innovative Market Worthiness (weight science, IP, partnerability) ──

export const INNOVATIVE_DIMENSIONS: DimensionDef[] = [
  {
    key: "unmet_need",
    label: "Unmet need",
    question:
      "Epidemiology, standard-of-care failure rates, guideline gaps, patient-reported burden in the selected geographies.",
    weight: 10,
    sources: ["who_gho", "ihme_gbd", "pubmed", "europe_pmc", "clinical_trials"],
  },
  {
    key: "mechanistic_differentiation",
    label: "Mechanistic differentiation",
    question:
      "Target/MOA landscape, competing assets by stage and modality, credibility of the first-in-class or best-in-class case.",
    weight: 12,
    sources: ["open_targets", "chembl", "iuphar", "clinical_trials", "pubmed"],
  },
  {
    key: "target_validation",
    label: "Target validation",
    question:
      "Genetic and translational evidence, human proof of concept, biomarker strategy.",
    weight: 10,
    sources: ["open_targets", "pubmed", "europe_pmc", "nih_reporter", "semantic_scholar"],
  },
  {
    key: "development_risk",
    label: "Development risk",
    question:
      "Stage, remaining studies, phase-transition probability benchmarks for the therapy area, cost to next inflection point.",
    weight: 12,
    sources: ["clinical_trials", "pubmed", "sec_edgar"],
  },
  {
    key: "ip_position",
    label: "IP position",
    question:
      "Composition-of-matter vs formulation vs method-of-use claims, filing family and jurisdictions, runway post-launch, term-extension eligibility.",
    weight: 12,
    sources: ["uspto_patentsview", "epo_ops", "the_lens", "patents_generic"],
  },
  {
    key: "fto",
    label: "Freedom to operate",
    question:
      "Third-party blocking claims, dominant patents, licence-in requirements — surfaced as flags with citations, framed explicitly as a screen, not a legal opinion.",
    weight: 8,
    sources: ["uspto_patentsview", "epo_ops", "the_lens"],
  },
  {
    key: "regulatory_strategy",
    label: "Regulatory strategy",
    question:
      "Designation eligibility (orphan, accelerated/expedited pathways, paediatric), likely approval route per selected geography.",
    weight: 8,
    sources: ["drugsfda", "ema", "ema_spor", "health_canada"],
  },
  {
    key: "cmc_scaleup",
    label: "CMC and scale-up",
    question:
      "Modality-specific manufacturability, comparability risk, supply chain exposure.",
    weight: 8,
    sources: ["pubchem", "unii_gsrs", "dailymed"],
  },
  {
    key: "market_access",
    label: "Market and access",
    question:
      "Payer archetype and HTA regimes per selected geography, pricing precedents for the class, EU joint clinical assessment implications.",
    weight: 10,
    sources: ["nice_uk", "pbs_australia", "cms_pricing", "part_d_spending", "who_gho"],
  },
  {
    key: "partnerability",
    label: "Partnerability",
    question:
      "Which companies have a portfolio gap or declared strategic interest in this indication/modality; recent comparable deals and their terms.",
    weight: 10,
    sources: ["sec_edgar", "clinical_trials", "news", "gdelt", "gleif"],
  },
];

import type { AssetType } from "@/types/run";

export function dimensionsFor(assetType: AssetType): DimensionDef[] {
  return assetType === "off_patent" ? OFF_PATENT_DIMENSIONS : INNOVATIVE_DIMENSIONS;
}

// ── Verdict thresholds (carried over from WORTHINESS_CONFIG — preserved per
//    product decision 2026-07-28; tune here, not in code) ────────────────────

export const VERDICT_THRESHOLDS = {
  go: 68,
  conditional: 50,
} as const;

export function verdictForScore(score: number): "GO" | "CONDITIONAL" | "NO_GO" {
  if (score >= VERDICT_THRESHOLDS.go) return "GO";
  if (score >= VERDICT_THRESHOLDS.conditional) return "CONDITIONAL";
  return "NO_GO";
}
