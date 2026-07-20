/**
 * Price-erosion forecasting with backtested model selection.
 *
 * WHY THIS SHAPE, AND NOT A HEAVY ML MODEL
 * There is no labelled cross-sectional training corpus here — we have one
 * univariate weekly price series per NDC. Fitting a gradient-boosted or neural
 * forecaster to a ~50-point series would manufacture exactly the false precision
 * the CartaOS quality bar forbids. What IS well-posed is classical time-series
 * forecasting with honest out-of-sample validation.
 *
 * So we fit a panel of candidate models, score every one of them by
 * ROLLING-ORIGIN BACKTEST on held-out points, and select the winner by MEASURED
 * error. The reported accuracy is therefore observed, never asserted — and the
 * selected model is, by construction, the best-performing of the panel on this
 * particular series.
 *
 * Candidates:
 *   naive        — last observed value (the benchmark any model must beat)
 *   mean         — mean of the training window
 *   drift        — naive plus average per-step slope
 *   linear       — OLS on t (constant absolute change)
 *   logLinear    — OLS on log(price): constant PERCENTAGE decay, the canonical
 *                  post-LoE generic erosion shape
 *   dampedHolt   — Holt's linear trend with damping, grid-searched
 *
 * A model that cannot beat `naive` is a signal the series has no exploitable
 * structure; we surface that rather than dress it up.
 */

export interface SeriesPoint {
  date: string;
  pricePerUnit: number;
}

export type ForecastModelName =
  | "naive"
  | "mean"
  | "drift"
  | "linear"
  | "logLinear"
  | "dampedHolt";

export interface ModelScore {
  model: ForecastModelName;
  /** Symmetric MAPE (%) on held-out points — the selection criterion. */
  smape: number;
  /** Mean absolute percentage error (%) on held-out points. */
  mape: number;
  rmse: number;
  /** Number of held-out predictions the score is computed over. */
  evaluations: number;
}

export interface ErosionForecast {
  ok: true;
  /** Winning model, chosen by lowest backtested sMAPE. */
  selectedModel: ForecastModelName;
  /** Every candidate's measured error, best first — the audit trail. */
  leaderboard: ModelScore[];
  /** Measured out-of-sample accuracy of the winner. */
  accuracy: { smape: number; mape: number; rmse: number; evaluations: number };
  /** Winner's sMAPE improvement over the naive benchmark, in percentage points. */
  liftOverNaive: number;
  /** Empirical coverage (%) of the 80% prediction interval during backtest. */
  intervalCoverage80: number;
  /** Forecast path from the model refitted on the full series. */
  forecast: { date: string; pricePerUnit: number; lo80: number; hi80: number }[];
  /** Annualised price change implied by the fit; negative = erosion. */
  annualisedErosionPct: number;
  /**
   * True when the winning model actually beats the naive benchmark. False means
   * the series has no exploitable trend structure — an honest and commercially
   * meaningful finding for a fully-eroded commodity generic, and one we surface
   * rather than dressing up as a forecast.
   */
  beatsNaive: boolean;
  /** Plain-language regime read used by the computed pricing lever. */
  priceRegime: "eroding" | "floored" | "rising";
  observations: number;
  firstDate: string;
  lastDate: string;
  lastPrice: number;
}

export interface ErosionFailure {
  ok: false;
  reason: string;
  observations: number;
}

export type ErosionResult = ErosionForecast | ErosionFailure;

// ─── Fitters ────────────────────────────────────────────────────────────────
// Each returns a function mapping a step index h (1-based, beyond the training
// window) to a predicted price.

type Predictor = (h: number) => number;

function fitNaive(y: number[]): Predictor {
  const last = y[y.length - 1];
  return () => last;
}

function fitMean(y: number[]): Predictor {
  const m = y.reduce((a, b) => a + b, 0) / y.length;
  return () => m;
}

function fitDrift(y: number[]): Predictor {
  const n = y.length;
  const last = y[n - 1];
  const slope = n > 1 ? (y[n - 1] - y[0]) / (n - 1) : 0;
  return h => last + slope * h;
}

/** Ordinary least squares of y on t = 0..n-1. */
function ols(y: number[]): { intercept: number; slope: number } {
  const n = y.length;
  const meanT = (n - 1) / 2;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let t = 0; t < n; t++) {
    num += (t - meanT) * (y[t] - meanY);
    den += (t - meanT) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  return { intercept: meanY - slope * meanT, slope };
}

