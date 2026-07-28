/**
 * The Run spine — the single object every pillar reads from and writes to.
 *
 *   Run = { asset, assetType, geographies, criteria, diagnosis?, strategy?, execution? }
 *
 * Zod schemas double as runtime validation (API boundaries, agent output) and
 * as the source of the TS types used by both frontend and backend. Diagnosis,
 * Strategy and Execution payloads are versioned envelopes around agent output:
 * the envelope fields here are load-bearing across pillars; branch-specific
 * detail lives under `dimensions`/`routes` and may carry extra keys.
 */

import { z } from "zod/v4";

// ── Asset ────────────────────────────────────────────────────────────────────

export const AssetTypeSchema = z.enum(["off_patent", "innovative"]);
export type AssetType = z.infer<typeof AssetTypeSchema>;

/** Entity resolution output — a run is anchored to a resolved entity, not a string. */
export const ResolvedAssetSchema = z.object({
  name: z.string(),
  inn: z.string().optional(),
  brandNames: z.array(z.string()).default([]),
  rxcui: z.string().optional(),
  unii: z.string().optional(),
  chemblId: z.string().optional(),
  atcCodes: z.array(z.string()).default([]),
  moleculeClass: z.string().optional(),
  target: z.string().optional(),
  modality: z.string().optional(),
});
export type ResolvedAsset = z.infer<typeof ResolvedAssetSchema>;

export const RunAssetSchema = z.object({
  /** Exactly what the user typed. */
  query: z.string().min(1),
  /** Present once entity resolution has confirmed what the query refers to. */
  resolved: ResolvedAssetSchema.optional(),
});
export type RunAsset = z.infer<typeof RunAssetSchema>;

// ── Evidence & confidence (§3.3 — applies to every generated number) ─────────

export const ConfidenceSchema = z.enum(["high", "medium", "low"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

/**
 * kind separates sourced findings from model inferences — the two must render
 * visually distinct (Evidence vs Estimate badge), and a figure with neither a
 * source nor an explicit estimate marker is a rendering bug.
 */
export const EvidenceItemSchema = z.object({
  claim: z.string(),
  kind: z.enum(["evidence", "estimate"]),
  source: z.string().optional(),
  url: z.string().optional(),
  publishedAt: z.string().optional(),
  accessedAt: z.string().optional(),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  confidence: ConfidenceSchema.optional(),
});
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

// ── Criteria (§3.2 — extracted from uploads, editable before the run) ────────

export const CriterionCategorySchema = z.enum([
  "compound",
  "target",
  "indication",
  "molecule_class",
  "dosage_form",
  "stage",
  "geography",
  "competitor",
  "constraint",
  "lever_weight",
  "other",
]);
export type CriterionCategory = z.infer<typeof CriterionCategorySchema>;

export const CriterionSchema = z.object({
  id: z.string(),
  category: CriterionCategorySchema,
  value: z.string(),
  /** 0–100; user-adjustable before the run. */
  weight: z.number().min(0).max(100).default(50),
  /** Mandatory provenance for extracted criteria; absent only for user-added ones. */
  provenance: z
    .object({
      fileId: z.string().optional(),
      fileName: z.string(),
      /** e.g. "page 4", "sheet Portfolio!B12", "slide 7" */
      location: z.string().optional(),
      snippet: z.string().optional(),
    })
    .optional(),
});
export type Criterion = z.infer<typeof CriterionSchema>;

export const RunFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
  storagePath: z.string().optional(),
  uploadedAt: z.string().optional(),
  extractionStatus: z.enum(["pending", "extracted", "failed"]).optional(),
  extractionError: z.string().optional(),
});
export type RunFile = z.infer<typeof RunFileSchema>;

// ── Diagnosis (Pillar 1) ─────────────────────────────────────────────────────

export const VerdictSchema = z.enum(["GO", "CONDITIONAL", "NO_GO"]);
export type Verdict = z.infer<typeof VerdictSchema>;

/** One scored dimension (config-driven set per branch — see config/dimensions.ts). */
export const DimensionScoreSchema = z.looseObject({
  key: z.string(),
  score: z.number().min(0).max(100).nullable(),
  /** null score ⇒ notComputable must explain why; never fabricate. */
  notComputable: z.string().optional(),
  computed: z.boolean().default(false),
  confidence: ConfidenceSchema.optional(),
  summary: z.string().optional(),
  evidence: z.array(EvidenceItemSchema).default([]),
  /** Which registry sources were actually consulted (coverage log, §7). */
  sourcesConsulted: z.array(z.string()).default([]),
});
export type DimensionScore = z.infer<typeof DimensionScoreSchema>;

export const MarketScoreSchema = z.looseObject({
  country: z.string(),
  score: z.number().min(0).max(100).nullable(),
  verdict: VerdictSchema.optional(),
  rank: z.number().optional(),
  dimensions: z.array(DimensionScoreSchema).default([]),
  summary: z.string().optional(),
});
export type MarketScore = z.infer<typeof MarketScoreSchema>;

