/**
 * Deal Intelligence Hub — Type Definitions
 * Central types for the 4-agent AI system.
 */

// ─── Intake Form ────────────────────────────────────────────────────────────

export interface HubIntakeForm {
  assetName: string;
  therapeuticArea: string;
  developmentStage: string;
  dealDirection: "Out-licensing" | "In-licensing" | "Co-development" | "Option Agreement" | "M&A / Acquisition";
  /** ISO-3166 alpha-2 codes, or the legacy region keys (Geography) from the old form. */
  geographies: string[];
  /** True when geographies is an exact ISO selection to respect verbatim —
   *  suppresses the legacy India-corridor injection in region expansion. */
  exactGeographies?: boolean;
  /** Chosen once at run start and propagated (§2). Defaults to off_patent. */
  assetType?: "off_patent" | "innovative";
  context: string;
  /** Optional customisation extracted from an uploaded brief / parameters document.
   *  Drives which assets and markets are assessed, how the value levers are
   *  weighted, and what "value" means for this client. */
  criteria?: SearchCriteria;
}

/** Customisable search parameters — extracted from any uploaded document (a brief,
 *  a target-product profile, a parameters sheet) or pasted text — that tailor the
 *  market-worthiness search and the asset value assessment to the client. */
export interface SearchCriteria {
  /** Assets / molecules to assess. Drives the search when present. */
  assets: string[];
  /** Target geographies (region codes or country names); empty = default global set. */
  geographies: string[];
  therapeuticArea?: string;
  /** The specific question the client wants answered — what "value" means to them. */
  valueQuestion?: string;
  /** Per-lever importance 0–100. Missing levers default to equal weight. Used to
   *  compute a client-weighted worthiness score. */
  leverWeights?: { lever: ValueLeverType; weight: number }[];
  /** Hard constraints / must-haves / exclusions, in plain language. */
  constraints?: string[];
  /** Quantitative or qualitative go/no-go thresholds. */
  thresholds?: { metric: string; operator: string; value: string }[];
  timeHorizon?: string;
  /** Anything relevant the extractor could not classify into the fields above. */
  notes?: string;
}

export type Geography = "US" | "EU" | "JP" | "CN" | "ROW";

export const GEOGRAPHY_LABELS: Record<Geography, string> = {
  US: "🇺🇸 US",
  EU: "🇪🇺 EU",
  JP: "🇯🇵 Japan",
  CN: "🇨🇳 China",
  ROW: "🌍 ROW",
};

export const GEOGRAPHY_COLORS: Record<Geography, string> = {
  US: "#3B82F6",
  EU: "#10B981",
  JP: "#F59E0B",
  CN: "#EF4444",
  ROW: "#A855F7",
};

// ─── Agent IDs & Status ─────────────────────────────────────────────────────

export type AgentId = "benchmarking" | "partner" | "negotiation" | "synthesis" | "executionPlan" | "outLicensingStrategy" | "innovativeDiagnosis" | "strategy";

export type AgentStatus = "idle" | "scraping" | "analyzing" | "complete" | "error";

export const AGENT_META: Record<AgentId, { label: string; description: string; color: string; icon: string }> = {
  benchmarking: { label: "Deal Benchmarking", description: "SEC EDGAR + Clinical Trials → Comparable deals", color: "#3B82F6", icon: "BarChart3" },
  partner:      { label: "Partner Identification", description: "Multi-source scan → Ranked partners", color: "#10B981", icon: "Users" },
  negotiation:  { label: "Negotiation Intelligence", description: "Deal terms + leverage analysis", color: "#F59E0B", icon: "Scale" },
  synthesis:    { label: "Deal Package", description: "Contract, DD, data room & intelligence", color: "#EC4899", icon: "Briefcase" },
  executionPlan:{ label: "Execution Plan", description: "Timeline, stakeholders & dependencies", color: "#F97316", icon: "Rocket" },
  outLicensingStrategy: { label: "Out-Licensing Strategy", description: "Per-region market, legal, commercial & IP assessment", color: "#0EA5E9", icon: "Globe" },
  innovativeDiagnosis: { label: "Innovative Diagnosis", description: "Science, IP and partnerability worthiness for a novel asset", color: "#8B5CF6", icon: "Microscope" },
  strategy: { label: "Strategy", description: "Route comparison, modelled economics and partner shortlist", color: "#C2410C", icon: "GitBranch" },
};

