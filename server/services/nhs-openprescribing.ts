/**
 * NHS OpenPrescribing — England primary-care prescribing spend & volume.
 * Free, no auth. The UK evidence for the pricing/erosion and access
 * dimensions: monthly total spend, items and quantity per BNF code.
 *
 * Endpoints:
 * - GET /api/1.0/bnf_code/?q={name}&format=json   → [{ id (BNF code), name, type }]
 * - GET /api/1.0/spending_by_code/?code={bnf}&format=json
 *     → [{ date, actual_cost, items, quantity }] (monthly, England-wide)
 *
 * CAVEAT (2026-07-28): openprescribing.net sits behind Cloudflare, which
 * challenges non-browser clients from some networks — the local probe was
 * blocked. Every response is guarded: anything that isn't JSON (the
 * challenge page is HTML) returns null, which the UI renders as
 * "no source connected", never a fabricated number.
 */

const BASE = "https://openprescribing.net/api/1.0";
const UA = "CartaOS/1.0 (pharma portfolio analytics; contact: anastasios.mastroanastasiou@gmail.com)";

export interface BnfMatch {
  code: string;
  name: string;
  type: string;
}

export interface UkSpendPoint {
  date: string;
  actualCost: number;
  items: number;
  quantity: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

async function opFetch(path: string): Promise<any | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.trimStart().startsWith("<")) return null; // Cloudflare challenge page
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Map a drug name to BNF chemical codes (9-char chemical level preferred). */
export async function lookupBnfCode(drugName: string): Promise<BnfMatch[] | null> {
  const data = await opFetch(`/bnf_code/?q=${encodeURIComponent(drugName.trim())}&format=json`);
  if (!Array.isArray(data)) return null;
  return data
    .map((d: any) => ({ code: d.id ?? "", name: d.name ?? "", type: d.type ?? "" }))
    .filter((d: BnfMatch) => d.code);
}

/** Monthly England-wide spend/volume for a BNF code (chemical or presentation). */
export async function getUkSpending(bnfCode: string): Promise<UkSpendPoint[] | null> {
  const data = await opFetch(`/spending_by_code/?code=${encodeURIComponent(bnfCode)}&format=json`);
  if (!Array.isArray(data)) return null;
  return data.map((d: any) => ({
    date: d.date ?? "",
    actualCost: Number(d.actual_cost ?? 0),
    items: Number(d.items ?? 0),
    quantity: Number(d.quantity ?? 0),
  }));
}

/**
 * One-call UK summary for a molecule: resolve to a BNF chemical, then the
 * last 24 months of spend/volume plus a unit-cost trend — the UK leg of the
 * price-erosion dimension.
 */
export async function getUkPrescribingSummary(drugName: string): Promise<{
  bnfCode: string;
  bnfName: string;
  months: number;
  totalSpendGbp: number;
  totalItems: number;
  costPerItemLatest: number | null;
  costPerItemTrendPct: number | null;
} | null> {
  const matches = await lookupBnfCode(drugName);
  if (!matches?.length) return null;
  const chemical = matches.find((m) => m.type.toLowerCase().includes("chemical")) ?? matches[0];
  const series = await getUkSpending(chemical.code);
  if (!series?.length) return null;
  const recent = series.slice(-24);
  const latest = recent.at(-1)!;
  const first = recent[0];
  const cpi = (p: UkSpendPoint) => (p.items > 0 ? p.actualCost / p.items : null);
  const latestCpi = cpi(latest);
  const firstCpi = cpi(first);
  return {
    bnfCode: chemical.code,
    bnfName: chemical.name,
    months: recent.length,
    totalSpendGbp: Math.round(recent.reduce((a, p) => a + p.actualCost, 0)),
    totalItems: recent.reduce((a, p) => a + p.items, 0),
    costPerItemLatest: latestCpi,
    costPerItemTrendPct:
      latestCpi != null && firstCpi != null && firstCpi > 0
        ? Math.round(((latestCpi - firstCpi) / firstCpi) * 1000) / 10
        : null,
  };
}
