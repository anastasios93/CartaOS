"use client";

/**
 * Pillar 1 — branch 1B (innovative) results view.
 *
 * Verdict first, detail on expand (§8 progressive disclosure): the decision and
 * the single biggest value-inflection lever (§4.2) sit above the fold; the
 * dimension detail, evidence and per-market breakdown open on demand. Every
 * number is Evidence or Estimate (§3.3) and an uncomputable dimension states
 * why instead of inventing a score; unwired sources are surfaced as explicit
 * coverage gaps (§3.3 hard rule), never silently omitted.
 *
 * Every field beyond the Diagnosis envelope is optional — legacy rows predate
 * them, so each section is guarded and simply omitted when absent.
 */

import { useState } from "react";
import { EvidenceList, NoSourceState } from "@/components/run/evidence-badge";
import { INNOVATIVE_DIMENSIONS } from "@/config/dimensions";
import { countryByCode } from "@/config/geographies";
import type { Confidence, Diagnosis, DimensionScore, EvidenceItem, MarketScore } from "@/types/run";
import {
  ChevronDown,
  Zap,
  ShieldAlert,
  Globe2,
  Unplug,
  XCircle,
  AlertTriangle,
  SlidersHorizontal,
  Layers,
} from "lucide-react";

// ── Shared vocabulary ────────────────────────────────────────────────────────

const VERDICT_STYLE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  GO: { bg: "#DCFCE7", text: "#15803D", border: "#16A34A", label: "GO" },
  CONDITIONAL: { bg: "#FEF3C7", text: "#B45309", border: "#F59E0B", label: "CONDITIONAL GO" },
  NO_GO: { bg: "#FEE2E2", text: "#B91C1C", border: "#EF4444", label: "NO-GO" },
};

const CONFIDENCE_DOT: Record<Confidence, { color: string; label: string }> = {
  high: { color: "#16A34A", label: "High confidence" },
  medium: { color: "#F97316", label: "Medium confidence" },
  low: { color: "#9CA3AF", label: "Low confidence" },
};

const SEVERITY_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "#FEE2E2", text: "#991B1B", border: "#EF4444" },
  high: { bg: "#FEE2E2", text: "#B91C1C", border: "#F87171" },
  medium: { bg: "#FEF3C7", text: "#B45309", border: "#F59E0B" },
  moderate: { bg: "#FEF3C7", text: "#B45309", border: "#F59E0B" },
  low: { bg: "#F1F5F9", text: "#475569", border: "#CBD5E1" },
  informational: { bg: "#F1F5F9", text: "#475569", border: "#CBD5E1" },
};

const DIMENSION_LABELS = new Map(INNOVATIVE_DIMENSIONS.map((d) => [d.key, d.label]));

const TINY_LABEL = "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70";

// ── Defensive readers for the optional, agent-authored extras ────────────────

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asStrings(value: unknown): string[] {
  return asArray(value).flatMap((v) => {
    const s = asText(v);
    return s ? [s] : [];
  });
}

function scoreColor(score: number): string {
  if (score >= 68) return "#16A34A";
  if (score >= 50) return "#F59E0B";
  return "#EF4444";
}

// ── Small presentational parts ───────────────────────────────────────────────

function ConfidenceDot({ confidence }: { confidence?: Confidence }) {
  if (!confidence) return null;
  const dot = CONFIDENCE_DOT[confidence];
  return (
    <span className="inline-flex items-center" title={dot.label}>
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dot.color }} aria-hidden="true" />
      <span className="sr-only">{dot.label}</span>
    </span>
  );
}

function VerdictChip({ verdict, small }: { verdict?: string; small?: boolean }) {
  if (!verdict) return null;
  const v = VERDICT_STYLE[verdict] ?? VERDICT_STYLE.CONDITIONAL;
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold uppercase tracking-widest ${
        small ? "px-2 py-0.5 text-[9px]" : "px-3 py-1 text-[11px]"
      }`}
      style={{ backgroundColor: v.bg, color: v.text }}
    >
      {v.label}
    </span>
  );
}

function ScoreBar({ score, label }: { score: number | null; label: string }) {
  if (score == null) {
    return (
      <div className="h-1.5 w-full rounded-full bg-[#F1F5F9]" role="img" aria-label={`${label}: not computable`} />
    );
  }
  return (
    <div
      className="h-1.5 w-full rounded-full bg-[#F1F5F9] overflow-hidden"
      role="img"
      aria-label={`${label}: ${score} out of 100`}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.max(0, Math.min(100, score))}%`, backgroundColor: scoreColor(score) }}
      />
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
  note,
}: {
  icon: typeof Zap;
  title: string;
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <section className="rounded-xl border border-border/40 bg-white p-5">
      <p className={`${TINY_LABEL} mb-3 flex items-center gap-1.5`}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {title}
      </p>
      {note && <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">{note}</p>}
      {children}
    </section>
  );
}

