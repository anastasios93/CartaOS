/**
 * Criteria extraction over extracted documents (§3.2): segments and native
 * PDF/image blocks go to Claude in one call; out comes a reviewable
 * Criterion[] with mandatory provenance (file + location + snippet).
 * Nothing extracted is used silently — the UI renders these as editable
 * chips before any run starts.
 *
 * Falls back to the legacy text-heuristic extractor when the model is
 * unavailable, so the feature degrades rather than fails.
 */

import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "node:crypto";
import type { ExtractedDoc } from "./documents";
import { extractCriteria } from "./criteria";
import type { Criterion, CriterionCategory } from "@/types/run";
import { CriterionCategorySchema } from "@/types/run";
import type { SearchCriteria } from "@/types/hub";
import { extractJSON } from "@/server/agents/utils";
import { normalizeLegacyGeography } from "@/config/geographies";

const EXTRACT_SYSTEM = `You extract structured search criteria from client documents for CartaOS, a pharma portfolio-intelligence platform. The documents may name compounds, targets, indications, molecule classes, dosage forms, development stages, geographies, competitors, hard constraints, and priority weightings.

Return ONLY valid JSON: an array of criteria, each shaped as
{
  "category": "compound | target | indication | molecule_class | dosage_form | stage | geography | competitor | constraint | lever_weight | other",
  "value": "the criterion as a short clean string (for lever_weight: 'LeverName: NN')",
  "weight": 0-100 (how strongly the document emphasises it; 50 if unstated),
  "source": { "fileName": "which file it came from", "location": "where in the file — page N / sheet name / slide N / the segment label given", "snippet": "the short verbatim passage (<=200 chars) it was extracted from" }
}

Rules:
- Extract only what is genuinely present. NEVER invent compounds, geographies, weights or constraints the documents do not state.
- Every criterion MUST carry source with the fileName and the most precise location you can give (for PDFs use "page N"; for images describe the region).
- Keep values clean: molecule names without dosage tokens, country/region names as written.
- Do not include commentary outside the JSON array.`;

export interface RunCriteriaResult {
  criteria: Criterion[];
  method: "model" | "heuristic";
}

function sanitize(raw: unknown, fileNames: Set<string>): Criterion[] {
  if (!Array.isArray(raw)) return [];
  const out: Criterion[] = [];
  for (const item of raw.slice(0, 80)) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const parsedCategory = CriterionCategorySchema.safeParse(r.category);
    const category: CriterionCategory = parsedCategory.success ? parsedCategory.data : "other";
    const value = String(r.value ?? "").trim().slice(0, 300);
    if (!value) continue;
    const weightNum = Number(r.weight);
    const weight = Number.isFinite(weightNum) ? Math.max(0, Math.min(100, Math.round(weightNum))) : 50;

    const src = (r.source ?? {}) as Record<string, unknown>;
    let fileName = String(src.fileName ?? "").trim();
    // Provenance must reference a real uploaded file; if the model hallucinated
    // a name, fall back to the sole file when unambiguous, else drop location.
    if (!fileNames.has(fileName)) {
      fileName = fileNames.size === 1 ? [...fileNames][0] : "";
    }
    out.push({
      id: randomUUID(),
      category,
      value,
      weight,
      provenance: fileName
        ? {
            fileName,
            location: String(src.location ?? "").trim().slice(0, 120) || undefined,
            snippet: String(src.snippet ?? "").trim().slice(0, 240) || undefined,
          }
        : undefined,
    });
  }
  return out;
}

function heuristicFromDocs(docs: ExtractedDoc[]): Promise<Criterion[]> {
  const text = docs
    .flatMap((d) => d.segments ?? [])
    .map((s) => s.text)
    .join("\n\n");
  return extractCriteria(text).then(({ criteria }) => searchCriteriaToCriteria(criteria, docs[0]?.fileName));
}

