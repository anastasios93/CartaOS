/**
 * Search-criteria extraction.
 *
 * Turns ANY uploaded document or pasted text — a strategic brief, a target-product
 * profile, a parameters sheet, a screening rubric — into a structured
 * SearchCriteria that customises the market-worthiness search and the asset value
 * assessment. The client writes their variables, parameters and search criteria in
 * whatever form they already have them; this normalises that into the fields the
 * engine can act on.
 *
 * Extraction is LLM-driven (the document is free-form), with a deterministic
 * heuristic fallback so the feature degrades rather than fails when the model is
 * unavailable. The lever-weight APPLICATION is fully deterministic — the model
 * only reads the brief, it never scores value.
 *
 * Confidentiality: the caller processes the text in-session and does not persist
 * it. Only the extracted, user-reviewable criteria are returned.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { SearchCriteria, ValueLever, ValueLeverType } from "@/types/hub";
import { extractJSON, parseCompounds } from "@/server/agents/utils";

const LEVERS: ValueLeverType[] = [
  "Geographic expansion",
  "Indication expansion / repurposing",
  "Distribution channels",
  "Formulary positioning",
  "Administration / formulation",
  "Reimbursement / pricing",
  "Sales-force effectiveness",
  "Lifecycle / IP defense",
  "Supply / COGS arbitrage",
  "Portfolio synergy",
];

const EXTRACT_PROMPT = `You extract structured search parameters from a client document for CartaOS, an engine that finds residual and incremental value in already-approved, off-patent medicines. The client has written their variables, parameters and search criteria in free form; convert them faithfully into the JSON below. Extract only what is genuinely present — never invent assets, geographies, weights or thresholds that the document does not state.

Return ONLY valid JSON with this exact shape:
{
  "assets": ["molecules / brands / compounds named as the subjects to assess"],
  "geographies": ["target countries or regions named — country names or codes as written"],
  "therapeuticArea": "the therapeutic area / indication focus if stated, else omit",
  "valueQuestion": "the specific question the client wants answered — what 'value' means to them (one sentence)",
  "leverWeights": [
    { "lever": "one of: Geographic expansion | Indication expansion / repurposing | Distribution channels | Formulary positioning | Administration / formulation | Reimbursement / pricing | Sales-force effectiveness | Lifecycle / IP defense | Supply / COGS arbitrage | Portfolio synergy", "weight": 0-100 }
  ],
  "constraints": ["hard constraints, must-haves or exclusions stated in the document"],
  "thresholds": [ { "metric": "what is measured", "operator": ">= | <= | > | < | = | is", "value": "the threshold value as written" } ],
  "timeHorizon": "the planning horizon if stated, else omit",
  "notes": "anything relevant that does not fit the fields above"
}

Rules:
- Map the client's stated priorities to leverWeights. If they emphasise, e.g., pricing and reimbursement, weight those highly and others low. Only include levers the document actually implicates; if it states no priorities, return an empty leverWeights array (the engine will weight equally).
- Use the EXACT lever names from the list. Do not invent lever names.
- Keep assets as clean molecule/brand names.
- Do not include commentary outside the JSON.`;

/** Extract criteria from free-form text. Falls back to heuristics on failure. */
export async function extractCriteria(
  rawText: string,
): Promise<{ criteria: SearchCriteria; method: "model" | "heuristic" }> {
  const text = (rawText ?? "").slice(0, 24000).trim();
  if (!text) return { criteria: emptyCriteria(), method: "heuristic" };

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const res = await anthropic.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 2000,
        system: EXTRACT_PROMPT,
        messages: [{ role: "user", content: `Document to extract search criteria from:\n\n${text}` }],
      });
      const out = res.content.find(b => b.type === "text")?.text ?? "";
      const parsed = extractJSON<SearchCriteria>(out);
      return { criteria: sanitize(parsed), method: "model" };
    } catch {
      // fall through to heuristic
    }
  }
  return { criteria: heuristic(text), method: "heuristic" };
}

// ─── Sanitisation ───────────────────────────────────────────────────────────

function emptyCriteria(): SearchCriteria {
  return { assets: [], geographies: [] };
}

const clampWeight = (n: unknown): number => {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
};

function sanitize(raw: Partial<SearchCriteria> | null): SearchCriteria {
  if (!raw || typeof raw !== "object") return emptyCriteria();
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map(x => String(x).trim()).filter(Boolean).slice(0, 40) : [];

  const weights = Array.isArray(raw.leverWeights)
    ? raw.leverWeights
        .map(w => ({ lever: w?.lever as ValueLeverType, weight: clampWeight(w?.weight) }))
        .filter(w => LEVERS.includes(w.lever))
    : [];
  // De-dupe levers, keeping the highest weight.
  const byLever = new Map<ValueLeverType, number>();
  for (const w of weights) byLever.set(w.lever, Math.max(byLever.get(w.lever) ?? 0, w.weight));

  const thresholds = Array.isArray(raw.thresholds)
    ? raw.thresholds
        .map(t => ({
          metric: String(t?.metric ?? "").trim(),
          operator: String(t?.operator ?? "").trim(),
          value: String(t?.value ?? "").trim(),
        }))
        .filter(t => t.metric && t.value)
        .slice(0, 20)
    : [];

  return {
    assets: arr(raw.assets),
    geographies: arr(raw.geographies),
    therapeuticArea: raw.therapeuticArea ? String(raw.therapeuticArea).trim() : undefined,
    valueQuestion: raw.valueQuestion ? String(raw.valueQuestion).trim().slice(0, 600) : undefined,
    leverWeights: [...byLever.entries()].map(([lever, weight]) => ({ lever, weight })),
    constraints: arr(raw.constraints),
    thresholds,
    timeHorizon: raw.timeHorizon ? String(raw.timeHorizon).trim() : undefined,
    notes: raw.notes ? String(raw.notes).trim().slice(0, 1000) : undefined,
  };
}

