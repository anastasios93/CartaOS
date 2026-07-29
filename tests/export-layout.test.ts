/**
 * Layout contract for the exported deliverables.
 *
 * PowerPoint is absolutely positioned: two blocks written into the same
 * vertical band silently print on top of each other, and nobody notices until a
 * client opens the file. jsPDF flows, but a table can still run off the page.
 * These tests build the real decks from realistic payloads, unzip them, and
 * check the geometry the renderer will actually use:
 *
 *   - no two text-bearing shapes overlap (0.02in tolerance);
 *   - nothing extends past the slide edge;
 *   - nothing sits below the body floor except the designated footer band;
 *   - nothing is set below 10pt;
 *   - the PDFs carry every section they are supposed to, and none of the
 *     private run brief.
 *
 * They also pin the shape of every deliverable: a decision-ready executive
 * summary, one appendix divider, and the whole of the old export behind it —
 * with `includeAppendix: false` yielding the summary alone. The layout contract
 * above is asserted in BOTH modes, because a summary-only file is a real file a
 * client opens.
 *
 * A failure here is a layout bug, not a test to relax.
 */
import { describe, expect, it } from "vitest";
import zlib from "node:zlib";
import JSZip from "jszip";

import {
  buildDiagnosisPdf,
  buildDiagnosisPptx,
  buildStrategyPdf,
  buildStrategyPptx,
  pdfSafe,
} from "../lib/exports";
import type { ExportOptions } from "../lib/exports";
import type { Diagnosis, Strategy } from "../types/run";

// ── Geometry constants (mirrors of lib/exports.ts) ───────────────────────────

const EMU = 914400;
const SLIDE_W = 13.333;
const SLIDE_H = 7.5;
const BODY_LIMIT = 6.85;
const RIGHT_LIMIT = 12.733;
const TOL = 0.02; // inches

/** Text the run brief would leak as, if anyone ever wired it into an export. */
const BRIEF_SENTINEL = "ZZPRIVATEBRIEFSENTINELZZ";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const longish = (s: string) => `${s} ${s.toLowerCase()} — with enough surrounding narrative to force the exporter to wrap the text across several lines rather than sitting comfortably on one.`;

