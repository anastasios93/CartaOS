/**
 * Portfolio ingest heuristics — infers what the columns of an uploaded client
 * sales/portfolio extract mean, then pulls normalized rows out of it.
 *
 * Pure and dependency-free. Deliberately defensive: messy real-world extracts
 * must never throw, and unparseable numbers surface as `undefined` rather than
 * being silently coerced to zero.
 */

export type PortfolioField =
  | "product"
  | "molecule"
  | "ndc"
  | "geography"
  | "units"
  | "revenue"
  | "channel"
  | "indication"
  | "unknown";

export interface ColumnMapping {
  header: string;
  field: PortfolioField;
  confidence: number;
}

export interface PortfolioRow {
  product?: string;
  molecule?: string;
  ndc?: string;
  geography?: string;
  units?: number;
  revenue?: number;
  channel?: string;
  indication?: string;
  raw: Record<string, string>;
}

export interface PortfolioExtract {
  mappings: ColumnMapping[];
  rows: PortfolioRow[];
  moleculeCandidates: string[];
  geographies: string[];
  ndcs: string[];
  totalRevenue?: number;
  unmappedHeaders: string[];
}

type KnownField = Exclude<PortfolioField, "unknown">;

/** Synonyms are stored already normalized (lowercase, alphanumeric only). */
const SYNONYMS: Record<KnownField, string[]> = {
  product: [
    "product",
    "productname",
    "productdescription",
    "brand",
    "brandname",
    "tradename",
    "itemdescription",
    "itemname",
    "item",
    "sku",
    "description",
    "presentation",
  ],
  molecule: [
    "molecule",
    "moleculename",
    "inn",
    "genericname",
    "generic",
    "activeingredient",
    "activesubstance",
    "ingredient",
    "substance",
    "compound",
    "api",
    "drugsubstance",
  ],
  ndc: ["ndc", "ndc11", "ndc10", "ndccode", "nationaldrugcode", "ndcnumber"],
  geography: [
    "geography",
    "geo",
    "country",
    "countryname",
    "countrycode",
    "market",
    "region",
    "territory",
    "nation",
  ],
  units: ["units", "unit", "volume", "qty", "quantity", "packs", "packvolume", "unitsold", "unitssold"],
  revenue: [
    "revenue",
    "netrevenue",
    "grossrevenue",
    "netsales",
    "grosssales",
    "sales",
    "salesvalue",
    "turnover",
    "value",
    "amount",
  ],
  channel: ["channel", "saleschannel", "setting", "caresetting", "distributionchannel", "tradechannel"],
  indication: [
    "indication",
    "indications",
    "therapeuticarea",
    "ta",
    "therapyarea",
    "disease",
    "diseasearea",
    "condition",
  ],
};

const FIELD_ORDER: KnownField[] = [
  "ndc",
  "molecule",
  "product",
  "geography",
  "units",
  "revenue",
  "channel",
  "indication",
];

/** Lowercase and drop everything that is not a letter or digit. */
function normalizeKey(value: string): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Score a header against one field: 1 for an exact synonym hit, 0.6 for
 * containment either way, 0 otherwise. Short tokens are excluded from the
 * fuzzy pass so abbreviations like "ta" cannot swallow unrelated headers.
 */
function scoreField(key: string, field: KnownField): number {
  const synonyms = SYNONYMS[field];
  if (synonyms.indexOf(key) !== -1) return 1;
  if (key.length < 3) return 0;
  for (const syn of synonyms) {
    if (syn.length < 4) continue;
    if (key.indexOf(syn) !== -1 || syn.indexOf(key) !== -1) return 0.6;
  }
  return 0;
}

/**
 * Map each header to a portfolio field. When two headers claim the same field
 * the higher-confidence one wins and the loser is demoted to "unknown".
 */
export function inferColumns(headers: string[]): ColumnMapping[] {
  const list = Array.isArray(headers) ? headers : [];
  const mappings: ColumnMapping[] = list.map((header) => {
    const key = normalizeKey(header);
    let best: PortfolioField = "unknown";
    let bestScore = 0;
    if (key) {
      for (const field of FIELD_ORDER) {
        const score = scoreField(key, field);
        if (score > bestScore) {
          bestScore = score;
          best = field;
        }
      }
    }
    return { header: String(header ?? ""), field: best, confidence: bestScore };
  });

  const winners = new Map<PortfolioField, number>();
  mappings.forEach((m, i) => {
    if (m.field === "unknown") return;
    const heldBy = winners.get(m.field);
    if (heldBy === undefined) {
      winners.set(m.field, i);
      return;
    }
    if (m.confidence > mappings[heldBy].confidence) {
      mappings[heldBy] = { ...mappings[heldBy], field: "unknown", confidence: 0 };
      winners.set(m.field, i);
    } else {
      mappings[i] = { ...m, field: "unknown", confidence: 0 };
    }
  });

  return mappings;
}

/**
 * Normalize an NDC to 11 digits (5-4-2). Hyphens are treated as authoritative
 * layout hints; a bare 10-digit number is ambiguous and yields null rather than
 * a guess.
 */
