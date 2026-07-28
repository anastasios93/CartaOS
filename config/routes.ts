/**
 * Strategy route configuration (§5.1 off-patent, §5.2 innovative).
 *
 * Each route carries the STRUCTURAL economics that distinguish it — what share
 * of value the holder captures, which costs it bears, what it receives at
 * transaction. Those shapes are stable facts about the deal type, not model
 * output; the run-specific numbers (market size, share, erosion, costs) come
 * from the assumptions layer. The deterministic engine combines the two.
 *
 * Tuning a route's economics is a config edit, not a code change (§7).
 */

// ── Off-patent commercialisation & partnering routes (§5.1) ─────────────────

export interface OffPatentRouteDef {
  key: string;
  label: string;
  description: string;
  /** Share of in-market net revenue the holder captures (0–1). */
  revenueShare: number;
  /** Does the holder fund launch/commercial build-out? */
  bearsLaunchCost: boolean;
  /** Does the holder carry COGS? */
  bearsCogs: boolean;
  /** Does the route require the holder to hold or obtain the MA? */
  requiresMa: boolean;
  /** Months added to (or removed from) the base time-to-launch. */
  timeToLaunchDeltaMonths: number;
  /** One-off cash in (+) or out (−) at close, as a multiple of year-1 market revenue. */
  upfrontMultipleOfYear1: number;
  /** Royalty on partner-booked sales, where the holder does not book revenue. */
  royaltyRate: number;
  /** What would break this plan — surfaced as the route's key dependency prompt. */
  dependencyPrompt: string;
}

export const OFF_PATENT_ROUTES: OffPatentRouteDef[] = [
  {
    key: "own_ma_own_distribution",
    label: "Own MA + own distribution",
    description: "Hold the marketing authorisation and build or use own commercial infrastructure in each market.",
    revenueShare: 1,
    bearsLaunchCost: true,
    bearsCogs: true,
    requiresMa: true,
    timeToLaunchDeltaMonths: 0,
    upfrontMultipleOfYear1: 0,
    royaltyRate: 0,
    dependencyPrompt: "Local commercial infrastructure and the capital to fund launch before revenue.",
  },
  {
    key: "in_license_ma",
    label: "In-license an existing MA / dossier",
    description: "Acquire rights to a dossier already approved in the target market rather than filing new.",
    revenueShare: 1,
    bearsLaunchCost: true,
    bearsCogs: true,
    requiresMa: false,
    timeToLaunchDeltaMonths: -12,
    upfrontMultipleOfYear1: -0.5,
    royaltyRate: 0,
    dependencyPrompt: "A willing dossier holder and clean MA transfer, including site GMP standing.",
  },
  {
    key: "out_license_ma",
    label: "Out-license the MA to a local partner",
    description: "Transfer or license the authorisation to a partner who books sales and pays a royalty.",
    revenueShare: 0,
    bearsLaunchCost: false,
    bearsCogs: false,
    requiresMa: true,
    timeToLaunchDeltaMonths: -6,
    upfrontMultipleOfYear1: 0.3,
    royaltyRate: 0.15,
    dependencyPrompt: "A partner with genuine channel access; royalty is only as good as their execution.",
  },
  {
    key: "distribution_agreement",
    label: "Distribution / supply agreement (no MA transfer)",
    description: "Retain the MA and supply product to a distributor who handles in-market sales.",
    revenueShare: 0.45,
    bearsLaunchCost: false,
    bearsCogs: true,
    requiresMa: true,
    timeToLaunchDeltaMonths: -3,
    upfrontMultipleOfYear1: 0,
    royaltyRate: 0,
    dependencyPrompt: "Transfer-price discipline — distributor margin expectations compress the holder's share.",
  },
  {
    key: "tender_agent",
    label: "Tender-agent model",
    description: "Compete for public/insurer tenders through a local agent with tender-qualification standing.",
    revenueShare: 0.6,
    bearsLaunchCost: false,
    bearsCogs: true,
    requiresMa: true,
    timeToLaunchDeltaMonths: 0,
    upfrontMultipleOfYear1: 0,
    royaltyRate: 0,
    dependencyPrompt: "Winning the tender cycle — volumes are lumpy and a lost cycle means near-zero revenue.",
  },
  {
    key: "contract_manufacture",
    label: "Contract manufacture for a third party",
    description: "Supply finished dose or API to another MA holder; no market-facing position.",
    revenueShare: 0.25,
    bearsLaunchCost: false,
    bearsCogs: true,
    requiresMa: false,
    timeToLaunchDeltaMonths: -6,
    upfrontMultipleOfYear1: 0,
    royaltyRate: 0,
    dependencyPrompt: "Cost position — this route only works if COGS beats the customer's alternatives.",
  },
  {
    key: "profit_share",
    label: "Profit-share / co-promotion",
    description: "Share commercial effort and economics with a partner in-market.",
    revenueShare: 0.5,
    bearsLaunchCost: true,
    bearsCogs: true,
    requiresMa: true,
    timeToLaunchDeltaMonths: -3,
    upfrontMultipleOfYear1: 0,
    royaltyRate: 0,
    dependencyPrompt: "Alignment on spend — a partner who under-invests halves the return without halving the cost.",
  },
  {
    key: "asset_sale",
    label: "Asset or dossier sale",
    description: "Sell the asset outright for a one-off consideration; no ongoing participation.",
    revenueShare: 0,
    bearsLaunchCost: false,
    bearsCogs: false,
    requiresMa: true,
    timeToLaunchDeltaMonths: -12,
    upfrontMultipleOfYear1: 2.5,
    royaltyRate: 0,
    dependencyPrompt: "Finding a buyer who values the asset above the holder's own discounted cash flows.",
  },
];

