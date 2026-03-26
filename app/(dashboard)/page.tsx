"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getDealsByTherapeuticArea,
  getDealsByStage,
} from "@/lib/mock-data";
import { useDeals, useCompanies, useNegotiations } from "@/hooks/use-data";
import { DEAL_TYPE_LABELS, STAGE_LABELS } from "@/lib/constants";
import {
  FileText,
  Building2,
  Handshake,
  DollarSign,
  ArrowRight,
  ArrowUpRight,
  FileInput,
  Sparkles,
  BarChart3,
  Users,
  MessageSquare,
  TrendingUp,
  Clock,
  Target,
  Zap,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "\u2014";
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value.toFixed(0)}M`;
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function timeAgo(date: Date | string) {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff}d ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  return `${Math.floor(diff / 30)}mo ago`;
}

const COLORS = {
  orange: "#F97316",
  green: "#10B981",
  violet: "#8B5CF6",
  blue: "#3B82F6",
  pink: "#EC4899",
  amber: "#F59E0B",
  cyan: "#06B6D4",
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const { deals } = useDeals();
  const { companies } = useCompanies();
  const { negotiations } = useNegotiations();

  const recentDeals = useMemo(
    () =>
      [...deals]
        .sort(
          (a, b) =>
            new Date(b.announcedDate).getTime() -
            new Date(a.announcedDate).getTime()
        )
        .slice(0, 6),
    [deals]
  );

  const avgDealValue = useMemo(() => {
    const values = deals.filter((d) => d.totalDealValue != null).map(
      (d) => d.totalDealValue!
    );
    return values.length
      ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      : 0;
  }, [deals]);

  const stageData = useMemo(() => {
    return getDealsByStage().map((item) => ({
      stage: (STAGE_LABELS[item.stage] ?? item.stage).replace("Phase ", "Ph "),
      count: item.count,
    }));
  }, []);

  const taData = useMemo(() => getDealsByTherapeuticArea().slice(0, 5), []);

  const activeNegotiations = negotiations.filter(
    (n) => n.status !== "CLOSED" && n.status !== "DEAD"
  ).length;

  // Generate mock sparkline data
  const sparkline = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        month: i,
        value: Math.floor(Math.random() * 5) + (deals.length > 0 ? deals.length / 12 : 1) * (i + 1),
      })),
    [deals.length]
  );

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E]">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {session?.user?.name?.split(" ")[0] || "there"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Here&apos;s what&apos;s happening with your deal portfolio
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" asChild>
            <Link href="/benchmarks">
              <BarChart3 className="h-3.5 w-3.5 text-[#F97316]" />
              Comparables
            </Link>
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-[#F97316] hover:bg-[#EA580C] text-white" asChild>
            <Link href="/hub">
              <Zap className="h-3.5 w-3.5" />
              New Analysis
            </Link>
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Deals"
          value={deals.length.toString()}
          change="+3 this quarter"
          changeType="positive"
          icon={<FileText className="h-4 w-4" />}
          color={COLORS.orange}
        />
        <StatCard
          title="Partners Tracked"
          value={companies.length.toString()}
          change="2 new this month"
          changeType="positive"
          icon={<Building2 className="h-4 w-4" />}
          color={COLORS.blue}
        />
        <StatCard
          title="Negotiations"
          value={activeNegotiations.toString()}
          change="1 term sheet sent"
          changeType="neutral"
          icon={<Handshake className="h-4 w-4" />}
          color={COLORS.green}
        />
        <StatCard
          title="Avg Deal Value"
          value={formatCurrency(avgDealValue)}
          change="Median $3.1B"
          changeType="neutral"
          icon={<DollarSign className="h-4 w-4" />}
          color={COLORS.violet}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction
          title="Intelligence Hub"
          description="Deploy 4 AI agents on any deal"
          icon={<Zap className="h-5 w-5" />}
          href="/hub"
          color={COLORS.orange}
        />
        <QuickAction
          title="Run Benchmark"
          description="Compare against precedent deals"
          icon={<BarChart3 className="h-5 w-5" />}
          href="/benchmarks"
          color={COLORS.blue}
        />
        <QuickAction
          title="Match Partners"
          description="Find ideal licensing partners"
          icon={<Users className="h-5 w-5" />}
          href="/partners"
          color={COLORS.green}
        />
        <QuickAction
          title="Ask AI Companion"
          description="Get instant deal insights"
          icon={<MessageSquare className="h-5 w-5" />}
          href="/conductor"
          color={COLORS.violet}
        />
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 border-border/40 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Recent Deal Activity</CardTitle>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground" asChild>
              <Link href="/deals">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {recentDeals.map((deal) => (
                <Link
                  key={deal.id}
                  href={`/deals/${deal.id}`}
                  className="flex items-center gap-4 rounded-lg px-3 py-2.5 transition-colors hover:bg-[#F8F9FA] group"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F97316]/8 text-[#F97316] shrink-0">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium leading-tight truncate group-hover:text-[#F97316] transition-colors">
                      {deal.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {deal.licensorName} &middot; {deal.licenseeName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px] h-5 font-normal border-border/60">
                      {STAGE_LABELS[deal.developmentStage] ?? deal.developmentStage}
                    </Badge>
                    {deal.upfrontPayment != null && (
                      <span className="text-[12px] font-mono font-semibold text-[#F97316]">
                        {formatCurrency(deal.upfrontPayment)}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground/60 w-10 text-right">
                      {timeAgo(deal.announcedDate)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Deal Pipeline */}
        <Card className="border-border/40 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Deal Pipeline</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageData} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="stage"
                    width={70}
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                      fontSize: "12px",
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,.06)",
                    }}
                    cursor={{ fill: "rgba(249,115,22,0.05)" }}
                  />
                  <Bar dataKey="count" fill="#F97316" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* TA breakdown below chart */}
            <div className="mt-4 space-y-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                Top Therapeutic Areas
              </p>
              {taData.map((ta, i) => (
                <div key={ta.name} className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: Object.values(COLORS)[i % 7] }}
                  />
                  <span className="text-[12px] text-muted-foreground flex-1 truncate">{ta.name}</span>
                  <span className="text-[12px] font-medium font-mono">{ta.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Deal Volume Trend */}
        <Card className="border-border/40 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">Deal Volume</CardTitle>
              </div>
              <Badge variant="secondary" className="text-[10px] h-5 font-normal">12mo</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkline} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <defs>
                    <linearGradient id="gradOrange" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F97316" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#F97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#F97316"
                    strokeWidth={2}
                    fill="url(#gradOrange)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card className="lg:col-span-2 border-border/40 shadow-sm bg-gradient-to-br from-white to-[#FFF7ED]/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[#F97316] to-[#EA580C]">
                <Zap className="h-3 w-3 text-white" />
              </div>
              <CardTitle className="text-sm font-semibold">AI Insights</CardTitle>
              <Badge className="text-[10px] h-5 bg-[#F97316]/10 text-[#F97316] border-0 font-medium">
                Powered by Deal Twin
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-3 sm:grid-cols-2">
              <InsightCard
                title="ADC deals trending up"
                description="Antibody-drug conjugate licensing deals increased 40% YoY with average upfronts reaching $200M+"
                tag="Market Trend"
                tagColor={COLORS.blue}
              />
              <InsightCard
                title="Oncology remains dominant"
                description="65% of recent deals are oncology-focused. Consider immunology for less competition."
                tag="Portfolio"
                tagColor={COLORS.green}
              />
              <InsightCard
                title="Royalty ranges tightening"
                description="Mid-single-digit royalties becoming standard for Phase 1 assets across modalities"
                tag="Benchmarking"
                tagColor={COLORS.violet}
              />
              <InsightCard
                title="3 partners match your profile"
                description="Based on your latest asset, Roche, Novartis, and AstraZeneca show high fit scores"
                tag="Partner Match"
                tagColor={COLORS.orange}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  changeType,
  icon,
  color,
}: {
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card className="relative overflow-hidden border-border/40 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              {title}
            </p>
            <p className="text-2xl font-bold font-mono tracking-tight mt-2 text-[#1A1A2E]">
              {value}
            </p>
            <p className={`text-[11px] mt-1.5 font-medium ${
              changeType === "positive" ? "text-[#10B981]" :
              changeType === "negative" ? "text-[#EF4444]" :
              "text-muted-foreground"
            }`}>
              {change}
            </p>
          </div>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${color}10`, color }}
          >
            {icon}
          </div>
        </div>
      </CardContent>
      <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ backgroundColor: color, opacity: 0.4 }} />
    </Card>
  );
}

function QuickAction({
  title,
  description,
  icon,
  href,
  color,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-border/40 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-border/60 hover:-translate-y-0.5"
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0 transition-transform group-hover:scale-110"
        style={{ backgroundColor: `${color}10`, color }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[#1A1A2E] group-hover:text-[#F97316] transition-colors">{title}</p>
        <p className="text-[11px] text-muted-foreground truncate">{description}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-[#F97316] transition-colors shrink-0" />
    </Link>
  );
}

function InsightCard({
  title,
  description,
  tag,
  tagColor,
}: {
  title: string;
  description: string;
  tag: string;
  tagColor: string;
}) {
  return (
    <div className="rounded-lg border border-border/30 bg-white p-3.5 hover:border-border/50 transition-colors">
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="inline-flex h-5 items-center rounded-md px-1.5 text-[10px] font-semibold"
          style={{ backgroundColor: `${tagColor}12`, color: tagColor }}
        >
          {tag}
        </span>
      </div>
      <p className="text-[13px] font-medium text-[#1A1A2E] leading-tight">{title}</p>
      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
        {description}
      </p>
    </div>
  );
}
