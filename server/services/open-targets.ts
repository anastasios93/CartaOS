/**
 * Open Targets Platform client (GraphQL, no key).
 * Best single source for asset-quality / scientific-risk scoring:
 * target–disease associations, tractability, known drugs, mechanism.
 * Docs: https://platform-docs.opentargets.org/data-access/graphql-api
 */

import { fetchJSON } from "./http";

const GQL = "https://api.platform.opentargets.org/api/v4/graphql";

export interface OpenTargetsDrug {
  id: string;
  name: string;
  drugType: string;
  maxPhase: number | null;
  mechanismsOfAction: string[];
  indications: string[];
  linkedTargets: string[];
}

export interface OpenTargetsProfile {
  query: string;
  drug: OpenTargetsDrug | null;
  associatedTargets: { symbol: string; name: string; associationScore: number }[];
}

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const data = await fetchJSON<{ data: T; errors?: unknown }>(GQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  return data.data;
}

/** Resolve a free-text drug/target name to its best Open Targets drug profile. */
export async function searchOpenTargets(name: string): Promise<OpenTargetsProfile> {
  const search = await gql<{ search: { hits: { id: string; entity: string; name: string }[] } }>(
    `query S($q: String!) {
      search(queryString: $q, entityNames: ["drug","target"], page: { index: 0, size: 5 }) {
        hits { id entity name }
      }
    }`,
    { q: name }
  );

  const hits = search.search?.hits ?? [];
  const drugHit = hits.find((h) => h.entity === "drug");
  const targetHit = hits.find((h) => h.entity === "target");

  let drug: OpenTargetsDrug | null = null;
  if (drugHit) {
    const d = await gql<{ drug: any }>(
      `query D($id: String!) {
        drug(chemblId: $id) {
          id name drugType maximumClinicalTrialPhase
          mechanismsOfAction { rows { mechanismOfAction targets { approvedSymbol } } }
          indications { rows { disease { name } } }
        }
      }`,
      { id: drugHit.id }
    );
    const dd = d.drug;
    if (dd) {
      const moaRows: any[] = dd.mechanismsOfAction?.rows ?? [];
      drug = {
        id: dd.id,
        name: dd.name,
        drugType: dd.drugType ?? "",
        maxPhase: dd.maximumClinicalTrialPhase ?? null,
        mechanismsOfAction: moaRows.map((r) => r.mechanismOfAction).filter(Boolean),
        indications: (dd.indications?.rows ?? []).map((r: any) => r.disease?.name).filter(Boolean).slice(0, 10),
        linkedTargets: Array.from(
          new Set(moaRows.flatMap((r) => (r.targets ?? []).map((t: any) => t.approvedSymbol)).filter(Boolean))
        ),
      };
    }
  }

  let associatedTargets: OpenTargetsProfile["associatedTargets"] = [];
  if (targetHit) {
    const t = await gql<{ target: any }>(
      `query T($id: String!) {
        target(ensemblId: $id) {
          approvedSymbol approvedName
          associatedDiseases(page: { index: 0, size: 5 }) {
            rows { score disease { name } }
          }
        }
      }`,
      { id: targetHit.id }
    ).catch(() => ({ target: null }));
    const rows: any[] = t.target?.associatedDiseases?.rows ?? [];
    associatedTargets = rows.map((r) => ({
      symbol: t.target?.approvedSymbol ?? targetHit.name,
      name: r.disease?.name ?? "",
      associationScore: typeof r.score === "number" ? Math.round(r.score * 100) / 100 : 0,
    }));
  }

  return { query: name, drug, associatedTargets };
}
