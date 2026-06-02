/**
 * Patent Arbitrage Engine — Cross-Border Patent Asymmetry Data + AIR Scoring
 *
 * Implements the CliffBridge AI "Ozempic Asymmetry" concept: pharmaceutical
 * patents expire at different times in different jurisdictions, creating
 * structural arbitrage windows where a blockbuster is off-patent in one G7
 * country but protected across the border.
 *
 * The Arbitrage Index Rating (AIR) engine scores each cross-border opportunity
 * 0-100 using the formula from the CliffBridge PRD:
 *
 *   AIR = (Δt/Tmax × 0.40) + (MarginDelta/BrandPrice_target × 0.35)
 *         + ((1 − CompDensity/10) × 0.25)
 *
 * where Δt is the patent-expiry gap (days), MarginDelta the per-unit price
 * spread, and CompDensity the generic competitor count in the source market.
 */

// ─── Region metadata ─────────────────────────────────────────────────────────

export interface RegionMeta {
  iso: string; // ISO Alpha-3
  label: string;
  flag: string;
  authority: string; // regulatory body
  genericPathway: string;
}

export const REGIONS: Record<string, RegionMeta> = {
  USA: { iso: "USA", label: "United States", flag: "🇺🇸", authority: "FDA", genericPathway: "ANDA" },
  CAN: { iso: "CAN", label: "Canada", flag: "🇨🇦", authority: "Health Canada", genericPathway: "ANDS" },
  GBR: { iso: "GBR", label: "United Kingdom", flag: "🇬🇧", authority: "MHRA", genericPathway: "Abridged" },
  EU:  { iso: "EU",  label: "European Union", flag: "🇪🇺", authority: "EMA", genericPathway: "Generic MA" },
  JPN: { iso: "JPN", label: "Japan", flag: "🇯🇵", authority: "PMDA", genericPathway: "Generic NDA" },
  CHN: { iso: "CHN", label: "China", flag: "🇨🇳", authority: "NMPA", genericPathway: "Generic Reg." },
  IND: { iso: "IND", label: "India", flag: "🇮🇳", authority: "CDSCO", genericPathway: "Abbreviated" },
  BRA: { iso: "BRA", label: "Brazil", flag: "🇧🇷", authority: "ANVISA", genericPathway: "Generic Reg." },
  AUS: { iso: "AUS", label: "Australia", flag: "🇦🇺", authority: "TGA", genericPathway: "Generic" },
};

// ─── Molecule patent data ────────────────────────────────────────────────────

export type PatentStatus = "protected" | "imminent" | "generic_available";

export interface RegionPatentEntry {
  iso: string;
  patentExpiry: string; // ISO date
  status: PatentStatus;
  brandPriceMonthly: number; // USD per month of therapy
  genericPriceMonthly: number | null; // USD; null if no generic
  genericCompetitors: number;
  note?: string;
}

export interface MoleculeArbitrage {
  genericName: string;
  brandName: string;
  originator: string;
  therapeuticCategory: string;
  modality: string;
  whoEssential: boolean;
  globalAnnualSalesUSDb: number; // billions
  regions: RegionPatentEntry[];
}

/**
 * Curated dataset of blockbuster molecules with documented cross-border
 * patent asymmetries. Patent dates & pricing are approximate, drawn from
 * public regulatory and pricing sources, for illustrative scoring.
 */
export const MOLECULES: MoleculeArbitrage[] = [];

// ─── AIR Engine ────────────────────────────────────────────────────────────

const TIME_NORMALIZATION_DAYS = 2190; // 6-year structural arbitrage window
const AIR_WEIGHTS = { time: 0.40, margin: 0.35, competition: 0.25 };