function fitLinear(y: number[]): Predictor {
  const { intercept, slope } = ols(y);
  const n = y.length;
  return h => intercept + slope * (n - 1 + h);
}

/** Constant-percentage decay: OLS in log space, exponentiated back. */
function fitLogLinear(y: number[]): Predictor {
  if (y.some(v => v <= 0)) return fitLinear(y);
  const logs = y.map(Math.log);
  const { intercept, slope } = ols(logs);
  const n = y.length;
  return h => Math.exp(intercept + slope * (n - 1 + h));
}

/** Holt's linear trend with damping; small grid search on (alpha, beta, phi). */
function fitDampedHolt(y: number[]): Predictor {
  const n = y.length;
  if (n < 3) return fitNaive(y);

  let best: { sse: number; level: number; trend: number; phi: number } | null = null;
  const grid = [0.1, 0.3, 0.5, 0.7, 0.9];
  const phis = [0.8, 0.9, 0.98];

  for (const alpha of grid) {
    for (const beta of grid) {
      for (const phi of phis) {
        let level = y[0];
        let trend = y[1] - y[0];
        let sse = 0;
        for (let t = 1; t < n; t++) {
          const fitted = level + phi * trend;
          sse += (y[t] - fitted) ** 2;
          const prevLevel = level;
          level = alpha * y[t] + (1 - alpha) * fitted;
          trend = beta * (level - prevLevel) + (1 - beta) * phi * trend;
        }
        if (!best || sse < best.sse) best = { sse, level, trend, phi };
      }
    }
  }

  const { level, trend, phi } = best!;
  return h => {
    // Damped trend sums a geometric series of phi.
    let damp = 0;
    for (let i = 1; i <= h; i++) damp += Math.pow(phi, i);
    return level + damp * trend;
  };
}

const FITTERS: Record<ForecastModelName, (y: number[]) => Predictor> = {
  naive: fitNaive,
  mean: fitMean,
  drift: fitDrift,
  linear: fitLinear,
  logLinear: fitLogLinear,
  dampedHolt: fitDampedHolt,
};

// ─── Backtest ───────────────────────────────────────────────────────────────

/**
 * Rolling-origin (expanding-window) backtest. For each origin we fit only on
 * data strictly before it and predict forward, so every scored point is genuinely
 * out of sample.
 */
