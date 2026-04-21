/**
 * Health Canada Drug Product Database (DPD) API.
 * Free, no auth. ~47,000 approved drug products in Canada.
 * https://health-products.canada.ca/api/documentation/dpd-documentation-en.html
 */

const BASE = "https://health-products.canada.ca/api/drug";

export interface HealthCanadaDrug {
  drugCode: number;
  className: string;
  drugIdentificationNumber: string;
  brandName: string;
  descriptor: string;
  companyName: string;
  activeIngredients: { name: string; strength: string; unit: string }[];
  route: string;
  status: string;
  aiGroupNo: string;
}

export interface HealthCanadaResult {
  results: HealthCanadaDrug[];
  totalCount: number;
}

/**
 * Search by brand name.
 */
export async function searchByBrandName(name: string, limit = 25): Promise<HealthCanadaResult> {
  try {
    const url = `${BASE}/brand-name/?lang=en&type=json&brandname=${encodeURIComponent(name)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return { results: [], totalCount: 0 };

    const data = await res.json();
    const items = Array.isArray(data) ? data.slice(0, limit) : [];
    const results = await enrichWithIngredients(items);
    return { results, totalCount: items.length };
  } catch {
    return { results: [], totalCount: 0 };
  }
}

/**
 * Search by active ingredient.
 */
export async function searchByIngredient(ingredient: string, limit = 25): Promise<HealthCanadaResult> {
  try {
    const url = `${BASE}/activeingredient/?lang=en&type=json&ingredientname=${encodeURIComponent(ingredient)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return { results: [], totalCount: 0 };

    const data = await res.json();
    const items = Array.isArray(data) ? data.slice(0, limit) : [];
    const results = items.map(mapToDrug);
    return { results, totalCount: items.length };
  } catch {
    return { results: [], totalCount: 0 };
  }
}

/**
 * Search by company name.
 */
export async function searchByCompany(company: string, limit = 25): Promise<HealthCanadaResult> {
  try {
    const url = `${BASE}/company/?lang=en&type=json&companyname=${encodeURIComponent(company)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return { results: [], totalCount: 0 };

    const data = await res.json();
    const items = Array.isArray(data) ? data.slice(0, limit) : [];
    const results = items.map(mapToDrug);
    return { results, totalCount: items.length };
  } catch {
    return { results: [], totalCount: 0 };
  }
}

/**
 * Get drug details by Drug Code.
 */
export async function getDrugByCode(drugCode: number): Promise<HealthCanadaDrug | null> {
  try {
    const url = `${BASE}/drugproduct/?lang=en&type=json&id=${drugCode}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;

    const data = await res.json();
    const item = Array.isArray(data) ? data[0] : data;
    if (!item) return null;
    return mapToDrug(item);
  } catch {
    return null;
  }
}

function mapToDrug(item: any): HealthCanadaDrug {
  return {
    drugCode: item.drug_code ?? item.drugCode ?? 0,
    className: item.class_name ?? item.class ?? "",
    drugIdentificationNumber: item.drug_identification_number ?? item.din ?? "",
    brandName: item.brand_name ?? item.brandname ?? "",
    descriptor: item.descriptor ?? "",
    companyName: item.company_name ?? item.companyname ?? "",
    activeIngredients: (item.active_ingredients ?? []).map((ai: any) => ({
      name: ai.ingredient_name ?? ai.ingredientname ?? "",
      strength: ai.strength ?? "",
      unit: ai.strength_unit ?? ai.dosage_unit ?? "",
    })),
    route: item.route_of_administration ?? item.route ?? "",
    status: item.status ?? item.product_status ?? "",
    aiGroupNo: item.ai_group_no ?? "",
  };
}

async function enrichWithIngredients(items: any[]): Promise<HealthCanadaDrug[]> {
  return items.map(mapToDrug);
}
