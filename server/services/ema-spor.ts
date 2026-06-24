/**
 * EMA SPOR (Substance, Product, Organisation, Referential) master-data client.
 * KEY-REQUIRED. Env: EMA_SPOR_API_KEY (returns [] until configured — graceful no-op).
 * SPOR requires registration; this is an env-gated scaffold: confirm the exact
 * endpoint/response contract against the EMA SPOR developer docs before production use.
 * Docs: https://spor.ema.europa.eu/
 */

import { fetchJSON, envKey } from "./http";

const BASE_URL = "https://spor.ema.europa.eu/smsspor-api/v2/substances";

export interface SporRecord {
  id: string;
  name: string;
  type: string;
}

/** Search SPOR substance master data by name. */
export async function searchEmaSpor(name: string, limit = 10): Promise<SporRecord[]> {
  const key = envKey("EMA_SPOR_API_KEY");
  if (!key) return [];

  const url = `${BASE_URL}?name=${encodeURIComponent(name)}`;

  try {
    const body = await fetchJSON<any>(url, {
      headers: { Authorization: "Bearer " + key },
    });

    // Contract uncertain — try common shapes: body.data / body.substances / array body.
    const rows: any[] = Array.isArray(body)
      ? body
      : Array.isArray(body?.data)
      ? body.data
      : Array.isArray(body?.substances)
      ? body.substances
      : [];

    return rows.slice(0, limit).map((r: any) => ({
      id: r?.id ?? r?.substanceId ?? "",
      name: r?.name ?? r?.substanceName ?? "",
      type: r?.type ?? r?.substanceType ?? "",
    }));
  } catch {
    return [];
  }
}
