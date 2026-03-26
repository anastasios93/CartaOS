/**
 * Worldwide pharma/biotech deal economics dataset
 * Compiled from public sources: BioSpace, Labiotech, FiercePharma, Nature,
 * Blue Matter Consulting, Vision Lifesciences, JP Morgan, press releases.
 *
 * All financial values normalized to $M (millions USD).
 * Last updated: March 2026
 */

export interface WorldwideDeal {
  id: string;
  licensor: string;
  licensee: string;
  title: string;
  therapeuticArea: string;
  dealType: "LICENSE" | "COLLABORATION" | "M_AND_A" | "OPTION";
  stage: "DISCOVERY" | "PRECLINICAL" | "PHASE_1" | "PHASE_2" | "PHASE_3" | "APPROVED";
  modality: string;
  upfrontPayment?: number;   // $M
  totalDealValue?: number;   // $M
  milestones?: number;       // $M
  royaltyLow?: number;       // %
  royaltyHigh?: number;      // %
  announcedDate: string;     // YYYY-MM-DD
  source: string;
  sourceUrl?: string;
  geography?: string;
  indication?: string;
}

let _id = 0;
const d = (
  licensor: string, licensee: string, ta: string, type: WorldwideDeal["dealType"],
  stage: WorldwideDeal["stage"], modality: string,
  upfront: number | undefined, total: number | undefined, milestones: number | undefined,
  royLow: number | undefined, royHigh: number | undefined,
  date: string, source: string, geo?: string, indication?: string, url?: string
): WorldwideDeal => ({
  id: `wd-${++_id}`,
  licensor, licensee,
  title: `${licensee}–${licensor}`,
  therapeuticArea: ta, dealType: type, stage, modality,
  upfrontPayment: upfront, totalDealValue: total, milestones,
  royaltyLow: royLow, royaltyHigh: royHigh,
  announcedDate: date, source, geography: geo, indication, sourceUrl: url,
});

