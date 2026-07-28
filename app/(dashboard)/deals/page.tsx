"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
import { useDeals } from "@/hooks/use-data";
import {
  DEAL_TYPE_LABELS,
  STAGE_LABELS,
  DEAL_TYPES,
  DEAL_STAGES,
  THERAPEUTIC_AREAS,
  MODALITIES,
} from "@/lib/constants";
import {
  Search,
  Plus,
  FileText,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "\u2014";
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value.toFixed(0)}M`;
}

type SortKey =
  | "title"
  | "dealType"
  | "developmentStage"
  | "therapeuticArea"
  | "modality"
  | "upfrontPayment"
  | "totalDealValue"
  | "royalty"
  | "announcedDate";
type SortDir = "asc" | "desc";

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function DealsPage() {
  const { deals } = useDeals();

  // -- Local database filter state --
  const [search, setSearch] = useState("");
  const [dealType, setDealType] = useState<string>("all");
  const [stage, setStage] = useState<string>("all");
  const [therapeuticArea, setTherapeuticArea] = useState<string>("all");
  const [modality, setModality] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("announcedDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // -- Sorting for local DB table --
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const filteredDeals = useMemo(() => {
    let filtered = [...deals];

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.licensorName.toLowerCase().includes(q) ||
          d.licenseeName.toLowerCase().includes(q) ||
          d.assetName.toLowerCase().includes(q) ||
          d.indication.toLowerCase().includes(q)
      );
    }

    if (dealType !== "all")
      filtered = filtered.filter((d) => d.dealType === dealType);
    if (stage !== "all")
      filtered = filtered.filter((d) => d.developmentStage === stage);
    if (therapeuticArea !== "all")
      filtered = filtered.filter((d) => d.therapeuticArea === therapeuticArea);
    if (modality !== "all")
      filtered = filtered.filter((d) => d.modality === modality);

    filtered.sort((a, b) => {
      let aVal: string | number | null = null;
      let bVal: string | number | null = null;

      switch (sortKey) {
        case "title":
          aVal = a.title;
          bVal = b.title;
          break;
        case "dealType":
          aVal = a.dealType;
          bVal = b.dealType;
          break;
        case "developmentStage":
          aVal = a.developmentStage;
          bVal = b.developmentStage;
          break;
        case "therapeuticArea":
          aVal = a.therapeuticArea;
          bVal = b.therapeuticArea;
          break;
        case "modality":
          aVal = a.modality;
          bVal = b.modality;
          break;
        case "upfrontPayment":
          aVal = a.upfrontPayment ?? -1;
          bVal = b.upfrontPayment ?? -1;
          break;
        case "totalDealValue":
          aVal = a.totalDealValue ?? -1;
          bVal = b.totalDealValue ?? -1;
          break;
        case "royalty":
          aVal = a.royaltyRangeLow ?? -1;
          bVal = b.royaltyRangeLow ?? -1;
          break;
        case "announcedDate":
          aVal = new Date(a.announcedDate).getTime();
          bVal = new Date(b.announcedDate).getTime();
          break;
      }

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return filtered;
  }, [deals, search, dealType, stage, therapeuticArea, modality, sortKey, sortDir]);

  const hasActiveFilters =
    search ||
    dealType !== "all" ||
    stage !== "all" ||
    therapeuticArea !== "all" ||
    modality !== "all";

  const clearFilters = () => {
    setSearch("");
    setDealType("all");
    setStage("all");
    setTherapeuticArea("all");
    setModality("all");
  };

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column)
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />;
    return sortDir === "asc" ? (
      <ChevronUp className="ml-1 h-3 w-3 text-[#F97316]" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3 text-[#F97316]" />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E]">
            Deal Twin Library
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI-generated deal structures and precedent transactions
          </p>
        </div>
        <Button asChild className="gap-2 bg-[#F97316] hover:bg-[#EA580C] text-white">
          <Link href="/deals/new">
            <Plus className="h-4 w-4" /> New Deal Twin
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search deals, companies, assets, indications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8"
              />
            </div>
            <Select
              value={dealType}
              onValueChange={(v) => setDealType(v ?? "all")}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Deal Type" />
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
            <Select
              value={stage}
              onValueChange={(v) => setStage(v ?? "all")}
            >
              <SelectTrigger className="w-[140px]">
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
              value={therapeuticArea}
              onValueChange={(v) => setTherapeuticArea(v ?? "all")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Therapeutic Area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Areas</SelectItem>
                {THERAPEUTIC_AREAS.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={modality}
              onValueChange={(v) => setModality(v ?? "all")}
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
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground"
              >
                <X className="mr-1 h-3 w-3" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-medium text-foreground">
            {filteredDeals.length}
          </span>{" "}
          of {deals.length} deals
          {hasActiveFilters && (
            <span className="text-[#F97316] ml-1">(filtered)</span>
          )}
        </p>
      </div>

      {/* Deals table */}
      <Card>
        <CardContent className="p-0">
          {filteredDeals.length ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>
                    <button
                      onClick={() => handleSort("title")}
                      className="inline-flex items-center hover:text-foreground transition-colors"
                    >
                      Deal
                      <SortIcon column="title" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("dealType")}
                      className="inline-flex items-center hover:text-foreground transition-colors"
                    >
                      Type
                      <SortIcon column="dealType" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("developmentStage")}
                      className="inline-flex items-center hover:text-foreground transition-colors"
                    >
                      Stage
                      <SortIcon column="developmentStage" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("therapeuticArea")}
                      className="inline-flex items-center hover:text-foreground transition-colors"
                    >
                      TA
                      <SortIcon column="therapeuticArea" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("modality")}
                      className="inline-flex items-center hover:text-foreground transition-colors"
                    >
                      Modality
                      <SortIcon column="modality" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      onClick={() => handleSort("upfrontPayment")}
                      className="inline-flex items-center hover:text-foreground transition-colors ml-auto"
                    >
                      Upfront
                      <SortIcon column="upfrontPayment" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      onClick={() => handleSort("totalDealValue")}
                      className="inline-flex items-center hover:text-foreground transition-colors ml-auto"
                    >
                      Total Value
                      <SortIcon column="totalDealValue" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      onClick={() => handleSort("royalty")}
                      className="inline-flex items-center hover:text-foreground transition-colors ml-auto"
                    >
                      Royalty
                      <SortIcon column="royalty" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("announcedDate")}
                      className="inline-flex items-center hover:text-foreground transition-colors"
                    >
                      Date
                      <SortIcon column="announcedDate" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeals.map((deal) => (
                  <TableRow
                    key={deal.id}
                    className="cursor-pointer group/row"
                  >
                    <TableCell className="max-w-[240px]">
                      <Link
                        href={`/deals/${deal.id}`}
                        className="block font-medium text-foreground group-hover/row:text-[#F97316] transition-colors"
                      >
                        {deal.title}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate">
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
                    <TableCell className="text-xs">
                      {deal.therapeuticArea}
                    </TableCell>
                    <TableCell className="text-xs max-w-[140px] truncate">
                      {deal.modality}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(deal.upfrontPayment)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">
                      {formatCurrency(deal.totalDealValue)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {deal.royaltyRangeLow != null &&
                      deal.royaltyRangeHigh != null
                        ? `${deal.royaltyRangeLow}% \u2013 ${deal.royaltyRangeHigh}%`
                        : "\u2014"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(deal.announcedDate).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <FileText className="h-10 w-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">
                No deals match your filters
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
