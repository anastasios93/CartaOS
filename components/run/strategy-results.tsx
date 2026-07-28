"use client";

/**
 * Pillar 2 — Strategy results (§5.1–§5.3).
 *
 * The agent supplies ASSUMPTIONS and narrative; every NUMBER on this screen is
 * computed here, in the browser, by the same pure deterministic engine the
 * server used (server/services/strategy/model.ts — its only import is
 * config/routes, so it is client-safe). That is what makes the assumptions
 * panel live: edit any driver and the route comparison, scenarios, sensitivity
 * and the recommendation all re-derive without a server round-trip and without
 * re-running the agent.
 *
 * A route whose required inputs are missing is NOT COMPUTABLE and names the
 * inputs it needs — never a zero, never a dash that reads like a real figure.
 */

import { useEffect, useMemo, useState } from "react";
import {
  modelAllRoutes,
  runScenarios,
  sensitivity as computeSensitivity,
  recommendRoute,
  OFF_PATENT_REQUIRED,
  INNOVATIVE_REQUIRED,
  type AssumptionValues,
  type RouteResult,
  type SensitivityEntry,
} from "@/server/services/strategy/model";
import { routesFor } from "@/config/routes";
import { countryByCode } from "@/config/geographies";
import { EvidenceList } from "@/components/run/evidence-badge";
import { exportStrategyPDF } from "@/lib/exports";
import type { Assumption, EvidenceItem, PartnerCandidate, Strategy, StrategyRoute } from "@/types/run";
import {
  ChevronDown,
  Download,
  FileDown,
  GitBranch,
  ListOrdered,
  RotateCcw,
  SlidersHorizontal,
  Split,
  Target,
  Users,
} from "lucide-react";

export type StrategyBranch = "off_patent" | "innovative";

const TINY = "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70";

// ── Assumption vocabulary ────────────────────────────────────────────────────
// Labels and units for every key the engine understands, so a hand-entered
// (agent-free) strategy renders a complete, labelled panel rather than raw keys.

export const ASSUMPTION_META: Record<string, { label: string; unit: string }> = {
  addressableRevenueYear1: { label: "Addressable revenue, year 1", unit: "USD" },
  shareCapture: { label: "Share of that pool captured", unit: "%" },
  erosionRatePct: { label: "Annual price erosion", unit: "%" },
  volumeGrowthPct: { label: "Annual volume growth", unit: "%" },
  launchCostTotal: { label: "Total launch cost", unit: "USD" },
  cogsPct: { label: "COGS as a share of revenue", unit: "%" },
  timeToLaunchMonths: { label: "Time to launch", unit: "months" },
  peakSalesUsd: { label: "Unadjusted peak annual sales", unit: "USD" },
  probabilityOfSuccessPct: { label: "Probability of reaching approval", unit: "%" },
  yearsToLaunch: { label: "Years to launch", unit: "years" },
  costToNextInflectionUsd: { label: "Cost to next inflection", unit: "USD" },
  operatingMarginPct: { label: "Operating margin on peak sales", unit: "%" },
  rampYears: { label: "Years from launch to peak", unit: "years" },
  discountRatePct: { label: "Discount rate", unit: "%" },
  horizonYears: { label: "Modelling horizon", unit: "years" },
};

/** Drivers the engine reads but does not require — offered so they can be filled in. */
const OPTIONAL_KEYS: Record<StrategyBranch, string[]> = {
  off_patent: ["volumeGrowthPct"],
  innovative: ["operatingMarginPct", "rampYears"],
};

export function requiredKeysFor(branch: StrategyBranch): string[] {
  return branch === "off_patent" ? OFF_PATENT_REQUIRED : INNOVATIVE_REQUIRED;
}

export function assumptionLabel(key: string): string {
  return ASSUMPTION_META[key]?.label ?? key;
}

/**
 * A strategy with no agent behind it: every route from config, no assumptions.
 * The panel fills itself in from ASSUMPTION_META and the engine does the rest —
 * the deterministic layer works perfectly well on hand-entered inputs.
 */
