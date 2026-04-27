"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Activity,
  AlertTriangle,
  Newspaper,
  FileText,
  RefreshCw,
  ExternalLink,
  Building2,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = {
  orange: "#F97316",
  blue: "#3B82F6",
  green: "#10B981",
  violet: "#8B5CF6",
  amber: "#F59E0B",
  red: "#EF4444",
  cyan: "#06B6D4",
  pink: "#EC4899",
};

const TA_OPTIONS = [
  "oncology",
  "immunology",
  "neuroscience",
  "rare disease",
  "cardiovascular",
  "metabolic",
  "infectious disease",
  "respiratory",
];

const TOOLTIP_STYLE = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #E5E7EB",
  borderRadius: "8px",
  fontSize: "12px",
  padding: "8px 12px",
  boxShadow: "0 4px 6px -1px rgba(0,0,0,.06)",
};

interface MarketData {
  timestamp: string;
  therapeuticArea: string;
  summary: {
    recentDeals: number;
    activeTrials: number;
    newsArticles: number;
    expiringPatents: number;
    fdaApprovals: number;
  };
  taActivity: { area: string; trials: number }[];
  topSponsors: { sponsor: string; trials: number }[];
  phaseDistribution: { phase: string; count: number }[];
  dealVolume: { month: string; deals: number }[];
  patentCliff: { year: string; patents: number }[];
  recentDeals: { company: string; form: string; date: string; description: string; url?: string }[];
  news: { title: string; source: string; date: string; url: string; snippet: string }[];
  activeTrials: { nctId: string; title: string; sponsor: string; phase: string; status: string; conditions: string[] }[];
  fdaApprovals: { applicationNumber: string; brandName: string; sponsor: string; approvalDate: string; productType: string }[];
}

