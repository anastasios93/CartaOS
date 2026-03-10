"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useDeals } from "@/hooks/use-data";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Calculator,
  TrendingUp,
  DollarSign,
  BarChart3,
  Target,
  Percent,
  Clock,
} from "lucide-react";

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "--";
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value.toFixed(0)}M`;
}

interface Milestone {
  id: string;
  name: string;
  category: "development" | "commercial";
  payment: string; // stored as string for form input
  probability: number; // 0-100
  timelineYears: string; // years from start
}

const DEFAULT_MILESTONES: Milestone[] = [
  // Development milestones
  {
    id: "ms-1",
    name: "IND Filing",
    category: "development",
    payment: "10",
    probability: 90,
    timelineYears: "1",
  },
  {
    id: "ms-2",
    name: "Phase 1 Start (First Patient Dosed)",
    category: "development",
    payment: "15",
    probability: 85,
    timelineYears: "1.5",
  },
  {
    id: "ms-3",
    name: "Phase 2 Start",
    category: "development",
    payment: "30",
    probability: 65,
    timelineYears: "3",
  },
  {
    id: "ms-4",
    name: "Phase 2 Completion (Primary Endpoint Met)",
    category: "development",
    payment: "50",
    probability: 45,
    timelineYears: "4.5",
  },
  {
    id: "ms-5",
    name: "Phase 3 Start (First Patient Dosed)",
    category: "development",
    payment: "75",
    probability: 40,
    timelineYears: "5",
  },
  {
    id: "ms-6",
    name: "BLA/NDA Filing",
    category: "development",
    payment: "100",
    probability: 30,
    timelineYears: "7",
  },
  {
    id: "ms-7",
    name: "First Regulatory Approval (US or EU)",
    category: "development",
    payment: "150",
    probability: 25,
    timelineYears: "8",
  },
  // Commercial milestones
  {
    id: "ms-8",
    name: "First Commercial Sale",
    category: "commercial",
    payment: "50",
    probability: 23,
    timelineYears: "8.5",
  },
  {
    id: "ms-9",
    name: "$100M Cumulative Net Sales",
    category: "commercial",
    payment: "75",
    probability: 20,
    timelineYears: "10",
  },
  {
    id: "ms-10",
    name: "$500M Cumulative Net Sales",
    category: "commercial",
    payment: "100",
    probability: 12,
    timelineYears: "12",
  },
  {
    id: "ms-11",
    name: "$1B Cumulative Net Sales",
    category: "commercial",
    payment: "150",
    probability: 8,
    timelineYears: "14",
  },
];

let nextId = 100;

export default function MilestoneModelingPage() {
  const { deals } = useDeals();
  const [milestones, setMilestones] = useState<Milestone[]>(DEFAULT_MILESTONES);
  const [discountRate, setDiscountRate] = useState("10");

  const updateMilestone = (id: string, field: keyof Milestone, value: string | number) => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const removeMilestone = (id: string) => {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  };

  const addMilestone = (category: "development" | "commercial") => {
    const newMs: Milestone = {
      id: `ms-new-${nextId++}`,
      name: "",
      category,
      payment: "",
      probability: 50,
      timelineYears: "",
    };
    setMilestones((prev) => [...prev, newMs]);
  };

  // Calculations
  const calculations = useMemo(() => {
    const rate = Number(discountRate) / 100;
    const devMs = milestones.filter((m) => m.category === "development");
    const comMs = milestones.filter((m) => m.category === "commercial");

    const calcForList = (list: Milestone[]) => {
      let totalNominal = 0;
      let totalWeighted = 0;
      let totalNPV = 0;

      list.forEach((m) => {
        const payment = Number(m.payment) || 0;
        const prob = m.probability / 100;
        const years = Number(m.timelineYears) || 0;

        totalNominal += payment;
        const weighted = payment * prob;
        totalWeighted += weighted;

        // Discount to present value
        const pv = weighted / Math.pow(1 + rate, years);
        totalNPV += pv;
      });

      return { totalNominal, totalWeighted, totalNPV };
    };

    const devCalc = calcForList(devMs);
    const comCalc = calcForList(comMs);
    const allCalc = calcForList(milestones);

    return {
      development: devCalc,
      commercial: comCalc,
      total: allCalc,
    };
  }, [milestones, discountRate]);

  // Benchmark comparisons from mock deals
  const benchmarkComps = useMemo(() => {
    const dealsWithMilestones = deals.filter(
      (d) => d.developmentMilestones != null || d.commercialMilestones != null
    );

    const devMilestones = dealsWithMilestones
      .filter((d) => d.developmentMilestones != null)
      .map((d) => d.developmentMilestones!);
    const comMilestones = dealsWithMilestones
      .filter((d) => d.commercialMilestones != null)
      .map((d) => d.commercialMilestones!);

    const sorted = (arr: number[]) => [...arr].sort((a, b) => a - b);
    const med = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const s = sorted(arr);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    };

    return {
      devMedian: med(devMilestones),
      devMin: devMilestones.length ? Math.min(...devMilestones) : 0,
      devMax: devMilestones.length ? Math.max(...devMilestones) : 0,
      comMedian: med(comMilestones),
      comMin: comMilestones.length ? Math.min(...comMilestones) : 0,
      comMax: comMilestones.length ? Math.max(...comMilestones) : 0,
      dealCount: dealsWithMilestones.length,
      topDeals: dealsWithMilestones
        .sort((a, b) => (b.totalDealValue ?? 0) - (a.totalDealValue ?? 0))
        .slice(0, 5),
    };
  }, [deals]);

  // Data for the visual waterfall
  const waterfallData = useMemo(() => {
    return milestones
      .filter((m) => Number(m.payment) > 0)
      .sort((a, b) => Number(a.timelineYears) - Number(b.timelineYears));
  }, [milestones]);

  const maxPayment = useMemo(() => {
    return Math.max(...waterfallData.map((m) => Number(m.payment) || 0), 1);
  }, [waterfallData]);

  const maxTimeline = useMemo(() => {
    return Math.max(...waterfallData.map((m) => Number(m.timelineYears) || 1), 1);
  }, [waterfallData]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/term-builder">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Milestone Modeling</h1>
            <p className="text-sm text-muted-foreground">
              Build and analyze milestone payment schedules with probability-weighted NPV
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setMilestones(DEFAULT_MILESTONES)}
        >
          Reset to Template
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nominal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(calculations.total.totalNominal)}
            </div>
            <p className="text-xs text-muted-foreground">
              Dev: {formatCurrency(calculations.development.totalNominal)} | Com:{" "}
              {formatCurrency(calculations.commercial.totalNominal)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Probability-Weighted</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(calculations.total.totalWeighted)}
            </div>
            <p className="text-xs text-muted-foreground">
              {calculations.total.totalNominal > 0
                ? Math.round(
                    (calculations.total.totalWeighted / calculations.total.totalNominal) * 100
                  )
                : 0}
              % of nominal value
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk-Adjusted NPV</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#F97316]">
              {formatCurrency(calculations.total.totalNPV)}
            </div>
            <p className="text-xs text-muted-foreground">
              At {discountRate}% discount rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Milestones</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{milestones.length}</div>
            <p className="text-xs text-muted-foreground">
              {milestones.filter((m) => m.category === "development").length} dev |{" "}
              {milestones.filter((m) => m.category === "commercial").length} commercial
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Discount Rate */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label htmlFor="discount-rate" className="shrink-0">
              Discount Rate (%)
            </Label>
            <Input
              id="discount-rate"
              type="number"
              value={discountRate}
              onChange={(e) => setDiscountRate(e.target.value)}
              className="w-24"
              min="0"
              max="30"
              step="0.5"
            />
            <div className="flex items-center gap-2">
              {[8, 10, 12, 15].map((rate) => (
                <Button
                  key={rate}
                  variant={discountRate === String(rate) ? "default" : "outline"}
                  size="xs"
                  onClick={() => setDiscountRate(String(rate))}
                >
                  {rate}%
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Industry standard for biotech: 10&ndash;15%
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Visual Timeline / Waterfall */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Milestone Timeline &amp; Waterfall</CardTitle>
          <CardDescription>
            Payment amounts by expected timeline (bar height = payment, opacity = probability)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {waterfallData.length > 0 ? (
            <div className="space-y-4">
              {/* Chart */}
              <div className="relative h-64 rounded-lg border border-border/50 bg-muted/10 p-4">
                <div className="flex h-full items-end gap-1">
                  {waterfallData.map((m) => {
                    const paymentVal = Number(m.payment) || 0;
                    const heightPct = (paymentVal / maxPayment) * 100;
                    const opacity = Math.max(0.2, m.probability / 100);
                    const isDev = m.category === "development";

                    return (
                      <div
                        key={m.id}
                        className="group relative flex flex-1 flex-col items-center justify-end"
                        style={{ height: "100%" }}
                      >
                        {/* Tooltip */}
                        <div className="pointer-events-none absolute -top-2 left-1/2 z-10 hidden -translate-x-1/2 rounded border border-border bg-background px-2 py-1 text-[10px] shadow-lg group-hover:block whitespace-nowrap">
                          <p className="font-semibold">{m.name}</p>
                          <p>
                            {formatCurrency(paymentVal)} | {m.probability}% prob | Year{" "}
                            {m.timelineYears}
                          </p>
                        </div>
                        {/* Bar */}
                        <div
                          className={`w-full max-w-[40px] rounded-t transition-all ${
                            isDev ? "bg-[#F97316]" : "bg-emerald-500"
                          }`}
                          style={{
                            height: `${Math.max(heightPct, 3)}%`,
                            opacity,
                          }}
                        />
                        {/* Label */}
                        <div className="mt-1 w-full text-center">
                          <p className="truncate text-[9px] text-muted-foreground leading-tight">
                            {m.name.length > 12 ? m.name.slice(0, 12) + "..." : m.name}
                          </p>
                          <p className="text-[9px] font-medium">
                            {formatCurrency(paymentVal)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#F97316]" /> Development Milestones
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Commercial Milestones
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="italic">Opacity = probability of achievement</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
              <BarChart3 className="mb-2 h-8 w-8 text-muted-foreground/50" />
              Add milestones with payment amounts to see the timeline
            </div>
          )}
        </CardContent>
      </Card>

      {/* Milestone Schedule Tables */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Development Milestones */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Development Milestones</CardTitle>
                <CardDescription>
                  Total: {formatCurrency(calculations.development.totalNominal)} nominal |{" "}
                  {formatCurrency(calculations.development.totalNPV)} rNPV
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addMilestone("development")}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Milestone</TableHead>
                  <TableHead className="w-[100px]">Payment ($M)</TableHead>
                  <TableHead className="w-[100px]">Prob. (%)</TableHead>
                  <TableHead className="w-[80px]">Year</TableHead>
                  <TableHead className="w-[100px] text-right">Weighted</TableHead>
                  <TableHead className="w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {milestones
                  .filter((m) => m.category === "development")
                  .map((m) => {
                    const payment = Number(m.payment) || 0;
                    const weighted = payment * (m.probability / 100);
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <Input
                            value={m.name}
                            onChange={(e) =>
                              updateMilestone(m.id, "name", e.target.value)
                            }
                            className="h-7 text-xs"
                            placeholder="Milestone name"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={m.payment}
                            onChange={(e) =>
                              updateMilestone(m.id, "payment", e.target.value)
                            }
                            className="h-7 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={m.probability}
                              onChange={(e) =>
                                updateMilestone(
                                  m.id,
                                  "probability",
                                  Math.max(0, Math.min(100, Number(e.target.value)))
                                )
                              }
                              className="h-7 text-xs w-14"
                              min="0"
                              max="100"
                            />
                            <div
                              className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden"
                              title={`${m.probability}%`}
                            >
                              <div
                                className="h-full rounded-full bg-[#F97316] transition-all"
                                style={{ width: `${m.probability}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={m.timelineYears}
                            onChange={(e) =>
                              updateMilestone(m.id, "timelineYears", e.target.value)
                            }
                            className="h-7 text-xs"
                            step="0.5"
                          />
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium">
                          {formatCurrency(weighted)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => removeMilestone(m.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Commercial Milestones */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Commercial Milestones</CardTitle>
                <CardDescription>
                  Total: {formatCurrency(calculations.commercial.totalNominal)} nominal |{" "}
                  {formatCurrency(calculations.commercial.totalNPV)} rNPV
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addMilestone("commercial")}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Milestone</TableHead>
                  <TableHead className="w-[100px]">Payment ($M)</TableHead>
                  <TableHead className="w-[100px]">Prob. (%)</TableHead>
                  <TableHead className="w-[80px]">Year</TableHead>
                  <TableHead className="w-[100px] text-right">Weighted</TableHead>
                  <TableHead className="w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {milestones
                  .filter((m) => m.category === "commercial")
                  .map((m) => {
                    const payment = Number(m.payment) || 0;
                    const weighted = payment * (m.probability / 100);
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <Input
                            value={m.name}
                            onChange={(e) =>
                              updateMilestone(m.id, "name", e.target.value)
                            }
                            className="h-7 text-xs"
                            placeholder="Milestone name"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={m.payment}
                            onChange={(e) =>
                              updateMilestone(m.id, "payment", e.target.value)
                            }
                            className="h-7 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={m.probability}
                              onChange={(e) =>
                                updateMilestone(
                                  m.id,
                                  "probability",
                                  Math.max(0, Math.min(100, Number(e.target.value)))
                                )
                              }
                              className="h-7 text-xs w-14"
                              min="0"
                              max="100"
                            />
                            <div
                              className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden"
                              title={`${m.probability}%`}
                            >
                              <div
                                className="h-full rounded-full bg-emerald-500 transition-all"
                                style={{ width: `${m.probability}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={m.timelineYears}
                            onChange={(e) =>
                              updateMilestone(m.id, "timelineYears", e.target.value)
                            }
                            className="h-7 text-xs"
                            step="0.5"
                          />
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium">
                          {formatCurrency(weighted)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => removeMilestone(m.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Benchmark Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Benchmark Comparison</CardTitle>
          <CardDescription>
            Your milestone schedule compared to {benchmarkComps.dealCount} precedent deals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Comparison bars */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Development Milestones
              </p>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Your Total</p>
                  <div className="h-8 rounded bg-[#F97316]/80 flex items-center px-2 text-xs font-semibold text-white"
                    style={{
                      width: `${Math.min(
                        100,
                        benchmarkComps.devMax > 0
                          ? (calculations.development.totalNominal / benchmarkComps.devMax) * 100
                          : 50
                      )}%`,
                      minWidth: "60px",
                    }}
                  >
                    {formatCurrency(calculations.development.totalNominal)}
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Benchmark Range</span>
                  <span>
                    {formatCurrency(benchmarkComps.devMin)}&ndash;
                    {formatCurrency(benchmarkComps.devMax)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Benchmark Median</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(benchmarkComps.devMedian)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Commercial Milestones
              </p>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Your Total</p>
                  <div className="h-8 rounded bg-emerald-500/80 flex items-center px-2 text-xs font-semibold text-white"
                    style={{
                      width: `${Math.min(
                        100,
                        benchmarkComps.comMax > 0
                          ? (calculations.commercial.totalNominal / benchmarkComps.comMax) * 100
                          : 50
                      )}%`,
                      minWidth: "60px",
                    }}
                  >
                    {formatCurrency(calculations.commercial.totalNominal)}
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Benchmark Range</span>
                  <span>
                    {formatCurrency(benchmarkComps.comMin)}&ndash;
                    {formatCurrency(benchmarkComps.comMax)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Benchmark Median</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(benchmarkComps.comMedian)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Comparable Deals */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Top Comparable Deals by Total Value
            </p>
            <div className="space-y-2">
              {benchmarkComps.topDeals.map((deal) => (
                <div
                  key={deal.id}
                  className="flex items-center justify-between rounded border border-border/50 bg-background/50 px-3 py-2 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{deal.title}</span>
                    <span className="ml-2 text-muted-foreground">
                      {deal.therapeuticArea} | {deal.developmentStage.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground shrink-0 ml-3">
                    <span>
                      Dev: {formatCurrency(deal.developmentMilestones)}
                    </span>
                    <span>
                      Com: {formatCurrency(deal.commercialMilestones)}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      Total: {formatCurrency(deal.totalDealValue)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
