/**
 * Pillar 2 — Strategy. Consumes a completed Diagnosis and produces a route
 * comparison, not prose advice.
 *
 * Division of labour: the model proposes ASSUMPTIONS (each labelled sourced or
 * assumed), route rationales and a partner shortlist. It does NOT produce a
 * single financial figure — NPV, break-even, scenarios and sensitivity are all
 * computed by server/services/strategy/model.ts. The two branches use disjoint
 * prompts and grounding stacks (§7).
 */

import Anthropic from "@anthropic-ai/sdk";
import type { HubIntakeForm } from "@/types/hub";
import type { AgentWriter } from "./index";
import type { Diagnosis, Strategy, StrategyRoute, Assumption, PartnerCandidate } from "@/types/run";
import { OFF_PATENT_ROUTES, INNOVATIVE_ROUTES } from "@/config/routes";
import {
  modelAllRoutes,
  runScenarios,
  sensitivity,
  recommendRoute,
  OFF_PATENT_REQUIRED,
  INNOVATIVE_REQUIRED,
  type AssumptionValues,
  type RouteResult,
} from "@/server/services/strategy/model";
import { withGrounding, withInnovativeGrounding } from "@/server/services/source-reference";
import { extractJSON, cleanError } from "./utils";
import { countryByCode } from "@/config/geographies";

const MODEL = "claude-opus-4-8";

/* eslint-disable @typescript-eslint/no-explicit-any */

const SHARED_OUTPUT = `Return ONLY valid JSON:
{
  "assumptions": [
    { "key": "the exact assumption key requested", "label": "human label", "value": <number>, "unit": "USD | % | months | years", "basis": "sourced | assumed", "source": "the named source, when basis is sourced" }
  ],
  "routes": [
    { "key": "the exact route key", "score": <integer 0-100>, "rationale": "two sentences on why this route fits or does not, for THIS asset in THESE markets", "keyDependency": "the single thing that would break this plan", "evidence": [ { "claim": "...", "kind": "evidence | estimate", "source": "..." } ] }
  ],
  "partnerShortlist": [
    { "name": "company", "kind": "licensee | distributor | tender agent | CDMO | acquirer | co-development partner", "geographies": ["ISO codes"], "score": 0-100, "rationale": "why THIS partner for THIS asset — the specific fit", "evidence": [ { "claim": "...", "kind": "evidence | estimate", "source": "..." } ] }
  ],
  "approachSequence": ["the recommended order of approach, most-likely-to-close first"],
  "note": "anything the numbers will not show"
}

RULES THAT MATTER MOST
- You supply ASSUMPTIONS ONLY. Do NOT compute or state an NPV, break-even, IRR or any derived financial figure — those are calculated deterministically from your assumptions and any number you invent will be overwritten and will contradict the report.
- Route and partner scores are on a 0-100 scale, NOT 0-10. Anchor them: 0-20 structurally impossible for this asset (the counterparty is not selling, the rights are not available, the model does not apply), 21-40 open in principle but badly mismatched, 41-60 workable with real friction, 61-80 a good fit, 81-100 the obvious route. A route scoring 40 or below is excluded from being recommended however good its economics look, so score availability honestly — that gate is the difference between a plan and a fantasy.
- Every assumption needs an HONEST basis. "sourced" requires a real named source for THIS asset or a close comparator; everything else is "assumed". Do not label a prior as sourced.
- Supply EVERY assumption key requested, in the units stated. A missing key makes routes non-computable and the user sees a gap instead of a plan.
- Partner names must be real companies you can justify from the evidence, with the reason they fit. An invented shortlist is worse than a short one.
- Do not include commentary outside the JSON.`;

const OFF_PATENT_PROMPT = `You are planning how to COMMERCIALISE an already-approved, off-patent medicine across the selected markets, given a completed worthiness diagnosis. The client owns or can obtain the asset; the question is which commercial route captures the most value and in what sequence.

You are comparing these routes: own MA + own distribution, in-licensing an existing dossier, out-licensing the MA, a distribution/supply agreement, a tender-agent model, contract manufacture, profit-share/co-promotion, and outright asset sale. Score each for THIS asset in THESE markets — a commodity generic in tender-driven Europe and a complex product in US retail do not have the same answer.

Assumption keys required (units in brackets):
- addressableRevenueYear1 [USD] — the realistically addressable in-market revenue pool in the first full year across the selected markets, post-loss-of-exclusivity, NOT the originator's peak
- shareCapture [%] — the share of that pool this holder can realistically win
- erosionRatePct [%] — annual price erosion for this molecule class in these markets
- volumeGrowthPct [%] — annual volume growth
- launchCostTotal [USD] — total cost to launch across the selected markets
- cogsPct [%] — cost of goods as a share of booked revenue
- timeToLaunchMonths [months] — from decision to first sale on the own-MA path
- discountRatePct [%] — the discount rate appropriate to this asset's risk
- horizonYears [years] — the modelling horizon

${SHARED_OUTPUT}`;

