"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PARTNER_STATUS_LABELS } from "@/lib/constants";
import { useCompanies } from "@/hooks/use-data";
import {
  Search,
  ArrowUpDown,
  Building2,
  TrendingUp,
  Users,
  Star,
} from "lucide-react";

const COMPANY_TYPES = [
  { value: "PHARMA", label: "Pharma" },
  { value: "BIOTECH", label: "Biotech" },
  { value: "MEDTECH", label: "MedTech" },
  { value: "CRO", label: "CRO" },
];

function formatMarketCap(value: number | null) {
  if (value == null) return "—";
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

function getScoreColor(score: number) {
  if (score >= 90) return "text-emerald-400";
  if (score >= 80) return "text-sky-400";
  if (score >= 70) return "text-amber-400";
  return "text-red-400";
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

    if (companyType !== "all") {
      list = list.filter((c) => c.type === companyType);
    }

    if (partnerStatus !== "all") {
      list = list.filter((c) => c.partnerStatus === partnerStatus);
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = a.name.localeCompare(b.name);
      } else {
        cmp = (a[sortField] ?? 0) - (b[sortField] ?? 0);
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return list;
  }, [search, companyType, partnerStatus, sortField, sortDir]);

  // Summary stats
  const activeCount = companies.filter(
    (c) => c.partnerStatus === "ACTIVE" || c.partnerStatus === "IN_DISCUSSION"
  ).length;
  const avgScore =
    companies.reduce((sum, c) => sum + c.partnerScore, 0) /
    companies.length;
  const topScorer = [...companies].sort(
    (a, b) => b.dealActivityScore - a.dealActivityScore
  )[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Partner Intelligence
        </h1>
        <p className="text-sm text-muted-foreground">
          Evaluate and track potential licensing partners
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10">
              <Building2 className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Partners</p>
              <p className="text-2xl font-bold">{companies.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <Users className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active / In Discussion</p>
              <p className="text-2xl font-bold">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Star className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Partner Score</p>
              <p className="text-2xl font-bold">{avgScore.toFixed(0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
              <TrendingUp className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Top Deal Activity</p>
              <p className="text-2xl font-bold">
                {topScorer?.name ?? "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search companies, HQ, therapeutic area..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={companyType}
              onValueChange={(v) => setCompanyType(v ?? "all")}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Company Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {COMPANY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={partnerStatus}
              onValueChange={(v) => setPartnerStatus(v ?? "all")}
            >
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Partner Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(PARTNER_STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Partners table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>HQ</TableHead>
                  <TableHead>
                    <button
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      onClick={() => toggleSort("dealActivityScore")}
                    >
                      Deal Activity
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      onClick={() => toggleSort("partnerScore")}
                    >
                      Partner Score
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Deal</TableHead>
                  <TableHead>TA Focus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((company) => (
                  <TableRow key={company.id} className="cursor-pointer">
                    <TableCell>
                      <Link
                        href={`/partners/${company.id}`}
                        className="font-medium hover:underline"
                      >
                        {company.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {formatMarketCap(company.marketCap)} mkt cap
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {company.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {company.headquarters}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-sm font-semibold ${getScoreColor(
                          company.dealActivityScore
                        )}`}
                      >
                        {company.dealActivityScore}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-sm font-semibold ${getScoreColor(
                          company.partnerScore
                        )}`}
                      >
                        {company.partnerScore}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${getStatusColor(
                          company.partnerStatus
                        )}`}
                      >
                        {PARTNER_STATUS_LABELS[company.partnerStatus] ??
                          company.partnerStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {company.lastDealDate
                        ? new Date(company.lastDealDate).toLocaleDateString(
                            "en-US",
                            { month: "short", year: "numeric" }
                          )
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {company.therapeuticFocus.slice(0, 2).map((ta) => (
                          <Badge
                            key={ta}
                            variant="secondary"
                            className="text-[10px] px-1.5"
                          >
                            {ta}
                          </Badge>
                        ))}
                        {company.therapeuticFocus.length > 2 && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5"
                          >
                            +{company.therapeuticFocus.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <Building2 className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">
                No partners found matching your filters
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
