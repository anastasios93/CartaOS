/**
 * Market-Worthiness Engine — types & tunable config.
 * One call → one decisive GO / CONDITIONAL GO / NO-GO verdict for an asset in a
 * specific market/geography, with scores, decisive drivers, rNPV and provenance.
 */

export type WorthinessVerdict = "GO" | "CONDITIONAL" | "NO_GO";

export interface WorthinessResult {
  asset: { name: string; inn: string; modality: string; stage: string; owner: string };
  geography: string;
  verdict: WorthinessVerdict;
  worthiness_score: number;          // 0–100
  confidence: number;                // 0–1, driven by data completeness
  asset_value_score: number;         // 0–100 (Stage 1)
  market_attractiveness_score: number; // 0–100 (Stage 2)
  decisive_drivers: string[];        // 2–3
  conditions: string[];              // CONDITIONAL: what flips it to GO
  binding_constraint: string | null; // NO_GO: the single binding constraint
  subscores: {
    asset: { differentiation: number; stage_pos: number; exclusivity_runway: number; manufacturing: number };
    market: { opportunity: number; access: number; pricing: number; competition: number; channel: number; local_barriers: number; strategic: number };
  };
  rnpv: { value: number | null; discount_rate: number | null; assumptions: string[] };
  provenance: { claim: string; source: string; type: "fact" | "inference" | "assumption"; confidence: number }[];
  summary: string;                   // <= 3 sentences
}

export interface WorthinessConfig {
  /** worthiness ≥ goThreshold AND no binding constraint → GO */
  goThreshold: number;
  /** worthiness ≥ goThreshold − conditionalBand (and < goThreshold) → CONDITIONAL; below → NO_GO */
  conditionalBand: number;
  /** blend of Stage-1 asset value and Stage-2 market attractiveness */
  weights: { assetValue: number; marketAttractiveness: number };
}

// Tunable thresholds/weights — calibrate decisiveness here, NOT in code.
// Start conservative (see brief §Tuning).
export const WORTHINESS_CONFIG: WorthinessConfig = {
  goThreshold: 68,
  conditionalBand: 18, // 50–67 → CONDITIONAL, < 50 → NO_GO
  weights: { assetValue: 0.45, marketAttractiveness: 0.55 },
};

/** Selectable markets (per-geography; "EU" is never a single market). */
export const WORTHINESS_GEOS: { code: string; label: string }[] = [
  { code: "US", label: "🇺🇸 United States" },
  { code: "DE", label: "🇩🇪 Germany" },
  { code: "FR", label: "🇫🇷 France" },
  { code: "IT", label: "🇮🇹 Italy" },
  { code: "ES", label: "🇪🇸 Spain" },
  { code: "UK", label: "🇬🇧 United Kingdom" },
  { code: "JP", label: "🇯🇵 Japan" },
  { code: "CN", label: "🇨🇳 China" },
  { code: "IN", label: "🇮🇳 India" },
  { code: "ROW", label: "🌍 Rest of World" },
];
