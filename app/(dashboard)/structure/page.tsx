"use client";

import { useState, useMemo } from "react";
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
import { Separator } from "@/components/ui/separator";
import {
  THERAPEUTIC_AREAS,
  MODALITIES,
  DEAL_STAGES,
  DEAL_TYPES,
  STAGE_LABELS,
  DEAL_TYPE_LABELS,
} from "@/lib/constants";
import { useDeals } from "@/hooks/use-data";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Lightbulb,
  TrendingUp,
  DollarSign,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "\u2014";
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value.toFixed(0)}M`;
}

interface StructureOption {
  type: string;
  label: string;
  description: string;
  pros: string[];
  cons: string[];
  color: string;
  upfrontPct: number; // percentage of total value as upfront
  riskLevel: string;
}

const STRUCTURE_OPTIONS: StructureOption[] = [
  {
    type: "OUT_LICENSE",
    label: "Out-License",
    description:
      "License rights to a partner who develops and commercializes the asset. Licensor retains IP ownership and receives milestones and royalties.",
    pros: [
      "Retains IP ownership",
      "Lower operational burden",
      "Ongoing royalty stream",
      "Partner bears commercialization risk",
    ],
    cons: [
      "Less control over development",
      "Lower total economics if asset succeeds",
      "Dependent on partner diligence",
      "Risk of shelving",
    ],
    color: "#F97316",
    upfrontPct: 15,
    riskLevel: "Low",
  },
  {
    type: "COLLABORATION",
    label: "Co-Development",
    description:
      "Shared development with a partner, splitting costs, risks, and profits. Both parties contribute resources and capabilities.",
    pros: [
      "Shared risk and cost",
      "Access to partner capabilities",
      "Higher profit share",
      "Better alignment of interests",
    ],
    cons: [
      "Complex governance",
      "Shared decision-making",
      "Higher operational investment",
      "Potential partner conflicts",
    ],
    color: "#10B981",
    upfrontPct: 25,
    riskLevel: "Medium",
  },
  {
    type: "OPTION",
    label: "Option Agreement",
    description:
      "Partner pays for the right to license the asset after a data readout. Delays commitment until de-risking event occurs.",
    pros: [
      "Defers major commitment",
      "Premium pricing post-data",
      "Retains flexibility",
      "Partner funds early development",
    ],
    cons: [
      "Lower upfront payment",
      "Uncertainty of opt-in",
      "Partner may walk away",
      "Complex contract structure",
    ],
    color: "#F59E0B",
    upfrontPct: 8,
    riskLevel: "Medium-High",
  },
];

export default function StructurePage() {
  const { deals } = useDeals();
  const [therapeuticArea, setTherapeuticArea] = useState<string>("all");
  const [modality, setModality] = useState<string>("all");
  const [stage, setStage] = useState<string>("all");
  const [dealTypePref, setDealTypePref] = useState<string>("all");

  const hasSelections =
    therapeuticArea !== "all" ||
    modality !== "all" ||
    stage !== "all" ||
    dealTypePref !== "all";

  // Filter comparable deals
  const comparableDeals = useMemo(() => {
    let filtered = [...deals];

    if (therapeuticArea !== "all") {
      filtered = filtered.filter((d) => d.therapeuticArea === therapeuticArea);
    }
    if (modality !== "all") {
      filtered = filtered.filter((d) => d.modality === modality);
    }
    if (stage !== "all") {
      filtered = filtered.filter((d) => d.developmentStage === stage);
    }
    if (dealTypePref !== "all") {
      filtered = filtered.filter((d) => d.dealType === dealTypePref);
    }

    return filtered;
  }, [deals, therapeuticArea, modality, stage, dealTypePref]);

  // Calculate recommended economics
  const economics = useMemo(() => {
    if (comparableDeals.length === 0) return null;

    const upfronts = comparableDeals
      .filter((d) => d.upfrontPayment != null)
      .map((d) => d.upfrontPayment!)
      .sort((a, b) => a - b);
    const totals = comparableDeals
      .filter((d) => d.totalDealValue != null)
      .map((d) => d.totalDealValue!)
      .sort((a, b) => a - b);
    const devMilestones = comparableDeals
      .filter((d) => d.developmentMilestones != null)
      .map((d) => d.developmentMilestones!)
      .sort((a, b) => a - b);
    const royaltyLows = comparableDeals
      .filter((d) => d.royaltyRangeLow != null)
      .map((d) => d.royaltyRangeLow!)
      .sort((a, b) => a - b);
    const royaltyHighs = comparableDeals
      .filter((d) => d.royaltyRangeHigh != null)
      .map((d) => d.royaltyRangeHigh!)
      .sort((a, b) => a - b);

    const median = (arr: number[]) =>
      arr.length > 0 ? arr[Math.floor(arr.length / 2)] : null;
    const min = (arr: number[]) => (arr.length > 0 ? arr[0] : null);
    const max = (arr: number[]) =>
      arr.length > 0 ? arr[arr.length - 1] : null;

    return {
      upfront: {
        min: min(upfronts),
        median: median(upfronts),
        max: max(upfronts),
      },
      total: {
        min: min(totals),
        median: median(totals),
        max: max(totals),
      },
      milestones: {
        min: min(devMilestones),
        median: median(devMilestones),
        max: max(devMilestones),
      },
      royalty: {
        low: median(royaltyLows),
        high: median(royaltyHighs),
        minLow: min(royaltyLows),
        maxHigh: max(royaltyHighs),
      },
    };
  }, [comparableDeals]);

  // Chart data for structure comparison
  const chartData = useMemo(() => {
    if (!economics || economics.upfront.median == null) return [];
    const medianTotal = economics.total.median ?? 1000;
    return STRUCTURE_OPTIONS.map((opt) => ({
      name: opt.label,
      Upfront: Math.round(medianTotal * (opt.upfrontPct / 100)),
      Milestones: Math.round(
        medianTotal * ((100 - opt.upfrontPct - 20) / 100)
      ),
      Royalties: Math.round(medianTotal * 0.2),
    }));
  }, [economics]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Structure Recommendations
        </h1>
        <p className="text-sm text-muted-foreground">
          Model optimal deal structures based on comparable precedents
        </p>
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-sky-400" />
            Configure Parameters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Therapeutic Area
              </label>
              <Select
                value={therapeuticArea}
                onValueChange={(v) => setTherapeuticArea(v ?? "all")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Areas</SelectItem>
                  {THERAPEUTIC_AREAS.map((ta) => (
                    <SelectItem key={ta} value={ta}>
                      {ta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Modality
              </label>
              <Select
                value={modality}
                onValueChange={(v) => setModality(v ?? "all")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select modality" />
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
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Development Stage
              </label>
              <Select
                value={stage}
                onValueChange={(v) => setStage(v ?? "all")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select stage" />
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
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Deal Type Preference
              </label>
              <Select
                value={dealTypePref}
                onValueChange={(v) => setDealTypePref(v ?? "all")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {DEAL_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {DEAL_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasSelections && (
            <p className="mt-3 text-xs text-muted-foreground">
              {comparableDeals.length} comparable deal
              {comparableDeals.length !== 1 ? "s" : ""} found
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recommended Economics */}
      {economics && comparableDeals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              Recommended Economics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <EconomicsRange
                label="Upfront Payment"
                min={economics.upfront.min}
                median={economics.upfront.median}
                max={economics.upfront.max}
              />
              <EconomicsRange
                label="Total Deal Value"
                min={economics.total.min}
                median={economics.total.median}
                max={economics.total.max}
              />
              <EconomicsRange
                label="Dev. Milestones"
                min={economics.milestones.min}
                median={economics.milestones.median}
                max={economics.milestones.max}
              />
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Royalty Range
                </p>
                {economics.royalty.low != null &&
                economics.royalty.high != null ? (
                  <>
                    <p className="text-lg font-semibold text-sky-400">
                      {economics.royalty.low}% &ndash;{" "}
                      {economics.royalty.high}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Range: {economics.royalty.minLow ?? "?"}% &ndash;{" "}
                      {economics.royalty.maxHigh ?? "?"}%
                    </p>
                  </>
                ) : (
                  <p className="text-lg font-semibold">{"\u2014"}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Structure Options */}
      <div>
        <h2 className="mb-4 text-lg font-semibold tracking-tight flex items-center gap-2">
          <Scale className="h-5 w-5 text-sky-400" />
          Structure Options
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {STRUCTURE_OPTIONS.map((opt) => (
            <Card
              key={opt.type}
              className="relative overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 h-1 w-full"
                style={{ backgroundColor: opt.color }}
              />
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{opt.label}</span>
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{
                      borderColor: opt.color,
                      color: opt.color,
                    }}
                  >
                    {opt.riskLevel} Risk
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {opt.description}
                </p>
                <Separator />
                <div>
                  <p className="text-xs font-medium text-emerald-400 mb-2 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Advantages
                  </p>
                  <ul className="space-y-1">
                    {opt.pros.map((pro) => (
                      <li
                        key={pro}
                        className="text-xs text-muted-foreground flex items-start gap-1.5"
                      >
                        <span className="text-emerald-500 mt-0.5 shrink-0">
                          +
                        </span>
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium text-amber-400 mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Considerations
                  </p>
                  <ul className="space-y-1">
                    {opt.cons.map((con) => (
                      <li
                        key={con}
                        className="text-xs text-muted-foreground flex items-start gap-1.5"
                      >
                        <span className="text-amber-500 mt-0.5 shrink-0">
                          -
                        </span>
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
                {economics && economics.total.median != null && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Est. Upfront
                        </p>
                        <p className="text-sm font-semibold">
                          {formatCurrency(
                            Math.round(
                              economics.total.median * (opt.upfrontPct / 100)
                            )
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Upfront %
                        </p>
                        <p className="text-sm font-semibold">
                          {opt.upfrontPct}% of TDV
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Visual Comparison Chart */}
      {chartData.length > 0 && economics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-sky-400" />
              Structure Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    axisLine={{ stroke: "#E5E7EB" }}
                  />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    axisLine={{ stroke: "#E5E7EB" }}
                    tickFormatter={(v) =>
                      v >= 1000 ? `$${(v / 1000).toFixed(1)}B` : `$${v}M`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #E5E7EB",
                      borderRadius: 8,
                      color: "#e2e8f0",
                    }}
                    formatter={(value) => [
                      formatCurrency(value as number),
                      undefined,
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ color: "#94a3b8", fontSize: 12 }}
                  />
                  <Bar
                    dataKey="Upfront"
                    fill="#F97316"
                    radius={[4, 4, 0, 0]}
                    stackId="a"
                  />
                  <Bar
                    dataKey="Milestones"
                    fill="#10B981"
                    radius={[0, 0, 0, 0]}
                    stackId="a"
                  />
                  <Bar
                    dataKey="Royalties"
                    fill="#F59E0B"
                    radius={[4, 4, 0, 0]}
                    stackId="a"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-muted-foreground text-center">
              Estimated value distribution across structure types (based on{" "}
              {formatCurrency(economics.total.median)} median TDV from{" "}
              {comparableDeals.length} comparable deals)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Comparable Deals */}
      {comparableDeals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-amber-400" />
              Comparable Deals ({comparableDeals.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Modality</TableHead>
                  <TableHead className="text-right">Upfront</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead>Royalty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparableDeals.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell>
                      <Link
                        href={`/deals/${deal.id}`}
                        className="font-medium hover:underline"
                      >
                        {deal.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {deal.licensorName} / {deal.licenseeName}
                      </p>
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
                    <TableCell className="text-sm">{deal.modality}</TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatCurrency(deal.upfrontPayment)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatCurrency(deal.totalDealValue)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {deal.royaltyRangeLow != null
                        ? `${deal.royaltyRangeLow}%\u2013${deal.royaltyRangeHigh}%`
                        : "\u2014"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!hasSelections && (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <Sparkles className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              Select parameters above to generate structure recommendations
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The engine will analyze comparable deals and suggest optimal
              structures
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EconomicsRange({
  label,
  min,
  median,
  max,
}: {
  label: string;
  min: number | null;
  median: number | null;
  max: number | null;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {median != null ? (
        <>
          <p className="text-lg font-semibold text-sky-400">
            {formatCurrency(median)}
          </p>
          <p className="text-xs text-muted-foreground">
            Range: {formatCurrency(min)} &ndash; {formatCurrency(max)}
          </p>
        </>
      ) : (
        <p className="text-lg font-semibold">{"\u2014"}</p>
      )}
    </div>
  );
}
