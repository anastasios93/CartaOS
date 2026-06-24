/**
 * Europe PMC client (keyless).
 * Life-science literature search across PubMed, PMC, patents, and preprints.
 * Docs: https://europepmc.org/RestfulWebService
 */

import { fetchJSON } from "./http";

const BASE_URL = "https://www.ebi.ac.uk/europepmc/webservices/rest/search";

export interface EuropePmcArticle {
  title: string;
  authors: string;
  journal: string;
  year: string;
  pmid: string;
  doi: string;
  isOpenAccess: boolean;
}

/**
 * Search Europe PMC for articles matching a free-text query.
 *
 * @param query  Free-text search term (mapped to `query`)
 * @param limit  Max results to return (default 10, mapped to `pageSize`)
 */
export async function searchEuropePmc(query: string, limit = 10): Promise<EuropePmcArticle[]> {
  const url =
    `${BASE_URL}?query=${encodeURIComponent(query)}` +
    `&format=json` +
    `&pageSize=${encodeURIComponent(String(limit))}` +
    `&resultType=lite`;

  const data = await fetchJSON<{ resultList?: { result?: any[] } }>(url);
  const results: any[] = data.resultList?.result ?? [];

  return results.map((article) => ({
    title: article.title ?? "",
    authors: article.authorString ?? "",
    journal: article.journalTitle ?? "",
    year: article.pubYear ?? "",
    pmid: article.pmid ?? "",
    doi: article.doi ?? "",
    isOpenAccess: article.isOpenAccess === "Y",
  }));
}