function offPatentReport(): Record<string, unknown> {
  return {
    verdict: "Conditional Go",
    verdictConfidence: "Medium",
    dataConfidence: "Medium",
    opportunityThesis:
      "Germany and Japan carry the only defensible commercial case; the US is crowded by four generic entrants and should be deprioritised until pricing stabilises.",
    executiveSummary: longish(
      "The molecule is off patent in every assessed market, so value has to come from channel position, formulation and reimbursement rather than exclusivity.",
    ),
    marketWorthinessSummary:
      "Germany is worth entering on commercial grounds alone; Japan is worth a partnered entry; the US is not worth the launch cost at current net prices.",
    archetype: {
      mode: "Off-patent reformulation / hybrid",
      rationale: "A hybrid dossier on an improved oral formulation is the only route that carries any exclusivity.",
      rubricNote: "Exclusivity down-weighted, channel access and galenic differentiation up-weighted.",
    },
    opportunityFraming: {
      narrowVerdict: longish("On the narrow in-license trade the economics do not clear the cost of the dossier."),
      broadVerdict: longish("On the broad question there is real value, but it sits in hospital tender channels rather than retail."),
      note: "The two questions are answered separately because they have different answers.",
    },
    whatWouldFlipIt: [
      "A signed tender award in Germany at or above EUR 1.80 per unit would move the verdict to Go.",
      "Evidence that the reference product is withdrawing from the Japanese market would flip Japan from Conditional to Go.",
      longish("A confirmed hybrid-application precedent at the EMA for this molecule class"),
    ],
    consideredAndRejected: [
      { opportunity: "US retail generic launch", reason: "Four entrants already hold 90% of scripts; net price is below landed COGS." },
      { opportunity: "OTC switch", reason: longish("The safety profile requires monitoring that no OTC switch precedent supports") },
    ],
    assetProfile: {
      name: "Cartazine",
      description: longish("A small-molecule oral therapy approved in eleven markets and off patent since 2019"),
      modality: "Small molecule, oral solid dose",
      therapeuticArea: "Cardiometabolic",
      developmentStage: "Approved / marketed",
      mechanism: "Selective SGLT-2 inhibition with a secondary natriuretic effect",
      currentMarkets: ["DE", "FR", "IT", "ES", "JP"],
      keyStrengths: [
        "Approved dossier in five EU markets with no open regulatory commitments.",
        longish("An established hospital formulary position in Germany"),
        "COGS of USD 0.11 per unit from a qualified second source.",
      ],
      keyChallenges: [
        "No exclusivity anywhere; four generic entrants in the US.",
        longish("Reimbursement in Japan requires a new health-economic dossier"),
      ],
      keyDataPoints: [
        { label: "First approval", value: "2007-03-14", source: "Orange Book", tier: "Tier 3", basis: "inference" },
        { label: "EU net price", value: "EUR 1.62 / unit", source: "IQVIA MIDAS", tier: "Tier 2", basis: "evidence" },
        { label: "US scripts (TRx, 2025)", value: "4.1m", source: "CMS NADAC", tier: "Tier 1", basis: "evidence" },
        { label: "Second-source COGS", value: "USD 0.11 / unit", source: "Supplier quotation", tier: "Tier 2", basis: "evidence" },
      ],
    },
    regionalAnalysis: [
      {
        region: "DE",
        regionLabel: "Germany",
        attractiveness: "High",
        attractivenessScore: 78,
        market: {
          sizeUSD: "USD 240m",
          growthRate: "3.1% CAGR",
          unmetNeed: longish("Persistent under-treatment in the over-70 cohort"),
          drivers: ["Statutory tender cycle reopens in Q3.", longish("Rising prescriber preference for once-daily dosing")],
          barriers: ["AMNOG price referencing caps upside.", "Two entrenched suppliers hold the current tender."],
        },
        legal: {
          regulatoryAuthority: "BfArM / EMA",
          pathway: "Hybrid application (Art. 10(3))",
          estimatedTimeline: "14–18 months to approval",
          exclusivityOpportunities: ["Two-year data exclusivity on the hybrid formulation."],
          barriers: [longish("A hybrid application requires a bioequivalence plus clinical bridging package")],
        },
        commercial: {
          competitorActivity: longish("Four suppliers on the current tender, two of them with local fill-finish"),
          pricingDynamics: "Tender-driven; last award cleared at EUR 1.74 per unit.",
          reimbursementLandscape: "Fully reimbursed under statutory insurance once tender-listed.",
          distributionChannels: "Hospital tender plus retail pharmacy wholesale.",
          keyPartnerCandidates: ["Stada", "Hexal", longish("A regional hospital-supply specialist")],
        },
        ip: {
          patentStrength: "Weak",
          ftoStatus: "Clear",
          expirationRisks: ["No remaining composition-of-matter protection."],
          opportunities: ["Formulation patent filed on the modified-release variant."],
          estimatedExclusivityYears: 2,
        },
        cos: { marketSize: 72, regulatory: 66, ip: 30, marketAccess: 81, competition: 44 },
        manufacturing: { complexity: "Moderate", notes: "Modified-release coating needs a qualified second site." },
        provenanceFlags: [
          longish("The 2007 first-approval date comes from a Tier-3 field that conflicts with documented clinical history"),
        ],
        businessCase: {
          valueProposition: longish("Win the statutory tender on landed cost and defend it with a second qualified source"),
          profitWedge: "The wedge is the EUR 0.9 gap between landed cost and the last tender clearing price.",
          economics: "Breakeven at 18% tender share in year two on a EUR 4m launch spend.",
          verdict: "Pursue",
        },
        marketWorthiness: {
          rating: "Highly Worthy",
          score: 81,
          thesis: "Germany is worth entering on commercial grounds alone — the tender is contestable and the channel is reachable.",
          healthcareLandscape: longish("Statutory insurance funds essentially all volume, with tender cycles setting price"),
          legalLandscape: longish("AMNOG referencing and tender law shape price more than IP does"),
          marketSizeVsCompetitors: "USD 240m against four incumbent suppliers, none holding more than 34% share.",
          partnershipRoom: "Open — two mid-size local distributors are actively seeking dossiers.",
          distributionChannels: "Hospital tender, retail wholesale, and a growing mail-order segment.",
          novelPaths: [
            "Bid the tender jointly with a local fill-finish partner to clear the domestic-supply preference.",
            longish("Bundle the modified-release variant with the immediate-release dossier in a single tender lot"),
          ],
        },
      },
      {
        region: "JP",
        regionLabel: "Japan",
        attractiveness: "Medium",
        attractivenessScore: 61,
        market: {
          sizeUSD: "USD 180m",
          growthRate: "1.4% CAGR",
          unmetNeed: "Moderate; the reference product covers most of the treated population.",
          drivers: ["Biennial NHI repricing favours later entrants."],
          barriers: [longish("A local bridging study is expected before NHI listing")],
        },
        legal: {
          regulatoryAuthority: "PMDA",
          pathway: "Partial change application",
          estimatedTimeline: "20–26 months",
          exclusivityOpportunities: [],
          barriers: ["Japanese-language dossier and a local marketing authorisation holder are mandatory."],
        },
        commercial: {
          competitorActivity: "Two suppliers, one of which is the originator.",
          pricingDynamics: "NHI price list; biennial revision cuts 4–6% per cycle.",
          reimbursementLandscape: "NHI listing required before any meaningful volume.",
          distributionChannels: "Wholesaler-led; three national wholesalers control access.",
          keyPartnerCandidates: ["Towa Pharmaceutical", "Nichi-Iko"],
        },
        ip: {
          patentStrength: "Weak",
          ftoStatus: "Some Risk",
          expirationRisks: ["A formulation patent held by the originator expires in 2027."],
          opportunities: [],
          estimatedExclusivityYears: 0,
        },
        cos: { marketSize: 58, regulatory: 49, ip: 20, marketAccess: 63, competition: 71 },
        provenanceFlags: [],
        businessCase: {
          valueProposition: "Partner rather than build — the MAH and language requirements make a solo entry uneconomic.",
          profitWedge: "A 25% royalty on a partnered launch clears the bridging-study cost by year four.",
          economics: "USD 2.1m bridging spend against USD 8m modelled cumulative royalty.",
          verdict: "Watch",
        },
        marketWorthiness: {
          rating: "Worthy",
          score: 64,
          thesis: "Worth a partnered entry, not a solo one.",
          healthcareLandscape: "Universal NHI coverage with tightly administered pricing.",
          legalLandscape: "A local MAH is mandatory; pricing is set administratively rather than negotiated.",
          marketSizeVsCompetitors: "USD 180m against two suppliers, the originator holding 71%.",
          partnershipRoom: "Moderate — the two named generics both in-license foreign dossiers.",
          distributionChannels: "Three national wholesalers; no direct-to-hospital route.",
          novelPaths: ["Licence the dossier to a domestic generic in exchange for a royalty and supply agreement."],
        },
      },
    ],
    valueLevers: [
      {
        lever: "Distribution channels",
        score: 78,
        confidence: "High",
        computed: true,
        evidence: [
          { finding: "Hospital tender accounts for 61% of German volume.", source: "IQVIA MIDAS" },
          { finding: longish("Mail-order share has doubled in three years"), source: "ABDA channel data" },
        ],
        recommendedActions: [
          "Qualify a German fill-finish partner before the Q3 tender window opens.",
          longish("Negotiate wholesale terms that protect the mail-order channel margin"),
        ],
        estValueRange: "EUR 2–4m incremental net revenue over three years",
      },
      {
        lever: "Reimbursement / pricing",
        score: 64,
        confidence: "Medium",
        evidence: [{ finding: "Last tender cleared at EUR 1.74 per unit.", source: "GKV tender registry" }],
        recommendedActions: ["Model a bid at EUR 1.62 and test it against landed cost."],
        estValueRange: "EUR 1–2m",
        dataGap: "No visibility on competitor landed cost.",
      },
      {
        lever: "Administration / formulation",
        score: 55,
        confidence: "Medium",
        evidence: [{ finding: "A modified-release variant is formulated and stable at 24 months.", source: "Internal CMC" }],
        recommendedActions: ["File the hybrid application on the modified-release variant."],
        estValueRange: "EUR 3–6m if two-year exclusivity is granted",
      },
      {
        lever: "Sales-force effectiveness",
        notComputable: "no connected CRM or field-force data for this asset",
        score: 0,
        confidence: "Low",
        evidence: [],
        recommendedActions: [],
        estValueRange: "",
        dataGap: "Connect a CRM export covering the last four quarters.",
      },
      {
        lever: "Supply / COGS arbitrage",
        score: 47,
        confidence: "Low",
        evidence: [{ finding: "A second source quotes USD 0.11 per unit.", source: "Supplier quotation" }],
        recommendedActions: ["Qualify the second source before committing to a tender bid."],
        estValueRange: "EUR 0.5–1.5m",
        dataGap: "The quotation is not yet backed by a stability package.",
      },
    ],
    recommendations: [
      {
        priorityRank: 1,
        targetRegion: "Germany",
        rationale: longish("Germany carries the only contestable tender inside the planning horizon"),
        recommendedDealStructure: "Own MA with a local distribution partner",
        estimatedValue: { upfront: "EUR 1.5m", total: "EUR 12m", royaltyRange: "8–12%" },
        topPartnerCandidates: ["Stada", "Hexal", "Aristo"],
        prerequisites: [
          "Qualify a second manufacturing source with a full stability package.",
          longish("Confirm the hybrid application pathway with BfArM in a scientific-advice meeting"),
        ],
        estimatedTimeline: "14–18 months",
        expectedROI: "3.1x on a EUR 4m launch spend",
      },
      {
        priorityRank: 2,
        targetRegion: "Japan",
        rationale: longish("Japan is worth a partnered entry once the German dossier is settled"),
        recommendedDealStructure: "Out-license to a domestic generic",
        estimatedValue: { upfront: "USD 0.8m", total: "USD 8m", royaltyRange: "20–25%" },
        topPartnerCandidates: ["Towa Pharmaceutical", "Nichi-Iko"],
        prerequisites: ["Appoint a local marketing authorisation holder."],
        estimatedTimeline: "20–26 months",
        expectedROI: "2.4x",
      },
    ],
    portfolioRisks: [
      {
        category: "Commercial",
        risk: "The German tender clears below landed cost, making the lead route unprofitable.",
        affectedRegions: ["DE"],
        impact: "High",
        likelihood: "Medium",
        mitigation: "Set a bid floor at landed cost plus 15% and walk away below it.",
      },
      {
        category: "Legal",
        risk: longish("The hybrid application is refused and the dossier reverts to a plain generic filing"),
        affectedRegions: ["DE", "FR"],
        impact: "High",
        likelihood: "Low",
        mitigation: "Take scientific advice before filing and hold the generic filing as a fallback.",
      },
      {
        category: "IP",
        risk: "The originator's Japanese formulation patent is asserted against the modified-release variant.",
        affectedRegions: ["JP"],
        impact: "Medium",
        likelihood: "Medium",
        mitigation: "Obtain a freedom-to-operate opinion before any Japanese filing.",
      },
    ],
    commercialPlan: {
      summary: longish("Value is captured through the hospital tender channel first and the retail channel second"),
      channels: [
        {
          channel: "Hospital tender",
          geographies: ["DE", "FR"],
          valueRole: "61% of volume and the only channel where landed cost decides the outcome.",
          accessMechanics: "Bid the statutory tender with a qualified domestic fill-finish partner.",
          keyPlayers: ["GKV purchasing groups", "Sanacorp"],
        },
        {
          channel: "Retail wholesale",
          geographies: ["DE", "IT", "ES"],
          valueRole: "Lower margin but stabilises volume between tender cycles.",
          accessMechanics: "Standard wholesaler terms; margin protection clauses matter more than list price.",
          keyPlayers: ["Phoenix", "Noweda"],
        },
        {
          channel: "Mail order",
          geographies: ["DE"],
          valueRole: longish("The fastest-growing segment and the least contested by incumbents"),
          accessMechanics: "Direct supply agreements with the two largest mail-order pharmacies.",
          keyPlayers: ["DocMorris", "Shop Apotheke"],
        },
      ],
      howToProceed: [
        { step: 1, action: "Qualify the second manufacturing source", geography: "DE", approach: "Stability package plus site audit", timing: "Weeks 1–12", owner: "Head of CMC" },
        { step: 2, action: "Take BfArM scientific advice on the hybrid pathway", geography: "DE", approach: "Formal scientific-advice meeting", timing: "Weeks 6–14", owner: "Regulatory affairs" },
        { step: 3, action: longish("Open commercial terms with two German distribution partners"), geography: "DE", approach: "Parallel term sheets", timing: "Weeks 10–20", owner: "Business development" },
        { step: 4, action: "Prepare and submit the tender bid", geography: "DE", approach: "Bid at landed cost plus 15%", timing: "Q3", owner: "Commercial lead" },
      ],
    },
    sourcesUsed: ["openFDA", "DailyMed", "Orange Book", "EMA", "IQVIA MIDAS", "GKV tender registry", "PMDA", "CMS NADAC"],
    weightedWorthiness: {
      score: 68,
      method: "Lever scores combined under the weights supplied with this run's criteria.",
      note: "Levers with no computable score are excluded from the weighting rather than treated as zero.",
      byLever: [
        { lever: "Distribution channels", score: 78, weight: 90, computed: true },
        { lever: "Reimbursement / pricing", score: 64, weight: 80, computed: false },
        { lever: "Administration / formulation", score: 55, weight: 60, computed: false },
      ],
    },
    appliedCriteria: { valueQuestion: "Where can this asset still make money without exclusivity?" },
  };
}