const INNOVATIVE_PROMPT = `You are planning how to REALISE VALUE from a novel, innovative asset, given a completed worthiness diagnosis. The asset still carries development risk; the question is which transaction structure and timing captures the most risk-adjusted value, and who the counterparties are.

You are comparing these routes: global out-licence, regional out-licence with a rights split, co-development, option-to-license, NewCo/spin-out, outright sale, advancing alone to the next inflection before transacting, and non-dilutive funded development. Score each for THIS asset at THIS stage — an asset one readout from a value inflection is a different decision from one three years out.

Assumption keys required (units in brackets):
- peakSalesUsd [USD] — realistic unadjusted peak annual sales if approved
- probabilityOfSuccessPct [%] — cumulative probability of reaching approval from the current stage, benchmarked to the therapy area
- yearsToLaunch [years] — from today to first sale if development succeeds
- costToNextInflectionUsd [USD] — cost to reach the next value-inflecting event
- operatingMarginPct [%] — operating margin on peak sales
- rampYears [years] — years from launch to peak
- discountRatePct [%] — the discount rate appropriate to this asset's risk
- horizonYears [years] — the modelling horizon

${SHARED_OUTPUT}`;

export function normaliseAssumptions(raw: any, required: string[]): { list: Assumption[]; values: AssumptionValues } {
  const byKey = new Map<string, any>(
    Array.isArray(raw) ? raw.filter((a) => a && typeof a.key === "string").map((a) => [a.key, a]) : [],
  );
  const list: Assumption[] = [];
  const values: AssumptionValues = {};
  // Config decides which assumptions exist; anything extra the model volunteers
  // is kept (it may drive sensitivity) but the required set is what gates.
  const keys = [...new Set([...required, ...byKey.keys()])];
  for (const key of keys) {
    const a = byKey.get(key);
    const n = Number(a?.value);
    if (!Number.isFinite(n)) continue;
    values[key] = n;
    list.push({
      key,
      label: a?.label ? String(a.label).slice(0, 120) : key,
      value: n,
      unit: a?.unit ? String(a.unit).slice(0, 24) : undefined,
      basis: a?.basis === "sourced" ? "sourced" : "assumed",
      source: a?.source ? String(a.source).slice(0, 200) : undefined,
      editable: true,
    });
  }
  return { list, values };
}

export function mergeRoutes(
  defs: { key: string; label: string; description: string; dependencyPrompt: string }[],
  economics: RouteResult[],
  raw: any,
): StrategyRoute[] {
  const byKey = new Map<string, any>(
    Array.isArray(raw) ? raw.filter((r) => r && typeof r.key === "string").map((r) => [r.key, r]) : [],
  );
  return defs.map((def) => {
    const narrative = byKey.get(def.key);
    const econ = economics.find((e) => e.key === def.key);
    const score = Number(narrative?.score);
    return {
      key: def.key,
      label: def.label,
      score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : null,
      // The economics object is the deterministic layer's output and is never
      // sourced from the model, so a narrated figure cannot contradict it.
      model: { description: def.description, economics: econ } as Record<string, unknown>,
      keyDependency: narrative?.keyDependency ? String(narrative.keyDependency).slice(0, 400) : def.dependencyPrompt,
      evidence: Array.isArray(narrative?.evidence)
        ? narrative.evidence
            .filter((e: any) => e && typeof e.claim === "string")
            .slice(0, 6)
            .map((e: any) => ({
              claim: String(e.claim).slice(0, 500),
              kind: e.kind === "evidence" ? ("evidence" as const) : ("estimate" as const),
              source: e.source ? String(e.source).slice(0, 160) : undefined,
            }))
        : [],
      rationale: narrative?.rationale ? String(narrative.rationale).slice(0, 800) : undefined,
    } as StrategyRoute;
  });
}

export function normalisePartners(raw: any): PartnerCandidate[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p) => p && typeof p.name === "string")
    .slice(0, 15)
    .map((p) => {
      const s = Number(p.score);
      return {
        name: String(p.name).slice(0, 160),
        kind: p.kind ? String(p.kind).slice(0, 60) : undefined,
        geographies: Array.isArray(p.geographies)
          ? p.geographies.map((g: any) => String(g).toUpperCase()).filter((g: string) => countryByCode(g))
          : [],
        score: Number.isFinite(s) ? Math.max(0, Math.min(100, Math.round(s))) : null,
        rationale: p.rationale ? String(p.rationale).slice(0, 600) : undefined,
        evidence: Array.isArray(p.evidence)
          ? p.evidence
              .filter((e: any) => e && typeof e.claim === "string")
              .slice(0, 4)
              .map((e: any) => ({
                claim: String(e.claim).slice(0, 400),
                kind: e.kind === "evidence" ? ("evidence" as const) : ("estimate" as const),
                source: e.source ? String(e.source).slice(0, 160) : undefined,
              }))
          : [],
      };
    })
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}

