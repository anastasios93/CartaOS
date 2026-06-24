"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WORTHINESS_GEOS, type WorthinessResult } from "@/types/market-worthiness";
import { Gauge, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

const VERDICT_STYLE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  GO: { bg: "#DCFCE7", text: "#15803D", border: "#16A34A", label: "GO" },
  CONDITIONAL: { bg: "#FEF3C7", text: "#B45309", border: "#F59E0B", label: "CONDITIONAL GO" },
  NO_GO: { bg: "#FEE2E2", text: "#B91C1C", border: "#EF4444", label: "NO-GO" },
};

export default function MarketWorthinessPage() {
  const [asset, setAsset] = useState("");
  const [geography, setGeography] = useState("US");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WorthinessResult | null>(null);

  const run = async () => {
    if (!asset.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/market-worthiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset: asset.trim(), geography }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setResult(data as WorthinessResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-[#F97316] transition-colors mb-1">
          <ArrowLeft className="h-3 w-3" /> Portfolio Overview
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E] flex items-center gap-2">
          <Gauge className="h-6 w-6 text-[#F97316]" />
          Market-Worthiness Engine
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Is this asset worth pursuing in a specific market? A decisive GO / Conditional / No-Go verdict — scored, sourced, confidence-tagged.
        </p>
      </div>

      {/* Input */}
      <Card className="border-border/40 shadow-sm">
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">Asset / Compound</label>
              <input
                type="text"
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && run()}
                placeholder="e.g., adalimumab, pertuzumab, dimethyl fumarate"
                className="w-full px-4 py-3 rounded-lg bg-[#FAFAFA] border border-border text-[15px] text-[#1A1A2E] placeholder-muted-foreground/60 focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] focus:bg-white outline-none transition"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">Market / Geography</label>
              <select
                value={geography}
                onChange={(e) => setGeography(e.target.value)}
                className="w-full px-3 py-3 rounded-lg bg-[#FAFAFA] border border-border text-[14px] text-[#1A1A2E] focus:border-[#F97316] focus:bg-white outline-none transition"
              >
                {WORTHINESS_GEOS.map((g) => (
                  <option key={g.code} value={g.code}>{g.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">Evaluated per geography — the EU is never a single market.</p>
            <Button onClick={run} disabled={!asset.trim() || loading} className="h-10 px-5 bg-[#F97316] hover:bg-[#EA580C] text-white gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gauge className="h-4 w-4" />}
              {loading ? "Evaluating…" : "Evaluate worthiness"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading && !result && (
        <div className="rounded-xl border border-border/40 bg-[#FAFAFA] p-12 text-center">
          <div className="inline-flex items-center gap-2.5 text-[13px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-[#F97316]" />
            Pulling the live evidence base and scoring asset value × market attractiveness…
          </div>
        </div>
      )}

      {result && <VerdictCard r={result} />}
    </div>
  );
}

function VerdictCard({ r }: { r: WorthinessResult }) {
  const v = VERDICT_STYLE[r.verdict] ?? VERDICT_STYLE.CONDITIONAL;
  const geoLabel = WORTHINESS_GEOS.find((g) => g.code === r.geography)?.label ?? r.geography;
  return (
    <div className="space-y-4">
      {/* Headline verdict */}
      <div className="rounded-2xl border-2 bg-white p-6" style={{ borderColor: v.border }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full" style={{ backgroundColor: v.bg, color: v.text }}>{v.label}</span>
              <span className="text-[12px] text-muted-foreground">{r.asset?.name || "Asset"} · {geoLabel}</span>
            </div>
            <p className="text-[14px] text-[#1A1A2E] leading-relaxed max-w-3xl mt-2">{r.summary}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Worthiness</p>
            <p className="text-4xl font-bold font-mono tracking-tight" style={{ color: v.text }}>{r.worthiness_score}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{Math.round((r.confidence ?? 0) * 100)}% confidence</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 pt-4 border-t border-border/30">
          <Stat label="Asset value" value={r.asset_value_score} />
          <Stat label="Market attractiveness" value={r.market_attractiveness_score} />
          <Stat label="Confidence" value={`${Math.round((r.confidence ?? 0) * 100)}%`} />
        </div>
      </div>

      {/* Decisive drivers + conditions/constraint */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/40 bg-white p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">Decisive drivers</p>
          <ul className="space-y-1.5">
            {(r.decisive_drivers ?? []).map((d, i) => (
              <li key={i} className="text-[13px] text-[#1A1A2E] leading-relaxed flex gap-2">
                <span className="text-[#F97316] shrink-0">•</span>{d}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border p-5" style={{ borderColor: v.border + "55", backgroundColor: v.bg + "40" }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: v.text }}>
            {r.verdict === "NO_GO" ? "Binding constraint" : r.verdict === "CONDITIONAL" ? "Conditions to reach GO" : "Why GO"}
          </p>
          {r.verdict === "NO_GO" ? (
            <p className="text-[13px] text-[#1A1A2E] leading-relaxed">{r.binding_constraint}</p>
          ) : (r.conditions ?? []).length ? (
            <ul className="space-y-1.5">
              {r.conditions.map((c, i) => (
                <li key={i} className="text-[13px] text-[#1A1A2E] leading-relaxed flex gap-2">
                  <span className="shrink-0" style={{ color: v.text }}>{r.verdict === "CONDITIONAL" ? "→" : "✓"}</span>{c}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-muted-foreground">Clears the worthiness threshold with no binding constraint.</p>
          )}
        </div>
      </div>

      {/* Subscores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SubscorePanel title="Asset value" entries={[
          ["Clinical differentiation", r.subscores?.asset?.differentiation],
          ["Stage & PoS", r.subscores?.asset?.stage_pos],
          ["Exclusivity runway", r.subscores?.asset?.exclusivity_runway],
          ["Manufacturing", r.subscores?.asset?.manufacturing],
        ]} />
        <SubscorePanel title="Market attractiveness" entries={[
          ["Opportunity", r.subscores?.market?.opportunity],
          ["Access pathway", r.subscores?.market?.access],
          ["Pricing", r.subscores?.market?.pricing],
          ["Competition", r.subscores?.market?.competition],
          ["Channel feasibility", r.subscores?.market?.channel],
          ["Local barriers", r.subscores?.market?.local_barriers],
          ["Strategic factors", r.subscores?.market?.strategic],
        ]} />
      </div>

      {/* rNPV */}
      {r.rnpv && (r.rnpv.value != null || (r.rnpv.assumptions ?? []).length > 0) && (
        <div className="rounded-xl border border-border/40 bg-white p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Financial sanity check (rNPV)</p>
            {r.rnpv.value != null && (
              <span className="text-[16px] font-bold font-mono text-[#C2410C]">
                {typeof r.rnpv.value === "number" ? `$${r.rnpv.value}M` : r.rnpv.value}
                {r.rnpv.discount_rate != null && <span className="text-[11px] font-normal text-muted-foreground ml-2">@ {r.rnpv.discount_rate}%</span>}
              </span>
            )}
          </div>
          {(r.rnpv.assumptions ?? []).length > 0 && (
            <ul className="space-y-1">
              {r.rnpv.assumptions.map((a, i) => (
                <li key={i} className="text-[11px] text-muted-foreground leading-relaxed flex gap-1.5"><span className="text-muted-foreground/50">·</span>{a}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Provenance */}
      {(r.provenance ?? []).length > 0 && (
        <div className="rounded-xl border border-border/40 bg-[#FAFAFA] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3">Provenance</p>
          <div className="space-y-2">
            {r.provenance.map((p, i) => (
              <div key={i} className="flex items-start gap-2 text-[12px]">
                <span
                  className="shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded mt-0.5"
                  style={{
                    backgroundColor: p.type === "fact" ? "#DCFCE7" : p.type === "inference" ? "#FEF3C7" : "#F2F2F2",
                    color: p.type === "fact" ? "#15803D" : p.type === "inference" ? "#B45309" : "#6E6E6E",
                  }}
                >
                  {p.type}
                </span>
                <span className="text-[#1A1A2E] leading-relaxed flex-1">{p.claim} <span className="text-muted-foreground">— {p.source}</span></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-2xl font-bold font-mono tracking-tight text-[#1A1A2E]">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</p>
    </div>
  );
}

function SubscorePanel({ title, entries }: { title: string; entries: [string, number | undefined][] }) {
  return (
    <div className="rounded-xl border border-border/40 bg-white p-5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3">{title}</p>
      <div className="space-y-2.5">
        {entries.map(([label, val]) => {
          const v = Math.max(0, Math.min(100, val ?? 0));
          return (
            <div key={label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-[#1A1A2E]">{label}</span>
                <span className="text-[11px] font-bold font-mono text-[#1A1A2E]">{v}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#E3E3E3] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${v}%`, backgroundColor: v >= 70 ? "#C2410C" : v >= 45 ? "#F97316" : "#9A9A9A" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
