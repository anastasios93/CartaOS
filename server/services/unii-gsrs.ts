/**
 * FDA GSRS (Global Substance Registration System) / UNII client.
 * Authoritative substance identifiers (UNII codes) — keyless.
 * Docs: https://gsrs.ncats.nih.gov/#/api
 * Auth: none.
 */

import { fetchJSON } from "./http";

const BASE_URL = "https://gsrs.ncats.nih.gov/api/v1/substances/search";

export interface UniiSubstance {
  unii: string;
  name: string;
  substanceClass: string;
  approvalID: string;
}

interface GsrsRaw {
  content?: {
    uuid?: string;
    unii?: string;
    approvalID?: string;
    substanceClass?: string;
    names?: { name?: string; displayName?: boolean }[];
    _name?: string;
  }[];
}

/**
 * Search GSRS for substances by name, returning normalized UNII records.
 *
 * @param name   Substance name fragment.
 * @param limit  Max results to return (default 10).
 */
export async function searchUnii(name: string, limit = 10): Promise<UniiSubstance[]> {
  const url = `${BASE_URL}?q=${encodeURIComponent(name)}&top=${limit}`;
  const data = await fetchJSON<GsrsRaw>(url);

  const content = data.content ?? [];
  return content.map((substance) => {
    const names = substance.names ?? [];
    const resolvedName =
      substance._name ??
      names.find((n) => n.displayName)?.name ??
      names[0]?.name ??
      "";
    return {
      unii: substance.unii ?? substance.approvalID ?? "",
      name: resolvedName,
      substanceClass: substance.substanceClass ?? "",
      approvalID: substance.approvalID ?? "",
    };
  });
}