export function normalizeNdc(raw: string): string | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;

  const digits = text.replace(/\D/g, "");
  if (!digits) return null;

  const hyphenated = /^\d+(?:-\d+)+$/.test(text);
  if (!hyphenated) return digits.length === 11 ? digits : null;

  const segments = text.split("-");
  if (segments.length === 3) {
    const [a, b, c] = segments;
    const layout = `${a.length}-${b.length}-${c.length}`;
    let out: string | null = null;
    if (layout === "5-4-2") out = a + b + c;
    else if (layout === "4-4-2") out = a.padStart(5, "0") + b + c;
    else if (layout === "5-3-2") out = a + b.padStart(4, "0") + c;
    else if (layout === "5-4-1") out = a + b + c.padStart(2, "0");
    else if (digits.length === 11) out = digits;
    return out && out.length === 11 ? out : null;
  }

  return digits.length === 11 ? digits : null;
}

/**
 * Decide whether a lone separator groups thousands rather than marking decimals.
 * Applied identically to "." and "," so US and European inputs behave the same:
 * a single separator followed by exactly three digits ("1.000", "1,000") is a
 * thousands group, unless the integer part is just 0 — nobody writes "0.500"
 * to mean five hundred. Repeated separators are always thousands groups.
 */
function isThousandsGroup(cleaned: string, separator: string, lastIndex: number): boolean {
  if (cleaned.indexOf(separator) !== lastIndex) return true; // more than one
  const decimals = cleaned.length - lastIndex - 1;
  const head = cleaned.slice(0, lastIndex);
  if (decimals !== 3) return false;
  return head !== "" && head !== "0";
}

/**
 * Parse a numeric cell tolerantly: currency symbols, thousands separators in
 * either US ("1,234.56") or European ("1.234,56") style, stray whitespace and
 * parentheses-negatives. Returns undefined when nothing sensible remains.
 */
function parseNumber(raw: string | undefined): number | undefined {
  const text = String(raw ?? "").trim();
  if (!text) return undefined;

  const negative = /^\(.*\)$/.test(text) || /^-/.test(text.replace(/^[^\d(-]*/, ""));
  const cleaned = text.replace(/[^0-9.,]/g, "");
  if (!/\d/.test(cleaned)) return undefined;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized: string;

  if (lastComma !== -1 && lastDot !== -1) {
    // Whichever separator comes last is the decimal point.
    normalized =
      lastComma > lastDot
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (lastComma !== -1) {
    normalized = isThousandsGroup(cleaned, ",", lastComma)
      ? cleaned.replace(/,/g, "")
      : cleaned.replace(",", ".");
  } else if (lastDot !== -1) {
    normalized = isThousandsGroup(cleaned, ".", lastDot)
      ? cleaned.replace(/\./g, "")
      : cleaned;
  } else {
    normalized = cleaned;
  }

  const value = Number(normalized);
  if (!isFinite(value)) return undefined;
  return negative ? -value : value;
}

const GEOGRAPHY_ALIASES: Record<string, string> = {
  US: "US",
  USA: "US",
  "U S": "US",
  "UNITED STATES": "US",
  "UNITED STATES OF AMERICA": "US",
  AMERICA: "US",
  DE: "DE",
  DEU: "DE",
  GER: "DE",
  GERMANY: "DE",
  DEUTSCHLAND: "DE",
  FR: "FR",
  FRA: "FR",
  FRANCE: "FR",
  IT: "IT",
  ITA: "IT",
  ITALY: "IT",
  ITALIA: "IT",
  ES: "ES",
  ESP: "ES",
  SPAIN: "ES",
  ESPANA: "ES",
  UK: "GB",
  GB: "GB",
  GBR: "GB",
  "UNITED KINGDOM": "GB",
  "GREAT BRITAIN": "GB",
  ENGLAND: "GB",
  JP: "JP",
  JPN: "JP",
  JAPAN: "JP",
  CN: "CN",
  CHN: "CN",
  CHINA: "CN",
  IN: "IN",
  IND: "IN",
  INDIA: "IN",
  CA: "CA",
  CAN: "CA",
  CANADA: "CA",
  BR: "BR",
  BRA: "BR",
  BRAZIL: "BR",
  AU: "AU",
  AUS: "AU",
  AUSTRALIA: "AU",
  NL: "NL",
  NLD: "NL",
  NETHERLANDS: "NL",
  CH: "CH",
  CHE: "CH",
  SWITZERLAND: "CH",
  MX: "MX",
  MEX: "MX",
  MEXICO: "MX",
  KR: "KR",
  KOR: "KR",
  "SOUTH KOREA": "KR",
  "KOREA REPUBLIC OF": "KR",
};

/** Map a free-text geography to ISO-3166 alpha-2 where recognized. */
function normalizeGeography(raw: string): string | null {
  const text = String(raw ?? "")
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  if (!text) return null;
  return GEOGRAPHY_ALIASES[text] ?? text;
}

const DOSAGE_PATTERN =
  /\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|ug|g|kg|ml|l|iu|u|%)\b(?:\s*\/\s*\d*(?:[.,]\d+)?\s*(?:mg|mcg|µg|ug|g|ml|l|iu|u)\b)?/gi;

const FORM_PATTERN =
  /\b(?:film[\s-]?coated|coated|prolonged[\s-]?release|modified[\s-]?release|extended[\s-]?release|tablets?|tabs?|capsules?|caps?|injections?|injectable|infusions?|solutions?|soln|suspensions?|creams?|ointments?|gels?|syrups?|powders?|sprays?|patch(?:es)?|drops?|vials?|ampoules?|sachets?|suppositor(?:y|ies)|oral|iv|sc|im)\b/gi;

/**
 * Reduce a product/molecule label to a bare substance name by dropping strength
 * and dosage-form noise (e.g. "Atorvastatin 20 MG film-coated tablet").
 */
function cleanMoleculeName(raw: string): string {
  const original = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!original) return "";

  const stripped = original
    .replace(DOSAGE_PATTERN, " ")
    .replace(FORM_PATTERN, " ")
    .replace(/[(){}\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:/\-–]+|[\s,;:/\-–]+$/g, "")
    .trim();

  // If cleaning consumed everything, the original label was the best we had.
  return stripped || original;
}