// ─── Heuristic fallback ─────────────────────────────────────────────────────

const GEO_HINTS: Record<string, string> = {
  us: "US", usa: "US", "united states": "US", america: "US",
  eu: "EU", europe: "EU", germany: "DE", france: "FR", italy: "IT", spain: "ES",
  uk: "UK", "united kingdom": "UK", britain: "UK",
  japan: "JP", china: "CN", india: "IN", canada: "CA", brazil: "BR", australia: "AU",
};

const LEVER_HINTS: { re: RegExp; lever: ValueLeverType }[] = [
  { re: /\b(geograph|country|countries|market entry|export|corridor|ex-us|new market)/i, lever: "Geographic expansion" },
  { re: /\b(indication|repurpos|off-label|new use|505\(b\)\(2\)|orphan|paediatric|pediatric)/i, lever: "Indication expansion / repurposing" },
  { re: /\b(distribution|channel|wholesal|retail|hospital|specialty pharmacy|tender)/i, lever: "Distribution channels" },
  { re: /\b(formular|tier|prior auth|step therapy|reimbursed list|coverage)/i, lever: "Formulary positioning" },
  { re: /\b(formulation|dosage form|route|reformulat|extended release|device|galenic)/i, lever: "Administration / formulation" },
  { re: /\b(pric|reimburs|gross-to-net|net price|rebate|340b|discount|margin)/i, lever: "Reimbursement / pricing" },
  { re: /\b(sales ?force|rep|call plan|targeting|promotion|kam|field)/i, lever: "Sales-force effectiveness" },
  { re: /\b(patent|exclusivity|lifecycle|authorized generic|biosimilar defen|litigation)/i, lever: "Lifecycle / IP defense" },
  { re: /\b(supply|shortage|cogs|cost-plus|second source|api cost)/i, lever: "Supply / COGS arbitrage" },
  { re: /\b(portfolio|bundl|cross-sell|franchise|adjacen|co-pay)/i, lever: "Portfolio synergy" },
];

function heuristic(text: string): SearchCriteria {
  const lower = text.toLowerCase();

  const geographies = [...new Set(
    Object.entries(GEO_HINTS)
      .filter(([k]) => new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(lower))
      .map(([, v]) => v),
  )];

  const leverWeights = LEVER_HINTS
    .filter(h => h.re.test(text))
    .map(h => ({ lever: h.lever, weight: 80 }));

  // Assets: look for an explicit "assets:"/"molecules:"/"compounds:" line, else the
  // comma-separated first non-empty line as a best effort.
  let assets: string[] = [];
  const line = /(?:assets?|molecules?|compounds?|products?)\s*[:\-]\s*(.+)/i.exec(text);
  if (line) assets = parseCompounds(line[1]);

  return {
    assets,
    geographies,
    leverWeights,
    constraints: [],
    thresholds: [],
    notes: "Parsed by keyword fallback (model extraction unavailable) — review and edit before running.",
  };
}

// ─── Deterministic weighting ────────────────────────────────────────────────

/**
 * Combine lever scores into a single worthiness score under the client's weights.
 * Not-computable levers are excluded (a client cannot weight what has no data),
 * and weights are renormalised over the levers that actually have a score, so the
 * result is always on a clean 0–100 scale. This is pure arithmetic — the model
 * never sets the number.
 */
export function applyLeverWeights(
  levers: Pick<ValueLever, "lever" | "score" | "notComputable" | "computed">[],
  weights: SearchCriteria["leverWeights"],
): NonNullable<import("@/types/hub").OutLicensingReport["weightedWorthiness"]> {
  const weightMap = new Map<string, number>();
  for (const w of weights ?? []) weightMap.set(w.lever, w.weight);
  const usingClientWeights = weightMap.size > 0;

  const scored = levers.filter(l => !l.notComputable && Number.isFinite(l.score));
  const byLever = scored.map(l => ({
    lever: l.lever,
    score: Math.max(0, Math.min(100, l.score)),
    // Default to equal weight (50) for any lever the client did not rank.
    weight: usingClientWeights ? weightMap.get(l.lever) ?? 0 : 50,
    computed: !!l.computed,
  }));

  const totalWeight = byLever.reduce((a, l) => a + l.weight, 0);
  const score = totalWeight > 0
    ? Math.round(byLever.reduce((a, l) => a + l.score * l.weight, 0) / totalWeight)
    : (byLever.length ? Math.round(byLever.reduce((a, l) => a + l.score, 0) / byLever.length) : 0);

  const computedCount = byLever.filter(l => l.computed).length;
  return {
    score,
    method: usingClientWeights
      ? `Client-weighted across ${byLever.length} scored levers (${computedCount} computed from live data)`
      : `Equal-weighted across ${byLever.length} scored levers (no client weights supplied)`,
    byLever: byLever.sort((a, b) => b.weight - a.weight || b.score - a.score),
    note: "Weights are renormalised over levers that have a score; not-computable levers are excluded rather than counted as zero.",
  };
}
