export const THERAPEUTIC_AREAS = [
  "Oncology",
  "Immunology",
  "Neurology",
  "Cardiovascular",
  "Rare Disease",
  "Infectious Disease",
  "Metabolic / Endocrinology",
  "Respiratory",
  "Ophthalmology",
  "Dermatology",
  "Gastroenterology",
  "Hematology",
  "Gene Therapy",
  "Cell Therapy",
  "Other",
] as const;

export const MODALITIES = [
  "Small Molecule",
  "Monoclonal Antibody (mAb)",
  "Antibody-Drug Conjugate (ADC)",
  "Bispecific Antibody",
  "Cell Therapy (CAR-T/NK)",
  "Gene Therapy",
  "mRNA",
  "siRNA / ASO",
  "Peptide",
  "Protein / Enzyme",
  "Radiopharmaceutical",
  "Other",
] as const;

export const DEAL_STAGES = [
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
