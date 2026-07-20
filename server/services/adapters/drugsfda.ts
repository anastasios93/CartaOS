/**
 * openFDA Drugs@FDA adapter — approved-application and product landscape.
 *
 * Drugs@FDA is the approval registry: every NDA, ANDA and BLA the agency has
 * acted on, with the products (dosage form, route, strength, marketing status,
 * therapeutic-equivalence code) each application carries. That makes it the
 * cheapest read on GENERIC COMPETITION — an ANDA count is a direct proxy for how
 * many entrants have already cleared the regulatory bar, and an "A"-series TE
 * code means those entrants are automatically substitutable at the pharmacy
 * counter, which is what actually collapses price.
 *
 * Verified endpoint:
 *   https://api.fda.gov/drug/drugsfda.json?search=openfda.generic_name:"<name>"&limit=100
 *
 * Verified response shape:
 *   { meta: { results: { total } },
 *     results: [ { application_number, sponsor_name,
 *                  products: [ { dosage_form, route, marketing_status, te_code,
 *                                active_ingredients: [{ name, strength }] } ] } ] }
 *
 * Verified gotchas:
 *  - openFDA returns HTTP 404 with a JSON error body when a search matches
 *    nothing. That is "no data", not a fault — it must NOT propagate as an
 *    exception, or every unknown molecule looks like an outage.
 *  - openfda.generic_name is frequently the SALT form ("atorvastatin calcium"),
 *    so the caller may legitimately pass either the base or the salt. We search
 *    with the name exactly as given rather than guessing a normalisation.
 *  - application_number is prefixed by type: "ANDA205519", "NDA020702", "BLA…".
 *  - marketing_status is one of "Prescription" | "Discontinued" |
 *    "Over-the-counter"; te_code is often absent on brand/NDA products.
 *
 * Attribution: openFDA, U.S. Food & Drug Administration.
 */

import { fetchJSON } from "@/server/services/http";
import type { Provenance } from "./rxnorm";

const ENDPOINT = "https://api.fda.gov/drug/drugsfda.json";

export interface DrugsFdaProfile {
  totalApplications: number;
  /** application_number starting "ANDA" — generic entrants. */
  andaCount: number;
  /** application_number starting "NDA". */
  ndaCount: number;
  /** application_number starting "BLA". */
  blaCount: number;
  /** Distinct sponsor_name, max 15. */
  sponsors: string[];
  /** Distinct dosage forms, uppercased and deduped. */
  dosageForms: string[];
  /** Distinct routes, uppercased and deduped. */
  routes: string[];
  /** Distinct active-ingredient strength strings, max 20. */
  strengths: string[];
  /** Distinct te_code values, empty ones excluded. */
  teCodes: string[];
  /** true if any product has a te_code starting "A" (therapeutically equivalent / substitutable). */
  hasSubstitutableAB: boolean;
  /** marketing_status -> product count. */
  marketingStatuses: Record<string, number>;
  discontinuedProductCount: number;
  /** Products whose marketing_status is not "Discontinued". */
  activeProductCount: number;
  provenance: Provenance;
}

const profileCache = new Map<string, { at: number; value: DrugsFdaProfile | null }>();
const PROFILE_TTL_MS = 12 * 60 * 60 * 1000;

/** Case-insensitive dedupe that preserves the first-seen casing. */
function pushDistinct(seen: Set<string>, out: string[], raw: unknown): void {
  const v = String(raw ?? "").trim();
  if (!v) return;
  const key = v.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  out.push(v);
}

/**
 * Application/product profile for one generic (or salt) name.
 * Returns null when the molecule has no Drugs@FDA record or the API is
 * unreachable — callers report a data gap rather than failing.
 */
export async function getDrugsFdaProfile(name: string): Promise<DrugsFdaProfile | null> {
  const key = name.trim().toLowerCase();
  if (!key) return null;

  const hit = profileCache.get(key);
  if (hit && Date.now() - hit.at < PROFILE_TTL_MS) return hit.value;

  let value: DrugsFdaProfile | null = null;
  try {
    const url =
      `${ENDPOINT}?search=${encodeURIComponent(`openfda.generic_name:"${name}"`)}&limit=100`;
    // A 404 here means "no match" — fetchJSON throws, and the catch below maps
    // it to null, which is exactly the intended semantics.
    const res = await fetchJSON<any>(url, { timeoutMs: 25000 });
    const results: any[] = Array.isArray(res?.results) ? res.results : [];

    if (results.length) {
      let andaCount = 0;
      let ndaCount = 0;
      let blaCount = 0;
      let discontinuedProductCount = 0;
      let activeProductCount = 0;
      let hasSubstitutableAB = false;
      const marketingStatuses: Record<string, number> = {};

      const sponsorSeen = new Set<string>();
      const sponsors: string[] = [];
      const formSeen = new Set<string>();
      const dosageForms: string[] = [];
      const routeSeen = new Set<string>();
      const routes: string[] = [];
      const strengthSeen = new Set<string>();
      const strengths: string[] = [];
      const teSeen = new Set<string>();
      const teCodes: string[] = [];

      for (const app of results) {
        const num = String(app?.application_number ?? "").toUpperCase();
        if (num.startsWith("ANDA")) andaCount++;
        else if (num.startsWith("NDA")) ndaCount++;
        else if (num.startsWith("BLA")) blaCount++;

        pushDistinct(sponsorSeen, sponsors, app?.sponsor_name);

        const products: any[] = Array.isArray(app?.products) ? app.products : [];
        for (const p of products) {
          pushDistinct(formSeen, dosageForms, String(p?.dosage_form ?? "").toUpperCase());
          pushDistinct(routeSeen, routes, String(p?.route ?? "").toUpperCase());

          const te = String(p?.te_code ?? "").trim().toUpperCase();
          if (te) {
            pushDistinct(teSeen, teCodes, te);
            if (te.startsWith("A")) hasSubstitutableAB = true;
          }

          const status = String(p?.marketing_status ?? "").trim();
          if (status) {
            marketingStatuses[status] = (marketingStatuses[status] ?? 0) + 1;
            if (status === "Discontinued") discontinuedProductCount++;
            else activeProductCount++;
          }

          const ingredients: any[] = Array.isArray(p?.active_ingredients) ? p.active_ingredients : [];
          for (const ing of ingredients) {
            pushDistinct(strengthSeen, strengths, ing?.strength);
          }
        }
      }

      const total = Number(res?.meta?.results?.total);

      value = {
        totalApplications: Number.isFinite(total) ? total : results.length,
        andaCount,
        ndaCount,
        blaCount,
        sponsors: sponsors.slice(0, 15),
        dosageForms,
        routes,
        strengths: strengths.slice(0, 20),
        teCodes,
        hasSubstitutableAB,
        marketingStatuses,
        discontinuedProductCount,
        activeProductCount,
        provenance: {
          source: "openFDA Drugs@FDA",
          retrievedAt: new Date().toISOString(),
          verifyUrl: "https://open.fda.gov/apis/drug/drugsfda/",
        },
      };
    }
  } catch {
    value = null; // 404 (no match) or transport failure — degrade to a data gap.
  }

  profileCache.set(key, { at: Date.now(), value });
  return value;
}