function offPatentDiagnosis(): Diagnosis {
  const report = offPatentReport();
  return {
    branch: "off_patent",
    verdict: "CONDITIONAL",
    verdictConfidence: "medium",
    worthinessScore: 68,
    thesis:
      "Germany and Japan carry the only defensible commercial case; the US is crowded and should be deprioritised until pricing stabilises.",
    dimensions: [
      {
        key: "Distribution channels",
        score: 78,
        computed: true,
        confidence: "high",
        summary: "Hospital tender is the decisive channel.",
        evidence: [
          { claim: "Hospital tender accounts for 61% of German volume.", kind: "evidence", source: "IQVIA MIDAS", tier: 2 },
          { claim: "Mail-order share doubled between 2022 and 2025.", kind: "evidence", source: "ABDA channel data", tier: 2 },
        ],
        sourcesConsulted: ["IQVIA MIDAS", "ABDA channel data"],
      },
      {
        key: "Reimbursement / pricing",
        score: 64,
        computed: false,
        confidence: "medium",
        evidence: [{ claim: "Last tender cleared at EUR 1.74 per unit.", kind: "evidence", source: "GKV tender registry", tier: 1 }],
        sourcesConsulted: ["GKV tender registry"],
      },
      {
        key: "Sales-force effectiveness",
        score: null,
        notComputable: "no connected CRM or field-force data for this asset",
        computed: false,
        evidence: [],
        sourcesConsulted: [],
      },
      {
        key: "Supply / COGS arbitrage",
        score: 47,
        computed: false,
        confidence: "low",
        evidence: [{ claim: "A second source quotes USD 0.11 per unit.", kind: "estimate", source: "Supplier quotation", tier: 3 }],
        sourcesConsulted: ["Supplier quotation"],
      },
    ],
    perMarket: [
      { country: "DE", score: 81, verdict: "GO", rank: 1, dimensions: [], summary: "Germany is worth entering on commercial grounds alone." },
      { country: "JP", score: 64, verdict: "CONDITIONAL", rank: 2, dimensions: [], summary: "Worth a partnered entry, not a solo one." },
      { country: "US", score: null, rank: 3, dimensions: [], summary: "Four generic entrants hold 90% of scripts.", notComputable: "no reliable net-price series for this molecule" },
    ],
    topRisks: [
      "The German tender clears below landed cost.",
      "The hybrid application is refused and the dossier reverts to a plain generic filing.",
    ],
    swingFactors: [
      "The clearing price of the Q3 German tender.",
      "Whether BfArM accepts the hybrid pathway.",
    ],
    valueLevers: report.valueLevers as Record<string, unknown>[],
    consideredAndRejected: [{ opportunity: "US retail generic launch", reason: "Net price is below landed COGS." }],
    coverage: [
      { key: "Distribution channels", label: "Distribution channels", consulted: ["IQVIA MIDAS"], unwired: [] },
      { key: "Sales-force effectiveness", label: "Sales-force effectiveness", consulted: [], unwired: ["CRM export", "field-force activity feed"] },
    ],
    report,
    // Deliberately present, deliberately never exported.
    notes: { diagnosis: BRIEF_SENTINEL },
  } as unknown as Diagnosis;
}

