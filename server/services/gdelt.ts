/**
 * GDELT Doc 2.0 article search client.
 * No API key required.
 * Docs: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
 */

import { fetchJSON } from "./http";

const BASE_URL = "https://api.gdeltproject.org/api/v2/doc/doc";

export interface GdeltArticle {
  title: string;
  url: string;
  domain: string;
  seenDate: string;
  sourceCountry: string;
}

/**
 * Search GDELT for recent news articles, sorted by date descending.
 * GDELT can return empty / non-JSON bodies on no results, so failures
 * are swallowed and an empty list is returned.
 *
 * @param query Free-text query.
 * @param limit Max records to return (default 15).
 */
export async function searchGdelt(query: string, limit = 15): Promise<GdeltArticle[]> {
  const url =
    `${BASE_URL}?query=${encodeURIComponent(query)}` +
    `&mode=ArtList&format=json` +
    `&maxrecords=${encodeURIComponent(String(limit))}` +
    `&sort=DateDesc`;

  try {
    const data = await fetchJSON<{ articles?: any[] }>(url);
    const articles: any[] = data.articles ?? [];

    return articles.map((a) => ({
      title: a?.title ?? "",
      url: a?.url ?? "",
      domain: a?.domain ?? "",
      seenDate: a?.seendate ?? "",
      sourceCountry: a?.sourcecountry ?? "",
    }));
  } catch {
    return [];
  }
}
