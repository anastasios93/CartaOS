/**
 * CMS Medicare Part D Spending by Drug client.
 * Rare open US drug-pricing/spend signal — keyless.
 * Docs: https://data.cms.gov/provider-summary-by-type-of-service/medicare-part-d-prescribers/medicare-part-d-spending-by-drug
 * Auth: none.
 *
 * NOTE: the dataset id rotates yearly, so the default below may be stale.
 * Override it via the CMS_PARTD_DATASET_ID environment variable.
 */

import { fetchJSON, envKey } from "./http";

const dataset = envKey("CMS_PARTD_DATASET_ID") || "7e0b4365-fd63-4a29-8f5e-e0ac9f66a81b";

export interface CmsDrugSpending {
  brandName: string;
  genericName: string;
  manufacturer: string;
  totalSpending: string;
  year: string;
}

type CmsRow = Record<string, unknown>;

/**
 * Search CMS Part D spending rows by brand name, returning the most recent
 * year's total spending for each matching drug.
 *
 * @param name   Brand name to filter on.
 * @param limit  Max rows to return (default 10).
 */
export async function searchCmsSpending(name: string, limit = 10): Promise<CmsDrugSpending[]> {
  const url =
    `https://data.cms.gov/data-api/v1/dataset/${dataset}/data` +
    `?filter[Brnd_Name]=${encodeURIComponent(name)}&size=${limit}`;

  const data = await fetchJSON<CmsRow[]>(url);
  const rows = Array.isArray(data) ? data : [];

  return rows.map((row) => {
    let totalSpending = "";
    let year = "";

    // Find the highest-year Tot_Spndng_<year> field present on this row.
    for (const key of Object.keys(row)) {
      const m = /^Tot_Spndng_(\d{4})$/.exec(key);
      if (m && m[1] > year) {
        year = m[1];
        const v = row[key];
        totalSpending = v == null ? "" : String(v);
      }
    }

    return {
      brandName: String(row.Brnd_Name ?? ""),
      genericName: String(row.Gnrc_Name ?? ""),
      manufacturer: String(row.Mftr_Name ?? ""),
      totalSpending,
      year,
    };
  });
}