function innovativeDiagnosis(): Diagnosis {
  return {
    branch: "innovative",
    verdict: "GO",
    verdictConfidence: "high",
    worthinessScore: 74,
    thesis: longish("The programme's value turns almost entirely on the Phase 2b readout in the second half of next year"),
    inflectionLever: "A positive Phase 2b readout at the 400mg dose roughly triples the risk-adjusted value.",
    dimensions: [
      {
        key: "science",
        score: 81,
        computed: false,
        confidence: "high",
        summary: "Target biology is well validated.",
        evidence: [
          { claim: "Three independent groups have replicated the target-engagement finding.", kind: "evidence", source: "Open Targets", tier: 1 },
          { claim: "Effect size is inferred from a related mechanism.", kind: "estimate", source: "CartaOS model", tier: 3 },
        ],
        sourcesConsulted: ["Open Targets", "ChEMBL"],
      },
      { key: "ip", score: 62, computed: true, confidence: "medium", evidence: [{ claim: "Composition-of-matter runs to 2039.", kind: "evidence", source: "Espacenet", tier: 1 }], sourcesConsulted: ["Espacenet"] },
      { key: "partnerability", score: null, notComputable: "no comparable transactions in this indication since 2019", computed: false, evidence: [], sourcesConsulted: [] },
    ],
    perMarket: [
      { country: "US", score: 79, verdict: "GO", rank: 1, dimensions: [], summary: "Largest addressable population and the fastest route to reimbursement." },
      { country: "DE", score: 58, verdict: "CONDITIONAL", rank: 2, dimensions: [], summary: "AMNOG referencing caps the achievable price." },
    ],
    topRisks: [longish("A negative Phase 2b readout removes essentially all of the modelled value")],
    swingFactors: ["The Phase 2b primary endpoint.", "Whether the 400mg dose clears the tolerability bar."],
    ipFlags: [
      { severity: "high", flag: "A third-party formulation patent may read on the intended dosage form.", note: longish("The claim language covers the excipient ratio used in the current formulation"), citation: "EP3123456B1" },
      { severity: "medium", flag: "Freedom to operate in Japan is unconfirmed.", note: "No Japanese search has been run.", citation: "" },
    ],
    consideredAndRejected: [{ opportunity: "Immediate out-licence at Phase 1", reason: "Pre-readout terms would give away the inflection." }],
    coverage: [
      { key: "science", label: "Science", consulted: ["Open Targets", "ChEMBL"], unwired: [] },
      { key: "partnerability", label: "Partnerability", consulted: [], unwired: ["SEC EDGAR deal feed"] },
    ],
    notes: { diagnosis: BRIEF_SENTINEL },
  } as unknown as Diagnosis;
}

