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
export const MOLECULES: MoleculeArbitrage[] = [
  {
    genericName: "Semaglutide",
    brandName: "Ozempic / Wegovy",
    originator: "Novo Nordisk",
    therapeuticCategory: "GLP-1 / Metabolic (T2D, Obesity)",
    modality: "Peptide",
    whoEssential: false,
    globalAnnualSalesUSDb: 28.5,
    regions: [
      { iso: "CAN", patentExpiry: "2026-01-04", status: "generic_available", brandPriceMonthly: 870, genericPriceMonthly: 290, genericCompetitors: 3, note: "Apotex & Dr. Reddy's generics approved at ~1/3 brand price" },
      { iso: "IND", patentExpiry: "2026-03-19", status: "imminent", brandPriceMonthly: 95, genericPriceMonthly: 38, genericCompetitors: 6, note: "Multiple domestic generics preparing launch" },
      { iso: "BRA", patentExpiry: "2026-06-01", status: "imminent", brandPriceMonthly: 210, genericPriceMonthly: 80, genericCompetitors: 2 },
      { iso: "EU",  patentExpiry: "2031-03-15", status: "protected", brandPriceMonthly: 760, genericPriceMonthly: null, genericCompetitors: 0 },
      { iso: "JPN", patentExpiry: "2031-09-01", status: "protected", brandPriceMonthly: 540, genericPriceMonthly: null, genericCompetitors: 0 },
      { iso: "USA", patentExpiry: "2032-03-20", status: "protected", brandPriceMonthly: 935, genericPriceMonthly: null, genericCompetitors: 0, note: "Novo Nordisk patent thicket blocks substitution until 2032" },
    ],
  },
  {
    genericName: "Apixaban",
    brandName: "Eliquis",
    originator: "BMS / Pfizer",
    therapeuticCategory: "Anticoagulant (DOAC)",
    modality: "Small molecule",
    whoEssential: true,
    globalAnnualSalesUSDb: 13.1,
    regions: [
      { iso: "IND", patentExpiry: "2023-09-01", status: "generic_available", brandPriceMonthly: 42, genericPriceMonthly: 9, genericCompetitors: 8 },
      { iso: "CAN", patentExpiry: "2024-11-20", status: "generic_available", brandPriceMonthly: 95, genericPriceMonthly: 34, genericCompetitors: 4 },
      { iso: "EU",  patentExpiry: "2026-05-22", status: "imminent", brandPriceMonthly: 88, genericPriceMonthly: null, genericCompetitors: 0 },
      { iso: "USA", patentExpiry: "2028-04-01", status: "protected", brandPriceMonthly: 595, genericPriceMonthly: null, genericCompetitors: 0, note: "Settlement permits limited generic entry 2026, full 2028" },
    ],
  },
  {
    genericName: "Dapagliflozin",
    brandName: "Farxiga / Forxiga",
    originator: "AstraZeneca",
    therapeuticCategory: "SGLT2 inhibitor (T2D, HF, CKD)",
    modality: "Small molecule",
    whoEssential: false,
    globalAnnualSalesUSDb: 7.7,
    regions: [
      { iso: "IND", patentExpiry: "2023-10-02", status: "generic_available", brandPriceMonthly: 28, genericPriceMonthly: 6, genericCompetitors: 9 },
      { iso: "CAN", patentExpiry: "2024-07-15", status: "generic_available", brandPriceMonthly: 78, genericPriceMonthly: 27, genericCompetitors: 5 },
      { iso: "EU",  patentExpiry: "2028-05-15", status: "protected", brandPriceMonthly: 62, genericPriceMonthly: null, genericCompetitors: 0 },
      { iso: "USA", patentExpiry: "2030-10-02", status: "protected", brandPriceMonthly: 580, genericPriceMonthly: null, genericCompetitors: 0 },
    ],
  },
  {
    genericName: "Rivaroxaban",
    brandName: "Xarelto",
    originator: "Bayer / J&J",
    therapeuticCategory: "Anticoagulant (DOAC)",
    modality: "Small molecule",
    whoEssential: true,
    globalAnnualSalesUSDb: 6.5,
    regions: [
      { iso: "IND", patentExpiry: "2022-04-01", status: "generic_available", brandPriceMonthly: 38, genericPriceMonthly: 8, genericCompetitors: 10 },
      { iso: "EU",  patentExpiry: "2024-04-01", status: "generic_available", brandPriceMonthly: 82, genericPriceMonthly: 31, genericCompetitors: 6 },
      { iso: "CAN", patentExpiry: "2025-09-01", status: "imminent", brandPriceMonthly: 91, genericPriceMonthly: null, genericCompetitors: 0 },
      { iso: "USA", patentExpiry: "2026-11-01", status: "protected", brandPriceMonthly: 540, genericPriceMonthly: null, genericCompetitors: 0 },
    ],
  },
  {
    genericName: "Ustekinumab",
    brandName: "Stelara",
    originator: "Johnson & Johnson",
    therapeuticCategory: "IL-12/23 inhibitor (Immunology)",
    modality: "Monoclonal antibody",
    whoEssential: false,
    globalAnnualSalesUSDb: 10.9,
    regions: [
      { iso: "EU",  patentExpiry: "2024-07-20", status: "generic_available", brandPriceMonthly: 2400, genericPriceMonthly: 1320, genericCompetitors: 4, note: "Biosimilars (Wezlana, Pyzchiva) launched 2024" },
      { iso: "CAN", patentExpiry: "2024-12-01", status: "generic_available", brandPriceMonthly: 3100, genericPriceMonthly: 1860, genericCompetitors: 2 },
      { iso: "USA", patentExpiry: "2025-01-01", status: "generic_available", brandPriceMonthly: 5800, genericPriceMonthly: 4200, genericCompetitors: 3, note: "US biosimilars launched Jan 2025 under settlement" },
      { iso: "JPN", patentExpiry: "2027-03-01", status: "protected", brandPriceMonthly: 3600, genericPriceMonthly: null, genericCompetitors: 0 },
    ],
  },
  {
    genericName: "Tirzepatide",
    brandName: "Mounjaro / Zepbound",
    originator: "Eli Lilly",
    therapeuticCategory: "GIP/GLP-1 (T2D, Obesity)",
    modality: "Peptide",
    whoEssential: false,
    globalAnnualSalesUSDb: 16.5,
    regions: [
      { iso: "IND", patentExpiry: "2026-08-01", status: "imminent", brandPriceMonthly: 220, genericPriceMonthly: 95, genericCompetitors: 1, note: "Lilly launched lower-priced vials; generics expected post-2026" },
      { iso: "EU",  patentExpiry: "2036-06-01", status: "protected", brandPriceMonthly: 980, genericPriceMonthly: null, genericCompetitors: 0 },
      { iso: "USA", patentExpiry: "2036-12-01", status: "protected", brandPriceMonthly: 1080, genericPriceMonthly: null, genericCompetitors: 0 },
    ],
  },
  {
    genericName: "Sitagliptin",
    brandName: "Januvia",
    originator: "Merck & Co.",
    therapeuticCategory: "DPP-4 inhibitor (T2D)",
    modality: "Small molecule",
    whoEssential: false,
    globalAnnualSalesUSDb: 3.4,
    regions: [
      { iso: "IND", patentExpiry: "2022-01-01", status: "generic_available", brandPriceMonthly: 18, genericPriceMonthly: 4, genericCompetitors: 12 },
      { iso: "EU",  patentExpiry: "2022-09-23", status: "generic_available", brandPriceMonthly: 54, genericPriceMonthly: 19, genericCompetitors: 8 },
      { iso: "CAN", patentExpiry: "2023-01-01", status: "generic_available", brandPriceMonthly: 71, genericPriceMonthly: 28, genericCompetitors: 5 },
      { iso: "USA", patentExpiry: "2026-07-01", status: "protected", brandPriceMonthly: 560, genericPriceMonthly: null, genericCompetitors: 0 },
    ],
  },
  {
    genericName: "Empagliflozin",
    brandName: "Jardiance",
    originator: "Boehringer / Lilly",
    therapeuticCategory: "SGLT2 inhibitor (T2D, HF)",
    modality: "Small molecule",
    whoEssential: false,
    globalAnnualSalesUSDb: 11.0,
    regions: [
      { iso: "IND", patentExpiry: "2024-06-01", status: "generic_available", brandPriceMonthly: 30, genericPriceMonthly: 7, genericCompetitors: 7 },
      { iso: "EU",  patentExpiry: "2028-03-01", status: "protected", brandPriceMonthly: 58, genericPriceMonthly: null, genericCompetitors: 0 },
      { iso: "CAN", patentExpiry: "2028-08-01", status: "protected", brandPriceMonthly: 84, genericPriceMonthly: null, genericCompetitors: 0 },
      { iso: "USA", patentExpiry: "2029-08-01", status: "protected", brandPriceMonthly: 610, genericPriceMonthly: null, genericCompetitors: 0 },
    ],
  },
];

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