export const DiagnosisSchema = z.looseObject({
  branch: AssetTypeSchema,
  verdict: VerdictSchema,
  verdictConfidence: ConfidenceSchema.optional(),
  worthinessScore: z.number().min(0).max(100).nullable(),
  thesis: z.string().optional(),
  dimensions: z.array(DimensionScoreSchema),
  perMarket: z.array(MarketScoreSchema),
  topRisks: z.array(z.string()).default([]),
  /** The variables that most move the score (§4.1) / biggest value-inflection lever (§4.2). */
  swingFactors: z.array(z.string()).default([]),
  /** Off-patent: 10-lever value scan; innovative: IP/FTO flags — branch-specific. */
  valueLevers: z.array(z.record(z.string(), z.unknown())).optional(),
  ipFlags: z.array(z.record(z.string(), z.unknown())).optional(),
  completedAt: z.string().optional(),
});
export type Diagnosis = z.infer<typeof DiagnosisSchema>;

// ── Strategy (Pillar 2) ──────────────────────────────────────────────────────

export const AssumptionSchema = z.looseObject({
  key: z.string(),
  label: z.string(),
  value: z.union([z.number(), z.string()]),
  unit: z.string().optional(),
  basis: z.enum(["sourced", "assumed"]),
  source: z.string().optional(),
  editable: z.boolean().default(true),
});
export type Assumption = z.infer<typeof AssumptionSchema>;

export const StrategyRouteSchema = z.looseObject({
  key: z.string(),
  label: z.string(),
  score: z.number().min(0).max(100).nullable().optional(),
  /** Modelled consequences: launch sequence, time-to-launch, cost stack, NPV, … */
  model: z.record(z.string(), z.unknown()).optional(),
  keyDependency: z.string().optional(),
  evidence: z.array(EvidenceItemSchema).default([]),
});
export type StrategyRoute = z.infer<typeof StrategyRouteSchema>;

export const PartnerCandidateSchema = z.looseObject({
  name: z.string(),
  kind: z.string().optional(),
  geographies: z.array(z.string()).default([]),
  score: z.number().min(0).max(100).nullable().optional(),
  rationale: z.string().optional(),
  evidence: z.array(EvidenceItemSchema).default([]),
});
export type PartnerCandidate = z.infer<typeof PartnerCandidateSchema>;

export const StrategySchema = z.looseObject({
  branch: AssetTypeSchema,
  /** Which diagnosis this strategy consumed — Strategy cannot be entered cold. */
  diagnosisRunId: z.string().optional(),
  routes: z.array(StrategyRouteSchema),
  recommendedRoute: z.string().optional(),
  assumptions: z.array(AssumptionSchema).default([]),
  scenarios: z.record(z.string(), z.unknown()).optional(),
  sensitivity: z.array(z.record(z.string(), z.unknown())).default([]),
  partnerShortlist: z.array(PartnerCandidateSchema).default([]),
  completedAt: z.string().optional(),
});
export type Strategy = z.infer<typeof StrategySchema>;

// ── Execution (Pillar 3 — Option A: workstream tracker) ──────────────────────

export const MilestoneSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  workstream: z.string().optional(),
  owner: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(["not_started", "in_progress", "blocked", "done"]).default("not_started"),
  dependsOn: z.array(z.string()).default([]),
  notes: z.string().optional(),
});
export type Milestone = z.infer<typeof MilestoneSchema>;

export const ExecutionSchema = z.looseObject({
  sourceRoute: z.string().optional(),
  workstreams: z.array(z.string()).default([]),
  milestones: z.array(MilestoneSchema).default([]),
  completedAt: z.string().optional(),
});
export type Execution = z.infer<typeof ExecutionSchema>;

// ── The Run itself ───────────────────────────────────────────────────────────

export const RunStatusSchema = z.enum([
  "draft",
  "diagnosis_running",
  "diagnosed",
  "strategy_running",
  "strategized",
  "execution_running",
  "complete",
  "error",
]);
export type RunStatus = z.infer<typeof RunStatusSchema>;

/** One agent-console event (§3.4 — no opaque spinners). */
export const RunLogEventSchema = z.looseObject({
  at: z.string(),
  phase: z.string().optional(),
  kind: z.enum(["status", "query", "source_hit", "extraction", "result", "error"]),
  message: z.string(),
  source: z.string().optional(),
});
export type RunLogEvent = z.infer<typeof RunLogEventSchema>;

export const RunSchema = z.object({
  id: z.string(),
  userId: z.string(),
  asset: RunAssetSchema,
  assetType: AssetTypeSchema,
  /** ISO-3166 alpha-2 codes; see config/geographies.ts for hierarchy + presets. */
  geographies: z.array(z.string()).min(1),
  criteria: z.array(CriterionSchema).default([]),
  files: z.array(RunFileSchema).default([]),
  status: RunStatusSchema.default("draft"),
  diagnosis: DiagnosisSchema.optional(),
  strategy: StrategySchema.optional(),
  execution: ExecutionSchema.optional(),
  log: z.array(RunLogEventSchema).default([]),
  error: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type Run = z.infer<typeof RunSchema>;

/** What the run-configuration form submits to start a run. */
export const RunIntakeSchema = RunSchema.pick({
  asset: true,
  assetType: true,
  geographies: true,
  criteria: true,
  files: true,
});
export type RunIntake = z.infer<typeof RunIntakeSchema>;
