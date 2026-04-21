/**
 * OpenFDA FAERS Adverse Events API.
 * Free, no auth. Reports adverse drug events since 2004.
 * https://open.fda.gov/apis/drug/event/
 */

const BASE = "https://api.fda.gov/drug/event.json";

export interface AdverseEvent {
  safetyReportId: string;
  receiveDate: string;
  serious: boolean;
  seriousOutcomes: string[];
  drugName: string;
  drugIndication: string;
  reactions: string[];
  patientAge: string | null;
  patientSex: string | null;
  reporterCountry: string;
}

export interface AdverseEventResult {
  results: AdverseEvent[];
  totalCount: number;
}

export interface AdverseEventCount {
  term: string;
  count: number;
}

/**
 * Search adverse events for a drug by name.
 */
export async function searchAdverseEvents(
  drugName: string,
  limit = 20,
  skip = 0
): Promise<AdverseEventResult> {
  try {
    const search = `patient.drug.medicinalproduct:"${drugName}"`;
    const url = `${BASE}?search=${encodeURIComponent(search)}&limit=${limit}&skip=${skip}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return { results: [], totalCount: 0 };

    const data = await res.json();
    const events = data?.results ?? [];

    const results: AdverseEvent[] = events.map((ev: any) => {
      const drug = ev.patient?.drug?.[0] ?? {};
      return {
        safetyReportId: ev.safetyreportid ?? "",
        receiveDate: ev.receivedate ?? "",
        serious: ev.serious === "1",
        seriousOutcomes: [
          ev.seriousnessdeath === "1" ? "Death" : null,
          ev.seriousnesshospitalization === "1" ? "Hospitalization" : null,
          ev.seriousnesslifethreatening === "1" ? "Life-threatening" : null,
          ev.seriousnessdisabling === "1" ? "Disability" : null,
        ].filter(Boolean) as string[],
        drugName: drug.medicinalproduct ?? drugName,
        drugIndication: drug.drugindication ?? "",
        reactions: (ev.patient?.reaction ?? []).map((r: any) => r.reactionmeddrapt).filter(Boolean),
        patientAge: ev.patient?.patientonsetage ? `${ev.patient.patientonsetage} ${ev.patient.patientonsetageunit ?? ""}`.trim() : null,
        patientSex: ev.patient?.patientsex === "1" ? "Male" : ev.patient?.patientsex === "2" ? "Female" : null,
        reporterCountry: ev.occurcountry ?? "",
      };
    });

    return { results, totalCount: data?.meta?.results?.total ?? results.length };
  } catch {
    return { results: [], totalCount: 0 };
  }
}

/**
 * Get top adverse reactions for a drug (aggregated counts).
 */
export async function getTopAdverseReactions(
  drugName: string,
  limit = 10
): Promise<AdverseEventCount[]> {
  try {
    const search = `patient.drug.medicinalproduct:"${drugName}"`;
    const url = `${BASE}?search=${encodeURIComponent(search)}&count=patient.reaction.reactionmeddrapt.exact&limit=${limit}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return [];

    const data = await res.json();
    return (data?.results ?? []).map((r: any) => ({ term: r.term ?? "", count: r.count ?? 0 }));
  } catch {
    return [];
  }
}

/**
 * Get total adverse event count for a drug.
 */
export async function getAdverseEventTotal(drugName: string): Promise<number> {
  try {
    const search = `patient.drug.medicinalproduct:"${drugName}"`;
    const url = `${BASE}?search=${encodeURIComponent(search)}&limit=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return 0;
    const data = await res.json();
    return data?.meta?.results?.total ?? 0;
  } catch {
    return 0;
  }
}