function offPatentStrategy(): Strategy {
  const assumption = (key: string, label: string, value: number, unit: string, basis: "sourced" | "assumed", source?: string) => ({
    key, label, value, unit, basis, source, editable: true,
  });
  return {
    branch: "off_patent",
    routes: [
      { key: "own_ma_own_distribution", label: "Own MA + own distribution", score: 71, keyDependency: "Local commercial infrastructure and the capital to fund launch before revenue.", evidence: [{ claim: "Two mid-size German distributors are actively seeking dossiers.", kind: "evidence", source: "IQVIA MIDAS", tier: 2 }] },
      { key: "distribution_agreement", label: "Distribution agreement", score: 66, keyDependency: "A partner with tender-qualified domestic supply.", evidence: [{ claim: "Distribution margins in this class run 18–24%.", kind: "estimate", source: "CartaOS model", tier: 3 }] },
      { key: "out_license_ma", label: "Out-license the MA", score: 48, keyDependency: "A counterparty willing to carry the launch cost.", evidence: [] },
      { key: "tender_agent", label: "Tender agent", score: 39, keyDependency: "Tender access without a local entity.", evidence: [] },
    ],
    recommendedRoute: "own_ma_own_distribution",
    assumptions: [
      assumption("addressableRevenueYear1", "Addressable revenue, year 1", 20_000_000, "USD", "sourced", "IQVIA MIDAS"),
      assumption("shareCapture", "Share capture", 0.2, "fraction", "assumed"),
      assumption("erosionRatePct", "Price erosion rate", 12, "%", "assumed"),
      assumption("volumeGrowthPct", "Volume growth", 3, "%", "sourced", "IQVIA MIDAS"),
      assumption("launchCostTotal", "Total launch cost", 4_000_000, "USD", "assumed"),
      assumption("cogsPct", "COGS", 40, "%", "sourced", "Supplier quotation"),
      assumption("timeToLaunchMonths", "Time to launch", 18, "months", "assumed"),
      assumption("discountRatePct", "Discount rate", 10, "%", "assumed"),
      assumption("horizonYears", "Horizon", 8, "years", "assumed"),
    ],
    sensitivity: [],
    partnerShortlist: [
      { name: "Stada", kind: "Generic manufacturer", geographies: ["DE", "IT"], score: 82, rationale: longish("Domestic fill-finish and an existing tender position"), evidence: [{ claim: "Holds three current GKV tender lots.", kind: "evidence", source: "GKV tender registry", tier: 1 }] },
      { name: "Towa Pharmaceutical", kind: "Domestic generic", geographies: ["JP"], score: 74, rationale: "In-licenses foreign dossiers and holds a national MAH.", evidence: [] },
      { name: "DocMorris", kind: "Mail-order pharmacy", geographies: ["DE"], score: 58, rationale: "Fastest-growing channel and the least contested.", evidence: [] },
    ],
    approachSequence: [
      "Qualify the second manufacturing source before opening any partner conversation.",
      longish("Run the two German distribution term sheets in parallel to preserve leverage"),
      "Only then decide between own distribution and a distribution agreement.",
    ],
    notes: { strategy: BRIEF_SENTINEL },
  } as unknown as Strategy;
}

// ── PPTX geometry harness ────────────────────────────────────────────────────

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  kind: string;
}

const inches = (emu: number) => emu / EMU;

/** Split a slide's XML into its top-level shapes. No grouping is used, so a
 *  non-greedy match per shape type is exact. */
function shapesOf(xml: string): Box[] {
  const out: Box[] = [];
  const scan = (re: RegExp, kind: string) => {
    for (const m of xml.matchAll(re)) {
      const frag = m[0];
      const texts = [...frag.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((t) => t[1]).filter((t) => t.trim());
      if (!texts.length) continue;
      const off = /<a:off x="(-?\d+)" y="(-?\d+)"\s*\/>/.exec(frag);
      const ext = /<a:ext cx="(\d+)" cy="(\d+)"\s*\/>/.exec(frag);
      if (!off || !ext) continue;
      out.push({
        x: inches(Number(off[1])),
        y: inches(Number(off[2])),
        w: inches(Number(ext[1])),
        h: inches(Number(ext[2])),
        text: texts.join(" ").slice(0, 70),
        kind,
      });
    }
  };
  scan(/<p:sp>[\s\S]*?<\/p:sp>/g, "sp");
  scan(/<p:graphicFrame>[\s\S]*?<\/p:graphicFrame>/g, "table");
  return out;
}

async function slidesOf(pptx: any): Promise<{ name: string; xml: string; shapes: Box[] }[]> {
  const buf = await pptx.write({ outputType: "nodebuffer" });
  const zip = await JSZip.loadAsync(buf);
  const names = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(/(\d+)/.exec(a)![1]) - Number(/(\d+)/.exec(b)![1]));
  const out = [];
  for (const name of names) {
    const xml = await zip.file(name)!.async("string");
    out.push({ name, xml, shapes: shapesOf(xml) });
  }
  return out;
}

const fmt = (b: Box) =>
  `[${b.x.toFixed(2)},${b.y.toFixed(2)} ${b.w.toFixed(2)}x${b.h.toFixed(2)}in ${b.kind}] "${b.text}"`;

/** Overlap = intersection greater than the tolerance on BOTH axes. */
function overlaps(a: Box, b: Box): boolean {
  const xOverlap = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const yOverlap = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return xOverlap > TOL && yOverlap > TOL;
}

function collisionReport(slides: { name: string; shapes: Box[] }[]): string[] {
  const problems: string[] = [];
  for (const slide of slides) {
    for (let i = 0; i < slide.shapes.length; i++) {
      for (let j = i + 1; j < slide.shapes.length; j++) {
        if (overlaps(slide.shapes[i], slide.shapes[j])) {
          problems.push(`${slide.name}: ${fmt(slide.shapes[i])} collides with ${fmt(slide.shapes[j])}`);
        }
      }
    }
  }
  return problems;
}

function boundsReport(slides: { name: string; shapes: Box[] }[]): string[] {
  const problems: string[] = [];
  for (const slide of slides) {
    for (const b of slide.shapes) {
      if (b.x + b.w > SLIDE_W + TOL) problems.push(`${slide.name}: runs off the right edge — ${fmt(b)}`);
      if (b.y + b.h > SLIDE_H + TOL) problems.push(`${slide.name}: runs off the bottom edge — ${fmt(b)}`);
      // Body content must finish above the floor; the footer band starts at it.
      const inFooterBand = b.y >= BODY_LIMIT - TOL;
      if (!inFooterBand && b.y + b.h > BODY_LIMIT + TOL) {
        problems.push(`${slide.name}: crosses the ${BODY_LIMIT}in body floor — ${fmt(b)}`);
      }
      if (!inFooterBand && b.x + b.w > RIGHT_LIMIT + TOL && b.x >= 0.2) {
        problems.push(`${slide.name}: crosses the ${RIGHT_LIMIT}in right margin — ${fmt(b)}`);
      }
    }
  }
  return problems;
}

function tinyType(slides: { name: string; xml: string }[]): string[] {
  const problems: string[] = [];
  for (const slide of slides) {
    for (const m of slide.xml.matchAll(/\ssz="(\d+)"/g)) {
      if (Number(m[1]) < 1000) problems.push(`${slide.name}: ${Number(m[1]) / 100}pt type (floor is 10pt)`);
    }
  }
  return [...new Set(problems)];
}

// ── PDF text harness ─────────────────────────────────────────────────────────