// ─── SSE Events ─────────────────────────────────────────────────────────────

export type SSEEvent =
  | { agent: AgentId; type: "status"; status: AgentStatus; message: string }
  | { agent: AgentId; type: "sources"; sources: SourceHit[] }
  | { agent: AgentId; type: "result"; data: AgentResult }
  | { agent: AgentId; type: "error"; error: string };

export interface SourceHit {
  source: string;
  title: string;
  url?: string;
  date?: string;
}

// ─── Agent Outputs ──────────────────────────────────────────────────────────

export type AgentResult =
  | { agentId: "benchmarking"; comparables: DealComparable[] }
  | { agentId: "partner"; partners: PartnerScore[] }
  | { agentId: "negotiation"; leveragePoints: NegotiationLeverage[] }
  | { agentId: "synthesis"; contract: string; dueDiligence: DDSection[]; dataPackage: DataPackageItem[]; intelligence: IntelSection[] }
  | { agentId: "executionPlan"; plan: ExecutionPlanOutput }
  | { agentId: "outLicensingStrategy"; report: OutLicensingReport }
  | { agentId: "innovativeDiagnosis"; diagnosis: import("./run").Diagnosis }
  | { agentId: "strategy"; strategy: import("./run").Strategy };

// ─── Out-Licensing Strategy Report Types ────────────────────────────────────

export interface OutLicensingReport {
  /** Board-level go/no-go on pursuing the opportunity. */
  verdict?: "Go" | "Conditional Go" | "No-Go";
  /** One-sentence so-what: where the opportunity is strongest and the biggest blocker. */
  opportunityThesis?: string;
  /** Priority 1 — value-capture archetype the asset was classified into, which
   *  selects the scoring rubric (so a long-off-patent commodity isn't measured
   *  against an exclusivity rubric it can only fail). */
  archetype?: {
    mode:
      | "Novel patented asset"
      | "LoE-timing play"
      | "Off-patent reformulation / hybrid"
      | "Off-patent commodity supply"
      | "Lifecycle management / repositioning"
      | "Cash-pay / consumer-health";
    rationale: string;
    /** How the rubric was adapted (e.g. exclusivity down-weighted, channel/galenic up-weighted). */
    rubricNote: string;
  };
  /** Priority 1 / §0 — never conflate the two questions: the narrow off-patent
   *  in-license trade vs the client's actual broad "is there ANY value here?". */
  opportunityFraming?: {
    narrowVerdict: string;
    broadVerdict: string;
    note: string;
  };
  /** Priority 6 — confidence in the VERDICT (distinct from dataConfidence, which
   *  rates the evidence base). */
  verdictConfidence?: "High" | "Medium" | "Low";
  /** Priority 6 — the specific evidence that would flip the verdict (falsifiability). */
  whatWouldFlipIt?: string[];
  /** Priority 5 — adversarial steelman: the strongest opportunities CONSIDERED
   *  and explicitly rejected, with the reason. */
  consideredAndRejected?: { opportunity: string; reason: string }[];
  executiveSummary: string;
  assetProfile: AssetProfile;
  regionalAnalysis: RegionalAnalysis[];
  recommendations: OutLicensingRecommendation[];
  portfolioRisks: PortfolioRisk[];
  /** Cross-market market-worthiness synthesis — a 1-2 sentence read on which
   *  geographies are commercially worth entering and why, purely on market /
   *  commercial grounds (legal + healthcare landscape, partnerships, channels,
   *  competitive sizing, novel paths). */
  marketWorthinessSummary?: string;
  /** The ten-lever value-maximisation scan — where residual/incremental value
   *  leaks out of an already-approved, off-patent medicine and how to plug it. */
  valueLevers?: ValueLever[];
  /** The client's uploaded search criteria, echoed back so the report shows what
   *  parameters drove it. */
  appliedCriteria?: SearchCriteria;
  /** Worthiness score recomputed with the client's own lever weights (from the
   *  uploaded criteria), so the verdict reflects what THIS client values. */
  weightedWorthiness?: {
    /** 0–100, lever scores combined under the client's weights. */
    score: number;
    method: string;
    byLever: { lever: string; score: number; weight: number; computed: boolean }[];
    note: string;
  };
  /** Consolidated business case — every commercial channel across geographies
   *  (with how to win each) and the sequenced go-to-market plan ("how to proceed"). */
  commercialPlan?: {
    summary: string;
    channels: {
      channel: string;
      geographies: string[];
      valueRole: string;
      accessMechanics: string;
      keyPlayers: string[];
    }[];
    howToProceed: {
      step: number;
      action: string;
      geography: string;
      approach: string;
      timing: string;
      owner: string;
    }[];
  };
  dataConfidence: "High" | "Medium" | "Low";
  sourcesUsed: string[];
}

