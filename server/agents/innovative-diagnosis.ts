/**
 * Diagnosis 1B — novel innovative compound worthiness.
 *
 * The sibling of the off-patent assessment, and deliberately NOT a variant of
 * it: different dimensions (config/dimensions.ts INNOVATIVE_DIMENSIONS),
 * different source routing (config/sources.ts, geography-scoped), and a
 * different prompt stack (withInnovativeGrounding — no off-patent lens, no
 * ten-lever taxonomy). §7 requires the two branches share none of the three.
 *
 * Two Opus calls run concurrently: the dimension/verdict/IP assessment and the
 * per-geography market read. Output is the Run spine's Diagnosis directly —
 * there is no legacy report shape to preserve on this branch.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { HubIntakeForm, SourceHit } from "@/types/hub";
import type { AgentWriter } from "./index";
import type { Diagnosis, DimensionScore, MarketScore, EvidenceItem } from "@/types/run";
import { INNOVATIVE_DIMENSIONS } from "@/config/dimensions";
import { sourcesForGeographies } from "@/config/sources";
import { countryByCode } from "@/config/geographies";
import { withInnovativeGrounding } from "@/server/services/source-reference";
import { extractJSON, cleanError, primaryCompound } from "./utils";
import { searchOpenTargets } from "@/server/services/open-targets";
import { searchClinicalTrials } from "@/server/services/clinical-trials";
import { searchLiterature } from "@/server/services/pubmed";
import { searchPatents } from "@/server/services/patents";
import { searchEdgarForDeals } from "@/server/services/sec-edgar";
import { searchMolecules, getMechanisms } from "@/server/services/chembl";
import { searchDrugApplications } from "@/server/services/openfda";

const MODEL = "claude-opus-4-8";

/** Which config source ids this agent actually calls a client for. */
const WIRED_SOURCES = new Set([
  "open_targets",
  "clinical_trials",
  "pubmed",
  "europe_pmc",
  "patents_generic",
  "sec_edgar",
  "chembl",
  "drugsfda",
]);

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Per-dimension source coverage (§7). Sources are filtered to the run's
 * geographies first, then split into those this agent actually queried and
 * those that apply but have no wired client — the honest gap list.
 */
export function coverageFor(geographies: string[]) {
  return INNOVATIVE_DIMENSIONS.map((d) => {
    const applicable = sourcesForGeographies(d.sources, geographies);
    const consulted = applicable.filter((s) => WIRED_SOURCES.has(s.id));
    const unwired = applicable.filter((s) => !WIRED_SOURCES.has(s.id));
    return {
      key: d.key,
      label: d.label,
      question: d.question,
      weight: d.weight,
      consulted: consulted.map((s) => s.label),
      unwired: unwired.map((s) => s.label),
    };
  });
}

function renderDimensionBrief(geographies: string[]): string {
  return coverageFor(geographies)
    .map(
      (d) =>
        `- ${d.label} (key "${d.key}", weight ${d.weight}): ${d.question}\n  Sources consulted for this dimension: ${d.consulted.join(", ") || "NONE WIRED"}${d.unwired.length ? `\n  Applicable but NOT connected (treat as a coverage gap, never fill from priors): ${d.unwired.join(", ")}` : ""}`,
    )
    .join("\n");
}

const ASSESS_PROMPT = `You are assessing whether a NOVEL, INNOVATIVE compound is worth pursuing. Score each dimension below 0-100 on the evidence supplied. This is a first-pass screen for an experienced BD executive: it must be honest about what the evidence does and does not support.

Return ONLY valid JSON:
{
  "verdict": "GO | CONDITIONAL | NO_GO",
  "verdictConfidence": "high | medium | low",
  "worthinessScore": 0-100,
  "thesis": "One sentence: the sharpest reason to pursue or pass, naming the binding factor.",
  "dimensions": [
    {
      "key": "the exact dimension key given",
      "score": 0-100 or null when the connected evidence cannot support a score,
      "notComputable": "only when score is null — state exactly what evidence is missing",
      "confidence": "high | medium | low",
      "summary": "One or two sentences on what the evidence establishes for this dimension.",
      "evidence": [ { "claim": "the specific finding", "kind": "evidence | estimate", "source": "the named source it came from" } ]
    }
  ],
  "ipFlags": [
    { "flag": "the blocking claim or IP risk", "severity": "high | medium | low", "citation": "patent number / publication / source", "note": "why it matters and what counsel must clear" }
  ],
  "topRisks": ["the three risks most likely to kill this asset"],
  "inflectionLever": "The single event that most changes what this asset is worth (the value-inflection point), and what it costs to reach.",
  "swingFactors": ["the two or three variables that most move the overall score"],
  "consideredAndRejected": [ { "opportunity": "an angle you considered", "reason": "why you rejected it" } ]
}

RULES
- Score EVERY dimension key given, in the order given. Never invent a key, never drop one.
- "kind" MUST be "evidence" when the claim is anchored to a named source in the material supplied, and "estimate" when it is your inference. Do not label an inference as evidence — this distinction is rendered directly to the user.
- Where a dimension's sources are listed as NOT CONNECTED, that is a coverage gap: score null with notComputable naming the gap, or score only on what IS connected and say so in the summary. Never fill the gap from priors and present it as a finding.
- IP flags are a SCREEN, not a legal opinion. Cite what you found; say plainly that counsel must clear it. An empty list is a valid answer when nothing blocking surfaced — say so rather than inventing risk.
- Do not include commentary outside the JSON.`;

