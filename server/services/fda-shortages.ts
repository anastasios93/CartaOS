/**
 * openFDA Drug Shortages — live supply-gap signal for the value-add
 * (supply-shortage arbitrage) lever. Free, no auth.
 *
 * VERIFIED CONTRACT (probed live 2026-07-28):
 * - Search MUST be field-scoped: `generic_name:"X"` works; a bare full-text
 *   term returns 404. 404 on no-match = zero results, not an error.
 * - Fields: generic_name, status ("Current" | "Resolved"), company_name,
 *   presentation, dosage_form, therapeutic_category, update_date,
 *   initial_posting_date, discontinued_date, update_type.
 */

const URL_BASE = "https://api.fda.gov/drug/shortages.json";

export interface DrugShortage {
  genericName: string;
  status: string;
  company: string;
  presentation: string;
  dosageForm: string;
  therapeuticCategory: string;
  initialPostingDate: string;
  updateDate: string;
}

export interface ShortageSummary {
  current: number;
  resolved: number;
  entries: DrugShortage[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function searchDrugShortages(genericName: string, limit = 25): Promise<ShortageSummary | null> {
  try {
    const search = `generic_name:"${genericName.trim()}"`;
    const res = await fetch(`${URL_BASE}?search=${encodeURIComponent(search)}&limit=${limit}`, {
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return { current: 0, resolved: 0, entries: [] }; // 404 = no shortages on record
    const data = await res.json();
    const entries: DrugShortage[] = (data?.results ?? []).map((r: any) => ({
      genericName: r.generic_name ?? "",
      status: r.status ?? "",
      company: r.company_name ?? "",
      presentation: r.presentation ?? "",
      dosageForm: r.dosage_form ?? "",
      therapeuticCategory: r.therapeutic_category ?? "",
      initialPostingDate: r.initial_posting_date ?? "",
      updateDate: r.update_date ?? "",
    }));
    return {
      current: entries.filter((e) => e.status === "Current").length,
      resolved: entries.filter((e) => e.status === "Resolved").length,
      entries,
    };
  } catch {
    return null; // network failure — genuinely unknown, distinct from "no shortages"
  }
}
