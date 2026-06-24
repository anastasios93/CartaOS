/**
 * PubChem PUG-REST client (keyless).
 * Resolves a compound name to CID and core chemical properties.
 * Docs: https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest
 */

import { fetchJSON } from "./http";

const BASE_URL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound";

export interface PubChemCompound {
  cid: number;
  molecularFormula: string;
  molecularWeight: string;
  smiles: string;
  iupacName: string;
}

/**
 * Resolve a free-text compound name to its best PubChem compound profile.
 * Returns null when the name does not match any compound (404).
 *
 * @param name  Compound name (e.g. "aspirin")
 */
export async function searchPubChem(name: string): Promise<PubChemCompound | null> {
  // Step 1: resolve the name to a list of CIDs (404 = not found).
  let cid: number | undefined;
  try {
    const idData = await fetchJSON<{ IdentifierList?: { CID?: number[] } }>(
      `${BASE_URL}/name/${encodeURIComponent(name)}/cids/JSON`
    );
    cid = (idData.IdentifierList?.CID ?? [])[0];
  } catch {
    return null;
  }
  if (cid === undefined) {
    return null;
  }

  // Step 2: fetch core properties for the first CID.
  const propData = await fetchJSON<{ PropertyTable?: { Properties?: any[] } }>(
    `${BASE_URL}/cid/${encodeURIComponent(String(cid))}` +
      `/property/MolecularFormula,MolecularWeight,CanonicalSMILES,IUPACName/JSON`
  );

  const props = (propData.PropertyTable?.Properties ?? [])[0] ?? {};

  return {
    cid: props.CID ?? cid,
    molecularFormula: props.MolecularFormula ?? "",
    molecularWeight: props.MolecularWeight != null ? String(props.MolecularWeight) : "",
    smiles: props.CanonicalSMILES ?? "",
    iupacName: props.IUPACName ?? "",
  };
}
