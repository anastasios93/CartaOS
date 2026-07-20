/**
 * NLM DailyMed adapter — the marketed-label census.
 *
 * DailyMed holds the current SPL (Structured Product Label) for every product
 * actually SHIPPING in the US. Drugs@FDA tells you who is *approved*; DailyMed
 * tells you who is *on the shelf* — and the gap between those two numbers is
 * where supply concentration, quiet exits and repackager churn show up. The
 * distinct labeler count is a usable first-order read on how crowded a molecule
 * really is.
 *
 * Verified endpoint:
 *   https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?drug_name=<name>&pagesize=100
 *
 * Verified response shape:
 *   { metadata: { total_elements, ... }, data: [ { setid, title, ... } ] }
 *
 * Verified gotchas:
 *  - The only structured facts in the list response are `setid` and `title`;
 *    everything else must be parsed out of the title string. The verified format
 *    is "<DRUG> <DOSAGE FORM DESCRIPTION> [LABELER NAME]", e.g.
 *    "ATORVASTATIN CALCIUM TABLET, FILM COATED [DIRECT_RX]".
 *  - Labeler names are noisy (repackagers appear as separate labels), so the
 *    count reflects LABELS, not manufacturers. total_elements can far exceed the
 *    100 rows returned on page one — labelers/formPhrases are therefore derived
 *    from the first page only, while totalLabels is the true total.
 *  - Titles are already uppercase in practice, but not guaranteed; all dedupe is
 *    case-insensitive.
 *
 * Attribution: DailyMed, U.S. National Library of Medicine.
 */

import { fetchJSON } from "@/server/services/http";
import type { Provenance } from "./rxnorm";

const ENDPOINT = "https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json";

export interface DailyMedProfile {
  /** metadata.total_elements — every matching SPL, not just the fetched page. */
  totalLabels: number;
  /** Distinct labeler/marketer names parsed from the [BRACKETED] segment of titles, max 25. */
  labelers: string[];
  /** Distinct dosage-form phrases parsed from the title between the drug name and the bracket, max 15. */
  formPhrases: string[];
  provenance: Provenance;
}

const profileCache = new Map<string, { at: number; value: DailyMedProfile | null }>();
const PROFILE_TTL_MS = 12 * 60 * 60 * 1000;

/** Last [...] group in a title — the labeler/marketer. */
function parseLabeler(title: string): string {
  const matches = title.match(/\[([^\]]*)\]/g);
  if (!matches || !matches.length) return "";
  const last = matches[matches.length - 1];
  return last.slice(1, -1).trim();
}

/** Title text before the first "[", minus a leading copy of the queried drug name. */
function parseFormPhrase(title: string, name: string): string {
  const head = title.split("[")[0]?.trim() ?? "";
  if (!head) return "";
  let rest = head;
  if (name && rest.toLowerCase().startsWith(name.toLowerCase())) {
    rest = rest.slice(name.length);
  }
  return rest.trim().toUpperCase();
}

/**
 * Marketed-label profile for one drug name.
 * Returns null when DailyMed has no labels for the name or the request fails —
 * callers report a data gap rather than failing.
 */
export async function getDailyMedProfile(name: string): Promise<DailyMedProfile | null> {
  const key = name.trim().toLowerCase();
  if (!key) return null;

  const hit = profileCache.get(key);
  if (hit && Date.now() - hit.at < PROFILE_TTL_MS) return hit.value;

  let value: DailyMedProfile | null = null;
  try {
    const url = `${ENDPOINT}?drug_name=${encodeURIComponent(name)}&pagesize=100`;
    const res = await fetchJSON<any>(url, { timeoutMs: 25000 });
    const rows: any[] = Array.isArray(res?.data) ? res.data : [];
    const totalRaw = Number(res?.metadata?.total_elements);
    const totalLabels = Number.isFinite(totalRaw) ? totalRaw : rows.length;

    if (rows.length && totalLabels > 0) {
      const labelerSeen = new Set<string>();
      const labelers: string[] = [];
      const formSeen = new Set<string>();
      const formPhrases: string[] = [];

      for (const row of rows) {
        const title = String(row?.title ?? "");
        if (!title) continue;

        const labeler = parseLabeler(title);
        if (labeler && !labelerSeen.has(labeler.toLowerCase())) {
          labelerSeen.add(labeler.toLowerCase());
          labelers.push(labeler);
        }

        const phrase = parseFormPhrase(title, name);
        if (phrase && !formSeen.has(phrase.toLowerCase())) {
          formSeen.add(phrase.toLowerCase());
          formPhrases.push(phrase);
        }
      }

      value = {
        totalLabels,
        labelers: labelers.slice(0, 25),
        formPhrases: formPhrases.slice(0, 15),
        provenance: {
          source: "DailyMed (NLM)",
          retrievedAt: new Date().toISOString(),
          verifyUrl: "https://dailymed.nlm.nih.gov/",
        },
      };
    }
  } catch {
    value = null; // Degrade gracefully — no labels rather than a thrown error.
  }

  profileCache.set(key, { at: Date.now(), value });
  return value;
}
