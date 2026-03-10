"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PARTNER_STATUS_LABELS,
  DEAL_TYPE_LABELS,
  STAGE_LABELS,
} from "@/lib/constants";
import { useCompanies, useDeals } from "@/hooks/use-data";
import {
  ArrowLeft,
  Building2,
  Globe,
  MapPin,
  Mail,
  User,
  Briefcase,
  TrendingUp,
  Calendar,
  Handshake,
} from "lucide-react";

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "\u2014";
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value.toFixed(0)}M`;
}

function formatMarketCap(value: number | null) {
  if (value == null) return "\u2014";
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}B`;
  return `$${value}M`;
}

function getStatusColor(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "IN_DISCUSSION":
      return "bg-sky-500/15 text-sky-400 border-sky-500/30";
    case "CONTACTED":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "IDENTIFIED":
      return "bg-violet-500/15 text-violet-400 border-violet-500/30";
    case "DECLINED":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    default:
      return "bg-slate-500/15 text-slate-400 border-slate-500/30";
  }
}

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color =
    score >= 90
      ? "#10B981"
      : score >= 80
        ? "#F97316"
        : score >= 70
          ? "#F59E0B"
          : "#EF4444";

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-muted/30"
          strokeWidth="10"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ marginTop: 36 }}>
        <span className="text-3xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

export default function PartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { companies } = useCompanies();
  const { deals } = useDeals();
  const company = companies.find((c) => c.id === id);

  const companyDeals = useMemo(() => {
    if (!company) return [];
    return deals.filter(
      (d) =>
        d.licenseeName.toLowerCase() === company.name.toLowerCase() ||
        d.licenseeName.toLowerCase().includes(company.name.toLowerCase().split(" ")[0])
    );
  }, [company, deals]);

  if (!company) {
    return (
      <div className="flex flex-col items-center py-16">
        <Building2 className="h-10 w-10 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">Partner not found</p>
        <Button size="sm" className="mt-3" asChild>
          <Link href="/partners">Back to Partners</Link>
        </Button>
      </div>
    );
  }

  // Deal behavior stats
  const avgUpfront =
    companyDeals.length > 0
      ? companyDeals
          .filter((d) => d.upfrontPayment != null)
          .reduce((sum, d) => sum + (d.upfrontPayment ?? 0), 0) /
        Math.max(
          companyDeals.filter((d) => d.upfrontPayment != null).length,
          1
        )
      : null;

  const avgTotalValue =
    companyDeals.length > 0
      ? companyDeals
          .filter((d) => d.totalDealValue != null)
          .reduce((sum, d) => sum + (d.totalDealValue ?? 0), 0) /
        Math.max(
          companyDeals.filter((d) => d.totalDealValue != null).length,
          1
        )
      : null;

  const royaltyDeals = companyDeals.filter(
    (d) => d.royaltyRangeLow != null && d.royaltyRangeHigh != null
  );
  const avgRoyaltyLow =
    royaltyDeals.length > 0
      ? royaltyDeals.reduce((s, d) => s + (d.royaltyRangeLow ?? 0), 0) /
        royaltyDeals.length
      : null;
  const avgRoyaltyHigh =
    royaltyDeals.length > 0
      ? royaltyDeals.reduce((s, d) => s + (d.royaltyRangeHigh ?? 0), 0) /
        royaltyDeals.length
      : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/partners">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {company.name}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {company.type}
            </Badge>
            <Badge
              variant="outline"
              className={`text-xs ${getStatusColor(company.partnerStatus)}`}
            >
              {PARTNER_STATUS_LABELS[company.partnerStatus] ??
                company.partnerStatus}
            </Badge>
          </div>
        </div>
        <Button asChild>
          <Link href="/negotiations">
            <Handshake className="mr-2 h-4 w-4" />
            Start Negotiation
          </Link>
        </Button>
      </div>

      {/* Company Header Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Headquarters</p>
              <p className="text-sm font-medium">{company.headquarters}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Market Cap</p>
              <p className="text-sm font-medium">
                {formatMarketCap(company.marketCap)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Website</p>
              <p className="text-sm font-medium">{company.website}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Last Deal</p>
              <p className="text-sm font-medium">
                {company.lastDealDate
                  ? new Date(company.lastDealDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "\u2014"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Score Gauges */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col items-center pt-6 pb-6">
            <div className="relative">
              <ScoreGauge score={company.partnerScore} label="Partner Score" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground text-center">
              Composite score based on deal history, strategic fit, and
              engagement
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center pt-6 pb-6">
            <div className="relative">
              <ScoreGauge
                score={company.dealActivityScore}
                label="Deal Activity"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground text-center">
              Frequency and recency of licensing and M&A transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="deals">
            Deal History ({companyDeals.length})
          </TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          {/* Therapeutic Focus */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Therapeutic Focus</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {company.therapeuticFocus.map((ta) => (
                  <Badge key={ta} variant="secondary">
                    {ta}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Modality Focus */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Modality Focus</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {company.modalityFocus.map((m) => (
                  <Badge key={m} variant="outline">
                    {m}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Deal Behavior Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Deal Behavior Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Avg Deal Cadence
                  </p>
                  <p className="text-sm font-medium">
                    {company.avgDealCadenceDays != null
                      ? `${company.avgDealCadenceDays} days`
                      : "\u2014"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Avg Upfront Payment
                  </p>
                  <p className="text-sm font-medium">
                    {formatCurrency(avgUpfront)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Avg Total Deal Value
                  </p>
                  <p className="text-sm font-medium">
                    {formatCurrency(avgTotalValue)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Typical Royalty Range
                  </p>
                  <p className="text-sm font-medium">
                    {avgRoyaltyLow != null && avgRoyaltyHigh != null
                      ? `${avgRoyaltyLow.toFixed(0)}% \u2013 ${avgRoyaltyHigh.toFixed(0)}%`
                      : "\u2014"}
                  </p>
                </div>
              </div>
              <Separator className="my-4" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Historical Deals
                </p>
                <p className="text-sm font-medium">
                  {companyDeals.length} deal
                  {companyDeals.length !== 1 ? "s" : ""} on record
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {company.notes || "No notes available."}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deal History Tab */}
        <TabsContent value="deals" className="space-y-4">
          {companyDeals.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deal</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>TA</TableHead>
                      <TableHead className="text-right">Upfront</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyDeals.map((deal) => (
                      <TableRow key={deal.id}>
                        <TableCell>
                          <Link
                            href={`/deals/${deal.id}`}
                            className="font-medium hover:underline"
                          >
                            {deal.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {deal.licensorName}
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
                        <TableCell className="text-sm">
                          {deal.therapeuticArea}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatCurrency(deal.upfrontPayment)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatCurrency(deal.totalDealValue)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(deal.announcedDate).toLocaleDateString(
                            "en-US",
                            { month: "short", year: "numeric" }
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <Briefcase className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No deal history found for {company.name}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Primary Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/10">
                  <User className="h-6 w-6 text-sky-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{company.contactName}</p>
                  <p className="text-xs text-muted-foreground">
                    {company.contactTitle}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span>{company.contactEmail}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
