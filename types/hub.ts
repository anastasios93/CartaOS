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

export type AgentId = "benchmarking" | "partner" | "negotiation" | "termsheet";

export type AgentStatus = "idle" | "scraping" | "analyzing" | "complete" | "error";

export const AGENT_META: Record<AgentId, { label: string; description: string; color: string; icon: string }> = {
  benchmarking: { label: "Deal Benchmarking", description: "SEC EDGAR + Clinical Trials → Comparable deals", color: "#3B82F6", icon: "BarChart3" },
  partner:      { label: "Partner Identification", description: "Multi-source scan → Ranked partners", color: "#10B981", icon: "Users" },
  negotiation:  { label: "Negotiation Intelligence", description: "Deal terms + leverage analysis", color: "#F59E0B", icon: "Scale" },
  termsheet:    { label: "Term Sheet Drafting", description: "All sources → Draft term sheet", color: "#A855F7", icon: "FileText" },
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
  | { agentId: "termsheet"; clauses: TermSheetClause[]; termSheet: string };

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
