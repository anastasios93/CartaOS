"use client";

import { useState } from "react";
import type { AgentResult, RegionalAnalysis, OutLicensingRecommendation, PortfolioRisk, OutLicensingReport } from "@/types/hub";
import {
  Globe,
  TrendingUp,
  Scale,
  Building2,
  Shield,
  AlertTriangle,
  Award,
  ChevronRight,
  ChevronDown,
  Target,
  DollarSign,
  CheckCircle2,
  Factory,
  Gauge,
  HeartPulse,
  Handshake,
  Truck,
  Sparkles,
} from "lucide-react";

const REGION_FLAGS: Record<string, string> = {
  US: "🇺🇸",
  DE: "🇩🇪",
  FR: "🇫🇷",
  IT: "🇮🇹",
  ES: "🇪🇸",
  EU: "🇪🇺",
  JP: "🇯🇵",
  CN: "🇨🇳",
  IN: "🇮🇳",
  ROW: "🌍",
  // full-name fallbacks in case the model emits names rather than codes
  Germany: "🇩🇪",
  France: "🇫🇷",
  Italy: "🇮🇹",
  Spain: "🇪🇸",
  India: "🇮🇳",
};

// Orange · black · white — ratings shown tonally (deep orange = strongest,
// grays = weaker) to match the exported deck.
const ATTRACTIVENESS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Very High": { bg: "#9A341215", text: "#9A3412", border: "#9A3412" },
  High: { bg: "#EA580C15", text: "#EA580C", border: "#F97316" },
  Medium: { bg: "#6B6B6B15", text: "#6B6B6B", border: "#9A9A9A" },
  Low: { bg: "#9A9A9A18", text: "#6B6B6B", border: "#C4C4C4" },
};

const STRENGTH_COLORS: Record<string, { bg: string; text: string }> = {
  Strong: { bg: "#C2410C18", text: "#C2410C" },
  Moderate: { bg: "#6B6B6B18", text: "#6B6B6B" },
  Weak: { bg: "#14141418", text: "#141414" },
  Clear: { bg: "#C2410C18", text: "#C2410C" },
  "Some Risk": { bg: "#6B6B6B18", text: "#6B6B6B" },
  "Significant Risk": { bg: "#14141418", text: "#141414" },
};

const RISK_CATEGORY_COLORS: Record<string, { bg: string; text: string; icon: any }> = {
  Market: { bg: "#14141410", text: "#141414", icon: TrendingUp },
  Legal: { bg: "#6B6B6B14", text: "#6B6B6B", icon: Scale },
  Commercial: { bg: "#C2410C12", text: "#C2410C", icon: Building2 },
  IP: { bg: "#F97316" + "15", text: "#EA580C", icon: Shield },
};

