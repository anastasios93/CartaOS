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
  geographies: Geography[];
  context: string;
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

export type AgentId = "benchmarking" | "partner" | "negotiation" | "termsheet" | "synthesis" | "executionPlan" | "outLicensingStrategy";

export type AgentStatus = "idle" | "scraping" | "analyzing" | "complete" | "error";

export const AGENT_META: Record<AgentId, { label: string; description: string; color: string; icon: string }> = {
  benchmarking: { label: "Deal Benchmarking", description: "SEC EDGAR + Clinical Trials → Comparable deals", color: "#3B82F6", icon: "BarChart3" },
  partner:      { label: "Partner Identification", description: "Multi-source scan → Ranked partners", color: "#10B981", icon: "Users" },
  negotiation:  { label: "Negotiation Intelligence", description: "Deal terms + leverage analysis", color: "#F59E0B", icon: "Scale" },
  termsheet:    { label: "Term Sheet Drafting", description: "All sources → Draft term sheet", color: "#A855F7", icon: "FileText" },
  synthesis:    { label: "Deal Package", description: "Contract, DD, data room & intelligence", color: "#EC4899", icon: "Briefcase" },
  executionPlan:{ label: "Execution Plan", description: "Timeline, stakeholders & dependencies", color: "#F97316", icon: "Rocket" },
  outLicensingStrategy: { label: "Out-Licensing Strategy", description: "Per-region market, legal, commercial & IP assessment", color: "#0EA5E9", icon: "Globe" },
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
  | { agentId: "termsheet"; clauses: TermSheetClause[]; termSheet: string }
  | { agentId: "synthesis"; contract: string; dueDiligence: DDSection[]; dataPackage: DataPackageItem[]; intelligence: IntelSection[] }
  | { agentId: "executionPlan"; plan: ExecutionPlanOutput }
  | { agentId: "outLicensingStrategy"; report: OutLicensingReport };

// ─── Out-Licensing Strategy Report Types ────────────────────────────────────

export interface OutLicensingReport {
  /** Board-level go/no-go on pursuing the opportunity. */
  verdict?: "Go" | "Conditional Go" | "No-Go";
  /** One-sentence so-what: where the opportunity is strongest and the biggest blocker. */
  opportunityThesis?: string;
  executiveSummary: string;
  assetProfile: AssetProfile;
  regionalAnalysis: RegionalAnalysis[];
  recommendations: OutLicensingRecommendation[];
  portfolioRisks: PortfolioRisk[];
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
  keyDataPoints: { label: string; value: string; source: string }[];
}

export interface RegionalAnalysis {
  // EU is assessed as four national markets (DE/FR/IT/ES); India (IN) appears for the
  // in-license/origination corridor; "EU" kept for legacy reports.
  region: "US" | "DE" | "FR" | "IT" | "ES" | "EU" | "JP" | "CN" | "ROW" | "IN";
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
  /** Synthesised investment thesis for this region — the rational value
   *  proposition, exactly where a profitable business case sits, the economics,
   *  and the per-region call. Pulls together all six vectors. */
  businessCase?: {
    valueProposition: string;
    profitWedge: string;
    economics: string;
    verdict: "Pursue" | "Watch" | "Pass";
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

export interface TermSheetClause {
  clause: string;
  proposedTerm: string;
  marketBenchmark: string;
  flag: "Aligned" | "Upper Range" | "Below Market" | "Negotiate" | "Non-Standard";
  geoNotes: string;
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
