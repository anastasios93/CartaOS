/**
 * USPTO PatentSearch / PatentsView client.
 * The modern PatentsView Search API (search.patentsview.org) requires an API key.
 * Env: PATENTSVIEW_API_KEY (required). Without it this source is a graceful no-op.
 * Docs: https://search.patentsview.org/docs/
 */

import { fetchJSON, envKey } from "./http";

const SEARCH_URL = "https://search.patentsview.org/api/v1/patent/";

export interface UsptoPatent {
  patentId: string;
  title: string;
  date: string;
  assignees: string[];
}

/**
 * Search PatentsView for patents whose title matches the query.
 *
 * @param query Free-text title search term.
 * @param limit Max results to return (default 10).
 */
export async function searchUsptoPatents(query: string, limit = 10): Promise<UsptoPatent[]> {
  const key = envKey("PATENTSVIEW_API_KEY");
  if (!key) return [];

  const body = JSON.stringify({
    q: { _text_any: { patent_title: query } },
    f: ["patent_id", "patent_title", "patent_date", "assignees.assignee_organization"],
    o: { size: limit },
  });

  try {
    const data = await fetchJSON<{ patents?: any[] }>(SEARCH_URL, {
      method: "POST",
      headers: { "X-Api-Key": key, "Content-Type": "application/json" },
      body,
    });

    const patents: any[] = data?.patents ?? [];
    return patents.map((p: any): UsptoPatent => ({
      patentId: p?.patent_id ?? "",
      title: p?.patent_title ?? "",
      date: p?.patent_date ?? "",
      assignees: (p?.assignees ?? [])
        .map((a: any) => a?.assignee_organization)
        .filter((o: any): o is string => typeof o === "string" && o.length > 0),
    }));
  } catch {
    return [];
  }
}