export function buildBlankStrategy(branch: StrategyBranch): Strategy {
  return {
    branch,
    routes: routesFor(branch).map((def) => ({
      key: def.key,
      label: def.label,
      score: null,
      model: { description: def.description },
      keyDependency: def.dependencyPrompt,
      evidence: [],
    })),
    assumptions: [],
    sensitivity: [],
    partnerShortlist: [],
  };
}

// ── Formatting ───────────────────────────────────────────────────────────────

/** Compact USD — the engine returns plain numbers; tables need $12.4M / $1.2B. */
function usd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "n/a";
  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(abs >= 1e10 ? 0 : 1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function pct(n: number | null | undefined): string {
  return n == null || !Number.isFinite(n) ? "n/a" : `${n.toFixed(1)}%`;
}

function yearLabel(y: number | null | undefined): string {
  return y == null ? "never" : y === 0 ? "year 0" : `year ${y}`;
}

// ── Defensive readers (agent-authored extras live outside the typed envelope) ─

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.flatMap((v) => (asText(v) ? [asText(v)!] : [])) : [];
}

function evidenceOf(value: unknown): EvidenceItem[] {
  return Array.isArray(value) ? (value.filter((e) => typeof asRecord(e).claim === "string") as EvidenceItem[]) : [];
}

/** The economics the agent stored, when a route key has since left config. */
function storedEconomics(route: StrategyRoute): RouteResult | null {
  const econ = asRecord(route.model).economics;
  const rec = asRecord(econ);
  return typeof rec.key === "string" && typeof rec.computable === "boolean" ? (econ as RouteResult) : null;
}

// ── Small presentational parts ───────────────────────────────────────────────