/** Bridge legacy SearchCriteria → Criterion[] (fileName-only provenance). */
export function searchCriteriaToCriteria(sc: SearchCriteria, fileName?: string): Criterion[] {
  const provenance = fileName ? { fileName } : undefined;
  const mk = (category: CriterionCategory, value: string, weight = 50): Criterion => ({
    id: randomUUID(),
    category,
    value,
    weight,
    provenance,
  });
  return [
    ...(sc.assets ?? []).map((a) => mk("compound", a)),
    ...(sc.geographies ?? []).map((g) => mk("geography", g)),
    ...(sc.therapeuticArea ? [mk("indication", sc.therapeuticArea)] : []),
    ...(sc.leverWeights ?? []).map((w) => mk("lever_weight", `${w.lever}: ${w.weight}`, w.weight)),
    ...(sc.constraints ?? []).map((c) => mk("constraint", c)),
  ];
}

/** The orchestrator's Zod schema accepts exactly these lever names — anything else is dropped, not guessed. */
const VALID_LEVERS = new Set<string>([
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
]);

/** Bridge Criterion[] → legacy SearchCriteria so the current agents consume it unchanged. */
export function criteriaToSearchCriteria(criteria: Criterion[]): SearchCriteria {
  const byCat = (c: CriterionCategory) => criteria.filter((x) => x.category === c);
  const leverWeights = byCat("lever_weight")
    .map((c) => {
      const m = c.value.match(/^(.*?):\s*(\d{1,3})$/);
      return m ? { lever: m[1].trim(), weight: Math.min(100, Number(m[2])) } : { lever: c.value.trim(), weight: c.weight };
    })
    .filter((w) => VALID_LEVERS.has(w.lever));
  return {
    assets: byCat("compound").map((c) => c.value),
    geographies: [
      ...new Set(byCat("geography").flatMap((c) => (normalizeLegacyGeography(c.value).length ? normalizeLegacyGeography(c.value) : [c.value]))),
    ],
    therapeuticArea: byCat("indication")[0]?.value,
    leverWeights: leverWeights as SearchCriteria["leverWeights"],
    constraints: byCat("constraint").map((c) => c.value),
    thresholds: [],
  };
}

export async function extractRunCriteria(docs: ExtractedDoc[]): Promise<RunCriteriaResult> {
  if (!docs.length) return { criteria: [], method: "heuristic" };
  const fileNames = new Set(docs.map((d) => d.fileName));
  const hasBinary = docs.some((d) => d.binary);

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const content: Anthropic.ContentBlockParam[] = [];
      for (const doc of docs) {
        if (doc.binary) {
          content.push({ type: "text", text: `File: ${doc.fileName} (${doc.binary.kind})` });
          if (doc.binary.kind === "pdf") {
            content.push({
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: doc.binary.base64 },
            });
          } else {
            content.push({
              type: "image",
              source: {
                type: "base64",
                media_type: doc.binary.mediaType as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
                data: doc.binary.base64,
              },
            });
          }
        } else {
          for (const seg of doc.segments ?? []) {
            content.push({ type: "text", text: `File: ${doc.fileName} — ${seg.location}\n${seg.text}` });
          }
        }
      }
      content.push({ type: "text", text: "Extract the search criteria from the material above as the JSON array." });

      const res = await anthropic.messages.create({
        model: "claude-opus-5",
        max_tokens: 4000,
        system: EXTRACT_SYSTEM,
        messages: [{ role: "user", content }],
      });
      if (res.stop_reason === "refusal") {
        throw new Error("model declined the extraction request");
      }
      const text = res.content.find((b) => b.type === "text")?.text ?? "";
      const criteria = sanitize(extractJSON(text), fileNames);
      if (criteria.length) return { criteria, method: "model" };
      // Model returned nothing usable from text docs → heuristic still applies.
      if (!hasBinary) return { criteria: await heuristicFromDocs(docs), method: "heuristic" };
      return { criteria: [], method: "model" };
    } catch {
      // fall through
    }
  }
  // Heuristic can only read text segments; binary-only uploads need the model.
  return { criteria: await heuristicFromDocs(docs), method: "heuristic" };
}