/** One of the ten value levers through which an already-approved, off-patent
 *  medicine leaks (or can recapture) commercial value. Scored 0–100 with an
 *  honest confidence; a low score with a stated data gap is preferred over a
 *  confident guess — the engine's credibility dies on false positives. */
export type ValueLeverType =
  | "Geographic expansion"
  | "Indication expansion / repurposing"
  | "Distribution channels"
  | "Formulary positioning"
  | "Administration / formulation"
  | "Reimbursement / pricing"
  | "Sales-force effectiveness"
  | "Lifecycle / IP defense"
  | "Supply / COGS arbitrage"
  | "Portfolio synergy";

export interface ValueLever {
  lever: ValueLeverType;
  /** 0–100 opportunity score for this lever. */
  score: number;
  confidence: "High" | "Medium" | "Low";
  /** What we found, and where it came from (named source). */
  evidence: { finding: string; source: string }[];
  /** Concrete, quantified plays that capture the value. */
  recommendedActions: string[];
  /** e.g. "EUR 2-4M incremental net revenue over 3 years" — honest ranges, not false precision. */
  estValueRange: string;
  /** What is missing to raise confidence. Empty when the lever is well evidenced. */
  dataGap?: string;
  /** True when the evidence base cannot compute this lever for the chosen market —
   *  shown greyed out rather than faked. */
  notComputable?: boolean;
  /** True when this lever was CALCULATED deterministically from a wired adapter
   *  (RxNorm + CMS NADAC + backtested forecast) rather than reasoned by the model.
   *  Computed levers override anything the model produced for the same lever. */
  computed?: boolean;
  /** Measured out-of-sample performance of the forecasting model behind this
   *  lever. Present only on computed levers whose score rests on a forecast. */
  modelAudit?: {
    selectedModel: string;
    smape: number;
    mape: number;
    rmse: number;
    heldOutPredictions: number;
    liftOverNaivePp: number;
    intervalCoverage80: number;
    leaderboard: { model: string; smape: number }[];
  };
}

export interface AssetProfile {
  name: string;
  description: string;
  modality: string;
  therapeuticArea: string;
  developmentStage: string;
  mechanism: string;
  currentMarkets: string[];
  keyStrengths: string[];
  keyChallenges: string[];
  /** Priority 2 — each load-bearing fact carries source + reliability tier.
   *  tier: "Tier 1" primary regulator/peer-reviewed/official stats; "Tier 2"
   *  reputable secondary; "Tier 3" convenient-but-unreliable (e.g. ChEMBL/Orange
   *  Book "first approval" dates for legacy molecules). basis distinguishes an
   *  evidence-based finding from a prior-based inference. */
  keyDataPoints: {
    label: string;
    value: string;
    source: string;
    tier?: "Tier 1" | "Tier 2" | "Tier 3";
    basis?: "evidence" | "inference";
  }[];
}