// ── Innovative partnering & development routes (§5.2) ───────────────────────

export interface InnovativeRouteDef {
  key: string;
  label: string;
  description: string;
  /** Fraction of the asset's risk-adjusted value realised by the holder. */
  valueCaptureShare: number;
  /** Fraction of remaining development cost the holder still funds. */
  costRetainedShare: number;
  /** Fraction of development/technical risk the holder still carries. */
  riskRetainedShare: number;
  /** Equity dilution incurred to fund the route (0–1). */
  dilution: number;
  /** Months from today to the transaction event this route implies. */
  monthsToTransaction: number;
  /** Deal-structure envelope, as fractions of total deal value. */
  envelope: { upfront: number; milestones: number; royalty: number };
  dependencyPrompt: string;
}

export const INNOVATIVE_ROUTES: InnovativeRouteDef[] = [
  {
    key: "out_license_global",
    label: "Out-license — global",
    description: "License worldwide rights to a single partner who funds and runs development from here.",
    valueCaptureShare: 0.3,
    costRetainedShare: 0,
    riskRetainedShare: 0.1,
    dilution: 0,
    monthsToTransaction: 9,
    envelope: { upfront: 0.12, milestones: 0.53, royalty: 0.35 },
    dependencyPrompt: "A single partner willing to take the whole asset — narrows the buyer set sharply.",
  },
  {
    key: "out_license_regional",
    label: "Out-license — regional (rights split)",
    description: "Split rights by territory (US / EU / Japan / China / RoW) across multiple partners.",
    valueCaptureShare: 0.42,
    costRetainedShare: 0.25,
    riskRetainedShare: 0.35,
    dilution: 0,
    monthsToTransaction: 14,
    envelope: { upfront: 0.15, milestones: 0.5, royalty: 0.35 },
    dependencyPrompt: "Managing several partners without fragmenting the development plan or the data package.",
  },
  {
    key: "co_development",
    label: "Co-development / co-funding",
    description: "Share development cost and economics with a partner through to approval.",
    valueCaptureShare: 0.5,
    costRetainedShare: 0.5,
    riskRetainedShare: 0.5,
    dilution: 0,
    monthsToTransaction: 12,
    envelope: { upfront: 0.1, milestones: 0.45, royalty: 0.45 },
    dependencyPrompt: "Governance — co-development stalls when partners disagree on trial design or spend.",
  },
  {
    key: "option_to_license",
    label: "Option-to-license",
    description: "Partner funds a defined package for the right to license later at pre-agreed terms.",
    valueCaptureShare: 0.35,
    costRetainedShare: 0.2,
    riskRetainedShare: 0.45,
    dilution: 0,
    monthsToTransaction: 6,
    envelope: { upfront: 0.08, milestones: 0.57, royalty: 0.35 },
    dependencyPrompt: "The option strike — cheap options cap the upside if the data turn out well.",
  },
  {
    key: "newco_spinout",
    label: "NewCo / spin-out",
    description: "Move the asset into a financed vehicle with dedicated management.",
    valueCaptureShare: 0.55,
    costRetainedShare: 0.15,
    riskRetainedShare: 0.6,
    dilution: 0.45,
    monthsToTransaction: 18,
    envelope: { upfront: 0.05, milestones: 0.3, royalty: 0.65 },
    dependencyPrompt: "Raising the round — a NewCo that cannot finance is worse than no spin-out.",
  },
  {
    key: "outright_sale",
    label: "Outright asset sale",
    description: "Sell the asset for a single consideration with no ongoing participation.",
    valueCaptureShare: 0.22,
    costRetainedShare: 0,
    riskRetainedShare: 0,
    dilution: 0,
    monthsToTransaction: 8,
    envelope: { upfront: 1, milestones: 0, royalty: 0 },
    dependencyPrompt: "Timing — selling before the next inflection forfeits the step-up the data would create.",
  },
  {
    key: "advance_then_transact",
    label: "Advance alone to the next inflection, then transact",
    description: "Fund the next value-inflecting study, then take a de-risked asset to market.",
    valueCaptureShare: 0.68,
    costRetainedShare: 1,
    riskRetainedShare: 1,
    dilution: 0,
    monthsToTransaction: 30,
    envelope: { upfront: 0.2, milestones: 0.45, royalty: 0.35 },
    dependencyPrompt: "Cash runway to the readout — this route fails outright if funding runs short mid-study.",
  },
  {
    key: "non_dilutive_funded",
    label: "Non-dilutive funded development",
    description: "Advance on grants, venture debt or disease-foundation funding without giving up equity or rights.",
    valueCaptureShare: 0.6,
    costRetainedShare: 0.45,
    riskRetainedShare: 0.9,
    dilution: 0,
    monthsToTransaction: 26,
    envelope: { upfront: 0.18, milestones: 0.47, royalty: 0.35 },
    dependencyPrompt: "Award timing and scope — non-dilutive money is slow and rarely covers the full programme.",
  },
];

export function routesFor(assetType: "off_patent" | "innovative"): { key: string; label: string; description: string; dependencyPrompt: string }[] {
  return assetType === "off_patent" ? OFF_PATENT_ROUTES : INNOVATIVE_ROUTES;
}
