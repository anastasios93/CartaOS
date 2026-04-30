"use client";

import { useState } from "react";
import type { AgentResult, RegionalAnalysis, OutLicensingRecommendation, PortfolioRisk } from "@/types/hub";
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
} from "lucide-react";

const REGION_FLAGS: Record<string, string> = {
  US: "🇺🇸",
  EU: "🇪🇺",
  JP: "🇯🇵",
  CN: "🇨🇳",
  ROW: "🌍",
};

const ATTRACTIVENESS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Very High": { bg: "#10B98115", text: "#059669", border: "#10B981" },
  High: { bg: "#3B82F615", text: "#2563EB", border: "#3B82F6" },
  Medium: { bg: "#F59E0B15", text: "#D97706", border: "#F59E0B" },
  Low: { bg: "#EF444415", text: "#DC2626", border: "#EF4444" },
};

const STRENGTH_COLORS: Record<string, { bg: string; text: string }> = {
  Strong: { bg: "#10B98120", text: "#059669" },
  Moderate: { bg: "#F59E0B20", text: "#D97706" },
  Weak: { bg: "#EF444420", text: "#DC2626" },
  Clear: { bg: "#10B98120", text: "#059669" },
  "Some Risk": { bg: "#F59E0B20", text: "#D97706" },
  "Significant Risk": { bg: "#EF444420", text: "#DC2626" },
};

const RISK_CATEGORY_COLORS: Record<string, { bg: string; text: string; icon: any }> = {
  Market: { bg: "#3B82F615", text: "#2563EB", icon: TrendingUp },
  Legal: { bg: "#A855F715", text: "#7C3AED", icon: Scale },
  Commercial: { bg: "#10B98115", text: "#059669", icon: Building2 },
  IP: { bg: "#F97316" + "15", text: "#EA580C", icon: Shield },
};

