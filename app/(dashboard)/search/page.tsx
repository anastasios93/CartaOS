"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
  Scale,
  BookOpen,
  Newspaper,
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

interface PatentResult {
  patentNumber: string;
  title: string;
  abstract: string;
  inventorNames: string[];
  assigneeOrganization: string;
  applicationDate: string;
  grantDate: string;
  expiryDate: string;
  patentType: string;
  cpcCodes: string[];
  patentUrl: string;
  wipoSearchUrl: string;
}

interface PubMedResult {
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  publicationDate: string;
  abstract: string;
  doi: string | null;
  pubmedUrl: string;
  source: "pubmed" | "europepmc";
  isPreprint: boolean;
}

interface NewsResult {
  title: string;
  link: string;
  source: string;
  publishedDate: string;
  snippet: string;
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
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebouncedValue(query, 500);

  const enabled = debouncedQuery.length >= 2;

  const liveSearch = trpc.search.unified.useQuery(
    { query: debouncedQuery, limit: 200 },
    {
      enabled,
      refetchOnWindowFocus: false,
      retry: false,
      placeholderData: keepPreviousData,
    }
  );

  const loadMoreQuery = trpc.search.loadMore.useMutation();

  // -- Load More pagination state --
  const [extraResults, setExtraResults] = useState<Record<string, any[]>>({});
  const [nextTokens, setNextTokens] = useState<Record<string, string | null>>({});
  const [totalCounts, setTotalCounts] = useState<Record<string, number | null>>({});
  const [loadingMore, setLoadingMore] = useState<Record<string, boolean>>({});

  // -- Initialize nextTokens/totalCounts from liveSearch response --
  useEffect(() => {
    if (!liveSearch.data) return;
    const tokens: Record<string, string | null> = {};
    const counts: Record<string, number | null> = {};
    for (const [key, camelKey] of [
      ["sec_edgar", "secEdgar"], ["clinical_trials", "clinicalTrials"],
      ["patents", "patents"], ["pubmed", "pubmed"], ["news", "news"]
    ] as const) {
      const src = (liveSearch.data as any)[camelKey];
      tokens[key] = src?.nextToken ?? null;
      counts[key] = src?.totalCount ?? null;
    }
    setNextTokens(tokens);
    setTotalCounts(counts);
    setExtraResults({});
  }, [liveSearch.data]);

  // -- Load More handler --
  const handleLoadMore = async (source: string) => {
    const token = nextTokens[source];
    if (!token || loadingMore[source]) return;
    setLoadingMore(prev => ({ ...prev, [source]: true }));
    try {
      const result = await loadMoreQuery.mutateAsync({
        source: source as any,
        query: debouncedQuery,
        nextToken: token,
        limit: 200,
      });
      setExtraResults(prev => ({
        ...prev,
        [source]: [...(prev[source] ?? []), ...result.data],
      }));
      setNextTokens(prev => ({ ...prev, [source]: result.nextToken }));
      if (result.totalCount != null) {
        setTotalCounts(prev => ({ ...prev, [source]: result.totalCount }));
      }
    } finally {
      setLoadingMore(prev => ({ ...prev, [source]: false }));
    }
  };

  const dbResults = (liveSearch.data?.database?.data ?? []) as any[];
  const secResults = [...((liveSearch.data?.secEdgar?.data ?? []) as SecFilingResult[]), ...((extraResults.sec_edgar ?? []) as SecFilingResult[])];
  const ctResults = [...((liveSearch.data?.clinicalTrials?.data ?? []) as ClinicalTrialResult[]), ...((extraResults.clinical_trials ?? []) as ClinicalTrialResult[])];
  const patentResults = [...((liveSearch.data?.patents?.data ?? []) as PatentResult[]), ...((extraResults.patents ?? []) as PatentResult[])];
  const pubmedResults = [...((liveSearch.data?.pubmed?.data ?? []) as PubMedResult[]), ...((extraResults.pubmed ?? []) as PubMedResult[])];
  const newsResults = (liveSearch.data?.news?.data ?? []) as NewsResult[];
  const isSearching = liveSearch.isFetching;
  const totalResults = dbResults.length + secResults.length + ctResults.length + patentResults.length + pubmedResults.length + newsResults.length;

