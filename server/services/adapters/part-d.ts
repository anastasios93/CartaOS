/**
 * CMS Medicare Part D "Spending by Drug" adapter.
 *
 * Gives a real multi-year demand and net-cost picture for a molecule in the US
 * retail (self-administered) channel: total spend, claims, beneficiaries,
 * weighted average spend per dosage unit, and the number of manufacturers
 * competing. That makes the formulary/access lever COMPUTABLE rather than
 * reasoned — and, because it is per-year, it also yields a genuine unit-cost
 * trend independent of NADAC.
 *
 * Verified API behaviour (data.cms.gov/data-api/v1):
 *  - `?keyword=<term>` performs the substring search we need.
 *  - The Drupal-style `filter[col][condition][operator]=contains` syntax is
 *    SILENTLY IGNORED — it returns unfiltered rows rather than erroring, so it
 *    must never be used here.
 *  - `Mftr_Name = "Overall"` is the aggregate row across manufacturers; the other
 *    rows are per-manufacturer and would double-count if summed with it.
 *  - Columns are year-suffixed (Tot_Spndng_2022, Avg_Spnd_Per_Dsg_Unt_Wghtd_2022,
 *    …), so available years are discovered from the payload rather than assumed.
 *
 * IMPORTANT SCOPE LIMIT: this dataset does NOT contain formulary tier, prior
 * authorisation, step therapy or quantity limits. Those live in the quarterly
 * Part D Formulary ZIP files, which have no API. Callers must report that as a
 * data gap rather than inferring placement from spend.
 *
 * Attribution: Centers for Medicare & Medicaid Services (CMS).
 */

import { fetchJSON, envKey } from "@/server/services/http";
import type { Provenance } from "./rxnorm";

/** Dataset id for "Medicare Part D Spending by Drug". Overridable — CMS rotates ids. */
const DATASET_ID = envKey("CMS_PARTD_SPENDING_DATASET_ID") || "7e0b4365-fd63-4a29-8f5e-e0ac9f66a81b";
const BASE = `https://data.cms.gov/data-api/v1/dataset/${DATASET_ID}/data`;

export interface PartDYear {
  year: number;
  totalSpend: number;
  totalClaims: number;
  totalBeneficiaries: number;
  /** Weighted average spend per dosage unit — the closest thing to a net unit price. */
  avgSpendPerDosageUnit: number;
  avgSpendPerClaim: number;
}