/** Pull the literal strings out of a jsPDF document's content streams. */
function pdfText(doc: any): string {
  const buf = Buffer.from(doc.output("arraybuffer"));
  const chunks: string[] = [];
  let cursor = 0;
  for (;;) {
    const s = buf.indexOf("stream", cursor);
    if (s < 0) break;
    let start = s + "stream".length;
    if (buf[start] === 0x0d) start++;
    if (buf[start] === 0x0a) start++;
    const e = buf.indexOf("endstream", start);
    if (e < 0) break;
    const raw = buf.subarray(start, e);
    try {
      chunks.push(zlib.inflateSync(raw).toString("latin1"));
    } catch {
      chunks.push(raw.toString("latin1"));
    }
    cursor = e + "endstream".length;
  }
  const joined = chunks.join("\n");
  const literals: string[] = [];
  for (const m of joined.matchAll(/\((?:\\.|[^\\()])*\)/g)) {
    literals.push(m[0].slice(1, -1).replace(/\\([()\\])/g, "$1"));
  }
  return literals.join(" ");
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("the overlap detector itself", () => {
  const box = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h, text: "t", kind: "sp" });

  it("catches two boxes written into the same band", () => {
    expect(overlaps(box(0.6, 2, 5, 1), box(0.6, 2.5, 5, 1))).toBe(true);
  });

  it("tolerates a hairline touch and clears stacked blocks", () => {
    expect(overlaps(box(0.6, 2, 5, 1), box(0.6, 3.01, 5, 1))).toBe(false);
    expect(overlaps(box(0.6, 2, 5, 1), box(6.8, 2, 5, 1))).toBe(false);
  });
});

/** One string per slide, so "before the divider" is answerable by index. */
const slideTexts = (slides: { shapes: Box[] }[]): string[] =>
  slides.map((s) => s.shapes.map((b) => b.text).join(" "));

/**
 * The word "Appendix" is reserved for the divider slide — every appendix
 * section is numbered A1, A2, … and every cross-reference in the summary says
 * "the appendix" in lower case. So a slide carrying it IS the divider.
 */
const DIVIDER_MARK = "Appendix";

interface DeckCase {
  label: string;
  build: (opts?: ExportOptions) => Promise<any>;
  /** Kickers that must sit in Part 1, before the divider. */
  summary: string[];
  /** Kickers that must sit in Part 2, behind the divider. */
  appendix: string[];
  /** Content a summary-only file must still carry. */
  keep: string[];
}

const decks: DeckCase[] = [
  {
    label: "off-patent diagnosis",
    build: (o) => buildDiagnosisPptx(offPatentDiagnosis(), "off_patent", "Cartazine", o),
    summary: ["EXECUTIVE SUMMARY", "WHAT TO DO NEXT", "LEAD MARKETS", "TOP VALUE LEVERS"],
    appendix: [
      "DIAGNOSIS · REGIONAL ASSESSMENT",
      "DIAGNOSIS · VALUE LEVERS",
      "DIAGNOSIS · MARKETS",
      "DIAGNOSIS · EVIDENCE",
      "DIAGNOSIS · GERMANY",
    ],
    keep: ["Conditional Go", "WHAT TO DO NEXT"],
  },
  {
    label: "innovative diagnosis",
    build: (o) => buildDiagnosisPptx(innovativeDiagnosis(), "innovative", "CTX-4410", o),
    summary: ["EXECUTIVE SUMMARY", "WHAT TO DO NEXT", "LEAD MARKETS", "STRONGEST DIMENSIONS"],
    appendix: ["DIAGNOSIS · SCORECARD", "DIAGNOSIS · MARKETS", "DIAGNOSIS · EVIDENCE", "DIAGNOSIS · IP"],
    keep: ["VERDICT", "WHAT TO DO NEXT"],
  },
  {
    label: "off-patent strategy",
    build: (o) => buildStrategyPptx(offPatentStrategy(), "off_patent", "Cartazine", o),
    summary: ["EXECUTIVE SUMMARY", "WHAT TO DO NEXT", "ROUTE COMPARISON", "COUNTERPARTIES"],
    appendix: [
      "STRATEGY · ROUTE COMPARISON",
      "STRATEGY · ASSUMPTIONS",
      "STRATEGY · SCENARIOS",
      "STRATEGY · EVIDENCE",
    ],
    // The deck's shape text is truncated by the harness, so the recommended
    // route is asserted through the headline that names it rather than through
    // a table cell that may be clipped.
    keep: ["RECOMMENDED ROUTE", "is the route to commit to", "WHAT TO DO NEXT"],
  },
];

const modes: { label: string; opts: ExportOptions | undefined }[] = [
  { label: "full", opts: undefined },
  { label: "summary only", opts: { includeAppendix: false } },
];

describe("PowerPoint layout", () => {
  for (const deck of decks) {
    for (const mode of modes) {
      describe(`${deck.label} — ${mode.label}`, () => {
        it("places no two text-bearing shapes on top of each other", async () => {
          const slides = await slidesOf(await deck.build(mode.opts));
          expect(slides.length).toBeGreaterThan(3);
          // Guard against a silently vacuous pass: if the XML shape parser ever
          // stops matching, there is nothing left to collide and this test would
          // go green on an empty set.
          const shapeCount = slides.reduce((a, s) => a + s.shapes.length, 0);
          expect(shapeCount).toBeGreaterThan(slides.length * 3);
          const problems = collisionReport(slides);
          expect(problems, `Overlapping shapes in the ${deck.label} deck:\n  ${problems.join("\n  ")}`).toEqual([]);
        });

        it("keeps every shape inside the slide and above the body floor", async () => {
          const slides = await slidesOf(await deck.build(mode.opts));
          const problems = boundsReport(slides);
          expect(problems, `Out-of-bounds shapes in the ${deck.label} deck:\n  ${problems.join("\n  ")}`).toEqual([]);
        });

        it("never sets type below 10pt", async () => {
          const slides = await slidesOf(await deck.build(mode.opts));
          const problems = tinyType(slides);
          expect(problems, `Type below the floor in the ${deck.label} deck:\n  ${problems.join("\n  ")}`).toEqual([]);
        });

        it("carries text on every slide it emits", async () => {
          const slides = await slidesOf(await deck.build(mode.opts));
          const empty = slides.filter((s) => s.shapes.length === 0).map((s) => s.name);
          expect(empty, `Slides with no text at all: ${empty.join(", ")}`).toEqual([]);
        });

        it("never leaks the private run brief", async () => {
          const slides = await slidesOf(await deck.build(mode.opts));
          expect(slideTexts(slides).join(" ")).not.toContain(BRIEF_SENTINEL);
        });
      });
    }
  }

  it("gives the off-patent report a section per region and a next-steps slide", async () => {
    const slides = await slidesOf(await buildDiagnosisPptx(offPatentDiagnosis(), "off_patent", "Cartazine"));
    const all = slideTexts(slides).join(" ");
    expect(all).toContain("WHAT TO DO NEXT");
    expect(all).toContain("Germany");
    expect(all).toContain("Japan");
    expect(all).not.toContain(BRIEF_SENTINEL);
  });
});

