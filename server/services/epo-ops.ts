/**
 * EPO Open Patent Services (OPS) client.
 * OAuth2 client-credentials flow. Env: EPO_OPS_KEY + EPO_OPS_SECRET (both required).
 * Without either, this source is a graceful no-op.
 *
 * Note: OPS enforces fair-use quotas and returns XML by default. We request JSON
 * via the Accept header (fetchJSON sets it) and parse the deeply nested response
 * very defensively — the shape varies, so anything uncertain falls back to [].
 * Docs: https://www.epo.org/en/searching-for-patents/data/web-services/ops
 */

import { fetchJSON, envKey } from "./http";

const AUTH_URL = "https://ops.epo.org/3.2/auth/accesstoken";
const SEARCH_URL = "https://ops.epo.org/3.2/rest-services/published-data/search";

export interface EpoPatent {
  country: string;
  docNumber: string;
  kind: string;
}

/** Normalise OPS quirk: a node may be a single object or an array of objects. */
function asArray(v: any): any[] {
  if (Array.isArray(v)) return v;
  if (v === undefined || v === null) return [];
  return [v];
}

/**
 * Search EPO OPS published-data for patents matching the query.
 *
 * @param query Free-text search term.
 * @param limit Max results to return (default 10).
 */
export async function searchEpoOps(query: string, limit = 10): Promise<EpoPatent[]> {
  const k = envKey("EPO_OPS_KEY");
  const s = envKey("EPO_OPS_SECRET");
  if (!k || !s) return [];

  try {
    const auth = await fetchJSON<{ access_token?: string }>(AUTH_URL, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${k}:${s}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const token = auth?.access_token;
    if (!token) return [];

    const url = `${SEARCH_URL}?q=${encodeURIComponent(query)}&Range=1-${limit}`;
    const data = await fetchJSON<any>(url, {
      headers: { Authorization: "Bearer " + token },
    });

    const refs =
      data?.["ops:world-patent-data"]?.["ops:biblio-search"]?.["ops:search-result"]?.[
        "ops:publication-reference"
      ];

    const results: EpoPatent[] = [];
    for (const ref of asArray(refs)) {
      // document-id may be a single object or an array of formats.
      for (const docId of asArray(ref?.["document-id"])) {
        const country = docId?.country?.$ ?? docId?.country ?? "";
        const docNumber = docId?.["doc-number"]?.$ ?? docId?.["doc-number"] ?? "";
        const kind = docId?.kind?.$ ?? docId?.kind ?? "";
        if (country || docNumber) {
          results.push({
            country: String(country),
            docNumber: String(docNumber),
            kind: String(kind),
          });
          break; // one entry per publication-reference
        }
      }
    }
    return results;
  } catch {
    return [];
  }
}