// ── Verdict header ───────────────────────────────────────────────────────────

function VerdictHeader({ diagnosis }: { diagnosis: Diagnosis }) {
  const v = VERDICT_STYLE[diagnosis.verdict] ?? VERDICT_STYLE.CONDITIONAL;
  const confidence = diagnosis.verdictConfidence;
  return (
    <div className="rounded-2xl border-2 bg-white p-6" style={{ borderColor: v.border }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <VerdictChip verdict={diagnosis.verdict} />
            {confidence && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-[#FAFAFA] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                <ConfidenceDot confidence={confidence} />
                {confidence} confidence in this verdict
              </span>
            )}
          </div>
          {diagnosis.thesis && (
            <p className="text-[14px] text-[#1A1A2E] leading-relaxed max-w-3xl mt-2">{diagnosis.thesis}</p>
          )}
        </div>
        {diagnosis.worthinessScore != null && (
          <div className="text-right shrink-0">
            <p className={TINY_LABEL}>Worthiness</p>
            <p className="text-4xl font-bold font-mono tracking-tight" style={{ color: v.text }}>
              {diagnosis.worthinessScore}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Value-inflection lever (§4.2) ────────────────────────────────────────────

function InflectionLever({ value }: { value: unknown }) {
  const direct = asText(value);
  const rec = asRecord(value);
  const headline =
    direct ??
    asText(rec.lever) ??
    asText(rec.label) ??
    asText(rec.title) ??
    asText(rec.summary) ??
    asText(rec.description);
  if (!headline) return null;

  const rationale = direct
    ? undefined
    : asText(rec.rationale) ?? asText(rec.why) ?? (headline === asText(rec.summary) ? undefined : asText(rec.summary));
  const impact = asText(rec.impact) ?? asText(rec.expectedImpact);
  const evidence = asArray(rec.evidence).filter(
    (e): e is EvidenceItem => typeof asRecord(e).claim === "string",
  );

  return (
    <section className="rounded-xl border-2 border-[#F97316]/40 bg-gradient-to-br from-[#FFF7ED] to-white p-5">
      <p className={`${TINY_LABEL} mb-2 flex items-center gap-1.5 text-[#C2410C]`}>
        <Zap className="h-3.5 w-3.5" aria-hidden="true" /> Biggest value-inflection lever
      </p>
      <p className="text-[16px] font-semibold text-[#1A1A2E] leading-snug">{headline}</p>
      {rationale && <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed max-w-3xl">{rationale}</p>}
      {impact && (
        <p className="text-[12px] text-[#C2410C] mt-2 font-medium">
          <span className={TINY_LABEL}>Impact</span> {impact}
        </p>
      )}
      {evidence.length > 0 && (
        <div className="mt-3">
          <EvidenceList items={evidence} />
        </div>
      )}
    </section>
  );
}

// ── Dimensions ───────────────────────────────────────────────────────────────

function DimensionRow({ dim }: { dim: DimensionScore }) {
  const [open, setOpen] = useState(false);
  const label = DIMENSION_LABELS.get(dim.key) ?? dim.key;
  const notComputable = asText(dim.notComputable);
  const evidence = Array.isArray(dim.evidence) ? dim.evidence : [];
  const sources = Array.isArray(dim.sourcesConsulted) ? dim.sourcesConsulted : [];
  const summary = asText(dim.summary);
  const hasDetail = !!summary || evidence.length > 0 || sources.length > 0;
  const panelId = `innov-dim-${dim.key}`;
  const uncomputed = dim.score == null;

  return (
    <li className={`rounded-xl border border-border/40 ${uncomputed ? "bg-[#FAFAFA]" : "bg-white"}`}>
      <button
        type="button"
        onClick={() => hasDetail && setOpen((v) => !v)}
        aria-expanded={hasDetail ? open : undefined}
        aria-controls={hasDetail ? panelId : undefined}
        disabled={!hasDetail}
        className="w-full text-left px-4 py-3 flex items-center gap-3 rounded-xl transition-colors enabled:hover:bg-[#FAFAFA] disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`text-[13px] font-semibold truncate ${uncomputed ? "text-muted-foreground" : "text-[#1A1A2E]"}`}
            >
              {label}
            </span>
            <ConfidenceDot confidence={dim.confidence} />
          </div>
          <div className="mt-1.5">
            <ScoreBar score={dim.score} label={label} />
          </div>
          {uncomputed && (
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
              Not computable — {notComputable ?? "no connected source could establish this dimension."}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 w-12 text-right font-mono font-bold tabular-nums ${
            uncomputed ? "text-[12px] text-muted-foreground/60" : "text-[18px] text-[#1A1A2E]"
          }`}
        >
          {uncomputed ? "n/a" : dim.score}
        </span>
        {hasDetail && (
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        )}
      </button>

      {hasDetail && open && (
        <div id={panelId} className="px-4 pb-4 pt-1 space-y-3 border-t border-border/30">
          {summary && <p className="text-[13px] text-[#1A1A2E] leading-relaxed">{summary}</p>}
          {evidence.length > 0 && <EvidenceList items={evidence} />}
          {sources.length > 0 && (
            <p className="text-[11px] text-muted-foreground/80">
              <span className={TINY_LABEL}>Sources consulted</span> {sources.join(" · ")}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

// ── IP / FTO flags ───────────────────────────────────────────────────────────

function IpFlags({ flags }: { flags: Record<string, unknown>[] }) {
  return (
    <SectionCard
      icon={ShieldAlert}
      title="IP / freedom-to-operate flags"
      note="A screen, not a legal opinion. Every flag below is an automated read of public patent and regulatory records — patent counsel must clear freedom to operate before any commitment is made."
    >
      <ul className="space-y-2">
        {flags.map((raw, i) => {
          const severityRaw = asText(raw.severity) ?? "medium";
          const s = SEVERITY_STYLE[severityRaw.toLowerCase()] ?? SEVERITY_STYLE.medium;
          const flag = asText(raw.flag) ?? asText(raw.label) ?? "Unnamed flag";
          const citation = asText(raw.citation);
          const note = asText(raw.note);
          return (
            <li key={i} className="rounded-xl border bg-white px-3 py-2.5" style={{ borderColor: s.border }}>
              <div className="flex items-start gap-2 flex-wrap">
                <span
                  className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: s.bg, color: s.text }}
                >
                  {severityRaw}
                </span>
                <p className="flex-1 min-w-[12rem] text-[13px] font-medium text-[#1A1A2E] leading-snug">{flag}</p>
              </div>
              {note && <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">{note}</p>}
              {citation && (
                <p className="text-[11px] font-mono text-muted-foreground/80 mt-1">{citation}</p>
              )}
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

// ── Per-market ───────────────────────────────────────────────────────────────

function PerMarketTable({ markets }: { markets: MarketScore[] }) {
  const ranked = [...markets].sort((a, b) => {
    const ra = a.rank ?? Number.POSITIVE_INFINITY;
    const rb = b.rank ?? Number.POSITIVE_INFINITY;
    if (ra !== rb) return ra - rb;
    return (b.score ?? -1) - (a.score ?? -1);
  });

  return (
    <SectionCard icon={Globe2} title="Per market">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <caption className="sr-only">Worthiness score and verdict per selected market</caption>
          <thead>
            <tr className="border-b border-border/40">
              <th scope="col" className={`${TINY_LABEL} py-1.5 pr-3`}>Market</th>
              <th scope="col" className={`${TINY_LABEL} py-1.5 pr-3 w-[30%]`}>Score</th>
              <th scope="col" className={`${TINY_LABEL} py-1.5 pr-3`}>Verdict</th>
              <th scope="col" className={`${TINY_LABEL} py-1.5`}>Read</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((m, i) => {
              const country = countryByCode(m.country);
              const name = country?.name ?? m.country;
              return (
                <tr key={`${m.country}-${i}`} className="border-b border-border/20 last:border-0 align-top">
                  <th scope="row" className="py-2.5 pr-3 font-medium text-[13px] text-[#1A1A2E] whitespace-nowrap">
                    <span className="mr-1.5" aria-hidden="true">{country?.flag ?? "🏳️"}</span>
                    {name}
                  </th>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-[4rem]">
                        <ScoreBar score={m.score} label={name} />
                      </div>
                      <span className="font-mono text-[12px] font-bold tabular-nums text-[#1A1A2E] shrink-0">
                        {m.score ?? "n/a"}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 whitespace-nowrap">
                    <VerdictChip verdict={m.verdict} small />
                  </td>
                  <td className="py-2.5 text-[12px] text-muted-foreground leading-relaxed">{m.summary ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ── Coverage gaps (§3.3 hard rule surface) ───────────────────────────────────

function CoverageGaps({ entries }: { entries: { key: string; label: string; unwired: string[] }[] }) {
  return (
    <SectionCard
      icon={Unplug}
      title="Coverage gaps"
      note="These dimensions were scored without a source that is not yet connected. Nothing below was estimated to fill the gap — the missing input is named instead."
    >
      <div className="space-y-2">
        {entries.map((e) => (
          <NoSourceState key={e.key} sourceLabel={`${e.label} needs ${e.unwired.join(", ")}`} />
        ))}
      </div>
    </SectionCard>
  );
}

// ── Considered & rejected, risks, swing factors ──────────────────────────────

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="text-[13px] text-[#1A1A2E] leading-relaxed flex gap-2">
          <span className="text-[#F97316] shrink-0" aria-hidden="true">·</span>
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

// ── The view ─────────────────────────────────────────────────────────────────

export function InnovativeResults({ diagnosis }: { diagnosis: Diagnosis }) {
  const extras = asRecord(diagnosis);

  const dimensions = Array.isArray(diagnosis.dimensions) ? diagnosis.dimensions : [];
  const perMarket = Array.isArray(diagnosis.perMarket) ? diagnosis.perMarket : [];
  const topRisks = asStrings(diagnosis.topRisks);
  const swingFactors = asStrings(diagnosis.swingFactors);

  const ipFlags = asArray(extras.ipFlags).map(asRecord).filter((f) => Object.keys(f).length > 0);

  const coverageGaps = asArray(extras.coverage)
    .map(asRecord)
    .flatMap((c) => {
      const unwired = asStrings(c.unwired);
      if (!unwired.length) return [];
      const key = asText(c.key) ?? unwired.join("-");
      return [{ key, label: asText(c.label) ?? DIMENSION_LABELS.get(key) ?? key, unwired }];
    });

  const rejected = asArray(extras.consideredAndRejected)
    .map(asRecord)
    .flatMap((r) => {
      const opportunity = asText(r.opportunity) ?? asText(r.label);
      if (!opportunity) return [];
      return [{ opportunity, reason: asText(r.reason) ?? asText(r.why) }];
    });

  return (
    <div className="space-y-4">
      <VerdictHeader diagnosis={diagnosis} />

      <InflectionLever value={extras.inflectionLever} />

      {dimensions.length > 0 && (
        <SectionCard icon={Layers} title="Dimension scores">
          <ul className="space-y-2">
            {dimensions.map((dim, i) => (
              <DimensionRow key={`${dim.key}-${i}`} dim={dim} />
            ))}
          </ul>
        </SectionCard>
      )}

      {ipFlags.length > 0 && <IpFlags flags={ipFlags} />}

      {perMarket.length > 0 && <PerMarketTable markets={perMarket} />}

      {coverageGaps.length > 0 && <CoverageGaps entries={coverageGaps} />}

      {rejected.length > 0 && (
        <SectionCard icon={XCircle} title="Considered & rejected">
          <ul className="space-y-2">
            {rejected.map((r, i) => (
              <li key={i} className="rounded-xl border border-border/40 bg-[#FAFAFA] px-3 py-2.5">
                <p className="text-[13px] font-medium text-[#1A1A2E] leading-snug line-through decoration-muted-foreground/40">
                  {r.opportunity}
                </p>
                {r.reason && <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{r.reason}</p>}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {(topRisks.length > 0 || swingFactors.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {topRisks.length > 0 && (
            <SectionCard icon={AlertTriangle} title="Top risks">
              <BulletList items={topRisks} />
            </SectionCard>
          )}
          {swingFactors.length > 0 && (
            <SectionCard icon={SlidersHorizontal} title="Swing factors">
              <BulletList items={swingFactors} />
            </SectionCard>
          )}
        </div>
      )}
    </div>
  );
}