const MARKET_PROMPT = `You are scoring per-geography market attractiveness for a NOVEL, INNOVATIVE compound — payer archetype, HTA regime, pricing precedent for the class, and the likely approval route in each named market.

Return ONLY valid JSON:
{
  "perMarket": [
    {
      "country": "the exact ISO alpha-2 code given",
      "score": 0-100 or null when the connected evidence cannot support a score,
      "verdict": "GO | CONDITIONAL | NO_GO",
      "summary": "One or two sentences: the payer archetype, the HTA/approval route, and the binding access constraint in THIS market."
    }
  ]
}

RULES
- Score EVERY country code given, in the order given, using its own mechanisms — never average them into one regional answer.
- Use the NEW PATENTED ACTIVE mechanisms (AMNOG/G-BA, HAS/CEPS, NICE, EU joint clinical assessment, US PBM coverage). Off-patent mechanisms (reference pricing, rebate tenders, generic substitution) DO NOT apply to a protected novel asset — using them here is a disqualifying category error.
- Where you are reasoning from a general prior rather than market evidence in the material, say so in the summary.
- Do not include commentary outside the JSON.`;

export function normaliseDimensions(raw: any, coverage: ReturnType<typeof coverageFor>): DimensionScore[] {
  const byKey = new Map<string, any>(
    Array.isArray(raw) ? raw.filter((d) => d && typeof d.key === "string").map((d) => [d.key, d]) : [],
  );
  // Config is the source of truth for which dimensions exist and their order —
  // a dimension the model dropped becomes an explicit gap, never a silent hole.
  return coverage.map((c) => {
    const d = byKey.get(c.key);
    const rawScore = Number(d?.score);
    const scored = d && d.score !== null && Number.isFinite(rawScore);
    const evidence: EvidenceItem[] = Array.isArray(d?.evidence)
      ? d.evidence
          .filter((e: any) => e && typeof e.claim === "string")
          .map((e: any) => ({
            claim: String(e.claim).slice(0, 600),
            kind: e.kind === "evidence" ? ("evidence" as const) : ("estimate" as const),
            source: e.source ? String(e.source).slice(0, 200) : undefined,
            accessedAt: new Date().toISOString().slice(0, 10),
          }))
      : [];
    const conf = String(d?.confidence ?? "").toLowerCase();
    return {
      key: c.key,
      score: scored ? Math.max(0, Math.min(100, Math.round(rawScore))) : null,
      notComputable: scored
        ? undefined
        : String(d?.notComputable ?? "No connected source could support a score for this dimension."),
      computed: false, // the innovative branch has no deterministic adapter layer yet
      confidence: conf === "high" || conf === "medium" || conf === "low" ? conf : undefined,
      summary: d?.summary ? String(d.summary).slice(0, 1200) : undefined,
      evidence,
      sourcesConsulted: c.consulted,
    };
  });
}

export function normaliseMarkets(raw: any, codes: string[]): MarketScore[] {
  const byCode = new Map<string, any>(
    Array.isArray(raw) ? raw.filter((m) => m && typeof m.country === "string").map((m) => [m.country.toUpperCase(), m]) : [],
  );
  return codes
    .map((code) => {
      const m = byCode.get(code);
      const n = Number(m?.score);
      const v = String(m?.verdict ?? "").toUpperCase();
      return {
        country: code,
        score: m && m.score !== null && Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null,
        verdict: v === "GO" || v === "NO_GO" || v === "CONDITIONAL" ? (v as MarketScore["verdict"]) : undefined,
        dimensions: [],
        summary: m?.summary ? String(m.summary).slice(0, 800) : undefined,
      };
    })
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    .map((m, i) => ({ ...m, rank: i + 1 }));
}

