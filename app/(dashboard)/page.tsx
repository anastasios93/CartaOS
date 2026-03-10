"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
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
  Plus,
  Search,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
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
    year: "numeric",
  });
}

const CHART_COLORS = [
  "#F97316",
  "#10B981",
  "#8B5CF6",
  "#F59E0B",
  "#EC4899",
  "#06B6D4",
  "#F97316",
];

export default function DashboardPage() {
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
        .slice(0, 5),
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
      stage: STAGE_LABELS[item.stage] ?? item.stage,
      count: item.count,
    }));
  }, []);

  const taData = useMemo(() => getDealsByTherapeuticArea(), []);

  const activeNegotiations = negotiations.filter(
    (n) => n.status !== "CLOSED" && n.status !== "DEAD"
  ).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Biotech deal intelligence overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/deals">
              <Search className="mr-1.5 h-3.5 w-3.5" />
              Search Deals
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/deals/new">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Deal
            </Link>
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Deals"
          value={deals.length.toString()}
          subtitle="Precedent transactions"
          icon={<FileText className="h-4 w-4" />}
          trend="+3 this quarter"
          accentColor="text-[#F97316]"
        />
        <StatCard
          title="Companies Tracked"
          value={companies.length.toString()}
          subtitle="Pharma & biotech partners"
          icon={<Building2 className="h-4 w-4" />}
          trend="2 in discussion"
          accentColor="text-[#10B981]"
        />
        <StatCard
          title="Active Negotiations"
          value={activeNegotiations.toString()}
          subtitle="Ongoing deal processes"
          icon={<Handshake className="h-4 w-4" />}
          trend="1 term sheet exchanged"
          accentColor="text-[#F59E0B]"
        />
        <StatCard
          title="Avg Deal Value"
          value={formatCurrency(avgDealValue)}
          subtitle="Across all deal types"
          icon={<DollarSign className="h-4 w-4" />}
          trend="Median $3.1B"
          accentColor="text-[#8B5CF6]"
        />
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent Deals - takes 3 columns */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Deals</CardTitle>
              <CardDescription>Latest precedent transactions</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/deals">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentDeals.map((deal) => (
                <Link
                  key={deal.id}
                  href={`/deals/${deal.id}`}
                  className="flex items-center justify-between rounded-lg border border-border/50 p-3 transition-all hover:bg-muted/50 hover:border-border"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-none truncate">
                      {deal.title}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {deal.licensorName} / {deal.licenseeName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(deal.announcedDate)}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-xs">
                      {DEAL_TYPE_LABELS[deal.dealType] ?? deal.dealType}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {STAGE_LABELS[deal.developmentStage] ??
                        deal.developmentStage}
                    </Badge>
                    {deal.upfrontPayment != null && (
                      <span className="text-xs font-mono font-medium text-[#F97316]">
                        {formatCurrency(deal.upfrontPayment)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Deals by Therapeutic Area - takes 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">By Therapeutic Area</CardTitle>
            <CardDescription>Deal distribution across TAs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="name"
                    stroke="none"
                  >
                    {taData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#1A1A2E",
                    }}
                  />
                  <Legend
                    iconSize={8}
                    wrapperStyle={{ fontSize: "11px", color: "#94A3B8" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bar chart + Quick actions */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Deals by Stage bar chart */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Deals by Stage</CardTitle>
            <CardDescription>
              Distribution across development stages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stageData}
                  layout="vertical"
                  margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12, fill: "#94A3B8" }}
                    axisLine={{ stroke: "#E5E7EB" }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="stage"
                    width={80}
                    tick={{ fontSize: 12, fill: "#94A3B8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#1A1A2E",
                    }}
                    cursor={{ fill: "rgba(249,115,22,0.08)" }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#F97316"
                    radius={[0, 4, 4, 0]}
                    barSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Frequently used tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Link
                href="/deals"
                className="flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-all hover:bg-muted/50 hover:border-border"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F97316]/10">
                  <Search className="h-4 w-4 text-[#F97316]" />
                </div>
                <div>
                  <p className="text-sm font-medium">Search Deals</p>
                  <p className="text-xs text-muted-foreground">
                    Browse deal precedents
                  </p>
                </div>
              </Link>
              <Link
                href="/benchmarks"
                className="flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-all hover:bg-muted/50 hover:border-border"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#10B981]/10">
                  <BarChart3 className="h-4 w-4 text-[#10B981]" />
                </div>
                <div>
                  <p className="text-sm font-medium">Run Benchmark</p>
                  <p className="text-xs text-muted-foreground">
                    Compare deal terms
                  </p>
                </div>
              </Link>
              <Link
                href="/trends"
                className="flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-all hover:bg-muted/50 hover:border-border"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#8B5CF6]/10">
                  <TrendingUp className="h-4 w-4 text-[#8B5CF6]" />
                </div>
                <div>
                  <p className="text-sm font-medium">View Trends</p>
                  <p className="text-xs text-muted-foreground">
                    Market trend analysis
                  </p>
                </div>
              </Link>
              <Link
                href="/deals/new"
                className="flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-all hover:bg-muted/50 hover:border-border"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F59E0B]/10">
                  <Plus className="h-4 w-4 text-[#F59E0B]" />
                </div>
                <div>
                  <p className="text-sm font-medium">Add Deal</p>
                  <p className="text-xs text-muted-foreground">
                    Upload new transaction
                  </p>
                </div>
              </Link>
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
  subtitle,
  icon,
  trend,
  accentColor,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  trend: string;
  accentColor: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
        <div className={accentColor}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-mono tracking-tight">
          {value}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        <p className={`text-xs mt-1.5 ${accentColor}`}>{trend}</p>
      </CardContent>
      <div
        className={`absolute bottom-0 left-0 right-0 h-[2px] ${accentColor
          .replace("text-", "bg-")
          .replace("[", "[")}`}
        style={{
          backgroundColor: accentColor.match(/\[(.+)\]/)?.[1] ?? "#F97316",
          opacity: 0.5,
        }}
      />
    </Card>
  );
}
