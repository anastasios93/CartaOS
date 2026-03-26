export const THERAPEUTIC_AREAS = [
  "Oncology",
  "Immunology",
  "Neuroscience",
  "Cardiovascular",
  "Rare Disease",
  "Infectious Disease",
  "Metabolic",
  "Respiratory",
  "Ophthalmology",
  "Dermatology",
  "Gastroenterology",
  "Hematology",
  "Multi-therapeutic",
  "Other",
] as const;

/**
 * Maps a therapeutic area filter value to all equivalent names across DB and worldwide datasets.
 * Allows a single dropdown selection to match deals regardless of naming convention.
 */
export const TA_ALIASES: Record<string, string[]> = {
  "Oncology": ["Oncology"],
  "Immunology": ["Immunology"],
  "Neuroscience": ["Neuroscience", "Neurology", "CNS"],
  "Cardiovascular": ["Cardiovascular"],
  "Rare Disease": ["Rare Disease"],
  "Infectious Disease": ["Infectious Disease"],
  "Metabolic": ["Metabolic", "Metabolic / Endocrinology", "Endocrinology"],
  "Respiratory": ["Respiratory"],
  "Ophthalmology": ["Ophthalmology"],
  "Dermatology": ["Dermatology"],
  "Gastroenterology": ["Gastroenterology"],
  "Hematology": ["Hematology"],
  "Multi-therapeutic": ["Multi-therapeutic"],
  "Other": ["Other"],
};

/** Check if a deal's TA matches the selected filter TA (considering aliases) */
export function matchesTA(dealTA: string, filterTA: string): boolean {
  const aliases = TA_ALIASES[filterTA];
  if (!aliases) return dealTA.toLowerCase().includes(filterTA.toLowerCase());
  return aliases.some(alias => dealTA.toLowerCase().includes(alias.toLowerCase()));
}

/**
 * Maps a modality filter value to matching patterns across DB and worldwide datasets.
 * Each alias must be specific enough to avoid false positives.
 */
export const MODALITY_ALIASES: Record<string, string[]> = {
  "Small Molecule": ["Small Molecule", "PROTAC", "Molecular Glue", "Macrocycle", "Long-acting Injectable"],
  "Monoclonal Antibody (mAb)": ["Monoclonal Antibody", "mAb", "Checkpoint Inhibitor", "Immunotherapy"],
  "Antibody-Drug Conjugate (ADC)": ["ADC", "Antibody-Drug Conjugate", "AOC"],
  "Bispecific / Multispecific": ["Bispecific", "Trispecific", "Multi-specific", "Bispecific Platform", "T-cell Engager"],
  "Cell Therapy (CAR-T/NK)": ["CAR-T", "Cell Therapy", "TCR-T", "In Vivo CAR-T"],
  "Gene Therapy / Editing": ["Gene Therapy", "Gene Editing"],
  "mRNA": ["mRNA"],
  "RNA Therapeutics": ["siRNA", "ASO", "RNAi", "RNA/RNAi", "RNA Splice", "RNA (Circular)", "RNA"],
  "Vaccine": ["Vaccine"],
  "Peptide": ["Peptide", "Oral Peptide", "Peptide Platform"],
  "Protein / Biologic": ["Protein", "Enzyme", "Biologic", "Recombinant", "Tolerogenic"],
  "Radiopharmaceutical": ["Radiopharmaceutical"],
  "Other": ["Other", "AI Platform", "Nanoparticle", "Mixed"],
};

/** All named modality aliases (for "Other" catch-all logic) */
const ALL_NAMED_MODALITY_PATTERNS = Object.entries(MODALITY_ALIASES)
  .filter(([key]) => key !== "Other")
  .flatMap(([, aliases]) => aliases.map(a => a.toLowerCase()));

/** Check if a deal's modality matches the selected filter modality */
export function matchesModality(dealModality: string, filterModality: string): boolean {
  const aliases = MODALITY_ALIASES[filterModality];
  if (!aliases) return dealModality.toLowerCase().includes(filterModality.toLowerCase());

  // "Other" = catch-all for modalities that don't match any named category
  if (filterModality === "Other") {
    const dm = dealModality.toLowerCase();
    // If the deal modality matches ANY named alias, it's NOT "Other"
    const matchesNamed = ALL_NAMED_MODALITY_PATTERNS.some(p => dm.includes(p));
    if (matchesNamed) return false;
    return true; // Truly unmatched = "Other"
  }

  return aliases.some(alias => dealModality.toLowerCase().includes(alias.toLowerCase()));
}

export const MODALITIES = [
  "Small Molecule",
  "Monoclonal Antibody (mAb)",
  "Antibody-Drug Conjugate (ADC)",
  "Bispecific / Multispecific",
  "Cell Therapy (CAR-T/NK)",
  "Gene Therapy / Editing",
  "mRNA",
  "RNA Therapeutics",
  "Vaccine",
  "Peptide",
  "Protein / Biologic",
  "Radiopharmaceutical",
  "Other",
] as const;

export const DEAL_STAGES = [
  "DISCOVERY",
  "PRECLINICAL",
  "PHASE_1",
  "PHASE_2",
  "PHASE_3",
  "APPROVED",
] as const;

export const DEAL_TYPES = [
  "OUT_LICENSE",
  "IN_LICENSE",
  "COLLABORATION",
  "M_AND_A",
  "OPTION",
] as const;

export const STAGE_LABELS: Record<string, string> = {
  DISCOVERY: "Discovery",
  PRECLINICAL: "Preclinical",
  PHASE_1: "Phase 1",
  PHASE_2: "Phase 2",
  PHASE_3: "Phase 3",
  APPROVED: "Approved",
};

export const DEAL_TYPE_LABELS: Record<string, string> = {
  OUT_LICENSE: "Out-License",
  IN_LICENSE: "In-License",
  COLLABORATION: "Collaboration",
  M_AND_A: "M&A",
  OPTION: "Option",
};

export const NEGOTIATION_STATUS_LABELS: Record<string, string> = {
  INITIATED: "Initiated",
  TERM_SHEET_DRAFTING: "Term Sheet Drafting",
  TERM_SHEET_EXCHANGED: "Term Sheet Exchanged",
  DUE_DILIGENCE: "Due Diligence",
  DEFINITIVE_AGREEMENT: "Definitive Agreement",
  CLOSED: "Closed",
  DEAD: "Dead",
};

export const PARTNER_STATUS_LABELS: Record<string, string> = {
  IDENTIFIED: "Identified",
  CONTACTED: "Contacted",
  IN_DISCUSSION: "In Discussion",
  ACTIVE: "Active Deal",
  DECLINED: "Declined",
};

export const CLAUSE_TYPE_LABELS: Record<string, string> = {
  TERMINATION: "Termination",
  IP_OWNERSHIP: "IP Ownership",
  SUBLICENSING: "Sublicensing",
  DILIGENCE: "Diligence",
  MILESTONE_DEF: "Milestone Definition",
  DEVELOPMENT_OBLIGATION: "Development Obligation",
  DISPUTE_RESOLUTION: "Dispute Resolution",
  ANTI_SHELVING: "Anti-Shelving",
  ROYALTY_STEP_DOWN: "Royalty Step-Down",
  CHANGE_OF_CONTROL: "Change of Control",
};

// CartaOS brand colors (for use in JS-only contexts; prefer Tailwind classes)
export const COLORS = {
  primary: "#0F172A",   // dark slate
  accent: "#F97316",    // orange
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
} as const;
