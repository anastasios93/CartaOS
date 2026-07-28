import { describe, expect, it } from "vitest";
import { normaliseAssumptions, mergeRoutes, normalisePartners } from "../server/agents/strategy";
import { modelAllRoutes, OFF_PATENT_REQUIRED, type RouteEconomics } from "../server/services/strategy/model";
import { OFF_PATENT_ROUTES } from "../config/routes";

const values = {
  addressableRevenueYear1: 20_000_000,
  shareCapture: 0.2,
  erosionRatePct: 12,
  launchCostTotal: 4_000_000,
  cogsPct: 40,
  timeToLaunchMonths: 18,
  discountRatePct: 10,
  horizonYears: 8,
};

describe("normaliseAssumptions", () => {
  it("keeps only finite values and defaults an unproven basis to assumed", () => {
    const { list, values: v } = normaliseAssumptions(
      [
        { key: "discountRatePct", label: "Discount rate", value: 11, unit: "%", basis: "sourced", source: "WACC memo" },
        { key: "cogsPct", value: 42, basis: "guessed" },
        { key: "horizonYears", value: "not a number" },
      ],
      OFF_PATENT_REQUIRED,
    );
    expect(v.discountRatePct).toBe(11);
    expect(list.find((a) => a.key === "discountRatePct")!.basis).toBe("sourced");
    // Anything that is not literally "sourced" is assumed — no laundering.
    expect(list.find((a) => a.key === "cogsPct")!.basis).toBe("assumed");
    expect(v.horizonYears).toBeUndefined();
    expect(list.some((a) => a.key === "horizonYears")).toBe(false);
  });

  it("retains extra assumptions the model volunteers beyond the required set", () => {
    const { values: v } = normaliseAssumptions(
      [{ key: "volumeGrowthPct", value: 4, basis: "assumed" }],
      OFF_PATENT_REQUIRED,
    );
    expect(v.volumeGrowthPct).toBe(4);
  });

  it("survives a non-array payload", () => {
    expect(normaliseAssumptions(null, OFF_PATENT_REQUIRED).list).toEqual([]);
  });
});

describe("mergeRoutes — the deterministic layer owns the numbers", () => {
  const economics = modelAllRoutes("off_patent", values);

  it("uses the computed economics and discards any figure the model narrated", () => {
    const narrated = [
      { key: "own_ma_own_distribution", score: 80, npv: 999_999_999, breakEvenYear: 0, rationale: "Strong fit." },
    ];
    const merged = mergeRoutes(OFF_PATENT_ROUTES, economics, narrated);
    const row = merged.find((r) => r.key === "own_ma_own_distribution")!;
    const econ = (row.model as { economics: RouteEconomics }).economics;
    const truth = economics.find((e) => e.key === "own_ma_own_distribution") as RouteEconomics;
    expect(econ.npv).toBe(truth.npv);
    expect(econ.npv).not.toBe(999_999_999);
    // The narrative survives; only the arithmetic is taken from the engine.
    expect(row.score).toBe(80);
  });

  it("emits every configured route even when the model scored none", () => {
    const merged = mergeRoutes(OFF_PATENT_ROUTES, economics, null);
    expect(merged.map((r) => r.key)).toEqual(OFF_PATENT_ROUTES.map((r) => r.key));
    expect(merged.every((r) => r.score === null)).toBe(true);
    // Falls back to the configured dependency rather than leaving it blank.
    expect(merged[0].keyDependency).toBe(OFF_PATENT_ROUTES[0].dependencyPrompt);
  });

  it("carries the not-computable state through instead of a fake number", () => {
    const empty = modelAllRoutes("off_patent", {});
    const merged = mergeRoutes(OFF_PATENT_ROUTES, empty, null);
    const econ = (merged[0].model as { economics: { computable: boolean; missing?: string[] } }).economics;
    expect(econ.computable).toBe(false);
    expect(econ.missing!.length).toBeGreaterThan(0);
  });
});

describe("normalisePartners", () => {
  it("ranks by score and drops unknown geography codes", () => {
    const out = normalisePartners([
      { name: "Alpha Pharma", kind: "distributor", geographies: ["DE", "ZZ"], score: 60 },
      { name: "Beta Labs", kind: "licensee", geographies: ["us"], score: 85 },
      { notAName: true },
    ]);
    expect(out.map((p) => p.name)).toEqual(["Beta Labs", "Alpha Pharma"]);
    expect(out[1].geographies).toEqual(["DE"]);
    expect(out[0].geographies).toEqual(["US"]);
  });

  it("returns an empty shortlist rather than inventing one", () => {
    expect(normalisePartners(undefined)).toEqual([]);
  });
});
