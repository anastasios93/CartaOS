"use client";

import { useState, useMemo, useEffect } from "react";
import { keepPreviousData } from "@tanstack/react-query";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useDeals } from "@/hooks/use-data";
import { trpc } from "@/lib/trpc";
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
  ChevronRight,
  X,
  Database,
  Globe,
  Loader2,
  AlertCircle,
  ExternalLink,
  FlaskConical,
  Building2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types for search results
// ---------------------------------------------------------------------------

interface SecFilingResult {
  accessionNumber: string;
  filingDate: string;
  form: string;
  companyName: string;
  cik: string;
  description: string;
  documentUrl: string;
}

interface ClinicalTrialResult {
  nctId: string;
  title: string;
  status: string;
  sponsor: string;
  conditions: string[];
  interventions: string[];
  phase: string;
  startDate: string;
  studyType: string;
}

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

type SearchMode = "database" | "live";

// ---------------------------------------------------------------------------
// Custom hook: debounced value
// ---------------------------------------------------------------------------

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

// ---------------------------------------------------------------------------
// Sub-components for Live Search results
// ---------------------------------------------------------------------------

function SourceSectionHeader({
  title,
  icon,
  count,
  isLoading,
  hasError,
  isOpen,
  onToggle,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  isLoading: boolean;
  hasError: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50"
    >
      <ChevronRight
        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
          isOpen ? "rotate-90" : ""
        }`}
      />
      <span className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
      </span>
      <span className="ml-auto flex items-center gap-2">
        {isLoading && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#F97316]" />
        )}
        {hasError && (
          <AlertCircle className="h-3.5 w-3.5 text-red-500" />
        )}
        {!isLoading && !hasError && (
          <Badge
            variant="secondary"
            className="h-5 min-w-5 px-1.5 text-[10px] font-semibold"
          >
            {count}
          </Badge>
        )}
      </span>
    </button>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4">
          <Skeleton className="mb-2 h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function SecEdgarCard({ filing }: { filing: SecFilingResult }) {
  const href = filing.documentUrl || "#";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-lg border bg-card p-4 transition-colors hover:border-[#F97316]/40 hover:bg-orange-50/30 dark:hover:bg-orange-950/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-foreground group-hover:text-[#F97316] transition-colors">
            {filing.description || filing.companyName || "SEC Filing"}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {filing.companyName && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {filing.companyName}
              </span>
            )}
            {filing.form && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {filing.form}
              </Badge>
            )}
            {filing.filingDate && (
              <span>
                Filed:{" "}
                {new Date(filing.filingDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        </div>
        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-[#F97316] transition-colors" />
      </div>
    </a>
  );
}

function ClinicalTrialCard({ trial }: { trial: ClinicalTrialResult }) {
  const ctUrl = trial.nctId
    ? `https://clinicaltrials.gov/study/${trial.nctId}`
    : "#";

  const statusColor =
    trial.status === "RECRUITING"
      ? "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/30 dark:border-green-800"
      : trial.status === "COMPLETED"
      ? "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-800"
      : "text-muted-foreground bg-muted border-border";

  return (
    <a
      href={ctUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-lg border bg-card p-4 transition-colors hover:border-[#F97316]/40 hover:bg-orange-50/30 dark:hover:bg-orange-950/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-foreground group-hover:text-[#F97316] transition-colors">
            {trial.title}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {trial.sponsor && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {trial.sponsor}
              </span>
            )}
            {trial.phase && trial.phase !== "N/A" && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {trial.phase}
              </Badge>
            )}
            {trial.status && (
              <span
                className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusColor}`}
              >
                {trial.status}
              </span>
            )}
            {trial.studyType && (
              <span>{trial.studyType}</span>
            )}
            {trial.startDate && (
              <span>Started: {trial.startDate}</span>
            )}
          </div>
          {trial.conditions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {trial.conditions.slice(0, 4).map((c) => (
                <Badge
                  key={c}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0"
                >
                  {c}
                </Badge>
              ))}
              {trial.conditions.length > 4 && (
                <span className="text-[10px] text-muted-foreground">
                  +{trial.conditions.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-[#F97316] transition-colors" />
          {trial.nctId && (
            <span className="font-mono text-[10px] text-muted-foreground opacity-60">
              {trial.nctId}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}

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

  // -- Search mode state --
  const [searchMode, setSearchMode] = useState<SearchMode>("database");
  const [liveQuery, setLiveQuery] = useState("");
  const debouncedQuery = useDebouncedValue(liveQuery, 500);

  // -- Collapsible sections for live search --
  const [dbOpen, setDbOpen] = useState(true);
  const [secOpen, setSecOpen] = useState(true);
  const [ctOpen, setCtOpen] = useState(true);

  // -- Live search query via tRPC --
  const liveSearchEnabled =
    searchMode === "live" && debouncedQuery.length >= 2;

  const liveSearch = trpc.search.unified.useQuery(
    { query: debouncedQuery, limit: 20 },
    {
      enabled: liveSearchEnabled,
      refetchOnWindowFocus: false,
      retry: false,
      placeholderData: keepPreviousData,
    }
  );

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

  // -- Live search result data --
  const dbResults = (liveSearch.data?.database?.data ?? []) as typeof deals;
  const secResults = (liveSearch.data?.secEdgar?.data ?? []) as SecFilingResult[];
  const ctResults = (liveSearch.data?.clinicalTrials?.data ?? []) as ClinicalTrialResult[];

  const dbError = liveSearch.data?.database?.error ?? null;
  const secError = liveSearch.data?.secEdgar?.error ?? null;
  const ctError = liveSearch.data?.clinicalTrials?.error ?? null;

  const isSearching = liveSearch.isFetching;
  const totalResults = dbResults.length + secResults.length + ctResults.length;

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

      {/* Search mode toggle */}
      <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setSearchMode("database")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            searchMode === "database"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Database className="h-4 w-4" />
          My Database
        </button>
        <button
          onClick={() => setSearchMode("live")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            searchMode === "live"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Globe className="h-4 w-4" />
          Live Search
          {searchMode === "live" && liveSearchEnabled && !isSearching && totalResults > 0 && (
            <Badge className="ml-1 h-5 min-w-5 bg-[#F97316] px-1.5 text-[10px] text-white hover:bg-[#F97316]">
              {totalResults}
            </Badge>
          )}
          {searchMode === "live" && isSearching && (
            <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin text-[#F97316]" />
          )}
        </button>
      </div>

      {/* ================================================================= */}
      {/* DATABASE MODE                                                     */}
      {/* ================================================================= */}
      {searchMode === "database" && (
        <>
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
        </>
      )}

      {/* ================================================================= */}
      {/* LIVE SEARCH MODE                                                  */}
      {/* ================================================================= */}
      {searchMode === "live" && (
        <>
          {/* Live search input */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search across database, SEC EDGAR filings, and ClinicalTrials.gov..."
                    value={liveQuery}
                    onChange={(e) => setLiveQuery(e.target.value)}
                    className="pl-9 h-9"
                    autoFocus
                  />
                  {liveQuery && (
                    <button
                      onClick={() => setLiveQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {isSearching && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-[#F97316]" />
                    Searching...
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Searches your database, SEC EDGAR filings, and ClinicalTrials.gov simultaneously. Minimum 2 characters.
              </p>
            </CardContent>
          </Card>

          {/* Placeholder when no query */}
          {!liveSearchEnabled && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20">
              <Globe className="h-12 w-12 text-muted-foreground/20" />
              <p className="mt-4 text-sm font-medium text-muted-foreground">
                Search Public Sources
              </p>
              <p className="mt-1 max-w-sm text-center text-xs text-muted-foreground/70">
                Type at least 2 characters to search across your deal database, SEC EDGAR filings, and ClinicalTrials.gov in real time.
              </p>
            </div>
          )}

          {/* Results */}
          {liveSearchEnabled && (
            <div className="space-y-3">
              {/* Summary bar */}
              {!isSearching && liveSearch.data && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>
                    Found{" "}
                    <span className="font-medium text-foreground">
                      {totalResults}
                    </span>{" "}
                    results across 3 sources
                  </span>
                  {(dbError || secError || ctError) && (
                    <span className="flex items-center gap-1 text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      {[dbError, secError, ctError].filter(Boolean).length} source(s) had errors
                    </span>
                  )}
                </div>
              )}

              {/* -------- Database Results -------- */}
              <div>
                <SourceSectionHeader
                  title="Database Results"
                  icon={<Database className="h-4 w-4 text-[#F97316]" />}
                  count={dbResults.length}
                  isLoading={isSearching}
                  hasError={!!dbError}
                  isOpen={dbOpen}
                  onToggle={() => setDbOpen((p) => !p)}
                />
                {dbOpen && (
                  <div className="mt-2 space-y-2 pl-7">
                    {isSearching && !liveSearch.data && <LoadingSkeleton />}
                    {dbError && <ErrorMessage message={dbError} />}
                    {!isSearching && !dbError && dbResults.length === 0 && liveSearch.data && (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        No database results found
                      </p>
                    )}
                    {dbResults.length > 0 && (
                      <Card>
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
                                <TableHead>Date</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {dbResults.map((deal: any) => (
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
                                  <TableCell className="text-right font-mono text-sm">
                                    {formatCurrency(deal.upfrontPayment)}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-sm font-medium">
                                    {formatCurrency(deal.totalDealValue)}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {deal.announcedDate
                                      ? new Date(deal.announcedDate).toLocaleDateString(
                                          "en-US",
                                          { month: "short", year: "numeric" }
                                        )
                                      : "\u2014"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>

              {/* -------- SEC EDGAR Results -------- */}
              <div>
                <SourceSectionHeader
                  title="SEC EDGAR Filings"
                  icon={<FileText className="h-4 w-4 text-[#F97316]" />}
                  count={secResults.length}
                  isLoading={isSearching}
                  hasError={!!secError}
                  isOpen={secOpen}
                  onToggle={() => setSecOpen((p) => !p)}
                />
                {secOpen && (
                  <div className="mt-2 space-y-2 pl-7">
                    {isSearching && !liveSearch.data && <LoadingSkeleton />}
                    {secError && <ErrorMessage message={secError} />}
                    {!isSearching && !secError && secResults.length === 0 && liveSearch.data && (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        No SEC EDGAR results found
                      </p>
                    )}
                    {secResults.map((filing, idx) => (
                      <SecEdgarCard key={`${filing.accessionNumber}-${idx}`} filing={filing} />
                    ))}
                  </div>
                )}
              </div>

              {/* -------- Clinical Trials Results -------- */}
              <div>
                <SourceSectionHeader
                  title="Clinical Trials"
                  icon={<FlaskConical className="h-4 w-4 text-[#F97316]" />}
                  count={ctResults.length}
                  isLoading={isSearching}
                  hasError={!!ctError}
                  isOpen={ctOpen}
                  onToggle={() => setCtOpen((p) => !p)}
                />
                {ctOpen && (
                  <div className="mt-2 space-y-2 pl-7">
                    {isSearching && !liveSearch.data && <LoadingSkeleton />}
                    {ctError && <ErrorMessage message={ctError} />}
                    {!isSearching && !ctError && ctResults.length === 0 && liveSearch.data && (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        No clinical trial results found
                      </p>
                    )}
                    {ctResults.map((trial, idx) => (
                      <ClinicalTrialCard key={`${trial.nctId}-${idx}`} trial={trial} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