export async function runInnovativeDiagnosisAgent(intake: HubIntakeForm, write: AgentWriter): Promise<void> {
  const agentId = "innovativeDiagnosis" as const;

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured. Please add your API key in environment variables.");
    }
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const asset = primaryCompound(intake.assetName);
    const geographies = (intake.geographies?.length ? intake.geographies : ["US"])
      .map((g) => g.toUpperCase())
      .filter((g) => countryByCode(g))
      .slice(0, 12);
    const geoLabels = geographies.map((g) => `${g} (${countryByCode(g)!.name})`);
    const indication = intake.therapeuticArea || intake.context?.slice(0, 120) || "";

    write({
      agent: agentId,
      type: "status",
      status: "scraping",
      message: `Screening target validation, competitive stage landscape, IP and partnerability for ${asset}…`,
    });

    const [targets, trials, literature, patents, deals, molecules, approvals] = await Promise.allSettled([
      searchOpenTargets(indication || asset),
      searchClinicalTrials(indication ? `${asset} ${indication}` : asset, undefined, 30),
      searchLiterature(`${asset} ${indication} mechanism target validation`, 12),
      searchPatents(asset, 15),
      searchEdgarForDeals(
        indication ? `"license agreement" AND "${indication}"` : `"license agreement" AND "${asset}"`,
        ["8-K"],
        "2022-01-01",
        undefined,
        12,
      ),
      searchMolecules(asset, 6),
      searchDrugApplications(asset, 10),
    ]);

    const val = <T,>(r: PromiseSettledResult<T>, fallback: T): T => (r.status === "fulfilled" ? r.value : fallback);
    const targetProfile = val(targets, null as any);
    const trialHits = (val(trials, { results: [] } as any).results ?? []) as any[];
    const litHits = (val(literature, { results: [] } as any).results ?? []) as any[];
    const patentHits = (val(patents, { results: [] } as any).results ?? []) as any[];
    const dealHits = (val(deals, { results: [] } as any).results ?? []) as any[];
    const moleculeHits = (val(molecules, [] as any[]) ?? []) as any[];
    const approvalHits = (val(approvals, { results: [] } as any).results ?? []) as any[];

    // Mechanism lookup is only meaningful once a ChEMBL id resolved.
    const chemblId = moleculeHits[0]?.chemblId ?? moleculeHits[0]?.molecule_chembl_id;
    const mechanisms = chemblId ? await getMechanisms(chemblId).catch(() => []) : [];

    const sourceHits: SourceHit[] = (
      [
        ["Open Targets", targetProfile ? 1 : 0, "target–disease association profile"],
        ["ClinicalTrials.gov", trialHits.length, "registered studies"],
        ["PubMed / Europe PMC", litHits.length, "publications"],
        ["Patent search", patentHits.length, "patent families"],
        ["SEC EDGAR", dealHits.length, "comparable deal filings"],
        ["ChEMBL", moleculeHits.length + mechanisms.length, "molecule / mechanism records"],
        ["openFDA Drugs@FDA", approvalHits.length, "application records"],
      ] as const
    )
      .filter(([, count]) => count > 0)
      .map(([source, count, what]) => ({ source, title: `${count} ${what} for ${asset}` }));
    write({ agent: agentId, type: "sources", sources: sourceHits });

    write({
      agent: agentId,
      type: "status",
      status: "analyzing",
      message: "Scoring science, IP and partnerability against the innovative dimension set…",
    });

    const coverage = coverageFor(geographies);
    const evidenceBlock = [
      `## ASSET\n${intake.assetName}${indication ? `\nIndication / therapy area: ${indication}` : ""}${intake.context ? `\nClient context: ${intake.context}` : ""}`,
      `## MARKETS IN SCOPE\n${geoLabels.join(", ")}`,
      targetProfile ? `## OPEN TARGETS\n${JSON.stringify(targetProfile).slice(0, 6000)}` : "",
      trialHits.length ? `## CLINICAL TRIALS (${trialHits.length})\n${JSON.stringify(trialHits.slice(0, 25)).slice(0, 9000)}` : "",
      litHits.length ? `## LITERATURE (${litHits.length})\n${JSON.stringify(litHits.slice(0, 12)).slice(0, 6000)}` : "",
      patentHits.length ? `## PATENT HITS (${patentHits.length})\n${JSON.stringify(patentHits.slice(0, 15)).slice(0, 6000)}` : "",
      dealHits.length ? `## RECENT COMPARABLE DEAL FILINGS (${dealHits.length})\n${JSON.stringify(dealHits.slice(0, 12)).slice(0, 6000)}` : "",
      moleculeHits.length || mechanisms.length
        ? `## CHEMBL MOLECULE / MECHANISM\n${JSON.stringify({ molecules: moleculeHits.slice(0, 4), mechanisms: mechanisms.slice(0, 8) }).slice(0, 4000)}`
        : "",
      approvalHits.length ? `## FDA APPLICATIONS (${approvalHits.length})\n${JSON.stringify(approvalHits.slice(0, 8)).slice(0, 4000)}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const [assessRes, marketRes] = await Promise.all([
      anthropic.messages.create({
        model: MODEL,
        // Adaptive thinking shares max_tokens with the response, so the cap is
        // sized for a 10-dimension JSON payload plus reasoning headroom.
        max_tokens: 16000,
        thinking: { type: "adaptive" },
        system: withInnovativeGrounding(ASSESS_PROMPT),
        messages: [
          {
            role: "user",
            content: `${evidenceBlock}\n\n## DIMENSIONS TO SCORE (score every one, in this order)\n${renderDimensionBrief(geographies)}\n\nAssess ${intake.assetName} and return the JSON.`,
          },
        ],
      }),
      anthropic.messages.create({
        model: MODEL,
        max_tokens: 9000,
        thinking: { type: "adaptive" },
        system: withInnovativeGrounding(MARKET_PROMPT),
        messages: [
          {
            role: "user",
            content: `${evidenceBlock}\n\n## MARKETS TO SCORE (score every one, in this order)\n${geoLabels.join("\n")}\n\nScore market attractiveness for ${intake.assetName} and return the JSON.`,
          },
        ],
      }),
    ]);

    if (assessRes.stop_reason === "refusal") throw new Error("The assessment request was declined by safety classifiers.");
    const assess = extractJSON<any>(assessRes.content.find((b) => b.type === "text")?.text ?? "");
    const markets =
      marketRes.stop_reason === "refusal"
        ? null
        : extractJSON<any>(marketRes.content.find((b) => b.type === "text")?.text ?? "");

    const dimensions = normaliseDimensions(assess?.dimensions, coverage);
    const scored = dimensions.filter((d) => d.score != null);
    // Deterministic fallback: weight-average the scored dimensions rather than
    // trusting a headline number the model may not have reconciled.
    const weightById = new Map(INNOVATIVE_DIMENSIONS.map((d) => [d.key, d.weight]));
    const weightSum = scored.reduce((a, d) => a + (weightById.get(d.key) ?? 0), 0);
    const computedOverall = weightSum
      ? Math.round(scored.reduce((a, d) => a + d.score! * (weightById.get(d.key) ?? 0), 0) / weightSum)
      : null;
    const modelOverall = Number(assess?.worthinessScore);
    const verdictRaw = String(assess?.verdict ?? "").toUpperCase();
    const confRaw = String(assess?.verdictConfidence ?? "").toLowerCase();

    const diagnosis: Diagnosis = {
      branch: "innovative",
      verdict: verdictRaw === "GO" || verdictRaw === "NO_GO" ? (verdictRaw as any) : "CONDITIONAL",
      verdictConfidence: confRaw === "high" || confRaw === "medium" || confRaw === "low" ? (confRaw as any) : undefined,
      worthinessScore: computedOverall ?? (Number.isFinite(modelOverall) ? Math.round(modelOverall) : null),
      thesis: assess?.thesis ? String(assess.thesis).slice(0, 800) : undefined,
      dimensions,
      perMarket: normaliseMarkets(markets?.perMarket, geographies),
      topRisks: Array.isArray(assess?.topRisks) ? assess.topRisks.slice(0, 3).map(String) : [],
      swingFactors: Array.isArray(assess?.swingFactors) ? assess.swingFactors.slice(0, 4).map(String) : [],
      ipFlags: Array.isArray(assess?.ipFlags) ? assess.ipFlags.slice(0, 12) : [],
      completedAt: new Date().toISOString(),
      inflectionLever: assess?.inflectionLever ? String(assess.inflectionLever).slice(0, 600) : undefined,
      consideredAndRejected: Array.isArray(assess?.consideredAndRejected) ? assess.consideredAndRejected.slice(0, 5) : [],
      coverage: coverage.map((c) => ({ key: c.key, label: c.label, consulted: c.consulted, unwired: c.unwired })),
    } as Diagnosis;

    write({ agent: agentId, type: "result", data: { agentId, diagnosis } });
    write({
      agent: agentId,
      type: "status",
      status: "complete",
      message: `Verdict ${diagnosis.verdict} across ${diagnosis.perMarket.length} market${diagnosis.perMarket.length === 1 ? "" : "s"}`,
    });
  } catch (err) {
    const message = cleanError(err);
    write({ agent: agentId, type: "error", error: message });
    write({ agent: agentId, type: "status", status: "error", message });
  }
}
