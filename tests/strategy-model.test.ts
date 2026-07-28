import { describe, expect, it } from "vitest";
import {
  npv,
  irr,
  breakEvenYear,
  modelOffPatentRoute,
  modelInnovativeRoute,
  modelAllRoutes,
  assetRiskAdjustedValue,
  applyScenario,
  runScenarios,
  sensitivity,
  recommendRoute,
  OFF_PATENT_REQUIRED,
  type RouteEconomics,
} from "../server/services/strategy/model";
import { OFF_PATENT_ROUTES, INNOVATIVE_ROUTES } from "../config/routes";

const offPatent = {
  addressableRevenueYear1: 20_000_000,
  shareCapture: 0.2,
  erosionRatePct: 12,
  volumeGrowthPct: 3,
  launchCostTotal: 4_000_000,
  cogsPct: 40,
  timeToLaunchMonths: 18,
  discountRatePct: 10,
  horizonYears: 8,
};

const innovative = {
  peakSalesUsd: 800_000_000,
  probabilityOfSuccessPct: 25,
  yearsToLaunch: 6,
  costToNextInflectionUsd: 45_000_000,
  discountRatePct: 12,
  horizonYears: 15,
  operatingMarginPct: 35,
  rampYears: 5,
};

const byKey = (rs: ReturnType<typeof modelAllRoutes>, k: string) => rs.find((r) => r.key === k)!;
const asEcon = (r: ReturnType<typeof modelAllRoutes>[number]) => {
  expect(r.computable).toBe(true);
  return r as RouteEconomics;
};

describe("financial primitives", () => {
  it("discounts future cash correctly", () => {
    // 100 today + 110 next year at 10% = 100 + 100 = 200
    expect(npv(10, [100, 110])).toBe(200);
    expect(npv(0, [-50, 25, 25])).toBe(0);
  });

  it("solves IRR for a simple series", () => {
    // -100 now, +110 in a year → 10%
    expect(irr([-100, 110])).toBeCloseTo(10, 1);
  });

  it("returns null IRR when the series never crosses zero", () => {
    expect(irr([100, 50, 25])).toBeNull();
    expect(irr([-100, -50])).toBeNull();
  });

  it("finds the first non-negative cumulative year", () => {
    const cf = [
      { year: 0, revenue: 0, cost: 10, net: -10, cumulative: -10 },
      { year: 1, revenue: 4, cost: 0, net: 4, cumulative: -6 },
      { year: 2, revenue: 9, cost: 0, net: 9, cumulative: 3 },
    ];
    expect(breakEvenYear(cf)).toBe(2);
    expect(breakEvenYear(cf.slice(0, 2))).toBeNull();
  });
});

describe("off-patent route economics", () => {
  it("models every configured route", () => {
    const rs = modelAllRoutes("off_patent", offPatent);
    expect(rs.map((r) => r.key)).toEqual(OFF_PATENT_ROUTES.map((r) => r.key));
    expect(rs.every((r) => r.computable)).toBe(true);
  });

  it("a missing assumption makes the route NOT COMPUTABLE and names the gap", () => {
    const { cogsPct, ...withoutCogs } = offPatent;
    void cogsPct;
    const r = modelOffPatentRoute(OFF_PATENT_ROUTES[0], withoutCogs);
    expect(r.computable).toBe(false);
    if (!r.computable) expect(r.missing).toContain("cogsPct");
  });

  it("every required assumption is genuinely required — none silently defaulted", () => {
    for (const key of OFF_PATENT_REQUIRED) {
      const partial = { ...offPatent } as Record<string, number>;
      delete partial[key];
      const r = modelOffPatentRoute(OFF_PATENT_ROUTES[0], partial);
      expect(r.computable, `"${key}" was silently defaulted`).toBe(false);
    }
  });

  it("owning the MA books full margin; out-licensing books only a royalty", () => {
    const own = asEcon(byKey(modelAllRoutes("off_patent", offPatent), "own_ma_own_distribution"));
    const out = asEcon(byKey(modelAllRoutes("off_patent", offPatent), "out_license_ma"));
    expect(own.peakRevenue).toBeGreaterThan(out.peakRevenue);
    // …but out-licensing carries no launch spend, so it turns cash-positive sooner.
    expect(out.breakEvenYear!).toBeLessThanOrEqual(own.breakEvenYear!);
  });

  it("bears no COGS on a route where the partner carries product", () => {
    const out = asEcon(byKey(modelAllRoutes("off_patent", offPatent), "out_license_ma"));
    expect(out.totalCost).toBe(0);
  });

  it("price erosion actually erodes the revenue line", () => {
    const eroding = asEcon(byKey(modelAllRoutes("off_patent", offPatent), "own_ma_own_distribution"));
    const flat = asEcon(
      byKey(modelAllRoutes("off_patent", { ...offPatent, erosionRatePct: 0 }), "own_ma_own_distribution"),
    );
    expect(flat.totalRevenue).toBeGreaterThan(eroding.totalRevenue);
  });

  it("in-licensing pays cash at close and launches earlier than filing fresh", () => {
    const inLic = asEcon(byKey(modelAllRoutes("off_patent", offPatent), "in_license_ma"));
    const own = asEcon(byKey(modelAllRoutes("off_patent", offPatent), "own_ma_own_distribution"));
    expect(inLic.launchYear).toBeLessThan(own.launchYear);
    expect(inLic.cashflows[0].revenue).toBeLessThan(0); // acquisition price paid
  });

  it("an asset sale is front-loaded consideration with no ongoing revenue", () => {
    const sale = asEcon(byKey(modelAllRoutes("off_patent", offPatent), "asset_sale"));
    expect(sale.cashflows[0].revenue).toBeGreaterThan(0);
    expect(sale.cashflows.slice(1).every((c) => c.revenue === 0)).toBe(true);
    expect(sale.breakEvenYear).toBe(0);
  });

  it("accepts share and percentage assumptions in either 0–1 or 0–100 form", () => {
    const asFraction = asEcon(byKey(modelAllRoutes("off_patent", offPatent), "own_ma_own_distribution"));
    const asPercent = asEcon(
      byKey(modelAllRoutes("off_patent", { ...offPatent, shareCapture: 20, cogsPct: 40 }), "own_ma_own_distribution"),
    );
    expect(asPercent.npv).toBeCloseTo(asFraction.npv, 2);
  });
});

