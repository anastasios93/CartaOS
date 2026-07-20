/**
 * CMS Medicare Part D "Prescribers - by Geography and Drug" adapter.
 *
 * Turns a molecule into a GEOGRAPHIC demand map: how Part D claims, prescribers,
 * spend and beneficiaries for that molecule are distributed across US states, and
 * how that distribution compares to the national aggregate. That makes the launch
 * / field-force / channel-targeting lever COMPUTABLE — where demand actually sits,
 * how concentrated it is (HHI, top-5 share), how hard each state's prescribers are
 * working the molecule (claims per prescriber), and how much of the national book
 * is the 65+ cohort.
 *
 * Verified API behaviour (data.cms.gov/data-api/v1):
 *  - `?keyword=<term>` is the ONLY working search on this dataset. The Drupal-style
 *    `filter[col][condition][operator]=contains` syntax is SILENTLY IGNORED — it
 *    returns unfiltered rows rather than erroring, so it must NEVER be used here.
 *  - Keyword search is fuzzy, so rows must additionally be filtered client-side to
 *    those whose `Gnrc_Name` contains the requested molecule (case-insensitive).
 *  - Rows arrive at TWO geography levels in the SAME response: `Prscrbr_Geo_Lvl` is
 *    either "National" or "State". A verified query returned 153 rows = 3 National
 *    + 150 State. These MUST be separated — summing them together double-counts
 *    every claim, prescriber, dollar and beneficiary.
 *  - A molecule can appear under several `Gnrc_Name` spellings, so rows are summed
 *    per state before any ratio is derived (never averaging pre-computed ratios).
 *  - All numeric columns arrive as strings and need Number() coercion.
 *
 * IMPORTANT SCOPE LIMIT: geography here is the PRESCRIBER's state, not the
 * patient's, and only the Part D (retail, self-administered) channel is covered.
 * Sub-state granularity, Part B and commercial volume are absent — callers must
 * report those as data gaps rather than extrapolating.
 *
 * Attribution: Centers for Medicare & Medicaid Services (CMS).
 */

import { fetchJSON, envKey } from "@/server/services/http";
import type { Provenance } from "./rxnorm";

/** Dataset id for "Medicare Part D Prescribers - by Geography and Drug". Overridable — CMS rotates ids. */
const DATASET_ID = envKey("CMS_PARTD_GEO_DATASET_ID") || "c8ea3f8e-3a09-4fea-86f2-8902fb4b0920";
const BASE = `https://data.cms.gov/data-api/v1/dataset/${DATASET_ID}/data`;

export interface GeoStateRow {
  state: string;
  claims: number;
  prescribers: number;
  drugCost: number;
  beneficiaries: number;
  /** drugCost / claims, 0 when claims is 0 */
  costPerClaim: number;
  /** claims / prescribers, 0 when prescribers is 0 */
  claimsPerPrescriber: number;
}

