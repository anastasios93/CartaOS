/**
 * OpenAlex client (keyless).
 * Open scholarly works index; `mailto` recommended for the polite pool.
 * Docs: https://docs.openalex.org/api-entities/works
 */

import { fetchJSON } from "./http";

const BASE_URL = "https://api.openalex.org/works";

export interface OpenAlexWork {
  title: string;
  year: number | null;
  citations: number;
  doi: string;
  venue: string;
  authors: string[];
}

/**
 * Search OpenAlex works matching a free-text query.
 *
 * @param query  Free-text search term (mapped to `search`)
 * @param limit  Max results to return (default 10, mapped to `per_page`)
 */
export async function searchOpenAlex(query: string, limit = 10): Promise<OpenAlexWork[]> {
  const url =
    `${BASE_URL}?search=${encodeURIComponent(query)}` +
    `&per_page=${encodeURIComponent(String(limit))}` +
    `&mailto=cartaos@example.com`;

  const data = await fetchJSON<{ results?: any[] }>(url);
  const results: any[] = data.results ?? [];

  return results.map((w) => ({
    title: w.title ?? "",
    year: typeof w.publication_year === "number" ? w.publication_year : null,
    citations: w.cited_by_count ?? 0,
    doi: w.doi ?? "",
    venue: w.primary_location?.source?.display_name ?? "",
    authors: (w.authorships ?? [])
      .map((a: any) => a.author?.display_name)
      .filter(Boolean)
      .slice(0, 5),
  }));
}
