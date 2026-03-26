/**
 * ClinicalTrials.gov API v2 client
 * No API key required.
 * Docs: https://clinicaltrials.gov/data-api/api
 */

const BASE_URL = "https://clinicaltrials.gov/api/v2/studies";

export interface ClinicalTrialResult {
  nctId: string;
  title: string;
  status: string;
  sponsor: string;
  conditions: string[];
  interventions: string[];
  phase: string;
  startDate: string;
  studyType: string;
}

/**
 * Search ClinicalTrials.gov for studies matching a query.
 *
 * @param query      Free-text search term (mapped to `query.term`)
 * @param status     Optional overall status filter (e.g. "RECRUITING", "COMPLETED")
 * @param limit      Max results to return (default 20, max 1000)
 * @param pageToken  Optional page token for pagination
 */
export async function searchClinicalTrials(
  query: string,
  status?: string,
  limit = 20,
  pageToken?: string
): Promise<{ results: ClinicalTrialResult[]; nextToken: string | null; totalCount: number }> {
  const params = new URLSearchParams({
    "query.term": query,
    pageSize: String(Math.min(limit, 1000)),
  });

  if (status) {
    params.set("filter.overallStatus", status);
  }

  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  const url = `${BASE_URL}?${params}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`ClinicalTrials.gov search failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const studies: any[] = data.studies ?? [];
  const totalCount: number = data.totalCount ?? 0;
  const nextPageToken: string | undefined = data.nextPageToken;

  const results = studies.map(parseStudy);

  return {
    results,
    nextToken: nextPageToken ?? null,
    totalCount,
  };
}

/**
 * Parse a single study object from the ClinicalTrials.gov v2 API response
 * into our normalised ClinicalTrialResult shape.
 *
 * v2 structure:
 *   study.protocolSection.identificationModule.nctId
 *   study.protocolSection.identificationModule.officialTitle / briefTitle
 *   study.protocolSection.statusModule.overallStatus
 *   study.protocolSection.statusModule.startDateStruct.date
 *   study.protocolSection.sponsorCollaboratorsModule.leadSponsor.name
 *   study.protocolSection.conditionsModule.conditions[]
 *   study.protocolSection.armsInterventionsModule.interventions[].name
 *   study.protocolSection.designModule.phases[]
 *   study.protocolSection.designModule.studyType
 */
function parseStudy(study: any): ClinicalTrialResult {
  const protocol = study.protocolSection ?? {};
  const identification = protocol.identificationModule ?? {};
  const statusModule = protocol.statusModule ?? {};
  const sponsorModule = protocol.sponsorCollaboratorsModule ?? {};
  const conditionsModule = protocol.conditionsModule ?? {};
  const armsModule = protocol.armsInterventionsModule ?? {};
  const designModule = protocol.designModule ?? {};

  const interventionList: string[] = (armsModule.interventions ?? []).map(
    (i: any) => i.name ?? ""
  );

  const phases: string[] = designModule.phases ?? [];

  return {
    nctId: identification.nctId ?? "",
    title: identification.officialTitle ?? identification.briefTitle ?? "",
    status: statusModule.overallStatus ?? "",
    sponsor: sponsorModule.leadSponsor?.name ?? "",
    conditions: conditionsModule.conditions ?? [],
    interventions: interventionList,
    phase: phases.join(", ") || "N/A",
    startDate: statusModule.startDateStruct?.date ?? "",
    studyType: designModule.studyType ?? "",
  };
}
