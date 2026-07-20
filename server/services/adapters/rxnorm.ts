/**
 * Identifier backbone — RxNorm / RxNav.
 *
 * Everything in the value engine joins through this module: RxCUI ⇄ NDC ⇄ ATC
 * ⇄ brand/generic. Build and trust nothing downstream until a molecule resolves
 * here.
 *
 * IMPORTANT mapping subtlety (verified against the live API): NDCs attach at the
 * PRODUCT level (SCD = clinical drug, SBD = branded drug), NOT at the INGREDIENT
 * level. Querying /rxcui/<ingredient>/ndcs.json returns an empty list. So the
 * resolution path is: name → ingredient RxCUI → related SCD/SBD products → NDCs.
 *
 * Attribution: "This product uses publicly available data from the U.S. National
 * Library of Medicine (NLM), National Institutes of Health, Department of Health
 * and Human Services; NLM is not responsible for the product and does not
 * endorse or recommend this or any other product."
 */

import { fetchJSON } from "@/server/services/http";

const RXNAV = "https://rxnav.nlm.nih.gov/REST";

export const NLM_ATTRIBUTION =
  "This product uses publicly available data from the U.S. National Library of Medicine (NLM), National Institutes of Health, Department of Health and Human Services; NLM is not responsible for the product and does not endorse or recommend this or any other product.";

export interface Provenance {
  source: string;
  retrievedAt: string;
  verifyUrl: string;
}

export interface RxProduct {
  rxcui: string;
  name: string;
  /** SCD = clinical (generic) drug, SBD = branded drug. */
  tty: "SCD" | "SBD";
  ndcs: string[];
}

export interface AtcClass {
  classId: string;
  className: string;
}

export interface MoleculeIdentity {
  query: string;
  /** Ingredient-level RxCUI (tty IN). Null when the name does not resolve. */
  ingredientRxcui: string | null;
  ingredientName: string | null;
  atc: AtcClass[];
  products: RxProduct[];
  /** Every distinct 11-digit NDC across all products. */
  allNdcs: string[];
  /** True when at least one branded (SBD) product exists — a brand still on market. */
  hasBrandedProduct: boolean;
  provenance: Provenance[];
}

// ─── Cache ──────────────────────────────────────────────────────────────────
// RxNav is rate-limited and its data changes slowly; cache aggressively.

const TTL_MS = 6 * 60 * 60 * 1000; // 6h
const cache = new Map<string, { at: number; value: unknown }>();

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as T;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  return value;
}

const stamp = (verifyUrl: string, source = "RxNorm (NLM RxNav)"): Provenance => ({
  source,
  retrievedAt: new Date().toISOString(),
  verifyUrl,
});

// ─── NDC normalisation ──────────────────────────────────────────────────────

/**
 * Normalise an NDC to the 11-digit form used by CMS pricing files.
 * A bare 10-digit code is ambiguous (4-4-2 / 5-3-2 / 5-4-1) — we only expand it
 * when hyphens declare the layout, otherwise we return null rather than guess.
 */
export function normalizeNdc(raw: string): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (!digitsOnly) return null;
  if (digitsOnly.length === 11) return digitsOnly;

  const parts = trimmed.split("-").map(p => p.replace(/\D/g, ""));
  if (parts.length === 3 && parts.every(Boolean)) {
    const [a, b, c] = parts;
    // Pad each segment to the canonical 5-4-2 widths.
    if (a.length <= 5 && b.length <= 4 && c.length <= 2) {
      return a.padStart(5, "0") + b.padStart(4, "0") + c.padStart(2, "0");
    }
  }
  return null;
}

// ─── RxNav calls ────────────────────────────────────────────────────────────

/** Resolve a molecule/brand name to its ingredient-level RxCUI. */
export async function resolveIngredient(
  name: string,
): Promise<{ rxcui: string; name: string } | null> {
  const clean = name.trim();
  if (!clean) return null;
  return cached(`ing:${clean.toLowerCase()}`, async () => {
    const url = `${RXNAV}/rxcui.json?name=${encodeURIComponent(clean)}&search=2`;
    try {
      const res = await fetchJSON<any>(url, { timeoutMs: 12000 });
      const id: string | undefined = res?.idGroup?.rxnormId?.[0];
      if (!id) return null;
      // Resolve the canonical name for the id we got back.
      const propUrl = `${RXNAV}/rxcui/${id}/property.json?propName=RxNormName`;
      let canonical = clean;
      try {
        const p = await fetchJSON<any>(propUrl, { timeoutMs: 10000 });
        canonical = p?.propConceptGroup?.propConcept?.[0]?.propValue ?? clean;
      } catch {
        // Non-fatal: keep the queried name.
      }
      return { rxcui: id, name: canonical };
    } catch {
      return null;
    }
  });
}

