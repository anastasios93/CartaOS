/**
 * Worldwide pharma/biotech deal economics dataset
 * Compiled from public sources: BioSpace, Labiotech, FiercePharma, Nature,
 * Blue Matter Consulting, Vision Lifesciences, JP Morgan, press releases.
 *
 * All financial values normalized to $M (millions USD).
 * Last updated: March 2026
 */

export interface WorldwideDeal {
  id: string;
  licensor: string;
  licensee: string;
  title: string;
  therapeuticArea: string;
  dealType: "LICENSE" | "COLLABORATION" | "M_AND_A" | "OPTION";
  stage: "DISCOVERY" | "PRECLINICAL" | "PHASE_1" | "PHASE_2" | "PHASE_3" | "APPROVED";
  modality: string;
  upfrontPayment?: number;   // $M
  totalDealValue?: number;   // $M
  milestones?: number;       // $M
  royaltyLow?: number;       // %
  royaltyHigh?: number;      // %
  announcedDate: string;     // YYYY-MM-DD
  source: string;
  sourceUrl?: string;
  geography?: string;
  indication?: string;
}

let _id = 0;
const d = (
  licensor: string, licensee: string, ta: string, type: WorldwideDeal["dealType"],
  stage: WorldwideDeal["stage"], modality: string,
  upfront: number | undefined, total: number | undefined, milestones: number | undefined,
  royLow: number | undefined, royHigh: number | undefined,
  date: string, source: string, geo?: string, indication?: string, url?: string
): WorldwideDeal => ({
  id: `wd-${++_id}`,
  licensor, licensee,
  title: `${licensee}–${licensor}`,
  therapeuticArea: ta, dealType: type, stage, modality,
  upfrontPayment: upfront, totalDealValue: total, milestones,
  royaltyLow: royLow, royaltyHigh: royHigh,
  announcedDate: date, source, geography: geo, indication, sourceUrl: url,
});

export const WORLDWIDE_DEALS: WorldwideDeal[] = [];