export const WORLDWIDE_DEALS: WorldwideDeal[] = [
  // ═══════════════════════════════════════════════════════════════
  // 2025-2026 MEGA DEALS
  // ═══════════════════════════════════════════════════════════════

  // Obesity / GLP-1 / Metabolic
  d("CSPC Pharmaceutical", "AstraZeneca", "Metabolic", "LICENSE", "PHASE_1", "Small Molecule",
    1200, 18500, undefined, undefined, undefined, "2026-01-30", "Vision Lifesciences", "Global", "Obesity"),
  d("Hengrui Pharma", "GSK", "Multi-therapeutic", "LICENSE", "PHASE_2", "Mixed",
    500, 12500, 12000, undefined, undefined, "2025-07-28", "FiercePharma", "Global", "Respiratory/Oncology/I&I"),
  d("Zealand Pharma", "Roche", "Metabolic", "COLLABORATION", "PHASE_2", "Peptide",
    1650, 5300, 3600, 10, 18, "2025-03-01", "Labiotech", "Global", "Obesity"),
  d("Septerna", "Novo Nordisk", "Metabolic", "COLLABORATION", "DISCOVERY", "Small Molecule",
    195, 2200, 2005, undefined, undefined, "2025-05-01", "Labiotech", "Global", "Obesity/T2D"),
  d("Superluminal Medicines", "Eli Lilly", "Metabolic", "COLLABORATION", "DISCOVERY", "Small Molecule",
    undefined, 1300, undefined, undefined, undefined, "2025-08-14", "Labiotech", "Global", "Obesity"),
  d("Gubra", "AbbVie", "Metabolic", "LICENSE", "PHASE_1", "Peptide",
    350, 2225, 1875, undefined, undefined, "2025-03-01", "Labiotech", "Global", "Obesity"),
  d("United Laboratories", "Novo Nordisk", "Metabolic", "LICENSE", "PHASE_2", "Peptide",
    200, 2000, 1800, undefined, undefined, "2025-03-01", "Labiotech", "Ex-China", "Obesity"),
  d("Hansoh Pharma", "Regeneron", "Metabolic", "LICENSE", "PHASE_3", "Peptide",
    80, 2010, 1930, 10, 12, "2025-06-01", "Labiotech", "Global", "Obesity"),
  d("Metsera", "Pfizer", "Metabolic", "M_AND_A", "PHASE_1", "Peptide",
    7000, 10000, 3000, undefined, undefined, "2025-11-01", "BioSpace", "Global", "Obesity"),
  d("Sciwind Biosciences", "Verdiva Bio", "Metabolic", "LICENSE", "PRECLINICAL", "Peptide",
    70, 2470, 2400, undefined, undefined, "2025-01-10", "Blue Matter", "Global", "Obesity"),
  d("CSPC Pharmaceutical", "Madrigal", "Metabolic", "LICENSE", "PRECLINICAL", "Small Molecule",
    120, 2120, 2000, undefined, undefined, "2025-07-01", "FiercePharma", "Global", "MASH/GLP-1"),
  d("Hengrui Medicine", "Kailera Therapeutics", "Metabolic", "LICENSE", "PHASE_2", "Peptide",
    100, 6035, 5935, undefined, undefined, "2024-05-01", "SCMP", "Ex-China", "GLP-1"),

  // Oncology — Bispecifics, ADCs, T-cell engagers
  // $1.5B upfront + $2B non-contingent anniversary payments + $7.6B contingent milestones = $11.1B
  d("BioNTech", "Bristol Myers Squibb", "Oncology", "COLLABORATION", "PHASE_3", "Bispecific Antibody",
    3500, 11100, 7600, undefined, undefined, "2025-06-02", "Labiotech", "Global", "NSCLC/SCLC"),
  d("3SBio", "Pfizer", "Oncology", "LICENSE", "PHASE_3", "Bispecific Antibody",
    1250, 6150, 4800, 10, 15, "2025-05-01", "Labiotech", "Ex-China", "Solid Tumors"),
  d("Akeso", "Summit Therapeutics", "Oncology", "LICENSE", "PHASE_3", "Bispecific Antibody",
    500, 5000, 4500, 10, 12, "2022-12-06", "Vision Lifesciences", "Ex-China", "Solid Tumors"),
  d("Xilio Therapeutics", "AbbVie", "Oncology", "COLLABORATION", "PRECLINICAL", "T-cell Engager",
    52, 2150, 2100, undefined, undefined, "2025-02-01", "Labiotech", "Global", "Solid Tumors"),
  d("Orionis Biosciences", "Genentech", "Oncology", "COLLABORATION", "DISCOVERY", "Molecular Glue",
    105, 2100, 2000, undefined, undefined, "2025-03-01", "Labiotech", "Global", "Cancer"),
  d("Neomorph", "AbbVie", "Oncology", "OPTION", "DISCOVERY", "Molecular Glue",
    undefined, 1640, 1640, undefined, undefined, "2025-01-01", "Labiotech", "Global", "Cancer"),
  d("Ichnos Glenmark", "AbbVie", "Oncology", "LICENSE", "PHASE_1", "Trispecific Antibody",
    700, 1925, 1225, 10, 15, "2025-07-01", "Labiotech", "Global", "Multiple Myeloma"),
  d("Evopoint Biosciences", "Astellas", "Oncology", "LICENSE", "PHASE_1", "ADC",
    130, 1540, 1340, undefined, undefined, "2025-05-01", "Labiotech", "Global", "Solid Tumors"),
  d("Philochem", "RayzeBio/BMS", "Oncology", "LICENSE", "PHASE_1", "Radiopharmaceutical",
    350, 1350, 1000, 5, 12, "2025-06-01", "Labiotech", "Global", "Prostate Cancer"),
  d("Magnet Biomedicine", "Eli Lilly", "Oncology", "COLLABORATION", "DISCOVERY", "Molecular Glue",
    40, 1290, 1250, undefined, undefined, "2025-02-01", "Labiotech", "Global", "Cancer"),
  d("Synaffix/Lonza", "Boehringer Ingelheim", "Oncology", "LICENSE", "PRECLINICAL", "ADC Platform",
    undefined, 1300, 1300, undefined, undefined, "2025-01-01", "Labiotech", "Global", "Cancer"),
  d("Innovent Biologics", "Roche", "Oncology", "LICENSE", "PHASE_1", "ADC",
    80, 1080, 1000, undefined, undefined, "2025-01-01", "Labiotech", "Global", "SCLC"),
  d("DualityBio", "Avenzo Therapeutics", "Oncology", "LICENSE", "PRECLINICAL", "ADC",
    50, 1200, 1150, undefined, undefined, "2025-01-01", "Labiotech", "Global", "Solid Tumors"),
  d("Hengrui Pharma", "Glenmark", "Oncology", "LICENSE", "PHASE_2", "ADC",
    18, 1111, 1093, undefined, undefined, "2025-09-01", "Labiotech", "Global", "HER2+ Tumors"),
  d("Innovent Biologics", "Takeda", "Oncology", "LICENSE", "PHASE_2", "Mixed",
    1200, 11400, 10200, undefined, undefined, "2025-10-21", "FiercePharma", "Ex-China", "Cancer"),
  d("RemeGen", "AbbVie", "Oncology", "LICENSE", "PHASE_2", "ADC Platform",
    650, 5600, 4950, undefined, undefined, "2026-01-01", "Vision Lifesciences", "Global", "Cancer"),
  d("LaNova Medicines", "Merck", "Oncology", "LICENSE", "PHASE_2", "Bispecific Antibody",
    588, 3288, 2700, undefined, undefined, "2024-11-01", "Labiotech", "Global", "Cancer"),
  d("Curon Biopharmaceutical", "Merck", "Oncology", "LICENSE", "PHASE_1", "Bispecific Antibody",
    700, 1300, 600, undefined, undefined, "2024-08-01", "Labiotech", "Global", "NHL/ALL"),
  // Note: $13B is aggregated across 18 ADC targets (platform deal), not a single-asset value
  d("GeneQuantum", "Biohaven/AimedBio", "Oncology", "LICENSE", "PRECLINICAL", "ADC",
    undefined, 13000, undefined, undefined, undefined, "2025-01-01", "SCMP", "Global", "Cancer"),
  d("Simcere Zaiming", "AbbVie", "Oncology", "OPTION", "PHASE_1", "Trispecific Antibody",
    undefined, 1055, 1055, undefined, undefined, "2025-01-01", "Labiotech", "Global", "Multiple Myeloma"),
  d("Prolium Biosciences", "InnoCare/KeyMed", "Oncology", "LICENSE", "PHASE_1", "Bispecific Antibody",
    18, 520, 502, undefined, undefined, "2025-01-01", "Labiotech", "Global", "Cancer"),

  // Neuroscience / CNS
  d("Intra-Cellular Therapies", "Johnson & Johnson", "Neuroscience", "M_AND_A", "APPROVED", "Small Molecule",
    14600, 14600, 0, undefined, undefined, "2025-01-01", "BioSpace", "Global", "Bipolar Depression/Schizophrenia"),
  d("PTC Therapeutics", "Novartis", "Neuroscience", "LICENSE", "PHASE_2", "Small Molecule",
    1000, 2900, 1900, undefined, undefined, "2024-12-01", "BioSpace", "Global", "Huntington's Disease"),
  d("BioArctic", "Bristol Myers Squibb", "Neuroscience", "LICENSE", "PRECLINICAL", "Monoclonal Antibody",
    100, 1350, 1250, undefined, undefined, "2024-12-01", "BioSpace", "Global", "Alzheimer's Disease"),
  d("Avidity Biosciences", "Novartis", "Neuroscience", "M_AND_A", "PHASE_3", "AOC",
    12000, 12000, 0, undefined, undefined, "2025-10-01", "Labiotech", "Global", "Neuromuscular Diseases"),
  d("Lynk Pharmaceuticals", "Formation Bio", "Neuroscience", "LICENSE", "PRECLINICAL", "Small Molecule",
    undefined, 605, 605, undefined, undefined, "2025-12-01", "Labiotech", "Global", "Multiple Sclerosis"),
  d("Arrowhead Pharma", "Novartis", "Neuroscience", "LICENSE", "PRECLINICAL", "siRNA",
    200, 2200, 2000, undefined, undefined, "2025-09-01", "Labiotech", "Global", "Neurodegeneration"),
  d("Scorpion Therapeutics", "Eli Lilly", "Oncology", "M_AND_A", "PHASE_1", "Small Molecule",
    1000, 2500, 1500, undefined, undefined, "2025-01-01", "Labiotech", "Global", "Breast Cancer"),
  d("Aliada Therapeutics", "AbbVie", "Neuroscience", "M_AND_A", "PRECLINICAL", "Monoclonal Antibody",
    1400, 1400, 0, undefined, undefined, "2024-10-01", "Labiotech", "Global", "Alzheimer's Disease"),
  d("AC Immune", "Takeda", "Neuroscience", "LICENSE", "PHASE_2", "Immunotherapy",
    100, 2200, 2100, undefined, undefined, "2024-05-01", "Labiotech", "Global", "Alzheimer's Disease"),

  // MASH / Liver
  d("Boston Pharmaceuticals", "GSK", "Metabolic", "M_AND_A", "PHASE_2", "Biologic",
    1200, 2000, 800, undefined, undefined, "2025-05-01", "FiercePharma", "Global", "MASH"),
  d("89bio", "Roche", "Metabolic", "M_AND_A", "PHASE_3", "Biologic",
    2400, 3500, 1100, undefined, undefined, "2025-09-01", "Roche", "Global", "MASH"),
  d("Akero Therapeutics", "Novo Nordisk", "Metabolic", "M_AND_A", "PHASE_2", "Biologic",
    4700, 5200, 500, undefined, undefined, "2025-08-01", "Xtalks", "Global", "MASH"),
  d("Ochre Bio", "Boehringer Ingelheim", "Metabolic", "COLLABORATION", "PRECLINICAL", "RNA",
    35, 1300, 1265, undefined, undefined, "2024-05-01", "Pharma Technology", "Global", "MASH Cirrhosis"),
  d("Ribo", "Boehringer Ingelheim", "Metabolic", "COLLABORATION", "PRECLINICAL", "RNA",
    undefined, 2000, undefined, undefined, undefined, "2024-01-01", "Labiotech", "Global", "Liver Disease"),

  // Cardiovascular
  d("Shanghai Argo", "Novartis", "Cardiovascular", "LICENSE", "PHASE_1", "Small Molecule",
    185, 4165, 3980, undefined, undefined, "2024-01-01", "BioSpace", "Global", "Cardiovascular"),
  d("Argo Biopharmaceutical", "Novartis", "Cardiovascular", "LICENSE", "PRECLINICAL", "siRNA",
    160, 5360, 5200, undefined, undefined, "2025-09-01", "Labiotech", "Global", "Dyslipidemia"),
  d("Hengrui Pharma", "Braveheart Bio", "Cardiovascular", "LICENSE", "PHASE_2", "Small Molecule",
    65, 1078, 1013, undefined, undefined, "2025-09-01", "Labiotech", "Global", "Cardiology"),
  d("Tourmaline Bio", "Novartis", "Cardiovascular", "M_AND_A", "PHASE_2", "Monoclonal Antibody",
    1400, 1400, 0, undefined, undefined, "2025-09-01", "Labiotech", "Global", "CV Inflammation"),
  d("Verve Therapeutics", "Eli Lilly", "Cardiovascular", "M_AND_A", "PHASE_1", "Gene Editing",
    1000, 1300, 300, undefined, undefined, "2025-07-25", "BioSpace", "Global", "ASCVD"),
  d("Cardior Pharmaceuticals", "Novo Nordisk", "Cardiovascular", "LICENSE", "PHASE_2", "RNA",
    undefined, 1110, 1110, undefined, undefined, "2024-03-01", "Labiotech", "Global", "MI"),

  // Immunology / Autoimmune / Inflammation
  d("Sanofi (Sino Biopharm)", "Sanofi", "Immunology", "LICENSE", "PHASE_2", "Small Molecule",
    135, 1530, 1395, undefined, undefined, "2025-06-01", "FiercePharma", "Global", "Autoimmune"),
  d("Celsius Therapeutics", "AbbVie", "Immunology", "LICENSE", "PHASE_1", "Monoclonal Antibody",
    250, undefined, undefined, undefined, undefined, "2024-06-01", "Labiotech", "Global", "IBD"),
  d("Leo Pharma", "Gilead", "Immunology", "LICENSE", "PRECLINICAL", "Small Molecule",
    250, 1700, 1450, undefined, undefined, "2025-01-01", "Labiotech", "Global", "Inflammatory Diseases"),
  d("Enlaza", "Vertex", "Immunology", "LICENSE", "PRECLINICAL", "T-cell Engager",
    45, 2400, 2355, undefined, undefined, "2025-09-01", "Labiotech", "Global", "Autoimmune"),
  d("Chimagen Biosciences", "GSK", "Immunology", "LICENSE", "PHASE_1", "T-cell Engager",
    300, 850, 550, undefined, undefined, "2024-10-01", "Labiotech", "Global", "Lupus"),
  d("OSE Immunotherapeutics", "AbbVie", "Immunology", "LICENSE", "PHASE_1", "Monoclonal Antibody",
    48, 713, 665, undefined, undefined, "2024-03-01", "Labiotech", "Global", "Inflammation"),
  d("OMass Therapeutics", "Genentech", "Immunology", "LICENSE", "PRECLINICAL", "Small Molecule",
    20, 400, 380, undefined, undefined, "2025-09-01", "Labiotech", "Global", "IBD"),
  d("Windward Bio", "Harbour BioMed", "Immunology", "LICENSE", "PRECLINICAL", "Monoclonal Antibody",
    undefined, 970, 970, undefined, undefined, "2025-01-01", "Labiotech", "Global", "Immune Diseases"),
  d("Monte Rosa Therapeutics", "Novartis", "Immunology", "LICENSE", "PRECLINICAL", "Molecular Glue",
    120, undefined, undefined, undefined, undefined, "2025-09-01", "Labiotech", "Global", "Immune-mediated"),

  // Rare Disease / Gene Therapy
  d("Blueprint Medicines", "Sanofi", "Rare Disease", "M_AND_A", "APPROVED", "Small Molecule",
    9100, 9500, 400, undefined, undefined, "2025-06-02", "BioSpace", "Global", "Systemic Mastocytosis"),
  d("Arrowhead Pharmaceuticals", "Sarepta", "Rare Disease", "LICENSE", "PHASE_1", "RNA/RNAi",
    500, 1075, undefined, undefined, undefined, "2024-11-01", "BioSpace", "Global", "Rare Muscular"),
  d("Prime Medicine", "Bristol Myers Squibb", "Rare Disease", "COLLABORATION", "PRECLINICAL", "Gene Editing",
    110, 3610, 3500, undefined, undefined, "2024-09-01", "BioSpace", "Global", "Cell Therapy"),
  d("Kate Therapeutics", "Novartis", "Rare Disease", "M_AND_A", "PRECLINICAL", "Gene Therapy",
    undefined, 1100, undefined, undefined, undefined, "2024-11-01", "Labiotech", "Global", "Neuromuscular"),
  d("Sangamo Therapeutics", "Astellas", "Rare Disease", "LICENSE", "PRECLINICAL", "Gene Therapy",
    20, 1320, 1300, undefined, undefined, "2024-12-01", "BioSpace", "Global", "Neurological"),
  d("Regenxbio", "Nippon Shinyaku", "Rare Disease", "LICENSE", "PHASE_1", "Gene Therapy",
    110, 810, 700, undefined, undefined, "2025-01-01", "Labiotech", "Global", "Hunter/Hurler Syndrome"),
  d("Orna Therapeutics", "Vertex", "Rare Disease", "LICENSE", "PRECLINICAL", "RNA (Circular)",
    65, 4350, 4285, undefined, undefined, "2025-01-01", "Vision Lifesciences", "Global", "Gene Therapy Platform"),
  d("Orna Therapeutics", "Eli Lilly", "Immunology", "M_AND_A", "PRECLINICAL", "CAR-T",
    undefined, 2400, undefined, undefined, undefined, "2026-02-01", "Vision Lifesciences", "Global", "Autoimmune"),
  d("Arbor Biotech", "Chiesi Group", "Rare Disease", "LICENSE", "PRECLINICAL", "Gene Therapy",
    115, 2100, 2000, undefined, undefined, "2025-10-01", "Vision Lifesciences", "Global", "Gene Therapy"),
  d("Pregene Biopharma", "Kite/Gilead", "Oncology", "LICENSE", "PRECLINICAL", "CAR-T",
    undefined, 1640, undefined, undefined, undefined, "2025-06-01", "Vision Lifesciences", "Global", "In Vivo CAR-T"),
  d("IDRx", "GSK", "Oncology", "M_AND_A", "PHASE_1", "Small Molecule",
    undefined, 1000, undefined, undefined, undefined, "2025-01-01", "Labiotech", "Global", "GIST"),
  d("AviadoBio", "Astellas", "Neuroscience", "LICENSE", "PRECLINICAL", "Gene Therapy",
    30, 2180, 2150, undefined, undefined, "2024-10-01", "Labiotech", "Global", "Neurological"),

  // Respiratory
  d("Verona Pharma", "Merck", "Respiratory", "M_AND_A", "APPROVED", "Small Molecule",
    10000, 10000, 0, undefined, undefined, "2025-07-09", "BioSpace", "Global", "COPD"),
  d("Aiolos Bio", "GSK", "Respiratory", "M_AND_A", "PHASE_2", "Monoclonal Antibody",
    1000, 1400, 400, undefined, undefined, "2024-01-01", "Labiotech", "Global", "Asthma"),
  d("Flagship Pioneering", "GSK", "Respiratory", "COLLABORATION", "DISCOVERY", "Mixed",
    undefined, 720, 720, undefined, undefined, "2024-07-01", "Labiotech", "Global", "Respiratory/Immunology"),

  // Vaccines
  d("Novavax", "Sanofi", "Infectious Disease", "LICENSE", "APPROVED", "Vaccine",
    500, 1200, 700, undefined, undefined, "2024-05-01", "BioSpace", "Global", "COVID-19/Flu"),

  // Platforms / Multi-indication
  d("PeptiDream", "Novartis", "Multi-therapeutic", "COLLABORATION", "DISCOVERY", "Peptide Platform",
    180, 2890, 2710, undefined, undefined, "2024-04-01", "BioSpace", "Global", "Multi-indication"),
  d("MediLink Therapeutics", "BioNTech", "Oncology", "LICENSE", "PRECLINICAL", "ADC Platform",
    25, 1825, 1800, undefined, undefined, "2024-05-01", "Labiotech", "Global", "Cancer"),
  d("Biotheus", "BioNTech", "Oncology", "LICENSE", "PHASE_2", "Monoclonal Antibody",
    800, 950, 150, undefined, undefined, "2024-11-01", "Labiotech", "Global", "Cancer"),

  // Radiopharmaceuticals
  d("Mariana Oncology", "Novartis", "Oncology", "M_AND_A", "PRECLINICAL", "Radiopharmaceutical",
    1000, 1750, 750, undefined, undefined, "2024-05-01", "Labiotech", "Global", "Cancer"),
  d("Aktis Oncology", "Eli Lilly", "Oncology", "LICENSE", "PRECLINICAL", "Radiopharmaceutical",
    60, 1160, 1100, undefined, undefined, "2024-05-01", "Labiotech", "Global", "Cancer"),
  d("Fusion Pharmaceuticals", "AstraZeneca", "Oncology", "M_AND_A", "PHASE_2", "Radiopharmaceutical",
    2400, 2400, 0, undefined, undefined, "2024-03-01", "Labiotech", "Global", "Prostate Cancer"),

  // Additional 2024 deals from Labiotech tracker
  d("Tentarix Biotherapeutics", "AbbVie", "Oncology", "LICENSE", "PRECLINICAL", "Multi-specific Biologic",
    64, undefined, undefined, undefined, undefined, "2024-02-01", "Labiotech", "Global", "Cancer"),
  d("Landos Biopharma", "AbbVie", "Immunology", "LICENSE", "PHASE_2", "Small Molecule",
    137, 212, 75, undefined, undefined, "2024-03-01", "Labiotech", "Global", "Ulcerative Colitis"),
  d("Medincell", "AbbVie", "Multi-therapeutic", "COLLABORATION", "PRECLINICAL", "Long-acting Injectable",
    35, 1935, 1900, undefined, undefined, "2024-04-01", "Labiotech", "Global", "Multiple"),
  d("Nimble Therapeutics", "AbbVie", "Immunology", "LICENSE", "PRECLINICAL", "Oral Peptide",
    200, undefined, undefined, undefined, undefined, "2024-12-01", "Labiotech", "Global", "Psoriasis"),
  d("Poseida Therapeutics", "Astellas", "Oncology", "COLLABORATION", "PRECLINICAL", "Cell Therapy",
    50, 600, 550, undefined, undefined, "2024-05-01", "Labiotech", "Global", "Cancer"),
  d("Nona Biosciences", "AstraZeneca", "Oncology", "LICENSE", "PRECLINICAL", "Monoclonal Antibody",
    19, 604, 585, undefined, undefined, "2024-05-01", "Labiotech", "Global", "Cancer"),
  d("CSPC Pharmaceutical", "AstraZeneca", "Cardiovascular", "LICENSE", "PRECLINICAL", "Small Molecule",
    100, 2020, 1920, undefined, undefined, "2024-10-01", "Labiotech", "Global", "Lipid-lowering"),
  d("Dewpoint Therapeutics", "Bayer", "Cardiovascular", "LICENSE", "PRECLINICAL", "Small Molecule",
    undefined, 424, undefined, undefined, undefined, "2024-10-01", "Labiotech", "Global", "Heart Disease"),
  d("NextRNA Therapeutics", "Bayer", "Oncology", "LICENSE", "PRECLINICAL", "Small Molecule",
    undefined, 547, 547, undefined, undefined, "2024-08-01", "Labiotech", "Global", "Cancer"),
  d("VantAI", "Bristol Myers Squibb", "Oncology", "COLLABORATION", "DISCOVERY", "Molecular Glue",
    undefined, 674, 674, undefined, undefined, "2024-02-01", "Labiotech", "Global", "Cancer"),
  d("SEED Therapeutics", "Eisai", "Multi-therapeutic", "LICENSE", "DISCOVERY", "Molecular Glue",
    undefined, 1500, 1500, undefined, undefined, "2024-08-01", "Labiotech", "Global", "Multiple"),
  d("Isomorphic Labs", "Eli Lilly", "Multi-therapeutic", "COLLABORATION", "DISCOVERY", "AI Platform",
    45, 1745, 1700, undefined, undefined, "2024-01-01", "Labiotech", "Global", "Multiple"),
  d("Morphic", "Eli Lilly", "Immunology", "M_AND_A", "PHASE_2", "Small Molecule",
    3200, 3200, 0, undefined, undefined, "2024-07-01", "Labiotech", "Global", "IBD"),
  d("HAYA Therapeutics", "Eli Lilly", "Metabolic", "COLLABORATION", "DISCOVERY", "RNA",
    undefined, 1000, 1000, undefined, undefined, "2024-09-01", "Labiotech", "Global", "Metabolic Disease"),
  d("Adaptimmune", "Galapagos", "Oncology", "LICENSE", "PHASE_1", "TCR-T Cell Therapy",
    100, 665, 565, undefined, undefined, "2024-06-01", "Labiotech", "Global", "Head & Neck Cancer"),
  d("Genentech (GenEdit)", "Genentech", "Immunology", "LICENSE", "PRECLINICAL", "Nanoparticle",
    15, 644, 629, undefined, undefined, "2024-01-01", "Labiotech", "Global", "Autoimmune"),
  d("Regor Pharmaceuticals", "Genentech", "Oncology", "M_AND_A", "PHASE_2", "Small Molecule",
    850, undefined, undefined, undefined, undefined, "2024-09-01", "Labiotech", "Global", "Breast Cancer"),
  d("COUR Pharmaceuticals", "Genentech", "Immunology", "LICENSE", "PRECLINICAL", "Tolerogenic Therapy",
    40, 940, 900, undefined, undefined, "2024-12-01", "Labiotech", "Global", "Autoimmune"),
  d("CymaBay Therapeutics", "Gilead", "Metabolic", "M_AND_A", "PHASE_3", "Small Molecule",
    4300, 4300, 0, undefined, undefined, "2024-02-01", "Labiotech", "Global", "PBC"),
  d("Merus", "Gilead", "Oncology", "COLLABORATION", "PRECLINICAL", "Trispecific Antibody",
    81, 1500, 1419, undefined, undefined, "2024-03-01", "Labiotech", "Global", "Cancer"),
  d("Vesalius", "GSK", "Neuroscience", "LICENSE", "PRECLINICAL", "Small Molecule",
    80, 650, 570, undefined, undefined, "2024-11-01", "Labiotech", "Global", "Parkinson's Disease"),
  d("Duality Biologics", "GSK", "Oncology", "LICENSE", "PRECLINICAL", "ADC",
    30, 1005, 975, undefined, undefined, "2024-12-01", "Labiotech", "Global", "Cancer"),
  d("Rgenta Therapeutics", "GSK", "Multi-therapeutic", "LICENSE", "DISCOVERY", "RNA Splice",
    46, 500, 454, undefined, undefined, "2024-12-01", "Labiotech", "Global", "Multiple"),
  d("Sutro Biopharma", "Ipsen", "Oncology", "LICENSE", "PRECLINICAL", "ADC",
    undefined, 900, 900, undefined, undefined, "2024-04-01", "Labiotech", "Global", "Cancer"),
  d("Skyhawk Therapeutics", "Ipsen", "Rare Disease", "COLLABORATION", "DISCOVERY", "RNA",
    undefined, 1800, 1800, undefined, undefined, "2024-04-01", "Labiotech", "Global", "Rare Neurological"),
  d("Marengo Therapeutics", "Ipsen", "Oncology", "LICENSE", "PRECLINICAL", "T-cell Engager",
    undefined, 1200, 1200, undefined, undefined, "2024-06-01", "Labiotech", "Global", "Cancer"),
  d("Foreseen Biotechnology", "Ipsen", "Oncology", "LICENSE", "PHASE_1", "ADC",
    undefined, 1030, 1030, undefined, undefined, "2024-07-01", "Labiotech", "Global", "Cancer"),
  d("Ambrx", "Johnson & Johnson", "Oncology", "M_AND_A", "PHASE_2", "ADC",
    2000, 2000, 0, undefined, undefined, "2024-01-01", "Labiotech", "Global", "Solid Tumors"),
  d("Proteologix", "Johnson & Johnson", "Immunology", "M_AND_A", "PHASE_1", "Bispecific Antibody",
    850, undefined, undefined, undefined, undefined, "2024-05-01", "Labiotech", "Global", "Atopic Dermatitis"),
  d("Numab Therapeutics", "Johnson & Johnson", "Immunology", "LICENSE", "PRECLINICAL", "Bispecific Antibody",
    1250, undefined, undefined, undefined, undefined, "2024-05-01", "Labiotech", "Global", "Atopic Dermatitis"),
  d("EyeBio", "Merck", "Ophthalmology", "M_AND_A", "PHASE_2", "Monoclonal Antibody",
    1300, 3000, 1700, undefined, undefined, "2024-06-01", "Labiotech", "Global", "Diabetic Macular Edema"),
  d("Caris Life Sciences", "Merck", "Oncology", "COLLABORATION", "DISCOVERY", "ADC",
    undefined, 1400, 1400, undefined, undefined, "2024-04-01", "Labiotech", "Global", "Cancer"),
  d("Mestag Therapeutics", "Merck", "Immunology", "COLLABORATION", "DISCOVERY", "Mixed",
    undefined, 1900, 1900, undefined, undefined, "2024-10-01", "Labiotech", "Global", "Inflammatory Diseases"),
  d("Modifi Biosciences", "Merck", "Oncology", "LICENSE", "PRECLINICAL", "Mixed",
    30, 1330, 1300, undefined, undefined, "2024-10-01", "Labiotech", "Global", "Cancer"),
  d("Harpoon Therapeutics", "Merck", "Oncology", "M_AND_A", "PHASE_1", "T-cell Engager",
    undefined, 680, undefined, undefined, undefined, "2024-01-01", "Labiotech", "Global", "Neuroendocrine"),
  d("Isomorphic Labs", "Novartis", "Multi-therapeutic", "COLLABORATION", "DISCOVERY", "AI Platform",
    37, 1237, 1200, undefined, undefined, "2024-01-01", "Labiotech", "Global", "Multiple"),
  d("MorphoSys AG", "Novartis", "Oncology", "M_AND_A", "PHASE_2", "Immunotherapy",
    2910, 2910, 0, undefined, undefined, "2024-02-01", "Labiotech", "Global", "B-cell Lymphoma"),
  d("IFM Therapeutics", "Novartis", "Immunology", "LICENSE", "PRECLINICAL", "Small Molecule",
    90, 835, 745, undefined, undefined, "2024-03-01", "Labiotech", "Global", "Inflammatory"),
  d("Arvinas", "Novartis", "Oncology", "LICENSE", "PHASE_2", "PROTAC",
    150, 1160, 1010, undefined, undefined, "2024-04-01", "Labiotech", "Global", "Prostate Cancer"),
  d("Schrödinger", "Novartis", "Multi-therapeutic", "COLLABORATION", "DISCOVERY", "AI Platform",
    150, 2422, 2272, undefined, undefined, "2024-10-01", "Labiotech", "Global", "Multiple"),
  d("Calypso", "Novartis", "Immunology", "M_AND_A", "PHASE_1", "Monoclonal Antibody",
    250, 425, 175, undefined, undefined, "2024-01-01", "Labiotech", "Global", "Celiac Disease"),
  d("Neomorph", "Novo Nordisk", "Multi-therapeutic", "COLLABORATION", "DISCOVERY", "Molecular Glue",
    undefined, 1460, 1460, undefined, undefined, "2024-02-01", "Labiotech", "Global", "Multiple"),
  d("Protagonist Therapeutics", "Takeda", "Hematology", "LICENSE", "PHASE_3", "Peptide",
    300, undefined, undefined, undefined, undefined, "2024-02-01", "Labiotech", "Global", "Rare Hematology"),
  d("Kumquat Biosciences", "Takeda", "Oncology", "LICENSE", "PRECLINICAL", "Small Molecule",
    130, 1330, 1200, undefined, undefined, "2024-04-01", "Labiotech", "Global", "Immuno-oncology"),
  d("Degron Therapeutics", "Takeda", "Multi-therapeutic", "LICENSE", "DISCOVERY", "Molecular Glue",
    undefined, 1200, 1200, undefined, undefined, "2024-05-01", "Labiotech", "Global", "Multiple"),
  d("Ascentage Pharma", "Takeda", "Oncology", "LICENSE", "APPROVED", "Small Molecule",
    100, 1300, 1200, undefined, undefined, "2024-06-01", "Labiotech", "Global", "Cancer"),
  d("Alpine Immune Sciences", "Vertex", "Immunology", "M_AND_A", "PHASE_2", "Biologic",
    4900, 4900, 0, undefined, undefined, "2024-04-01", "Labiotech", "Global", "SLE"),
  d("TRIANA Biomedicines", "Pfizer", "Multi-therapeutic", "LICENSE", "DISCOVERY", "Molecular Glue",
    49, 1549, 1500, undefined, undefined, "2024-10-01", "Labiotech", "Global", "Multiple"),
  d("Flare Therapeutics", "Roche", "Oncology", "LICENSE", "DISCOVERY", "Small Molecule",
    70, 1870, 1800, undefined, undefined, "2024-11-01", "Labiotech", "Global", "Cancer"),
  d("Ascidian Therapeutics", "Roche", "Neuroscience", "LICENSE", "DISCOVERY", "RNA",
    42, 1842, 1800, undefined, undefined, "2024-06-01", "Labiotech", "Global", "Neurological"),
  d("MOMA Therapeutics", "Roche", "Oncology", "COLLABORATION", "DISCOVERY", "Small Molecule",
    66, 2066, 2000, undefined, undefined, "2024-01-01", "Labiotech", "Global", "Cancer"),
  d("Dyno Therapeutics", "Roche", "Neuroscience", "LICENSE", "PRECLINICAL", "Gene Therapy",
    50, 1050, 1000, undefined, undefined, "2024-10-01", "Labiotech", "Global", "Neurological"),
  d("Remix Therapeutics", "Roche", "Multi-therapeutic", "LICENSE", "DISCOVERY", "Small Molecule",
    30, 1030, 1000, undefined, undefined, "2024-01-01", "Labiotech", "Global", "Multiple"),
  d("Poseida Therapeutics", "Roche", "Oncology", "M_AND_A", "PHASE_1", "CAR-T",
    undefined, 1500, undefined, undefined, undefined, "2024-11-01", "Labiotech", "Global", "Multiple Myeloma"),
  d("Fulcrum Therapeutics", "Sanofi", "Rare Disease", "LICENSE", "PHASE_3", "Small Molecule",
    80, 1055, 975, undefined, undefined, "2024-05-01", "Labiotech", "Global", "Muscular Dystrophy"),
  d("Inhibrx", "Sanofi", "Rare Disease", "M_AND_A", "PHASE_2", "Recombinant Protein",
    undefined, 2200, undefined, undefined, undefined, "2024-01-01", "Labiotech", "Global", "AAT Deficiency"),
  d("Royalty Pharma", "Sanofi", "Immunology", "LICENSE", "APPROVED", "Monoclonal Antibody",
    525, undefined, undefined, undefined, undefined, "2024-05-01", "Labiotech", "Global", "MS/SLE/T1D"),
  d("Belharra Therapeutics", "Sanofi", "Immunology", "COLLABORATION", "DISCOVERY", "Small Molecule",
    undefined, 700, 700, undefined, undefined, "2024-06-01", "Labiotech", "Global", "Immunological Diseases"),
  d("Day One Biopharmaceuticals", "Ipsen", "Oncology", "LICENSE", "PHASE_3", "Small Molecule",
    111, 461, 350, undefined, undefined, "2024-07-01", "Labiotech", "Global", "Brain Tumors"),
  d("Genmab acquires Merus", "Genmab", "Oncology", "M_AND_A", "PHASE_2", "Bispecific Antibody",
    8000, 8000, 0, undefined, undefined, "2025-09-01", "Labiotech", "Global", "Cancer"),
  d("ProfoundBio", "Genmab", "Oncology", "M_AND_A", "PHASE_2", "ADC",
    1800, 1800, 0, undefined, undefined, "2024-04-01", "Labiotech", "Global", "Solid Tumors"),
  d("Deciphera", "ONO Pharma", "Oncology", "M_AND_A", "APPROVED", "Small Molecule",
    2400, 2400, 0, undefined, undefined, "2024-04-01", "Labiotech", "Global", "GIST"),
  d("Candid Therapeutics", "WuXi Biologics", "Oncology", "LICENSE", "PRECLINICAL", "T-cell Engager",
    undefined, 925, 925, undefined, undefined, "2025-01-01", "Labiotech", "Global", "Cancer"),
  d("Keros Therapeutics", "Takeda", "Hematology", "LICENSE", "PHASE_2", "Biologic",
    200, undefined, undefined, undefined, undefined, "2024-12-01", "Labiotech", "Global", "Anemia"),
  d("Sosei Heptares", "Boehringer Ingelheim", "Neuroscience", "COLLABORATION", "PRECLINICAL", "Small Molecule",
    27, 759, 732, undefined, undefined, "2024-03-01", "Labiotech", "Global", "Schizophrenia"),
  d("Circle Pharma", "Boehringer Ingelheim", "Oncology", "LICENSE", "PRECLINICAL", "Macrocycle",
    undefined, 607, 607, undefined, undefined, "2024-10-01", "Labiotech", "Global", "Cancer"),
  d("Nerio Therapeutics", "Boehringer Ingelheim", "Oncology", "LICENSE", "PRECLINICAL", "Checkpoint Inhibitor",
    undefined, 1300, 1300, undefined, undefined, "2024-07-01", "Labiotech", "Global", "Cancer"),
  d("Chugai", "Araris Biotech", "Oncology", "LICENSE", "DISCOVERY", "ADC Platform",
    undefined, 780, 780, undefined, undefined, "2025-01-01", "Labiotech", "Global", "Cancer"),
  d("ABL Bio", "Eli Lilly", "Multi-therapeutic", "LICENSE", "PRECLINICAL", "Bispecific Platform",
    40, undefined, undefined, undefined, undefined, "2025-12-01", "PRNewswire", "Global", "Multiple"),
  d("Boehringer Ingelheim (OSE)", "Boehringer Ingelheim", "Oncology", "LICENSE", "PRECLINICAL", "Mixed",
    14, 31, 17, undefined, undefined, "2024-05-01", "Labiotech", "Global", "Cancer/Metabolic"),

  // Ophthalmology
  d("Biogen (HI Bio)", "Biogen", "Immunology", "M_AND_A", "PHASE_2", "Monoclonal Antibody",
    1150, 1800, 650, undefined, undefined, "2024-05-01", "Labiotech", "Global", "IgA Nephropathy"),

  // Dermatology
  d("Dermavant", "Organon", "Dermatology", "M_AND_A", "APPROVED", "Small Molecule",
    undefined, 1200, undefined, undefined, undefined, "2024-09-01", "Labiotech", "Global", "Plaque Psoriasis"),
];

