"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Globe,
  TrendingUp,
  ArrowRight,
  DollarSign,
  Clock,
  Layers,
  Loader2,
  RefreshCw,
  Sparkles,
  Filter,
  Pill,
  ShieldCheck,
  X,
  Building2,
  FlaskConical,
} from "lucide-react";

interface AsymmetryRecord {
  moleculeName: string;
  brandReference: string;
  originator: string;
  therapeuticCategory: string;
  modality: string;
  globalAnnualSalesUSDb: number;
  whoEssential: boolean;
  sourceRegion: string;
  sourceRegionLabel: string;
  sourceFlag: string;
  targetRegion: string;
  targetRegionLabel: string;
  targetFlag: string;
  deltaDays: number;
  deltaYears: number;
  airScore: number;
  airBand: "Exceptional" | "Strong" | "Moderate" | "Marginal";
  financials: {
    brandPriceTarget: number;
    genericPriceSource: number;
    grossArbitrageDelta: number;
    annualSavingsPerPatient: number;
    marginPct: number;
  };
  sourcePathway: string;
  targetPathway: string;
  sourceStatus: string;
  targetStatus: string;
  sourceCompetitors: number;
  rationale: string;
}

interface ApiResponse {
  timestamp: string;
  stats: {
    totalOpportunities: number;
    totalMolecules: number;
    exceptional: number;
    avgAir: number;
    totalSalesExposedUSDb: number;
    maxAnnualSavingsPerPatient: number;
  };
  asymmetry_records: AsymmetryRecord[];
  molecules: { genericName: string; brandName: string; originator: string; therapeuticCategory: string; globalAnnualSalesUSDb: number }[];
}

const AIR_BAND_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  Exceptional: { bg: "#10B98115", text: "#059669", ring: "#10B981" },
  Strong: { bg: "#3B82F615", text: "#2563EB", ring: "#3B82F6" },
  Moderate: { bg: "#F59E0B15", text: "#D97706", ring: "#F59E0B" },
  Marginal: { bg: "#94A3B815", text: "#64748B", ring: "#94A3B8" },
};

