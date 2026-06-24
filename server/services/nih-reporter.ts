/**
 * NIH RePORTER project search client.
 * No API key required.
 * Docs: https://api.reporter.nih.gov/
 */

import { fetchJSON } from "./http";

const BASE_URL = "https://api.reporter.nih.gov/v2/projects/search";

export interface NihProject {
  projectNum: string;
  title: string;
  organization: string;
  fiscalYear: number | null;
  awardAmount: number | null;
  pi: string;
}

/**
 * Search NIH RePORTER for funded research projects.
 *
 * @param query Free-text search across title, terms and abstract.
 * @param limit Max results to return (default 15).
 */
export async function searchNihReporter(query: string, limit = 15): Promise<NihProject[]> {
  const body = JSON.stringify({
    criteria: {
      advanced_text_search: {
        operator: "and",
        search_field: "projecttitle,terms,abstracttext",
        search_text: query,
      },
    },
    include_fields: [
      "ProjectTitle",
      "Organization",
      "FiscalYear",
      "AwardAmount",
      "ContactPiName",
      "ProjectNum",
    ],
    limit,
  });

  const data = await fetchJSON<{ results?: any[] }>(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const results: any[] = data.results ?? [];

  return results.map((r) => ({
    projectNum: r?.project_num ?? "",
    title: r?.project_title ?? "",
    organization: r?.organization?.org_name ?? "",
    fiscalYear: typeof r?.fiscal_year === "number" ? r.fiscal_year : null,
    awardAmount: typeof r?.award_amount === "number" ? r.award_amount : null,
    pi: r?.contact_pi_name ?? "",
  }));
}
