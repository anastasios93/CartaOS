// CartaOS Mock Data — Real biotech deal precedents for demo
// All financial figures are from public announcements / SEC filings

export interface MockDeal {
  id: string;
  title: string;
  dealType: string;
  announcedDate: string;
  status: string;
  licensorName: string;
  licenseeName: string;
  assetName: string;
  therapeuticArea: string;
  modality: string;
  indication: string;
  developmentStage: string;
  upfrontPayment: number | null;
  totalDealValue: number | null;
  developmentMilestones: number | null;
  commercialMilestones: number | null;
  royaltyRangeLow: number | null;
  royaltyRangeHigh: number | null;
  territoryScope: string;
  exclusivity: boolean;
  coDevRights: boolean;
  coPromoteRights: boolean;
  optionStructure: string | null;
  sourceType: string;
  confidence: number;
  verified: boolean;
}

export const MOCK_DEALS: MockDeal[] = [];

export interface MockCompany {
  id: string;
  name: string;
  type: string;
  headquarters: string;
  website: string;
  marketCap: number | null;
  therapeuticFocus: string[];
  modalityFocus: string[];
  avgDealCadenceDays: number | null;
  dealActivityScore: number;
  partnerStatus: string;
  partnerScore: number;
  lastDealDate: string | null;
  notes: string;
  contactName: string;
  contactTitle: string;
  contactEmail: string;
}

export const MOCK_COMPANIES: MockCompany[] = [];

export interface MockNegotiation {
  id: string;
  title: string;
  companyId: string;
  companyName: string;
  status: string;
  proposedUpfront: number | null;
  proposedMilestones: number | null;
  proposedRoyaltyLow: number | null;
  proposedRoyaltyHigh: number | null;
  proposedTerritory: string;
  startDate: string;
  targetCloseDate: string | null;
  healthScore: number;
  blockers: { item: string; severity: string; owner: string }[];
  nextSteps: { action: string; owner: string; due: string }[];
  riskFlags: string[];
}

export const MOCK_NEGOTIATIONS: MockNegotiation[] = [];

export interface MockClause {
  id: string;
  clauseType: string;
  title: string;
  clauseText: string;
  summary: string;
  favorability: string;
  negotiationNotes: string;
  dealTitle: string;
}

export const MOCK_CLAUSES: MockClause[] = [];

// Helper functions for mock data analytics
export function getDealsByTherapeuticArea() {
  const grouped: Record<string, number> = {};
  MOCK_DEALS.forEach((d) => {
    grouped[d.therapeuticArea] = (grouped[d.therapeuticArea] || 0) + 1;
  });
  return Object.entries(grouped)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function getDealsByStage() {
  const grouped: Record<string, number> = {};
  MOCK_DEALS.forEach((d) => {
    grouped[d.developmentStage] = (grouped[d.developmentStage] || 0) + 1;
  });
  return Object.entries(grouped).map(([stage, count]) => ({ stage, count }));
}

export function getDealsByType() {
  const grouped: Record<string, number> = {};
  MOCK_DEALS.forEach((d) => {
    grouped[d.dealType] = (grouped[d.dealType] || 0) + 1;
  });
  return Object.entries(grouped).map(([type, count]) => ({ type, count }));
}

export function getDealsByModality() {
  const grouped: Record<string, number> = {};
  MOCK_DEALS.forEach((d) => {
    grouped[d.modality] = (grouped[d.modality] || 0) + 1;
  });
  return Object.entries(grouped)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function getUpfrontStats() {
  const upfronts = MOCK_DEALS.filter((d) => d.upfrontPayment != null).map(
    (d) => d.upfrontPayment!
  );
  upfronts.sort((a, b) => a - b);
  const median = upfronts[Math.floor(upfronts.length / 2)];
  const mean = upfronts.reduce((a, b) => a + b, 0) / upfronts.length;
  const min = upfronts[0];
  const max = upfronts[upfronts.length - 1];
  return { median, mean, min, max, count: upfronts.length };
}

export function getRoyaltyStats() {
  const lows = MOCK_DEALS.filter((d) => d.royaltyRangeLow != null).map(
    (d) => d.royaltyRangeLow!
  );
  const highs = MOCK_DEALS.filter((d) => d.royaltyRangeHigh != null).map(
    (d) => d.royaltyRangeHigh!
  );
  return {
    medianLow: lows.sort((a, b) => a - b)[Math.floor(lows.length / 2)] || 0,
    medianHigh: highs.sort((a, b) => a - b)[Math.floor(highs.length / 2)] || 0,
    rangeLow: Math.min(...lows),
    rangeHigh: Math.max(...highs),
    count: lows.length,
  };
}
