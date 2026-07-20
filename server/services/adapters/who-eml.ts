/**
 * WHO Repository of National Essential Medicines Lists (nEML) adapter.
 *
 * This is the backbone for the EX-US geographic-expansion lever: for a given
 * molecule it answers "which countries carry this on their national essential
 * medicines list, and is it on the WHO model list?" — the single best open proxy
 * for national registration/priority outside the US.
 *
 * Verified API behaviour (global.essentialmeds.org):
 *  - There is no REST API; every /api/* path returns the SPA HTML shell. The real
 *    data endpoint is GraphQL at /graphql.
 *  - Query.medicines(id: Int) is the ONLY filter — there is no name or ATC
 *    argument, so we fetch the full index once and match locally.
 *  - `primaryAtcCode` and `otherAtcCodes` are EMPTY on every record (verified
 *    across all 2068 medicines), so the ATC join key is unusable here. We match
 *    on ingredient NAME against the canonical RxNorm ingredient name instead.
 *  - Requesting `medicines { countries { ... } }` in one query times out upstream.
 *    Fetching countries for a SINGLE medicine id is fast (~0.6s). Hence two steps.
 *
 * Attribution: WHO Repository of National Essential Medicines Lists.
 */

import { fetchJSON } from "@/server/services/http";
import type { Provenance } from "./rxnorm";

const GQL = "https://global.essentialmeds.org/graphql";

export const WHO_EML_ATTRIBUTION =
  "Data from the WHO Repository of National Essential Medicines Lists (global.essentialmeds.org).";

export interface EmlCountry {
  id: number;
  name: string;
  /** WHO region, e.g. "European", "African", "Americas". */
  region: string;
  /** Year of the national EML edition the listing comes from. */
  nemlYear: number;
}

export interface EmlMatch {
  medicineId: number;
  medicineName: string;
  /** True when the molecule is on the WHO Model List of Essential Medicines. */
  onWhoList: boolean;
  countries: EmlCountry[];
  /** Country count per WHO region. */
  byRegion: Record<string, number>;
  provenance: Provenance;
}

interface IndexEntry {
  id: number;
  name: string;
  onWhoList: boolean;
}

const stamp = (): Provenance => ({
  source: "WHO Repository of National Essential Medicines Lists",
  retrievedAt: new Date().toISOString(),
  verifyUrl: "https://global.essentialmeds.org/",
});

async function gql<T>(query: string, timeoutMs: number): Promise<T> {
  const res = await fetchJSON<{ data: T; errors?: { message: string }[] }>(GQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    timeoutMs,
  });
  if (res.errors?.length) throw new Error(res.errors.map(e => e.message).join("; "));
  return res.data;
}

// ─── Medicine index ─────────────────────────────────────────────────────────
// ~2,000 medicines, ~190 KB, ~13 s to fetch. It changes only when a national list
// is added, so cache it hard and never fetch it twice in a process lifetime.

let indexCache: { at: number; entries: IndexEntry[] } | null = null;
let indexInFlight: Promise<IndexEntry[]> | null = null;
const INDEX_TTL_MS = 24 * 60 * 60 * 1000;

async function loadIndex(): Promise<IndexEntry[]> {
  if (indexCache && Date.now() - indexCache.at < INDEX_TTL_MS) return indexCache.entries;
  // Collapse concurrent callers onto one slow request.
  if (indexInFlight) return indexInFlight;

  indexInFlight = (async () => {
    try {
      const data = await gql<{ medicines: IndexEntry[] }>(
        "{ medicines { id name onWhoList } }",
        45000,
      );
      const entries = data.medicines ?? [];
      indexCache = { at: Date.now(), entries };
      return entries;
    } catch {
      return indexCache?.entries ?? [];
    } finally {
      indexInFlight = null;
    }
  })();
  return indexInFlight;
}

/** Normalise for name matching: lowercase, strip salt/ester and punctuation noise. */
function normaliseName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(hydrochloride|hcl|sodium|calcium|potassium|sulfate|sulphate|maleate|tartrate|besylate|mesylate|citrate|acetate|succinate|fumarate|phosphate|nitrate|bromide|chloride)\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Lookup ─────────────────────────────────────────────────────────────────

const matchCache = new Map<string, { at: number; value: EmlMatch | null }>();
const MATCH_TTL_MS = 12 * 60 * 60 * 1000;

/**
 * Find a molecule's national-EML footprint by ingredient name.
 * Pass the canonical RxNorm ingredient name for the best hit rate.
 */
export async function getEmlFootprint(ingredientName: string): Promise<EmlMatch | null> {
  const key = normaliseName(ingredientName);
  if (!key) return null;

  const hit = matchCache.get(key);
  if (hit && Date.now() - hit.at < MATCH_TTL_MS) return hit.value;

  let value: EmlMatch | null = null;
  try {
    const index = await loadIndex();
    // Exact normalised match first, then a contained-word fallback.
    let entry = index.find(m => normaliseName(m.name) === key);
    if (!entry) {
      entry = index.find(m => {
        const n = normaliseName(m.name);
        return n.length > 3 && (n === key || key.startsWith(n + " ") || n.startsWith(key + " "));
      });
    }

    if (entry) {
      const data = await gql<{ medicines: { id: number; name: string; onWhoList: boolean; countries: EmlCountry[] }[] }>(
        `{ medicines(id: ${entry.id}) { id name onWhoList countries { id name region nemlYear } } }`,
        25000,
      );
      const m = data.medicines?.[0];
      if (m) {
        const countries = m.countries ?? [];
        const byRegion: Record<string, number> = {};
        for (const c of countries) byRegion[c.region] = (byRegion[c.region] ?? 0) + 1;
        value = {
          medicineId: m.id,
          medicineName: m.name,
          onWhoList: !!m.onWhoList,
          countries,
          byRegion,
          provenance: stamp(),
        };
      }
    }
  } catch {
    value = null; // Degrade to a stated data gap rather than a guess.
  }

  matchCache.set(key, { at: Date.now(), value });
  return value;
}
