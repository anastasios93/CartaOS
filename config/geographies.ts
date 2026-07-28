/**
 * Geography configuration (§3.1): World → Region → Country hierarchy, plus
 * one-click presets. Selection is stored on the Run as ISO-3166 alpha-2 codes
 * and MUST drive retrieval — which regulators, pricing/reimbursement regimes,
 * procurement models and competitor sets get queried (see config/sources.ts
 * coverage fields) — not merely filter the output table.
 *
 * Pure data module: no imports, safe for client and server.
 */

export interface Country {
  code: string; // ISO-3166 alpha-2
  name: string;
  flag: string;
}

export interface Region {
  key: string;
  label: string;
  countries: Country[];
}

const c = (code: string, name: string, flag: string): Country => ({ code, name, flag });

export const WORLD: Region[] = [
  {
    key: "north_america",
    label: "North America",
    countries: [c("US", "United States", "🇺🇸"), c("CA", "Canada", "🇨🇦")],
  },
  {
    key: "western_europe",
    label: "Western Europe",
    countries: [
      c("DE", "Germany", "🇩🇪"),
      c("FR", "France", "🇫🇷"),
      c("IT", "Italy", "🇮🇹"),
      c("ES", "Spain", "🇪🇸"),
      c("GB", "United Kingdom", "🇬🇧"),
      c("NL", "Netherlands", "🇳🇱"),
      c("BE", "Belgium", "🇧🇪"),
      c("AT", "Austria", "🇦🇹"),
      c("CH", "Switzerland", "🇨🇭"),
      c("PT", "Portugal", "🇵🇹"),
      c("IE", "Ireland", "🇮🇪"),
      c("LU", "Luxembourg", "🇱🇺"),
    ],
  },
  {
    key: "nordics",
    label: "Nordics",
    countries: [
      c("SE", "Sweden", "🇸🇪"),
      c("DK", "Denmark", "🇩🇰"),
      c("NO", "Norway", "🇳🇴"),
      c("FI", "Finland", "🇫🇮"),
      c("IS", "Iceland", "🇮🇸"),
    ],
  },
  {
    key: "central_eastern_europe",
    label: "Central & Eastern Europe",
    countries: [
      c("PL", "Poland", "🇵🇱"),
      c("CZ", "Czechia", "🇨🇿"),
      c("HU", "Hungary", "🇭🇺"),
      c("RO", "Romania", "🇷🇴"),
      c("BG", "Bulgaria", "🇧🇬"),
      c("SK", "Slovakia", "🇸🇰"),
      c("SI", "Slovenia", "🇸🇮"),
      c("HR", "Croatia", "🇭🇷"),
      c("GR", "Greece", "🇬🇷"),
      c("EE", "Estonia", "🇪🇪"),
      c("LV", "Latvia", "🇱🇻"),
      c("LT", "Lithuania", "🇱🇹"),
      c("CY", "Cyprus", "🇨🇾"),
      c("MT", "Malta", "🇲🇹"),
    ],
  },
  {
    key: "cis",
    label: "CIS & Caucasus",
    countries: [
      c("KZ", "Kazakhstan", "🇰🇿"),
      c("UZ", "Uzbekistan", "🇺🇿"),
      c("AZ", "Azerbaijan", "🇦🇿"),
      c("GE", "Georgia", "🇬🇪"),
      c("AM", "Armenia", "🇦🇲"),
      c("KG", "Kyrgyzstan", "🇰🇬"),
      c("MD", "Moldova", "🇲🇩"),
    ],
  },
  {
    key: "mena",
    label: "Middle East & North Africa",
    countries: [
      c("SA", "Saudi Arabia", "🇸🇦"),
      c("AE", "United Arab Emirates", "🇦🇪"),
      c("QA", "Qatar", "🇶🇦"),
      c("KW", "Kuwait", "🇰🇼"),
      c("BH", "Bahrain", "🇧🇭"),
      c("OM", "Oman", "🇴🇲"),
      c("JO", "Jordan", "🇯🇴"),
      c("LB", "Lebanon", "🇱🇧"),
      c("IL", "Israel", "🇮🇱"),
      c("TR", "Türkiye", "🇹🇷"),
      c("EG", "Egypt", "🇪🇬"),
      c("MA", "Morocco", "🇲🇦"),
      c("DZ", "Algeria", "🇩🇿"),
      c("TN", "Tunisia", "🇹🇳"),
    ],
  },
  {
    key: "africa",
    label: "Sub-Saharan Africa",
    countries: [
      c("ZA", "South Africa", "🇿🇦"),
      c("NG", "Nigeria", "🇳🇬"),
      c("KE", "Kenya", "🇰🇪"),
      c("GH", "Ghana", "🇬🇭"),
      c("ET", "Ethiopia", "🇪🇹"),
      c("TZ", "Tanzania", "🇹🇿"),
      c("UG", "Uganda", "🇺🇬"),
      c("RW", "Rwanda", "🇷🇼"),
      c("SN", "Senegal", "🇸🇳"),
      c("CI", "Côte d'Ivoire", "🇨🇮"),
      c("ZM", "Zambia", "🇿🇲"),
      c("BW", "Botswana", "🇧🇼"),
      c("NA", "Namibia", "🇳🇦"),
      c("MZ", "Mozambique", "🇲🇿"),
    ],
  },
  {
    key: "south_asia",
    label: "South Asia",
    countries: [
      c("IN", "India", "🇮🇳"),
      c("PK", "Pakistan", "🇵🇰"),
      c("BD", "Bangladesh", "🇧🇩"),
      c("LK", "Sri Lanka", "🇱🇰"),
      c("NP", "Nepal", "🇳🇵"),
    ],
  },
  {
    key: "east_asia",
    label: "East Asia",
    countries: [
      c("JP", "Japan", "🇯🇵"),
      c("CN", "China", "🇨🇳"),
      c("KR", "South Korea", "🇰🇷"),
      c("TW", "Taiwan", "🇹🇼"),
      c("HK", "Hong Kong", "🇭🇰"),
    ],
  },
  {
    key: "asean",
    label: "Southeast Asia",
    countries: [
      c("SG", "Singapore", "🇸🇬"),
      c("MY", "Malaysia", "🇲🇾"),
      c("TH", "Thailand", "🇹🇭"),
      c("ID", "Indonesia", "🇮🇩"),
      c("PH", "Philippines", "🇵🇭"),
      c("VN", "Vietnam", "🇻🇳"),
    ],
  },
  {
    key: "oceania",
    label: "Oceania",
    countries: [c("AU", "Australia", "🇦🇺"), c("NZ", "New Zealand", "🇳🇿")],
  },
  {
    key: "latam",
    label: "Latin America",
    countries: [
      c("BR", "Brazil", "🇧🇷"),
      c("MX", "Mexico", "🇲🇽"),
      c("AR", "Argentina", "🇦🇷"),
      c("CL", "Chile", "🇨🇱"),
      c("CO", "Colombia", "🇨🇴"),
      c("PE", "Peru", "🇵🇪"),
      c("EC", "Ecuador", "🇪🇨"),
      c("UY", "Uruguay", "🇺🇾"),
      c("CR", "Costa Rica", "🇨🇷"),
      c("PA", "Panama", "🇵🇦"),
      c("DO", "Dominican Republic", "🇩🇴"),
      c("GT", "Guatemala", "🇬🇹"),
    ],
  },
];

