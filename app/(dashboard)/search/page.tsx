"use client";

import { useState, useEffect } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { DEAL_TYPE_LABELS, STAGE_LABELS } from "@/lib/constants";
import Link from "next/link";
import {
  Search,
  Globe,
  Database,
  FileText,
  FlaskConical,
  Building2,
  ExternalLink,
  Loader2,
  X,
  AlertCircle,
  ChevronRight,
  Sparkles,
} from "lucide-react";

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

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "\u2014";
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value.toFixed(0)}M`;
}

export default function LiveSearchPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 500);

  const enabled = debouncedQuery.length >= 2;

  const liveSearch = trpc.search.unified.useQuery(
    { query: debouncedQuery, limit: 20 },
    {
      enabled,
      refetchOnWindowFocus: false,
      retry: false,
      placeholderData: keepPreviousData,
    }
  );

  const dbResults = (liveSearch.data?.database?.data ?? []) as any[];
  const secResults = (liveSearch.data?.secEdgar?.data ?? []) as SecFilingResult[];
  const ctResults = (liveSearch.data?.clinicalTrials?.data ?? []) as ClinicalTrialResult[];
  const isSearching = liveSearch.isFetching;
  const totalResults = dbResults.length + secResults.length + ctResults.length;

  const [dbOpen, setDbOpen] = useState(true);
  const [secOpen, setSecOpen] = useState(true);
  const [ctOpen, setCtOpen] = useState(true);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E]">Live Search</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Search across your database, SEC EDGAR, and ClinicalTrials.gov simultaneously
        </p>
      </div>

      {/* Search input */}
      <Card className="border-border/40 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search deals, filings, clinical trials..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 h-10 border-border/40 text-sm"
                autoFocus
              />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {isSearching && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                <Loader2 className="h-4 w-4 animate-spin text-[#F97316]" />
                Searching...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Empty state */}
      {!enabled && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/40 py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F97316]/10 mb-6">
            <Globe className="h-8 w-8 text-[#F97316]" />
          </div>
          <p className="text-sm font-medium text-[#1A1A2E]">Search Public Sources</p>
          <p className="mt-1 max-w-sm text-center text-xs text-muted-foreground">
            Type at least 2 characters to search across your deal database, SEC EDGAR filings, and ClinicalTrials.gov.
          </p>
        </div>
      )}

      {/* Results */}
      {enabled && (
        <div className="space-y-4">
          {!isSearching && liveSearch.data && (
            <p className="text-sm text-muted-foreground">
              Found <span className="font-semibold text-[#1A1A2E]">{totalResults}</span> results across 3 sources
            </p>
          )}

          {/* Database */}
          <SectionHeader
            title="Database Results"
            icon={<Database className="h-4 w-4 text-[#F97316]" />}
            count={dbResults.length}
            loading={isSearching && !liveSearch.data}
            open={dbOpen}
            onToggle={() => setDbOpen(!dbOpen)}
          />
          {dbOpen && dbResults.length > 0 && (
            <div className="space-y-2 ml-7">
              {dbResults.map((deal: any) => (
                <Link key={deal.id} href={`/deals/${deal.id}`} className="block">
                  <Card className="group border-border/40 shadow-sm hover:shadow-md hover:border-[#F97316]/20 transition-all">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F97316]/8 shrink-0">
                        <Sparkles className="h-4 w-4 text-[#F97316]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate group-hover:text-[#F97316] transition-colors">{deal.title}</p>
                        <p className="text-[11px] text-muted-foreground">{deal.licensorName} &middot; {deal.licenseeName}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] h-5">{STAGE_LABELS[deal.developmentStage] ?? deal.developmentStage}</Badge>
                      <span className="text-[12px] font-mono font-semibold text-[#F97316]">{formatCurrency(deal.totalDealValue)}</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* SEC EDGAR */}
          <SectionHeader
            title="SEC EDGAR Filings"
            icon={<FileText className="h-4 w-4 text-[#3B82F6]" />}
            count={secResults.length}
            loading={isSearching && !liveSearch.data}
            open={secOpen}
            onToggle={() => setSecOpen(!secOpen)}
          />
          {secOpen && secResults.length > 0 && (
            <div className="space-y-2 ml-7">
              {secResults.map((filing, i) => (
                <a key={`${filing.accessionNumber}-${i}`} href={filing.documentUrl || "#"} target="_blank" rel="noopener noreferrer" className="block">
                  <Card className="group border-border/40 shadow-sm hover:shadow-md hover:border-[#3B82F6]/20 transition-all">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3B82F6]/8 shrink-0">
                        <FileText className="h-4 w-4 text-[#3B82F6]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate group-hover:text-[#3B82F6] transition-colors">
                          {filing.description || filing.companyName}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          <Building2 className="h-3 w-3" />
                          {filing.companyName}
                          {filing.form && <Badge variant="outline" className="text-[9px] h-4 px-1">{filing.form}</Badge>}
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground/30 group-hover:text-[#3B82F6] transition-colors shrink-0" />
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>
          )}

          {/* Clinical Trials */}
          <SectionHeader
            title="Clinical Trials"
            icon={<FlaskConical className="h-4 w-4 text-[#10B981]" />}
            count={ctResults.length}
            loading={isSearching && !liveSearch.data}
            open={ctOpen}
            onToggle={() => setCtOpen(!ctOpen)}
          />
          {ctOpen && ctResults.length > 0 && (
            <div className="space-y-2 ml-7">
              {ctResults.map((trial, i) => (
                <a key={`${trial.nctId}-${i}`} href={`https://clinicaltrials.gov/study/${trial.nctId}`} target="_blank" rel="noopener noreferrer" className="block">
                  <Card className="group border-border/40 shadow-sm hover:shadow-md hover:border-[#10B981]/20 transition-all">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#10B981]/8 shrink-0">
                        <FlaskConical className="h-4 w-4 text-[#10B981]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate group-hover:text-[#10B981] transition-colors">{trial.title}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          {trial.sponsor && <span>{trial.sponsor}</span>}
                          {trial.phase && trial.phase !== "N/A" && <Badge variant="outline" className="text-[9px] h-4 px-1">{trial.phase}</Badge>}
                          {trial.status && (
                            <span className={`text-[10px] font-medium ${trial.status === "RECRUITING" ? "text-[#10B981]" : ""}`}>
                              {trial.status}
                            </span>
                          )}
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground/30 group-hover:text-[#10B981] transition-colors shrink-0" />
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  icon,
  count,
  loading,
  open,
  onToggle,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  loading: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-lg border border-border/40 bg-white px-4 py-2.5 text-left shadow-sm transition-colors hover:bg-[#F8F9FA]"
    >
      <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
      <span className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
      </span>
      <span className="ml-auto">
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#F97316]" />
        ) : (
          <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px] font-semibold">{count}</Badge>
        )}
      </span>
    </button>
  );
}
