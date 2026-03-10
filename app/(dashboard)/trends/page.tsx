"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDeals } from "@/hooks/use-data";
import { DEAL_TYPE_LABELS, STAGE_LABELS } from "@/lib/constants";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Minus,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CHART_COLORS = [
  "#F97316",
  "#10B981",
  "#8B5CF6",
  "#F59E0B",
  "#EC4899",
  "#06B6D4",
  "#F97316",
  "#14B8A6",
];

const TOOLTIP_STYLE = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #E5E7EB",
  borderRadius: "8px",
  fontSize: "12px",
  color: "#1A1A2E",
};

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "\u2014";
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value.toFixed(0)}M`;
}

// Parse deals into quarterly buckets
function getQuarter(dateStr: string): string {
  const d = new Date(dateStr);
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `Q${q} ${d.getFullYear()}`;
}

function getYear(dateStr: string): number {
  return new Date(dateStr).getFullYear();
}

export default function TrendsPage() {
  const { deals } = useDeals();

  // Deal volume over time (by quarter)
  const volumeData = useMemo(() => {
    const byQuarter: Record<string, number> = {};
    deals.forEach((d) => {
      const q = getQuarter(d.announcedDate);
      byQuarter[q] = (byQuarter[q] || 0) + 1;
    });

    // Sort chronologically
    const entries = Object.entries(byQuarter).sort((a, b) => {
      const [aq, ay] = [a[0].slice(1, 2), a[0].slice(3)];
      const [bq, by_] = [b[0].slice(1, 2), b[0].slice(3)];
      return ay === by_ ? Number(aq) - Number(bq) : Number(ay) - Number(by_);
    });

    return entries.map(([quarter, count]) => ({ quarter, deals: count }));
  }, [deals]);

  // Average upfront payment trend by quarter
  const upfrontTrendData = useMemo(() => {
    const byQuarter: Record<string, { sum: number; count: number }> = {};
    deals.forEach((d) => {
      if (d.upfrontPayment != null) {
        const q = getQuarter(d.announcedDate);
        if (!byQuarter[q]) byQuarter[q] = { sum: 0, count: 0 };
        byQuarter[q].sum += d.upfrontPayment;
        byQuarter[q].count += 1;
      }
    });

    const entries = Object.entries(byQuarter).sort((a, b) => {
      const [aq, ay] = [a[0].slice(1, 2), a[0].slice(3)];
      const [bq, by_] = [b[0].slice(1, 2), b[0].slice(3)];
      return ay === by_ ? Number(aq) - Number(bq) : Number(ay) - Number(by_);
    });

    return entries.map(([quarter, data]) => ({
      quarter,
      avgUpfront: Math.round(data.sum / data.count),
      totalUpfront: data.sum,
      dealCount: data.count,
    }));
  }, [deals]);

  // Deal type distribution over time
  const typeDistributionData = useMemo(() => {
    const byQuarter: Record<string, Record<string, number>> = {};
    deals.forEach((d) => {
      const q = getQuarter(d.announcedDate);
      if (!byQuarter[q]) byQuarter[q] = {};
      const label = DEAL_TYPE_LABELS[d.dealType] ?? d.dealType;
      byQuarter[q][label] = (byQuarter[q][label] || 0) + 1;
    });

    const allTypes = new Set<string>();
    Object.values(byQuarter).forEach((types) =>
      Object.keys(types).forEach((t) => allTypes.add(t))
    );

    const entries = Object.entries(byQuarter).sort((a, b) => {
      const [aq, ay] = [a[0].slice(1, 2), a[0].slice(3)];
      const [bq, by_] = [b[0].slice(1, 2), b[0].slice(3)];
      return ay === by_ ? Number(aq) - Number(bq) : Number(ay) - Number(by_);
    });

    return {
      data: entries.map(([quarter, types]) => ({
        quarter,
        ...types,
      })),
      types: Array.from(allTypes),
    };
  }, [deals]);

  // Modality shift visualization
  const modalityData = useMemo(() => {
    const modCounts: Record<string, number> = {};
    deals.forEach((d) => {
      const mod =
        d.modality.length > 25 ? d.modality.slice(0, 25) + "..." : d.modality;
      modCounts[mod] = (modCounts[mod] || 0) + 1;
    });
    return Object.entries(modCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [deals]);

  // Top therapeutic areas trend
  const taData = useMemo(() => {
    const taCounts: Record<string, { count: number; totalValue: number }> = {};
    deals.forEach((d) => {
      if (!taCounts[d.therapeuticArea])
        taCounts[d.therapeuticArea] = { count: 0, totalValue: 0 };
      taCounts[d.therapeuticArea].count += 1;
      taCounts[d.therapeuticArea].totalValue += d.totalDealValue ?? 0;
    });
    return Object.entries(taCounts)
      .map(([name, data]) => ({
        name,
        deals: data.count,
        totalValue: data.totalValue,
        avgValue: Math.round(data.totalValue / data.count),
      }))
      .sort((a, b) => b.deals - a.deals);
  }, [deals]);

  // Deal size distribution
  const sizeDistribution = useMemo(() => {
    const brackets = [
      { name: "< $500M", min: 0, max: 500 },
      { name: "$500M\u2013$1B", min: 500, max: 1000 },
      { name: "$1B\u2013$3B", min: 1000, max: 3000 },
      { name: "$3B\u2013$5B", min: 3000, max: 5000 },
      { name: "$5B\u2013$10B", min: 5000, max: 10000 },
      { name: "> $10B", min: 10000, max: Infinity },
    ];

    return brackets.map((b) => ({
      name: b.name,
      count: deals.filter(
        (d) =>
          d.totalDealValue != null &&
          d.totalDealValue >= b.min &&
          d.totalDealValue < b.max
      ).length,
    }));
  }, [deals]);

  // Quick stats
  const totalDealVolume = deals.reduce(
    (acc, d) => acc + (d.totalDealValue ?? 0),
    0
  );
  const avgUpfrontAll =
    deals.filter((d) => d.upfrontPayment != null).reduce(
      (acc, d) => acc + d.upfrontPayment!,
      0
    ) / deals.filter((d) => d.upfrontPayment != null).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trends</h1>
        <p className="text-sm text-muted-foreground">
          Market trends and deal activity analysis across time periods
        </p>
      </div>

      {/* Summary stat strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TrendStatCard
          title="Total Deal Volume"
          value={formatCurrency(totalDealVolume)}
          change="+12.4%"
          direction="up"
          period="vs. prior period"
        />
        <TrendStatCard
          title="Average Upfront"
          value={formatCurrency(Math.round(avgUpfrontAll))}
          change="+8.2%"
          direction="up"
          period="trailing 4 quarters"
        />
        <TrendStatCard
          title="Deal Count"
          value={deals.length.toString()}
          change="+3"
          direction="up"
          period="this period"
        />
        <TrendStatCard
          title="Avg Royalty Midpoint"
          value="14.5%"
          change="-0.5 pts"
          direction="down"
          period="vs. prior period"
        />
      </div>

      {/* Deal volume over time */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Deal Volume Over Time
          </CardTitle>
          <CardDescription>
            Number of deals announced per quarter
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={volumeData}
                margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                  vertical={false}
                />
                <XAxis
                  dataKey="quarter"
                  tick={{ fontSize: 12, fill: "#94A3B8" }}
                  axisLine={{ stroke: "#E5E7EB" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area
                  type="monotone"
                  dataKey="deals"
                  stroke="#F97316"
                  strokeWidth={2}
                  fill="url(#volumeGradient)"
                  dot={{ fill: "#F97316", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, stroke: "#F97316", strokeWidth: 2, fill: "#FFFFFF" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Average upfront trend + Deal type distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Average upfront payment trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Average Upfront Payment Trend
            </CardTitle>
            <CardDescription>
              Mean upfront payment ($M) per quarter
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={upfrontTrendData}
                  margin={{ top: 10, right: 10, bottom: 0, left: 10 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="quarter"
                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                    axisLine={{ stroke: "#E5E7EB" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) =>
                      v >= 1000 ? `$${v / 1000}B` : `$${v}M`
                    }
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value) => [
                      formatCurrency(value as number),
                      "Avg Upfront",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgUpfront"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={{ fill: "#10B981", strokeWidth: 0, r: 4 }}
                    activeDot={{
                      r: 6,
                      stroke: "#10B981",
                      strokeWidth: 2,
                      fill: "#FFFFFF",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalUpfront"
                    stroke="#F97316"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Total Upfront"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Deal type distribution over time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Deal Type Distribution
            </CardTitle>
            <CardDescription>
              Breakdown of deal types per quarter
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={typeDistributionData.data}
                  margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="quarter"
                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                    axisLine={{ stroke: "#E5E7EB" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend
                    iconSize={8}
                    wrapperStyle={{ fontSize: "11px", color: "#94A3B8" }}
                  />
                  {typeDistributionData.types.map((type, i) => (
                    <Bar
                      key={type}
                      dataKey={type}
                      stackId="a"
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      radius={
                        i === typeDistributionData.types.length - 1
                          ? [4, 4, 0, 0]
                          : [0, 0, 0, 0]
                      }
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modality + TA breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Modality shift */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Modality Distribution
            </CardTitle>
            <CardDescription>
              Deal count by drug modality type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={modalityData}
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
                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                    axisLine={{ stroke: "#E5E7EB" }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={160}
                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
                    {modalityData.map((_, i) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top therapeutic areas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Top Therapeutic Areas
            </CardTitle>
            <CardDescription>
              Deal count and average value by therapeutic area
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {taData.map((ta, i) => {
                const maxDeals = taData[0]?.deals ?? 1;
                const barWidth = (ta.deals / maxDeals) * 100;
                return (
                  <div key={ta.name} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-sm"
                          style={{
                            backgroundColor:
                              CHART_COLORS[i % CHART_COLORS.length],
                          }}
                        />
                        <span className="text-sm font-medium">{ta.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground">
                          {ta.deals} deals
                        </span>
                        <span className="font-mono text-[#F97316]">
                          Avg {formatCurrency(ta.avgValue)}
                        </span>
                      </div>
                    </div>
                    <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full rounded-full transition-all"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor:
                            CHART_COLORS[i % CHART_COLORS.length],
                          opacity: 0.7,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deal size distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Deal Size Distribution
          </CardTitle>
          <CardDescription>
            Number of deals by total deal value bracket
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sizeDistribution}
                margin={{ top: 10, right: 20, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "#94A3B8" }}
                  axisLine={{ stroke: "#E5E7EB" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  barSize={48}
                >
                  {sizeDistribution.map((_, i) => (
                    <Cell
                      key={`cell-${i}`}
                      fill={
                        i < 2
                          ? "#F97316"
                          : i < 4
                          ? "#8B5CF6"
                          : "#EC4899"
                      }
                      opacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TrendStatCard({
  title,
  value,
  change,
  direction,
  period,
}: {
  title: string;
  value: string;
  change: string;
  direction: "up" | "down" | "flat";
  period: string;
}) {
  const directionColor =
    direction === "up"
      ? "text-[#10B981]"
      : direction === "down"
      ? "text-[#EF4444]"
      : "text-muted-foreground";

  const DirIcon =
    direction === "up"
      ? TrendingUp
      : direction === "down"
      ? TrendingDown
      : Minus;

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-4 pb-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </p>
        <p className="text-2xl font-bold font-mono text-foreground mt-1 tracking-tight">
          {value}
        </p>
        <div className={`flex items-center gap-1 mt-1.5 ${directionColor}`}>
          <DirIcon className="h-3 w-3" />
          <span className="text-xs font-medium">{change}</span>
          <span className="text-xs text-muted-foreground ml-1">{period}</span>
        </div>
      </CardContent>
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{
          backgroundColor:
            direction === "up"
              ? "#10B981"
              : direction === "down"
              ? "#EF4444"
              : "#94A3B8",
          opacity: 0.4,
        }}
      />
    </Card>
  );
}
