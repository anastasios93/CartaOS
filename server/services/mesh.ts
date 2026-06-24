/**
 * NLM MeSH (Medical Subject Headings) term lookup client.
 * Resolves free-text labels to MeSH descriptor UIs — keyless.
 * Docs: https://id.nlm.nih.gov/mesh/swagger/ui
 * Auth: none.
 */

import { fetchJSON } from "./http";

const BASE_URL = "https://id.nlm.nih.gov/mesh/lookup/term";

export interface MeshTerm {
  descriptorUI: string;
  label: string;
}

interface MeshRaw {
  resource?: string;
  label?: string;
}

/**
 * Look up MeSH terms whose label contains the given text.
 *
 * @param term   Free-text term fragment.
 * @param limit  Max results to return (default 10).
 */
export async function searchMesh(term: string, limit = 10): Promise<MeshTerm[]> {
  const url = `${BASE_URL}?label=${encodeURIComponent(term)}&match=contains&limit=${limit}`;
  const data = await fetchJSON<MeshRaw[]>(url);

  const rows = Array.isArray(data) ? data : [];
  return rows.map((r) => {
    const resource = r.resource ?? "";
    const descriptorUI = resource.split("/").pop() ?? "";
    return {
      descriptorUI,
      label: r.label ?? "",
    };
  });
}