export default function ArbitragePage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [moleculeFilter, setMoleculeFilter] = useState<string>("");
  const [minAir, setMinAir] = useState(0);
  const [selected, setSelected] = useState<AsymmetryRecord | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (minAir > 0) params.set("minAir", minAir.toString());
      const res = await fetch(`/api/asymmetries?${params}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minAir]);

  const filteredRecords = useMemo(() => {
    if (!data) return [];
    if (!moleculeFilter) return data.asymmetry_records;
    return data.asymmetry_records.filter(r => r.moleculeName === moleculeFilter);
  }, [data, moleculeFilter]);

  // Hero = highest AIR record (the "Ozempic Asymmetry")
  const hero = data?.asymmetry_records[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#0EA5E9]/10 text-[#0EA5E9] text-[10px] font-bold tracking-wide uppercase">
              <Globe className="h-3 w-3" />
              Patent Arbitrage Engine
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E]">Cross-Border Patent Asymmetries</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Map structural patent-expiry gaps between jurisdictions · ranked by Arbitrage Index Rating (AIR)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="h-9 gap-1.5 text-xs">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </Button>
      </div>

      {loading && !data && (
        <div className="flex items-center justify-center py-24">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Computing arbitrage index across global patent timelines...</span>
          </div>
        </div>
      )}

      {data && (
        <>
          {/* Summary metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label="Live Opportunities" value={data.stats.totalOpportunities} sub={`${data.stats.totalMolecules} molecules tracked`} icon={<Layers className="h-4 w-4" />} color="#0EA5E9" />
            <Metric label="Exceptional (AIR≥80)" value={data.stats.exceptional} sub="High-conviction windows" icon={<Sparkles className="h-4 w-4" />} color="#10B981" />
            <Metric label="Avg AIR Score" value={data.stats.avgAir} sub="Across all pairs" icon={<TrendingUp className="h-4 w-4" />} color="#F97316" />
            <Metric label="Sales Exposed" value={`$${data.stats.totalSalesExposedUSDb}B`} sub="Annual blockbuster sales" icon={<DollarSign className="h-4 w-4" />} color="#8B5CF6" />
            <Metric label="Max Savings/Patient" value={`$${data.stats.maxAnnualSavingsPerPatient.toLocaleString()}`} sub="Annual, single molecule" icon={<ShieldCheck className="h-4 w-4" />} color="#EC4899" />
          </div>

          {/* Hero — The Ozempic Asymmetry */}
          {hero && (
            <Card className="border-2 border-[#0EA5E9]/30 shadow-md overflow-hidden">
              <div className="bg-gradient-to-br from-[#0EA5E9]/8 via-white to-[#FFF7ED]/40 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-[#0EA5E9] text-white border-0 text-[10px]">TOP OPPORTUNITY</Badge>
                  <span className="text-[11px] text-muted-foreground">Highest Arbitrage Index Rating</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left: molecule + flow */}
                  <div className="lg:col-span-2">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#0EA5E9] to-[#0284C7] text-white shrink-0">
                        <Pill className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-[#1A1A2E]">{hero.brandReference}</h2>
                        <p className="text-[12px] text-muted-foreground">{hero.moleculeName} · {hero.originator} · {hero.therapeuticCategory}</p>
                      </div>
                    </div>

                    {/* Source → Target flow */}
                    <div className="flex items-center gap-3 mt-5 mb-4">
                      <RegionPill flag={hero.sourceFlag} label={hero.sourceRegionLabel} status="generic" sub={`Generic $${hero.financials.genericPriceSource}/mo`} />
                      <div className="flex flex-col items-center px-2">
                        <span className="text-[10px] font-bold text-[#0EA5E9]">{hero.deltaYears}yr window</span>
                        <ArrowRight className="h-5 w-5 text-[#0EA5E9]" />
                        <span className="text-[10px] text-muted-foreground">{hero.deltaDays.toLocaleString()} days</span>
                      </div>
                      <RegionPill flag={hero.targetFlag} label={hero.targetRegionLabel} status="protected" sub={`Brand $${hero.financials.brandPriceTarget}/mo`} />
                    </div>

                    <p className="text-[13px] text-[#475569] leading-relaxed">{hero.rationale}</p>
                  </div>

                  {/* Right: AIR gauge + financials */}
                  <div className="flex flex-col gap-3">
                    <AirGauge score={hero.airScore} band={hero.airBand} />
                    <div className="grid grid-cols-3 gap-2">
                      <MiniStat label="Spread/mo" value={`$${hero.financials.grossArbitrageDelta}`} />
                      <MiniStat label="Margin" value={`${hero.financials.marginPct}%`} />
                      <MiniStat label="Annual" value={`$${(hero.financials.annualSavingsPerPatient / 1000).toFixed(1)}k`} />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              Filter:
            </div>
            <select
              value={moleculeFilter}
              onChange={e => setMoleculeFilter(e.target.value)}
              className="h-8 px-3 rounded-lg border border-border/60 bg-white text-[12px] font-medium text-[#1A1A2E] focus:border-[#0EA5E9] outline-none"
            >
              <option value="">All molecules</option>
              {data.molecules.map(m => (
                <option key={m.genericName} value={m.genericName}>{m.brandName} ({m.genericName})</option>
              ))}
            </select>
            <select
              value={minAir}
              onChange={e => setMinAir(parseInt(e.target.value))}
              className="h-8 px-3 rounded-lg border border-border/60 bg-white text-[12px] font-medium text-[#1A1A2E] focus:border-[#0EA5E9] outline-none"
            >
              <option value={0}>Any AIR</option>
              <option value={40}>AIR ≥ 40 (Moderate+)</option>
              <option value={60}>AIR ≥ 60 (Strong+)</option>
              <option value={80}>AIR ≥ 80 (Exceptional)</option>
            </select>
            <span className="text-[11px] text-muted-foreground">{filteredRecords.length} opportunities</span>
          </div>

          {/* Opportunity table */}
          <Card className="border-border/40 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border/40 bg-[#FAFAFA]">
                    <Th>Molecule</Th>
                    <Th>Arbitrage Route</Th>
                    <Th className="text-center">Window</Th>
                    <Th className="text-right">Brand (Target)</Th>
                    <Th className="text-right">Generic (Source)</Th>
                    <Th className="text-right">Spread/mo</Th>
                    <Th className="text-center">AIR</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((r, i) => {
                    const band = AIR_BAND_COLORS[r.airBand];
                    return (
                      <tr
                        key={i}
                        onClick={() => setSelected(r)}
                        className="border-b border-border/20 hover:bg-[#F0F9FF] transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <p className="text-[13px] font-semibold text-[#1A1A2E]">{r.brandReference}</p>
                          <p className="text-[11px] text-muted-foreground">{r.moleculeName} · {r.modality}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-[12px]">
                            <span title={r.sourceRegionLabel}>{r.sourceFlag}</span>
                            <span className="text-muted-foreground">{r.sourceRegion}</span>
                            <ArrowRight className="h-3 w-3 text-[#0EA5E9]" />
                            <span title={r.targetRegionLabel}>{r.targetFlag}</span>
                            <span className="text-muted-foreground">{r.targetRegion}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-[12px] font-mono font-semibold text-[#1A1A2E]">{r.deltaYears}yr</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-[12px] font-mono text-[#1A1A2E]">${r.financials.brandPriceTarget}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-[12px] font-mono text-emerald-600">${r.financials.genericPriceSource}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-[12px] font-mono font-bold text-[#1A1A2E]">${r.financials.grossArbitrageDelta}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">({r.financials.marginPct}%)</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center">
                            <span
                              className="inline-flex items-center justify-center w-12 h-7 rounded-lg text-[13px] font-bold font-mono"
                              style={{ backgroundColor: band.bg, color: band.text }}
                              title={r.airBand}
                            >
                              {r.airScore}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* AIR methodology footer */}
          <div className="rounded-xl border border-border/40 bg-[#FAFAFA] px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">Arbitrage Index Rating (AIR) Methodology</p>
            <p className="text-[12px] text-muted-foreground leading-relaxed font-mono">
              AIR = (Δt / 6yr × 0.40) + (MarginDelta / BrandPrice<sub>target</sub> × 0.35) + ((1 − CompDensity / 10) × 0.25), scaled 0–100
            </p>
            <div className="flex flex-wrap gap-4 mt-3 text-[11px] text-muted-foreground">
              <span><span className="font-semibold text-[#475569]">Δt</span> — patent-expiry gap (source → target)</span>
              <span><span className="font-semibold text-[#475569]">MarginDelta</span> — brand price minus source generic price</span>
              <span><span className="font-semibold text-[#475569]">CompDensity</span> — generic competitors in source market (cap 10)</span>
            </div>
            <p className="text-[10px] text-muted-foreground/70 mt-3">
              Patent dates & pricing are illustrative, drawn from public regulatory and pricing sources. US patent data can be enriched live via FDA Orange Book.
            </p>
          </div>
        </>
      )}

      {/* Detail drawer */}
      {selected && (
        <OpportunityDrawer record={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function OpportunityDrawer({ record, onClose }: { record: AsymmetryRecord; onClose: () => void }) {
  const band = AIR_BAND_COLORS[record.airBand];
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-border/40 px-6 py-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0EA5E9] to-[#0284C7] text-white">
                <Pill className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1A1A2E]">{record.brandReference}</h3>
                <p className="text-[11px] text-muted-foreground">{record.moleculeName}</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* AIR + band */}
          <div className="flex items-center justify-between rounded-xl border border-border/40 p-4" style={{ backgroundColor: band.bg }}>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: band.text }}>Arbitrage Index Rating</p>
              <p className="text-3xl font-bold font-mono mt-1" style={{ color: band.text }}>{record.airScore}<span className="text-base">/100</span></p>
            </div>
            <span className="px-3 py-1 rounded-full text-[12px] font-bold" style={{ backgroundColor: "white", color: band.text }}>
              {record.airBand}
            </span>
          </div>

          {/* Route */}
          <div className="flex items-center gap-3">
            <RegionPill flag={record.sourceFlag} label={record.sourceRegionLabel} status="generic" sub={`Generic $${record.financials.genericPriceSource}/mo`} />
            <div className="flex flex-col items-center px-1">
              <span className="text-[10px] font-bold text-[#0EA5E9]">{record.deltaYears}yr</span>
              <ArrowRight className="h-5 w-5 text-[#0EA5E9]" />
            </div>
            <RegionPill flag={record.targetFlag} label={record.targetRegionLabel} status="protected" sub={`Brand $${record.financials.brandPriceTarget}/mo`} />
          </div>

          <p className="text-[13px] text-[#475569] leading-relaxed">{record.rationale}</p>

          {/* Financials */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">Arbitrage Economics</p>
            <div className="grid grid-cols-2 gap-3">
              <DetailStat label="Brand price (target)" value={`$${record.financials.brandPriceTarget}/mo`} />
              <DetailStat label="Generic price (source)" value={`$${record.financials.genericPriceSource}/mo`} />
              <DetailStat label="Gross spread" value={`$${record.financials.grossArbitrageDelta}/mo (${record.financials.marginPct}%)`} />
              <DetailStat label="Annual savings / patient" value={`$${record.financials.annualSavingsPerPatient.toLocaleString()}`} />
            </div>
          </div>

          {/* Asset facts */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">Asset</p>
            <div className="space-y-2">
              <FactRow icon={<Building2 className="h-3.5 w-3.5" />} label="Originator" value={record.originator} />
              <FactRow icon={<FlaskConical className="h-3.5 w-3.5" />} label="Modality" value={record.modality} />
              <FactRow icon={<Layers className="h-3.5 w-3.5" />} label="Therapeutic Area" value={record.therapeuticCategory} />
              <FactRow icon={<DollarSign className="h-3.5 w-3.5" />} label="Global Annual Sales" value={`$${record.globalAnnualSalesUSDb}B`} />
            </div>
          </div>

          {/* Regulatory */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">Regulatory Pathways</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-[#F8F9FA] border border-border/40 p-3">
                <p className="text-[11px] font-semibold text-[#1A1A2E]">{record.sourceFlag} {record.sourceRegionLabel}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Generic pathway: <span className="font-medium text-[#475569]">{record.sourcePathway}</span></p>
                <p className="text-[11px] text-muted-foreground">{record.sourceCompetitors} competitors active</p>
              </div>
              <div className="rounded-lg bg-[#F8F9FA] border border-border/40 p-3">
                <p className="text-[11px] font-semibold text-[#1A1A2E]">{record.targetFlag} {record.targetRegionLabel}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Generic pathway: <span className="font-medium text-[#475569]">{record.targetPathway}</span></p>
                <p className="text-[11px] text-muted-foreground capitalize">Status: {record.targetStatus.replace("_", " ")}</p>
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="flex gap-2 pt-2">
            <a
              href={`/simulated-plan`}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-lg bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] text-white text-[13px] font-semibold hover:opacity-90 transition"
            >
              <Sparkles className="h-4 w-4" />
              Build Out-Licensing Plan
            </a>
            <a
              href={`/partners`}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg border border-border/60 text-[13px] font-semibold text-[#475569] hover:bg-[#F8F9FA] transition"
            >
              <Building2 className="h-4 w-4" />
              Find Partners
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#F8F9FA] border border-border/40 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</p>
      <p className="text-[14px] font-bold font-mono text-[#1A1A2E] mt-1">{value}</p>
    </div>
  );
}

function FactRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#F8F9FA] text-muted-foreground shrink-0">{icon}</div>
      <span className="text-[12px] text-muted-foreground flex-1">{label}</span>
      <span className="text-[12px] font-semibold text-[#1A1A2E]">{value}</span>
    </div>
  );
}

function Metric({ label, value, sub, icon, color }: { label: string; value: number | string; sub: string; icon: React.ReactNode; color: string }) {
  return (
    <Card className="relative overflow-hidden border-border/40 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</p>
            <p className="text-2xl font-bold font-mono tracking-tight mt-1.5 text-[#1A1A2E]">{value}</p>
            <p className="text-[10px] mt-1 text-muted-foreground">{sub}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}10`, color }}>
            {icon}
          </div>
        </div>
      </CardContent>
      <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ backgroundColor: color, opacity: 0.4 }} />
    </Card>
  );
}

