/**
 * USPTO PatentsView Search API client + WIPO PATENTSCOPE link builder
 * New PatentSearch API (v1) — requires API key (free from patentsview.org)
 * Falls back to Europe PMC patent search if no API key is configured.
 * Docs: https://search.patentsview.org/docs/
 */

const PATENTSVIEW_URL = "https://search.patentsview.org/api/v1/patent/";
const PATENTSVIEW_API_KEY = process.env.PATENTSVIEW_API_KEY ?? "";

// Europe PMC also indexes patent literature and is completely free
const EUROPEPMC_PATENT_URL = "https://www.ebi.ac.uk/europepmc/webservices/rest";

export interface PatentResult {
  patentNumber: string;
  title: string;
  abstract: string;
  inventorNames: string[];
  assigneeOrganization: string;
  applicationDate: string;
  grantDate: string;
  expiryDate: string;
  patentType: string;
  cpcCodes: string[];
  patentUrl: string;
  wipoSearchUrl: string;
}

/**
 * Calculate patent expiry: utility patents filed after 1995-06-08
 * expire 20 years from the application filing date.
 */
function calculateExpiry(applicationDate: string): string {
  if (!applicationDate) return "";
  try {
    const d = new Date(applicationDate);
    if (isNaN(d.getTime())) return "";
    d.setFullYear(d.getFullYear() + 20);
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

/**
 * Build a WIPO PATENTSCOPE search URL for international patent lookup.
 */
export function getWipoSearchUrl(query: string): string {
  return `https://patentscope.wipo.int/search/en/search.jsf?query=${encodeURIComponent(query)}`;
}

/**
 * Search using the new PatentsView Search API (requires API key).
 */
async function searchPatentsView(
  query: string,
  limit: number
): Promise<{ results: PatentResult[]; nextToken: string | null; totalCount: number }> {
  const qParam = JSON.stringify({
    _or: [
      { _text_any: { patent_title: query } },
      { _text_any: { patent_abstract: query } },
    ],
  });
  const fParam = JSON.stringify([
    "patent_id",
    "patent_title",
    "patent_abstract",
    "patent_date",
    "patent_type",
    "assignees.assignee_organization",
    "inventors.inventor_name_first",
    "inventors.inventor_name_last",
    "application.filing_date",
    "cpcs.cpc_group_id",
  ]);
  const sParam = JSON.stringify([{ patent_date: "desc" }]);
  const oParam = JSON.stringify({ size: Math.min(limit, 100) });

  const url = `${PATENTSVIEW_URL}?q=${encodeURIComponent(qParam)}&f=${encodeURIComponent(fParam)}&s=${encodeURIComponent(sParam)}&o=${encodeURIComponent(oParam)}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Api-Key": PATENTSVIEW_API_KEY,
    },
  });

  if (!res.ok) {
    throw new Error(`PatentsView search failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const patents: any[] = data.patents ?? [];
  const totalCount: number = data.total_patent_count ?? patents.length;

  const results: PatentResult[] = patents.map((p: any): PatentResult => {
    const patentNumber = p.patent_id ?? "";
    const appDate = p.application?.filing_date ?? "";
    const abstract = (p.patent_abstract ?? "").slice(0, 300);

    const inventors: string[] = (p.inventors ?? [])
      .slice(0, 3)
      .map((inv: any) =>
        `${inv.inventor_name_first ?? ""} ${inv.inventor_name_last ?? ""}`.trim()
      )
      .filter(Boolean);

    const assignee =
      (p.assignees ?? [])[0]?.assignee_organization ?? "";

    const cpcCodes: string[] = (p.cpcs ?? [])
      .slice(0, 5)
      .map((c: any) => c.cpc_group_id ?? "")
      .filter(Boolean);

    return {
      patentNumber,
      title: p.patent_title ?? "",
      abstract,
      inventorNames: inventors,
      assigneeOrganization: assignee,
      applicationDate: appDate,
      grantDate: p.patent_date ?? "",
      expiryDate: calculateExpiry(appDate),
      patentType: p.patent_type ?? "utility",
      cpcCodes,
      patentUrl: `https://patents.google.com/patent/US${patentNumber}`,
      wipoSearchUrl: getWipoSearchUrl(query),
    };
  });

  return { results, nextToken: null, totalCount };
}

/**
 * Fallback: Search Europe PMC for patent-related literature.
 * This is free and doesn't require an API key.
 * Searches patent abstracts indexed by Europe PMC.
 */
async function searchEuropePmcPatents(
  query: string,
  limit: number,
  pageToken?: string
): Promise<{ results: PatentResult[]; nextToken: string | null; totalCount: number }> {
  const pageSize = Math.min(limit, 1000);
  const page = pageToken ? parseInt(pageToken, 10) : 1;

  const params = new URLSearchParams({
    query: `(SRC:PAT) AND (${query})`,
    format: "json",
    pageSize: String(pageSize),
    sort: "P_PDATE_D desc",
    page: String(page),
  });

  const res = await fetch(`${EUROPEPMC_PATENT_URL}/search?${params}`, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Europe PMC patent search failed: ${res.status}`);
  }

  const data = await res.json();
  const rawResults: any[] = data.resultList?.result ?? [];
  const totalCount: number = data.hitCount ?? 0;

  const results: PatentResult[] = rawResults.map((r: any): PatentResult => {
    const patentId = r.id ?? "";
    const patentSource = r.source ?? "PAT";

    return {
      patentNumber: patentId,
      title: r.title ?? "",
      abstract: (r.abstractText ?? "").slice(0, 300),
      inventorNames: r.authorString
        ? r.authorString.split(",").slice(0, 3).map((s: string) => s.trim())
        : [],
      assigneeOrganization: r.affiliation ?? "",
      applicationDate: r.firstPublicationDate ?? "",
      grantDate: r.firstPublicationDate ?? "",
      expiryDate: calculateExpiry(r.firstPublicationDate ?? ""),
      patentType: "patent",
      cpcCodes: [],
      patentUrl: `https://europepmc.org/article/${patentSource}/${patentId}`,
      wipoSearchUrl: getWipoSearchUrl(query),
    };
  });

  // Page-based pagination: if we got a full page, there's likely more
  const itemsSoFar = (page - 1) * pageSize + rawResults.length;
  const nextToken = itemsSoFar < totalCount && rawResults.length === pageSize ? String(page + 1) : null;

  return { results, nextToken, totalCount };
}

/**
 * Search patents — uses PatentsView if API key is configured,
 * otherwise falls back to Europe PMC patent search.
 */
export async function searchPatents(
  query: string,
  limit = 20,
  pageToken?: string
): Promise<{ results: PatentResult[]; nextToken: string | null; totalCount: number }> {
  if (PATENTSVIEW_API_KEY) {
    return searchPatentsView(query, limit);
  }
  return searchEuropePmcPatents(query, limit, pageToken);
}
