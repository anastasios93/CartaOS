# Data sources — keyless by design

As of 2026-07-28 (product decision), CartaOS runs entirely on **open, keyless
APIs** — no registration, no credentials, nothing to rotate. The previously
env-gated sources (PatentsView, The Lens, EPO OPS, NICE, IHME GBD, EMA SPOR,
PBS Australia, Semantic Scholar) were removed rather than left dormant.

The live roster is `config/sources.ts`. The core stack:

| Source | What it feeds | Contract notes (all probed live) |
|---|---|---|
| RxNorm/RxNav | Identity backbone: name → RxCUI → NDCs | NDCs attach at product (SCD/SBD) level, not ingredient |
| DailyMed SPLs | Labels, labellers, formulations | `spls.json?drug_name=` |
| openFDA Orange Book | **Patents, exclusivity, TE codes, NDA/ANDA counts** | `orangebook.json`; search `products.active_ingredients.name:"X"`; `patents[]`/`exclusivity[]` at record level; 404 = no match |
| openFDA Drugs@FDA | Approvals, competitor counting | 404 = no match |
| openFDA Drug Shortages | **Supply-gap arbitrage signal** | search must be field-scoped (`generic_name:"X"`) |
| NHS OpenPrescribing | **UK spend & volume (BNF-coded)** | Cloudflare-fronted; client degrades to null → "no source connected" |
| CMS Part D (spending + geography) | US demand, channel, field-force signals | UUID dataset paths are the working contract — named alias paths 404 |
| CMS NADAC / Medicaid pricing | US price-erosion backtesting | generic (SCD) NDCs have dense coverage |
| ClinicalTrials.gov v2 | Pipeline, recruiting trials | |
| ChEMBL / PubChem / UNII-GSRS / MeSH / IUPHAR | Chemistry, MOA, identity | |
| WHO GHO / WHO nEML | Epidemiology, essential-medicines footprint | nEML is GraphQL-only; match on ingredient name |
| SEC EDGAR / GLEIF / news / GDELT | Deals, companies, market signals | |
| Open Targets / PubMed / Europe PMC / OpenAlex / Crossref / OpenAIRE / NIH RePORTER | Scientific evidence | |

Two env vars remain, neither a data credential:

- `ADMIN_BOOTSTRAP_SECRET` — gates `/api/admin/bootstrap` (or use an owner session).
- `CMS_PARTD_DATASET_ID` / `CMS_PARTD_SPENDING_DATASET_ID` / `CMS_PARTD_GEO_DATASET_ID` —
  optional overrides for CMS dataset UUIDs, which rotate yearly.

If a dimension has no reachable source for a selected market, the UI renders
an explicit **"no source connected"** state (§3.3) — never a fabricated number.
