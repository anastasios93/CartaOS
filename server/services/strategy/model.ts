/**
 * Deterministic strategy economics.
 *
 * The model proposes ASSUMPTIONS (each labelled sourced or assumed); this
 * layer computes every NUMBER — cash flows, NPV, IRR, break-even, scenarios
 * and sensitivity. Same rule as the computed levers: the deterministic layer
 * owns the numbers and the language model may only narrate them.
 *
 * A route with a missing required assumption is NOT COMPUTABLE and says which
 * input is missing. It is never defaulted to a plausible-looking figure.
 */

import {
  OFF_PATENT_ROUTES,
  INNOVATIVE_ROUTES,
  type OffPatentRouteDef,
  type InnovativeRouteDef,
} from "@/config/routes";

export interface CashflowPoint {
  year: number;
  revenue: number;
  cost: number;
  net: number;
  cumulative: number;
}

export interface RouteEconomics {
  key: string;
  label: string;
  computable: true;
  cashflows: CashflowPoint[];
  npv: number;
  irr: number | null;
  breakEvenYear: number | null;
  peakRevenue: number;
  totalRevenue: number;
  totalCost: number;
  launchYear: number;
  keyDependency: string;
}

export interface RouteNotComputable {
  key: string;
  label: string;
  computable: false;
  missing: string[];
  keyDependency: string;
}

export type RouteResult = RouteEconomics | RouteNotComputable;

/** Assumption inputs, keyed. Values are plain numbers in the stated unit. */
export type AssumptionValues = Record<string, number>;

// ── Primitives ──────────────────────────────────────────────────────────────

export function npv(ratePct: number, nets: number[]): number {
  const r = ratePct / 100;
  return round2(nets.reduce((acc, n, t) => acc + n / Math.pow(1 + r, t), 0));
}

/**
 * IRR by bisection over [-90%, 1000%]. Returns null when the cash-flow series
 * never crosses zero (no sign change ⇒ no real IRR), rather than a made-up rate.
 */
export function irr(nets: number[]): number | null {
  const f = (r: number) => nets.reduce((acc, n, t) => acc + n / Math.pow(1 + r, t), 0);
  let lo = -0.9;
  let hi = 10;
  let flo = f(lo);
  let fhi = f(hi);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fmid = f(mid);
    if (Math.abs(fmid) < 1e-7) return round2(mid * 100);
    if (flo * fmid < 0) {
      hi = mid;
      fhi = fmid;
    } else {
      lo = mid;
      flo = fmid;
    }
  }
  return round2(((lo + hi) / 2) * 100);
}