export interface AsymmetryRecord {
  moleculeName: string;
  brandReference: string;
  originator: string;
  therapeuticCategory: string;
  modality: string;
  globalAnnualSalesUSDb: number;
  whoEssential: boolean;
  sourceRegion: string;
  sourceRegionLabel: string;
  sourceFlag: string;
  targetRegion: string;
  targetRegionLabel: string;
  targetFlag: string;
  deltaDays: number;
  deltaYears: number;
  airScore: number;
  airBand: "Exceptional" | "Strong" | "Moderate" | "Marginal";
  financials: {
    brandPriceTarget: number;
    genericPriceSource: number;
    grossArbitrageDelta: number;
    annualSavingsPerPatient: number;
    marginPct: number;
  };
  sourcePathway: string;
  targetPathway: string;
  sourceStatus: PatentStatus;
  targetStatus: PatentStatus;
  sourceCompetitors: number;
  rationale: string;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function airBand(score: number): AsymmetryRecord["airBand"] {
  if (score >= 80) return "Exceptional";
  if (score >= 60) return "Strong";
  if (score >= 40) return "Moderate";
  return "Marginal";
}

/**
 * Compute the Arbitrage Index Rating for a single source→target pair.
 */
export function calculateAIR(params: {
  deltaDays: number;
  marginDelta: number;
  brandPriceTarget: number;
  compDensity: number;
}): number {
  const { deltaDays, marginDelta, brandPriceTarget, compDensity } = params;
  const timeScore = clamp(deltaDays / TIME_NORMALIZATION_DAYS, 0, 1) * AIR_WEIGHTS.time;
  const marginScore = clamp(marginDelta / brandPriceTarget, 0, 1) * AIR_WEIGHTS.margin;
  const compScore = (1.0 - clamp(compDensity, 0, 10) / 10) * AIR_WEIGHTS.competition;
  return Math.round((timeScore + marginScore + compScore) * 100 * 10) / 10;
}

/**
 * Generate all viable cross-border asymmetry records across the dataset.
 * An opportunity exists when the SOURCE region has a generic available (cheap)
 * and the TARGET region is still protected (expensive brand).
 */
export function computeAsymmetries(options: { minAir?: number } = {}): AsymmetryRecord[] {
  const { minAir = 0 } = options;
  const records: AsymmetryRecord[] = [];

  for (const mol of MOLECULES) {
    for (const source of mol.regions) {
      // Source must have a generic available with a price
      if (source.status !== "generic_available" || source.genericPriceMonthly == null) continue;

      for (const target of mol.regions) {
        if (target.iso === source.iso) continue;
        // Target must be protected (or imminent) — the arbitrage window
        if (target.status === "generic_available") continue;

        const deltaDays = Math.round(
          (new Date(target.patentExpiry).getTime() - new Date(source.patentExpiry).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (deltaDays <= 0) continue; // target must expire later than source

        const brandPriceTarget = target.brandPriceMonthly;
        const genericPriceSource = source.genericPriceMonthly;
        const marginDelta = brandPriceTarget - genericPriceSource;
        if (marginDelta <= 0) continue;

        const airScore = calculateAIR({
          deltaDays,
          marginDelta,
          brandPriceTarget,
          compDensity: source.genericCompetitors,
        });
        if (airScore < minAir) continue;

        const sMeta = REGIONS[source.iso];
        const tMeta = REGIONS[target.iso];

        records.push({
          moleculeName: mol.genericName,
          brandReference: mol.brandName,
          originator: mol.originator,
          therapeuticCategory: mol.therapeuticCategory,
          modality: mol.modality,
          globalAnnualSalesUSDb: mol.globalAnnualSalesUSDb,
          whoEssential: mol.whoEssential,
          sourceRegion: source.iso,
          sourceRegionLabel: sMeta?.label ?? source.iso,
          sourceFlag: sMeta?.flag ?? "🌐",
          targetRegion: target.iso,
          targetRegionLabel: tMeta?.label ?? target.iso,
          targetFlag: tMeta?.flag ?? "🌐",
          deltaDays,
          deltaYears: Math.round((deltaDays / 365) * 10) / 10,
          airScore,
          airBand: airBand(airScore),
          financials: {
            brandPriceTarget,
            genericPriceSource,
            grossArbitrageDelta: marginDelta,
            annualSavingsPerPatient: marginDelta * 12,
            marginPct: Math.round((marginDelta / brandPriceTarget) * 1000) / 10,
          },
          sourcePathway: sMeta?.genericPathway ?? "—",
          targetPathway: tMeta?.genericPathway ?? "—",
          sourceStatus: source.status,
          targetStatus: target.status,
          sourceCompetitors: source.genericCompetitors,
          rationale: `${mol.brandName} is off-patent in ${sMeta?.label ?? source.iso} (${source.genericCompetitors} generic competitors, generic at $${genericPriceSource}/mo) but protected in ${tMeta?.label ?? target.iso} until ${new Date(target.patentExpiry).getFullYear()} (brand $${brandPriceTarget}/mo). A ${Math.round((deltaDays / 365) * 10) / 10}-year structural window with $${marginDelta}/mo gross spread.`,
        });
      }
    }
  }

  return records.sort((a, b) => b.airScore - a.airScore);
}

/**
 * Aggregate stats for the dashboard header.
 */
export function getArbitrageStats() {
  const records = computeAsymmetries();
  const totalMolecules = MOLECULES.length;
  const exceptional = records.filter(r => r.airBand === "Exceptional").length;
  const avgAir = records.length
    ? Math.round((records.reduce((s, r) => s + r.airScore, 0) / records.length) * 10) / 10
    : 0;
  const totalSalesExposed = MOLECULES.reduce((s, m) => s + m.globalAnnualSalesUSDb, 0);
  const maxSavings = records.length
    ? Math.max(...records.map(r => r.financials.annualSavingsPerPatient))
    : 0;
  return {
    totalOpportunities: records.length,
    totalMolecules,
    exceptional,
    avgAir,
    totalSalesExposedUSDb: Math.round(totalSalesExposed * 10) / 10,
    maxAnnualSavingsPerPatient: maxSavings,
  };
}
