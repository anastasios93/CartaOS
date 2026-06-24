/**
 * Semantic Scholar Academic Graph client.
 * API key is OPTIONAL: it works keyless, the key only raises rate limits.
 * Docs: https://api.semanticscholar.org/api-docs/graph
 */

import { fetchJSON, envKey } from "./http";

const BASE_URL = "https://api.semanticscholar.org/graph/v1/paper/search";

export interface SemanticScholarPaper {
  title: string;
  year: number | null;
  citations: number;
  venue: string;
  authors: string[];
  doi: string;
}

/**
 * Search Semantic Scholar for papers matching a free-text query.
 *
 * @param query  Free-text search term (mapped to `query`)
 * @param limit  Max results to return (default 10, mapped to `limit`)
 */
export async function searchSemanticScholar(
  query: string,
  limit = 10
): Promise<SemanticScholarPaper[]> {
  const url =
    `${BASE_URL}?query=${encodeURIComponent(query)}` +
    `&limit=${encodeURIComponent(String(limit))}` +
    `&fields=title,year,citationCount,venue,authors,externalIds`;

  const key = envKey("SEMANTIC_SCHOLAR_API_KEY");
  const headers: Record<string, string> = key ? { "x-api-key": key } : {};

  const data = await fetchJSON<{ data?: any[] }>(url, { headers });
  const papers: any[] = data.data ?? [];

  return papers.map((p) => ({
    title: p.title ?? "",
    year: typeof p.year === "number" ? p.year : null,
    citations: p.citationCount ?? 0,
    venue: p.venue ?? "",
    authors: (p.authors ?? []).map((a: any) => a.name).filter(Boolean),
    doi: p.externalIds?.DOI ?? "",
  }));
}
