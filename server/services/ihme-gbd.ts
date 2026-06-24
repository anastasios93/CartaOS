/**
 * IHME Global Burden of Disease (GBD) Results client.
 * KEY-REQUIRED. Env: IHME_GBD_API_KEY (returns [] until configured — graceful no-op).
 * The GBD Results API requires auth and a complex query; this is an env-gated scaffold:
 * confirm the exact endpoint/response contract against the IHME developer docs before
 * production use.
 * Docs: https://www.healthdata.org/research-analysis/about-gbd/gbd-api
 */

import { fetchJSON, envKey } from "./http";

const BASE_URL = "https://api.healthdata.org/sdg/v1/GetResultsByCause";

export interface GbdEstimate {
  cause: string;
  measure: string;
  metric: string;
  year: number | null;
  value: number | null;
}

/** Fetch GBD estimates for a cause keyword. */
export async function searchGbd(causeKeyword: string, limit = 10): Promise<GbdEstimate[]> {
  const key = envKey("IHME_GBD_API_KEY");
  if (!key) return [];

  const url = `${BASE_URL}?cause=${encodeURIComponent(causeKeyword)}&token=${encodeURIComponent(
    key
  )}`;

  try {
    const body = await fetchJSON<any>(url);

    // Contract uncertain — try common shapes: body.results / body.data / array body.
    const rows: any[] = Array.isArray(body)
      ? body
      : Array.isArray(body?.results)
      ? body.results
      : Array.isArray(body?.data)
      ? body.data
      : [];

    return rows.slice(0, limit).map((r: any) => ({
      cause: r?.cause ?? r?.cause_name ?? "",
      measure: r?.measure ?? r?.measure_name ?? "",
      metric: r?.metric ?? r?.metric_name ?? "",
      year: typeof r?.year === "number" ? r.year : null,
      value: typeof r?.value === "number" ? r.value : null,
    }));
  } catch {
    return [];
  }
}
