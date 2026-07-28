/**
 * Pure Criterion[] → legacy SearchCriteria bridge, shared by the client (run
 * configuration) and the server (criteria extraction). No server-only imports.
 */

import type { Criterion, CriterionCategory } from "@/types/run";
import type { SearchCriteria } from "@/types/hub";
import { normalizeLegacyGeography } from "@/config/geographies";

/** The orchestrator's Zod schema accepts exactly these lever names — anything else is dropped, not guessed. */
export const VALID_LEVERS = new Set<string>([
  "Geographic expansion",
  "Indication expansion / repurposing",
  "Distribution channels",
  "Formulary positioning",
  "Administration / formulation",
  "Reimbursement / pricing",
  "Sales-force effectiveness",
  "Lifecycle / IP defense",
  "Supply / COGS arbitrage",
  "Portfolio synergy",
]);

export function criteriaToSearchCriteria(criteria: Criterion[]): SearchCriteria {
  const byCat = (c: CriterionCategory) => criteria.filter((x) => x.category === c);
  const leverWeights = byCat("lever_weight")
    .map((c) => {
      const m = c.value.match(/^(.*?):\s*(\d{1,3})$/);
      return m ? { lever: m[1].trim(), weight: Math.min(100, Number(m[2])) } : { lever: c.value.trim(), weight: c.weight };
    })
    .filter((w) => VALID_LEVERS.has(w.lever));
  return {
    assets: byCat("compound").map((c) => c.value),
    geographies: [
      ...new Set(byCat("geography").flatMap((c) => (normalizeLegacyGeography(c.value).length ? normalizeLegacyGeography(c.value) : [c.value]))),
    ],
    therapeuticArea: byCat("indication")[0]?.value,
    leverWeights: leverWeights as SearchCriteria["leverWeights"],
    constraints: byCat("constraint").map((c) => c.value),
    thresholds: [],
  };
}