/** Clinical (SCD) and branded (SBD) products for an ingredient RxCUI. */
export async function getProducts(ingredientRxcui: string, cap = 40): Promise<RxProduct[]> {
  return cached(`prod:${ingredientRxcui}:${cap}`, async () => {
    const url = `${RXNAV}/rxcui/${ingredientRxcui}/related.json?tty=SCD+SBD`;
    try {
      const res = await fetchJSON<any>(url, { timeoutMs: 15000 });
      const groups: any[] = res?.relatedGroup?.conceptGroup ?? [];
      const out: RxProduct[] = [];
      for (const g of groups) {
        const tty = g?.tty;
        if (tty !== "SCD" && tty !== "SBD") continue;
        for (const c of g?.conceptProperties ?? []) {
          out.push({ rxcui: c.rxcui, name: c.name, tty, ndcs: [] });
        }
      }
      return out.slice(0, cap);
    } catch {
      return [];
    }
  });
}

/** NDCs for a PRODUCT-level RxCUI (SCD/SBD). Ingredient RxCUIs return nothing. */
export async function getNdcs(productRxcui: string): Promise<string[]> {
  return cached(`ndc:${productRxcui}`, async () => {
    const url = `${RXNAV}/rxcui/${productRxcui}/ndcs.json`;
    try {
      const res = await fetchJSON<any>(url, { timeoutMs: 12000 });
      const list: string[] = res?.ndcGroup?.ndcList?.ndc ?? [];
      const seen = new Set<string>();
      for (const raw of list) {
        const n = normalizeNdc(raw);
        if (n) seen.add(n);
      }
      return [...seen];
    } catch {
      return [];
    }
  });
}

/** ATC classification for an RxCUI (deduped — RxClass repeats rows per relation). */
export async function getAtc(rxcui: string): Promise<AtcClass[]> {
  return cached(`atc:${rxcui}`, async () => {
    const url = `${RXNAV}/rxclass/class/byRxcui.json?rxcui=${rxcui}&relaSource=ATC`;
    try {
      const res = await fetchJSON<any>(url, { timeoutMs: 12000 });
      const rows: any[] = res?.rxclassDrugInfoList?.rxclassDrugInfo ?? [];
      const byId = new Map<string, AtcClass>();
      for (const r of rows) {
        const item = r?.rxclassMinConceptItem;
        if (item?.classId && !byId.has(item.classId)) {
          byId.set(item.classId, { classId: item.classId, className: item.className ?? "" });
        }
      }
      return [...byId.values()];
    } catch {
      return [];
    }
  });
}

/**
 * Full identity resolution for one molecule. This is the entry point the levers
 * and the document-ingest join use.
 *
 * productCap bounds how many products we pull NDCs for — an ingredient like
 * metformin has 70+ products and each NDC lookup is a request.
 */
export async function resolveMolecule(name: string, productCap = 12): Promise<MoleculeIdentity> {
  const provenance: Provenance[] = [];
  const ing = await resolveIngredient(name);
  provenance.push(stamp(`${RXNAV}/rxcui.json?name=${encodeURIComponent(name.trim())}`));

  if (!ing) {
    return {
      query: name,
      ingredientRxcui: null,
      ingredientName: null,
      atc: [],
      products: [],
      allNdcs: [],
      hasBrandedProduct: false,
      provenance,
    };
  }

  const [products, atc] = await Promise.all([
    getProducts(ing.rxcui),
    getAtc(ing.rxcui),
  ]);
  provenance.push(stamp(`${RXNAV}/rxcui/${ing.rxcui}/related.json?tty=SCD+SBD`));
  provenance.push(stamp(`${RXNAV}/rxclass/class/byRxcui.json?rxcui=${ing.rxcui}&relaSource=ATC`));

  // Pull NDCs for a bounded set of products, GENERICS (SCD) FIRST. This matters:
  // CMS NADAC coverage of generic NDCs is dense (weekly, ~50 pts/yr) whereas
  // branded NDCs are sparse (often <10 pts), and an off-patent value engine cares
  // about the generic price curve. Branded products still follow in the sample so
  // a marketed brand is represented.
  const rank = (p: RxProduct) => (p.tty === "SCD" ? 0 : 1);
  const ordered = [...products].sort((a, b) => rank(a) - rank(b));
  const sample = ordered.slice(0, productCap);
  const ndcLists = await Promise.all(sample.map(p => getNdcs(p.rxcui)));
  sample.forEach((p, i) => { p.ndcs = ndcLists[i]; });

  const allNdcs = [...new Set(sample.flatMap(p => p.ndcs))];

  return {
    query: name,
    ingredientRxcui: ing.rxcui,
    ingredientName: ing.name,
    atc,
    products: sample,
    allNdcs,
    hasBrandedProduct: products.some(p => p.tty === "SBD"),
    provenance,
  };
}
