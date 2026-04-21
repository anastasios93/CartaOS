/**
 * RxNorm API — NLM drug nomenclature, ingredients, and classification.
 * Free, no auth. 20 req/sec limit.
 * https://lhncbc.nlm.nih.gov/RxNav/APIs/RxNormAPIs.html
 */

const BASE = "https://rxnav.nlm.nih.gov/REST";

export interface RxNormDrug {
  rxcui: string;
  name: string;
  synonym: string;
  tty: string; // term type (BN=brand, IN=ingredient, SBD=branded dose form, etc.)
}

export interface DrugIngredient {
  rxcui: string;
  name: string;
  ingredientRxcui: string;
  ingredientName: string;
}

export interface DrugProperty {
  propName: string;
  propValue: string;
}

/**
 * Search for drugs by name — returns RxCUI matches.
 */
export async function searchDrugs(name: string): Promise<RxNormDrug[]> {
  try {
    const url = `${BASE}/drugs.json?name=${encodeURIComponent(name)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];

    const data = await res.json();
    const groups = data?.drugGroup?.conceptGroup ?? [];
    const results: RxNormDrug[] = [];
    for (const g of groups) {
      for (const p of g.conceptProperties ?? []) {
        results.push({
          rxcui: p.rxcui ?? "",
          name: p.name ?? "",
          synonym: p.synonym ?? "",
          tty: p.tty ?? "",
        });
      }
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * Get all ingredients for a drug by RxCUI.
 */
export async function getIngredients(rxcui: string): Promise<DrugIngredient[]> {
  try {
    const url = `${BASE}/rxcui/${rxcui}/allrelated.json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];

    const data = await res.json();
    const groups = data?.allRelatedGroup?.conceptGroup ?? [];
    const ingGroup = groups.find((g: any) => g.tty === "IN");
    return (ingGroup?.conceptProperties ?? []).map((p: any) => ({
      rxcui: rxcui,
      name: "",
      ingredientRxcui: p.rxcui ?? "",
      ingredientName: p.name ?? "",
    }));
  } catch {
    return [];
  }
}

/**
 * Get drug class for a drug by RxCUI (ATC, MeSH, etc.).
 */
export async function getDrugClasses(rxcui: string): Promise<{ className: string; classType: string }[]> {
  try {
    const url = `${BASE}/rxclass/class/byRxcui.json?rxcui=${rxcui}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];

    const data = await res.json();
    const entries = data?.rxclassDrugInfoList?.rxclassDrugInfo ?? [];
    return entries.map((e: any) => ({
      className: e.rxclassMinConceptItem?.className ?? "",
      classType: e.rxclassMinConceptItem?.classType ?? "",
    }));
  } catch {
    return [];
  }
}

/**
 * Get NDC codes for a drug by RxCUI.
 */
export async function getNdcCodes(rxcui: string): Promise<string[]> {
  try {
    const url = `${BASE}/rxcui/${rxcui}/ndcs.json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];

    const data = await res.json();
    return data?.ndcGroup?.ndcList?.ndc ?? [];
  } catch {
    return [];
  }
}

/**
 * Get drug properties by RxCUI (strength, dose form, route).
 */
export async function getDrugProperties(rxcui: string): Promise<DrugProperty[]> {
  try {
    const url = `${BASE}/rxcui/${rxcui}/allProperties.json?prop=all`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];

    const data = await res.json();
    return (data?.propConceptGroup?.propConcept ?? []).map((p: any) => ({
      propName: p.propName ?? "",
      propValue: p.propValue ?? "",
    }));
  } catch {
    return [];
  }
}

/**
 * Approximate match — fuzzy search for drug names.
 */
export async function approximateMatch(term: string): Promise<RxNormDrug[]> {
  try {
    const url = `${BASE}/approximateTerm.json?term=${encodeURIComponent(term)}&maxEntries=10`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];

    const data = await res.json();
    const candidates = data?.approximateGroup?.candidate ?? [];
    return candidates.map((c: any) => ({
      rxcui: c.rxcui ?? "",
      name: c.name ?? "",
      synonym: "",
      tty: c.tty ?? "",
    }));
  } catch {
    return [];
  }
}
