/**
 * Source registry (§7): every retrieval source the agents may consult, as
 * configuration — not strings buried in prompts. Dimension definitions
 * (config/dimensions.ts) reference these ids; the run console logs which ids
 * were actually consulted per dimension so coverage and gaps are inspectable.
 *
 * `envKey` marks sources that no-op gracefully until a credential is supplied
 * (see API_KEYS.md). A dimension whose sources are all unavailable must render
 * "no source connected" — never a fabricated number (§3.3).
 */

export type SourceTier = 1 | 2 | 3;

export interface SourceDef {
  id: string;
  label: string;
  /** Module under server/services/ that implements the client. */
  module: string;
  /** ISO alpha-2 codes this source covers, or "global". */
  coverage: string[] | "global";
  /** Provenance tier: 1 = primary regulator/registry, 2 = curated secondary, 3 = legacy/derived. */
  tier: SourceTier;
  /** Set when the client is env-gated and returns [] until the key exists. */
  envKey?: string;
  notes?: string;
}

export const SOURCES: SourceDef[] = [
  // ── Identity / entity resolution ───────────────────────────────────────────
  { id: "rxnorm", label: "RxNorm/RxNav", module: "adapters/rxnorm", coverage: ["US"], tier: 1, notes: "Identifier backbone: name→RxCUI→SCD/SBD→NDC. NDCs attach at product level, not ingredient." },
  { id: "unii_gsrs", label: "FDA GSRS (UNII)", module: "unii-gsrs", coverage: "global", tier: 1 },
  { id: "pubchem", label: "PubChem", module: "pubchem", coverage: "global", tier: 2 },
  { id: "chembl", label: "ChEMBL", module: "chembl", coverage: "global", tier: 3, notes: "Legacy first-approval dates are tier 3 — flag, don't trust silently." },
  { id: "mesh", label: "MeSH", module: "mesh", coverage: "global", tier: 2 },
  { id: "iuphar", label: "IUPHAR/BPS Guide to Pharmacology", module: "iuphar", coverage: "global", tier: 2 },

  // ── Regulatory / approvals / labels ────────────────────────────────────────
  { id: "drugsfda", label: "Drugs@FDA (openFDA)", module: "adapters/drugsfda", coverage: ["US"], tier: 1, notes: "404 on no-match must map to null, not throw." },
  { id: "dailymed", label: "DailyMed SPLs", module: "adapters/dailymed", coverage: ["US"], tier: 1 },
  { id: "orange_book", label: "FDA Orange Book (openFDA)", module: "orange-book", coverage: ["US"], tier: 1, notes: "orangebook.json: search products.active_ingredients.name; patents[]/exclusivity[] at record level; 404 = no match." },
  { id: "openfda_shortages", label: "openFDA Drug Shortages", module: "fda-shortages", coverage: ["US"], tier: 1, notes: "Search must be field-scoped (generic_name:\"X\"); bare terms 404." },
  { id: "openfda_faers", label: "openFDA adverse events", module: "fda-adverse-events", coverage: ["US"], tier: 2 },
  { id: "ema", label: "EMA medicines", module: "ema", coverage: ["DE", "FR", "IT", "ES", "NL", "BE", "AT", "PT", "IE", "PL", "CZ", "HU", "RO", "BG", "SK", "SI", "HR", "GR", "EE", "LV", "LT", "CY", "MT", "LU", "SE", "DK", "FI"], tier: 1 },
  { id: "cima_spain", label: "AEMPS CIMA (Spain)", module: "cima-spain", coverage: ["ES"], tier: 1 },
  { id: "health_canada", label: "Health Canada DPD", module: "health-canada", coverage: ["CA"], tier: 1 },

  // ── IP / exclusivity ───────────────────────────────────────────────────────
  { id: "patents_generic", label: "Patent search (generic)", module: "patents", coverage: "global", tier: 2 },

  // ── Pricing / reimbursement / procurement ──────────────────────────────────
  { id: "nadac", label: "CMS NADAC", module: "adapters/nadac", coverage: ["US"], tier: 1, notes: "Generic (SCD) NDCs have dense coverage; brand (SBD) sparse — sample SCD first." },
  { id: "part_d_spending", label: "CMS Part D spending", module: "adapters/part-d", coverage: ["US"], tier: 1, notes: "keyword param works; Drupal-style filter[] is silently ignored." },
  { id: "part_d_geography", label: "CMS Part D by geography", module: "adapters/part-d-geo", coverage: ["US"], tier: 1, notes: "UUID dataset path is the working contract — the named alias path 404s. National and state rows share one response; filter non-commercial geos." },
  { id: "cms_pricing", label: "CMS Medicaid pricing", module: "cms-pricing", coverage: ["US"], tier: 1 },
  { id: "nhs_openprescribing", label: "NHS OpenPrescribing (England)", module: "nhs-openprescribing", coverage: ["GB"], tier: 1, notes: "Cloudflare-fronted — client returns null on a challenge page, rendering 'no source connected'." },

  // ── Epidemiology / burden / demand ─────────────────────────────────────────
  { id: "who_gho", label: "WHO GHO", module: "who-gho", coverage: "global", tier: 1 },
  { id: "who_eml", label: "WHO essential medicines (nEML)", module: "adapters/who-eml", coverage: "global", tier: 1, notes: "GraphQL only; ATC fields empty on all records — match on canonical ingredient name." },

  // ── Clinical / scientific evidence ─────────────────────────────────────────
  { id: "clinical_trials", label: "ClinicalTrials.gov", module: "clinical-trials", coverage: "global", tier: 1 },
  { id: "open_targets", label: "Open Targets", module: "open-targets", coverage: "global", tier: 2 },
  { id: "pubmed", label: "PubMed", module: "pubmed", coverage: "global", tier: 2 },
  { id: "europe_pmc", label: "Europe PMC", module: "europe-pmc", coverage: "global", tier: 2 },
  { id: "openalex", label: "OpenAlex", module: "openalex", coverage: "global", tier: 3 },
  { id: "crossref", label: "Crossref", module: "crossref", coverage: "global", tier: 3 },
  { id: "openaire", label: "OpenAIRE", module: "openaire", coverage: "global", tier: 3 },
  { id: "nih_reporter", label: "NIH RePORTER", module: "nih-reporter", coverage: ["US"], tier: 2 },

  // ── Deals / companies / market signals ─────────────────────────────────────
  { id: "sec_edgar", label: "SEC EDGAR", module: "sec-edgar", coverage: ["US"], tier: 1 },
  { id: "gleif", label: "GLEIF LEI", module: "gleif", coverage: "global", tier: 1 },
  { id: "news", label: "News (Google News)", module: "news", coverage: "global", tier: 3 },
  { id: "gdelt", label: "GDELT", module: "gdelt", coverage: "global", tier: 3 },
];

const SOURCE_BY_ID = new Map(SOURCES.map((s) => [s.id, s]));

export function sourceById(id: string): SourceDef | undefined {
  return SOURCE_BY_ID.get(id);
}

/** Sources applicable to a given country selection (global sources always apply). */
export function sourcesForGeographies(sourceIds: string[], countries: string[]): SourceDef[] {
  const set = new Set(countries.map((x) => x.toUpperCase()));
  return sourceIds
    .map((id) => SOURCE_BY_ID.get(id))
    .filter((s): s is SourceDef => !!s)
    .filter((s) => s.coverage === "global" || s.coverage.some((x) => set.has(x)));
}

/** True when the source can be queried right now (no env gate, or gate satisfied). */
export function sourceAvailable(s: SourceDef, env: Record<string, string | undefined> = process.env): boolean {
  return !s.envKey || !!env[s.envKey];
}