describe("innovative route economics", () => {
  it("risk-adjusts the asset value by probability of success", () => {
    const full = assetRiskAdjustedValue({ ...innovative, probabilityOfSuccessPct: 100 });
    const quarter = assetRiskAdjustedValue(innovative);
    expect(quarter).toBeCloseTo(full * 0.25, 0);
  });

  it("models every configured route", () => {
    const rs = modelAllRoutes("innovative", innovative);
    expect(rs.map((r) => r.key)).toEqual(INNOVATIVE_ROUTES.map((r) => r.key));
    expect(rs.every((r) => r.computable)).toBe(true);
  });

  it("names the missing input rather than inventing a valuation", () => {
    const { peakSalesUsd, ...withoutPeak } = innovative;
    void peakSalesUsd;
    const r = modelInnovativeRoute(INNOVATIVE_ROUTES[0], withoutPeak);
    expect(r.computable).toBe(false);
    if (!r.computable) expect(r.missing).toContain("peakSalesUsd");
  });

  it("a global out-license carries no retained development cost; going alone carries all of it", () => {
    const rs = modelAllRoutes("innovative", innovative);
    expect(asEcon(byKey(rs, "out_license_global")).totalCost).toBe(0);
    expect(asEcon(byKey(rs, "advance_then_transact")).totalCost).toBeCloseTo(
      innovative.costToNextInflectionUsd,
      0,
    );
  });

  it("an outright sale is all upfront, no milestones or royalty", () => {
    const sale = asEcon(byKey(modelAllRoutes("innovative", innovative), "outright_sale"));
    const paid = sale.cashflows.filter((c) => c.revenue > 0);
    expect(paid).toHaveLength(1);
  });

  it("dilution reduces what the holder keeps in a spin-out", () => {
    const spinout = INNOVATIVE_ROUTES.find((r) => r.key === "newco_spinout")!;
    const undiluted = asEcon(modelInnovativeRoute({ ...spinout, dilution: 0 }, innovative));
    const diluted = asEcon(modelInnovativeRoute(spinout, innovative));
    expect(diluted.totalRevenue).toBeLessThan(undiluted.totalRevenue);
  });
});

describe("scenarios (§5.3)", () => {
  it("moves each lever in the direction that is genuinely better or worse", () => {
    const up = applyScenario(offPatent, 20);
    expect(up.addressableRevenueYear1).toBeGreaterThan(offPatent.addressableRevenueYear1);
    expect(up.erosionRatePct).toBeLessThan(offPatent.erosionRatePct); // less erosion IS upside
    expect(up.launchCostTotal).toBeLessThan(offPatent.launchCostTotal);
  });

  it("orders downside < base < upside on the recommended route", () => {
    const s = runScenarios("off_patent", offPatent, 20);
    const pick = (rs: typeof s.base) => asEcon(byKey(rs, "own_ma_own_distribution")).npv;
    expect(pick(s.downside)).toBeLessThan(pick(s.base));
    expect(pick(s.base)).toBeLessThan(pick(s.upside));
  });

  it("leaves assumptions it does not model untouched", () => {
    expect(applyScenario(offPatent, 20).discountRatePct).toBe(offPatent.discountRatePct);
  });
});

describe("sensitivity (§5.3)", () => {
  const entries = sensitivity("off_patent", offPatent, "own_ma_own_distribution", 20);

  it("ranks assumptions by the NPV swing they cause", () => {
    expect(entries.length).toBeGreaterThan(2);
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i - 1].swing).toBeGreaterThanOrEqual(entries[i].swing);
    }
  });

  it("puts the revenue drivers at the top for an own-distribution route", () => {
    expect(["addressableRevenueYear1", "shareCapture"]).toContain(entries[0].key);
  });

  it("omits assumptions that do not move the route at all", () => {
    const royaltyRoute = sensitivity("off_patent", offPatent, "out_license_ma", 20);
    // A royalty route bears no COGS, so cogsPct cannot move its NPV.
    expect(royaltyRoute.some((e) => e.key === "cogsPct")).toBe(false);
  });
});

describe("recommendRoute", () => {
  it("picks the highest-NPV computable route", () => {
    const rs = modelAllRoutes("off_patent", offPatent);
    const best = recommendRoute(rs)!;
    const maxNpv = Math.max(...rs.filter((r) => r.computable).map((r) => (r as RouteEconomics).npv));
    expect(best.npv).toBe(maxNpv);
  });

  it("returns null rather than a guess when nothing is computable", () => {
    expect(recommendRoute(modelAllRoutes("off_patent", {}))).toBeNull();
  });
});
