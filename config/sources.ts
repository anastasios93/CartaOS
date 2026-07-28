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
  { id: "orange_book", label: "FDA Orange Book", module: "orange-book", coverage: ["US"], tier: 1 },
  { id: "openfda_faers", label: "openFDA adverse events", module: "fda-adverse-events", coverage: ["US"], tier: 2 },
  { id: "ema", label: "EMA medicines", module: "ema", coverage: ["DE", "FR", "IT", "ES", "NL", "BE", "AT", "PT", "IE", "PL", "CZ", "HU", "RO", "BG", "SK", "SI", "HR", "GR", "EE", "LV", "LT", "CY", "MT", "LU", "SE", "DK", "FI"], tier: 1 },
  { id: "cima_spain", label: "AEMPS CIMA (Spain)", module: "cima-spain", coverage: ["ES"], tier: 1 },
  { id: "health_canada", label: "Health Canada DPD", module: "health-canada", coverage: ["CA"], tier: 1 },
  { id: "ema_spor", label: "EMA SPOR", module: "ema-spor", coverage: "global", tier: 1, envKey: "EMA_SPOR_API_KEY", notes: "Contract uncertain — scaffold; confirm against provider docs before relying on it." },

  // ── IP / exclusivity ───────────────────────────────────────────────────────
  { id: "uspto_patentsview", label: "USPTO PatentsView", module: "uspto-patentsview", coverage: ["US"], tier: 1, envKey: "PATENTSVIEW_API_KEY" },
  { id: "epo_ops", label: "EPO OPS", module: "epo-ops", coverage: ["DE", "FR", "IT", "ES", "GB", "NL", "BE", "AT", "CH", "PT", "IE", "PL", "SE", "DK", "NO", "FI", "TR"], tier: 1, envKey: "EPO_OPS_KEY" },
  { id: "the_lens", label: "The Lens", module: "the-lens", coverage: "global", tier: 2, envKey: "LENS_API_TOKEN" },
  { id: "patents_generic", label: "Patent search (generic)", module: "patents", coverage: "global", tier: 2 },

  // ── Pricing / reimbursement / procurement ──────────────────────────────────
  { id: "nadac", label: "CMS NADAC", module: "adapters/nadac", coverage: ["US"], tier: 1, notes: "Generic (SCD) NDCs have dense coverage; brand (SBD) sparse — sample SCD first." },
  { id: "part_d_spending", label: "CMS Part D spending", module: "adapters/part-d", coverage: ["US"], tier: 1, notes: "keyword param works; Drupal-style filter[] is silently ignored." },
  { id: "part_d_geography", label: "CMS Part D by geography", module: "adapters/part-d-geo", coverage: ["US"], tier: 1, notes: "National and state rows share one response — split on Prscrbr_Geo_Lvl; filter non-commercial geos." },
  { id: "cms_pricing", label: "CMS Medicaid pricing", module: "cms-pricing", coverage: ["US"], tier: 1 },
  { id: "nice_uk", label: "NICE (UK)", module: "nice-uk", coverage: ["GB"], tier: 1, envKey: "NICE_API_KEY" },
  { id: "pbs_australia", label: "PBS (Australia)", module: "pbs-australia", coverage: ["AU"], tier: 1, envKey: "PBS_SUBSCRIPTION_KEY" },

  // ── Epidemiology / burden / demand ─────────────────────────────────────────
  { id: "who_gho", label: "WHO GHO", module: "who-gho", coverage: "global", tier: 1 },
  { id: "who_eml", label: "WHO essential medicines (nEML)", module: "adapters/who-eml", coverage: "global", tier: 1, notes: "GraphQL only; ATC fields empty on all records — match on canonical ingredient name." },
  { id: "ihme_gbd", label: "IHME GBD", module: "ihme-gbd", coverage: "global", tier: 2, envKey: "IHME_GBD_API_KEY" },

  // ── Clinical / scientific evidence ─────────────────────────────────────────
  { id: "clinical_trials", label: "ClinicalTrials.gov", module: "clinical-trials", coverage: "global", tier: 1 },
  { id: "open_targets", label: "Open Targets", module: "open-targets", coverage: "global", tier: 2 },
  { id: "pubmed", label: "PubMed", module: "pubmed", coverage: "global", tier: 2 },
  { id: "europe_pmc", label: "Europe PMC", module: "europe-pmc", coverage: "global", tier: 2 },
  { id: "semantic_scholar", label: "Semantic Scholar", module: "semantic-scholar", coverage: "global", tier: 3, envKey: "SEMANTIC_SCHOLAR_API_KEY", notes: "Key optional — works keyless at low rate limits." },
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
