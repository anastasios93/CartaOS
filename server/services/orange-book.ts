/**
 * FDA Orange Book via openFDA `orangebook.json` — patents, exclusivity,
 * TE codes and application types for approved drugs. Free, no auth.
 *
 * VERIFIED CONTRACT (probed live 2026-07-28):
 * - Search field for a molecule: `products.active_ingredients.name:"X"`
 *   (names carry salt forms, e.g. "ATORVASTATIN CALCIUM"; single-token
 *   unquoted terms match too). openFDA returns HTTP 404 on no-match —
 *   map to empty, never throw.
 * - `patents[]` and `exclusivity[]` sit at RECORD level (not per product):
 *   patents: { patent_number, expiration_date (YYYYMMDD), drug_product_flag?,
 *   drug_substance_flag? (booleans), patent_use_code? }
 *   exclusivity: { exclusivity_code, exclusivity_expiration_date }.
 *   Only ~2.6k of ~48k records carry patents (the rest are off-patent).
 * - products[]: application_number, application_type ("N"=NDA, "A"=ANDA),
 *   application_full_name (applicant), brand_name, dosage_form, route,
 *   therapeutic_equivalence_codes[], reference_listed_drug (boolean).
 *
 * The previous implementation read patents/exclusivities off `drugsfda.json`,
 * where those fields do not exist — patent data was silently always empty.
 */

const BASE = "https://api.fda.gov/drug";

export interface OrangeBookPatent {
  applicationNumber: string;
  productNumber: string;
  patentNumber: string;
  patentExpireDate: string;
  drugSubstanceFlag: boolean;
  drugProductFlag: boolean;
  patentUseCode: string;
  delistFlag: boolean;
}

export interface OrangeBookExclusivity {
  applicationNumber: string;
  productNumber: string;
  exclusivityCode: string;
  exclusivityDate: string;
}

export interface OrangeBookProduct {
  ingredientName: string;
  proprietaryName: string;
  applicationNumber: string;
  applicant: string;
  approvalDate: string;
  productType: string;
  route: string;
  strengthNumber: string;
  /** "N" = NDA (brand), "A" = ANDA (generic). */
  applicationType?: string;
  teCodes?: string[];
  referenceListedDrug?: boolean;
  patents: OrangeBookPatent[];
  exclusivities: OrangeBookExclusivity[];
}

export interface OrangeBookResult {
  results: OrangeBookProduct[];
  totalCount: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

async function obFetch(search: string, limit: number): Promise<{ results: any[]; total: number }> {
  const url = `${BASE}/orangebook.json?search=${encodeURIComponent(search)}&limit=${limit}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  // openFDA 404s on no-match — that is "zero results", not an error.
  if (!res.ok) return { results: [], total: 0 };
  const data = await res.json();
  return { results: data?.results ?? [], total: data?.meta?.results?.total ?? 0 };
}

function mapRecord(item: any, fallbackIngredient: string): OrangeBookProduct {
  const product = item.products?.[0] ?? {};
  const applicationNumber = product.application_number ?? "";
  const productNumber = item.product_number ?? "";
  return {
    ingredientName:
      (product.active_ingredients ?? []).map((ai: any) => ai.name).join(" / ") || fallbackIngredient,
    proprietaryName: product.brand_name ?? "",
    applicationNumber,
    applicant: product.application_full_name ?? product.application_name ?? "",
    approvalDate: item.approval_date ?? "",
    productType: product.dosage_form ?? "",
    route: product.route ?? "",
    strengthNumber: (product.active_ingredients ?? [])
      .map((ai: any) => `${ai.name} ${ai.strength ?? ""}`.trim())
      .join("; "),
    applicationType: product.application_type ?? "",
    teCodes: product.therapeutic_equivalence_codes ?? [],
    referenceListedDrug: product.reference_listed_drug === true,
    patents: (item.patents ?? []).map((pat: any) => ({
      applicationNumber,
      productNumber,
      patentNumber: pat.patent_number ?? "",
      patentExpireDate: pat.expiration_date ?? "",
      drugSubstanceFlag: pat.drug_substance_flag === true,
      drugProductFlag: pat.drug_product_flag === true,
      patentUseCode: pat.patent_use_code ?? "",
      delistFlag: pat.delist_flag === true,
    })),
    exclusivities: (item.exclusivity ?? []).map((ex: any) => ({
      applicationNumber,
      productNumber,
      exclusivityCode: ex.exclusivity_code ?? "",
      exclusivityDate: ex.exclusivity_expiration_date ?? "",
    })),
  };
}

/** Search Orange Book records by drug ingredient name. */
export async function searchOrangeBook(ingredientName: string, limit = 20): Promise<OrangeBookResult> {
  try {
    const name = ingredientName.trim().toUpperCase();
    let { results, total } = await obFetch(`products.active_ingredients.name:"${name}"`, limit);
    if (!results.length && name.includes(" ")) {
      // Salt-form mismatch — retry on the first token (e.g. "ATORVASTATIN").
      ({ results, total } = await obFetch(
        `products.active_ingredients.name:${name.split(" ")[0]}`,
        limit,
      ));
    }
    return { results: results.map((r) => mapRecord(r, ingredientName)), totalCount: total };
  } catch {
    return { results: [], totalCount: 0 };
  }
}

/** Patent-cliff view: Orange Book patents expiring within [startYear, endYear]. */
export async function getExpiringPatents(startYear: number, endYear: number, limit = 100): Promise<OrangeBookPatent[]> {
  try {
    const { results } = await obFetch(
      `patents.expiration_date:[${startYear}0101 TO ${endYear}1231]`,
      limit,
    );
    const out: OrangeBookPatent[] = [];
    for (const item of results) {
      for (const p of mapRecord(item, "").patents) {
        const year = parseInt(p.patentExpireDate.slice(0, 4), 10);
        if (year >= startYear && year <= endYear) out.push(p);
      }
    }
    return out;
  } catch {
    return [];
  }
}

/** Exclusivity entries for a specific application number. */
export async function getExclusivity(applicationNumber: string): Promise<OrangeBookExclusivity[]> {
  try {
    const { results } = await obFetch(`products.application_number:"${applicationNumber}"`, 10);
    return results.flatMap((r) => mapRecord(r, "").exclusivities);
  } catch {
    return [];
  }
}

/**
 * Exclusivity-runway summary for a molecule: latest patent + exclusivity
 * expiry across all Orange Book records, plus brand/generic counts. This is
 * the §4.1 exclusivity-runway dimension's US evidence.
 */
export async function getExclusivityRunway(ingredientName: string): Promise<{
  latestPatentExpiry: string | null;
  latestExclusivityExpiry: string | null;
  patentCount: number;
  ndaCount: number;
  andaCount: number;
  recordCount: number;
} | null> {
  const { results, totalCount } = await searchOrangeBook(ingredientName, 100);
  if (!results.length) return null;
  const patents = results.flatMap((r) => r.patents);
  const exclusivities = results.flatMap((r) => r.exclusivities);
  const max = (dates: string[]) => (dates.length ? dates.sort().at(-1)! : null);
  return {
    latestPatentExpiry: max(patents.map((p) => p.patentExpireDate).filter(Boolean)),
    latestExclusivityExpiry: max(exclusivities.map((e) => e.exclusivityDate).filter(Boolean)),
    patentCount: patents.length,
    ndaCount: results.filter((r) => r.applicationType === "N").length,
    andaCount: results.filter((r) => r.applicationType === "A").length,
    recordCount: totalCount,
  };
}
