import { describe, expect, it } from "vitest";
import {
  OFF_PATENT_DIMENSIONS,
  INNOVATIVE_DIMENSIONS,
  dimensionsFor,
  verdictForScore,
} from "../config/dimensions";
import { SOURCES, sourceById, sourcesForGeographies, sourceAvailable } from "../config/sources";
import {
  WORLD,
  ALL_COUNTRIES,
  GEO_PRESETS,
  DEFAULT_GEOGRAPHIES,
  countryByCode,
  normalizeLegacyGeography,
  expandPreset,
} from "../config/geographies";

describe("dimension config", () => {
  it.each([
    ["off-patent", OFF_PATENT_DIMENSIONS],
    ["innovative", INNOVATIVE_DIMENSIONS],
  ])("%s weights sum to 100", (_name, dims) => {
    expect(dims.reduce((a, d) => a + d.weight, 0)).toBe(100);
  });

  it.each([
    ["off-patent", OFF_PATENT_DIMENSIONS],
    ["innovative", INNOVATIVE_DIMENSIONS],
  ])("%s dimension keys are unique", (_name, dims) => {
    const keys = dims.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every dimension source id exists in the registry", () => {
    for (const d of [...OFF_PATENT_DIMENSIONS, ...INNOVATIVE_DIMENSIONS]) {
      for (const s of d.sources) {
        expect(sourceById(s), `unknown source "${s}" on dimension "${d.key}"`).toBeDefined();
      }
    }
  });

  it("branches use different dimension sets (§7: no shared question set)", () => {
    const off = new Set(OFF_PATENT_DIMENSIONS.map((d) => d.key));
    const innov = new Set(INNOVATIVE_DIMENSIONS.map((d) => d.key));
    for (const k of off) expect(innov.has(k)).toBe(false);
  });

  it("dimensionsFor routes by asset type", () => {
    expect(dimensionsFor("off_patent")).toBe(OFF_PATENT_DIMENSIONS);
    expect(dimensionsFor("innovative")).toBe(INNOVATIVE_DIMENSIONS);
  });

  it("verdict thresholds preserve WORTHINESS_CONFIG (GO ≥68, CONDITIONAL 50–67)", () => {
    expect(verdictForScore(68)).toBe("GO");
    expect(verdictForScore(67)).toBe("CONDITIONAL");
    expect(verdictForScore(50)).toBe("CONDITIONAL");
    expect(verdictForScore(49)).toBe("NO_GO");
  });
});

describe("source registry", () => {
  it("source ids are unique", () => {
    const ids = SOURCES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("country-scoped coverage uses known ISO codes", () => {
    for (const s of SOURCES) {
      if (s.coverage === "global") continue;
      for (const code of s.coverage) {
        expect(countryByCode(code), `source "${s.id}" covers unknown country "${code}"`).toBeDefined();
      }
    }
  });

  it("geography scoping filters country-bound sources but keeps global ones", () => {
    const ids = ["nadac", "nice_uk", "who_gho"];
    const forUS = sourcesForGeographies(ids, ["US"]).map((s) => s.id);
    expect(forUS).toContain("nadac");
    expect(forUS).toContain("who_gho");
    expect(forUS).not.toContain("nice_uk");
  });

  it("env-gated sources report unavailable without their key", () => {
    const lens = sourceById("the_lens")!;
    expect(sourceAvailable(lens, {})).toBe(false);
    expect(sourceAvailable(lens, { LENS_API_TOKEN: "x" })).toBe(true);
    const openSource = sourceById("who_gho")!;
    expect(sourceAvailable(openSource, {})).toBe(true);
  });
});

describe("geography config", () => {
  it("country codes are unique across regions", () => {
    const codes = ALL_COUNTRIES.map((x) => x.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("every preset references known countries", () => {
    for (const p of GEO_PRESETS) {
      for (const code of p.countries) {
        expect(countryByCode(code), `preset "${p.key}" has unknown country "${code}"`).toBeDefined();
      }
    }
  });

  it("default selection is EU-4 + UK + US + Japan + India", () => {
    expect([...DEFAULT_GEOGRAPHIES].sort()).toEqual(
      ["DE", "ES", "FR", "GB", "IN", "IT", "JP", "US"].sort()
    );
  });

  it("expands presets", () => {
    expect(expandPreset("eu5").sort()).toEqual(["DE", "ES", "FR", "GB", "IT"].sort());
    expect(expandPreset("nope")).toEqual([]);
  });

  it("normalizes legacy geography values", () => {
    expect(normalizeLegacyGeography("UK")).toEqual(["GB"]);
    expect(normalizeLegacyGeography("DE")).toEqual(["DE"]);
    expect(normalizeLegacyGeography("Germany")).toEqual(["DE"]);
    expect(normalizeLegacyGeography("EU")).toEqual(expandPreset("eu4"));
    expect(normalizeLegacyGeography("ROW")).toEqual([]);
    expect(normalizeLegacyGeography("Atlantis")).toEqual([]);
  });

  it("regions are non-empty", () => {
    for (const r of WORLD) expect(r.countries.length).toBeGreaterThan(0);
  });
});
