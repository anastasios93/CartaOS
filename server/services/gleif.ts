/**
 * GLEIF LEI (Legal Entity Identifier) client.
 * No API key required.
 * Docs: https://www.gleif.org/en/lei-data/gleif-api
 */

import { fetchJSON } from "./http";

const BASE_URL = "https://api.gleif.org/api/v1/lei-records";

export interface GleifEntity {
  lei: string;
  legalName: string;
  country: string;
  status: string;
}

/**
 * Search GLEIF for legal entities by legal name.
 *
 * @param name  Entity legal name to match.
 * @param limit Max records to return (default 10).
 */
export async function searchGleif(name: string, limit = 10): Promise<GleifEntity[]> {
  const url =
    `${BASE_URL}?filter[entity.legalName]=${encodeURIComponent(name)}` +
    `&page[size]=${encodeURIComponent(String(limit))}`;

  const data = await fetchJSON<{ data?: any[] }>(url, {
    headers: { Accept: "application/vnd.api+json" },
  });

  const records: any[] = data.data ?? [];

  return records.map((rec) => {
    const attrs = rec?.attributes ?? {};
    const entity = attrs.entity ?? {};
    return {
      lei: rec?.id ?? "",
      legalName: entity.legalName?.name ?? "",
      country: entity.legalAddress?.country ?? "",
      status: attrs.registration?.status ?? "",
    };
  });
}