export function OutLicensingStrategyResults({
  data,
}: {
  data: Extract<AgentResult, { agentId: "outLicensingStrategy" }>;
}) {
  const { report } = data;
  const [view, setView] = useState<"overview" | "regions" | "worthiness" | "recommendations" | "business" | "risks">("overview");

  if (!report) return <p className="text-sm text-muted-foreground">No report generated.</p>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-[#F97316]/8 via-white to-[#FFF7ED]/40 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white shrink-0 shadow-md">
            <Globe className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1.5">
              <h3 className="text-lg font-bold text-[#1A1A2E]">Market Opportunity Assessment</h3>
              {report.verdict && <VerdictBadge verdict={report.verdict} />}
              <ConfidenceBadge confidence={report.dataConfidence} />
            </div>
            {report.opportunityThesis && (
              <p className="text-[13px] font-semibold text-[#1A1A2E] leading-relaxed mb-1.5">{report.opportunityThesis}</p>
            )}
            <p className="text-[13px] text-muted-foreground leading-relaxed">{report.executiveSummary}</p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-border/30">
          <Stat label="Regions Analyzed" value={report.regionalAnalysis?.length || 0} />
          <Stat label="Recommendations" value={report.recommendations?.length || 0} />
          <Stat label="Risks Identified" value={report.portfolioRisks?.length || 0} />
          <Stat
            label="Lead Market"
            value={
              [...(report.regionalAnalysis ?? [])].sort(
                (a, b) => (b.attractivenessScore || 0) - (a.attractivenessScore || 0)
              )[0]?.regionLabel ?? "—"
            }
          />
        </div>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 p-1 bg-[#F8F9FA] rounded-lg overflow-x-auto">
        <ViewTab id="overview" current={view} icon={Award} label="Asset & Overview" onClick={setView} />
        <ViewTab id="regions" current={view} icon={Globe} label="Regional Assessments" onClick={setView} />
        <ViewTab id="worthiness" current={view} icon={Gauge} label="Market Worthiness" onClick={setView} />
        <ViewTab id="recommendations" current={view} icon={Target} label="Market Priorities" onClick={setView} />
        <ViewTab id="business" current={view} icon={DollarSign} label="Business Case" onClick={setView} />
        <ViewTab id="risks" current={view} icon={AlertTriangle} label="Flaws & Blockers" onClick={setView} />
      </div>

      {/* Content */}
      {view === "overview" && <OverviewView report={report} />}
      {view === "regions" && <RegionsView regions={report.regionalAnalysis || []} />}
      {view === "worthiness" && <MarketWorthinessView regions={report.regionalAnalysis || []} summary={report.marketWorthinessSummary} />}
      {view === "recommendations" && <RecommendationsView recommendations={report.recommendations || []} />}
      {view === "business" && <CommercialPlanView plan={report.commercialPlan} />}
      {view === "risks" && <RisksView risks={report.portfolioRisks || []} />}
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    High: { bg: "#C2410C15", text: "#C2410C" },
    Medium: { bg: "#6B6B6B15", text: "#6B6B6B" },
    Low: { bg: "#9A9A9A18", text: "#6B6B6B" },
  };
  const c = colors[confidence] ?? colors.Medium;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      <CheckCircle2 className="h-2.5 w-2.5" />
      {confidence} Confidence
    </span>
  );
}

function VerdictBadge({ verdict }: { verdict: "Go" | "Conditional Go" | "No-Go" }) {
  const map: Record<string, { bg: string; text: string }> = {
    Go: { bg: "#C2410C18", text: "#9A3412" },
    "Conditional Go": { bg: "#F9731618", text: "#C2410C" },
    "No-Go": { bg: "#14141412", text: "#141414" },
  };
  const c = map[verdict] ?? map["Conditional Go"];
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {verdict}
    </span>
  );
}

