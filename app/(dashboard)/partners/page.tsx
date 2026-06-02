"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PARTNER_STATUS_LABELS } from "@/lib/constants";
import { useCompanies } from "@/hooks/use-data";
import {
  Search,
  ArrowUpDown,
  Building2,
  TrendingUp,
  Users,
  Star,
  ArrowUpRight,
  Sparkles,
  Crown,
} from "lucide-react";

const COMPANY_TYPES = [
  { value: "PHARMA", label: "Pharma" },
  { value: "BIOTECH", label: "Biotech" },
  { value: "MEDTECH", label: "MedTech" },
  { value: "CRO", label: "CRO" },
];

function formatMarketCap(value: number | null) {
  if (value == null) return "\u2014";
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}B`;
  return `$${value}M`;
}

function getStatusColor(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-600 border-emerald-200";
    case "IN_DISCUSSION":
      return "bg-sky-50 text-sky-600 border-sky-200";
    case "CONTACTED":
      return "bg-amber-50 text-amber-600 border-amber-200";
    case "IDENTIFIED":
      return "bg-violet-50 text-violet-600 border-violet-200";
    case "DECLINED":
      return "bg-red-50 text-red-600 border-red-200";
    default:
      return "bg-gray-50 text-gray-600 border-gray-200";
  }
}

function getScoreColor(score: number) {
  if (score >= 90) return "text-[#10B981]";
  if (score >= 80) return "text-[#3B82F6]";
  if (score >= 70) return "text-[#F59E0B]";
  return "text-[#EF4444]";
}

function getScoreBg(score: number) {
  if (score >= 90) return "bg-[#10B981]/10";
  if (score >= 80) return "bg-[#3B82F6]/10";
  if (score >= 70) return "bg-[#F59E0B]/10";
  return "bg-[#EF4444]/10";
}

type SortField = "partnerScore" | "dealActivityScore" | "name";
type SortDir = "asc" | "desc";

export default function PartnersPage() {
  const { companies } = useCompanies();
  const [search, setSearch] = useState("");
  const [companyType, setCompanyType] = useState<string>("all");
  const [partnerStatus, setPartnerStatus] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("partnerScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const filtered = useMemo(() => {
    let list = [...companies];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.headquarters.toLowerCase().includes(q) ||
          c.therapeuticFocus.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (companyType !== "all") list = list.filter((c) => c.type === companyType);
    if (partnerStatus !== "all") list = list.filter((c) => c.partnerStatus === partnerStatus);
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else cmp = (a[sortField] ?? 0) - (b[sortField] ?? 0);
      return sortDir === "desc" ? -cmp : cmp;
    });
    return list;
  }, [search, companyType, partnerStatus, sortField, sortDir, companies]);

  const activeCount = companies.filter(
    (c) => c.partnerStatus === "ACTIVE" || c.partnerStatus === "IN_DISCUSSION"
  ).length;
  const avgScore = companies.length > 0
    ? Math.round(companies.reduce((sum, c) => sum + c.partnerScore, 0) / companies.length)
    : 0;
  const topScorer = [...companies].sort((a, b) => b.partnerScore - a.partnerScore)[0];

  if (companies.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E]">Partner Matching</h1>
          <p className="text-sm text-muted-foreground mt-0.5">AI-ranked licensing partners based on deal fit and activity</p>
        </div>
        <Card className="border-border/40 shadow-sm">
          <CardContent className="py-16 px-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#10B981]/10 to-[#10B981]/5">
              <Users className="h-6 w-6 text-[#10B981]" />
            </div>
            <h3 className="text-base font-bold text-[#1A1A2E]">No partners tracked yet</h3>
            <p className="text-[13px] text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
              Run a portfolio diagnostic to surface AI-ranked partner candidates with fit scores, deal propensity, and rationale based on real clinical-trial and SEC filing data.
            </p>
            <div className="mt-6">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-[13px] font-semibold transition"
              >
                Run Portfolio Diagnostic
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E]">Partner Matching</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI-ranked licensing partners based on deal fit and activity
          </p>
        </div>
        <Badge variant="outline" className="text-xs h-7 gap-1.5 font-normal">
          <Sparkles className="h-3 w-3 text-[#F97316]" />
          {companies.length} partners analyzed
        </Badge>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Partners"
          value={companies.length.toString()}
          icon={<Building2 className="h-4 w-4" />}
          color="#3B82F6"
        />
        <KPICard
          title="Active / In Discussion"
          value={activeCount.toString()}
          icon={<Users className="h-4 w-4" />}
          color="#10B981"
        />
        <KPICard
          title="Avg Fit Score"
          value={avgScore.toString()}
          icon={<Star className="h-4 w-4" />}
          color="#F59E0B"
        />
        <KPICard
          title="Top Partner"
          value={topScorer?.name.split(" ")[0] ?? "\u2014"}
          subtitle={topScorer ? `Score: ${topScorer.partnerScore}` : ""}
          icon={<Crown className="h-4 w-4" />}
          color="#8B5CF6"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search companies, HQ, therapeutic area..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 border-border/40 bg-white"
          />
        </div>
        <Select value={companyType} onValueChange={(v) => setCompanyType(v ?? "all")}>
          <SelectTrigger className="w-[150px] h-9 border-border/40 bg-white">
            <SelectValue placeholder="Company Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {COMPANY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={partnerStatus} onValueChange={(v) => setPartnerStatus(v ?? "all")}>
          <SelectTrigger className="w-[170px] h-9 border-border/40 bg-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(PARTNER_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant={sortField === "partnerScore" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => toggleSort("partnerScore")}
          >
            <Star className="h-3 w-3 mr-1" /> Fit Score
          </Button>
          <Button
            variant={sortField === "dealActivityScore" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => toggleSort("dealActivityScore")}
          >
            <TrendingUp className="h-3 w-3 mr-1" /> Activity
          </Button>
        </div>
      </div>

      {/* Partner cards (card layout instead of table) */}
      {filtered.length > 0 ? (
        <div className="grid gap-3">
          {filtered.map((company, idx) => (
            <Link key={company.id} href={`/partners/${company.id}`}>
              <Card className="group border-border/40 bg-white shadow-sm transition-all hover:shadow-md hover:border-border/60">
                <CardContent className="flex items-center gap-5 p-4">
                  {/* Rank */}
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F8F9FA] text-[13px] font-bold text-muted-foreground shrink-0">
                    {idx + 1}
                  </div>

                  {/* Company info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-semibold text-[#1A1A2E] group-hover:text-[#F97316] transition-colors truncate">
                        {company.name}
                      </p>
                      <Badge variant="outline" className="text-[10px] h-5 font-normal shrink-0">
                        {company.type}
                      </Badge>
                      <Badge className={`text-[10px] h-5 font-medium border shrink-0 ${getStatusColor(company.partnerStatus)}`}>
                        {PARTNER_STATUS_LABELS[company.partnerStatus] ?? company.partnerStatus}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[11px] text-muted-foreground">{company.headquarters}</span>
                      <span className="text-[11px] text-muted-foreground">{formatMarketCap(company.marketCap)} mkt cap</span>
                      <div className="flex gap-1">
                        {company.therapeuticFocus.slice(0, 3).map((ta) => (
                          <Badge key={ta} variant="secondary" className="text-[9px] h-4 px-1.5 font-normal">
                            {ta}
                          </Badge>
                        ))}
                        {company.therapeuticFocus.length > 3 && (
                          <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-normal">
                            +{company.therapeuticFocus.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Scores */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Fit</p>
                      <div className={`mt-1 flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${getScoreBg(company.partnerScore)} ${getScoreColor(company.partnerScore)}`}>
                        {company.partnerScore}
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Activity</p>
                      <div className={`mt-1 flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${getScoreBg(company.dealActivityScore)} ${getScoreColor(company.dealActivityScore)}`}>
                        {company.dealActivityScore}
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-[#F97316] transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="border-border/40 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3B82F6]/10 mb-4">
              <Building2 className="h-7 w-7 text-[#3B82F6]" />
            </div>
            <p className="text-sm font-medium text-[#1A1A2E]">No partners found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KPICard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card className="border-border/40 shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
          style={{ backgroundColor: `${color}10`, color }}
        >
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{title}</p>
          <p className="text-xl font-bold font-mono text-[#1A1A2E] mt-0.5">{value}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