  const [dbOpen, setDbOpen] = useState(true);
  const [secOpen, setSecOpen] = useState(true);
  const [ctOpen, setCtOpen] = useState(true);
  const [patentsOpen, setPatentsOpen] = useState(true);
  const [pubmedOpen, setPubmedOpen] = useState(true);
  const [newsOpen, setNewsOpen] = useState(true);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E]">Live Search</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Search across your database, SEC EDGAR, ClinicalTrials.gov, USPTO patents, PubMed/bioRxiv, and pharma news
        </p>
      </div>

      {/* Search input */}
      <Card className="border-border/40 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search deals, filings, clinical trials, patents, publications, news..."
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
                Searching 6 sources...
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
            Type at least 2 characters to search across 6 data sources: your deal database, SEC EDGAR, ClinicalTrials.gov, USPTO patents, PubMed/bioRxiv, and pharma news.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            <Badge variant="outline" className="gap-1"><Database className="h-3 w-3 text-[#F97316]" /> Database</Badge>
            <Badge variant="outline" className="gap-1"><FileText className="h-3 w-3 text-[#3B82F6]" /> SEC EDGAR</Badge>
            <Badge variant="outline" className="gap-1"><FlaskConical className="h-3 w-3 text-[#10B981]" /> Clinical Trials</Badge>
            <Badge variant="outline" className="gap-1"><Scale className="h-3 w-3 text-[#8B5CF6]" /> Patents</Badge>
            <Badge variant="outline" className="gap-1"><BookOpen className="h-3 w-3 text-[#EC4899]" /> PubMed</Badge>
            <Badge variant="outline" className="gap-1"><Newspaper className="h-3 w-3 text-[#06B6D4]" /> News</Badge>
          </div>
        </div>
      )}

      {/* Results */}
      {enabled && (
        <div className="space-y-4">
          {!isSearching && liveSearch.data && (
            <p className="text-sm text-muted-foreground">
              Found <span className="font-semibold text-[#1A1A2E]">{totalResults}</span> results across 6 sources
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
              {nextTokens.sec_edgar && (
                <button
                  onClick={() => handleLoadMore("sec_edgar")}
                  disabled={loadingMore.sec_edgar}
                  className="w-full mt-3 py-2 px-4 text-sm font-medium text-[#F97316] border border-[#F97316]/30 rounded-lg hover:bg-[#F97316]/5 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loadingMore.sec_edgar && <Loader2 className="h-4 w-4 animate-spin" />}
                  Load More SEC Filings
                  {` (showing ${secResults.length}${totalCounts.sec_edgar ? ` of ${totalCounts.sec_edgar}` : ""})`}
                </button>
              )}
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
              {nextTokens.clinical_trials && (
                <button
                  onClick={() => handleLoadMore("clinical_trials")}
                  disabled={loadingMore.clinical_trials}
                  className="w-full mt-3 py-2 px-4 text-sm font-medium text-[#10B981] border border-[#10B981]/30 rounded-lg hover:bg-[#10B981]/5 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loadingMore.clinical_trials && <Loader2 className="h-4 w-4 animate-spin" />}
                  Load More Clinical Trials
                  {` (showing ${ctResults.length}${totalCounts.clinical_trials ? ` of ${totalCounts.clinical_trials}` : ""})`}
                </button>
              )}
            </div>
          )}

          {/* Patents */}
          <SectionHeader
            title="USPTO Patents"
            icon={<Scale className="h-4 w-4 text-[#8B5CF6]" />}
            count={patentResults.length}
            loading={isSearching && !liveSearch.data}
            open={patentsOpen}
            onToggle={() => setPatentsOpen(!patentsOpen)}
          />
          {patentsOpen && patentResults.length > 0 && (
            <div className="space-y-2 ml-7">
              {patentResults.map((patent, i) => {
                const yearsRemaining = patent.expiryDate
                  ? Math.max(0, Math.round((new Date(patent.expiryDate).getTime() - Date.now()) / (365.25 * 24 * 60 * 60 * 1000)))
                  : null;
                return (
                  <a key={`${patent.patentNumber}-${i}`} href={patent.patentUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <Card className="group border-border/40 shadow-sm hover:shadow-md hover:border-[#8B5CF6]/20 transition-all">
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#8B5CF6]/8 shrink-0">
                          <Scale className="h-4 w-4 text-[#8B5CF6]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate group-hover:text-[#8B5CF6] transition-colors">{patent.title}</p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                            {patent.assigneeOrganization && <span>{patent.assigneeOrganization}</span>}
                            <Badge variant="outline" className="text-[9px] h-4 px-1 font-mono">US{patent.patentNumber}</Badge>
                            {yearsRemaining !== null && (
                              <span className={`text-[10px] font-medium ${yearsRemaining > 5 ? "text-green-600" : yearsRemaining > 2 ? "text-yellow-600" : "text-red-600"}`}>
                                {yearsRemaining > 0 ? `Expires ${yearsRemaining}y` : "Expired"}
                              </span>
                            )}
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground/30 group-hover:text-[#8B5CF6] transition-colors shrink-0" />
                      </CardContent>
                    </Card>
                  </a>
                );
              })}
              {nextTokens.patents && (
                <button
                  onClick={() => handleLoadMore("patents")}
                  disabled={loadingMore.patents}
                  className="w-full mt-3 py-2 px-4 text-sm font-medium text-[#8B5CF6] border border-[#8B5CF6]/30 rounded-lg hover:bg-[#8B5CF6]/5 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loadingMore.patents && <Loader2 className="h-4 w-4 animate-spin" />}
                  Load More Patents
                  {` (showing ${patentResults.length}${totalCounts.patents ? ` of ${totalCounts.patents}` : ""})`}
                </button>
              )}
            </div>
          )}

          {/* PubMed / Literature */}
          <SectionHeader
            title="Scientific Literature"
            icon={<BookOpen className="h-4 w-4 text-[#EC4899]" />}
            count={pubmedResults.length}
            loading={isSearching && !liveSearch.data}
            open={pubmedOpen}
            onToggle={() => setPubmedOpen(!pubmedOpen)}
          />
          {pubmedOpen && pubmedResults.length > 0 && (
            <div className="space-y-2 ml-7">
              {pubmedResults.map((article, i) => (
                <a key={`${article.pmid}-${i}`} href={article.pubmedUrl} target="_blank" rel="noopener noreferrer" className="block">
                  <Card className="group border-border/40 shadow-sm hover:shadow-md hover:border-[#EC4899]/20 transition-all">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EC4899]/8 shrink-0">
                        <BookOpen className="h-4 w-4 text-[#EC4899]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate group-hover:text-[#EC4899] transition-colors">{article.title}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          {article.authors.length > 0 && <span>{article.authors.slice(0, 2).join(", ")}{article.authors.length > 2 ? " et al." : ""}</span>}
                          {article.journal && <Badge variant="outline" className="text-[9px] h-4 px-1">{article.journal}</Badge>}
                          {article.isPreprint && <span className="text-[10px] font-medium text-amber-600">Preprint</span>}
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground/30 group-hover:text-[#EC4899] transition-colors shrink-0" />
                    </CardContent>
                  </Card>
                </a>
              ))}
              {nextTokens.pubmed && (
                <button
                  onClick={() => handleLoadMore("pubmed")}
                  disabled={loadingMore.pubmed}
                  className="w-full mt-3 py-2 px-4 text-sm font-medium text-[#EC4899] border border-[#EC4899]/30 rounded-lg hover:bg-[#EC4899]/5 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loadingMore.pubmed && <Loader2 className="h-4 w-4 animate-spin" />}
                  Load More Publications
                  {` (showing ${pubmedResults.length}${totalCounts.pubmed ? ` of ${totalCounts.pubmed}` : ""})`}
                </button>
              )}
            </div>
          )}

          {/* News */}
          <SectionHeader
            title="News & Press Releases"
            icon={<Newspaper className="h-4 w-4 text-[#06B6D4]" />}
            count={newsResults.length}
            loading={isSearching && !liveSearch.data}
            open={newsOpen}
            onToggle={() => setNewsOpen(!newsOpen)}
          />
          {newsOpen && newsResults.length > 0 && (
            <div className="space-y-2 ml-7">
              {newsResults.map((item, i) => (
                <a key={`${item.link}-${i}`} href={item.link} target="_blank" rel="noopener noreferrer" className="block">
                  <Card className="group border-border/40 shadow-sm hover:shadow-md hover:border-[#06B6D4]/20 transition-all">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#06B6D4]/8 shrink-0">
                        <Newspaper className="h-4 w-4 text-[#06B6D4]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate group-hover:text-[#06B6D4] transition-colors">{item.title}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          {item.source && <Badge variant="outline" className="text-[9px] h-4 px-1">{item.source}</Badge>}
                          {item.publishedDate && <span>{new Date(item.publishedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
                        </div>
                        {item.snippet && <p className="mt-1 text-[11px] text-muted-foreground/60 line-clamp-1">{item.snippet}</p>}
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground/30 group-hover:text-[#06B6D4] transition-colors shrink-0" />
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
