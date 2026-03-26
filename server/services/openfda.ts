/**
 * OpenFDA API client
 * Free, no API key required (optional key increases rate limit).
 * Without key: 40 req/min. With key: 240 req/min.
 * Docs: https://open.fda.gov/apis/
 */

const BASE_URL = "https://api.fda.gov";

export interface OpenFdaResult {
  applicationNumber: string;
  brandName: string;
  genericName: string;
  sponsorName: string;
  approvalDate?: string;
  productType: string;
  route?: string;
  substanceName?: string;
}

export interface OpenFdaSearchResult {
  results: OpenFdaResult[];
  totalCount: number;
}

/**
 * Search FDA drug applications (Drugs@FDA dataset).
 * Useful for finding approved products, sponsors, and regulatory history.
 */
export async function searchDrugApplications(
  query: string,
  limit = 10,
): Promise<OpenFdaSearchResult> {
  const searchTerms = encodeURIComponent(
    `openfda.brand_name:"${query}" OR openfda.generic_name:"${query}" OR openfda.manufacturer_name:"${query}"`,
  );
  const url = `${BASE_URL}/drug/drugsfda.json?search=${searchTerms}&limit=${Math.min(limit, 100)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) return { results: [], totalCount: 0 };
      throw new Error(`OpenFDA API error: ${res.status}`);
    }
    const data = await res.json();
    const results: OpenFdaResult[] = (data.results ?? []).map((r: any) => ({
      applicationNumber: r.application_number ?? "",
      brandName: r.openfda?.brand_name?.[0] ?? r.products?.[0]?.brand_name ?? "",
      genericName: r.openfda?.generic_name?.[0] ?? "",
      sponsorName: r.sponsor_name ?? "",
      approvalDate: r.products?.[0]?.marketing_status_date,
      productType: r.products?.[0]?.product_type ?? "",
      route: r.products?.[0]?.route ?? "",
      substanceName: r.openfda?.substance_name?.[0] ?? "",
    }));
    return { results, totalCount: data.meta?.results?.total ?? results.length };
  } catch (err) {
    console.error("[OpenFDA] search error:", err);
    return { results: [], totalCount: 0 };
  }
}

/**
 * Search FDA drug labels for indication, mechanism, and approval pathway info.
 */
export async function searchDrugLabels(
  query: string,
  limit = 5,
): Promise<{ results: { brandName: string; genericName: string; indications: string; mechanism: string; sponsor: string }[]; totalCount: number }> {
  const searchTerms = encodeURIComponent(
    `openfda.brand_name:"${query}" OR openfda.generic_name:"${query}"`,
  );
  const url = `${BASE_URL}/drug/label.json?search=${searchTerms}&limit=${Math.min(limit, 100)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) return { results: [], totalCount: 0 };
      throw new Error(`OpenFDA label API error: ${res.status}`);
    }
    const data = await res.json();
    const results = (data.results ?? []).map((r: any) => ({
      brandName: r.openfda?.brand_name?.[0] ?? "",
      genericName: r.openfda?.generic_name?.[0] ?? "",
      indications: (r.indications_and_usage?.[0] ?? "").slice(0, 500),
      mechanism: (r.mechanism_of_action?.[0] ?? "").slice(0, 500),
      sponsor: r.openfda?.manufacturer_name?.[0] ?? "",
    }));
    return { results, totalCount: data.meta?.results?.total ?? results.length };
  } catch (err) {
    console.error("[OpenFDA] label search error:", err);
    return { results: [], totalCount: 0 };
  }
}