/** Ordered dedupe by lowercase key, most frequent first. */
function rankByFrequency(values: string[]): string[] {
  const counts = new Map<string, { label: string; count: number; order: number }>();
  values.forEach((value) => {
    const key = value.toLowerCase();
    const entry = counts.get(key);
    if (entry) entry.count++;
    else counts.set(key, { label: value, count: 1, order: counts.size });
  });
  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count || a.order - b.order)
    .map((e) => e.label);
}

/**
 * Extract normalized portfolio rows plus roll-ups from a parsed table.
 * Never throws — malformed cells are simply omitted from the typed fields.
 */
export function extractPortfolio(table: {
  headers: string[];
  rows: Record<string, string>[];
}): PortfolioExtract {
  const headers = Array.isArray(table?.headers) ? table.headers : [];
  const sourceRows = Array.isArray(table?.rows) ? table.rows : [];
  const mappings = inferColumns(headers);

  const columnOf = new Map<PortfolioField, string>();
  for (const m of mappings) {
    if (m.field !== "unknown" && !columnOf.has(m.field)) columnOf.set(m.field, m.header);
  }

  const cell = (row: Record<string, string>, field: PortfolioField): string | undefined => {
    const header = columnOf.get(field);
    if (header === undefined) return undefined;
    const value = String(row?.[header] ?? "").trim();
    return value || undefined;
  };

  const rows: PortfolioRow[] = [];
  const moleculeSource: string[] = [];
  const geographies: string[] = [];
  const geoSeen = new Set<string>();
  const ndcs: string[] = [];
  const ndcSeen = new Set<string>();
  const hasRevenueColumn = columnOf.has("revenue");
  let revenueSum = 0;
  let sawRevenue = false;

  for (const source of sourceRows) {
    const raw = source && typeof source === "object" ? source : {};
    const row: PortfolioRow = { raw };

    const product = cell(raw, "product");
    const molecule = cell(raw, "molecule");
    const channel = cell(raw, "channel");
    const indication = cell(raw, "indication");
    if (product) row.product = product;
    if (molecule) row.molecule = molecule;
    if (channel) row.channel = channel;
    if (indication) row.indication = indication;

    const ndcRaw = cell(raw, "ndc");
    if (ndcRaw) {
      const ndc = normalizeNdc(ndcRaw);
      if (ndc) {
        row.ndc = ndc;
        if (!ndcSeen.has(ndc)) {
          ndcSeen.add(ndc);
          ndcs.push(ndc);
        }
      }
    }

    const geoRaw = cell(raw, "geography");
    if (geoRaw) {
      const geo = normalizeGeography(geoRaw);
      if (geo) {
        row.geography = geo;
        if (!geoSeen.has(geo)) {
          geoSeen.add(geo);
          geographies.push(geo);
        }
      }
    }

    const units = parseNumber(cell(raw, "units"));
    if (units !== undefined) row.units = units;

    const revenue = parseNumber(cell(raw, "revenue"));
    if (revenue !== undefined) {
      row.revenue = revenue;
      revenueSum += revenue;
      sawRevenue = true;
    }

    // Molecule column wins; product is the fallback source for candidates.
    const candidate = cleanMoleculeName(molecule ?? product ?? "");
    if (candidate) moleculeSource.push(candidate);

    rows.push(row);
  }

  return {
    mappings,
    rows,
    moleculeCandidates: rankByFrequency(moleculeSource),
    geographies,
    ndcs,
    totalRevenue: hasRevenueColumn && sawRevenue ? revenueSum : undefined,
    unmappedHeaders: mappings.filter((m) => m.field === "unknown").map((m) => m.header),
  };
}