export interface PartDProfile {
  matchedGenericNames: string[];
  /** Distinct brand names seen against this molecule. */
  brandNames: string[];
  /** Highest manufacturer count reported — a direct competitive-intensity read. */
  manufacturerCount: number;
  years: PartDYear[];
  latest: PartDYear | null;
  /** Compound annual growth rate of total spend across the observed window (%). */
  spendCagrPct: number | null;
  /** Change in weighted avg spend per dosage unit, first to last year (%). */
  unitCostChangePct: number | null;
  provenance: Provenance;
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const cache = new Map<string, { at: number; value: PartDProfile | null }>();
const TTL_MS = 12 * 60 * 60 * 1000;

/** Discover the year suffixes present on a row (e.g. 2019…2023). */
function yearsIn(row: Record<string, unknown>): number[] {
  const out = new Set<number>();
  for (const k of Object.keys(row)) {
    const m = /^Tot_Spndng_(\d{4})$/.exec(k);
    if (m) out.add(Number(m[1]));
  }
  return [...out].sort((a, b) => a - b);
}

/**
 * Spending/demand profile for a molecule in Medicare Part D.
 * Pass the canonical RxNorm ingredient name; matching is substring-based because
 * Part D uses salt forms ("Atorvastatin Calcium") and combinations.
 */
export async function getPartDProfile(ingredientName: string): Promise<PartDProfile | null> {
  const term = ingredientName.trim().toLowerCase();
  if (!term) return null;

  const hit = cache.get(term);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  let value: PartDProfile | null = null;
  try {
    const rows = await fetchJSON<Record<string, unknown>[]>(
      `${BASE}?size=300&keyword=${encodeURIComponent(term)}`,
      { timeoutMs: 40000 },
    );

    // Keep only aggregate rows whose generic name genuinely contains the molecule.
    // Combination products (e.g. "Amlodipine/Atorvastatin") are retained — they are
    // real Part D demand for the molecule — but tracked separately in the names.
    const matching = (rows ?? []).filter(r => {
      const gnrc = String(r.Gnrc_Name ?? "").toLowerCase();
      const mftr = String(r.Mftr_Name ?? "");
      return gnrc.includes(term) && mftr === "Overall";
    });

    if (matching.length) {
      const years = yearsIn(matching[0]);
      const byYear: PartDYear[] = years.map(y => {
        let spend = 0;
        let claims = 0;
        let benes = 0;
        let unitCostNum = 0;
        let unitCostWeight = 0;
        let perClaimNum = 0;
        let perClaimWeight = 0;

        for (const r of matching) {
          const s = num(r[`Tot_Spndng_${y}`]);
          const c = num(r[`Tot_Clms_${y}`]);
          const b = num(r[`Tot_Benes_${y}`]);
          const u = num(r[`Avg_Spnd_Per_Dsg_Unt_Wghtd_${y}`]);
          const pc = num(r[`Avg_Spnd_Per_Clm_${y}`]);
          spend += s;
          claims += c;
          benes += b;
          // Weight unit cost by dosage units and per-claim cost by claims, so a
          // tiny combination product cannot skew the molecule-level average.
          const du = num(r[`Tot_Dsg_Unts_${y}`]);
          if (u > 0 && du > 0) { unitCostNum += u * du; unitCostWeight += du; }
          if (pc > 0 && c > 0) { perClaimNum += pc * c; perClaimWeight += c; }
        }

        return {
          year: y,
          totalSpend: spend,
          totalClaims: claims,
          totalBeneficiaries: benes,
          avgSpendPerDosageUnit: unitCostWeight > 0 ? unitCostNum / unitCostWeight : 0,
          avgSpendPerClaim: perClaimWeight > 0 ? perClaimNum / perClaimWeight : 0,
        };
      }).filter(y => y.totalSpend > 0 || y.totalClaims > 0);

      const latest = years.length ? byYear[byYear.length - 1] ?? null : null;
      const first = byYear[0] ?? null;

      let spendCagrPct: number | null = null;
      if (first && latest && first.totalSpend > 0 && latest.year > first.year) {
        const n = latest.year - first.year;
        spendCagrPct = (Math.pow(latest.totalSpend / first.totalSpend, 1 / n) - 1) * 100;
      }

      let unitCostChangePct: number | null = null;
      if (first && latest && first.avgSpendPerDosageUnit > 0) {
        unitCostChangePct =
          ((latest.avgSpendPerDosageUnit - first.avgSpendPerDosageUnit) / first.avgSpendPerDosageUnit) * 100;
      }

      value = {
        matchedGenericNames: [...new Set(matching.map(r => String(r.Gnrc_Name ?? "")))].filter(Boolean),
        brandNames: [...new Set(
          matching
            .map(r => String(r.Brnd_Name ?? ""))
            .filter(b => b && b.toLowerCase() !== term),
        )].slice(0, 12),
        manufacturerCount: Math.max(0, ...matching.map(r => num(r.Tot_Mftr))),
        years: byYear,
        latest,
        spendCagrPct: spendCagrPct === null ? null : Math.round(spendCagrPct * 100) / 100,
        unitCostChangePct: unitCostChangePct === null ? null : Math.round(unitCostChangePct * 100) / 100,
        provenance: {
          source: "CMS Medicare Part D Spending by Drug",
          retrievedAt: new Date().toISOString(),
          verifyUrl: "https://data.cms.gov/summary-statistics-on-use-and-payments/medicare-medicaid-spending-by-drug",
        },
      };
    }
  } catch {
    value = null;
  }

  cache.set(term, { at: Date.now(), value });
  return value;
}