// ═══════════════════════════════════════════════════════════════
// AGGREGATE BENCHMARK FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function computeWorldwideBenchmarks(deals: WorldwideDeal[], filters?: {
  therapeuticArea?: string;
  stage?: string;
  modality?: string;
  dealType?: string;
  indication?: string;
  geography?: string;
  dateFrom?: string;
  dateTo?: string;
  company?: string;
  /** Pass alias-aware matcher functions for accurate cross-dataset filtering */
  _matchTA?: (dealTA: string, filterTA: string) => boolean;
  _matchModality?: (dealMod: string, filterMod: string) => boolean;
}) {
  let filtered = [...deals];

  if (filters) {
    if (filters.therapeuticArea && filters.therapeuticArea !== "all") {
      const matcher = filters._matchTA ?? ((d: string, f: string) => d.toLowerCase().includes(f.toLowerCase()));
      filtered = filtered.filter(d => matcher(d.therapeuticArea, filters.therapeuticArea!));
    }
    if (filters.stage && filters.stage !== "all")
      filtered = filtered.filter(d => d.stage === filters.stage);
    if (filters.modality && filters.modality !== "all") {
      const matcher = filters._matchModality ?? ((d: string, f: string) => d.toLowerCase().includes(f.toLowerCase()));
      filtered = filtered.filter(d => matcher(d.modality, filters.modality!));
    }
    if (filters.dealType && filters.dealType !== "all")
      filtered = filtered.filter(d => d.dealType === filters.dealType);
    if (filters.indication)
      filtered = filtered.filter(d => d.indication?.toLowerCase().includes(filters.indication!.toLowerCase()));
    if (filters.geography)
      filtered = filtered.filter(d => d.geography?.toLowerCase().includes(filters.geography!.toLowerCase()));
    if (filters.dateFrom)
      filtered = filtered.filter(d => d.announcedDate >= filters.dateFrom!);
    if (filters.dateTo)
      filtered = filtered.filter(d => d.announcedDate <= filters.dateTo!);
    if (filters.company)
      filtered = filtered.filter(d =>
        d.licensor.toLowerCase().includes(filters.company!.toLowerCase()) ||
        d.licensee.toLowerCase().includes(filters.company!.toLowerCase())
      );
  }

  const upfronts = filtered.map(d => d.upfrontPayment).filter((v): v is number => v != null && v > 0);
  const totals = filtered.map(d => d.totalDealValue).filter((v): v is number => v != null && v > 0);
  const milestoneVals = filtered.map(d => d.milestones).filter((v): v is number => v != null && v > 0);
  const royLows = filtered.map(d => d.royaltyLow).filter((v): v is number => v != null && v > 0);
  const royHighs = filtered.map(d => d.royaltyHigh).filter((v): v is number => v != null && v > 0);

  const median = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  const mean = (arr: number[]) => arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
  const p25 = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.25)];
  };
  const p75 = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.75)];
  };

  // Group by therapeutic area
  const byTA: Record<string, WorldwideDeal[]> = {};
  for (const deal of filtered) {
    const ta = deal.therapeuticArea;
    if (!byTA[ta]) byTA[ta] = [];
    byTA[ta].push(deal);
  }

  // Group by stage
  const byStage: Record<string, WorldwideDeal[]> = {};
  for (const deal of filtered) {
    if (!byStage[deal.stage]) byStage[deal.stage] = [];
    byStage[deal.stage].push(deal);
  }

  // Group by modality
  const byModality: Record<string, WorldwideDeal[]> = {};
  for (const deal of filtered) {
    const mod = deal.modality;
    if (!byModality[mod]) byModality[mod] = [];
    byModality[mod].push(deal);
  }

  // Upfront as % of total
  const upfrontPcts = filtered
    .filter(d => d.upfrontPayment && d.totalDealValue && d.totalDealValue > 0)
    .map(d => (d.upfrontPayment! / d.totalDealValue!) * 100);

  return {
    totalDeals: filtered.length,
    deals: filtered,

    upfronts: {
      count: upfronts.length,
      median: median(upfronts),
      mean: mean(upfronts),
      p25: p25(upfronts),
      p75: p75(upfronts),
      min: upfronts.length ? Math.min(...upfronts) : 0,
      max: upfronts.length ? Math.max(...upfronts) : 0,
    },

    totalValues: {
      count: totals.length,
      median: median(totals),
      mean: mean(totals),
      p25: p25(totals),
      p75: p75(totals),
      min: totals.length ? Math.min(...totals) : 0,
      max: totals.length ? Math.max(...totals) : 0,
    },

    milestones: {
      count: milestoneVals.length,
      median: median(milestoneVals),
      mean: mean(milestoneVals),
    },

    royalties: {
      count: royLows.length,
      medianLow: median(royLows),
      medianHigh: median(royHighs),
      meanLow: mean(royLows),
      meanHigh: mean(royHighs),
    },

    upfrontAsPercent: {
      count: upfrontPcts.length,
      median: median(upfrontPcts),
      mean: mean(upfrontPcts),
    },

    byTherapeuticArea: Object.entries(byTA).map(([ta, deals]) => ({
      therapeuticArea: ta,
      count: deals.length,
      medianUpfront: median(deals.map(d => d.upfrontPayment).filter((v): v is number => v != null && v > 0)),
      medianTotal: median(deals.map(d => d.totalDealValue).filter((v): v is number => v != null && v > 0)),
    })).sort((a, b) => b.count - a.count),

    byStage: Object.entries(byStage).map(([stage, deals]) => ({
      stage,
      count: deals.length,
      medianUpfront: median(deals.map(d => d.upfrontPayment).filter((v): v is number => v != null && v > 0)),
      medianTotal: median(deals.map(d => d.totalDealValue).filter((v): v is number => v != null && v > 0)),
    })).sort((a, b) => {
      const order = ["DISCOVERY", "PRECLINICAL", "PHASE_1", "PHASE_2", "PHASE_3", "APPROVED"];
      return order.indexOf(a.stage) - order.indexOf(b.stage);
    }),

    byModality: Object.entries(byModality).map(([mod, deals]) => ({
      modality: mod,
      count: deals.length,
      medianUpfront: median(deals.map(d => d.upfrontPayment).filter((v): v is number => v != null && v > 0)),
      medianTotal: median(deals.map(d => d.totalDealValue).filter((v): v is number => v != null && v > 0)),
    })).sort((a, b) => b.count - a.count),
  };
}