function backtest(y: number[], horizon: number): { scores: ModelScore[]; residualsByModel: Map<ForecastModelName, number[]> } {
  const n = y.length;
  const minTrain = Math.max(5, Math.ceil(n * 0.4));
  const residualsByModel = new Map<ForecastModelName, number[]>();
  const scores: ModelScore[] = [];

  for (const model of Object.keys(FITTERS) as ForecastModelName[]) {
    const absPct: number[] = [];
    const symPct: number[] = [];
    const sq: number[] = [];
    const residuals: number[] = [];

    for (let origin = minTrain; origin < n; origin++) {
      const train = y.slice(0, origin);
      let predict: Predictor;
      try {
        predict = FITTERS[model](train);
      } catch {
        continue;
      }
      const maxH = Math.min(horizon, n - origin);
      for (let h = 1; h <= maxH; h++) {
        const actual = y[origin + h - 1];
        const f = predict(h);
        if (!Number.isFinite(f) || !Number.isFinite(actual)) continue;
        const err = f - actual;
        residuals.push(err);
        sq.push(err * err);
        if (actual !== 0) absPct.push((Math.abs(err) / Math.abs(actual)) * 100);
        const denom = Math.abs(f) + Math.abs(actual);
        if (denom > 0) symPct.push((200 * Math.abs(err)) / denom);
      }
    }

    if (!symPct.length) continue;
    const mean = (a: number[]) => a.reduce((x, b) => x + b, 0) / a.length;
    residualsByModel.set(model, residuals);
    scores.push({
      model,
      smape: mean(symPct),
      mape: absPct.length ? mean(absPct) : Number.NaN,
      rmse: Math.sqrt(mean(sq)),
      evaluations: symPct.length,
    });
  }

  scores.sort((a, b) => a.smape - b.smape);
  return { scores, residualsByModel };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Fit, validate and forecast a price series.
 * `horizon` is in series steps (NADAC is roughly weekly).
 */
export function forecastErosion(points: SeriesPoint[], horizon = 12): ErosionResult {
  const clean = points
    .filter(p => Number.isFinite(p.pricePerUnit) && p.pricePerUnit > 0 && !!p.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (clean.length < 8) {
    return {
      ok: false,
      reason: `Only ${clean.length} usable price observations; at least 8 are needed to validate a forecast out of sample.`,
      observations: clean.length,
    };
  }

  const y = clean.map(p => p.pricePerUnit);
  const { scores, residualsByModel } = backtest(y, Math.min(horizon, 8));

  if (!scores.length) {
    return { ok: false, reason: "No candidate model could be validated on this series.", observations: y.length };
  }

  const winner = scores[0];
  const naive = scores.find(s => s.model === "naive");
  const residuals = residualsByModel.get(winner.model) ?? [];
  const resSd = residuals.length
    ? Math.sqrt(residuals.reduce((a, r) => a + r * r, 0) / residuals.length)
    : 0;
  const z80 = 1.2816;
  const band = z80 * resSd;

  // Empirical coverage of the 80% band during backtest.
  const covered = residuals.filter(r => Math.abs(r) <= band).length;
  const intervalCoverage80 = residuals.length ? (covered / residuals.length) * 100 : 0;

  // Refit the winner on the full series and project forward.
  const predict = FITTERS[winner.model](y);
  const lastDate = clean[clean.length - 1].date;
  const stepDays = estimateStepDays(clean);
  const forecast = Array.from({ length: horizon }, (_, i) => {
    const h = i + 1;
    const v = predict(h);
    const price = Number.isFinite(v) ? Math.max(0, v) : y[y.length - 1];
    return {
      date: addDays(lastDate, Math.round(stepDays * h)),
      pricePerUnit: round(price, 5),
      lo80: round(Math.max(0, price - band), 5),
      hi80: round(price + band, 5),
    };
  });

  // Annualised change implied by the fit, measured over one year of steps.
  const stepsPerYear = stepDays > 0 ? 365 / stepDays : 52;
  const last = y[y.length - 1];
  const oneYear = predict(Math.round(stepsPerYear));
  const annualisedErosionPct =
    last > 0 && Number.isFinite(oneYear) ? round(((oneYear - last) / last) * 100, 2) : 0;

  // A trend model must actually beat naive before we claim a price trajectory.
  const beatsNaive = !!naive && winner.model !== "naive" && winner.smape < naive.smape;
  const priceRegime: "eroding" | "floored" | "rising" =
    !beatsNaive || Math.abs(annualisedErosionPct) < 2
      ? "floored"
      : annualisedErosionPct < 0
        ? "eroding"
        : "rising";

  return {
    ok: true,
    selectedModel: winner.model,
    beatsNaive,
    priceRegime,
    leaderboard: scores.map(s => ({ ...s, smape: round(s.smape, 3), mape: round(s.mape, 3), rmse: round(s.rmse, 5) })),
    accuracy: {
      smape: round(winner.smape, 3),
      mape: round(winner.mape, 3),
      rmse: round(winner.rmse, 5),
      evaluations: winner.evaluations,
    },
    liftOverNaive: naive ? round(naive.smape - winner.smape, 3) : 0,
    intervalCoverage80: round(intervalCoverage80, 1),
    forecast,
    annualisedErosionPct,
    observations: y.length,
    firstDate: clean[0].date,
    lastDate,
    lastPrice: round(last, 5),
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function estimateStepDays(points: SeriesPoint[]): number {
  if (points.length < 2) return 7;
  const gaps: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const d = (Date.parse(points[i].date) - Date.parse(points[i - 1].date)) / 86400000;
    if (Number.isFinite(d) && d > 0) gaps.push(d);
  }
  if (!gaps.length) return 7;
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)]; // median gap resists irregular reporting
}

function addDays(iso: string, days: number): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t + days * 86400000).toISOString().slice(0, 10);
}

function round(v: number, dp: number): number {
  if (!Number.isFinite(v)) return v;
  const f = Math.pow(10, dp);
  return Math.round(v * f) / f;
}