// ═══════════════════════════════════════════════════════════════
// AGGREGATE BENCHMARK FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function computeWorldwideBenchmarks(deals: WorldwideDeal[], filters?: {
  therapeuticArea?: string;
  stage?: string;
  modality?: string;
  dealType?: string;
  indication?: string;
  geography?: string;
  dateFrom?: string;
  dateTo?: string;
  company?: string;
  /** Pass alias-aware matcher functions for accurate cross-dataset filtering */
  _matchTA?: (dealTA: string, filterTA: string) => boolean;
  _matchModality?: (dealMod: string, filterMod: string) => boolean;
}) {
  let filtered = [...deals];

  if (filters) {
    if (filters.therapeuticArea && filters.therapeuticArea !== "all") {
      const matcher = filters._matchTA ?? ((d: string, f: string) => d.toLowerCase().includes(f.toLowerCase()));
      filtered = filtered.filter(d => matcher(d.therapeuticArea, filters.therapeuticArea!));
    }
    if (filters.stage && filters.stage !== "all")
      filtered = filtered.filter(d => d.stage === filters.stage);
    if (filters.modality && filters.modality !== "all") {
      const matcher = filters._matchModality ?? ((d: string, f: string) => d.toLowerCase().includes(f.toLowerCase()));
      filtered = filtered.filter(d => matcher(d.modality, filters.modality!));
    }
    if (filters.dealType && filters.dealType !== "all")
      filtered = filtered.filter(d => d.dealType === filters.dealType);
    if (filters.indication)
      filtered = filtered.filter(d => d.indication?.toLowerCase().includes(filters.indication!.toLowerCase()));
    if (filters.geography)
      filtered = filtered.filter(d => d.geography?.toLowerCase().includes(filters.geography!.toLowerCase()));
    if (filters.dateFrom)
      filtered = filtered.filter(d => d.announcedDate >= filters.dateFrom!);
    if (filters.dateTo)
      filtered = filtered.filter(d => d.announcedDate <= filters.dateTo!);
    if (filters.company)
      filtered = filtered.filter(d =>
        d.licensor.toLowerCase().includes(filters.company!.toLowerCase()) ||
        d.licensee.toLowerCase().includes(filters.company!.toLowerCase())
      );
  }

  const upfronts = filtered.map(d => d.upfrontPayment).filter((v): v is number => v != null && v > 0);
  const totals = filtered.map(d => d.totalDealValue).filter((v): v is number => v != null && v > 0);
  const milestoneVals = filtered.map(d => d.milestones).filter((v): v is number => v != null && v > 0);
  const royLows = filtered.map(d => d.royaltyLow).filter((v): v is number => v != null && v > 0);
  const royHighs = filtered.map(d => d.royaltyHigh).filter((v): v is number => v != null && v > 0);

  const median = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  const mean = (arr: number[]) => arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
  const p25 = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.25)];
  };
  const p75 = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.75)];
  };

  // Group by therapeutic area
  const byTA: Record<string, WorldwideDeal[]> = {};
  for (const deal of filtered) {
    const ta = deal.therapeuticArea;
    if (!byTA[ta]) byTA[ta] = [];
    byTA[ta].push(deal);
  }

  // Group by stage
  const byStage: Record<string, WorldwideDeal[]> = {};
  for (const deal of filtered) {
    if (!byStage[deal.stage]) byStage[deal.stage] = [];
    byStage[deal.stage].push(deal);
  }

  // Group by modality
  const byModality: Record<string, WorldwideDeal[]> = {};
  for (const deal of filtered) {
    const mod = deal.modality;
    if (!byModality[mod]) byModality[mod] = [];
    byModality[mod].push(deal);
  }

  // Upfront as % of total
  const upfrontPcts = filtered
    .filter(d => d.upfrontPayment && d.totalDealValue && d.totalDealValue > 0)
    .map(d => (d.upfrontPayment! / d.totalDealValue!) * 100);

  return {
    totalDeals: filtered.length,
    deals: filtered,

    upfronts: {
      count: upfronts.length,
      median: median(upfronts),
      mean: mean(upfronts),
      p25: p25(upfronts),
      p75: p75(upfronts),
      min: upfronts.length ? Math.min(...upfronts) : 0,
      max: upfronts.length ? Math.max(...upfronts) : 0,
    },

    totalValues: {
      count: totals.length,
      median: median(totals),
      mean: mean(totals),
      p25: p25(totals),
      p75: p75(totals),
      min: totals.length ? Math.min(...totals) : 0,
      max: totals.length ? Math.max(...totals) : 0,
    },

    milestones: {
      count: milestoneVals.length,
      median: median(milestoneVals),
      mean: mean(milestoneVals),
    },

    royalties: {
      count: royLows.length,
      medianLow: median(royLows),
      medianHigh: median(royHighs),
      meanLow: mean(royLows),
      meanHigh: mean(royHighs),
    },

    upfrontAsPercent: {
      count: upfrontPcts.length,
      median: median(upfrontPcts),
      mean: mean(upfrontPcts),
    },

    byTherapeuticArea: Object.entries(byTA).map(([ta, deals]) => ({
      therapeuticArea: ta,
      count: deals.length,
      medianUpfront: median(deals.map(d => d.upfrontPayment).filter((v): v is number => v != null && v > 0)),
      medianTotal: median(deals.map(d => d.totalDealValue).filter((v): v is number => v != null && v > 0)),
    })).sort((a, b) => b.count - a.count),

    byStage: Object.entries(byStage).map(([stage, deals]) => ({
      stage,
      count: deals.length,
      medianUpfront: median(deals.map(d => d.upfrontPayment).filter((v): v is number => v != null && v > 0)),
      medianTotal: median(deals.map(d => d.totalDealValue).filter((v): v is number => v != null && v > 0)),
    })).sort((a, b) => {
      const order = ["DISCOVERY", "PRECLINICAL", "PHASE_1", "PHASE_2", "PHASE_3", "APPROVED"];
      return order.indexOf(a.stage) - order.indexOf(b.stage);
    }),

    byModality: Object.entries(byModality).map(([mod, deals]) => ({
      modality: mod,
      count: deals.length,
      medianUpfront: median(deals.map(d => d.upfrontPayment).filter((v): v is number => v != null && v > 0)),
      medianTotal: median(deals.map(d => d.totalDealValue).filter((v): v is number => v != null && v > 0)),
    })).sort((a, b) => b.count - a.count),
  };
}