describe("PowerPoint — summary, then appendix", () => {
  for (const deck of decks) {
    describe(deck.label, () => {
      it("puts the whole executive summary before exactly one appendix divider", async () => {
        const texts = slideTexts(await slidesOf(await deck.build()));
        const dividers = texts.filter((t) => t.includes(DIVIDER_MARK));
        expect(dividers.length, `expected one appendix divider, found ${dividers.length}`).toBe(1);
        const divider = texts.findIndex((t) => t.includes(DIVIDER_MARK));
        for (const marker of deck.summary) {
          const at = texts.findIndex((t) => t.includes(marker));
          expect(at, `summary section "${marker}" is missing`).toBeGreaterThanOrEqual(0);
          expect(at, `summary section "${marker}" must sit before the appendix divider`).toBeLessThan(divider);
        }
      });

      it("keeps the detail sections behind the divider", async () => {
        const texts = slideTexts(await slidesOf(await deck.build()));
        const divider = texts.findIndex((t) => t.includes(DIVIDER_MARK));
        for (const marker of deck.appendix) {
          const at = texts.findIndex((t, i) => i > divider && t.includes(marker));
          expect(at, `appendix section "${marker}" is missing from behind the divider`).toBeGreaterThan(divider);
        }
      });

      it("emits a materially shorter deck with includeAppendix: false", async () => {
        const full = await slidesOf(await deck.build());
        const summary = await slidesOf(await deck.build({ includeAppendix: false }));
        expect(
          summary.length,
          `summary-only deck is ${summary.length} slides against ${full.length} full — not materially shorter`,
        ).toBeLessThan(full.length / 2);
        const texts = slideTexts(summary);
        expect(texts.some((t) => t.includes(DIVIDER_MARK)), "a summary-only deck must carry no divider").toBe(false);
        for (const marker of deck.keep) {
          expect(texts.join(" "), `summary-only deck dropped "${marker}"`).toContain(marker);
        }
      });
    });
  }
});

describe("PDF content", () => {
  it("the off-patent diagnosis carries every section the screen shows", async () => {
    const doc = await buildDiagnosisPdf(offPatentDiagnosis(), "off_patent", "Cartazine");
    const text = pdfText(doc);
    for (const heading of [
      "WHAT TO DO NEXT",
      "VERDICT",
      "ASSET PROFILE",
      "DIMENSION SCORES",
      "VALUE LEVERS",
      "MARKETS",
      "REGIONAL ASSESSMENT",
      "RECOMMENDATIONS",
      "BUSINESS CASE",
      "FLAWS & BLOCKERS",
      "WHAT WOULD FLIP THE VERDICT",
      "CONSIDERED AND REJECTED",
      "EVIDENCE",
      "SOURCE COVERAGE",
    ]) {
      expect(text, `missing section "${heading}"`).toContain(heading);
    }
    // Per-region detail, market worthiness and the levers' own plays.
    expect(text).toContain("Market worthiness");
    expect(text).toContain("Highly Worthy");
    expect(text).toContain("NOVEL PATHS TO CAPTURE THE MARKET");
    expect(text).toContain("Distribution channels");
    // A lever with no computable score states the reason, never a zero.
    expect(text).toContain("Not computable");
    expect(text).not.toContain(BRIEF_SENTINEL);
  });

  it("the innovative diagnosis keeps the IP screen and skips the off-patent sections", async () => {
    const doc = await buildDiagnosisPdf(innovativeDiagnosis(), "innovative", "CTX-4410");
    const text = pdfText(doc);
    expect(text).toContain("IP & FREEDOM TO OPERATE");
    expect(text).toContain("DIMENSION SCORES");
    expect(text).toContain("WHAT TO DO NEXT");
    // No off-patent report rode along, so these headings must not be printed empty.
    expect(text).not.toContain("REGIONAL ASSESSMENT");
    expect(text).not.toContain("BUSINESS CASE");
    expect(text).not.toContain(BRIEF_SENTINEL);
  });

  it("the strategy summary carries the modelled route comparison", async () => {
    const doc = await buildStrategyPdf(offPatentStrategy(), "off_patent", "Cartazine");
    const text = pdfText(doc);
    for (const heading of ["WHAT TO DO NEXT", "RECOMMENDATION", "ROUTE COMPARISON", "ASSUMPTIONS", "SENSITIVITY", "COUNTERPARTIES"]) {
      expect(text, `missing section "${heading}"`).toContain(heading);
    }
    expect(text).toContain("Own MA + own distribution");
    expect(text).not.toContain(BRIEF_SENTINEL);
  });
});

