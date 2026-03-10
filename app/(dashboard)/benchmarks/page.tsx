"use client";

import { useState, useMemo } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getUpfrontStats,
  getRoyaltyStats,
} from "@/lib/mock-data";
import { useDeals } from "@/hooks/use-data";
import {
  DEAL_TYPE_LABELS,
  STAGE_LABELS,
  THERAPEUTIC_AREAS,
  MODALITIES,
  DEAL_STAGES,
} from "@/lib/constants";
import {
  BarChart3,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "\u2014";
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value.toFixed(0)}M`;
}

export default function BenchmarksPage() {
  const { deals } = useDeals();
  const [taFilter, setTaFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [modalityFilter, setModalityFilter] = useState<string>("all");

  // Apply filters to get working dataset
  const filteredDeals = useMemo(() => {
    let filtered = [...deals];
    if (taFilter !== "all")
      filtered = filtered.filter((d) => d.therapeuticArea === taFilter);
    if (stageFilter !== "all")
      filtered = filtered.filter((d) => d.developmentStage === stageFilter);
    if (modalityFilter !== "all")
      filtered = filtered.filter((d) => d.modality === modalityFilter);
    return filtered;
  }, [deals, taFilter, stageFilter, modalityFilter]);

  // Compute stats for filtered deals
  const stats = useMemo(() => {
    const upfronts = filteredDeals
      .filter((d) => d.upfrontPayment != null)
      .map((d) => d.upfrontPayment!)
      .sort((a, b) => a - b);

    const totals = filteredDeals
      .filter((d) => d.totalDealValue != null)
      .map((d) => d.totalDealValue!)
      .sort((a, b) => a - b);

    const royaltyLows = filteredDeals
      .filter((d) => d.royaltyRangeLow != null)
      .map((d) => d.royaltyRangeLow!)
      .sort((a, b) => a - b);

    const royaltyHighs = filteredDeals
      .filter((d) => d.royaltyRangeHigh != null)
      .map((d) => d.royaltyRangeHigh!)
      .sort((a, b) => a - b);

    const median = (arr: number[]) =>
      arr.length === 0 ? 0 : arr[Math.floor(arr.length / 2)];
    const mean = (arr: number[]) =>
      arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
      upfront: {
        median: median(upfronts),
        mean: Math.round(mean(upfronts)),
        min: upfronts[0] ?? 0,
        max: upfronts[upfronts.length - 1] ?? 0,
        count: upfronts.length,
      },
      total: {
        median: median(totals),
        mean: Math.round(mean(totals)),
        min: totals[0] ?? 0,
        max: totals[totals.length - 1] ?? 0,
        count: totals.length,
      },
      royalty: {
        medianLow: median(royaltyLows),
        medianHigh: median(royaltyHighs),
        rangeLow: royaltyLows[0] ?? 0,
        rangeHigh: royaltyHighs[royaltyHighs.length - 1] ?? 0,
        count: royaltyLows.length,
      },
    };
  }, [filteredDeals]);

  // Chart data: upfront payments across deals
  const upfrontChartData = useMemo(() => {
    return filteredDeals
      .filter((d) => d.upfrontPayment != null)
      .sort((a, b) => a.upfrontPayment! - b.upfrontPayment!)
      .map((d) => ({
        name: d.title.length > 25 ? d.title.slice(0, 25) + "..." : d.title,
        upfront: d.upfrontPayment!,
        total: d.totalDealValue ?? 0,
      }));
  }, [filteredDeals]);

  // Royalty box-plot style data
  const royaltyData = useMemo(() => {
    return filteredDeals
      .filter((d) => d.royaltyRangeLow != null && d.royaltyRangeHigh != null)
      .sort((a, b) => a.royaltyRangeLow! - b.royaltyRangeLow!)
      .map((d) => ({
        name: d.title.length > 20 ? d.title.slice(0, 20) + "..." : d.title,
        fullTitle: d.title,
        low: d.royaltyRangeLow!,
        high: d.royaltyRangeHigh!,
        mid: ((d.royaltyRangeLow! + d.royaltyRangeHigh!) / 2),
        range: d.royaltyRangeHigh! - d.royaltyRangeLow!,
      }));
  }, [filteredDeals]);

  const globalUpfrontStats = getUpfrontStats();
  const globalRoyaltyStats = getRoyaltyStats();

  const isFiltered =
    taFilter !== "all" || stageFilter !== "all" || modalityFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Benchmarks</h1>
          <p className="text-sm text-muted-foreground">
            Statistical analysis of deal terms across precedents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {filteredDeals.length} deals
          </Badge>
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTaFilter("all");
                setStageFilter("all");
                setModalityFilter("all");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground font-medium">
              Filter by:
            </span>
            <Select
              value={taFilter}
              onValueChange={(v) => setTaFilter(v ?? "all")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Therapeutic Area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Therapeutic Areas</SelectItem>
                {THERAPEUTIC_AREAS.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={stageFilter}
              onValueChange={(v) => setStageFilter(v ?? "all")}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {DEAL_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={modalityFilter}
              onValueChange={(v) => setModalityFilter(v ?? "all")}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Modality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modalities</SelectItem>
                {MODALITIES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Statistics panel - Big stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BigStatCard
          title="Median Upfront"
          value={formatCurrency(stats.upfront.median)}
          subtitle={`Range: ${formatCurrency(stats.upfront.min)} \u2013 ${formatCurrency(stats.upfront.max)}`}
          detail={`Mean: ${formatCurrency(stats.upfront.mean)}`}
          n={stats.upfront.count}
        />
        <BigStatCard
          title="Median Total Value"
          value={formatCurrency(stats.total.median)}
          subtitle={`Range: ${formatCurrency(stats.total.min)} \u2013 ${formatCurrency(stats.total.max)}`}
          detail={`Mean: ${formatCurrency(stats.total.mean)}`}
          n={stats.total.count}
        />
        <BigStatCard
          title="Median Royalty (Low)"
          value={`${stats.royalty.medianLow}%`}
          subtitle={`Full range: ${stats.royalty.rangeLow}% \u2013 ${stats.royalty.rangeHigh}%`}
          detail={`Median high: ${stats.royalty.medianHigh}%`}
          n={stats.royalty.count}
        />
        <BigStatCard
          title="Median Royalty (High)"
          value={`${stats.royalty.medianHigh}%`}
          subtitle={`Spread: ${stats.royalty.rangeHigh - stats.royalty.rangeLow} pts`}
          detail={`${stats.royalty.count} deals with royalty data`}
          n={stats.royalty.count}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upfront payments bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Upfront Payments Comparison
            </CardTitle>
            <CardDescription>
              Upfront payment ($M) across filtered deals
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upfrontChartData.length > 0 ? (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={upfrontChartData}
                    margin={{ top: 10, right: 10, bottom: 60, left: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.06)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "#94A3B8" }}
                      axisLine={{ stroke: "#E5E7EB" }}
                      tickLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={70}
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
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "#1A1A2E",
                      }}
                      formatter={(value) => [
                        formatCurrency(value as number),
                        "Upfront",
                      ]}
                    />
                    <ReferenceLine
                      y={stats.upfront.median}
                      stroke="#F59E0B"
                      strokeDasharray="5 5"
                      label={{
                        value: `Median: ${formatCurrency(stats.upfront.median)}`,
                        fill: "#F59E0B",
                        fontSize: 11,
                        position: "insideTopRight",
                      }}
                    />
                    <Bar
                      dataKey="upfront"
                      fill="#F97316"
                      radius={[4, 4, 0, 0]}
                      barSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[320px] text-sm text-muted-foreground">
                No upfront payment data available for current filters
              </div>
            )}
          </CardContent>
        </Card>

        {/* Royalty range visualization */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Royalty Ranges</CardTitle>
            <CardDescription>
              Low-to-high royalty range per deal (%)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {royaltyData.length > 0 ? (
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
                {royaltyData.map((deal, i) => {
                  const maxVal = 30;
                  const leftPct = (deal.low / maxVal) * 100;
                  const widthPct = ((deal.high - deal.low) / maxVal) * 100;

                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className="text-muted-foreground truncate max-w-[180px]"
                          title={deal.fullTitle}
                        >
                          {deal.name}
                        </span>
                        <span className="font-mono text-foreground">
                          {deal.low}% \u2013 {deal.high}%
                        </span>
                      </div>
                      <div className="relative h-3 w-full rounded-full bg-muted">
                        {/* Median reference line */}
                        <div
                          className="absolute top-0 bottom-0 w-px bg-[#F59E0B]/50 z-10"
                          style={{
                            left: `${(stats.royalty.medianLow / maxVal) * 100}%`,
                          }}
                        />
                        {/* Range bar */}
                        <div
                          className="absolute top-0.5 bottom-0.5 rounded-full"
                          style={{
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                            background: `linear-gradient(90deg, #F97316, #8B5CF6)`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                {/* Scale */}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
                  <span>0%</span>
                  <span>5%</span>
                  <span>10%</span>
                  <span>15%</span>
                  <span>20%</span>
                  <span>25%</span>
                  <span>30%</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[320px] text-sm text-muted-foreground">
                No royalty data available for current filters
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparison table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Deal Comparison Table</CardTitle>
              <CardDescription>
                Side-by-side comparison of key financial terms
              </CardDescription>
            </div>
            <Badge variant="secondary">{filteredDeals.length} deals</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Deal</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>TA</TableHead>
                <TableHead className="text-right">Upfront</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead className="text-right">Dev. MS</TableHead>
                <TableHead className="text-right">Comm. MS</TableHead>
                <TableHead className="text-right">Royalty</TableHead>
                <TableHead className="text-center">Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeals.map((deal) => (
                <TableRow key={deal.id} className="group/row">
                  <TableCell className="max-w-[200px]">
                    <Link
                      href={`/deals/${deal.id}`}
                      className="font-medium group-hover/row:text-[#F97316] transition-colors"
                    >
                      {deal.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {DEAL_TYPE_LABELS[deal.dealType] ?? deal.dealType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {STAGE_LABELS[deal.developmentStage] ??
                        deal.developmentStage}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {deal.therapeuticArea}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    <UpfrontIndicator
                      value={deal.upfrontPayment}
                      median={stats.upfront.median}
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">
                    {formatCurrency(deal.totalDealValue)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(deal.developmentMilestones)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(deal.commercialMilestones)}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {deal.royaltyRangeLow != null
                      ? `${deal.royaltyRangeLow}\u2013${deal.royaltyRangeHigh}%`
                      : "\u2014"}
                  </TableCell>
                  <TableCell className="text-center">
                    <ConfidenceDot value={deal.confidence} />
                  </TableCell>
                </TableRow>
              ))}
              {/* Summary row */}
              <TableRow className="bg-muted/30 hover:bg-muted/50 font-medium border-t-2 border-border">
                <TableCell colSpan={4} className="text-sm">
                  <span className="text-[#F97316]">Median</span>
                  <span className="text-muted-foreground ml-2">
                    (n={filteredDeals.length})
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-[#F97316]">
                  {formatCurrency(stats.upfront.median)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-[#F97316]">
                  {formatCurrency(stats.total.median)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-muted-foreground">
                  \u2014
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-muted-foreground">
                  \u2014
                </TableCell>
                <TableCell className="text-right text-sm text-[#F97316]">
                  {stats.royalty.medianLow}\u2013{stats.royalty.medianHigh}%
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function BigStatCard({
  title,
  value,
  subtitle,
  detail,
  n,
}: {
  title: string;
  value: string;
  subtitle: string;
  detail: string;
  n: number;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
            n={n}
          </Badge>
        </div>
        <p className="text-3xl font-bold font-mono text-[#F97316] tracking-tight">
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
      </CardContent>
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F97316]"
        style={{ opacity: 0.3 }}
      />
    </Card>
  );
}

function UpfrontIndicator({
  value,
  median,
}: {
  value: number | null;
  median: number;
}) {
  if (value == null) return <span className="text-muted-foreground">\u2014</span>;

  const pctDiff = median > 0 ? ((value - median) / median) * 100 : 0;

  return (
    <div className="flex items-center justify-end gap-1">
      <span>{formatCurrency(value)}</span>
      {Math.abs(pctDiff) > 10 && (
        <>
          {pctDiff > 0 ? (
            <ArrowUpRight className="h-3 w-3 text-[#10B981]" />
          ) : (
            <ArrowDownRight className="h-3 w-3 text-[#EF4444]" />
          )}
        </>
      )}
    </div>
  );
}

function ConfidenceDot({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 90
      ? "bg-[#10B981]"
      : pct >= 80
      ? "bg-[#F59E0B]"
      : "bg-[#EF4444]";

  return (
    <div className="flex items-center justify-center gap-1.5">
      <div className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-xs font-mono text-muted-foreground">{pct}%</span>
    </div>
  );
}