export interface RegionalAnalysis {
  // Any ISO-3166 alpha-2 code (the run's geography selection drives the shard
  // list); "EU" and "ROW" appear in legacy reports only.
  region: string;
  regionLabel: string;
  attractiveness: "Very High" | "High" | "Medium" | "Low";
  attractivenessScore: number;
  market: {
    sizeUSD: string;
    growthRate: string;
    drivers: string[];
    barriers: string[];
    unmetNeed: string;
  };
  legal: {
    regulatoryAuthority: string;
    pathway: string;
    estimatedTimeline: string;
    exclusivityOpportunities: string[];
    barriers: string[];
  };
  commercial: {
    competitorActivity: string;
    pricingDynamics: string;
    reimbursementLandscape: string;
    keyPartnerCandidates: string[];
    distributionChannels: string;
  };
  ip: {
    patentStrength: "Strong" | "Moderate" | "Weak";
    ftoStatus: "Clear" | "Some Risk" | "Significant Risk";
    expirationRisks: string[];
    opportunities: string[];
    estimatedExclusivityYears: number;
  };
  /** Commercial Opportunity Score sub-scores (0–100). competition: 100 = low density (favourable). */
  cos?: {
    marketSize: number;
    regulatory: number;
    ip: number;
    marketAccess: number;
    competition: number;
  };
  /** Vector F — manufacturing / CMC / supply-chain complexity. */
  manufacturing?: {
    complexity: "Low" | "Moderate" | "High";
    notes: string;
  };
  /** Priority 2 — sanity-check flags for this market: contradictions or shaky
   *  facts surfaced (not smoothed over), e.g. a Tier-3 first-approval date that
   *  conflicts with documented clinical history, or a channel mischaracterisation. */
  provenanceFlags?: string[];
  /** Synthesised investment thesis for this region — the rational value
   *  proposition, exactly where a profitable business case sits, the economics,
   *  and the per-region call. Pulls together all six vectors. */
  businessCase?: {
    valueProposition: string;
    profitWedge: string;
    economics: string;
    verdict: "Pursue" | "Watch" | "Pass";
  };
  /** Market Worthiness — a PURELY commercial / market-facing verdict on whether
   *  this geography is worth entering, read against the region's CURRENT legal
   *  and healthcare landscape: where partnerships can be struck, which
   *  distribution channels are open, the market size set against the competitive
   *  field, and any novel routes to capture value. Distinct from businessCase
   *  (which is the investment thesis) — this is the market-readiness lens. */
  marketWorthiness?: {
    /** Purely-commercial worthiness rating for the market. */
    rating: "Highly Worthy" | "Worthy" | "Marginal" | "Not Worthy";
    /** 0–100 commercial market-worthiness score (independent of the COS). */
    score: number;
    /** One-line so-what: is this market commercially worth it, and why. */
    thesis: string;
    /** The current HEALTHCARE landscape — payer/health-system model, funding,
     *  infrastructure, demand and the access environment that shapes uptake. */
    healthcareLandscape: string;
    /** The current LEGAL / regulatory commercial landscape relevant to entry —
     *  market-shaping law, pricing/procurement rules, IP enforcement climate. */
    legalLandscape: string;
    /** Addressable market size set explicitly against the competitive field. */
    marketSizeVsCompetitors: string;
    /** Room to establish partnerships — is the partner field open or saturated,
     *  and with whom (named candidates / archetypes). */
    partnershipRoom: string;
    /** Distribution channels available here and how reachable they are. */
    distributionChannels: string;
    /** Novel / unconventional paths to capture this market. */
    novelPaths: string[];
  };
}