export interface PartDGeoProfile {
  matchedGenericNames: string[];
  national: { claims: number; prescribers: number; drugCost: number; beneficiaries: number } | null;
  states: GeoStateRow[];
  topStates: GeoStateRow[];
  /** Share of total state claims held by the top 5 states, as a percentage 0-100. */
  top5ClaimSharePct: number;
  /** Herfindahl-Hirschman style concentration of claims across states, 0-10000. */
  claimConcentrationHhi: number;
  /** Median claims per prescriber across states with >0 prescribers. */
  medianClaimsPerPrescriber: number;
  /** Share of national claims from beneficiaries 65+, percentage 0-100, null if unavailable. */
  ge65ClaimSharePct: number | null;
  provenance: Provenance;
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

const cache = new Map<string, { at: number; value: PartDGeoProfile | null }>();
const TTL_MS = 12 * 60 * 60 * 1000;

/** Running totals accumulated per state before ratios are derived. */
interface Acc {
  claims: number;
  prescribers: number;
  drugCost: number;
  beneficiaries: number;
}

const emptyAcc = (): Acc => ({ claims: 0, prescribers: 0, drugCost: 0, beneficiaries: 0 });

function addRow(acc: Acc, r: Record<string, unknown>): void {
  acc.claims += num(r.Tot_Clms);
  acc.prescribers += num(r.Tot_Prscrbrs);
  acc.drugCost += num(r.Tot_Drug_Cst);
  acc.beneficiaries += num(r.Tot_Benes);
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Geographic Part D demand profile for a molecule.
 * Pass the canonical RxNorm ingredient name; matching is substring-based because
 * Part D uses salt forms ("Atorvastatin Calcium") and combinations.
 */
export async function getPartDGeoProfile(ingredientName: string): Promise<PartDGeoProfile | null> {
  const term = ingredientName.trim().toLowerCase();
  if (!term) return null;

  const hit = cache.get(term);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  let value: PartDGeoProfile | null = null;
  try {
    const rows = await fetchJSON<Record<string, unknown>[]>(
      `${BASE}?size=500&keyword=${encodeURIComponent(term)}`,
      { timeoutMs: 40000 },
    );

    // Keyword search is fuzzy — keep only rows whose generic name genuinely
    // contains the molecule. Combination products are retained: they are real
    // Part D demand for the molecule, and are tracked in matchedGenericNames.
    const matching = (rows ?? []).filter(r =>
      String(r.Gnrc_Name ?? "").toLowerCase().includes(term),
    );

    if (matching.length) {
      // Split by geography level FIRST — National and State rows are both present
      // in the same payload and overlap completely.
      const nationalRows = matching.filter(r => String(r.Prscrbr_Geo_Lvl ?? "") === "National");
      const stateRows = matching.filter(r => String(r.Prscrbr_Geo_Lvl ?? "") === "State");

      let national: PartDGeoProfile["national"] = null;
      let ge65ClaimSharePct: number | null = null;
      if (nationalRows.length) {
        const acc = emptyAcc();
        let ge65Claims = 0;
        for (const r of nationalRows) {
          addRow(acc, r);
          ge65Claims += num(r.GE65_Tot_Clms);
        }
        national = {
          claims: acc.claims,
          prescribers: acc.prescribers,
          drugCost: acc.drugCost,
          beneficiaries: acc.beneficiaries,
        };
        // GE65 columns are suppressed for small cells, so treat zero as unavailable.
        if (acc.claims > 0 && ge65Claims > 0) {
          ge65ClaimSharePct = round2((ge65Claims / acc.claims) * 100);
        }
      }

      // Sum every matching generic-name spelling per state, then derive ratios.
      const byState = new Map<string, Acc>();
      for (const r of stateRows) {
        const name = String(r.Prscrbr_Geo_Desc ?? "").trim();
        if (!name) continue;
        const acc = byState.get(name) ?? emptyAcc();
        addRow(acc, r);
        byState.set(name, acc);
      }

      const states: GeoStateRow[] = [...byState.entries()]
        .map(([state, a]) => ({
          state,
          claims: a.claims,
          prescribers: a.prescribers,
          drugCost: a.drugCost,
          beneficiaries: a.beneficiaries,
          costPerClaim: a.claims > 0 ? round2(a.drugCost / a.claims) : 0,
          claimsPerPrescriber: a.prescribers > 0 ? round2(a.claims / a.prescribers) : 0,
        }))
        .sort((x, y) => y.claims - x.claims);

      const totalStateClaims = states.reduce((s, r) => s + r.claims, 0);

      const top5Claims = states.slice(0, 5).reduce((s, r) => s + r.claims, 0);
      const top5ClaimSharePct = totalStateClaims > 0 ? round2((top5Claims / totalStateClaims) * 100) : 0;

      const claimConcentrationHhi = totalStateClaims > 0
        ? Math.round(states.reduce((s, r) => {
            const share = r.claims / totalStateClaims;
            return s + share * share;
          }, 0) * 10000)
        : 0;

      const medianClaimsPerPrescriber = round2(
        median(states.filter(r => r.prescribers > 0).map(r => r.claims / r.prescribers)),
      );

      value = {
        matchedGenericNames: [...new Set(matching.map(r => String(r.Gnrc_Name ?? "")))].filter(Boolean),
        national,
        states,
        topStates: states.slice(0, 10),
        top5ClaimSharePct,
        claimConcentrationHhi,
        medianClaimsPerPrescriber,
        ge65ClaimSharePct,
        provenance: {
          source: "CMS Medicare Part D Prescribers by Geography and Drug",
          retrievedAt: new Date().toISOString(),
          verifyUrl: "https://data.cms.gov/provider-summary-by-type-of-service/medicare-part-d-prescribers",
        },
      };
    }
  } catch {
    value = null;
  }

  cache.set(term, { at: Date.now(), value });
  return value;
}
