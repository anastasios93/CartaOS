# Phase 0 Audit — CartaOS Portfolio Intelligence Refactor

Date: 2026-07-28 · Branch audited: `feat/opportunity-assessment-consulting-decks` (ahead of `main`; this branch is what is deployed at cartaos.vercel.app)

Status: **awaiting approval — no files changed.** This report answers §1 of the refactor brief and asks the §11 questions (plus new ones the audit surfaced).

---

## 1. Repo map

| Layer | What it is |
|---|---|
| Framework | Next.js 16 (app router), React 19, TypeScript 5. Client-heavy: every dashboard page is `"use client"`. |
| Styling | Tailwind 4 + shadcn/base-ui components (`components/ui/*`), lucide icons, recharts. Brand: orange/black/white (#F97316 / #1A1A2E). |
| State | React Query via tRPC 11; local `useState` everywhere; zustand is installed but effectively unused. |
| API layer | Two parallel systems: **tRPC** (`server/routers/*` — 10 routers, ~30 procedures) and **REST-ish route handlers** (`app/api/*` — 11 routes incl. the SSE orchestrator). |
| DB | Prisma 6 → Supabase Postgres. 23 models, 10 enums. Auth via NextAuth (credentials + optional Azure AD), JWT sessions, `User.isAdmin` boolean. |
| Agent/LLM calls | `server/agents/*` (6 agents, all `claude-opus-4-8`), orchestrated by `app/api/orchestrator/route.ts` (SSE, 2 waves: benchmarking/partner/negotiation in parallel → synthesis/executionPlan/outLicensingStrategy in parallel). Also `server/services/claude.ts` (chat + extraction for tRPC `ai.*`), `server/services/market-worthiness.ts` (standalone engine), `server/services/ingest/criteria.ts` (criteria extraction). All agent prompts pass through `server/services/source-reference.ts#withGrounding` (source catalogue + off-patent BASE_LENS + quality/jurisdiction/compliance directives). |
| Search/data sources | ~50 clients in `server/services/*` (SEC EDGAR, ClinicalTrials.gov, openFDA, Orange Book, DailyMed, ChEMBL, EMA, PubMed/Europe PMC, USPTO/EPO/Lens, CMS, WHO, RxNorm, NADAC, Part D, WHO nEML, …). A **deterministic computed-lever layer** (`server/services/adapters/*`, `forecast/erosion.ts`, `levers/computed.ts`) computes 7 of 10 value levers from live APIs with backtested forecasting; `mergeComputedLevers()` overrides LLM output for computed levers. |
| Exports | `lib/exports.ts` — consulting-grade PDF (jsPDF) + PPTX (pptxgenjs). |
| Deploy | Vercel, project `cartaos`, GitHub `anastasios93/cartaos`. `main` is behind the feature branch. |
| Tests | **None.** No test runner in `package.json`. (Some ad-hoc verification scripts exist under `scripts/`.) |

Key architectural facts the refactor must respect:

- **The off-patent engine is real and good.** The `outLicensingStrategy` agent (region-sharded, 6-vector COS, Go/Conditional/No-Go verdict, 10 value levers — 7 deterministically computed) is the most valuable code in the repo. The refactor should *relocate and split* it, not rewrite it.
- **The whole prompt stack is off-patent-only by design** (2026-07-20 reframe): `BASE_LENS`, archetype modes, lever taxonomy all assume an already-approved off-patent asset. There is **no innovative branch anywhere** — 1B/2B is a from-scratch build (see Gap list and Question 8).
- **Every curated seed dataset has been deliberately emptied**: `MOCK_DEALS`, `MOCK_COMPANIES`, `MOCK_NEGOTIATIONS`, `MOCK_CLAUSES`, `WORLDWIDE_DEALS`, `MOLECULES` are all `[]`. The engines around them still run — over nothing. Several "complete-looking" pages are empty shells by data removal.
- **No caching layer** (`CachedAPIResponse` model is dead) — every agent run re-hits every public API.
- **No server-side route protection** (no `middleware.ts`); gating is client-side redirect + per-endpoint session checks.

## 2. Screen inventory

**Sidebar routes** (12 visible + hidden admin + settings):

| Route | Job | Data | State |
|---|---|---|---|
| `/` Portfolio Overview | 4 metric tiles + a **full second orchestrator UI** (intake → SSE agents → 3-pillar results) | tiles: empty-mock hooks; agents: live | Live but duplicates `/simulated-plan` |
| `/arbitrage` Patent Arbitrage | AIR-scored cross-border patent-expiry pairs | `MOLECULES = []` → **always zero records** | Empty shell (engine intact) |
| `/trends` Market Trends | TA activity, sponsors, phase mix, patent cliff, news | `GET /api/market-trends` — genuinely aggregates EDGAR/CTgov/news/Orange Book/openFDA | **Fully live** |
| `/benchmarks` Comparable Deals | 9-dim filters, distributions, unified comparables table | DB deals + `WORLDWIDE_DEALS=[]` + live `search.comparables` | Live minus the empty worldwide leg |
| `/partners` Partners & Synergies | Ranked partner cards w/ scores | **User's own CRM companies only** (`useCompanies`) — empty by default | Shell without CRM rows |
| `/insights` Commercial Maximization | Deal-type playbook, milestone/NPV/royalty calculators, deal simulator | Hardcoded assumptions + optional real deal from DB | Real math, static assumptions |
| `/conductor` AI Advisor | Portfolio-grounded Claude chat | `POST /api/conductor` | Live |
| `/simulated-plan` | **Off-Patent Value Assessment**: intake + portfolio/criteria upload → orchestrator → verdict/COS/levers + execution plan, PDF/PPTX export, persisted history | Live agents + `hub.list/getById` | **Most complete page in the app** |
| `/market-worthiness` | Asset+geography → GO/CONDITIONAL/NO-GO verdict card | `POST /api/market-worthiness` (separate engine) | Live; all 7 UI defects from brief §1.5 confirmed |
| `/workspace` (+`/[id]`) Deal Workspace | Negotiation cards + 4-tab detail | `useNegotiations`; **Emails/Documents/Log tabs are hardcoded fiction** (Pfizer counteroffers dated 2024); "New Workspace" button has no handler | 1 of 4 tabs real |
| `/search` Live Search | 6-group federated live search | `search.unified` — **publicProcedure, unauthenticated** | Live |
| `/admin` (+`/[userId]`) | Platform stats + per-user drill-down | `admin.*` tRPC, properly gated | Live |
| `/settings` | Profile (real) + M365 connect / API key / toggles (**all fake local state**) | `user.me/updateProfile` | Half real, half theater |

**Off-sidebar routes** (reachable only by direct link — the brief's sidebar picture missed all of these):

| Route | Job | State |
|---|---|---|
| `/hub` | 16-line redirect to `/` | Legacy stub |
| `/assistant` | Second, ungrounded Claude chat (`ai.chat`) | Redundant duplicate of `/conductor` |
| `/deals` | "Deal Twin Library": DB table mode + live-search mode (duplicates `/search`) | Live search real; DB empty by default |
| `/deals/[id]` | Deal detail + clause section (falls back to `MOCK_CLAUSES=[]`) | Demo-grade |
| `/deals/new` | 4-step wizard incl. `ai.extractDeal` press-release extraction | Complete/live |
| `/companies` (+`/new`) | Companies CRM (same data as `/partners`, different view) | Live |
| `/negotiations` (+`/[id]`) | Negotiation list + **the most transactionally complete detail page** (status/activity mutations, AI conductor run) | Live; links to two non-existent routes (`/negotiations/new`, `/companies/[id]`) |
| `/structure` | Structure recommendations from DB medians + hardcoded splits | Heuristic |
| `/term-builder` | Term-sheet form benchmarked vs DB medians, pre-seeded with fake demo values | Complete UI, demo-seeded |
| `/term-builder/clauses` | Clause library over `MOCK_CLAUSES=[]` | **Permanently empty** |
| `/term-builder/milestones` | Editable milestone rNPV calculator (11 hardcoded defaults) | Real calculator |
| `/upload` | Real Supabase document pipeline (presigned upload → Claude extract → Deal) + a **fictional "Data Sources" panel** with fake sync timestamps | Half live, half mock |
| `/login`, `/signup` | Auth. Login has a one-click demo button hitting `POST /api/demo` | Live |

## 3. Redundancy matrix

§1.5 mapping verified against the code. Verdicts, with contradictions flagged:

| Screen | Verdict | Destination / notes |
|---|---|---|
| `/` Portfolio Overview | **KEEP, rework** | Becomes the run list. ⚠️ Contradiction with the brief: it is *not* "a nav item with no clear job" — it hosts a full duplicate orchestrator UI. That duplicate dies; the run list replaces it. |
| `/arbitrage` | **DELETE as page** | Exclusivity-runway dimension (1A). Salvage: AIR scoring engine + Orange Book enrichment in `lib/patent-arbitrage-data.ts` / `app/api/asymmetries`. Page is already empty (`MOLECULES=[]`), so deletion loses nothing visible. |
| `/trends` | **DELETE as page** | Its `/api/market-trends` aggregation becomes source routing for the competitive-intensity / price-erosion (1A) and market-access (1B) dimensions. This is the one deleted page that is fully live today — its backend survives intact. |
| `/benchmarks` | **DELETE as page** | Evidence drawer. Salvage: `search.comparables`, the 9-dim alias-matching filter logic, distribution charts. The `WORLDWIDE_DEALS` leg is empty and can be deleted outright. |
| `/market-worthiness` | **MOVE to DIAGNOSIS** | ⚠️ Complication: there are **two rival worthiness engines** — this standalone service (4-stage model, `WORTHINESS_CONFIG`) and the far richer one inside `simulated-plan`'s assessment agent (6-vector COS + 10 levers + computed layer). 1A must unify them; I recommend the simulated-plan engine as the survivor and this page's verdict-card UI as the presentation layer. See Question 9. |
| `/partners` | **MERGE + MOVE → 2B** | ⚠️ Contradiction with the brief: the *page* has no partner-shortlist logic — it just ranks the user's own CRM rows. The real shortlist AI is `server/agents/partner.ts`. The agent moves to Strategy; the page dies. |
| `/insights` | **MERGE + MOVE → 2A** | Its NPV/milestone/royalty calculators become the editable assumptions panel + sensitivity view of §5.3. The hardcoded playbook cards die. |
| `/simulated-plan` | **SPLIT, not just move** | ⚠️ Biggest contradiction with the brief. Its core output is currently a *Diagnosis* (Go/Conditional/No-Go verdict, COS, worthiness, 10 levers) **plus** strategy fragments plus an execution plan. Split: verdict/COS/levers/computed layer → **1A Diagnosis**; commercial plan/routes/partner output → **2A Strategy**; `executionPlan` agent output → **Pillar 3**. The intake form + criteria/portfolio uploads become the shared run-configuration shell. |
| `/conductor` | **DELETE as nav item** | Contextual assistant panel on every screen, re-grounded on the current Run (today it grounds on the whole portfolio). |
| `/search` | **DELETE** | ⚠️ Two follow-ups: the header Cmd+K palette routes to `/search?q=` and needs a new destination; and the `search` tRPC router is `publicProcedure` (unauthenticated) — must be locked down regardless. |
| `/workspace` (+`[id]`) | **KEEP → EXECUTION** | Gut the three fictional tabs. Merge in `/negotiations/[id]`'s real mutation/AI logic (it is the better detail page). |
| TOOLS group | **DELETE** | — |
| `/hub` | **DELETE** | Redirect stub. |
| `/assistant` | **DELETE** | Duplicate chat; folded into the contextual assistant. |
| `/deals` | **SPLIT** | Live-search half = duplicate of `/search` → delete. DB deal library + `/deals/[id]` → evidence layer (comparable-deals store). `/deals/new` + `ai.extractDeal` → keep as evidence-capture flow (a way to add private comparables). See Question 10. |
| `/companies` (+`/new`) | **MERGE** | Entity store behind partner shortlists; loses its own nav presence. See Question 10. |
| `/negotiations` (+`/[id]`) | **MERGE → Deal Workspace** | Two views over the same `Negotiation` model today; keep one. |
| `/structure` | **MERGE → 2A/2B** | Deal-structure envelope; hardcoded splits replaced by cited comparables. |
| `/term-builder` | **HOLD for §6** | Natural fit for Execution Option C; otherwise delete. `clauses` sub-page **DELETE** (permanently empty). `milestones` calculator → Strategy assumptions panel. |
| `/upload` | **MERGE** | Its real document pipeline seeds the §3.2 universal uploader; the fictional Data Sources panel dies. |
| `/settings` | **KEEP** | Delete the fake M365 connect, fake API key, non-persisted toggles. |
| `/admin` (+`/[userId]`) | **KEEP (hidden)** | ⚠️ Not in the brief's five-item target; admin-only group. Confirm it stays (Question 11). |
| `/login`, `/signup` | KEEP | Demo-login button is a security question (Question 12). |

**Dead surface to delete in passing:** `deal.getById`, `deal.stats`, `company.getById/update/stats`, `negotiation.create` (unusable — requires an `Org` nothing creates), `ai.draftClause`, `ai.scorePartner`, `document.getById`, `admin.whoami` (10+ dead tRPC procedures); Prisma models `Org`, `TermSheet`, `Alliance`, `AllianceObligation`, `CachedAPIResponse` (dead) and `DealTag`, `DealComparison`, `ClauseExample`, `Contact`, `PipelineAsset`, `ActionItem` (rendered but never written — permanently empty); `lib/ms-auth.ts` + the entire Microsoft Graph wiring (`@azure/msal-*`, `@microsoft/microsoft-graph-client` deps) — zero imports; dead links `/negotiations/new`, `/companies/[id]`; dead "New Workspace" button; `GET /api/market-worthiness` (no caller); `lib/mock-data.ts` / `worldwide-deal-data.ts` / most of `patent-arbitrage-data.ts` (empty arrays + their fallbacks in `hooks/use-data.ts`).

## 4. Gap list (target §2–§7 vs what exists)

1. **Run spine (§2)** — does not exist. `HubRequest/HubResult` (simulated plan) and `Evaluation` (market worthiness) are separate per-feature stores. No `Run { asset, assetType, geographies, uploadedCriteria, diagnosis?, strategy?, execution? }`, no cross-pillar resumability, no run comparison. Also: the `Evaluation` table was never migrated into the prod database (known caveat) — schema work needs a prod migration step.
2. **Asset-type branch (§2, §4.2, §5.2)** — no innovative branch exists anywhere. Prompts, lever taxonomy, archetypes are off-patent-only after the 2026-07-20 reframe. 1B/2B = new dimension sets, new prompts, new source routing. **Direct tension with the standing thesis — see Question 8.**
3. **Geography selector (§3.1)** — three separate hardcoded geography lists (`WORTHINESS_GEOS` 10 codes, `REGION_FLAGS` in `types/hub.ts`, `expandRegions()` in the strategy agent). No hierarchical World→Region→Country multi-select, no presets, no chips. Geography *does* already drive agent behaviour in the simulated plan (region shards) — that mechanism generalizes.
4. **Universal upload (§3.2)** — portfolio upload is CSV/TSV only; criteria upload is text/paste only and explicitly rejects PDF/DOCX/XLSX (no binary parsers installed). No OCR. No page/sheet/slide provenance on extracted criteria. Criteria are editable (weight sliders) but not the full editable-chips-with-snippet-provenance model. **Needs new dependencies or an Anthropic-native file-parsing route — Question 13.**
5. **Evidence & confidence (§3.3)** — partial: worthiness engine emits fact/inference/assumption provenance; assessment has Tier 1/2/3 + COMPUTED/REASONED badges. Missing: a shared `EvidenceItem` schema, per-figure source+date+confidence rendering app-wide, and the unmissable Evidence-vs-Estimate visual system.
6. **Run states (§3.4)** — SSE streaming with per-agent status exists for the orchestrator; not cancellable, not resumable mid-run. Market-worthiness has exactly the opaque spinner the brief bans.
7. **Config-driven scoring (§7)** — dimension definitions and source routing live inside agent prompt strings; only `WORTHINESS_CONFIG` (thresholds/weights) and lever weights are config-like. No source registry file, no per-dimension source coverage log.
8. **Strategy route comparison (§5)** — nothing models the 8 off-patent or 8 innovative routes side-by-side. No scenario (base/upside/downside) comparison, no sensitivity view, no editable assumptions that re-run the model. Exports exist (PDF/PPTX) but XLSX/CSV data export does not (xlsx write would be a new dep).
9. **Execution pillar (§6)** — unbuilt by design; proposal below.
10. **Engineering baseline (§9)** — no tests, no test runner (needs a dep decision — vitest is the natural fit), no `middleware.ts`, no API response caching, and the security/tenancy fixes below.
11. **Security debt found during audit** (not in the brief, but blocking for a multi-user tool):
    - `search.*` tRPC procedures are public — unauthenticated access to the deal DB.
    - `POST /api/demo` is unauthenticated and returns hardcoded plaintext credentials for a shared account.
    - `POST /api/admin/bootstrap` is unauthenticated unless `ADMIN_BOOTSTRAP_SECRET` is set (it is not in `.env.example`).
    - `negotiation.updateStatus` / `addActivity` / `runConductor` mutate by raw id with no owner scoping — any signed-in user can modify another tenant's negotiations.

## 5. Migration plan

One branch + one PR per phase, conventional commits. Recommended order (nav collapse *last* so the app stays usable throughout):

| Phase | Branch | Content | Blast radius |
|---|---|---|---|
| **0.5 Security hotfix** | `fix/security-tenancy` | Protect `search` router; gate/remove `/api/demo` + `/api/admin/bootstrap`; owner-scope the three negotiation mutations; add `middleware.ts`. | Small (~6 files). Independent of the refactor; recommend shipping immediately. |
| **1 Run spine + schemas** | `refactor/run-spine` | Shared typed schemas (`Run`, `Diagnosis`, `Strategy`, `Criterion`, `EvidenceItem`, `Geography`); Prisma `Run` model + migration (fold `HubRequest/HubResult/Evaluation` into it); config files for dimension sets + source registry per branch. No UI change. | Medium — `types/hub.ts` has ~20 consumers; prod DB migration required (the missing `Evaluation` table gets resolved here too). |
| **2 Cross-cutting components** | `refactor/cross-cutting` | Geography selector (hierarchical multi-select + presets, one source of truth), universal uploader (pipeline per §3.2), evidence/confidence badge system, run console (streaming, cancellable). | Medium — new components + rewiring intake forms. Depends on Question 13 (parsing deps). |
| **3 Diagnosis 1A** | `refactor/diagnosis-offpatent` | Shared diagnosis shell; relocate the simulated-plan verdict/COS/levers + computed layer into 1A with the §4.1 dimension table; fold arbitrage → exclusivity-runway dimension, trends → competitive-intensity/price-erosion, benchmarks → evidence drawer; retire the standalone market-worthiness engine into the unified one. Delete `/arbitrage`, `/trends`, `/benchmarks`, `/market-worthiness` pages (with redirects). | **High** — touches agents, 4 page deletions, the run list. |
| **4 Diagnosis 1B** | `refactor/diagnosis-innovative` | New dimension set/prompts/source routing per §4.2, on the shared shell. Mostly additive. | Medium. Gated on Question 8. |
| **5 Strategy 2A/2B** | `refactor/strategy` | Route simulators (§5.1/5.2), assumptions panel + scenarios + sensitivity (salvaging `/insights` calculators), partner shortlist (partner agent + companies store), deal-structure envelope (salvaging `/structure`), XLSX/CSV export. Strategy consumes a completed Diagnosis run. | **High** — largest new build. |
| **6 Execution** | `refactor/execution` | Chosen §6 option + Deal Workspace cleanup (merge negotiations detail, delete fictional tabs). | Medium. Gated on Question 1. |
| **7 Nav collapse + deletions** | `refactor/nav-collapse` | Final 5-item sidebar; delete `/hub`, `/assistant`, `/search`, `/deals` live-mode, `/conductor` page (→ contextual panel), term-builder remnants, settings theater, all dead tRPC procedures + Prisma models + mock files; redirects for old URLs. | Medium but wide — mostly deletion. |

Rules honored: keep existing stack; no new deps without approval (flagged: document parsing, xlsx write, test runner); delete rather than hide; tests added for scoring/simulation/extraction from Phase 1 onward.

## 6. Execution pillar — options (per §6, decide before Phase 6)

- **Option A — Workstream tracker.** Converts the chosen strategy route into milestones/owners/dates/status. Best existing scaffolding: `executionPlan` agent already emits a phased plan; `Negotiation`/`ActionItem` models exist (ActionItem currently dead); Deal Workspace is the natural home. Trade-off: least novel value — it's project management; but it closes the diagnosis→strategy→work loop with the least new surface and no external side effects. **I would build this first.**
- **Option B — Outreach engine.** Partner targets from 2A/2B → contact identification → sequenced outreach drafts → pipeline. The Azure AD Graph scopes (Mail.Send etc.) are already requested at login, but the entire Graph client layer is dead code; contact identification needs new data sources; sending email on behalf of users is the highest-risk surface (compliance, deliverability, tenant isolation). Highest ceiling, highest cost. Build third.
- **Option C — Document & data-room generator.** Teaser, non-confidential summary, TPP, diligence checklist, term-sheet parameter sheet. Strong scaffolding: consulting-grade PDF/PPTX exporters, `docx` dep already installed, term-builder UI to salvage, document-upload pipeline for the data room. Trade-off: output artifacts, not workflow — it doesn't track whether anything happened. Natural second.

Recommendation: **A first, C second, B later** — A gives the pillar its spine (the run's plan becomes trackable work), C hangs deliverables off that spine, B is a separate risk decision.

## 7. Open questions — answer before Phase 1

1. **Execution option** — A / B / C / something else? (My recommendation: A, then C.)
2. **Data sources & credentials** — ~16 keyless clients are live; 8 are env-gated no-ops (`PATENTSVIEW_API_KEY`, `LENS_API_TOKEN`, `EPO_OPS_*`, `NICE_API_KEY`, `IHME_GBD_API_KEY`, `EMA_SPOR_API_KEY`, `PBS_SUBSCRIPTION_KEY`, optional `SEMANTIC_SCHOLAR_API_KEY`). Which keys do you actually have? For dimensions with no connected source, the target behaviour per §3.3 is an explicit "no source connected" state — confirm that's acceptable (vs. dropping the dimension).
3. **Single vs multi-user** — the app is multi-user with owner-scoped rows, a shared demo account, and an admin console. Keep multi-user + shared/saved runs? (Affects how much of the tenancy hardening matters.)
4. **Design system** — shadcn + Tailwind with the orange/black/white brand is consistent and recent. I'd keep it and only consolidate (e.g. the 8 duplicate `formatCurrency` definitions). Latitude beyond that?
5. **Data migration** — `HubRequest/HubResult` rows exist in prod (simulated-plan history); `Evaluation` was never migrated to prod. Can I fold all three into the new `Run` schema with a migration that preserves simulated-plan history, or is a clean break acceptable?
6. **Default geography preset** — which markets matter most in practice? (Current de-facto defaults: US + EU-4 + India corridor.)
7. **Scoring logic to preserve** — I plan to keep: the 6-vector COS + verdict thresholds (`WORTHINESS_CONFIG`), the 10-lever taxonomy with the computed/reasoned split, the erosion backtesting layer, and the quality/jurisdiction directives — and to retire the standalone market-worthiness 4-stage model in favour of them. Confirm.
8. **⚠️ Innovative branch vs the standing thesis.** On 2026-07-20 the product was deliberately reframed to *only* off-patent value maximisation (prompts, archetypes, page copy all enforce it). This brief reinstates a full innovative branch (1B/2B). Confirm the reframe is being widened back out — 1B/2B is the single largest net-new build in the plan.
9. **Which worthiness engine survives** — see redundancy matrix: recommend the simulated-plan engine (COS + levers + computed layer) with the market-worthiness verdict-card UI. Confirm.
10. **CRM surfaces** (`/deals`, `/deals/new`, `/companies`, `/negotiations`) — not covered by the brief's matrix. Proposal above: deals → evidence store + capture flow; companies → entity store behind shortlists; negotiations → merged into Deal Workspace. Confirm or redirect.
11. **Admin group** — keep the hidden admin-only nav group (technically a sixth item)?
12. **Demo access** — the login page's one-click demo (`POST /api/demo`, shared account, plaintext creds in the response) is presumably intentional for sharing the product. Keep (hardened), or remove?
13. **New dependencies** (all need your sign-off per §9): (a) document parsing for §3.2 — either libraries (`unpdf`/`mammoth`/`exceljs` + OCR) or route PDFs/images through the Anthropic API's native file understanding (no new deps, but per-upload token cost); (b) `exceljs` or similar for XLSX **export** in §5.3; (c) `vitest` as the test runner §9 requires. Preferences?
14. **Branch/merge state** — `feat/opportunity-assessment-consulting-decks` is deployed but never merged; `main` is stale. Merge it to `main` before cutting phase branches?
