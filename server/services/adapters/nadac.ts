/**
 * CMS NADAC adapter — National Average Drug Acquisition Cost.
 *
 * NADAC is the public acquisition-cost benchmark: a weekly per-unit price for
 * ~1.5M NDCs. It is the only open, longitudinal US price series, which makes it
 * the input that lets the reimbursement/pricing lever be COMPUTED (and price
 * erosion actually FITTED and backtested) rather than reasoned about.
 *
 * Dataset ids rotate yearly, so they are discovered from the CMS metastore at
 * runtime and cached rather than hard-coded.
 *
 * Verified response schema (data.medicaid.gov datastore query):
 *   ndc_description, ndc, nadac_per_unit, effective_date, pricing_unit,
 *   pharmacy_type_indicator, otc, explanation_code,
 *   classification_for_rate_setting, corresponding_generic_drug_nadac_per_unit,
 *   corresponding_generic_drug_effective_date, as_of_date
 *
 * Attribution: data courtesy of the Centers for Medicare & Medicaid Services.
 */

import { fetchJSON } from "@/server/services/http";
import type { Provenance } from "./rxnorm";

const METASTORE = "https://data.medicaid.gov/api/1/metastore/schemas/dataset/items?show-reference-ids";
const QUERY = "https://data.medicaid.gov/api/1/datastore/query";

export const CMS_ATTRIBUTION = "Data courtesy of the Centers for Medicare & Medicaid Services (CMS).";

export interface NadacPoint {
  /** ISO date (YYYY-MM-DD) the price took effect. */
  date: string;
  pricePerUnit: number;
}

export interface NadacSeries {
  ndc: string;
  description: string;
  pricingUnit: string;
  /** "G" generic, "B" brand, per CMS classification_for_rate_setting. */
  classification: string;
  points: NadacPoint[];
  provenance: Provenance;
}

// ─── Dataset discovery ──────────────────────────────────────────────────────

let datasetCache: { at: number; ids: { year: number; distId: string }[] } | null = null;
const DATASET_TTL_MS = 24 * 60 * 60 * 1000;

/** Discover NADAC distribution ids, newest year first. */
export async function discoverNadacDatasets(): Promise<{ year: number; distId: string }[]> {
  if (datasetCache && Date.now() - datasetCache.at < DATASET_TTL_MS) return datasetCache.ids;

  const items = await fetchJSON<any[]>(METASTORE, { timeoutMs: 30000 });
  const ids: { year: number; distId: string }[] = [];
  for (const it of items ?? []) {
    const m = /^NADAC \(National Average Drug Acquisition Cost\) (\d{4})$/.exec(it?.title ?? "");
    const distId = it?.distribution?.[0]?.identifier;
    if (m && distId) ids.push({ year: Number(m[1]), distId });
  }
  ids.sort((a, b) => b.year - a.year);
  datasetCache = { at: Date.now(), ids };
  return ids;
}

// ─── Series retrieval ───────────────────────────────────────────────────────

const seriesCache = new Map<string, { at: number; value: NadacSeries | null }>();
const SERIES_TTL_MS = 12 * 60 * 60 * 1000;

async function fetchYear(distId: string, ndc: string): Promise<any[]> {
  const url =
    `${QUERY}/${distId}?limit=500` +
    `&conditions[0][property]=ndc&conditions[0][operator]==&conditions[0][value]=${encodeURIComponent(ndc)}`;
  const res = await fetchJSON<any>(url, { timeoutMs: 30000 });
  return res?.results ?? [];
}

/**
 * Weekly price series for one NDC, spanning the most recent `years` datasets.
 * Rows are deduplicated by effective_date (CMS repeats a row per pharmacy type)
 * and sorted oldest → newest.
 */
export async function getNadacSeries(ndc: string, years = 2): Promise<NadacSeries | null> {
  const key = `${ndc}:${years}`;
  const hit = seriesCache.get(key);
  if (hit && Date.now() - hit.at < SERIES_TTL_MS) return hit.value;

  let value: NadacSeries | null = null;
  try {
    const datasets = (await discoverNadacDatasets()).slice(0, Math.max(1, years));
    const chunks = await Promise.all(
      datasets.map(d => fetchYear(d.distId, ndc).catch(() => [] as any[])),
    );
    const rows = chunks.flat();

    if (rows.length) {
      // Dedup by effective_date; CMS emits one row per pharmacy_type_indicator.
      const byDate = new Map<string, number>();
      for (const r of rows) {
        const price = Number(r?.nadac_per_unit);
        const date = String(r?.effective_date ?? "").slice(0, 10);
        if (!date || !Number.isFinite(price) || price <= 0) continue;
        if (!byDate.has(date)) byDate.set(date, price);
      }
      const points = [...byDate.entries()]
        .map(([date, pricePerUnit]) => ({ date, pricePerUnit }))
        .sort((a, b) => a.date.localeCompare(b.date));

      if (points.length) {
        const first = rows[0];
        value = {
          ndc,
          description: String(first?.ndc_description ?? ""),
          pricingUnit: String(first?.pricing_unit ?? ""),
          classification: String(first?.classification_for_rate_setting ?? ""),
          points,
          provenance: {
            source: "CMS NADAC",
            retrievedAt: new Date().toISOString(),
            verifyUrl: "https://data.medicaid.gov/dataset/dfa2ab14-06c2-457a-9e36-5cb2b7935d46",
          },
        };
      }
    }
  } catch {
    value = null; // Degrade gracefully — the lever reports a data gap instead.
  }

  seriesCache.set(key, { at: Date.now(), value });
  return value;
}

/**
 * Series for several NDCs, bounded and run with limited concurrency so we do not
 * hammer the CMS API. Returns only NDCs that actually have price history.
 */
export async function getNadacSeriesBatch(ndcs: string[], cap = 8): Promise<NadacSeries[]> {
  const target = ndcs.slice(0, cap);
  const out: NadacSeries[] = [];
  // Sequential-in-pairs keeps us well inside CMS rate limits.
  for (let i = 0; i < target.length; i += 2) {
    const batch = target.slice(i, i + 2);
    const res = await Promise.all(batch.map(n => getNadacSeries(n).catch(() => null)));
    for (const s of res) if (s && s.points.length) out.push(s);
  }
  return out;
}
