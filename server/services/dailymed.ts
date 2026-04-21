/**
 * DailyMed API — NLM drug labeling database.
 * Free, no auth required. Covers all FDA-approved drug labels (SPL).
 * https://dailymed.nlm.nih.gov/dailymed/webservices-help/v2/spls_api.cfm
 */

const BASE = "https://dailymed.nlm.nih.gov/dailymed/services/v2";

export interface DailyMedDrug {
  setId: string;
  splVersion: number;
  title: string;
  publishedDate: string;
  productNames: string[];
  activeIngredients: string[];
  routeOfAdministration: string[];
  marketingCategory: string;
  labelerName: string;
}

export interface DailyMedResult {
  results: DailyMedDrug[];
  totalCount: number;
}

/**
 * Search DailyMed for drug labels by name, ingredient, or indication.
 */
export async function searchDailyMed(query: string, limit = 20, page = 1): Promise<DailyMedResult> {
  try {
    const url = `${BASE}/spls.json?drug_name=${encodeURIComponent(query)}&pagesize=${limit}&page=${page}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return { results: [], totalCount: 0 };

    const data = await res.json();
    const spls = data?.data ?? [];
    const results: DailyMedDrug[] = spls.map((spl: any) => ({
      setId: spl.setid ?? "",
      splVersion: spl.spl_version ?? 0,
      title: spl.title ?? "",
      publishedDate: spl.published_date ?? "",
      productNames: (spl.products ?? []).map((p: any) => p.name).filter(Boolean),
      activeIngredients: (spl.products ?? []).flatMap((p: any) =>
        (p.active_ingredients ?? []).map((ai: any) => ai.name)
      ).filter(Boolean),
      routeOfAdministration: (spl.products ?? []).map((p: any) => p.route).filter(Boolean),
      marketingCategory: spl.products?.[0]?.marketing_category ?? "",
      labelerName: spl.labeler ?? "",
    }));

    return { results, totalCount: data?.metadata?.total_elements ?? results.length };
  } catch {
    return { results: [], totalCount: 0 };
  }
}

/**
 * Get full drug label (prescribing info) by setId.
 */
export async function getDrugLabel(setId: string): Promise<Record<string, string> | null> {
  try {
    const url = `${BASE}/spls/${setId}.json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Search by drug class (pharmacologic or chemical).
 */
export async function searchByDrugClass(className: string, limit = 20): Promise<DailyMedResult> {
  try {
    const url = `${BASE}/drugclasses.json?drug_class_name=${encodeURIComponent(className)}&pagesize=${limit}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return { results: [], totalCount: 0 };
    const data = await res.json();
    // drugclasses returns class info, not full drug records — return minimal
    return { results: [], totalCount: data?.metadata?.total_elements ?? 0 };
  } catch {
    return { results: [], totalCount: 0 };
  }
}