function ScoreBar({ score, label }: { score: number | null | undefined; label: string }) {
  if (score == null) {
    return <div className="h-1.5 w-full rounded-full bg-[#F1F5F9]" role="img" aria-label={`${label}: not scored`} />;
  }
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className="h-1.5 w-full rounded-full bg-[#F1F5F9] overflow-hidden" role="img" aria-label={`${label}: ${score} out of 100`}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${clamped}%`, backgroundColor: clamped >= 68 ? "#16A34A" : clamped >= 50 ? "#F59E0B" : "#EF4444" }}
      />
    </div>
  );
}

/** Same visual language as EvidenceBadge: sourced = solid ink, assumed = orange outline. */
function BasisBadge({ basis }: { basis: "sourced" | "assumed" }) {
  return basis === "sourced" ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#1A1A2E] text-[10px] font-bold uppercase tracking-wider text-white">
      Sourced
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-[#F97316] bg-white text-[10px] font-bold uppercase tracking-wider text-[#C2410C]">
      <span aria-hidden="true" className="text-[11px] leading-none font-mono">
        ≈
      </span>
      Assumed
    </span>
  );
}

function SectionCard({
  icon: Icon,
  title,
  note,
  action,
  children,
}: {
  icon: typeof Target;
  title: string;
  note?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/40 bg-white p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <p className={`${TINY} flex items-center gap-1.5`}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {title}
        </p>
        {action}
      </div>
      {note && <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed max-w-3xl">{note}</p>}
      {children}
    </section>
  );
}

function MissingNote({ missing }: { missing: string[] }) {
  return (
    <span className="text-[11px] text-[#C2410C] leading-snug">
      <span className="font-semibold">Not computable</span> — needs {missing.map(assumptionLabel).join(", ")}
    </span>
  );
}

// ── Route comparison ─────────────────────────────────────────────────────────

function RouteRow({
  route,
  economics,
  index,
  recommended,
}: {
  route: StrategyRoute;
  economics: RouteResult;
  index: number;
  recommended: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelId = `strategy-route-${index}`;
  const extras = asRecord(route);
  const description = asText(asRecord(route.model).description);
  const rationale = asText(extras.rationale);
  const evidence = evidenceOf(route.evidence);
  const hasDetail = !!description || !!rationale || evidence.length > 0;

  return (
    <>
      <tr className={`border-b border-border/20 align-top ${recommended ? "bg-[#FFF7ED]" : ""}`}>
        <th scope="row" className="py-2.5 pr-3 text-left font-medium">
          <button
            type="button"
            onClick={() => hasDetail && setOpen((v) => !v)}
            aria-expanded={hasDetail ? open : undefined}
            aria-controls={hasDetail ? panelId : undefined}
            disabled={!hasDetail}
            className="flex items-start gap-1.5 text-left rounded enabled:hover:text-[#C2410C] disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
          >
            {hasDetail && (
              <ChevronDown
                className={`h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            )}
            <span className="text-[13px] text-[#1A1A2E] leading-snug">
              {route.label}
              {recommended && (
                <span className="ml-1.5 align-middle text-[9px] font-bold uppercase tracking-widest text-[#C2410C]">
                  recommended
                </span>
              )}
            </span>
          </button>
        </th>
        <td className="py-2.5 pr-3 min-w-[6rem]">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-[3rem]">
              <ScoreBar score={route.score} label={route.label} />
            </div>
            <span className="font-mono text-[12px] font-bold tabular-nums text-[#1A1A2E] shrink-0">
              {route.score ?? "n/a"}
            </span>
          </div>
        </td>
        {economics.computable ? (
          <>
            <td className="py-2.5 pr-3 font-mono text-[13px] font-bold tabular-nums text-[#1A1A2E] whitespace-nowrap">
              {usd(economics.npv)}
            </td>
            <td className="py-2.5 pr-3 font-mono text-[12px] tabular-nums text-[#1A1A2E] whitespace-nowrap">
              {pct(economics.irr)}
            </td>
            <td className="py-2.5 pr-3 text-[12px] text-[#1A1A2E] whitespace-nowrap">
              {yearLabel(economics.breakEvenYear)}
            </td>
            <td className="py-2.5 pr-3 font-mono text-[12px] tabular-nums text-[#1A1A2E] whitespace-nowrap">
              {usd(economics.peakRevenue)}
            </td>
          </>
        ) : (
          <td className="py-2.5 pr-3" colSpan={4}>
            <MissingNote missing={economics.missing} />
          </td>
        )}
        <td className="py-2.5 text-[12px] text-muted-foreground leading-relaxed min-w-[14rem]">
          {route.keyDependency ?? economics.keyDependency}
        </td>
      </tr>
      {hasDetail && open && (
        <tr id={panelId} className="border-b border-border/20 bg-[#FAFAFA]">
          <td colSpan={7} className="px-3 py-3 space-y-2.5">
            {description && <p className="text-[12px] text-muted-foreground leading-relaxed">{description}</p>}
            {rationale && <p className="text-[13px] text-[#1A1A2E] leading-relaxed">{rationale}</p>}
            {evidence.length > 0 && <EvidenceList items={evidence} />}
          </td>
        </tr>
      )}
    </>
  );
}

// ── Sensitivity (tornado) ────────────────────────────────────────────────────

