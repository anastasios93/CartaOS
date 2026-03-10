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
  THERAPEUTIC_AREAS,
  MODALITIES,
  DEAL_STAGES,
  STAGE_LABELS,
  DEAL_TYPE_LABELS,
} from "@/lib/constants";
import { useDeals } from "@/hooks/use-data";
import {
  AlertTriangle,
  FileText,
  Download,
  Presentation,
  BookOpen,
  Target,
  DollarSign,
  Globe,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Building2,
  Beaker,
  MapPin,
  Shield,
  X,
  ArrowRight,
  Eye,
  Rocket,
} from "lucide-react";

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "\u2014";
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value.toFixed(0)}M`;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

interface AssetProfile {
  name: string;
  therapeuticArea: string;
  modality: string;
  stage: string;
  targetPartner: string;
}

interface FinancialTerms {
  upfrontPayment: string;
  developmentMilestones: string;
  commercialMilestones: string;
  royaltyLow: string;
  royaltyHigh: string;
}

interface TerritoryRights {
  territory: string;
  exclusivity: string;
  sublicensingRights: string;
}

const TERRITORY_OPTIONS = [
  "Worldwide",
  "Worldwide ex-China",
  "Worldwide ex-Greater China",
  "Worldwide ex-Japan",
  "North America",
  "North America, EU, Japan",
  "EU Only",
  "Greater China",
];

const DEAL_STRUCTURES = [
  {
    type: "OUT_LICENSE",
    label: "Out-License",
    desc: "Standard licensing deal",
    icon: FileText,
    color: "#F97316",
  },
  {
    type: "COLLABORATION",
    label: "Co-Development",
    desc: "Shared development costs",
    icon: Building2,
    color: "#10B981",
  },
  {
    type: "OPTION",
    label: "Option Deal",
    desc: "License upon milestone",
    icon: Target,
    color: "#8B5CF6",
  },
];

export default function TermBuilderPage() {
  const { deals } = useDeals();
  const [showPreview, setShowPreview] = useState(false);
  const [dealType, setDealType] = useState("OUT_LICENSE");
  const [generated, setGenerated] = useState(false);

  const [asset, setAsset] = useState<AssetProfile>({
    name: "XYZ-042",
    therapeuticArea: "Oncology",
    modality: "Antibody-Drug Conjugate (ADC)",
    stage: "PHASE_2",
    targetPartner: "Pfizer",
  });

  const [financial, setFinancial] = useState<FinancialTerms>({
    upfrontPayment: "200",
    developmentMilestones: "1200",
    commercialMilestones: "900",
    royaltyLow: "10",
    royaltyHigh: "18",
  });

  const [territory, setTerritory] = useState<TerritoryRights>({
    territory: "Worldwide",
    exclusivity: "exclusive",
    sublicensingRights: "with_consent",
  });

  const benchmarks = useMemo(() => {
    let filtered = deals;
    if (asset.therapeuticArea) {
      const taFiltered = filtered.filter(
        (d) => d.therapeuticArea === asset.therapeuticArea
      );
      if (taFiltered.length > 0) filtered = taFiltered;
    }
    if (asset.stage) {
      const stageFiltered = filtered.filter(
        (d) => d.developmentStage === asset.stage
      );
      if (stageFiltered.length > 0) filtered = stageFiltered;
    }
    const upfronts = filtered
      .filter((d) => d.upfrontPayment != null)
      .map((d) => d.upfrontPayment!);
    const devMilestones = filtered
      .filter((d) => d.developmentMilestones != null)
      .map((d) => d.developmentMilestones!);
    const comMilestones = filtered
      .filter((d) => d.commercialMilestones != null)
      .map((d) => d.commercialMilestones!);
    const totalValues = filtered
      .filter((d) => d.totalDealValue != null)
      .map((d) => d.totalDealValue!);
    const royaltyLows = filtered
      .filter((d) => d.royaltyRangeLow != null)
      .map((d) => d.royaltyRangeLow!);
    const royaltyHighs = filtered
      .filter((d) => d.royaltyRangeHigh != null)
      .map((d) => d.royaltyRangeHigh!);
    return {
      upfrontMedian: median(upfronts),
      upfrontMin: upfronts.length ? Math.min(...upfronts) : 0,
      upfrontMax: upfronts.length ? Math.max(...upfronts) : 0,
      devMilestoneMedian: median(devMilestones),
      comMilestoneMedian: median(comMilestones),
      totalMedian: median(totalValues),
      royaltyLowMedian: median(royaltyLows),
      royaltyHighMedian: median(royaltyHighs),
      royaltyMin: royaltyLows.length ? Math.min(...royaltyLows) : 0,
      royaltyMax: royaltyHighs.length ? Math.max(...royaltyHighs) : 0,
      dealCount: filtered.length,
    };
  }, [deals, asset.therapeuticArea, asset.stage]);

  const totalDealValue =
    (Number(financial.upfrontPayment) || 0) +
    (Number(financial.developmentMilestones) || 0) +
    (Number(financial.commercialMilestones) || 0);

  return (
    <div className="space-y-5">
      {/* Breadcrumb header */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Layer 2</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">Term Sheet Builder</span>
      </div>

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Term Sheet Builder
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Generate structured term sheets pre-populated with benchmarked
            ranges
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/term-builder/clauses">
              <BookOpen className="mr-1.5 h-3.5 w-3.5" /> Clause Library
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/term-builder/milestones">
              <TrendingUp className="mr-1.5 h-3.5 w-3.5" /> Milestones
            </Link>
          </Button>
        </div>
      </div>

      {/* Legal disclaimer - compact */}
      <div className="flex items-center gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
        <p className="text-xs text-amber-200/80">
          <span className="font-semibold text-amber-400">
            Not legal advice.
          </span>{" "}
          This tool assists drafting. All outputs must be reviewed by qualified
          counsel.
        </p>
      </div>

      {/* Main content */}
      <div className={`grid gap-5 ${showPreview ? "lg:grid-cols-3" : "lg:grid-cols-1"}`}>
        {/* Form section */}
        <div className={`space-y-5 ${showPreview ? "lg:col-span-2" : ""}`}>
          {/* Deal Structure selector */}
          <div className="grid grid-cols-3 gap-3">
            {DEAL_STRUCTURES.map((s) => {
              const Icon = s.icon;
              const isActive = dealType === s.type;
              return (
                <button
                  key={s.type}
                  onClick={() => setDealType(s.type)}
                  className={`group relative flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all duration-200 ${
                    isActive
                      ? "border-[color:var(--accent)] bg-[color:var(--accent)]/5 shadow-[0_0_20px_-4px_var(--accent)]"
                      : "border-border/50 bg-card/50 hover:border-border hover:bg-card"
                  }`}
                  style={
                    { "--accent": s.color } as React.CSSProperties
                  }
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      isActive ? "bg-[color:var(--accent)]/15" : "bg-muted/50"
                    }`}
                  >
                    <Icon
                      className="h-4 w-4"
                      style={{ color: isActive ? s.color : undefined }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        isActive ? "" : "text-foreground/80"
                      }`}
                      style={{ color: isActive ? s.color : undefined }}
                    >
                      {s.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {s.desc}
                    </p>
                  </div>
                  {isActive && (
                    <div
                      className="absolute -top-px left-4 right-4 h-[2px] rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Two-column form cards */}
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Asset Profile card */}
            <Card className="border-border/40 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-[15px]">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#F97316]/10">
                    <Beaker className="h-3.5 w-3.5 text-[#F97316]" />
                  </div>
                  Asset Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Asset Name
                  </Label>
                  <Input
                    value={asset.name}
                    onChange={(e) =>
                      setAsset((p) => ({ ...p, name: e.target.value }))
                    }
                    className="h-9 bg-background/50 border-border/50 focus:border-[#F97316]/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Area
                    </Label>
                    <Select
                      value={asset.therapeuticArea}
                      onValueChange={(v) =>
                        setAsset((p) => ({
                          ...p,
                          therapeuticArea: v ?? "",
                        }))
                      }
                    >
                      <SelectTrigger className="h-9 bg-background/50 border-border/50">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {THERAPEUTIC_AREAS.map((a) => (
                          <SelectItem key={a} value={a}>
                            {a}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Modality
                    </Label>
                    <Select
                      value={asset.modality}
                      onValueChange={(v) =>
                        setAsset((p) => ({ ...p, modality: v ?? "" }))
                      }
                    >
                      <SelectTrigger className="h-9 bg-background/50 border-border/50">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {MODALITIES.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Stage
                    </Label>
                    <Select
                      value={asset.stage}
                      onValueChange={(v) =>
                        setAsset((p) => ({ ...p, stage: v ?? "" }))
                      }
                    >
                      <SelectTrigger className="h-9 bg-background/50 border-border/50">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEAL_STAGES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {STAGE_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Target Partner
                    </Label>
                    <Input
                      value={asset.targetPartner}
                      onChange={(e) =>
                        setAsset((p) => ({
                          ...p,
                          targetPartner: e.target.value,
                        }))
                      }
                      className="h-9 bg-background/50 border-border/50"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Terms card */}
            <Card className="border-border/40 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-[15px]">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#10B981]/10">
                    <DollarSign className="h-3.5 w-3.5 text-[#10B981]" />
                  </div>
                  Financial Terms
                  {benchmarks.dealCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-auto text-[10px] font-normal"
                    >
                      {benchmarks.dealCount} comps
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upfront */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Upfront ($M)
                  </Label>
                  <Input
                    type="number"
                    value={financial.upfrontPayment}
                    onChange={(e) =>
                      setFinancial((p) => ({
                        ...p,
                        upfrontPayment: e.target.value,
                      }))
                    }
                    className="h-9 bg-background/50 border-border/50 font-mono"
                  />
                  <BenchmarkRange
                    value={Number(financial.upfrontPayment) || 0}
                    min={benchmarks.upfrontMin}
                    max={benchmarks.upfrontMax}
                    median={benchmarks.upfrontMedian}
                  />
                </div>

                {/* Milestones */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Dev Milestones ($M)
                    </Label>
                    <Input
                      type="number"
                      value={financial.developmentMilestones}
                      onChange={(e) =>
                        setFinancial((p) => ({
                          ...p,
                          developmentMilestones: e.target.value,
                        }))
                      }
                      className="h-9 bg-background/50 border-border/50 font-mono"
                    />
                    <BenchmarkRange
                      value={Number(financial.developmentMilestones) || 0}
                      min={0}
                      max={benchmarks.devMilestoneMedian * 2 || 2000}
                      median={benchmarks.devMilestoneMedian}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Comm Milestones ($M)
                    </Label>
                    <Input
                      type="number"
                      value={financial.commercialMilestones}
                      onChange={(e) =>
                        setFinancial((p) => ({
                          ...p,
                          commercialMilestones: e.target.value,
                        }))
                      }
                      className="h-9 bg-background/50 border-border/50 font-mono"
                    />
                    <BenchmarkRange
                      value={Number(financial.commercialMilestones) || 0}
                      min={0}
                      max={benchmarks.comMilestoneMedian * 2 || 1500}
                      median={benchmarks.comMilestoneMedian}
                    />
                  </div>
                </div>

                {/* Royalty */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Royalty Floor (%)
                    </Label>
                    <Input
                      type="number"
                      value={financial.royaltyLow}
                      onChange={(e) =>
                        setFinancial((p) => ({
                          ...p,
                          royaltyLow: e.target.value,
                        }))
                      }
                      className="h-9 bg-background/50 border-border/50 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Royalty Ceiling (%)
                    </Label>
                    <Input
                      type="number"
                      value={financial.royaltyHigh}
                      onChange={(e) =>
                        setFinancial((p) => ({
                          ...p,
                          royaltyHigh: e.target.value,
                        }))
                      }
                      className="h-9 bg-background/50 border-border/50 font-mono"
                    />
                  </div>
                </div>
                <RoyaltyRange
                  low={Number(financial.royaltyLow) || 0}
                  high={Number(financial.royaltyHigh) || 0}
                  benchLow={benchmarks.royaltyMin}
                  benchHigh={benchmarks.royaltyMax}
                  medianLow={benchmarks.royaltyLowMedian}
                  medianHigh={benchmarks.royaltyHighMedian}
                />
              </CardContent>
            </Card>
          </div>

          {/* Territory & Deal Summary row */}
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Territory card */}
            <Card className="border-border/40 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-[15px]">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#8B5CF6]/10">
                    <Globe className="h-3.5 w-3.5 text-[#8B5CF6]" />
                  </div>
                  Territory & Rights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Territory
                  </Label>
                  <Select
                    value={territory.territory}
                    onValueChange={(v) =>
                      setTerritory((p) => ({ ...p, territory: v ?? "" }))
                    }
                  >
                    <SelectTrigger className="h-9 bg-background/50 border-border/50">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {TERRITORY_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Exclusivity
                    </Label>
                    <Select
                      value={territory.exclusivity}
                      onValueChange={(v) =>
                        setTerritory((p) => ({
                          ...p,
                          exclusivity: v ?? "",
                        }))
                      }
                    >
                      <SelectTrigger className="h-9 bg-background/50 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="exclusive">Exclusive</SelectItem>
                        <SelectItem value="co-exclusive">
                          Co-Exclusive
                        </SelectItem>
                        <SelectItem value="non-exclusive">
                          Non-Exclusive
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Sublicensing
                    </Label>
                    <Select
                      value={territory.sublicensingRights}
                      onValueChange={(v) =>
                        setTerritory((p) => ({
                          ...p,
                          sublicensingRights: v ?? "",
                        }))
                      }
                    >
                      <SelectTrigger className="h-9 bg-background/50 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="with_consent">
                          With Consent
                        </SelectItem>
                        <SelectItem value="affiliates_free">
                          Free (Affiliates)
                        </SelectItem>
                        <SelectItem value="broad">Broad Rights</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deal summary card */}
            <Card className="border-border/40 bg-gradient-to-br from-[#F97316]/5 via-card/80 to-[#8B5CF6]/5 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-[15px]">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#F59E0B]/10">
                    <Sparkles className="h-3.5 w-3.5 text-[#F59E0B]" />
                  </div>
                  Deal Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <SummaryItem
                    label="Total Deal Value"
                    value={formatCurrency(totalDealValue || null)}
                    highlight
                  />
                  <SummaryItem
                    label="Upfront Payment"
                    value={formatCurrency(
                      Number(financial.upfrontPayment) || null
                    )}
                  />
                  <SummaryItem
                    label="Total Milestones"
                    value={formatCurrency(
                      (Number(financial.developmentMilestones) || 0) +
                        (Number(financial.commercialMilestones) || 0) || null
                    )}
                  />
                  <SummaryItem
                    label="Royalty Range"
                    value={
                      financial.royaltyLow && financial.royaltyHigh
                        ? `${financial.royaltyLow}% \u2013 ${financial.royaltyHigh}%`
                        : "\u2014"
                    }
                  />
                </div>

                {/* Benchmark comparison */}
                <div className="rounded-lg border border-[#F97316]/15 bg-[#F97316]/5 p-3 mt-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[#F97316]/70 mb-2">
                    vs. {benchmarks.dealCount} comparable deals
                  </p>
                  <div className="space-y-1.5">
                    <ComparisonRow
                      label="Upfront"
                      yours={Number(financial.upfrontPayment) || 0}
                      benchmark={benchmarks.upfrontMedian}
                    />
                    <ComparisonRow
                      label="Total Value"
                      yours={totalDealValue}
                      benchmark={benchmarks.totalMedian}
                    />
                    <ComparisonRow
                      label="Royalty Low"
                      yours={Number(financial.royaltyLow) || 0}
                      benchmark={benchmarks.royaltyLowMedian}
                      isPercent
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-between rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" />
                {showPreview ? "Hide" : "Show"} Preview
              </Button>
              <div className="h-5 w-px bg-border/50" />
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <Download className="h-3.5 w-3.5" /> DOCX
              </Button>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <Presentation className="h-3.5 w-3.5" /> PPTX
              </Button>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setGenerated(true);
                setShowPreview(true);
              }}
              className="gap-2 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#F97316]/90 hover:to-[#EA580C]/90 shadow-lg shadow-[#F97316]/20 px-6"
            >
              <Rocket className="h-3.5 w-3.5" />
              Generate Term Sheet
            </Button>
          </div>
        </div>

        {/* Preview panel */}
        {showPreview && (
          <div className="lg:col-span-1">
            <Card className="sticky top-6 border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-3 border-b border-border/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-[#F97316]" />
                    Term Sheet Preview
                  </CardTitle>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4 text-xs max-h-[calc(100vh-220px)] overflow-y-auto">
                {/* Preview header */}
                <div className="text-center pb-3 border-b border-border/30">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
                    Non-Binding Term Sheet
                  </p>
                  <p className="text-sm font-semibold mt-1">
                    {asset.name || "[Asset]"} \u2014{" "}
                    {DEAL_TYPE_LABELS[dealType] || "[Type]"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Confidential Draft
                  </p>
                </div>

                {/* Parties */}
                <PreviewSection title="Parties">
                  <PreviewRow label="Licensor" value="[Your Company]" />
                  <PreviewRow
                    label="Licensee"
                    value={asset.targetPartner || "\u2014"}
                  />
                </PreviewSection>

                {/* Asset */}
                <PreviewSection title="Licensed Asset">
                  <PreviewRow label="Asset" value={asset.name || "\u2014"} />
                  <PreviewRow
                    label="Therapeutic Area"
                    value={asset.therapeuticArea || "\u2014"}
                  />
                  <PreviewRow
                    label="Modality"
                    value={asset.modality || "\u2014"}
                  />
                  <PreviewRow
                    label="Stage"
                    value={STAGE_LABELS[asset.stage] || "\u2014"}
                  />
                </PreviewSection>

                {/* Financial */}
                <PreviewSection title="Financial Terms">
                  <PreviewRow
                    label="Upfront"
                    value={
                      financial.upfrontPayment
                        ? formatCurrency(Number(financial.upfrontPayment))
                        : "\u2014"
                    }
                    bold
                  />
                  <PreviewRow
                    label="Dev Milestones"
                    value={
                      financial.developmentMilestones
                        ? formatCurrency(
                            Number(financial.developmentMilestones)
                          )
                        : "\u2014"
                    }
                  />
                  <PreviewRow
                    label="Comm Milestones"
                    value={
                      financial.commercialMilestones
                        ? formatCurrency(
                            Number(financial.commercialMilestones)
                          )
                        : "\u2014"
                    }
                  />
                  <div className="border-t border-border/30 pt-1 mt-1">
                    <PreviewRow
                      label="Total Value"
                      value={formatCurrency(totalDealValue || null)}
                      bold
                    />
                  </div>
                  <PreviewRow
                    label="Royalties"
                    value={
                      financial.royaltyLow && financial.royaltyHigh
                        ? `${financial.royaltyLow}% \u2013 ${financial.royaltyHigh}%`
                        : "\u2014"
                    }
                  />
                </PreviewSection>

                {/* Territory */}
                <PreviewSection title="Territory & Rights">
                  <PreviewRow
                    label="Territory"
                    value={territory.territory || "\u2014"}
                  />
                  <PreviewRow
                    label="Exclusivity"
                    value={
                      territory.exclusivity === "exclusive"
                        ? "Exclusive"
                        : territory.exclusivity === "co-exclusive"
                        ? "Co-Exclusive"
                        : "Non-Exclusive"
                    }
                  />
                  <PreviewRow
                    label="Sublicensing"
                    value={
                      territory.sublicensingRights === "with_consent"
                        ? "With Consent"
                        : territory.sublicensingRights === "broad"
                        ? "Broad Rights"
                        : territory.sublicensingRights === "none"
                        ? "None"
                        : "Free (Affiliates)"
                    }
                  />
                </PreviewSection>

                {/* Export */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-[11px] h-8"
                  >
                    <Download className="mr-1 h-3 w-3" /> DOCX
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-[11px] h-8"
                  >
                    <Presentation className="mr-1 h-3 w-3" /> PPTX
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────────────── */

function BenchmarkRange({
  value,
  min,
  max,
  median: med,
}: {
  value: number;
  min: number;
  max: number;
  median: number;
}) {
  const range = max - min || 1;
  const valuePos = Math.max(0, Math.min(100, ((value - min) / range) * 100));
  const medianPos = Math.max(0, Math.min(100, ((med - min) / range) * 100));

  return (
    <div className="pt-1">
      <div className="relative h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
        {/* filled range up to value */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#F97316]/40 to-[#F97316]/70"
          style={{ width: `${valuePos}%` }}
        />
        {/* median marker */}
        <div
          className="absolute top-0 h-full w-px bg-[#F59E0B]/70"
          style={{ left: `${medianPos}%` }}
        />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[9px] text-muted-foreground/60">
          {formatCurrency(min)}
        </span>
        <span className="text-[9px] text-[#F59E0B]/60">
          median {formatCurrency(med)}
        </span>
        <span className="text-[9px] text-muted-foreground/60">
          {formatCurrency(max)}
        </span>
      </div>
    </div>
  );
}

function RoyaltyRange({
  low,
  high,
  benchLow,
  benchHigh,
  medianLow,
  medianHigh,
}: {
  low: number;
  high: number;
  benchLow: number;
  benchHigh: number;
  medianLow: number;
  medianHigh: number;
}) {
  const absMax = Math.max(benchHigh, high, 30);
  const leftPos = (low / absMax) * 100;
  const rightPos = (high / absMax) * 100;
  const benchLeftPos = (benchLow / absMax) * 100;
  const benchRightPos = (benchHigh / absMax) * 100;

  return (
    <div className="pt-1">
      <div className="relative h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
        {/* benchmark range */}
        <div
          className="absolute inset-y-0 rounded-full bg-[#F59E0B]/15"
          style={{
            left: `${benchLeftPos}%`,
            width: `${benchRightPos - benchLeftPos}%`,
          }}
        />
        {/* your range */}
        <div
          className="absolute inset-y-0 rounded-full bg-gradient-to-r from-[#F97316]/60 to-[#F97316]/80"
          style={{
            left: `${leftPos}%`,
            width: `${Math.max(0, rightPos - leftPos)}%`,
          }}
        />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[9px] text-muted-foreground/60">0%</span>
        <span className="text-[9px] text-[#F59E0B]/60">
          bench {medianLow}%\u2013{medianHigh}%
        </span>
        <span className="text-[9px] text-muted-foreground/60">{absMax}%</span>
      </div>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        highlight
          ? "border-[#F97316]/20 bg-[#F97316]/5"
          : "border-border/30 bg-background/30"
      }`}
    >
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p
        className={`text-lg font-bold font-mono mt-0.5 ${
          highlight ? "text-[#F97316]" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ComparisonRow({
  label,
  yours,
  benchmark,
  isPercent,
}: {
  label: string;
  yours: number;
  benchmark: number;
  isPercent?: boolean;
}) {
  const diff = benchmark > 0 ? ((yours - benchmark) / benchmark) * 100 : 0;
  const isAbove = diff > 5;
  const isBelow = diff < -5;
  const fmt = isPercent
    ? (v: number) => `${v}%`
    : (v: number) => formatCurrency(v);

  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono font-medium">{fmt(yours)}</span>
        <span className="text-muted-foreground/50">vs</span>
        <span className="font-mono text-muted-foreground">{fmt(benchmark)}</span>
        {(isAbove || isBelow) && (
          <span
            className={`text-[10px] font-medium ${
              isAbove ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {diff > 0 ? "+" : ""}
            {diff.toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}

function PreviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-[#F97316] uppercase tracking-[0.15em] mb-1.5">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function PreviewRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-semibold" : "font-medium"}>{value}</span>
    </div>
  );
}
