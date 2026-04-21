/**
 * ChEMBL API — Drug targets, mechanisms of action, and bioactivity data.
 * Free, no auth. Maintained by EMBL-EBI.
 * https://www.ebi.ac.uk/chembl/api/data/
 */

const BASE = "https://www.ebi.ac.uk/chembl/api/data";

export interface ChemblMolecule {
  chemblId: string;
  prefName: string;
  maxPhase: number; // 0-4 (4=approved)
  moleculeType: string;
  therapeuticFlags: boolean;
  firstApproval: number | null;
  oralFlag: boolean;
  injectableFlag: boolean;
  topicalFlag: boolean;
  indication: string;
}

export interface ChemblTarget {
  chemblId: string;
  prefName: string;
  targetType: string;
  organism: string;
  taxId: number;
}

export interface ChemblMechanism {
  mechanismOfAction: string;
  targetChemblId: string;
  targetName: string;
  actionType: string;
  directInteraction: boolean;
  moleculeChemblId: string;
}

export interface ChemblActivity {
  moleculeName: string;
  targetName: string;
  standardType: string;
  standardValue: number | null;
  standardUnits: string;
  assayType: string;
}

/**
 * Search for molecules (drugs) by name.
 */
export async function searchMolecules(query: string, limit = 20): Promise<ChemblMolecule[]> {
  try {
    const url = `${BASE}/molecule/search.json?q=${encodeURIComponent(query)}&limit=${limit}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    return (data?.molecules ?? []).map(mapMolecule);
  } catch {
    return [];
  }
}

/**
 * Get molecule by ChEMBL ID.
 */
export async function getMolecule(chemblId: string): Promise<ChemblMolecule | null> {
  try {
    const url = `${BASE}/molecule/${chemblId}.json`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    return mapMolecule(data);
  } catch {
    return null;
  }
}

/**
 * Get mechanisms of action for a molecule.
 */
export async function getMechanisms(chemblId: string): Promise<ChemblMechanism[]> {
  try {
    const url = `${BASE}/mechanism.json?molecule_chembl_id=${chemblId}&limit=20`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    return (data?.mechanisms ?? []).map((m: any) => ({
      mechanismOfAction: m.mechanism_of_action ?? "",
      targetChemblId: m.target_chembl_id ?? "",
      targetName: m.target_pref_name ?? "",
      actionType: m.action_type ?? "",
      directInteraction: m.direct_interaction ?? false,
      moleculeChemblId: m.molecule_chembl_id ?? "",
    }));
  } catch {
    return [];
  }
}

/**
 * Search for drug targets by name or indication.
 */
export async function searchTargets(query: string, limit = 20): Promise<ChemblTarget[]> {
  try {
    const url = `${BASE}/target/search.json?q=${encodeURIComponent(query)}&limit=${limit}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    return (data?.targets ?? []).map((t: any) => ({
      chemblId: t.target_chembl_id ?? "",
      prefName: t.pref_name ?? "",
      targetType: t.target_type ?? "",
      organism: t.organism ?? "",
      taxId: t.tax_id ?? 0,
    }));
  } catch {
    return [];
  }
}

/**
 * Get bioactivity data for a target.
 */
export async function getTargetActivities(
  targetChemblId: string,
  limit = 20
): Promise<ChemblActivity[]> {
  try {
    const url = `${BASE}/activity.json?target_chembl_id=${targetChemblId}&limit=${limit}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    return (data?.activities ?? []).map((a: any) => ({
      moleculeName: a.molecule_pref_name ?? a.molecule_chembl_id ?? "",
      targetName: a.target_pref_name ?? "",
      standardType: a.standard_type ?? "",
      standardValue: a.standard_value ? parseFloat(a.standard_value) : null,
      standardUnits: a.standard_units ?? "",
      assayType: a.assay_type ?? "",
    }));
  } catch {
    return [];
  }
}

/**
 * Get approved drugs for a specific target.
 */
export async function getApprovedDrugsForTarget(targetChemblId: string): Promise<ChemblMolecule[]> {
  try {
    const url = `${BASE}/mechanism.json?target_chembl_id=${targetChemblId}&limit=50`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    const molIds: string[] = [...new Set((data?.mechanisms ?? []).map((m: any) => m.molecule_chembl_id).filter(Boolean) as string[])];

    // Fetch molecule details for each (max 10 to avoid rate limits)
    const molecules = await Promise.allSettled(
      molIds.slice(0, 10).map(id => getMolecule(id))
    );
    return molecules
      .filter((r): r is PromiseFulfilledResult<ChemblMolecule | null> => r.status === "fulfilled" && r.value !== null)
      .map(r => r.value!);
  } catch {
    return [];
  }
}

function mapMolecule(m: any): ChemblMolecule {
  return {
    chemblId: m.molecule_chembl_id ?? "",
    prefName: m.pref_name ?? "",
    maxPhase: m.max_phase ?? 0,
    moleculeType: m.molecule_type ?? "",
    therapeuticFlags: m.therapeutic_flag ?? false,
    firstApproval: m.first_approval ?? null,
    oralFlag: m.oral ?? false,
    injectableFlag: m.parenteral ?? false,
    topicalFlag: m.topical ?? false,
    indication: m.indication_class ?? "",
  };
}