describe("PDF — summary, then appendix", () => {
  interface DocCase {
    label: string;
    build: (opts?: ExportOptions) => Promise<any>;
    /** Eyebrows that must be printed in Part 1, before the divider. */
    summary: string[];
    /** Eyebrows that must be printed in Part 2, behind the divider. */
    appendix: string[];
    /** Content a summary-only file must still carry. */
    keep: string[];
  }

  const docs: DocCase[] = [
    {
      label: "off-patent diagnosis",
      build: (o) => buildDiagnosisPdf(offPatentDiagnosis(), "off_patent", "Cartazine", o),
      summary: ["EXECUTIVE SUMMARY", "WHAT TO DO NEXT", "LEAD MARKETS", "TOP VALUE LEVERS"],
      appendix: [
        "DIMENSION SCORES",
        "REGIONAL ASSESSMENT",
        "SOURCE COVERAGE",
        "NOVEL PATHS TO CAPTURE THE MARKET",
      ],
      keep: ["Conditional Go", "WHAT TO DO NEXT"],
    },
    {
      label: "innovative diagnosis",
      build: (o) => buildDiagnosisPdf(innovativeDiagnosis(), "innovative", "CTX-4410", o),
      summary: ["EXECUTIVE SUMMARY", "WHAT TO DO NEXT", "LEAD MARKETS", "STRONGEST DIMENSIONS"],
      appendix: ["DIMENSION SCORES", "IP & FREEDOM TO OPERATE", "SOURCE COVERAGE", "EVIDENCE"],
      keep: ["Go - CTX-4410", "WHAT TO DO NEXT"],
    },
    {
      label: "off-patent strategy",
      build: (o) => buildStrategyPdf(offPatentStrategy(), "off_patent", "Cartazine", o),
      summary: ["EXECUTIVE SUMMARY", "WHAT TO DO NEXT", "ROUTE COMPARISON", "COUNTERPARTIES"],
      appendix: ["ASSUMPTIONS", "SENSITIVITY", "RECOMMENDATION"],
      keep: ["is the route to commit to", "Own MA + own distribution", "WHAT TO DO NEXT"],
    },
  ];

  const occurrences = (haystack: string, needle: string) => haystack.split(needle).length - 1;

  for (const doc of docs) {
    describe(doc.label, () => {
      it("puts the whole executive summary before exactly one appendix divider", async () => {
        const text = pdfText(await doc.build());
        expect(occurrences(text, "Appendix"), "expected exactly one appendix divider").toBe(1);
        const divider = text.indexOf("Appendix");
        for (const marker of doc.summary) {
          const at = text.indexOf(marker);
          expect(at, `summary section "${marker}" is missing`).toBeGreaterThanOrEqual(0);
          expect(at, `summary section "${marker}" must be printed before the appendix divider`).toBeLessThan(divider);
        }
      });

      it("keeps the detail sections behind the divider", async () => {
        const text = pdfText(await doc.build());
        const divider = text.indexOf("Appendix");
        for (const marker of doc.appendix) {
          const at = text.indexOf(marker, divider);
          expect(at, `appendix section "${marker}" is missing from behind the divider`).toBeGreaterThan(divider);
        }
      });

      it("emits a materially shorter file with includeAppendix: false", async () => {
        const full = await doc.build();
        const summary = await doc.build({ includeAppendix: false });
        const fullPages = full.internal.getNumberOfPages();
        const summaryPages = summary.internal.getNumberOfPages();
        // Two independent claims, because either on its own can pass vacuously.
        // The summary is a FIXED-SIZE document — a cover plus five sections,
        // never more than five pages however large the run behind it — while
        // the appendix grows with the payload. And dropping the appendix has to
        // remove real pages, not trim a widow line off the end.
        expect(
          summaryPages,
          `a summary-only PDF must hold its 3-4 page budget; this one is ${summaryPages} pages`,
        ).toBeLessThanOrEqual(5);
        expect(
          fullPages - summaryPages,
          `summary-only PDF is ${summaryPages} pages against ${fullPages} full — the appendix barely cost anything`,
        ).toBeGreaterThanOrEqual(3);
        const text = pdfText(summary);
        expect(occurrences(text, "Appendix"), "a summary-only PDF must carry no divider").toBe(0);
        for (const marker of doc.keep) {
          expect(text, `summary-only PDF dropped "${marker}"`).toContain(marker);
        }
        expect(text).not.toContain(BRIEF_SENTINEL);
      });
    });
  }
});

describe("PDF text encoding", () => {
  // jsPDF's standard fonts are WinAnsi. Non-ASCII reaching them renders as
  // mojibake — a real off-patent run produced "gA©nA©riques rA©pertoire" and
  // "PACKUNGSGRA–SSEN" in a client-facing deck before this was fixed.
  it("transliterates rather than mangling accented European text", () => {
    expect(pdfSafe("génériques répertoire")).toBe("generiques repertoire");
    expect(pdfSafe("Festbeträge Rabattverträge über")).toBe("Festbetraege Rabattvertraege ueber");
    expect(pdfSafe("PACKUNGSGRÖSSEN FÜR")).toBe("PACKUNGSGROESSEN FUER");
    expect(pdfSafe("Straße")).toBe("Strasse");
  });

  it("emits pure ASCII whatever it is given", () => {
    for (const s of ["a • b · c", "→ ⇒ ▶", "“quoted” ‘x’", "€1.2m", "日本語", "—…"]) {
      expect(pdfSafe(s)).toMatch(/^[\x09\x0A\x0D\x20-\x7E]*$/);
    }
  });

  it("keeps ordinary text untouched", () => {
    expect(pdfSafe("Atorvastatin 20mg, Germany (DE) - 68/100")).toBe(
      "Atorvastatin 20mg, Germany (DE) - 68/100",
    );
  });
});

/**
 * Real payloads are far wordier than a hand-written fixture, and that is where
 * layout breaks. A live off-patent run put 5.03in of kill-criteria text into a
 * two-column block starting at 2.16in; it ran past the body floor onto the
 * source line and the page number. The fixtures were too short to reach it, so
 * the harness passed while the real deck was broken.
 *
 * This inflates every string in the fixture so the same content is exercised at
 * realistic length.
 */
function verbose<T>(value: T, factor = 6): T {
  const pad =
    " Sustained hospital tender pressure and Rabattvertraege renegotiation cycles materially change the addressable pool here";
  const walk = (v: any): any => {
    if (typeof v === "string") return v.length > 12 ? v + pad.repeat(factor) : v;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(value) as T;
}

describe("layout holds on realistically long content", () => {
  for (const [mode, opts] of [
    ["full", {}],
    ["summary only", { includeAppendix: false }],
  ] as const) {
    it(`off-patent diagnosis, ${mode}: nothing collides or crosses the body floor`, async () => {
      const deck = await buildDiagnosisPptx(
        verbose(offPatentDiagnosis()),
        "off_patent",
        "Cartazine",
        opts as any,
      );
      const slides = await slidesOf(deck);
      const problems: string[] = [];

      for (const slide of slides) {
        for (const b of slide.shapes) {
          const inFooterBand = b.y >= BODY_LIMIT - TOL;
          if (!inFooterBand && b.y + b.h > BODY_LIMIT + TOL) {
            problems.push(`${slide.name}: crosses the body floor — ${fmt(b)}`);
          }
        }
        for (let i = 0; i < slide.shapes.length; i++) {
          for (let j = i + 1; j < slide.shapes.length; j++) {
            const a = slide.shapes[i];
            const b = slide.shapes[j];
            if (overlaps(a, b)) problems.push(`${slide.name}: ${fmt(a)} collides with ${fmt(b)}`);
          }
        }
      }
      expect(slides.length).toBeGreaterThan(3);
      expect(problems).toEqual([]);
    });
  }
});
