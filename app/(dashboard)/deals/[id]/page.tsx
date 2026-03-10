"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDeals, useClauses } from "@/hooks/use-data";
import {
  DEAL_TYPE_LABELS,
  STAGE_LABELS,
  CLAUSE_TYPE_LABELS,
} from "@/lib/constants";
import {
  ArrowLeft,
  Shield,
  Globe,
  Lock,
  Unlock,
  Users,
  Megaphone,
  GitBranch,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Target,
  Milestone,
} from "lucide-react";

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "\u2014";
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value.toFixed(0)}M`;
}

function formatPct(value: number | null | undefined) {
  if (value == null) return "\u2014";
  return `${value}%`;
}

export default function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { deals } = useDeals();
  const { clauses } = useClauses();

  const deal = useMemo(
    () => deals.find((d) => d.id === id),
    [deals, id]
  );

  const dealClauses = useMemo(
    () =>
      deal
        ? clauses.filter((c) => c.dealTitle === deal.title)
        : [],
    [deal, clauses]
  );

  // Get some clauses even if none match directly, for demo purposes
  const displayClauses = useMemo(() => {
    if (dealClauses.length > 0) return dealClauses;
    // Show first 2 clauses as examples
    return clauses.slice(0, 2);
  }, [dealClauses, clauses]);

  if (!deal) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FileText className="h-12 w-12 text-muted-foreground/30" />
        <p className="mt-4 text-sm text-muted-foreground">Deal not found</p>
        <Button size="sm" className="mt-3" variant="outline" asChild>
          <Link href="/deals">Back to deals</Link>
        </Button>
      </div>
    );
  }

  const confidencePct = Math.round(deal.confidence * 100);
  const confidenceColor =
    confidencePct >= 90
      ? "text-[#10B981]"
      : confidencePct >= 80
      ? "text-[#F59E0B]"
      : "text-[#EF4444]";

  const statusColor =
    deal.status === "CLOSED"
      ? "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30"
      : deal.status === "ANNOUNCED"
      ? "bg-[#F97316]/15 text-[#F97316] border-[#F97316]/30"
      : "bg-muted text-muted-foreground";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild className="mt-1 shrink-0">
          <Link href="/deals">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            {deal.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {DEAL_TYPE_LABELS[deal.dealType] ?? deal.dealType}
            </Badge>
            <Badge variant="secondary">
              {STAGE_LABELS[deal.developmentStage] ?? deal.developmentStage}
            </Badge>
            <Badge className={`border ${statusColor}`}>{deal.status}</Badge>
            <Separator orientation="vertical" className="h-4 mx-1" />
            <div className="flex items-center gap-1.5">
              {deal.verified ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-[#F59E0B]" />
              )}
              <span className="text-xs text-muted-foreground">
                {deal.verified ? "Verified" : "Unverified"}
              </span>
            </div>
            <Separator orientation="vertical" className="h-4 mx-1" />
            <div className="flex items-center gap-1.5">
              <Shield className={`h-3.5 w-3.5 ${confidenceColor}`} />
              <span className={`text-xs font-mono font-medium ${confidenceColor}`}>
                {confidencePct}% confidence
              </span>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <Link href="/benchmarks">
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
            Compare with Similar Deals
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial Terms</TabsTrigger>
          <TabsTrigger value="clauses">
            Clauses
            <Badge variant="secondary" className="ml-1.5 h-4 min-w-4 px-1 text-[10px]">
              {displayClauses.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Parties */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Parties
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Licensor
                  </p>
                  <p className="text-base font-semibold">{deal.licensorName}</p>
                  <p className="text-xs text-muted-foreground">
                    Asset originator
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Licensee
                  </p>
                  <p className="text-base font-semibold">{deal.licenseeName}</p>
                  <p className="text-xs text-muted-foreground">
                    Development / commercialization partner
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Asset & Indication */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                Asset & Indication
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-5 sm:grid-cols-3">
                <InfoField label="Asset Name" value={deal.assetName} />
                <InfoField
                  label="Therapeutic Area"
                  value={deal.therapeuticArea}
                />
                <InfoField label="Modality" value={deal.modality} />
                <InfoField label="Indication" value={deal.indication} />
                <InfoField
                  label="Development Stage"
                  value={
                    STAGE_LABELS[deal.developmentStage] ??
                    deal.developmentStage
                  }
                />
                <InfoField label="Source Type" value={deal.sourceType.replace(/_/g, " ")} />
              </div>
            </CardContent>
          </Card>

          {/* Territory & Rights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Territory & Rights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-5 sm:grid-cols-3">
                <InfoField label="Territory" value={deal.territoryScope} />
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Exclusivity
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    {deal.exclusivity ? (
                      <Lock className="h-3.5 w-3.5 text-[#10B981]" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5 text-[#F59E0B]" />
                    )}
                    <span className="text-sm font-medium">
                      {deal.exclusivity ? "Exclusive" : "Non-exclusive"}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Co-Development
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    {deal.coDevRights ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className="text-sm">
                      {deal.coDevRights ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Co-Promote
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    {deal.coPromoteRights ? (
                      <Megaphone className="h-3.5 w-3.5 text-[#10B981]" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className="text-sm">
                      {deal.coPromoteRights ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
                {deal.optionStructure && (
                  <div className="sm:col-span-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Option Structure
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <GitBranch className="h-3.5 w-3.5 text-[#8B5CF6]" />
                      <span className="text-sm">{deal.optionStructure}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Announced & Source */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Announced</p>
                  <p className="text-sm font-medium">
                    {new Date(deal.announcedDate).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground text-right">
                    Source
                  </p>
                  <p className="text-sm font-medium text-right">
                    {deal.sourceType.replace(/_/g, " ")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FINANCIAL TERMS TAB */}
        <TabsContent value="financial" className="mt-4 space-y-4">
          {/* Big number cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FinancialCard
              label="Upfront Payment"
              value={formatCurrency(deal.upfrontPayment)}
              icon={<DollarSign className="h-5 w-5" />}
              color="#F97316"
            />
            <FinancialCard
              label="Total Deal Value"
              value={formatCurrency(deal.totalDealValue)}
              icon={<DollarSign className="h-5 w-5" />}
              color="#10B981"
              highlight
            />
            <FinancialCard
              label="Royalty Range"
              value={
                deal.royaltyRangeLow != null && deal.royaltyRangeHigh != null
                  ? `${deal.royaltyRangeLow}% \u2013 ${deal.royaltyRangeHigh}%`
                  : "\u2014"
              }
              icon={<Target className="h-5 w-5" />}
              color="#8B5CF6"
            />
          </div>

          {/* Milestones */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Milestone className="h-4 w-4 text-muted-foreground" />
                Milestone Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Development Milestones
                    </p>
                    <p className="text-2xl font-bold font-mono text-[#F97316] mt-1">
                      {formatCurrency(deal.developmentMilestones)}
                    </p>
                  </div>
                  {deal.developmentMilestones != null &&
                    deal.totalDealValue != null && (
                      <div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>Share of total deal</span>
                          <span>
                            {Math.round(
                              (deal.developmentMilestones /
                                deal.totalDealValue) *
                                100
                            )}
                            %
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted">
                          <div
                            className="h-1.5 rounded-full bg-[#F97316]"
                            style={{
                              width: `${Math.round(
                                (deal.developmentMilestones /
                                  deal.totalDealValue) *
                                  100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Commercial Milestones
                    </p>
                    <p className="text-2xl font-bold font-mono text-[#10B981] mt-1">
                      {formatCurrency(deal.commercialMilestones)}
                    </p>
                  </div>
                  {deal.commercialMilestones != null &&
                    deal.totalDealValue != null && (
                      <div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>Share of total deal</span>
                          <span>
                            {Math.round(
                              (deal.commercialMilestones /
                                deal.totalDealValue) *
                                100
                            )}
                            %
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted">
                          <div
                            className="h-1.5 rounded-full bg-[#10B981]"
                            style={{
                              width: `${Math.round(
                                (deal.commercialMilestones /
                                  deal.totalDealValue) *
                                  100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deal structure breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Deal Value Breakdown
              </CardTitle>
              <CardDescription>
                Allocation of total deal value across payment types
              </CardDescription>
            </CardHeader>
            <CardContent>
              {deal.totalDealValue != null ? (
                <div className="space-y-4">
                  {/* Visual bar */}
                  <div className="flex h-6 w-full overflow-hidden rounded-lg">
                    {deal.upfrontPayment != null && deal.upfrontPayment > 0 && (
                      <div
                        className="bg-[#F97316] flex items-center justify-center text-[10px] font-bold text-white"
                        style={{
                          width: `${(deal.upfrontPayment / deal.totalDealValue) * 100}%`,
                        }}
                      >
                        {Math.round(
                          (deal.upfrontPayment / deal.totalDealValue) * 100
                        )}
                        %
                      </div>
                    )}
                    {deal.developmentMilestones != null &&
                      deal.developmentMilestones > 0 && (
                        <div
                          className="bg-[#8B5CF6] flex items-center justify-center text-[10px] font-bold text-white"
                          style={{
                            width: `${(deal.developmentMilestones / deal.totalDealValue) * 100}%`,
                          }}
                        >
                          {Math.round(
                            (deal.developmentMilestones /
                              deal.totalDealValue) *
                              100
                          )}
                          %
                        </div>
                      )}
                    {deal.commercialMilestones != null &&
                      deal.commercialMilestones > 0 && (
                        <div
                          className="bg-[#10B981] flex items-center justify-center text-[10px] font-bold text-white"
                          style={{
                            width: `${(deal.commercialMilestones / deal.totalDealValue) * 100}%`,
                          }}
                        >
                          {Math.round(
                            (deal.commercialMilestones /
                              deal.totalDealValue) *
                              100
                          )}
                          %
                        </div>
                      )}
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-sm bg-[#F97316]" />
                      <span className="text-muted-foreground">
                        Upfront ({formatCurrency(deal.upfrontPayment)})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-sm bg-[#8B5CF6]" />
                      <span className="text-muted-foreground">
                        Dev. Milestones (
                        {formatCurrency(deal.developmentMilestones)})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-sm bg-[#10B981]" />
                      <span className="text-muted-foreground">
                        Comm. Milestones (
                        {formatCurrency(deal.commercialMilestones)})
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No financial breakdown available
                </p>
              )}
            </CardContent>
          </Card>

          {/* Rights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Additional Rights & Structure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Co-Development
                    </p>
                    <p className="text-sm font-medium">
                      {deal.coDevRights ? "Included" : "Not included"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                  <Megaphone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Co-Promote</p>
                    <p className="text-sm font-medium">
                      {deal.coPromoteRights ? "Included" : "Not included"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                  <GitBranch className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Option Structure
                    </p>
                    <p className="text-sm font-medium">
                      {deal.optionStructure ?? "None"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CLAUSES TAB */}
        <TabsContent value="clauses" className="mt-4 space-y-4">
          {displayClauses.length > 0 ? (
            displayClauses.map((clause) => (
              <Card key={clause.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {clause.title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {CLAUSE_TYPE_LABELS[clause.clauseType] ??
                          clause.clauseType}
                      </Badge>
                      <Badge
                        className={`text-xs border ${
                          clause.favorability === "LICENSOR_FAVORABLE"
                            ? "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30"
                            : clause.favorability === "LICENSEE_FAVORABLE"
                            ? "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30"
                            : "bg-[#F97316]/15 text-[#F97316] border-[#F97316]/30"
                        }`}
                      >
                        {clause.favorability.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Summary */}
                  <div className="rounded-lg bg-muted/50 border border-border/50 p-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      Summary
                    </p>
                    <p className="text-sm">{clause.summary}</p>
                  </div>

                  {/* Full clause text */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                      Clause Language
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed italic">
                      &ldquo;{clause.clauseText}&rdquo;
                    </p>
                  </div>

                  <Separator />

                  {/* Negotiation notes */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                      Negotiation Notes
                    </p>
                    <p className="text-sm">{clause.negotiationNotes}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No clauses extracted for this deal
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className="text-sm font-medium mt-1">{value || "\u2014"}</p>
    </div>
  );
}

function FinancialCard({
  label,
  value,
  icon,
  color,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  highlight?: boolean;
}) {
  return (
    <Card
      className={`relative overflow-hidden ${
        highlight ? "ring-1 ring-[" + color + "]/30" : ""
      }`}
    >
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p
              className="text-3xl font-bold font-mono mt-2"
              style={{ color }}
            >
              {value}
            </p>
          </div>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}15`, color }}
          >
            {icon}
          </div>
        </div>
      </CardContent>
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{ backgroundColor: color, opacity: 0.4 }}
      />
    </Card>
  );
}
