/**
 * The Lens patent search client.
 * Env: LENS_API_TOKEN (required). Without it this source is a graceful no-op.
 * Docs: https://docs.api.lens.org/
 */

import { fetchJSON, envKey } from "./http";

const SEARCH_URL = "https://api.lens.org/patent/search";

export interface LensPatent {
  lensId: string;
  title: string;
  jurisdiction: string;
  date: string;
}

/** Pull a title string out of the (variable) Lens biblio.invention_title shape. */
function extractTitle(biblio: any): string {
  const title = biblio?.invention_title?.title;
  if (typeof title === "string") return title;
  if (Array.isArray(title)) {
    const first = title[0];
    if (typeof first === "string") return first;
    return first?.text ?? "";
  }
  return title?.text ?? "";
}

/**
 * Search The Lens for patents whose title matches the query.
 *
 * @param query Free-text title search term.
 * @param limit Max results to return (default 10).
 */
export async function searchLens(query: string, limit = 10): Promise<LensPatent[]> {
  const token = envKey("LENS_API_TOKEN");
  if (!token) return [];

  const body = JSON.stringify({
    query: { match: { title: query } },
    size: limit,
  });

  try {
    const data = await fetchJSON<{ data?: any[] }>(SEARCH_URL, {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body,
    });

    const rows: any[] = data?.data ?? [];
    return rows.map((r: any): LensPatent => {
      const biblio = r?.biblio ?? {};
      return {
        lensId: r?.lens_id ?? "",
        title: extractTitle(biblio),
        jurisdiction: r?.jurisdiction ?? "",
        date: biblio?.publication_reference?.date ?? "",
      };
    });
  } catch {
    return [];
  }
}
