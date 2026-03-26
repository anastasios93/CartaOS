"use client";

import { trpc } from "@/lib/trpc";
import {
  MOCK_DEALS,
  MOCK_COMPANIES,
  MOCK_NEGOTIATIONS,
  MOCK_CLAUSES,
  type MockDeal,
  type MockCompany,
  type MockNegotiation,
  type MockClause,
} from "@/lib/mock-data";

/**
 * Load deals from database via tRPC, falling back to mock data.
 * Returns the same shape as MOCK_DEALS so pages need minimal changes.
 */
export function useDeals() {
  const query = trpc.deal.list.useQuery(
    { limit: 100 },
    { retry: false, refetchOnWindowFocus: false }
  );

  // Map DB deals to MockDeal shape for backwards compatibility
  const deals: MockDeal[] = query.data?.items
    ? query.data.items.map((d) => ({
        id: d.id,
        title: d.title,
        dealType: d.dealType,
        announcedDate: new Date(d.announcedDate).toISOString().split("T")[0],
        status: d.status,
        licensorName: d.licensorName,
        licenseeName: d.licenseeName,
        assetName: d.assetName ?? "",
        therapeuticArea: d.therapeuticArea,
        modality: d.modality ?? "",
        indication: d.indication ?? "",
        developmentStage: d.developmentStage,
        upfrontPayment: d.upfrontPayment,
        totalDealValue: d.totalDealValue,
        developmentMilestones: d.developmentMilestones,
        commercialMilestones: d.commercialMilestones,
        royaltyRangeLow: d.royaltyRangeLow,
        royaltyRangeHigh: d.royaltyRangeHigh,
        territoryScope: d.territoryScope ?? "Worldwide",
        exclusivity: d.exclusivity ?? true,
        coDevRights: d.coDevRights ?? false,
        coPromoteRights: d.coPromoteRights ?? false,
        optionStructure: d.optionStructure ?? null,
        sourceType: d.sourceType,
        confidence: d.confidence ?? 0.9,
        verified: d.verified,
      }))
    : MOCK_DEALS;

  return {
    deals,
    isLoading: query.isLoading,
    isFromDb: !!query.data?.items,
    error: query.error,
  };
}

/**
 * Load companies from database via tRPC, falling back to mock data.
 */
export function useCompanies() {
  const query = trpc.company.list.useQuery(
    { limit: 100 },
    { retry: false, refetchOnWindowFocus: false }
  );

  const companies: MockCompany[] = query.data?.items
    ? query.data.items.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        headquarters: c.headquarters ?? "",
        website: c.website ?? "",
        marketCap: c.marketCap,
        therapeuticFocus: c.therapeuticFocus,
        modalityFocus: c.modalityFocus,
        avgDealCadenceDays: c.avgDealCadenceDays,
        dealActivityScore: c.dealActivityScore ?? 0,
        partnerStatus: c.partnerStatus,
        partnerScore: c.partnerScore ?? 0,
        lastDealDate: c.lastDealDate
          ? new Date(c.lastDealDate).toISOString().split("T")[0]
          : null,
        notes: c.notes ?? "",
        contactName: c.contacts?.[0]?.name ?? "",
        contactTitle: c.contacts?.[0]?.title ?? "",
        contactEmail: c.contacts?.[0]?.email ?? "",
      }))
    : MOCK_COMPANIES;

  return {
    companies,
    isLoading: query.isLoading,
    isFromDb: !!query.data?.items,
    error: query.error,
  };
}

/**
 * Load negotiations from database via tRPC, falling back to mock data.
 */
export function useNegotiations() {
  const query = trpc.negotiation.list.useQuery(
    { limit: 50 },
    { retry: false, refetchOnWindowFocus: false }
  );

  const negotiations: MockNegotiation[] = query.data?.items
    ? query.data.items.map((n) => ({
        id: n.id,
        title: n.title,
        companyId: n.companyId,
        companyName: n.company?.name ?? "",
        status: n.status,
        proposedUpfront: n.proposedUpfront,
        proposedMilestones: n.proposedMilestones,
        proposedRoyaltyLow: n.proposedRoyaltyLow,
        proposedRoyaltyHigh: n.proposedRoyaltyHigh,
        proposedTerritory: n.proposedTerritory ?? "TBD",
        startDate: new Date(n.startDate).toISOString().split("T")[0],
        targetCloseDate: n.targetCloseDate
          ? new Date(n.targetCloseDate).toISOString().split("T")[0]
          : null,
        healthScore: 70,
        blockers: Array.isArray(n.currentBlockers) ? (n.currentBlockers as MockNegotiation["blockers"]) : [],
        nextSteps: Array.isArray(n.nextSteps) ? (n.nextSteps as MockNegotiation["nextSteps"]) : [],
        riskFlags: Array.isArray(n.riskFlags) ? (n.riskFlags as string[]) : [],
      }))
    : MOCK_NEGOTIATIONS;

  return {
    negotiations,
    isLoading: query.isLoading,
    isFromDb: !!query.data?.items,
    error: query.error,
  };
}

/**
 * Clauses — mock data only for now.
 */
export function useClauses() {
  return {
    clauses: MOCK_CLAUSES,
    isLoading: false,
    isFromDb: false,
  };
}