export const ALL_COUNTRIES: Country[] = WORLD.flatMap((r) => r.countries);

const COUNTRY_BY_CODE = new Map(ALL_COUNTRIES.map((x) => [x.code, x]));

export function countryByCode(code: string): Country | undefined {
  return COUNTRY_BY_CODE.get(code.toUpperCase());
}

export function regionOf(code: string): Region | undefined {
  const u = code.toUpperCase();
  return WORLD.find((r) => r.countries.some((x) => x.code === u));
}

// ── Presets (§3.1) ───────────────────────────────────────────────────────────

const EU_MEMBERS = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE",
];

export interface GeoPreset {
  key: string;
  label: string;
  countries: string[];
  /** Presets like "tender-driven" encode market mechanics, not membership — editable judgment calls. */
  note?: string;
}

export const GEO_PRESETS: GeoPreset[] = [
  { key: "eu_eea", label: "EU/EEA", countries: [...EU_MEMBERS, "NO", "IS"] },
  { key: "eu5", label: "EU-5", countries: ["DE", "FR", "IT", "ES", "GB"] },
  { key: "eu4", label: "EU-4", countries: ["DE", "FR", "IT", "ES"] },
  { key: "uk", label: "UK", countries: ["GB"] },
  { key: "us", label: "US", countries: ["US"] },
  { key: "japan", label: "Japan", countries: ["JP"] },
  { key: "china", label: "China", countries: ["CN"] },
  { key: "india", label: "India", countries: ["IN"] },
  {
    key: "latam",
    label: "LATAM",
    countries: WORLD.find((r) => r.key === "latam")!.countries.map((x) => x.code),
  },
  {
    key: "mena",
    label: "MENA",
    countries: WORLD.find((r) => r.key === "mena")!.countries.map((x) => x.code),
  },
  {
    key: "asean",
    label: "ASEAN",
    countries: WORLD.find((r) => r.key === "asean")!.countries.map((x) => x.code),
  },
  {
    key: "africa_au",
    label: "Africa/AU",
    countries: WORLD.find((r) => r.key === "africa")!.countries.map((x) => x.code),
  },
  {
    key: "cis",
    label: "CIS",
    countries: WORLD.find((r) => r.key === "cis")!.countries.map((x) => x.code),
  },
  {
    key: "reliance_markets",
    label: "Regulatory reliance markets",
    note: "Markets whose agencies approve via reliance on WHO-listed/stringent reference authorities.",
    countries: [
      "ZA", "NG", "KE", "GH", "TZ", "UG", "RW", "ZM", "ET", "SN", "CI",
      "SA", "AE", "JO", "EG", "MA",
      "SG", "MY", "TH", "PH", "VN", "ID",
      "CL", "CO", "PE", "EC", "CR", "PA", "DO", "GT",
      "KZ", "UZ", "AZ", "GE",
    ],
  },
  {
    key: "tender_markets",
    label: "Tender-driven markets",
    note: "Dominant channel is public/insurer tendering (incl. DE rebate contracts, Nordic/NL procurement, GCC, LATAM public sector).",
    countries: [
      "DE", "NL", "SE", "DK", "NO", "FI",
      "SA", "AE", "QA", "KW", "OM", "BH",
      "ZA", "BR", "MX", "CL", "CO", "PE",
      "PL", "RO", "HU",
    ],
  },
  {
    key: "retail_markets",
    label: "Retail/pharmacy markets",
    note: "Dominant channel is private retail pharmacy / out-of-pocket or PBM-mediated retail.",
    countries: [
      "US", "IN", "PK", "BD", "NG", "KE", "GH", "EG",
      "PH", "ID", "VN", "MY",
      "MX", "BR", "AR", "GT", "DO",
    ],
  },
];

/** Default selection (product decision 2026-07-28): EU-4 + UK + US + Japan + India. */
export const DEFAULT_GEOGRAPHIES: string[] = ["DE", "FR", "IT", "ES", "GB", "US", "JP", "IN"];

export function expandPreset(key: string): string[] {
  return GEO_PRESETS.find((p) => p.key === key)?.countries ?? [];
}

/**
 * Legacy bridge: the pre-refactor UI stored region labels like "European Union"
 * or two-letter pseudo-codes like "EU"/"UK". Normalize anything historical into
 * ISO alpha-2 country codes so old HubRequest rows migrate cleanly.
 */
export function normalizeLegacyGeography(value: string): string[] {
  const v = value.trim();
  const upper = v.toUpperCase();
  if (COUNTRY_BY_CODE.has(upper)) return [upper];
  if (upper === "UK") return ["GB"];
  if (upper === "EU" || /^EUROPEAN UNION/i.test(v)) return expandPreset("eu4");
  if (upper === "ROW" || /REST OF WORLD/i.test(v)) return [];
  const byName = ALL_COUNTRIES.find((x) => x.name.toLowerCase() === v.toLowerCase());
  return byName ? [byName.code] : [];
}