function RegionPill({ flag, label, status, sub }: { flag: string; label: string; status: "generic" | "protected"; sub: string }) {
  const isGeneric = status === "generic";
  return (
    <div
      className="flex-1 rounded-xl border-2 p-3 text-center"
      style={{
        borderColor: isGeneric ? "#10B981" : "#EF4444",
        backgroundColor: isGeneric ? "#10B98108" : "#EF444408",
      }}
    >
      <span className="text-2xl">{flag}</span>
      <p className="text-[13px] font-bold text-[#1A1A2E] mt-1">{label}</p>
      <span
        className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide"
        style={{ backgroundColor: isGeneric ? "#10B98120" : "#EF444420", color: isGeneric ? "#059669" : "#DC2626" }}
      >
        {isGeneric ? "Generic Available" : "Patent Protected"}
      </span>
      <p className="text-[11px] text-muted-foreground mt-1.5">{sub}</p>
    </div>
  );
}

function AirGauge({ score, band }: { score: number; band: string }) {
  const colors = AIR_BAND_COLORS[band] ?? AIR_BAND_COLORS.Moderate;
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="rounded-xl border border-border/40 bg-white p-4 flex items-center gap-4">
      <div className="relative h-[100px] w-[100px] shrink-0">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#F1F5F9" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="42" fill="none"
            stroke={colors.ring}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold font-mono" style={{ color: colors.text }}>{score}</span>
          <span className="text-[9px] text-muted-foreground">/ 100</span>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Arbitrage Index</p>
        <p className="text-lg font-bold" style={{ color: colors.text }}>{band}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">AIR Rating</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white border border-border/40 p-2 text-center">
      <p className="text-[14px] font-bold font-mono text-[#1A1A2E]">{value}</p>
      <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</p>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 ${className}`}>
      {children}
    </th>
  );
}