function CommercialPlanView({ plan }: { plan?: OutLicensingReport["commercialPlan"] }) {
  if (!plan) return <p className="text-sm text-muted-foreground">No commercial plan generated.</p>;
  return (
    <div className="space-y-4">
      {plan.summary && (
        <div className="rounded-xl border border-border/40 border-l-4 bg-[#FFF7ED] p-4" style={{ borderLeftColor: "#F97316" }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#C2410C] mb-1">Business Case</p>
          <p className="text-[13px] text-[#1A1A2E] leading-relaxed">{plan.summary}</p>
        </div>
      )}

      {plan.channels?.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-border/30 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#C2410C]" />
            <h5 className="text-sm font-bold text-[#1A1A2E]">Commercial Channels</h5>
          </div>
          <div className="divide-y divide-border/30">
            {plan.channels.map((c, i) => (
              <div key={i} className="p-4">
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <span className="text-[13px] font-bold text-[#1A1A2E]">{c.channel}</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {c.geographies?.map(g => (
                      <span key={g} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#F8F9FA] border border-border/40 text-muted-foreground">
                        {REGION_FLAGS[g] ?? ""} {g}
                      </span>
                    ))}
                  </div>
                </div>
                {c.valueRole && (
                  <p className="text-[12px] text-[#1A1A2E] leading-relaxed">
                    <span className="font-semibold">Where the value is:</span> {c.valueRole}
                  </p>
                )}
                {c.accessMechanics && (
                  <p className="text-[12px] text-muted-foreground leading-relaxed mt-1">
                    <span className="font-semibold text-[#1A1A2E]">How to win it:</span> {c.accessMechanics}
                  </p>
                )}
                {c.keyPlayers?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {c.keyPlayers.map((p, j) => (
                      <span key={j} className="px-2 py-0.5 rounded-md text-[11px] bg-[#F8F9FA] border border-border/40 text-muted-foreground">{p}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {plan.howToProceed?.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-[#F97316]" />
            <h5 className="text-sm font-bold text-[#1A1A2E]">How to Proceed</h5>
          </div>
          <div className="space-y-2.5">
            {[...plan.howToProceed].sort((a, b) => a.step - b.step).map((s, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F97316] text-white text-[12px] font-bold">
                  {s.step}
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-[#1A1A2E] leading-snug">{s.action}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                    {s.geography && <span>{REGION_FLAGS[s.geography] ?? ""} {s.geography}</span>}
                    {s.approach && <><span className="text-muted-foreground/40">·</span><span className="font-medium text-[#C2410C]">{s.approach}</span></>}
                    {s.timing && <><span className="text-muted-foreground/40">·</span><span>{s.timing}</span></>}
                    {s.owner && <><span className="text-muted-foreground/40">·</span><span>{s.owner}</span></>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RegionBusinessCase({ bc }: { bc: NonNullable<RegionalAnalysis["businessCase"]> }) {
  const map: Record<string, { bg: string; text: string }> = {
    Pursue: { bg: "#C2410C18", text: "#9A3412" },
    Watch: { bg: "#F9731618", text: "#C2410C" },
    Pass: { bg: "#14141412", text: "#141414" },
  };
  const c = map[bc.verdict] ?? map.Watch;
  return (
    <div className="rounded-xl border border-border/40 border-l-4 bg-[#FFF7ED] p-4" style={{ borderLeftColor: "#F97316" }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#C2410C]">Business Case — value proposition</p>
        <span
          className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full"
          style={{ backgroundColor: c.bg, color: c.text }}
        >
          {bc.verdict}
        </span>
      </div>
      <p className="text-[13px] font-semibold text-[#1A1A2E] leading-relaxed">{bc.valueProposition}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-[#F97316]/15">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">Where the profitable case is</p>
          <p className="text-[12px] text-[#1A1A2E] leading-relaxed">{bc.profitWedge}</p>
        </div>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">Economics</p>
          <p className="text-[12px] text-[#1A1A2E] leading-relaxed">{bc.economics}</p>
        </div>
      </div>
    </div>
  );
}

function CosBreakdown({ cos }: { cos: NonNullable<RegionalAnalysis["cos"]> }) {
  const items = [
    { label: "Market Size", value: cos.marketSize },
    { label: "Regulatory", value: cos.regulatory },
    { label: "IP Runway", value: cos.ip },
    { label: "Market Access", value: cos.marketAccess },
    { label: "Low Competition", value: cos.competition },
  ];
  return (
    <div className="rounded-lg border border-border/30 bg-[#FAFAF9] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3">
        Commercial Opportunity Score — drivers
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {items.map(it => {
          const v = Math.max(0, Math.min(100, it.value ?? 0));
          return (
            <div key={it.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium text-muted-foreground">{it.label}</span>
                <span className="text-[11px] font-bold font-mono text-[#1A1A2E]">{v}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#E3E3E3] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${v}%`, backgroundColor: v >= 70 ? "#C2410C" : v >= 45 ? "#F97316" : "#9A9A9A" }}
                />
              </div>
            </div>
          );
        })}
      </div>
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

function ViewTab({
  id,
  current,
  icon: Icon,
  label,
  onClick,
}: {
  id: any;
  current: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: (id: any) => void;
}) {
  const isActive = current === id;
  return (
    <button
      onClick={() => onClick(id)}
      className="flex items-center gap-2 px-3.5 py-2 text-[12px] font-medium rounded-md transition whitespace-nowrap"
      style={{
        backgroundColor: isActive ? "#FFFFFF" : "transparent",
        color: isActive ? "#1A1A2E" : "#64748B",
        boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
      }}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

// ─── Overview View ──────────────────────────────────────────────────────────

function OverviewView({ report }: { report: any }) {
  const profile = report.assetProfile;
  if (!profile) return <p className="text-sm text-muted-foreground">No asset profile.</p>;

  return (
    <div className="space-y-4">
      {/* Asset profile card */}
      <div className="rounded-xl border border-border/40 bg-white p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">Asset</p>
            <h4 className="text-lg font-bold text-[#1A1A2E] mb-2">{profile.name}</h4>
            <p className="text-[13px] text-muted-foreground leading-relaxed">{profile.description}</p>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <ProfileRow label="Modality" value={profile.modality} />
              <ProfileRow label="Therapeutic Area" value={profile.therapeuticArea} />
              <ProfileRow label="Stage" value={profile.developmentStage} />
              <ProfileRow label="Mechanism" value={profile.mechanism} />
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">Current Markets</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {profile.currentMarkets?.map((m: string) => (
                <span key={m} className="px-2.5 py-1 rounded-md bg-[#F8F9FA] border border-border/40 text-[12px] font-medium text-muted-foreground">
                  {REGION_FLAGS[m] ?? "🌐"} {m}
                </span>
              ))}
              {!profile.currentMarkets?.length && <span className="text-[12px] text-muted-foreground">None disclosed</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Strengths + Challenges grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/40 bg-[#FFF7ED] p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-[#C2410C]" />
            <h5 className="text-sm font-bold text-[#9A3412]">Key Strengths</h5>
          </div>
          <ul className="space-y-2">
            {profile.keyStrengths?.map((s: string, i: number) => (
              <li key={i} className="text-[12px] text-[#1A1A2E] leading-relaxed flex gap-2">
                <span className="text-[#C2410C] shrink-0">✓</span>
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border/40 bg-[#F7F6F4] p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-[#141414]" />
            <h5 className="text-sm font-bold text-[#141414]">Key Challenges</h5>
          </div>
          <ul className="space-y-2">
            {profile.keyChallenges?.map((c: string, i: number) => (
              <li key={i} className="text-[12px] text-[#1A1A2E] leading-relaxed flex gap-2">
                <span className="text-[#6B6B6B] shrink-0">⚠</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Key data points */}
      {profile.keyDataPoints?.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-white p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3">Key Data Points</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {profile.keyDataPoints.map((dp: any, i: number) => (
              <div key={i} className="rounded-lg bg-[#FAFAFA] p-3 border border-border/30">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{dp.label}</p>
                <p className="text-[14px] font-bold text-[#1A1A2E] font-mono mt-1">{dp.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Source: {dp.source}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sources used */}
      {report.sourcesUsed?.length > 0 && (
        <div className="rounded-xl bg-[#FAFAFA] border border-border/40 px-5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">Data Sources</p>
          <div className="flex flex-wrap gap-1.5">
            {report.sourcesUsed.map((s: string) => (
              <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-border/40 text-[10px] font-medium text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F97316]" />
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</p>
      <p className="text-[12px] font-medium text-[#1A1A2E] mt-0.5">{value || "—"}</p>
    </div>
  );
}

// ─── Market Worthiness View ─────────────────────────────────────────────────

// Purely-commercial worthiness rating → tonal orange/black/white.
const WORTHINESS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Highly Worthy": { bg: "#9A341215", text: "#9A3412", border: "#9A3412" },
  Worthy: { bg: "#EA580C15", text: "#EA580C", border: "#F97316" },
  Marginal: { bg: "#6B6B6B15", text: "#6B6B6B", border: "#9A9A9A" },
  "Not Worthy": { bg: "#14141412", text: "#141414", border: "#C4C4C4" },
};

function MarketWorthinessView({
  regions,
  summary,
}: {
  regions: RegionalAnalysis[];
  summary?: string;
}) {
  const scored = regions.filter(r => r.marketWorthiness);
  if (scored.length === 0) {
    return <p className="text-sm text-muted-foreground">No market-worthiness assessment generated.</p>;
  }
  const sorted = [...scored].sort(
    (a, b) => (b.marketWorthiness?.score ?? 0) - (a.marketWorthiness?.score ?? 0),
  );

  return (
    <div className="space-y-4">
      {/* Cross-market synthesis */}
      <div className="rounded-xl border border-border/40 border-l-4 bg-[#FFF7ED] p-4" style={{ borderLeftColor: "#F97316" }}>
        <div className="flex items-center gap-2 mb-1">
          <Gauge className="h-4 w-4 text-[#C2410C]" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#C2410C]">
            Market Worthiness — commercial verdict
          </p>
        </div>
        <p className="text-[13px] text-[#1A1A2E] leading-relaxed">
          {summary || "Markets ranked purely on commercial worthiness — the current legal and healthcare landscape, room for partnerships, open distribution channels, market size against competitors, and novel paths to capture value."}
        </p>
      </div>

      {sorted.map(region => {
        const w = region.marketWorthiness!;
        const c = WORTHINESS_COLORS[w.rating] ?? WORTHINESS_COLORS.Marginal;
        const score = Math.max(0, Math.min(100, w.score ?? 0));
        return (
          <div key={region.region} className="rounded-xl border-2 bg-white overflow-hidden" style={{ borderColor: c.border }}>
            {/* Header band */}
            <div className="flex items-center justify-between gap-4 p-5 border-b border-border/30">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl shrink-0">{REGION_FLAGS[region.region] ?? "🌐"}</span>
                <div className="min-w-0">
                  <h4 className="text-base font-bold text-[#1A1A2E]">{region.regionLabel}</h4>
                  {w.thesis && <p className="text-[12px] text-muted-foreground leading-snug">{w.thesis}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="px-3 py-1 rounded-full text-[11px] font-bold" style={{ backgroundColor: c.bg, color: c.text }}>
                  {w.rating}
                </span>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Worthiness</p>
                  <p className="text-2xl font-bold font-mono tracking-tight" style={{ color: c.text }}>{score}</p>
                </div>
              </div>
            </div>

            {/* Score bar */}
            <div className="px-5 pt-4">
              <div className="h-1.5 rounded-full bg-[#E3E3E3] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: score >= 70 ? "#C2410C" : score >= 45 ? "#F97316" : "#9A9A9A" }} />
              </div>
            </div>

            {/* Landscape grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
              <WorthinessField icon={HeartPulse} title="Healthcare Landscape" color="#C2410C" value={w.healthcareLandscape} />
              <WorthinessField icon={Scale} title="Legal Landscape" color="#6B6B6B" value={w.legalLandscape} />
              <WorthinessField icon={TrendingUp} title="Market Size vs Competitors" color="#141414" value={w.marketSizeVsCompetitors} />
              <WorthinessField icon={Handshake} title="Room for Partnerships" color="#EA580C" value={w.partnershipRoom} />
              <WorthinessField icon={Truck} title="Distribution Channels" color="#9A3412" value={w.distributionChannels} />
              {w.novelPaths?.length > 0 && (
                <div className="rounded-lg border border-border/30 bg-[#FFF7ED] p-4">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#F97316]/15">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: "#F9731615", color: "#F97316" }}>
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <h5 className="text-sm font-bold text-[#1A1A2E]">Novel Paths</h5>
                  </div>
                  <ul className="space-y-1.5">
                    {w.novelPaths.map((p, i) => (
                      <li key={i} className="text-[12px] text-[#1A1A2E] leading-relaxed flex gap-2">
                        <span className="text-[#F97316] shrink-0">✦</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WorthinessField({
  icon: Icon,
  title,
  color,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  color: string;
  value?: string;
}) {
  return (
    <div className="rounded-lg border border-border/30 bg-white p-4">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/30">
        <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: `${color}15`, color }}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <h5 className="text-sm font-bold text-[#1A1A2E]">{title}</h5>
      </div>
      <p className="text-[12px] text-[#1A1A2E] leading-relaxed">{value || "—"}</p>
    </div>
  );
}

// ─── Regions View ───────────────────────────────────────────────────────────

function RegionsView({ regions }: { regions: RegionalAnalysis[] }) {
  const sorted = [...regions].sort((a, b) => (b.attractivenessScore || 0) - (a.attractivenessScore || 0));
  const [expandedRegion, setExpandedRegion] = useState<string | null>(sorted[0]?.region ?? null);

  return (
    <div className="space-y-3">
      {sorted.map(region => {
        const isExpanded = expandedRegion === region.region;
        const attr = ATTRACTIVENESS_COLORS[region.attractiveness] ?? ATTRACTIVENESS_COLORS.Medium;
        return (
          <div key={region.region} className="rounded-xl border-2 bg-white overflow-hidden" style={{ borderColor: isExpanded ? attr.border : "rgba(0,0,0,0.06)" }}>
            {/* Header */}
            <button
              onClick={() => setExpandedRegion(isExpanded ? null : region.region)}
              className="w-full p-5 hover:bg-[#FAFAFA] transition-colors text-left"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{REGION_FLAGS[region.region] ?? "🌐"}</span>
                  <div>
                    <h4 className="text-base font-bold text-[#1A1A2E]">{region.regionLabel}</h4>
                    <p className="text-[11px] text-muted-foreground">
                      {region.market?.sizeUSD || "—"} market · {region.market?.growthRate || "—"} growth
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="px-3 py-1 rounded-full text-[11px] font-bold"
                    style={{ backgroundColor: attr.bg, color: attr.text }}
                  >
                    {region.attractiveness}
                  </span>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">COS</p>
                    <p className="text-2xl font-bold font-mono tracking-tight" style={{ color: attr.text }}>
                      {region.attractivenessScore}
                    </p>
                  </div>
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>
            </button>

            {/* Expanded six-vector assessment */}
            {isExpanded && (
              <div className="border-t border-border/30 p-5 space-y-4">
                {region.businessCase && <RegionBusinessCase bc={region.businessCase} />}
                {region.cos && <CosBreakdown cos={region.cos} />}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DimensionCard
                    icon={TrendingUp}
                    title="Market & Epidemiology"
                    color="#141414"
                    fields={[
                      { label: "Size", value: region.market?.sizeUSD },
                      { label: "Growth", value: region.market?.growthRate },
                      { label: "Epidemiology / Unmet Need", value: region.market?.unmetNeed },
                    ]}
                    lists={[
                      { label: "Drivers", items: region.market?.drivers ?? [], color: "#C2410C" },
                      { label: "Barriers", items: region.market?.barriers ?? [], color: "#141414" },
                    ]}
                  />
                  <DimensionCard
                    icon={Scale}
                    title="Regulatory Pathway"
                    color="#6B6B6B"
                    fields={[
                      { label: "Authority", value: region.legal?.regulatoryAuthority },
                      { label: "Expedited Pathway", value: region.legal?.pathway },
                      { label: "Timeline", value: region.legal?.estimatedTimeline },
                    ]}
                    lists={[
                      { label: "Exclusivity Opportunities", items: region.legal?.exclusivityOpportunities ?? [], color: "#C2410C" },
                      { label: "Regulatory Barriers", items: region.legal?.barriers ?? [], color: "#141414" },
                    ]}
                  />
                  <DimensionCard
                    icon={Building2}
                    title="Market Access & Competition"
                    color="#C2410C"
                    fields={[
                      { label: "Competitive Density", value: region.commercial?.competitorActivity },
                      { label: "Pricing / HTA", value: region.commercial?.pricingDynamics },
                      { label: "Reimbursement", value: region.commercial?.reimbursementLandscape },
                      { label: "Distribution", value: region.commercial?.distributionChannels },
                    ]}
                    lists={[
                      { label: "Key Partner Candidates", items: region.commercial?.keyPartnerCandidates ?? [], color: "#6B6B6B" },
                    ]}
                  />
                  <DimensionCard
                    icon={Shield}
                    title="IP & Exclusivity"
                    color="#F97316"
                    badges={[
                      { label: "Patent", value: region.ip?.patentStrength, colors: STRENGTH_COLORS[region.ip?.patentStrength] },
                      { label: "FTO", value: region.ip?.ftoStatus, colors: STRENGTH_COLORS[region.ip?.ftoStatus] },
                    ]}
                    fields={[
                      { label: "Estimated Exclusivity", value: region.ip?.estimatedExclusivityYears != null ? `${region.ip.estimatedExclusivityYears} years` : "—" },
                    ]}
                    lists={[
                      { label: "Opportunities", items: region.ip?.opportunities ?? [], color: "#C2410C" },
                      { label: "Expiration Risks", items: region.ip?.expirationRisks ?? [], color: "#141414" },
                    ]}
                  />
                  {region.manufacturing && (
                    <DimensionCard
                      icon={Factory}
                      title="Manufacturing & CMC"
                      color="#6B6B6B"
                      badges={[
                        {
                          label: "Complexity",
                          value: region.manufacturing.complexity,
                          colors: STRENGTH_COLORS[region.manufacturing.complexity === "High" ? "Weak" : region.manufacturing.complexity === "Moderate" ? "Moderate" : "Strong"],
                        },
                      ]}
                      fields={[{ label: "Notes", value: region.manufacturing.notes }]}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DimensionCard({
  icon: Icon,
  title,
  color,
  fields,
  lists,
  badges,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  color: string;
  fields?: { label: string; value?: string }[];
  lists?: { label: string; items: string[]; color: string }[];
  badges?: { label: string; value?: string; colors?: { bg: string; text: string } }[];
}) {
  return (
    <div className="rounded-lg border border-border/30 bg-white p-4">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/30">
        <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: `${color}15`, color }}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <h5 className="text-sm font-bold text-[#1A1A2E]">{title}</h5>
      </div>

      {badges && badges.length > 0 && (
        <div className="flex gap-2 mb-3">
          {badges.map((b, i) => {
            const c = b.colors ?? STRENGTH_COLORS.Moderate;
            return (
              <div key={i} className="flex flex-col gap-0.5">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70">{b.label}</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold w-fit" style={{ backgroundColor: c.bg, color: c.text }}>
                  {b.value || "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {fields && fields.length > 0 && (
        <div className="space-y-2 mb-3">
          {fields.map((f, i) => (
            <div key={i}>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70">{f.label}</p>
              <p className="text-[12px] text-[#1A1A2E] leading-relaxed">{f.value || "—"}</p>
            </div>
          ))}
        </div>
      )}

      {lists && lists.length > 0 && (
        <div className="space-y-2.5">
          {lists.map((l, i) => l.items.length > 0 && (
            <div key={i}>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">{l.label}</p>
              <ul className="space-y-1">
                {l.items.map((item, j) => (
                  <li key={j} className="text-[11px] text-muted-foreground leading-relaxed flex gap-1.5">
                    <span className="shrink-0" style={{ color: l.color }}>•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Recommendations View ───────────────────────────────────────────────────

function RecommendationsView({ recommendations }: { recommendations: OutLicensingRecommendation[] }) {
  const sorted = [...recommendations].sort((a, b) => a.priorityRank - b.priorityRank);
  return (
    <div className="space-y-3">
      {sorted.map((rec, i) => (
        <div key={i} className="rounded-xl border border-border/40 bg-white p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white font-bold text-sm shrink-0">
              {rec.priorityRank}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{REGION_FLAGS[rec.targetRegion] ?? "🌐"}</span>
                <h4 className="text-base font-bold text-[#1A1A2E]">{rec.targetRegion}</h4>
                <span className="px-2 py-0.5 rounded-md bg-[#F97316]/10 text-[#F97316] text-[10px] font-bold">
                  {rec.recommendedDealStructure}
                </span>
              </div>
              <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">{rec.rationale}</p>

              {/* Estimated value */}
              <div className="grid grid-cols-3 gap-3 mb-3 p-3 rounded-lg bg-gradient-to-br from-[#FFF4EC] to-white border border-[#F97316]/20">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-[#C2410C]/80">Upfront</p>
                  <p className="text-base font-bold font-mono text-[#9A3412]">{rec.estimatedValue?.upfront || "—"}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-[#C2410C]/80">Total</p>
                  <p className="text-base font-bold font-mono text-[#9A3412]">{rec.estimatedValue?.total || "—"}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-[#C2410C]/80">Royalties</p>
                  <p className="text-base font-bold font-mono text-[#9A3412]">{rec.estimatedValue?.royaltyRange || "—"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Partners */}
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">Top Partners</p>
                  <div className="flex flex-wrap gap-1">
                    {rec.topPartnerCandidates?.map((p, j) => (
                      <span key={j} className="px-2 py-0.5 rounded-md bg-[#F8F9FA] border border-border/40 text-[11px] font-medium text-muted-foreground">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Prerequisites */}
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">Prerequisites</p>
                  <ul className="space-y-0.5">
                    {rec.prerequisites?.slice(0, 3).map((p, j) => (
                      <li key={j} className="text-[11px] text-muted-foreground flex gap-1.5">
                        <span className="text-[#C2410C] shrink-0">→</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/30 text-[11px] text-muted-foreground">
                <span><span className="font-semibold text-muted-foreground">Timeline:</span> {rec.estimatedTimeline}</span>
                <span className="h-3 w-px bg-border" />
                <span><span className="font-semibold text-muted-foreground">Expected ROI:</span> {rec.expectedROI}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Risks View ─────────────────────────────────────────────────────────────

function RisksView({ risks }: { risks: PortfolioRisk[] }) {
  // Group by category
  const grouped = risks.reduce<Record<string, PortfolioRisk[]>>((acc, r) => {
    (acc[r.category] = acc[r.category] || []).push(r);
    return acc;
  }, {});

  const categories: PortfolioRisk["category"][] = ["Market", "Legal", "Commercial", "IP"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {categories.map(cat => {
        const items = grouped[cat] || [];
        if (items.length === 0) return null;
        const c = RISK_CATEGORY_COLORS[cat];
        const Icon = c.icon;
        return (
          <div key={cat} className="rounded-xl border border-border/40 bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-border/30 flex items-center gap-2" style={{ backgroundColor: c.bg }}>
              <Icon className="h-4 w-4" style={{ color: c.text }} />
              <h5 className="text-sm font-bold" style={{ color: c.text }}>{cat} Risks</h5>
              <span className="ml-auto text-[10px] font-medium" style={{ color: c.text }}>{items.length}</span>
            </div>
            <div className="p-4 space-y-3">
              {items.map((r, i) => {
                const impactColors = r.impact === "High"
                  ? { bg: "#C2410C18", text: "#C2410C" }
                  : r.impact === "Medium"
                    ? { bg: "#6B6B6B18", text: "#6B6B6B" }
                    : { bg: "#9A9A9A18", text: "#6B6B6B" };
                return (
                  <div key={i} className="rounded-lg bg-[#FAFAFA] p-3 border border-border/30 space-y-2">
                    <p className="text-[12px] font-semibold text-[#1A1A2E] leading-tight">{r.risk}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold" style={{ backgroundColor: impactColors?.bg, color: impactColors?.text }}>
                        {r.impact} Impact
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-white border border-border/40 text-muted-foreground">
                        {r.likelihood} Likely
                      </span>
                      {r.affectedRegions?.map(reg => (
                        <span key={reg} className="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-white border border-border/40 text-muted-foreground">
                          {REGION_FLAGS[reg] ?? "🌐"} {reg}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-[#1A1A2E]">Mitigation:</span> {r.mitigation}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
