/**
 * Crossref works search client.
 * No API key required.
 * Docs: https://api.crossref.org/swagger-ui/index.html
 */

import { fetchJSON } from "./http";

const BASE_URL = "https://api.crossref.org/works";

export interface CrossrefWork {
  title: string;
  doi: string;
  type: string;
  year: number | null;
  venue: string;
  authors: string[];
}

/**
 * Search Crossref for scholarly works.
 *
 * @param query Free-text query.
 * @param limit Max results to return (default 10).
 */
export async function searchCrossref(query: string, limit = 10): Promise<CrossrefWork[]> {
  const url =
    `${BASE_URL}?query=${encodeURIComponent(query)}` +
    `&rows=${encodeURIComponent(String(limit))}` +
    `&select=${encodeURIComponent("title,DOI,type,published,container-title,author")}`;

  const data = await fetchJSON<{ message?: { items?: any[] } }>(url);

  const items: any[] = data.message?.items ?? [];

  return items.map((item) => {
    const dateParts: any[] = item?.published?.["date-parts"]?.[0] ?? [];
    const year = typeof dateParts[0] === "number" ? dateParts[0] : null;
    const authors: string[] = (item?.author ?? [])
      .slice(0, 5)
      .map((a: any) => `${a?.given ?? ""} ${a?.family ?? ""}`.trim())
      .filter(Boolean);

    return {
      title: item?.title?.[0] ?? "",
      doi: item?.DOI ?? "",
      type: item?.type ?? "",
      year,
      venue: item?.["container-title"]?.[0] ?? "",
      authors,
    };
  });
}
