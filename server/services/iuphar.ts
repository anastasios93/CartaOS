/**
 * IUPHAR/BPS Guide to Pharmacology client (keyless).
 * Expert-curated ligand and target pharmacology data.
 * Docs: https://www.guidetopharmacology.org/webServices.jsp
 */

import { fetchJSON } from "./http";

const BASE_URL = "https://www.guidetopharmacology.org/services/ligands";

export interface IupharLigand {
  ligandId: number;
  name: string;
  type: string;
  approved: boolean;
}

/**
 * Search the Guide to Pharmacology for ligands matching a name.
 *
 * @param name   Ligand name (mapped to `name`)
 * @param limit  Max results to return (default 10)
 */
export async function searchIuphar(name: string, limit = 10): Promise<IupharLigand[]> {
  const url = `${BASE_URL}?name=${encodeURIComponent(name)}`;

  const data = await fetchJSON<any[]>(url);
  const ligands: any[] = Array.isArray(data) ? data : [];

  return ligands.slice(0, limit).map((l) => ({
    ligandId: l.ligandId ?? 0,
    name: l.name ?? "",
    type: l.type ?? "",
    approved: l.approved === true,
  }));
}
