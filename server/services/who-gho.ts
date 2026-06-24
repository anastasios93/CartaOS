/**
 * WHO Global Health Observatory (GHO) OData API client.
 * Catalogue of WHO health indicators — keyless.
 * Docs: https://www.who.int/data/gho/info/gho-odata-api
 * Auth: none.
 */

import { fetchJSON } from "./http";

const BASE_URL = "https://ghoapi.azureedge.net/api/Indicator";

export interface GhoIndicator {
  code: string;
  name: string;
}

interface GhoRaw {
  value?: {
    IndicatorCode?: string;
    IndicatorName?: string;
    Language?: string;
  }[];
}

/**
 * Search WHO GHO indicators whose name contains the given keyword.
 *
 * @param keyword  Free-text fragment to match against IndicatorName.
 * @param limit    Max results to return (default 15).
 */
export async function searchGhoIndicators(keyword: string, limit = 15): Promise<GhoIndicator[]> {
  // Build the OData $filter manually: encode only the keyword, then inject it
  // into the contains(IndicatorName,'...') expression and encode the quotes.
  const encoded = encodeURIComponent(keyword);
  const filter = `contains(IndicatorName,%27${encoded}%27)`;
  const url = `${BASE_URL}?$filter=${filter}`;

  const data = await fetchJSON<GhoRaw>(url);
  const value = data.value ?? [];

  // Prefer English entries if any are flagged, but do not require Language.
  const hasEnglish = value.some((v) => v.Language === "EN");
  const filtered = hasEnglish ? value.filter((v) => v.Language === "EN") : value;

  return filtered.slice(0, limit).map((v) => ({
    code: v.IndicatorCode ?? "",
    name: v.IndicatorName ?? "",
  }));
}
