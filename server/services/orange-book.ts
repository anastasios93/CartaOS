/**
 * FDA Orange Book API — Patent & exclusivity data for approved drugs.
 * Uses openFDA endpoints. Free, no auth.
 * Shows patent expiry dates and market exclusivity periods.
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
  patents: OrangeBookPatent[];
  exclusivities: OrangeBookExclusivity[];
}

export interface OrangeBookResult {
  results: OrangeBookProduct[];
  totalCount: number;
}

/**
 * Search Orange Book by drug ingredient name.
 */
export async function searchOrangeBook(
  ingredientName: string,
  limit = 20
): Promise<OrangeBookResult> {
  try {
    const search = `openfda.substance_name:"${ingredientName}"`;
    const url = `${BASE}/drugsfda.json?search=${encodeURIComponent(search)}&limit=${limit}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return { results: [], totalCount: 0 };

    const data = await res.json();
    const items = data?.results ?? [];

    const results: OrangeBookProduct[] = items.map((item: any) => {
      const product = item.products?.[0] ?? {};
      return {
        ingredientName: item.openfda?.substance_name?.[0] ?? ingredientName,
        proprietaryName: item.openfda?.brand_name?.[0] ?? "",
        applicationNumber: item.application_number ?? "",
        applicant: item.sponsor_name ?? "",
        approvalDate: product.marketing_status_date ?? "",
        productType: product.dosage_form ?? "",
        route: product.route ?? "",
        strengthNumber: product.active_ingredients?.map((ai: any) =>
          `${ai.name} ${ai.strength}`
        ).join("; ") ?? "",
        patents: (item.products ?? []).flatMap((p: any) =>
          (p.patents ?? []).map((pat: any) => ({
            applicationNumber: item.application_number ?? "",
            productNumber: p.product_number ?? "",
            patentNumber: pat.patent_number ?? "",
            patentExpireDate: pat.patent_expire_date ?? "",
            drugSubstanceFlag: pat.drug_substance_flag === "Y",
            drugProductFlag: pat.drug_product_flag === "Y",
            patentUseCode: pat.patent_use_code ?? "",
            delistFlag: pat.delist_flag === "Y",
          }))
        ),
        exclusivities: (item.products ?? []).flatMap((p: any) =>
          (p.exclusivities ?? []).map((ex: any) => ({
            applicationNumber: item.application_number ?? "",
            productNumber: p.product_number ?? "",
            exclusivityCode: ex.exclusivity_code ?? "",
            exclusivityDate: ex.exclusivity_date ?? "",
          }))
        ),
      };
    });

    return { results, totalCount: data?.meta?.results?.total ?? results.length };
  } catch {
    return { results: [], totalCount: 0 };
  }
}

/**
 * Get patent cliff data — patents expiring within a date range.
 */
export async function getExpiringPatents(
  startYear: number,
  endYear: number,
  limit = 100
): Promise<OrangeBookPatent[]> {
  try {
    const search = `products.patents.patent_expire_date:[${startYear}0101+TO+${endYear}1231]`;
    const url = `${BASE}/drugsfda.json?search=${encodeURIComponent(search)}&limit=${limit}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return [];

    const data = await res.json();
    const items = data?.results ?? [];
    const patents: OrangeBookPatent[] = [];
    for (const item of items) {
      for (const prod of item.products ?? []) {
        for (const pat of prod.patents ?? []) {
          const expiry = pat.patent_expire_date ?? "";
          const year = parseInt(expiry.slice(0, 4));
          if (year >= startYear && year <= endYear) {
            patents.push({
              applicationNumber: item.application_number ?? "",
              productNumber: prod.product_number ?? "",
              patentNumber: pat.patent_number ?? "",
              patentExpireDate: expiry,
              drugSubstanceFlag: pat.drug_substance_flag === "Y",
              drugProductFlag: pat.drug_product_flag === "Y",
              patentUseCode: pat.patent_use_code ?? "",
              delistFlag: pat.delist_flag === "Y",
            });
          }
        }
      }
    }
    return patents;
  } catch {
    return [];
  }
}

/**
 * Get exclusivity data for a specific application number.
 */
export async function getExclusivity(applicationNumber: string): Promise<OrangeBookExclusivity[]> {
  try {
    const url = `${BASE}/drugsfda.json?search=application_number:"${applicationNumber}"&limit=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];

    const data = await res.json();
    const item = data?.results?.[0];
    if (!item) return [];

    return (item.products ?? []).flatMap((p: any) =>
      (p.exclusivities ?? []).map((ex: any) => ({
        applicationNumber: item.application_number ?? "",
        productNumber: p.product_number ?? "",
        exclusivityCode: ex.exclusivity_code ?? "",
        exclusivityDate: ex.exclusivity_date ?? "",
      }))
    );
  } catch {
    return [];
  }
}