export function OutLicensingStrategyResults({
  data,
}: {
  data: Extract<AgentResult, { agentId: "outLicensingStrategy" }>;
}) {
  const { report } = data;
  const [view, setView] = useState<"overview" | "regions" | "recommendations" | "risks">("overview");

  if (!report) return <p className="text-sm text-muted-foreground">No report generated.</p>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-[#0EA5E9]/8 via-white to-[#FFF7ED]/30 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#0EA5E9] to-[#0284C7] text-white shrink-0 shadow-md">
            <Globe className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1.5">
              <h3 className="text-lg font-bold text-[#1A1A2E]">Out-Licensing Strategy Report</h3>
              <ConfidenceBadge confidence={report.dataConfidence} />
            </div>
            <p className="text-[13px] text-[#475569] leading-relaxed">{report.executiveSummary}</p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-border/30">
          <Stat label="Regions Analyzed" value={report.regionalAnalysis?.length || 0} />
          <Stat label="Recommendations" value={report.recommendations?.length || 0} />
          <Stat label="Risks Identified" value={report.portfolioRisks?.length || 0} />
          <Stat label="Sources Used" value={report.sourcesUsed?.length || 0} />
        </div>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 p-1 bg-[#F8F9FA] rounded-lg overflow-x-auto">
        <ViewTab id="overview" current={view} icon={Award} label="Asset & Overview" onClick={setView} />
        <ViewTab id="regions" current={view} icon={Globe} label="Regional Assessments" onClick={setView} />
        <ViewTab id="recommendations" current={view} icon={Target} label="Recommendations" onClick={setView} />
        <ViewTab id="risks" current={view} icon={AlertTriangle} label="Portfolio Risks" onClick={setView} />
      </div>

      {/* Content */}
      {view === "overview" && <OverviewView report={report} />}
      {view === "regions" && <RegionsView regions={report.regionalAnalysis || []} />}
      {view === "recommendations" && <RecommendationsView recommendations={report.recommendations || []} />}
      {view === "risks" && <RisksView risks={report.portfolioRisks || []} />}
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    High: { bg: "#10B98115", text: "#059669" },
    Medium: { bg: "#F59E0B15", text: "#D97706" },
    Low: { bg: "#EF444415", text: "#DC2626" },
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
            <p className="text-[13px] text-[#475569] leading-relaxed">{profile.description}</p>

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
                <span key={m} className="px-2.5 py-1 rounded-md bg-[#F8F9FA] border border-border/40 text-[12px] font-medium text-[#475569]">
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
        <div className="rounded-xl border border-border/40 bg-emerald-50/30 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <h5 className="text-sm font-bold text-emerald-900">Key Strengths</h5>
          </div>
          <ul className="space-y-2">
            {profile.keyStrengths?.map((s: string, i: number) => (
              <li key={i} className="text-[12px] text-[#1A1A2E] leading-relaxed flex gap-2">
                <span className="text-emerald-600 shrink-0">✓</span>
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border/40 bg-amber-50/30 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h5 className="text-sm font-bold text-amber-900">Key Challenges</h5>
          </div>
          <ul className="space-y-2">
            {profile.keyChallenges?.map((c: string, i: number) => (
              <li key={i} className="text-[12px] text-[#1A1A2E] leading-relaxed flex gap-2">
                <span className="text-amber-600 shrink-0">⚠</span>
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
              <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-border/40 text-[10px] font-medium text-[#475569]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
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
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Score</p>
                    <p className="text-2xl font-bold font-mono tracking-tight" style={{ color: attr.text }}>
                      {region.attractivenessScore}
                    </p>
                  </div>
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>
            </button>

            {/* Expanded 4-dimension assessment */}
            {isExpanded && (
              <div className="border-t border-border/30 p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <DimensionCard
                  icon={TrendingUp}
                  title="Market"
                  color="#3B82F6"
                  fields={[
                    { label: "Size", value: region.market?.sizeUSD },
                    { label: "Growth", value: region.market?.growthRate },
                    { label: "Unmet Need", value: region.market?.unmetNeed },
                  ]}
                  lists={[
                    { label: "Drivers", items: region.market?.drivers ?? [], color: "#10B981" },
                    { label: "Barriers", items: region.market?.barriers ?? [], color: "#EF4444" },
                  ]}
                />
                <DimensionCard
                  icon={Scale}
                  title="Legal & Regulatory"
                  color="#A855F7"
                  fields={[
                    { label: "Authority", value: region.legal?.regulatoryAuthority },
                    { label: "Pathway", value: region.legal?.pathway },
                    { label: "Timeline", value: region.legal?.estimatedTimeline },
                  ]}
                  lists={[
                    { label: "Exclusivity Opportunities", items: region.legal?.exclusivityOpportunities ?? [], color: "#10B981" },
                    { label: "Regulatory Barriers", items: region.legal?.barriers ?? [], color: "#EF4444" },
                  ]}
                />
                <DimensionCard
                  icon={Building2}
                  title="Commercial"
                  color="#10B981"
                  fields={[
                    { label: "Competitor Activity", value: region.commercial?.competitorActivity },
                    { label: "Pricing", value: region.commercial?.pricingDynamics },
                    { label: "Reimbursement", value: region.commercial?.reimbursementLandscape },
                    { label: "Distribution", value: region.commercial?.distributionChannels },
                  ]}
                  lists={[
                    { label: "Key Partner Candidates", items: region.commercial?.keyPartnerCandidates ?? [], color: "#3B82F6" },
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
                    { label: "Opportunities", items: region.ip?.opportunities ?? [], color: "#10B981" },
                    { label: "Expiration Risks", items: region.ip?.expirationRisks ?? [], color: "#EF4444" },
                  ]}
                />
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
                  <li key={j} className="text-[11px] text-[#475569] leading-relaxed flex gap-1.5">
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
              <p className="text-[13px] text-[#475569] leading-relaxed mb-3">{rec.rationale}</p>

              {/* Estimated value */}
              <div className="grid grid-cols-3 gap-3 mb-3 p-3 rounded-lg bg-gradient-to-br from-emerald-50 to-white border border-emerald-100">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-emerald-700/80">Upfront</p>
                  <p className="text-base font-bold font-mono text-emerald-900">{rec.estimatedValue?.upfront || "—"}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-emerald-700/80">Total</p>
                  <p className="text-base font-bold font-mono text-emerald-900">{rec.estimatedValue?.total || "—"}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-emerald-700/80">Royalties</p>
                  <p className="text-base font-bold font-mono text-emerald-900">{rec.estimatedValue?.royaltyRange || "—"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Partners */}
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">Top Partners</p>
                  <div className="flex flex-wrap gap-1">
                    {rec.topPartnerCandidates?.map((p, j) => (
                      <span key={j} className="px-2 py-0.5 rounded-md bg-[#F8F9FA] border border-border/40 text-[11px] font-medium text-[#475569]">
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
                      <li key={j} className="text-[11px] text-[#475569] flex gap-1.5">
                        <span className="text-amber-600 shrink-0">→</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/30 text-[11px] text-muted-foreground">
                <span><span className="font-semibold text-[#475569]">Timeline:</span> {rec.estimatedTimeline}</span>
                <span className="h-3 w-px bg-border" />
                <span><span className="font-semibold text-[#475569]">Expected ROI:</span> {rec.expectedROI}</span>
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
                const impactColors = STRENGTH_COLORS[r.impact === "High" ? "Weak" : r.impact === "Medium" ? "Moderate" : "Strong"];
                return (
                  <div key={i} className="rounded-lg bg-[#FAFAFA] p-3 border border-border/30 space-y-2">
                    <p className="text-[12px] font-semibold text-[#1A1A2E] leading-tight">{r.risk}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold" style={{ backgroundColor: impactColors?.bg, color: impactColors?.text }}>
                        {r.impact} Impact
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-white border border-border/40 text-[#475569]">
                        {r.likelihood} Likely
                      </span>
                      {r.affectedRegions?.map(reg => (
                        <span key={reg} className="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-white border border-border/40 text-[#475569]">
                          {REGION_FLAGS[reg] ?? "🌐"} {reg}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-[#475569] leading-relaxed">
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