export default function TrendsPage() {
  const [therapeuticArea, setTherapeuticArea] = useState("oncology");
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (ta: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/market-trends?ta=${encodeURIComponent(ta)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(therapeuticArea);
  }, [therapeuticArea]);

  const lastUpdated = data?.timestamp ? new Date(data.timestamp).toLocaleString() : "—";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E]">Market Trends</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time intelligence from SEC EDGAR · ClinicalTrials.gov · FDA · Orange Book · News
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={therapeuticArea}
            onChange={e => setTherapeuticArea(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border/60 bg-white text-[13px] font-medium text-[#1A1A2E] focus:border-[#F97316] outline-none"
          >
            {TA_OPTIONS.map(ta => (
              <option key={ta} value={ta}>{ta.charAt(0).toUpperCase() + ta.slice(1)}</option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(therapeuticArea)}
            disabled={loading}
            className="h-9 gap-1.5 text-xs"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">Failed to load market data</p>
          <p className="text-xs text-red-600 mt-1">{error}</p>
        </div>
      )}

      {/* Status bar */}
      {data && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Live data
          </span>
          <span className="h-3 w-px bg-border" />
          <span>Last updated {lastUpdated}</span>
          <span className="h-3 w-px bg-border" />
          <span>Therapeutic area: <span className="font-semibold text-[#1A1A2E] capitalize">{data.therapeuticArea}</span></span>
        </div>
      )}

      {/* Summary metrics */}
      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard
            label="Recent Deals (YTD)"
            value={data.summary.recentDeals}
            sub="SEC EDGAR 8-K filings"
            color={COLORS.orange}
            icon={<FileText className="h-4 w-4" />}
          />
          <SummaryCard
            label="Active Trials"
            value={data.summary.activeTrials}
            sub="ClinicalTrials.gov"
            color={COLORS.blue}
            icon={<Activity className="h-4 w-4" />}
          />
          <SummaryCard
            label="FDA Approvals"
            value={data.summary.fdaApprovals}
            sub="OpenFDA Drugs@FDA"
            color={COLORS.green}
            icon={<Building2 className="h-4 w-4" />}
          />
          <SummaryCard
            label="Patent Cliffs"
            value={data.summary.expiringPatents}
            sub="Expiring 2026-2030"
            color={COLORS.red}
            icon={<AlertTriangle className="h-4 w-4" />}
          />
          <SummaryCard
            label="News Signals"
            value={data.summary.newsArticles}
            sub="Commercial intel"
            color={COLORS.violet}
            icon={<Newspaper className="h-4 w-4" />}
          />
        </div>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center py-24">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading live market data from public APIs...</span>
          </div>
        </div>
      )}

      {data && (
        <>
          {/* Charts row 1 */}
          <div className="grid gap-5 lg:grid-cols-3">
            {/* Deal volume over time */}
            <Card className="border-border/40 shadow-sm lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold">Licensing Deal Volume</CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Last 12 months — SEC EDGAR 8-K filings in {data.therapeuticArea}</p>
                  </div>
                  <Badge className="bg-[#F97316]/10 text-[#F97316] border-0 text-[10px]">Live</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.dealVolume} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="gradOrange" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#F97316" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#F97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Area type="monotone" dataKey="deals" stroke="#F97316" strokeWidth={2} fill="url(#gradOrange)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Trial activity by TA */}
            <Card className="border-border/40 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold">Trial Activity by TA</CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">Recruiting trials globally</p>
              </CardHeader>
              <CardContent>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.taActivity} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="area" width={90} tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(59,130,246,0.05)" }} />
                      <Bar dataKey="trials" fill={COLORS.blue} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts row 2 */}
          <div className="grid gap-5 lg:grid-cols-3">
            {/* Phase distribution */}
            <Card className="border-border/40 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold">Phase Distribution</CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">Active trials in {data.therapeuticArea}</p>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.phaseDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="count"
                        nameKey="phase"
                        strokeWidth={0}
                      >
                        {data.phaseDistribution.map((_, i) => (
                          <Cell key={i} fill={Object.values(COLORS)[i % 8]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1 mt-2">
                  {data.phaseDistribution.slice(0, 5).map((p, i) => (
                    <div key={p.phase} className="flex items-center gap-2 text-[11px]">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: Object.values(COLORS)[i % 8] }} />
                      <span className="text-muted-foreground flex-1 truncate">{p.phase}</span>
                      <span className="font-mono font-medium">{p.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top sponsors */}
            <Card className="border-border/40 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold">Top Active Sponsors</CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">By trial count</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.topSponsors.slice(0, 8).map((s, i) => (
                    <div key={s.sponsor} className="flex items-center gap-3">
                      <span className="text-[10px] font-mono w-5 text-muted-foreground">{(i + 1).toString().padStart(2, "0")}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-[#1A1A2E] truncate">{s.sponsor}</p>
                        <div className="h-1 bg-[#F1F5F9] rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-[#3B82F6] rounded-full"
                            style={{ width: `${(s.trials / Math.max(data.topSponsors[0]?.trials || 1, 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[12px] font-mono font-bold text-[#1A1A2E]">{s.trials}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Patent cliff */}
            <Card className="border-border/40 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold">Patent Cliff</CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Orange Book expiries by year</p>
                  </div>
                  <AlertTriangle className="h-4 w-4 text-[#EF4444]" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.patentCliff} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(239,68,68,0.05)" }} />
                      <Bar dataKey="patents" fill={COLORS.red} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent deals table */}
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold">Recent Deal Filings</CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Live SEC EDGAR — 8-K disclosures in {data.therapeuticArea}</p>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 border-0 text-[10px]">Real-Time</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {data.recentDeals.length === 0 && (
                  <p className="text-[12px] text-muted-foreground py-3 text-center">No recent filings found.</p>
                )}
                {data.recentDeals.map((d, i) => (
                  <a
                    key={i}
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-[#F8F9FA] transition-colors group"
                  >
                    <Badge variant="outline" className="text-[10px] h-5 font-mono shrink-0">{d.form}</Badge>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[12px] font-semibold text-[#1A1A2E] group-hover:text-[#F97316] transition-colors truncate">{d.company}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0">{d.date}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{d.description}</p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 mt-1" />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* News + FDA approvals row */}
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Commercial News */}
            <Card className="border-border/40 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold">Commercial News</CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Live signals from Google News</p>
                  </div>
                  <Newspaper className="h-4 w-4 text-[#8B5CF6]" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.news.slice(0, 8).map((n, i) => (
                    <a
                      key={i}
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-3 py-2 rounded-lg hover:bg-[#F8F9FA] transition-colors group"
                    >
                      <p className="text-[12px] font-semibold text-[#1A1A2E] group-hover:text-[#F97316] transition-colors line-clamp-2 leading-tight">
                        {n.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-medium text-[#8B5CF6]">{n.source}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground">{n.date}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* FDA Approvals */}
            <Card className="border-border/40 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold">FDA Approved Products</CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Drugs@FDA in {data.therapeuticArea}</p>
                  </div>
                  <Building2 className="h-4 w-4 text-[#10B981]" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {data.fdaApprovals.slice(0, 8).map((f, i) => (
                    <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-[#F8F9FA] transition-colors">
                      <Badge variant="outline" className="text-[10px] h-5 font-mono shrink-0">{f.applicationNumber}</Badge>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold text-[#1A1A2E] truncate">{f.brandName || "Unnamed"}</p>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {f.sponsor} · {f.productType || "—"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data source footer */}
          <div className="flex items-center justify-between rounded-xl border border-border/40 bg-[#FAFAFA] px-5 py-3 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>Data sources:</span>
              <SourceBadge label="SEC EDGAR" />
              <SourceBadge label="ClinicalTrials.gov" />
              <SourceBadge label="OpenFDA" />
              <SourceBadge label="Orange Book" />
              <SourceBadge label="Google News" />
            </div>
            <span>Updated every load · Free public APIs · No paid feeds</span>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: number;
  sub: string;
  color: string;
  icon: React.ReactNode;
}) {
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

function SourceBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-border/40 text-[10px] font-medium text-[#475569]">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {label}
    </span>
  );
}
