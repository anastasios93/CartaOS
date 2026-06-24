/**
 * Australia PBS (Pharmaceutical Benefits Scheme) client.
 * KEY-REQUIRED. Env: PBS_SUBSCRIPTION_KEY (returns [] until configured — graceful no-op).
 * Env-gated scaffold: confirm the exact endpoint/response contract against the PBS
 * Data API developer docs before production use.
 * Docs: https://data-api.health.gov.au/
 */

import { fetchJSON, envKey } from "./http";

const BASE_URL = "https://data-api.health.gov.au/pbs/api/v3/items";

export interface PbsItem {
  pbsCode: string;
  drugName: string;
  brandName: string;
  manufacturer: string;
}

/** Search the PBS item list for a drug name. */
export async function searchPbs(name: string, limit = 10): Promise<PbsItem[]> {
  const key = envKey("PBS_SUBSCRIPTION_KEY");
  if (!key) return [];

  const url = `${BASE_URL}?drug_name=${encodeURIComponent(name)}&limit=${encodeURIComponent(
    String(limit)
  )}`;

  try {
    const body = await fetchJSON<{ data?: any[] }>(url, {
      headers: { "subscription-key": key },
    });

    const rows: any[] = Array.isArray(body?.data) ? body.data : [];
    return rows.slice(0, limit).map((r: any) => ({
      pbsCode: r?.pbs_code ?? "",
      drugName: r?.drug_name ?? "",
      brandName: r?.brand_name ?? "",
      manufacturer: r?.manufacturer_code ?? "",
    }));
  } catch {
    return [];
  }
}