/** First year index at which cumulative cash flow turns non-negative. */
export function breakEvenYear(cashflows: CashflowPoint[]): number | null {
  const hit = cashflows.find((c) => c.cumulative >= 0);
  return hit ? hit.year : null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function requireAll(values: AssumptionValues, keys: string[]): string[] {
  return keys.filter((k) => !Number.isFinite(values[k]));
}

function toCashflows(rows: { year: number; revenue: number; cost: number }[]): CashflowPoint[] {
  let cum = 0;
  return rows.map((r) => {
    const net = r.revenue - r.cost;
    cum += net;
    return {
      year: r.year,
      revenue: round2(r.revenue),
      cost: round2(r.cost),
      net: round2(net),
      cumulative: round2(cum),
    };
  });
}

// ── Off-patent route economics (§5.1) ───────────────────────────────────────

export const OFF_PATENT_REQUIRED = [
  "addressableRevenueYear1",
  "shareCapture",
  "erosionRatePct",
  "launchCostTotal",
  "cogsPct",
  "timeToLaunchMonths",
  "discountRatePct",
  "horizonYears",
];

export function modelOffPatentRoute(route: OffPatentRouteDef, v: AssumptionValues): RouteResult {
  const missing = requireAll(v, OFF_PATENT_REQUIRED);
  if (missing.length) {
    return { key: route.key, label: route.label, computable: false, missing, keyDependency: route.dependencyPrompt };
  }

  const horizon = Math.max(1, Math.min(20, Math.round(v.horizonYears)));
  const launchYear = Math.max(
    0,
    Math.ceil((v.timeToLaunchMonths + route.timeToLaunchDeltaMonths) / 12),
  );
  const erosion = Math.max(0, Math.min(0.95, v.erosionRatePct / 100));
  const volumeGrowth = Number.isFinite(v.volumeGrowthPct) ? v.volumeGrowthPct / 100 : 0;
  const share = Math.max(0, Math.min(1, v.shareCapture > 1 ? v.shareCapture / 100 : v.shareCapture));
  const cogs = Math.max(0, Math.min(1, v.cogsPct > 1 ? v.cogsPct / 100 : v.cogsPct));
  const year1Market = v.addressableRevenueYear1 * share;

  const rows: { year: number; revenue: number; cost: number }[] = [];
  for (let t = 0; t <= horizon; t++) {
    let revenue = 0;
    let cost = 0;

    // Launch spend is spread evenly across the pre-launch years (or booked in
    // year 0 when the route launches immediately).
    if (route.bearsLaunchCost) {
      const spreadYears = Math.max(1, launchYear);
      if (t < spreadYears) cost += v.launchCostTotal / spreadYears;
    }

    if (t >= launchYear) {
      const elapsed = t - launchYear;
      const marketRevenue = year1Market * Math.pow(1 - erosion, elapsed) * Math.pow(1 + volumeGrowth, elapsed);
      // A royalty route does not book product sales; it earns on partner sales.
      revenue =
        route.royaltyRate > 0 ? marketRevenue * route.royaltyRate : marketRevenue * route.revenueShare;
      if (route.bearsCogs) cost += revenue * cogs;
    }

    if (t === 0 && route.upfrontMultipleOfYear1 !== 0) {
      // Positive = consideration received; negative = price paid to acquire.
      revenue += year1Market * route.upfrontMultipleOfYear1;
    }

    rows.push({ year: t, revenue, cost });
  }

  const cashflows = toCashflows(rows);
  const nets = cashflows.map((c) => c.net);
  return {
    key: route.key,
    label: route.label,
    computable: true,
    cashflows,
    npv: npv(v.discountRatePct, nets),
    irr: irr(nets),
    breakEvenYear: breakEvenYear(cashflows),
    peakRevenue: round2(Math.max(...cashflows.map((c) => c.revenue))),
    totalRevenue: round2(cashflows.reduce((a, c) => a + c.revenue, 0)),
    totalCost: round2(cashflows.reduce((a, c) => a + c.cost, 0)),
    launchYear,
    keyDependency: route.dependencyPrompt,
  };
}

// ── Innovative route economics (§5.2) ───────────────────────────────────────

export const INNOVATIVE_REQUIRED = [
  "peakSalesUsd",
  "probabilityOfSuccessPct",
  "yearsToLaunch",
  "costToNextInflectionUsd",
  "discountRatePct",
  "horizonYears",
];

/**
 * Risk-adjusted NPV of the underlying asset: a ramped peak-sales curve from
 * launch, probability-weighted for technical/regulatory success, discounted.
 * This is the pool every route then splits.
 */
export function assetRiskAdjustedValue(v: AssumptionValues): number {
  const horizon = Math.max(1, Math.min(25, Math.round(v.horizonYears)));
  const launch = Math.max(0, Math.round(v.yearsToLaunch));
  const pos = Math.max(0, Math.min(1, v.probabilityOfSuccessPct > 1 ? v.probabilityOfSuccessPct / 100 : v.probabilityOfSuccessPct));
  const margin = Number.isFinite(v.operatingMarginPct)
    ? Math.max(0, Math.min(1, v.operatingMarginPct > 1 ? v.operatingMarginPct / 100 : v.operatingMarginPct))
    : 0.35;
  // Five-year linear ramp to peak, then flat to the horizon — the standard
  // first-pass shape; the ramp is exposed as an assumption for the user to edit.
  const rampYears = Number.isFinite(v.rampYears) ? Math.max(1, Math.round(v.rampYears)) : 5;
  const nets: number[] = [];
  for (let t = 0; t <= horizon; t++) {
    if (t < launch) {
      nets.push(0);
      continue;
    }
    const since = t - launch;
    const ramp = Math.min(1, (since + 1) / rampYears);
    nets.push(v.peakSalesUsd * ramp * margin * pos);
  }
  return npv(v.discountRatePct, nets);
}

export function modelInnovativeRoute(route: InnovativeRouteDef, v: AssumptionValues): RouteResult {
  const missing = requireAll(v, INNOVATIVE_REQUIRED);
  if (missing.length) {
    return { key: route.key, label: route.label, computable: false, missing, keyDependency: route.dependencyPrompt };
  }

  const horizon = Math.max(1, Math.min(25, Math.round(v.horizonYears)));
  const assetValue = assetRiskAdjustedValue(v);
  const holderValue = assetValue * route.valueCaptureShare * (1 - route.dilution);
  const transactionYear = Math.max(0, Math.round(route.monthsToTransaction / 12));
  const retainedCost = v.costToNextInflectionUsd * route.costRetainedShare;

  const rows: { year: number; revenue: number; cost: number }[] = [];
  for (let t = 0; t <= horizon; t++) {
    let revenue = 0;
    let cost = 0;

    // Retained development spend is carried until the transaction closes.
    if (retainedCost > 0) {
      const spread = Math.max(1, transactionYear);
      if (t < spread) cost += retainedCost / spread;
    }

    if (t === transactionYear) revenue += holderValue * route.envelope.upfront;
    // Milestones fall between transaction and launch; royalties follow launch.
    const launch = Math.max(transactionYear + 1, Math.round(v.yearsToLaunch));
    if (t > transactionYear && t <= launch && launch > transactionYear) {
      revenue += (holderValue * route.envelope.milestones) / (launch - transactionYear);
    }
    if (t > launch) {
      const royaltyYears = Math.max(1, horizon - launch);
      revenue += (holderValue * route.envelope.royalty) / royaltyYears;
    }

    rows.push({ year: t, revenue, cost });
  }

  const cashflows = toCashflows(rows);
  const nets = cashflows.map((c) => c.net);
  return {
    key: route.key,
    label: route.label,
    computable: true,
    cashflows,
    npv: npv(v.discountRatePct, nets),
    irr: irr(nets),
    breakEvenYear: breakEvenYear(cashflows),
    peakRevenue: round2(Math.max(...cashflows.map((c) => c.revenue))),
    totalRevenue: round2(cashflows.reduce((a, c) => a + c.revenue, 0)),
    totalCost: round2(cashflows.reduce((a, c) => a + c.cost, 0)),
    launchYear: transactionYear,
    keyDependency: route.dependencyPrompt,
  };
}

export function modelAllRoutes(assetType: "off_patent" | "innovative", v: AssumptionValues): RouteResult[] {
  return assetType === "off_patent"
    ? OFF_PATENT_ROUTES.map((r) => modelOffPatentRoute(r, v))
    : INNOVATIVE_ROUTES.map((r) => modelInnovativeRoute(r, v));
}

// ── Scenarios (§5.3) ────────────────────────────────────────────────────────

/** Which assumptions move in a scenario, and in which direction "better" lies. */
const SCENARIO_LEVERS: Record<string, 1 | -1> = {
  addressableRevenueYear1: 1,
  shareCapture: 1,
  peakSalesUsd: 1,
  probabilityOfSuccessPct: 1,
  volumeGrowthPct: 1,
  operatingMarginPct: 1,
  erosionRatePct: -1,
  launchCostTotal: -1,
  cogsPct: -1,
  costToNextInflectionUsd: -1,
  timeToLaunchMonths: -1,
  yearsToLaunch: -1,
};

export function applyScenario(v: AssumptionValues, deltaPct: number): AssumptionValues {
  const out: AssumptionValues = { ...v };
  for (const [key, direction] of Object.entries(SCENARIO_LEVERS)) {
    if (!Number.isFinite(out[key])) continue;
    out[key] = out[key] * (1 + (direction * deltaPct) / 100);
  }
  return out;
}

export interface ScenarioSet {
  base: RouteResult[];
  upside: RouteResult[];
  downside: RouteResult[];
  deltaPct: number;
}

export function runScenarios(
  assetType: "off_patent" | "innovative",
  v: AssumptionValues,
  deltaPct = 20,
): ScenarioSet {
  return {
    base: modelAllRoutes(assetType, v),
    upside: modelAllRoutes(assetType, applyScenario(v, deltaPct)),
    downside: modelAllRoutes(assetType, applyScenario(v, -deltaPct)),
    deltaPct,
  };
}

// ── Sensitivity (§5.3) ──────────────────────────────────────────────────────

export interface SensitivityEntry {
  key: string;
  /** NPV of the named route at −delta and +delta on this one assumption. */
  low: number;
  high: number;
  /** Absolute NPV swing — the ranking metric. */
  swing: number;
}

/**
 * One-at-a-time sensitivity on the recommended route: perturb each assumption
 * ±deltaPct with everything else held, and rank by the resulting NPV swing.
 * Answers §5.3's "which two or three variables dominate the outcome".
 */
export function sensitivity(
  assetType: "off_patent" | "innovative",
  v: AssumptionValues,
  routeKey: string,
  deltaPct = 20,
): SensitivityEntry[] {
  const npvOf = (values: AssumptionValues): number | null => {
    const r = modelAllRoutes(assetType, values).find((x) => x.key === routeKey);
    return r && r.computable ? r.npv : null;
  };
  const entries: SensitivityEntry[] = [];
  for (const key of Object.keys(v)) {
    if (!Number.isFinite(v[key]) || v[key] === 0) continue;
    const low = npvOf({ ...v, [key]: v[key] * (1 - deltaPct / 100) });
    const high = npvOf({ ...v, [key]: v[key] * (1 + deltaPct / 100) });
    if (low == null || high == null) continue;
    const swing = round2(Math.abs(high - low));
    if (swing === 0) continue; // this assumption does not move this route
    entries.push({ key, low, high, swing });
  }
  return entries.sort((a, b) => b.swing - a.swing);
}

/**
 * Fit score below which a route is not eligible to be recommended, on the
 * agent's 0-100 scale.
 */
export const MIN_RECOMMENDABLE_FIT = 40;

export interface Recommendation {
  route: RouteEconomics;
  /** Higher-NPV routes passed over because the agent scored them unviable. */
  setAside: { key: string; npv: number; score: number }[];
  /**
   * True when no route cleared the fit bar and this is simply the best
   * economics available. The headline must say so rather than imply the route
   * is a fit — recommending a structurally impossible route is the false
   * positive that costs the most credibility.
   */
  lowFit: boolean;
}

/**
 * The route to recommend: best NPV among routes the agent judged actually
 * open to this asset.
 *
 * NPV alone is not a recommendation. A real run scored every transaction route
 * for a wholly-owned Phase 3 asset as unavailable, and max-NPV still headlined
 * a route whose own key dependency read "not the situation here". Fit gates
 * which routes may win; economics still rank the survivors, so the engine keeps
 * owning the numbers.
 *
 * `fit` maps route key to the agent's 0-100 score; a missing or null score is
 * treated as unscored and never blocks a route.
 */
export function recommend(
  results: RouteResult[],
  fit?: Record<string, number | null | undefined>,
  minFit: number = MIN_RECOMMENDABLE_FIT,
): Recommendation | null {
  const computable = results.filter((r): r is RouteEconomics => r.computable);
  if (!computable.length) return null;

  const bestOf = (rs: RouteEconomics[]) => rs.reduce((best, r) => (r.npv > best.npv ? r : best));
  const scoreOf = (key: string) => {
    const s = fit?.[key];
    return typeof s === "number" && Number.isFinite(s) ? s : null;
  };

  const eligible = computable.filter((r) => {
    const s = scoreOf(r.key);
    return s == null || s >= minFit;
  });

  if (!eligible.length) return { route: bestOf(computable), setAside: [], lowFit: true };

  const route = bestOf(eligible);
  const setAside = computable
    .filter((r) => r.npv > route.npv)
    .map((r) => ({ key: r.key, npv: r.npv, score: scoreOf(r.key) as number }))
    .sort((a, b) => b.npv - a.npv);

  return { route, setAside, lowFit: false };
}

/** The recommended route itself, or null when nothing is computable. */
export function recommendRoute(
  results: RouteResult[],
  fit?: Record<string, number | null | undefined>,
  minFit: number = MIN_RECOMMENDABLE_FIT,
): RouteEconomics | null {
  return recommend(results, fit, minFit)?.route ?? null;
}