export interface OutLicensingRecommendation {
  priorityRank: number;
  targetRegion: string;
  rationale: string;
  recommendedDealStructure: string;
  estimatedValue: {
    upfront: string;
    total: string;
    royaltyRange: string;
  };
  topPartnerCandidates: string[];
  prerequisites: string[];
  estimatedTimeline: string;
  expectedROI: string;
}

export interface PortfolioRisk {
  category: "Market" | "Legal" | "Commercial" | "IP";
  risk: string;
  affectedRegions: string[];
  impact: "High" | "Medium" | "Low";
  likelihood: "High" | "Medium" | "Low";
  mitigation: string;
}

// ─── Execution Plan Types ───────────────────────────────────────────────────

export interface ExecutionPlanOutput {
  overview: string;
  totalDurationWeeks: number;
  phases: ExecutionPhase[];
  stakeholders: ExecutionStakeholder[];
  criticalMilestones: CriticalMilestone[];
  risks: ExecutionRisk[];
  connections: ExecutionConnection[];
}

export interface ExecutionPhase {
  id: string;
  name: string;
  pillar: "Diagnosis" | "Strategy" | "Execution";
  description: string;
  startWeek: number;
  endWeek: number;
  owner: string;
  contributors: string[];
  deliverables: string[];
  dependsOn: string[];
  successCriteria: string;
}

export interface ExecutionStakeholder {
  role: string;
  involvement: "Lead" | "Contributor" | "Reviewer" | "Approver";
  internalOrExternal: "Internal" | "External";
  responsibilities: string[];
  phaseIds: string[];
}

export interface CriticalMilestone {
  week: number;
  milestone: string;
  owner: string;
  deliverable: string;
}

export interface ExecutionRisk {
  risk: string;
  impact: "High" | "Medium" | "Low";
  likelihood: "High" | "Medium" | "Low";
  mitigation: string;
  owner: string;
}

export interface ExecutionConnection {
  from: string;
  to: string;
  type: "Sequential" | "Parallel" | "Triggers" | "Blocks";
  description: string;
}

// ─── Synthesis Output Types ────────────────────────────────────────────────

export interface DDSection {
  category: string;
  questions: { question: string; priority: "Critical" | "High" | "Medium"; rationale: string }[];
}

export interface DataPackageItem {
  category: string;
  items: { document: string; status: "Required" | "Recommended" | "Optional"; notes: string }[];
}

export interface IntelSection {
  title: string;
  insight: string;
  confidence: "High" | "Medium" | "Low";
  action: string;
  sources: string[];
}

export interface DealComparable {
  dealName: string;
  parties: string[];
  date: string;
  stage: string;
  indication: string;
  geographies: string[];
  upfront: string;
  totalValue: string;
  milestones: string;
  royaltyRange: string;
  source: string;
  sourceType: "SEC_EDGAR" | "CLINICAL_TRIALS" | "PRESS_RELEASE" | "AI_ESTIMATED";
}

export interface PartnerScore {
  company: string;
  fitScore: number;
  pipelineGapLevel: "High" | "Medium" | "Low";
  geoStrength: string[];
  dealPropensity: "Very High" | "High" | "Medium" | "Low";
  recentDeals: number;
  trialFootprint: number;
  rationale: string;
}

export interface NegotiationLeverage {
  term: string;
  marketRange: string;
  recommendedPosition: string;
  leverageLevel: "Strong" | "Moderate" | "Weak";
  geoVariance: Record<string, string>;
  precedentSource: string;
}

// ─── Client-Side Agent State ────────────────────────────────────────────────

export interface AgentState {
  status: AgentStatus;
  statusMessage: string;
  sources: SourceHit[];
  result: AgentResult | null;
  error: string | null;
}

export type AgentsMap = Record<AgentId, AgentState>;