function Tornado({ entries, base, delta }: { entries: SensitivityEntry[]; base: number; delta: number }) {
  const maxAbs = Math.max(
    1,
    ...entries.flatMap((e) => [Math.abs(e.low - base), Math.abs(e.high - base)]),
  );
  return (
    <ul className="space-y-2">
      {entries.map((e) => {
        const lo = Math.min(e.low - base, e.high - base, 0);
        const hi = Math.max(e.low - base, e.high - base, 0);
        return (
          <li key={e.key} className="grid grid-cols-[minmax(7rem,10rem)_1fr_auto] items-center gap-3">
            <span className="text-[12px] text-[#1A1A2E] leading-snug truncate" title={assumptionLabel(e.key)}>
              {assumptionLabel(e.key)}
            </span>
            <div
              className="flex items-center h-4"
              role="img"
              aria-label={`${assumptionLabel(e.key)}: NPV ranges from ${usd(Math.min(e.low, e.high))} to ${usd(Math.max(e.low, e.high))} at plus or minus ${delta} percent`}
            >
              <div className="flex-1 flex justify-end">
                <div className="h-3 rounded-l-sm bg-[#C2410C]/70" style={{ width: `${(-lo / maxAbs) * 100}%` }} />
              </div>
              <div className="w-px h-4 bg-border shrink-0" />
              <div className="flex-1">
                <div className="h-3 rounded-r-sm bg-[#F97316]" style={{ width: `${(hi / maxAbs) * 100}%` }} />
              </div>
            </div>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground whitespace-nowrap">
              ±{usd(e.swing / 2)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ── Partner shortlist ────────────────────────────────────────────────────────

function PartnerCard({ partner, rank }: { partner: PartnerCandidate; rank: number }) {
  const evidence = evidenceOf(partner.evidence);
  return (
    <li className="rounded-xl border border-border/40 bg-white p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-[#1A1A2E] leading-snug">
            <span className="font-mono text-[11px] text-muted-foreground/70 mr-1.5">#{rank}</span>
            {partner.name}
          </p>
          {partner.kind && <p className={`${TINY} mt-1`}>{partner.kind}</p>}
        </div>
        <div className="w-28 shrink-0">
          <ScoreBar score={partner.score ?? null} label={partner.name} />
          <p className="text-right font-mono text-[12px] font-bold tabular-nums text-[#1A1A2E] mt-1">
            {partner.score ?? "n/a"}
          </p>
        </div>
      </div>
      {partner.geographies.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {partner.geographies.map((code) => {
            const country = countryByCode(code);
            return (
              <span
                key={code}
                className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-[#FAFAFA] px-2 py-0.5 text-[11px] text-[#1A1A2E]"
              >
                <span aria-hidden="true">{country?.flag ?? "🏳️"}</span>
                {country?.name ?? code}
              </span>
            );
          })}
        </div>
      )}
      {partner.rationale && (
        <p className="text-[12px] text-muted-foreground mt-2.5 leading-relaxed">{partner.rationale}</p>
      )}
      {evidence.length > 0 && (
        <div className="mt-3">
          <EvidenceList items={evidence} />
        </div>
      )}
    </li>
  );
}

// ── CSV ──────────────────────────────────────────────────────────────────────

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvRows(rows: unknown[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

function downloadBlob(content: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const safeName = (s: string) => s.replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "") || "strategy";

// ── The view ─────────────────────────────────────────────────────────────────

export function StrategyResults({
  strategy,
  branch,
  assetName = "Asset",
}: {
  strategy: Strategy;
  branch: StrategyBranch;
  /** Used for export filenames and the PDF cover; optional so the stated contract holds. */
  assetName?: string;
}) {
  const routes = useMemo<StrategyRoute[]>(
    () => (Array.isArray(strategy.routes) ? strategy.routes : []),
    [strategy.routes],
  );
  const required = requiredKeysFor(branch);

  // Every key the engine can read for this branch, plus anything the agent
  // volunteered — so the panel is complete even when the agent returned nothing.
  const assumptionRows = useMemo<Assumption[]>(() => {
    const supplied = Array.isArray(strategy.assumptions) ? strategy.assumptions : [];
    const byKey = new Map(supplied.map((a) => [a.key, a]));
    const order = [...new Set([...required, ...OPTIONAL_KEYS[branch], ...supplied.map((a) => a.key)])];
    return order.map(
      (key) =>
        byKey.get(key) ?? {
          key,
          label: assumptionLabel(key),
          value: "",
          unit: ASSUMPTION_META[key]?.unit,
          basis: "assumed" as const,
          editable: true,
        },
    );
  }, [strategy.assumptions, branch, required]);

  const initialDraft = useMemo(
    () =>
      Object.fromEntries(
        assumptionRows.map((a) => [a.key, a.value === "" || a.value == null ? "" : String(a.value)]),
      ) as Record<string, string>,
    [assumptionRows],
  );

  const [draft, setDraft] = useState<Record<string, string>>(initialDraft);
  const [delta, setDelta] = useState(20);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // A new strategy (live result, reopened run, or a switch to manual entry)
  // resets the panel to what was modelled.
  useEffect(() => setDraft(initialDraft), [initialDraft]);

  const edited = useMemo(
    () => Object.keys(initialDraft).some((k) => (draft[k] ?? "") !== initialDraft[k]),
    [draft, initialDraft],
  );

  // ── The live model: everything below is derived, nothing is stored ─────────
  const values = useMemo<AssumptionValues>(() => {
    const out: AssumptionValues = {};
    for (const [key, raw] of Object.entries(draft)) {
      if (raw.trim() === "") continue;
      const n = Number(raw);
      if (Number.isFinite(n)) out[key] = n;
    }
    return out;
  }, [draft]);

  const results = useMemo(() => modelAllRoutes(branch, values), [branch, values]);
  const resultsByKey = useMemo(() => new Map(results.map((r) => [r.key, r])), [results]);
  const best = useMemo(() => recommendRoute(results), [results]);
  const scenarios = useMemo(() => runScenarios(branch, values, delta), [branch, values, delta]);
  const sens = useMemo(
    () => (best ? computeSensitivity(branch, values, best.key, delta).slice(0, 6) : []),
    [branch, values, best, delta],
  );

  /** Config is the source of truth; a stored route whose key left config keeps its stored numbers. */
  const economicsFor = (route: StrategyRoute): RouteResult =>
    resultsByKey.get(route.key) ??
    storedEconomics(route) ?? {
      key: route.key,
      label: route.label,
      computable: false,
      missing: required,
      keyDependency: route.keyDependency ?? "",
    };

  const recommendedKey = best?.key ?? asText(strategy.recommendedRoute);
  const modelledKey = asText(strategy.recommendedRoute);
  const recommendedRoute = routes.find((r) => r.key === recommendedKey);
  const missingNow = required.filter((k) => !Number.isFinite(values[k]));
  const storedMissing = asStrings(asRecord(strategy).missingAssumptions);
  const approachSequence = asStrings(asRecord(strategy).approachSequence);
  const partners = Array.isArray(strategy.partnerShortlist) ? strategy.partnerShortlist : [];

  const editedStrategy = useMemo<Strategy>(
    () => ({ ...strategy, assumptions: assumptionRows.map((a) => ({ ...a, value: draft[a.key] ?? "" })) }),
    [strategy, assumptionRows, draft],
  );

  // ── Exports ────────────────────────────────────────────────────────────────

  const downloadCsv = () => {
    const scenarioByKey = (set: RouteResult[]) => new Map(set.map((r) => [r.key, r]));
    const baseMap = scenarioByKey(scenarios.base);
    const upMap = scenarioByKey(scenarios.upside);
    const downMap = scenarioByKey(scenarios.downside);
    const npvCell = (r: RouteResult | undefined) => (r && r.computable ? r.npv : "not computable");

    const lines: string[] = [];
    lines.push(`CartaOS strategy export,${assetName},${branch === "off_patent" ? "Off-patent" : "Innovative"}`);
    lines.push("");
    lines.push("ROUTE COMPARISON");
    lines.push(
      csvRows([
        ["key", "route", "score", "npv_usd", "irr_pct", "break_even_year", "peak_revenue_usd", "total_revenue_usd", "total_cost_usd", "status", "missing_assumptions", "key_dependency"],
        ...routes.map((route) => {
          const e = economicsFor(route);
          return e.computable
            ? [route.key, route.label, route.score ?? "", e.npv, e.irr ?? "", e.breakEvenYear ?? "never", e.peakRevenue, e.totalRevenue, e.totalCost, "computable", "", route.keyDependency ?? e.keyDependency]
            : [route.key, route.label, route.score ?? "", "", "", "", "", "", "", "not computable", e.missing.join("; "), route.keyDependency ?? e.keyDependency];
        }),
      ]),
    );
    lines.push("");
    lines.push("ASSUMPTIONS");
    lines.push(
      csvRows([
        ["key", "label", "value", "unit", "basis", "source"],
        ...assumptionRows.map((a) => [a.key, a.label, draft[a.key] ?? "", a.unit ?? "", a.basis, a.source ?? ""]),
      ]),
    );
    lines.push("");
    lines.push(`SCENARIOS (every driver moved together by +/- ${delta}%)`);
    lines.push(
      csvRows([
        ["key", "route", "downside_npv_usd", "base_npv_usd", "upside_npv_usd"],
        ...routes.map((r) => [r.key, r.label, npvCell(downMap.get(r.key)), npvCell(baseMap.get(r.key)), npvCell(upMap.get(r.key))]),
      ]),
    );
    lines.push("");
    lines.push(`SENSITIVITY (one-at-a-time, +/- ${delta}%, on ${best?.label ?? "n/a"})`);
    lines.push(
      csvRows([
        ["key", "assumption", "npv_low_usd", "npv_high_usd", "swing_usd"],
        ...sens.map((e) => [e.key, assumptionLabel(e.key), e.low, e.high, e.swing]),
      ]),
    );
    downloadBlob(lines.join("\n"), `${safeName(assetName)}_strategy.csv`, "text/csv;charset=utf-8;");
  };

  const downloadPdf = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await exportStrategyPDF(editedStrategy, branch, assetName);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Recommended route */}
      <section className="rounded-2xl border-2 border-[#F97316]/40 bg-gradient-to-br from-[#FFF7ED] to-white p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className={`${TINY} mb-2 flex items-center gap-1.5 text-[#C2410C]`}>
              <Target className="h-3.5 w-3.5" aria-hidden="true" /> Recommended route
            </p>
            {recommendedRoute || best ? (
              <>
                <p className="text-[18px] font-semibold text-[#1A1A2E] leading-snug">
                  {recommendedRoute?.label ?? best?.label}
                </p>
                <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed max-w-3xl">
                  <span className={TINY}>Key dependency</span>{" "}
                  {recommendedRoute?.keyDependency ?? best?.keyDependency ?? "—"}
                </p>
                {modelledKey && recommendedKey && modelledKey !== recommendedKey && (
                  <p className="text-[12px] font-medium text-[#C2410C] mt-2">
                    At the assumptions currently entered this route now leads — the agent modelled{" "}
                    {routes.find((r) => r.key === modelledKey)?.label ?? modelledKey}.
                  </p>
                )}
              </>
            ) : (
              <p className="text-[14px] text-[#1A1A2E] leading-relaxed max-w-2xl">
                No route is computable yet. Fill in the missing assumptions below and the recommendation, the economics
                and the sensitivity will all appear.
              </p>
            )}
          </div>
          {best && (
            <div className="flex gap-6 shrink-0">
              <div>
                <p className={TINY}>Modelled NPV</p>
                <p className="text-3xl font-bold font-mono tracking-tight text-[#C2410C]">{usd(best.npv)}</p>
              </div>
              <div>
                <p className={TINY}>Break-even</p>
                <p className="text-3xl font-bold font-mono tracking-tight text-[#1A1A2E]">
                  {best.breakEvenYear == null ? "—" : `Y${best.breakEvenYear}`}
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-[#F97316]/20">
          <button
            type="button"
            onClick={downloadCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-[12px] font-semibold text-[#1A1A2E] transition hover:border-[#F97316] hover:text-[#C2410C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Download data (CSV)
          </button>
          <button
            type="button"
            onClick={downloadPdf}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#F97316] px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-[#EA580C] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
          >
            <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
            {exporting ? "Preparing…" : "Download summary (PDF)"}
          </button>
          <span className="text-[11px] text-muted-foreground">
            Exports carry the assumptions as they stand right now, edits included.
          </span>
          {exportError && <span className="text-[11px] font-medium text-red-700">{exportError}</span>}
        </div>
      </section>

      {/* Route comparison */}
      <SectionCard
        icon={GitBranch}
        title="Route comparison"
        note="Scores are the agent's read of fit; every figure is computed here from the assumptions below. A route missing a required input says which one instead of showing a number."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[52rem]">
            <caption className="sr-only">Modelled economics for every route open to this asset</caption>
            <thead>
              <tr className="border-b border-border/40">
                <th scope="col" className={`${TINY} py-1.5 pr-3`}>Route</th>
                <th scope="col" className={`${TINY} py-1.5 pr-3 w-[9rem]`}>Score</th>
                <th scope="col" className={`${TINY} py-1.5 pr-3`}>NPV</th>
                <th scope="col" className={`${TINY} py-1.5 pr-3`}>IRR</th>
                <th scope="col" className={`${TINY} py-1.5 pr-3`}>Break-even</th>
                <th scope="col" className={`${TINY} py-1.5 pr-3`}>Peak revenue</th>
                <th scope="col" className={`${TINY} py-1.5`}>Key dependency</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((route, i) => (
                <RouteRow
                  key={route.key}
                  route={route}
                  economics={economicsFor(route)}
                  index={i}
                  recommended={route.key === recommendedKey}
                />
              ))}
            </tbody>
          </table>
        </div>
        {routes.length === 0 && <p className="text-[13px] text-muted-foreground">No routes were returned for this run.</p>}
      </SectionCard>

      {/* Assumptions (§5.3) */}
      <SectionCard
        icon={SlidersHorizontal}
        title="Assumptions"
        note="Every figure on this page is derived from these inputs. Edit any of them and the whole model re-runs in your browser — no agent re-run, nothing sent to the server."
        action={
          <button
            type="button"
            onClick={() => setDraft(initialDraft)}
            disabled={!edited}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-[#1A1A2E] transition enabled:hover:border-[#F97316] enabled:hover:text-[#C2410C] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Reset to modelled assumptions
          </button>
        }
      >
        {missingNow.length > 0 && (
          <div className="rounded-xl border-2 border-dashed border-[#F97316]/50 bg-[#FFF7ED] px-4 py-3 mb-4">
            <p className="text-[12px] font-semibold text-[#C2410C]">
              {missingNow.length} required assumption{missingNow.length === 1 ? "" : "s"} still blank — routes needing{" "}
              {missingNow.length === 1 ? "it" : "them"} stay uncomputed until filled.
            </p>
            <ul className="flex flex-wrap gap-1.5 mt-2">
              {missingNow.map((k) => (
                <li
                  key={k}
                  className="rounded-md border border-[#F97316]/60 bg-white px-2 py-0.5 text-[11px] font-medium text-[#C2410C]"
                >
                  {assumptionLabel(k)}
                  {ASSUMPTION_META[k]?.unit ? ` (${ASSUMPTION_META[k].unit})` : ""}
                </li>
              ))}
            </ul>
            {storedMissing.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-2">
                The agent could not establish {storedMissing.map(assumptionLabel).join(", ")} from the evidence base.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {assumptionRows.map((a) => {
            const id = `assumption-${a.key}`;
            const blank = (draft[a.key] ?? "") === "";
            const isRequired = required.includes(a.key);
            return (
              <div
                key={a.key}
                className={`rounded-xl border p-3 ${blank && isRequired ? "border-[#F97316]/50 bg-[#FFF7ED]" : "border-border/40 bg-white"}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <label htmlFor={id} className="text-[12px] font-medium text-[#1A1A2E] leading-snug">
                    {a.label}
                    {!isRequired && <span className="text-muted-foreground/70 font-normal"> (optional)</span>}
                  </label>
                  <span className="shrink-0" title={a.source ?? (a.basis === "sourced" ? "Sourced" : "Model assumption — not sourced")}>
                    <BasisBadge basis={a.basis} />
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id={id}
                    type="number"
                    inputMode="decimal"
                    value={draft[a.key] ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, [a.key]: e.target.value }))}
                    placeholder={blank ? "enter a value" : undefined}
                    className="w-full px-3 py-2 rounded-lg bg-[#FAFAFA] border border-border font-mono text-[13px] text-[#1A1A2E] placeholder-muted-foreground/60 focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] focus:bg-white outline-none transition"
                  />
                  {(a.unit ?? ASSUMPTION_META[a.key]?.unit) && (
                    <span className="shrink-0 text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                      {a.unit ?? ASSUMPTION_META[a.key]?.unit}
                    </span>
                  )}
                </div>
                {a.source && <p className="text-[10px] text-muted-foreground/80 mt-1.5 leading-snug">{a.source}</p>}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Scenarios (§5.3) */}
      <SectionCard
        icon={Split}
        title="Scenario comparison"
        note={`Upside and downside move every driver together by ±${delta}% — revenue, share and margin one way, cost, erosion and time-to-launch the other. They are a coherent good case and bad case, not independent probabilities.`}
        action={
          <div className="flex items-center gap-2">
            <label htmlFor="scenario-delta" className={TINY}>
              Delta
            </label>
            <input
              id="scenario-delta"
              type="range"
              min={5}
              max={50}
              step={5}
              value={delta}
              onChange={(e) => setDelta(Number(e.target.value))}
              className="w-28 accent-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50 rounded"
            />
            <span className="font-mono text-[12px] font-bold tabular-nums text-[#1A1A2E] w-10">±{delta}%</span>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[34rem]">
            <caption className="sr-only">Net present value per route under the downside, base and upside scenarios</caption>
            <thead>
              <tr className="border-b border-border/40">
                <th scope="col" className={`${TINY} py-1.5 pr-3`}>Route</th>
                <th scope="col" className={`${TINY} py-1.5 pr-3`}>Downside</th>
                <th scope="col" className={`${TINY} py-1.5 pr-3`}>Base</th>
                <th scope="col" className={`${TINY} py-1.5`}>Upside</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((route) => {
                const cells: [RouteResult[], string][] = [
                  [scenarios.downside, "#C2410C"],
                  [scenarios.base, "#1A1A2E"],
                  [scenarios.upside, "#16A34A"],
                ];
                return (
                  <tr key={route.key} className={`border-b border-border/20 ${route.key === recommendedKey ? "bg-[#FFF7ED]" : ""}`}>
                    <th scope="row" className="py-2.5 pr-3 text-left text-[13px] font-medium text-[#1A1A2E]">
                      {route.label}
                    </th>
                    {cells.map(([set, color], i) => {
                      const r = set.find((x) => x.key === route.key);
                      return (
                        <td key={i} className="py-2.5 pr-3 whitespace-nowrap">
                          {r && r.computable ? (
                            <span className="font-mono text-[13px] font-bold tabular-nums" style={{ color }}>
                              {usd(r.npv)}
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">not computable</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Sensitivity (§5.3) */}
      {best && sens.length > 0 && (
        <SectionCard
          icon={SlidersHorizontal}
          title="Which variables dominate the outcome"
          note={`Each driver moved ±${delta}% on its own, everything else held, against ${best.label} (NPV ${usd(best.npv)}). Ranked by the NPV swing it causes.`}
        >
          <Tornado entries={sens} base={best.npv} delta={delta} />
        </SectionCard>
      )}

      {/* Partner shortlist */}
      {partners.length > 0 && (
        <SectionCard icon={Users} title="Partner shortlist">
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {partners.map((p, i) => (
              <PartnerCard key={`${p.name}-${i}`} partner={p} rank={i + 1} />
            ))}
          </ul>
        </SectionCard>
      )}

      {approachSequence.length > 0 && (
        <SectionCard
          icon={ListOrdered}
          title="Recommended sequence of approach"
          note="Ordered most-likely-to-close first — approaching out of order burns the leverage the earlier conversations create."
        >
          <ol className="space-y-2">
            {approachSequence.map((step, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="shrink-0 mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1A1A2E] font-mono text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-[13px] text-[#1A1A2E] leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </SectionCard>
      )}
    </div>
  );
}
