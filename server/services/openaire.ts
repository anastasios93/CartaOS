/**
 * OpenAIRE research projects search client.
 * No API key required.
 * Docs: https://graph.openaire.eu/docs/data-model/
 */

import { fetchJSON } from "./http";

const BASE_URL = "https://api.openaire.eu/search/projects";

export interface OpenaireProject {
  title: string;
  acronym: string;
  code: string;
  funder: string;
  startDate: string;
  endDate: string;
}

/** Coerce OpenAIRE's `{ $: "value" }` / string / array-wrapped fields to a string. */
function txt(v: any): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return txt(v[0]);
  if (typeof v === "object") return txt(v.$ ?? v.content ?? "");
  return String(v);
}

/**
 * Search OpenAIRE for funded research projects. The response is deeply nested
 * and inconsistent, so all parsing is defensive and returns [] on shape drift.
 *
 * @param query Free-text keywords.
 * @param limit Max results to return (default 10).
 */
export async function searchOpenaire(query: string, limit = 10): Promise<OpenaireProject[]> {
  const url =
    `${BASE_URL}?keywords=${encodeURIComponent(query)}` +
    `&format=json&size=${encodeURIComponent(String(limit))}`;

  try {
    const data = await fetchJSON<any>(url);

    let resultsRaw: any = data?.response?.results?.result ?? [];
    if (!Array.isArray(resultsRaw)) resultsRaw = resultsRaw ? [resultsRaw] : [];

    const out: OpenaireProject[] = [];
    for (const r of resultsRaw) {
      try {
        const project =
          r?.metadata?.["oaf:entity"]?.["oaf:project"] ?? {};
        out.push({
          title: txt(project.title),
          acronym: txt(project.acronym),
          code: txt(project.code),
          funder: txt(project.fundingtree?.funder?.name ?? project.funder?.name),
          startDate: txt(project.startdate),
          endDate: txt(project.enddate),
        });
      } catch {
        // skip malformed individual record
      }
    }
    return out;
  } catch {
    return [];
  }
}