/** Condense the diagnosis into the context the strategy actually needs. */
function renderDiagnosis(d: Diagnosis): string {
  const dims = (d.dimensions ?? [])
    .map((x) => `- ${x.key}: ${x.score == null ? `NOT COMPUTABLE (${x.notComputable ?? "no data"})` : `${x.score}/100`}${x.summary ? ` — ${x.summary}` : ""}`)
    .join("\n");
  const markets = (d.perMarket ?? [])
    .map((m) => `- ${m.country}${countryByCode(m.country) ? ` (${countryByCode(m.country)!.name})` : ""}: ${m.score ?? "n/a"}${m.verdict ? ` ${m.verdict}` : ""}${m.summary ? ` — ${m.summary}` : ""}`)
    .join("\n");
  return [
    `## COMPLETED DIAGNOSIS (verdict ${d.verdict}${d.worthinessScore != null ? `, worthiness ${d.worthinessScore}/100` : ""})`,
    d.thesis ? `Thesis: ${d.thesis}` : "",
    dims ? `### Dimension scores\n${dims}` : "",
    markets ? `### Per-market\n${markets}` : "",
    d.topRisks?.length ? `### Top risks\n${d.topRisks.map((r) => `- ${r}`).join("\n")}` : "",
    d.swingFactors?.length ? `### Swing factors\n${d.swingFactors.map((s) => `- ${s}`).join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 14000);
}

export async function runStrategyAgent(
  intake: HubIntakeForm & { diagnosis: Diagnosis; diagnosisRunId?: string },
  write: AgentWriter,
): Promise<void> {
  const agentId = "strategy" as const;
  const branch = intake.diagnosis.branch === "innovative" ? "innovative" : "off_patent";

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured. Please add your API key in environment variables.");
    }
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const isOffPatent = branch === "off_patent";
    const defs = isOffPatent ? OFF_PATENT_ROUTES : INNOVATIVE_ROUTES;
    const required = isOffPatent ? OFF_PATENT_REQUIRED : INNOVATIVE_REQUIRED;
    const geographies = (intake.geographies ?? []).map((g) => g.toUpperCase()).filter((g) => countryByCode(g));

    write({
      agent: agentId,
      type: "status",
      status: "analyzing",
      message: `Modelling ${defs.length} ${isOffPatent ? "commercialisation" : "partnering"} routes for ${intake.assetName}…`,
    });

    const routeBrief = defs
      .map((r) => `- ${r.key} — ${r.label}: ${r.description}`)
      .join("\n");
    const marketBrief = geographies.length
      ? geographies.map((g) => `${g} (${countryByCode(g)!.name})`).join(", ")
      : "no markets selected";

    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: (isOffPatent ? withGrounding : withInnovativeGrounding)(
        isOffPatent ? OFF_PATENT_PROMPT : INNOVATIVE_PROMPT,
      ),
      messages: [
        {
          role: "user",
          content: `## ASSET\n${intake.assetName}${intake.context ? `\nContext: ${intake.context}` : ""}\n\n## MARKETS\n${marketBrief}\n\n${renderDiagnosis(intake.diagnosis)}\n\n## ROUTES TO SCORE (score every one, by key)\n${routeBrief}\n\nProduce the assumptions, route scores, partner shortlist and approach sequence as JSON.`,
        },
      ],
    });

    if (res.stop_reason === "refusal") throw new Error("The strategy request was declined by safety classifiers.");
    const parsed = extractJSON<any>(res.content.find((b) => b.type === "text")?.text ?? "");

    // ── Deterministic layer: every number below is computed, not narrated ──
    const { list: assumptions, values } = normaliseAssumptions(parsed?.assumptions, required);
    const economics = modelAllRoutes(branch, values);
    const routes = mergeRoutes(defs, economics, parsed?.routes);
    const fit = Object.fromEntries(routes.map((r) => [r.key, r.score]));
    const best = recommendRoute(economics, fit);
    const scenarios = runScenarios(branch, values, 20);
    const sens = best ? sensitivity(branch, values, best.key, 20) : [];

    const strategy: Strategy = {
      branch,
      diagnosisRunId: intake.diagnosisRunId,
      routes,
      recommendedRoute: best?.key,
      assumptions,
      scenarios: scenarios as unknown as Record<string, unknown>,
      sensitivity: sens as unknown as Record<string, unknown>[],
      partnerShortlist: normalisePartners(parsed?.partnerShortlist),
      completedAt: new Date().toISOString(),
      approachSequence: Array.isArray(parsed?.approachSequence)
        ? parsed.approachSequence.slice(0, 8).map(String)
        : [],
      note: parsed?.note ? String(parsed.note).slice(0, 800) : undefined,
      missingAssumptions: required.filter((k) => !Number.isFinite(values[k])),
    } as Strategy;

    write({ agent: agentId, type: "result", data: { agentId, strategy } as any });
    write({
      agent: agentId,
      type: "status",
      status: "complete",
      message: best
        ? `${defs.length} routes modelled — best NPV: ${best.label}`
        : `${defs.length} routes listed — not computable until the missing assumptions are supplied`,
    });
  } catch (err) {
    const message = cleanError(err);
    write({ agent: agentId, type: "error", error: message });
    write({ agent: agentId, type: "status", status: "error", message });
  }
}
