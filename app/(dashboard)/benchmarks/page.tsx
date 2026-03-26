"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Input } from "@/components/ui/input";
import {
  getUpfrontStats,
  getRoyaltyStats,
} from "@/lib/mock-data";
import { useDeals } from "@/hooks/use-data";
import {
  DEAL_TYPE_LABELS,
  STAGE_LABELS,
  THERAPEUTIC_AREAS,
  MODALITIES,
  DEAL_STAGES,
  DEAL_TYPES,
  matchesTA,
  matchesModality,
} from "@/lib/constants";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import {
  parseNewsSignals,
  parseEdgarSignals,
  type ParsedDealSignal,
} from "@/lib/parse-deal-values";
import {
  WORLDWIDE_DEALS,
  computeWorldwideBenchmarks,
  type WorldwideDeal,
} from "@/lib/worldwide-deal-data";
import {
  BarChart3,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Globe,
  FileText,
  FlaskConical,
  Scale,
  Building2,
  ExternalLink,
  Loader2,
  ChevronRight,
  BookOpen,
  Newspaper,
  Database,
  ArrowUpDown,
  Search,
  MapPin,
  Calendar,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "\u2014";
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value.toFixed(0)}M`;
}

// ─── Sort helpers ───
type SortField = "title" | "date" | "upfront" | "total" | "royalty" | "source";
type SortDir = "asc" | "desc";

export default function BenchmarksPage() {
  const { deals } = useDeals();

  // ─── Filter state (8 dimensions) ───
  const [taFilter, setTaFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [modalityFilter, setModalityFilter] = useState<string>("all");
  const [dealTypeFilter, setDealTypeFilter] = useState<string>("all");
  const [indicationFilter, setIndicationFilter] = useState("");
  const [territoryFilter, setTerritoryFilter] = useState<string>("all");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");

  // Table search
  const [tableSearch, setTableSearch] = useState("");

  // External sources on by default
  const [showExternal, setShowExternal] = useState(true);
  const [extOpen, setExtOpen] = useState(false); // collapsed by default since intel panels are above

  // Sort state for unified table
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Load More state
  const [extraResults, setExtraResults] = useState<Record<string, any[]>>({});
  const [nextTokens, setNextTokens] = useState<Record<string, string | null>>({});
  const [totalCounts, setTotalCounts] = useState<Record<string, number | null>>({});
  const [loadingMore, setLoadingMore] = useState<Record<string, boolean>>({});
  const loadMoreQuery = trpc.search.loadMore.useMutation();

  // Dynamic filter options from DB
  const filterOpts = trpc.deal.filterOptions.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  // ─── Apply filters to DB deals (uses alias matching for TA & modality) ───
  const filteredDeals = useMemo(() => {
    let filtered = [...deals];
    if (taFilter !== "all")
      filtered = filtered.filter((d) => matchesTA(d.therapeuticArea, taFilter));
    if (stageFilter !== "all")
      filtered = filtered.filter((d) => d.developmentStage === stageFilter);
    if (modalityFilter !== "all")
      filtered = filtered.filter((d) => matchesModality(d.modality ?? "", modalityFilter));
    if (dealTypeFilter !== "all")
      filtered = filtered.filter((d) => d.dealType === dealTypeFilter);
    if (indicationFilter)
      filtered = filtered.filter((d) =>
        d.indication?.toLowerCase().includes(indicationFilter.toLowerCase())
      );
    if (territoryFilter !== "all")
      filtered = filtered.filter((d) =>
        (d.territoryScope ?? "").toLowerCase().includes(territoryFilter.toLowerCase())
      );
    if (dateFromFilter)
      filtered = filtered.filter((d) => d.announcedDate >= dateFromFilter);
    if (dateToFilter)
      filtered = filtered.filter((d) => d.announcedDate <= dateToFilter);
    if (companyFilter) {
      const cf = companyFilter.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.licensorName.toLowerCase().includes(cf) ||
          d.licenseeName.toLowerCase().includes(cf)
      );
    }
    return filtered;
  }, [deals, taFilter, stageFilter, modalityFilter, dealTypeFilter, indicationFilter, territoryFilter, dateFromFilter, dateToFilter, companyFilter]);

  // Counts for badges on TA dropdown (DB + WW combined, using alias matching)
  const taCounts = useMemo(() => {
    const c: Record<string, number> = {};
    THERAPEUTIC_AREAS.forEach((ta) => {
      let count = 0;
      deals.forEach((d) => { if (matchesTA(d.therapeuticArea, ta)) count++; });
      WORLDWIDE_DEALS.forEach((d) => { if (matchesTA(d.therapeuticArea, ta)) count++; });
      if (count > 0) c[ta] = count;
    });
    return c;
  }, [deals]);

  // Counts for stage dropdown (DB + WW)
  const stageCounts = useMemo(() => {
    const c: Record<string, number> = {};
    deals.forEach((d) => { c[d.developmentStage] = (c[d.developmentStage] || 0) + 1; });
    WORLDWIDE_DEALS.forEach((d) => { c[d.stage] = (c[d.stage] || 0) + 1; });
    return c;
  }, [deals]);

  // Counts for modality dropdown (DB + WW)
  const modalityCounts = useMemo(() => {
    const c: Record<string, number> = {};
    MODALITIES.forEach((mod) => {
      let count = 0;
      deals.forEach((d) => { if (matchesModality(d.modality ?? "", mod)) count++; });
      WORLDWIDE_DEALS.forEach((d) => { if (matchesModality(d.modality, mod)) count++; });
      if (count > 0) c[mod] = count;
    });
    return c;
  }, [deals]);

  // Counts for deal type dropdown (DB + WW)
  const dealTypeCounts = useMemo(() => {
    const c: Record<string, number> = {};
    deals.forEach((d) => { c[d.dealType] = (c[d.dealType] || 0) + 1; });
    WORLDWIDE_DEALS.forEach((d) => {
      // Map WW types back to DB types for counting
      if (d.dealType === "LICENSE") { c["OUT_LICENSE"] = (c["OUT_LICENSE"] || 0) + 1; }
      else if (d.dealType === "COLLABORATION") { c["COLLABORATION"] = (c["COLLABORATION"] || 0) + 1; }
      else if (d.dealType === "M_AND_A") { c["M_AND_A"] = (c["M_AND_A"] || 0) + 1; }
      else if (d.dealType === "OPTION") { c["OPTION"] = (c["OPTION"] || 0) + 1; }
    });
    return c;
  }, [deals]);

  // Merged geography options (DB territories + WW geographies)
  const allGeographies = useMemo(() => {
    const geoSet = new Set<string>();
    (filterOpts.data?.territories ?? []).forEach((t) => geoSet.add(t));
    WORLDWIDE_DEALS.forEach((d) => { if (d.geography) geoSet.add(d.geography); });
    return Array.from(geoSet).sort();
  }, [filterOpts.data?.territories]);

  // Merged indication suggestions (DB + WW)
  const allIndications = useMemo(() => {
    const indSet = new Set<string>();
    (filterOpts.data?.indications ?? []).forEach((i) => indSet.add(i));
    WORLDWIDE_DEALS.forEach((d) => { if (d.indication) indSet.add(d.indication); });
    return Array.from(indSet).sort();
  }, [filterOpts.data?.indications]);

  // Merged company suggestions (DB + WW)
  const allCompanies = useMemo(() => {
    const compSet = new Set<string>();
    (filterOpts.data?.companies ?? []).forEach((c) => compSet.add(c));
    WORLDWIDE_DEALS.forEach((d) => { compSet.add(d.licensor); compSet.add(d.licensee); });
    return Array.from(compSet).sort();
  }, [filterOpts.data?.companies]);

  // ─── External comparables query ───
  const extQuery = trpc.search.comparables.useQuery(
    {
      therapeuticArea: taFilter !== "all" ? taFilter : undefined,
      stage: stageFilter !== "all" ? stageFilter : undefined,
      modality: modalityFilter !== "all" ? modalityFilter : undefined,
      dealType: dealTypeFilter !== "all" ? dealTypeFilter : undefined,
      indication: indicationFilter || undefined,
      territory: territoryFilter !== "all" ? territoryFilter : undefined,
      dateFrom: dateFromFilter || undefined,
      dateTo: dateToFilter || undefined,
      company: companyFilter || undefined,
      limit: 200,
    },
    { enabled: showExternal, refetchOnWindowFocus: false, retry: false, refetchInterval: 5 * 60 * 1000 }
  );

  // Track last refresh time
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  useEffect(() => {
    if (extQuery.dataUpdatedAt) setLastRefreshed(new Date(extQuery.dataUpdatedAt));
  }, [extQuery.dataUpdatedAt]);

  // Build search query for loadMore calls
  const extSearchQuery = useMemo(() => {
    const parts: string[] = [];
    if (taFilter !== "all") parts.push(taFilter);
    if (modalityFilter !== "all") parts.push(modalityFilter);
    if (stageFilter !== "all") parts.push(stageFilter.replace(/_/g, " "));
    if (dealTypeFilter !== "all") parts.push(dealTypeFilter.replace(/_/g, " "));
    if (indicationFilter) parts.push(indicationFilter);
    if (companyFilter) parts.push(companyFilter);
    return parts.length > 0
      ? parts.join(" ") + " pharma licensing"
      : "pharma licensing deal collaboration";
  }, [taFilter, modalityFilter, stageFilter, dealTypeFilter, indicationFilter, companyFilter]);

  // Init tokens/counts from extQuery
  useEffect(() => {
    if (!extQuery.data) return;
    const d = extQuery.data;
    setNextTokens({
      sec_edgar: d.secEdgar?.nextToken ?? null,
      clinical_trials: d.clinicalTrials?.nextToken ?? null,
      patents: d.patents?.nextToken ?? null,
      pubmed: d.pubmed?.nextToken ?? null,
    });
    setTotalCounts({
      sec_edgar: d.secEdgar?.totalCount ?? null,
      clinical_trials: d.clinicalTrials?.totalCount ?? null,
      patents: d.patents?.totalCount ?? null,
      pubmed: d.pubmed?.totalCount ?? null,
    });
    setExtraResults({});
  }, [extQuery.data]);

  const handleLoadMore = async (source: "sec_edgar" | "clinical_trials" | "patents" | "pubmed") => {
    const token = nextTokens[source];
    if (!token) return;
    setLoadingMore((p) => ({ ...p, [source]: true }));
    try {
      const result = await loadMoreQuery.mutateAsync({
        source,
        query: extSearchQuery,
        nextToken: token,
        limit: 200,
      });
      setExtraResults((p) => ({
        ...p,
        [source]: [...(p[source] ?? []), ...result.data],
      }));
      setNextTokens((p) => ({ ...p, [source]: result.nextToken ?? null }));
      if (result.totalCount != null) {
        setTotalCounts((p) => ({ ...p, [source]: result.totalCount }));
      }
    } catch (e) {
      console.error(`Load more ${source} failed:`, e);
    } finally {
      setLoadingMore((p) => ({ ...p, [source]: false }));
    }
  };

  // Merge initial + extra results
  const extEdgar = [...(extQuery.data?.secEdgar?.data ?? []), ...(extraResults.sec_edgar ?? [])] as any[];
  const extTrials = [...(extQuery.data?.clinicalTrials?.data ?? []), ...(extraResults.clinical_trials ?? [])] as any[];
  const extPatents = [...(extQuery.data?.patents?.data ?? []), ...(extraResults.patents ?? [])] as any[];
  const extPubmed = [...(extQuery.data?.pubmed?.data ?? []), ...(extraResults.pubmed ?? [])] as any[];
  const extNews = (extQuery.data?.news?.data ?? []) as any[];

  const totalExtResults = extEdgar.length + extTrials.length + extPatents.length + extPubmed.length + extNews.length;

  // ─── Parse financial signals from external text ───
  const parsedSignals = useMemo(() => {
    if (!showExternal) return [];
    return [...parseNewsSignals(extNews), ...parseEdgarSignals(extEdgar)];
  }, [extNews, extEdgar, showExternal]);

  // ─── WORLDWIDE PUBLIC DEALS (150+ from web sources) ───
  const wwBenchmarks = useMemo(() => {
    return computeWorldwideBenchmarks(WORLDWIDE_DEALS, {
      therapeuticArea: taFilter !== "all" ? taFilter : undefined,
      stage: stageFilter !== "all" ? stageFilter : undefined,
      modality: modalityFilter !== "all" ? modalityFilter : undefined,
      dealType: dealTypeFilter !== "all" ? (
        dealTypeFilter === "OUT_LICENSE" || dealTypeFilter === "IN_LICENSE" ? "LICENSE" :
        dealTypeFilter === "COLLABORATION" ? "COLLABORATION" :
        dealTypeFilter === "M_AND_A" ? "M_AND_A" : "OPTION"
      ) : undefined,
      indication: indicationFilter || undefined,
      geography: territoryFilter !== "all" ? territoryFilter : undefined,
      dateFrom: dateFromFilter || undefined,
      dateTo: dateToFilter || undefined,
      company: companyFilter || undefined,
      _matchTA: matchesTA,
      _matchModality: matchesModality,
    });
  }, [taFilter, stageFilter, modalityFilter, dealTypeFilter, indicationFilter, territoryFilter, dateFromFilter, dateToFilter, companyFilter]);

  // ─── External Market Intelligence ───
  const extIntel = useMemo(() => {
    const phaseCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    const sponsorCounts: Record<string, number> = {};
    extTrials.forEach((t: any) => {
      const ph = t.phase || "N/A";
      phaseCounts[ph] = (phaseCounts[ph] || 0) + 1;
      const st = t.status || "Unknown";
      statusCounts[st] = (statusCounts[st] || 0) + 1;
      if (t.sponsor) sponsorCounts[t.sponsor] = (sponsorCounts[t.sponsor] || 0) + 1;
    });
    const assigneeCounts: Record<string, number> = {};
    extPatents.forEach((p: any) => {
      if (p.assigneeOrganization) assigneeCounts[p.assigneeOrganization] = (assigneeCounts[p.assigneeOrganization] || 0) + 1;
    });
    const pubYears: Record<string, number> = {};
    const journalCounts: Record<string, number> = {};
    extPubmed.forEach((a: any) => {
      if (a.publicationDate) { const yr = a.publicationDate.slice(0, 4); pubYears[yr] = (pubYears[yr] || 0) + 1; }
      if (a.journal) journalCounts[a.journal] = (journalCounts[a.journal] || 0) + 1;
    });
    const newsSources: Record<string, number> = {};
    extNews.forEach((n: any) => { if (n.source) newsSources[n.source] = (newsSources[n.source] || 0) + 1; });

    const sortedEntries = (obj: Record<string, number>, max = 8) =>
      Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, max);

    const activeTrials = (statusCounts["RECRUITING"] || 0) + (statusCounts["ACTIVE_NOT_RECRUITING"] || 0) + (statusCounts["NOT_YET_RECRUITING"] || 0) + (statusCounts["ENROLLING_BY_INVITATION"] || 0);

    return {
      phaseDistribution: sortedEntries(phaseCounts),
      statusDistribution: sortedEntries(statusCounts),
      topSponsors: sortedEntries(sponsorCounts, 6),
      topAssignees: sortedEntries(assigneeCounts, 6),
      pubYears: sortedEntries(pubYears, 10).sort((a, b) => a[0].localeCompare(b[0])),
      topJournals: sortedEntries(journalCounts, 6),
      newsSources: sortedEntries(newsSources, 6),
      activeTrials,
      completedTrials: statusCounts["COMPLETED"] || 0,
      totalTrials: extTrials.length,
      totalPatents: extPatents.length,
      totalFilings: extEdgar.length,
      totalPubs: extPubmed.length,
      totalNews: extNews.length,
    };
  }, [extTrials, extPatents, extEdgar, extPubmed, extNews]);

  // ─── UNIFIED STATS: DB + parsed external + worldwide public data ───
  const stats = useMemo(() => {
    const dbUpfronts = filteredDeals.filter((d) => d.upfrontPayment != null).map((d) => d.upfrontPayment!);
    const extUpfronts = parsedSignals.filter((s) => s.upfrontPayment != null).map((s) => s.upfrontPayment!);
    const wwUpfronts = wwBenchmarks.deals.filter((d) => d.upfrontPayment != null).map((d) => d.upfrontPayment!);
    const allUpfronts = [...dbUpfronts, ...extUpfronts, ...wwUpfronts].sort((a, b) => a - b);

    const dbTotals = filteredDeals.filter((d) => d.totalDealValue != null).map((d) => d.totalDealValue!);
    const extTotals = parsedSignals.filter((s) => s.totalDealValue != null).map((s) => s.totalDealValue!);
    const wwTotals = wwBenchmarks.deals.filter((d) => d.totalDealValue != null).map((d) => d.totalDealValue!);
    const allTotals = [...dbTotals, ...extTotals, ...wwTotals].sort((a, b) => a - b);

    const dbRoyaltyLows = filteredDeals.filter((d) => d.royaltyRangeLow != null).map((d) => d.royaltyRangeLow!);
    const extRoyaltyLows = parsedSignals.filter((s) => s.royaltyLow != null).map((s) => s.royaltyLow!);
    const wwRoyaltyLows = wwBenchmarks.deals.filter((d) => d.royaltyLow != null).map((d) => d.royaltyLow!);
    const allRoyaltyLows = [...dbRoyaltyLows, ...extRoyaltyLows, ...wwRoyaltyLows].sort((a, b) => a - b);

    const dbRoyaltyHighs = filteredDeals.filter((d) => d.royaltyRangeHigh != null).map((d) => d.royaltyRangeHigh!);
    const extRoyaltyHighs = parsedSignals.filter((s) => s.royaltyHigh != null).map((s) => s.royaltyHigh!);
    const wwRoyaltyHighs = wwBenchmarks.deals.filter((d) => d.royaltyHigh != null).map((d) => d.royaltyHigh!);
    const allRoyaltyHighs = [...dbRoyaltyHighs, ...extRoyaltyHighs, ...wwRoyaltyHighs].sort((a, b) => a - b);

    // Milestones (DB + worldwide)
    const dbMilestones = filteredDeals.filter((d) => d.developmentMilestones != null || d.commercialMilestones != null).map((d) => (d.developmentMilestones ?? 0) + (d.commercialMilestones ?? 0));
    const wwMilestones = wwBenchmarks.deals.filter((d) => d.milestones != null).map((d) => d.milestones!);
    const allMilestones = [...dbMilestones, ...wwMilestones].sort((a, b) => a - b);

    const median = (arr: number[]) => arr.length === 0 ? 0 : arr[Math.floor(arr.length / 2)];
    const mean = (arr: number[]) => arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

    // Upfront as % of total
    const upfrontPcts = [
      ...filteredDeals.filter(d => d.upfrontPayment && d.totalDealValue).map(d => (d.upfrontPayment! / d.totalDealValue!) * 100),
      ...wwBenchmarks.deals.filter(d => d.upfrontPayment && d.totalDealValue).map(d => (d.upfrontPayment! / d.totalDealValue!) * 100),
    ].sort((a, b) => a - b);

    return {
      upfront: { median: median(allUpfronts), mean: Math.round(mean(allUpfronts)), min: allUpfronts[0] ?? 0, max: allUpfronts[allUpfronts.length - 1] ?? 0, count: allUpfronts.length, dbCount: dbUpfronts.length, extCount: extUpfronts.length, wwCount: wwUpfronts.length },
      total: { median: median(allTotals), mean: Math.round(mean(allTotals)), min: allTotals[0] ?? 0, max: allTotals[allTotals.length - 1] ?? 0, count: allTotals.length, dbCount: dbTotals.length, extCount: extTotals.length, wwCount: wwTotals.length },
      royalty: { medianLow: median(allRoyaltyLows), medianHigh: median(allRoyaltyHighs), rangeLow: allRoyaltyLows[0] ?? 0, rangeHigh: allRoyaltyHighs[allRoyaltyHighs.length - 1] ?? 0, count: allRoyaltyLows.length, dbCount: dbRoyaltyLows.length, extCount: extRoyaltyLows.length, wwCount: wwRoyaltyLows.length },
      milestones: { median: median(allMilestones), mean: Math.round(mean(allMilestones)), count: allMilestones.length },
      upfrontPct: { median: Math.round(median(upfrontPcts)), mean: Math.round(mean(upfrontPcts)), count: upfrontPcts.length },
    };
  }, [filteredDeals, parsedSignals, wwBenchmarks]);

  // ─── Chart data: upfront payments (DB + parsed + worldwide) ───
  const upfrontChartData = useMemo(() => {
    const dbBars = filteredDeals
      .filter((d) => d.upfrontPayment != null)
      .map((d) => ({ name: d.title.length > 25 ? d.title.slice(0, 25) + "..." : d.title, upfront: d.upfrontPayment!, source: "db" as const }));
    const extBars = parsedSignals
      .filter((s) => s.upfrontPayment != null)
      .map((s) => ({ name: s.title.length > 25 ? s.title.slice(0, 25) + "..." : s.title, upfront: s.upfrontPayment!, source: s.source }));
    const wwBars = wwBenchmarks.deals
      .filter((d) => d.upfrontPayment != null)
      .map((d) => ({ name: d.title.length > 25 ? d.title.slice(0, 25) + "..." : d.title, upfront: d.upfrontPayment!, source: "worldwide" as const }));
    return [...dbBars, ...extBars, ...wwBars].sort((a, b) => a.upfront - b.upfront);
  }, [filteredDeals, parsedSignals, wwBenchmarks]);

  // ─── Royalty data (DB + parsed + worldwide) ───
  const royaltyData = useMemo(() => {
    const dbRows = filteredDeals
      .filter((d) => d.royaltyRangeLow != null && d.royaltyRangeHigh != null)
      .map((d) => ({ name: d.title.length > 20 ? d.title.slice(0, 20) + "..." : d.title, fullTitle: d.title, low: d.royaltyRangeLow!, high: d.royaltyRangeHigh!, source: "db" as const }));
    const extRows = parsedSignals
      .filter((s) => s.royaltyLow != null && s.royaltyHigh != null)
      .map((s) => ({ name: s.title.length > 20 ? s.title.slice(0, 20) + "..." : s.title, fullTitle: s.title, low: s.royaltyLow!, high: s.royaltyHigh!, source: s.source }));
    const wwRows = wwBenchmarks.deals
      .filter((d) => d.royaltyLow != null && d.royaltyHigh != null)
      .map((d) => ({ name: d.title.length > 20 ? d.title.slice(0, 20) + "..." : d.title, fullTitle: d.title, low: d.royaltyLow!, high: d.royaltyHigh!, source: "worldwide" as const }));
    return [...dbRows, ...extRows, ...wwRows].sort((a, b) => a.low - b.low);
  }, [filteredDeals, parsedSignals, wwBenchmarks]);

  // ─── Unified deal rows for the big table ───
  const unifiedDeals = useMemo(() => {
    const dbRows = filteredDeals.map((d) => ({
      source: "database" as const,
      title: d.title,
      company: `${d.licensorName} / ${d.licenseeName}`,
      date: d.announcedDate,
      upfront: d.upfrontPayment,
      totalValue: d.totalDealValue,
      devMilestones: d.developmentMilestones,
      commMilestones: d.commercialMilestones,
      royaltyLow: d.royaltyRangeLow,
      royaltyHigh: d.royaltyRangeHigh,
      confidence: d.confidence,
      link: `/deals/${d.id}`,
      stage: d.developmentStage,
      ta: d.therapeuticArea,
      indication: d.indication ?? null,
      modality: d.modality ?? null,
    }));
    const extRows = parsedSignals.map((s) => ({
      source: s.source,
      title: s.title,
      company: s.company ?? "\u2014",
      date: s.date ?? "\u2014",
      upfront: s.upfrontPayment ?? null,
      totalValue: s.totalDealValue ?? null,
      devMilestones: null as number | null,
      commMilestones: null as number | null,
      royaltyLow: s.royaltyLow ?? null,
      royaltyHigh: s.royaltyHigh ?? null,
      confidence: s.confidence,
      link: s.link ?? "",
      stage: null as string | null,
      ta: null as string | null,
      indication: null as string | null,
      modality: null as string | null,
    }));
    const wwRows = wwBenchmarks.deals.map((d) => ({
      source: "worldwide" as const,
      title: d.title,
      company: `${d.licensor} / ${d.licensee}`,
      date: d.announcedDate,
      upfront: d.upfrontPayment ?? null,
      totalValue: d.totalDealValue ?? null,
      devMilestones: d.milestones ?? null,
      commMilestones: null as number | null,
      royaltyLow: d.royaltyLow ?? null,
      royaltyHigh: d.royaltyHigh ?? null,
      confidence: 1,
      link: d.sourceUrl ?? "",
      indication: d.indication ?? null,
      modality: d.modality ?? null,
      stage: d.stage as string | null,
      ta: d.therapeuticArea as string | null,
    }));
    let all = [...dbRows, ...extRows, ...wwRows];
    // Apply table search
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      all = all.filter((r) =>
        r.title.toLowerCase().includes(q) ||
        r.company.toLowerCase().includes(q) ||
        (r.ta ?? "").toLowerCase().includes(q) ||
        (r.stage ?? "").toLowerCase().includes(q) ||
        (r.indication ?? "").toLowerCase().includes(q) ||
        (r.modality ?? "").toLowerCase().includes(q) ||
        r.source.toLowerCase().includes(q)
      );
    }
    all.sort((a, b) => {
      const aVal = sortField === "title" ? a.title : sortField === "date" ? a.date : sortField === "upfront" ? (a.upfront ?? -1) : sortField === "total" ? (a.totalValue ?? -1) : sortField === "royalty" ? (a.royaltyLow ?? -1) : a.source;
      const bVal = sortField === "title" ? b.title : sortField === "date" ? b.date : sortField === "upfront" ? (b.upfront ?? -1) : sortField === "total" ? (b.totalValue ?? -1) : sortField === "royalty" ? (b.royaltyLow ?? -1) : b.source;
      if (typeof aVal === "number" && typeof bVal === "number") return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      return sortDir === "asc" ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
    return all;
  }, [filteredDeals, parsedSignals, wwBenchmarks, sortField, sortDir, tableSearch]);

  const isFiltered = taFilter !== "all" || stageFilter !== "all" || modalityFilter !== "all" || dealTypeFilter !== "all" || indicationFilter !== "" || territoryFilter !== "all" || dateFromFilter !== "" || dateToFilter !== "" || companyFilter !== "";

  const clearAllFilters = () => {
    setTaFilter("all"); setStageFilter("all"); setModalityFilter("all"); setDealTypeFilter("all");
    setIndicationFilter(""); setTerritoryFilter("all"); setDateFromFilter(""); setDateToFilter(""); setCompanyFilter("");
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  const sourceColor = (s: string) => s === "database" ? "bg-[#F97316] text-white" : s === "worldwide" ? "bg-[#10B981] text-white" : s === "news" ? "bg-[#06B6D4] text-white" : "bg-[#3B82F6] text-white";
  const sourceLabel = (s: string) => s === "database" ? "DB" : s === "worldwide" ? "WW" : s === "news" ? "News" : "SEC";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E]">Deal Intelligence &amp; Benchmarks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Financial benchmarks from {filteredDeals.length} DB + {wwBenchmarks.totalDeals} worldwide public + {parsedSignals.length} parsed &mdash; <span className="font-semibold text-[#F97316]">{unifiedDeals.length} total deals</span>
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] text-muted-foreground">
              Live &mdash; external data refreshes every 5 min &middot; Last updated {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {unifiedDeals.length} total deals
          </Badge>
          {isFiltered && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              Clear all filters
            </Button>
          )}
        </div>
      </div>

      {/* Filters — Row 1 */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground font-medium">Filter by:</span>
            <Select value={taFilter} onValueChange={(v) => setTaFilter(v ?? "all")}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Therapeutic Area" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Therapeutic Areas</SelectItem>
                {THERAPEUTIC_AREAS.map((area) => (
                  <SelectItem key={area} value={area}>{area} {taCounts[area] ? `(${taCounts[area]})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stageFilter} onValueChange={(v) => setStageFilter(v ?? "all")}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Stage" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {DEAL_STAGES.map((s) => (<SelectItem key={s} value={s}>{STAGE_LABELS[s]} {stageCounts[s] ? `(${stageCounts[s]})` : ""}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={modalityFilter} onValueChange={(v) => setModalityFilter(v ?? "all")}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Modality" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modalities</SelectItem>
                {MODALITIES.map((m) => (<SelectItem key={m} value={m}>{m} {modalityCounts[m] ? `(${modalityCounts[m]})` : ""}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={dealTypeFilter} onValueChange={(v) => setDealTypeFilter(v ?? "all")}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Deal Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Deal Types</SelectItem>
                {DEAL_TYPES.map((t) => (<SelectItem key={t} value={t}>{DEAL_TYPE_LABELS[t]} {dealTypeCounts[t] ? `(${dealTypeCounts[t]})` : ""}</SelectItem>))}
              </SelectContent>
            </Select>
            <div className="ml-auto flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showExternal} onChange={(e) => setShowExternal(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[#F97316] focus:ring-[#F97316] accent-[#F97316]" />
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" /> External Sources</span>
              </label>
            </div>
          </div>
          {/* Filters — Row 2 */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground font-medium w-[56px]" />
            <div className="relative w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Indication..."
                value={indicationFilter}
                onChange={(e) => setIndicationFilter(e.target.value)}
                className="pl-7 h-9 text-xs"
                list="indication-opts"
              />
              <datalist id="indication-opts">
                {allIndications.map((i) => <option key={i} value={i} />)}
              </datalist>
            </div>
            <Select value={territoryFilter} onValueChange={(v) => setTerritoryFilter(v ?? "all")}>
              <SelectTrigger className="w-[200px]">
                <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-muted-foreground" /><SelectValue placeholder="Geography" /></div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Geographies</SelectItem>
                {allGeographies.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <Input type="date" value={dateFromFilter} onChange={(e) => setDateFromFilter(e.target.value)} className="h-9 w-[140px] text-xs" placeholder="From" />
              <span className="text-xs text-muted-foreground">–</span>
              <Input type="date" value={dateToFilter} onChange={(e) => setDateToFilter(e.target.value)} className="h-9 w-[140px] text-xs" placeholder="To" />
            </div>
            <div className="relative w-[180px]">
              <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Company..."
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="pl-7 h-9 text-xs"
                list="company-opts"
              />
              <datalist id="company-opts">
                {allCompanies.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── UNIFIED STAT CARDS (DB + worldwide + parsed) ─── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <BigStatCard title="Median Upfront" value={formatCurrency(stats.upfront.median)} subtitle={`Range: ${formatCurrency(stats.upfront.min)} – ${formatCurrency(stats.upfront.max)}`} detail={`Mean: ${formatCurrency(stats.upfront.mean)}`} n={stats.upfront.count} dbCount={stats.upfront.dbCount} extCount={stats.upfront.extCount} wwCount={stats.upfront.wwCount} loading={showExternal && extQuery.isFetching} />
        <BigStatCard title="Median Total Value" value={formatCurrency(stats.total.median)} subtitle={`Range: ${formatCurrency(stats.total.min)} – ${formatCurrency(stats.total.max)}`} detail={`Mean: ${formatCurrency(stats.total.mean)}`} n={stats.total.count} dbCount={stats.total.dbCount} extCount={stats.total.extCount} wwCount={stats.total.wwCount} loading={showExternal && extQuery.isFetching} />
        <BigStatCard title="Median Milestones" value={formatCurrency(stats.milestones.median)} subtitle={`Mean: ${formatCurrency(stats.milestones.mean)}`} detail={`${stats.milestones.count} deals with milestone data`} n={stats.milestones.count} loading={false} />
        <BigStatCard title="Royalty Range" value={`${stats.royalty.medianLow}–${stats.royalty.medianHigh}%`} subtitle={`Full range: ${stats.royalty.rangeLow}% – ${stats.royalty.rangeHigh}%`} detail={`${stats.royalty.count} deals with royalty data`} n={stats.royalty.count} dbCount={stats.royalty.dbCount} extCount={stats.royalty.extCount} wwCount={stats.royalty.wwCount} loading={showExternal && extQuery.isFetching} />
        <BigStatCard title="Upfront % of Total" value={`~${stats.upfrontPct.median}%`} subtitle={`Mean: ${stats.upfrontPct.mean}%`} detail={`${stats.upfrontPct.count} deals with both values`} n={stats.upfrontPct.count} loading={false} />
        <BigStatCard title="Worldwide Deals" value={`${wwBenchmarks.totalDeals}`} subtitle={`From 200+ public sources`} detail={`${wwBenchmarks.byTherapeuticArea.length} TAs · ${wwBenchmarks.byStage.length} stages`} n={WORLDWIDE_DEALS.length} loading={false} />
      </div>

      {/* ─── BENCHMARK BREAKDOWNS (by TA, Stage, Modality) ─── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5 text-[#F97316]" /> By Therapeutic Area</CardTitle>
            <CardDescription className="text-xs">Median upfront & total by TA ({wwBenchmarks.byTherapeuticArea.length} areas)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {wwBenchmarks.byTherapeuticArea.map((row) => (
                <div key={row.therapeuticArea} className="flex items-center gap-2 text-xs">
                  <span className="w-[100px] truncate font-medium" title={row.therapeuticArea}>{row.therapeuticArea}</span>
                  <div className="flex-1 h-4 rounded bg-muted overflow-hidden flex">
                    {row.medianUpfront > 0 && <div className="h-full bg-[#F97316]/70 flex items-center justify-center text-[8px] text-white font-mono" style={{ width: `${Math.min((row.medianUpfront / Math.max(...wwBenchmarks.byTherapeuticArea.map(r => r.medianTotal || 1))) * 100, 100)}%` }}>{formatCurrency(row.medianUpfront)}</div>}
                    {row.medianTotal > row.medianUpfront && <div className="h-full bg-[#3B82F6]/50 flex items-center justify-center text-[8px] text-white font-mono" style={{ width: `${Math.min(((row.medianTotal - row.medianUpfront) / Math.max(...wwBenchmarks.byTherapeuticArea.map(r => r.medianTotal || 1))) * 100, 100)}%` }}>{formatCurrency(row.medianTotal)}</div>}
                  </div>
                  <Badge variant="secondary" className="text-[9px] h-4 px-1 shrink-0">{row.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5"><FlaskConical className="h-3.5 w-3.5 text-[#10B981]" /> By Development Stage</CardTitle>
            <CardDescription className="text-xs">How deal economics scale with stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {wwBenchmarks.byStage.map((row) => {
                const stageLabel = row.stage === "DISCOVERY" ? "Discovery" : row.stage === "PRECLINICAL" ? "Preclinical" : row.stage === "PHASE_1" ? "Phase 1" : row.stage === "PHASE_2" ? "Phase 2" : row.stage === "PHASE_3" ? "Phase 3" : "Approved";
                const maxTotal = Math.max(...wwBenchmarks.byStage.map(r => r.medianTotal || 1));
                return (
                  <div key={row.stage}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium">{stageLabel}</span>
                      <span className="text-muted-foreground">{row.count} deals</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-6 rounded bg-muted overflow-hidden relative">
                        <div className="absolute inset-y-0 left-0 bg-[#10B981]/60 rounded-l flex items-center pl-1.5 text-[9px] text-white font-mono" style={{ width: `${(row.medianUpfront / maxTotal) * 100}%`, minWidth: row.medianUpfront > 0 ? "48px" : "0" }}>
                          {row.medianUpfront > 0 ? `↑${formatCurrency(row.medianUpfront)}` : ""}
                        </div>
                        <div className="absolute inset-y-0 left-0 bg-[#3B82F6]/30 rounded flex items-center justify-end pr-1.5 text-[9px] text-foreground font-mono" style={{ width: `${(row.medianTotal / maxTotal) * 100}%`, minWidth: row.medianTotal > 0 ? "48px" : "0" }}>
                          {formatCurrency(row.medianTotal)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center gap-4 mt-1 text-[9px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[#10B981]/60 inline-block" /> Upfront</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[#3B82F6]/30 inline-block" /> Total Value</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-[#8B5CF6]" /> By Modality</CardTitle>
            <CardDescription className="text-xs">Median deal value by therapeutic modality</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {wwBenchmarks.byModality.filter(r => r.count >= 2).map((row) => {
                const maxTotal = Math.max(...wwBenchmarks.byModality.map(r => r.medianTotal || 1));
                return (
                  <div key={row.modality} className="flex items-center gap-2 text-xs">
                    <span className="w-[110px] truncate font-medium" title={row.modality}>{row.modality}</span>
                    <div className="flex-1 h-4 rounded bg-muted overflow-hidden">
                      <div className="h-full bg-[#8B5CF6]/50 flex items-center pl-1 text-[8px] text-white font-mono" style={{ width: `${(row.medianTotal / maxTotal) * 100}%`, minWidth: row.medianTotal > 0 ? "40px" : "0" }}>
                        {formatCurrency(row.medianTotal)}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[9px] h-4 px-1 shrink-0">{row.count}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Charts row ─── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upfront Payments Comparison</CardTitle>
            <CardDescription>Upfront payment ($M) across all sources</CardDescription>
          </CardHeader>
          <CardContent>
            {upfrontChartData.length > 0 ? (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={upfrontChartData} margin={{ top: 10, right: 10, bottom: 60, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} angle={-45} textAnchor="end" height={70} />
                    <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `$${v / 1000}B` : `$${v}M`} />
                    <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: "8px", fontSize: "12px", color: "#1A1A2E" }} formatter={(value: any) => [formatCurrency(value as number), "Upfront"]} />
                    <ReferenceLine y={stats.upfront.median} stroke="#F59E0B" strokeDasharray="5 5" label={{ value: `Median: ${formatCurrency(stats.upfront.median)}`, fill: "#F59E0B", fontSize: 11, position: "insideTopRight" }} />
                    <Bar dataKey="upfront" radius={[4, 4, 0, 0]} barSize={28}>
                      {upfrontChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.source === "db" ? "#F97316" : entry.source === "worldwide" ? "#10B981" : entry.source === "news" ? "#06B6D4" : "#3B82F6"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[320px] text-sm text-muted-foreground">No upfront payment data available</div>
            )}
            {upfrontChartData.length > 0 && (
              <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground justify-center">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#F97316] inline-block" /> Database</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#10B981] inline-block" /> Worldwide Public</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#06B6D4] inline-block" /> News</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#3B82F6] inline-block" /> SEC Filing</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Royalty Ranges</CardTitle>
            <CardDescription>Low-to-high royalty range per deal (%)</CardDescription>
          </CardHeader>
          <CardContent>
            {royaltyData.length > 0 ? (
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
                {royaltyData.map((deal, i) => {
                  const maxVal = 30;
                  const leftPct = (deal.low / maxVal) * 100;
                  const widthPct = ((deal.high - deal.low) / maxVal) * 100;
                  const barColor = deal.source === "db" ? "#F97316" : deal.source === "worldwide" ? "#10B981" : deal.source === "news" ? "#06B6D4" : "#3B82F6";
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate max-w-[180px]" title={deal.fullTitle}>{deal.name}</span>
                        <span className="font-mono text-foreground">{deal.low}% \u2013 {deal.high}%</span>
                      </div>
                      <div className="relative h-3 w-full rounded-full bg-muted">
                        <div className="absolute top-0 bottom-0 w-px bg-[#F59E0B]/50 z-10" style={{ left: `${(stats.royalty.medianLow / maxVal) * 100}%` }} />
                        <div className="absolute top-0.5 bottom-0.5 rounded-full" style={{ left: `${leftPct}%`, width: `${widthPct}%`, background: barColor }} />
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
                  <span>0%</span><span>5%</span><span>10%</span><span>15%</span><span>20%</span><span>25%</span><span>30%</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[320px] text-sm text-muted-foreground">No royalty data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── External Market Intelligence Panels ─── */}
      {showExternal && !extQuery.isFetching && totalExtResults > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="relative overflow-hidden border-[#F97316]/20"><CardContent className="pt-3 pb-3"><p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total Signals</p><p className="text-2xl font-bold font-mono text-[#F97316]">{totalExtResults.toLocaleString()}</p><p className="text-[10px] text-muted-foreground mt-1">from 6 public sources</p></CardContent><div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F97316]/30" /></Card>
            <Card className="relative overflow-hidden border-[#10B981]/20"><CardContent className="pt-3 pb-3"><p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Clinical Trials</p><p className="text-2xl font-bold font-mono text-[#10B981]">{extIntel.totalTrials}</p><p className="text-[10px] text-muted-foreground mt-1">{extIntel.activeTrials} active &middot; {extIntel.completedTrials} completed</p></CardContent><div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#10B981]/30" /></Card>
            <Card className="relative overflow-hidden border-[#8B5CF6]/20"><CardContent className="pt-3 pb-3"><p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Patents</p><p className="text-2xl font-bold font-mono text-[#8B5CF6]">{extIntel.totalPatents}</p><p className="text-[10px] text-muted-foreground mt-1">{extIntel.topAssignees.length > 0 ? `Top: ${extIntel.topAssignees[0][0].slice(0, 20)}` : "worldwide IP filings"}</p></CardContent><div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#8B5CF6]/30" /></Card>
            <Card className="relative overflow-hidden border-[#EC4899]/20"><CardContent className="pt-3 pb-3"><p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Publications</p><p className="text-2xl font-bold font-mono text-[#EC4899]">{extIntel.totalPubs}</p><p className="text-[10px] text-muted-foreground mt-1">{totalCounts.pubmed ? `of ${totalCounts.pubmed.toLocaleString()} total` : "PubMed + Europe PMC"}</p></CardContent><div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#EC4899]/30" /></Card>
            <Card className="relative overflow-hidden border-[#3B82F6]/20"><CardContent className="pt-3 pb-3"><p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">SEC Filings</p><p className="text-2xl font-bold font-mono text-[#3B82F6]">{extIntel.totalFilings}</p><p className="text-[10px] text-muted-foreground mt-1">{parsedSignals.filter(s => s.source === "sec_edgar").length} with deal values</p></CardContent><div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#3B82F6]/30" /></Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {extIntel.phaseDistribution.length > 0 && (
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5"><FlaskConical className="h-3.5 w-3.5 text-[#10B981]" /> Trial Phase Distribution</CardTitle><CardDescription className="text-xs">Development stage breakdown from {extIntel.totalTrials} trials</CardDescription></CardHeader><CardContent><div className="space-y-2">{extIntel.phaseDistribution.map(([phase, count]) => { const pct = extIntel.totalTrials > 0 ? (count / extIntel.totalTrials) * 100 : 0; const phaseColor = phase.includes("PHASE3") ? "#10B981" : phase.includes("PHASE2") ? "#3B82F6" : phase.includes("PHASE1") ? "#F59E0B" : phase.includes("PHASE4") ? "#8B5CF6" : "#94A3B8"; return (<div key={phase}><div className="flex items-center justify-between text-xs mb-1"><span className="text-muted-foreground">{phase.replace(/_/g, " ")}</span><span className="font-mono font-medium">{count} <span className="text-muted-foreground">({pct.toFixed(0)}%)</span></span></div><div className="h-2 w-full rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: phaseColor }} /></div></div>); })}</div></CardContent></Card>
            )}
            {extIntel.topSponsors.length > 0 && (
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-[#F97316]" /> Most Active Trial Sponsors</CardTitle><CardDescription className="text-xs">Companies running the most clinical trials</CardDescription></CardHeader><CardContent><div className="space-y-2">{extIntel.topSponsors.map(([name, count], i) => { const maxC = extIntel.topSponsors[0][1]; const pct = maxC > 0 ? (count / maxC) * 100 : 0; return (<div key={name} className="flex items-center gap-2"><span className="text-xs font-mono text-muted-foreground w-4">{i + 1}.</span><div className="flex-1 min-w-0"><div className="flex items-center justify-between text-xs mb-0.5"><span className="truncate font-medium" title={name}>{name}</span><span className="font-mono text-muted-foreground ml-2 shrink-0">{count}</span></div><div className="h-1.5 w-full rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-[#F97316]" style={{ width: `${pct}%`, opacity: 1 - i * 0.1 }} /></div></div></div>); })}</div></CardContent></Card>
            )}
            {extIntel.topAssignees.length > 0 && (
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5"><Scale className="h-3.5 w-3.5 text-[#8B5CF6]" /> Top Patent Holders</CardTitle><CardDescription className="text-xs">Organizations with the most IP filings</CardDescription></CardHeader><CardContent><div className="space-y-2">{extIntel.topAssignees.map(([name, count], i) => { const maxC = extIntel.topAssignees[0][1]; const pct = maxC > 0 ? (count / maxC) * 100 : 0; return (<div key={name} className="flex items-center gap-2"><span className="text-xs font-mono text-muted-foreground w-4">{i + 1}.</span><div className="flex-1 min-w-0"><div className="flex items-center justify-between text-xs mb-0.5"><span className="truncate font-medium" title={name}>{name}</span><span className="font-mono text-muted-foreground ml-2 shrink-0">{count}</span></div><div className="h-1.5 w-full rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-[#8B5CF6]" style={{ width: `${pct}%`, opacity: 1 - i * 0.1 }} /></div></div></div>); })}</div></CardContent></Card>
            )}
            {extIntel.pubYears.length > 0 && (
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-[#EC4899]" /> Publication Trend</CardTitle><CardDescription className="text-xs">Research publications by year ({extIntel.totalPubs} total)</CardDescription></CardHeader><CardContent><div className="space-y-1.5">{extIntel.pubYears.map(([year, count]) => { const maxC = Math.max(...extIntel.pubYears.map((e) => e[1])); const pct = maxC > 0 ? (count / maxC) * 100 : 0; return (<div key={year} className="flex items-center gap-2"><span className="text-xs font-mono text-muted-foreground w-10">{year}</span><div className="flex-1 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-[#EC4899]" style={{ width: `${pct}%` }} /></div><span className="text-xs font-mono text-muted-foreground w-8 text-right">{count}</span></div>); })}</div>{extIntel.topJournals.length > 0 && (<div className="mt-3 pt-3 border-t border-border/50"><p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Top Journals</p><div className="flex flex-wrap gap-1">{extIntel.topJournals.map(([j, c]) => (<Badge key={j} variant="outline" className="text-[9px] h-5 px-1.5">{j.length > 30 ? j.slice(0, 30) + "..." : j} ({c})</Badge>))}</div></div>)}</CardContent></Card>
            )}
          </div>

          {extIntel.statusDistribution.length > 0 && (
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-[#10B981]" /> Clinical Trial Status Overview</CardTitle><CardDescription className="text-xs">Current status of {extIntel.totalTrials} trials &mdash; {extIntel.activeTrials} actively recruiting</CardDescription></CardHeader><CardContent><div className="flex flex-wrap gap-2">{extIntel.statusDistribution.map(([status, count]) => { const pct = extIntel.totalTrials > 0 ? ((count / extIntel.totalTrials) * 100).toFixed(0) : "0"; const color = status === "RECRUITING" ? "border-[#10B981] text-[#10B981] bg-[#10B981]/5" : status === "COMPLETED" ? "border-[#3B82F6] text-[#3B82F6] bg-[#3B82F6]/5" : status === "ACTIVE_NOT_RECRUITING" ? "border-[#F59E0B] text-[#F59E0B] bg-[#F59E0B]/5" : status === "TERMINATED" ? "border-[#EF4444] text-[#EF4444] bg-[#EF4444]/5" : "border-border text-muted-foreground bg-muted/30"; return (<div key={status} className={`rounded-lg border px-3 py-2 text-center min-w-[100px] ${color}`}><p className="text-lg font-bold font-mono">{count}</p><p className="text-[10px] font-medium">{status.replace(/_/g, " ")}</p><p className="text-[9px] opacity-70">{pct}%</p></div>); })}</div></CardContent></Card>
          )}

          {extIntel.newsSources.length > 0 && (
            <Card><CardContent className="pt-4 pb-4"><div className="flex items-center gap-2 mb-3"><Newspaper className="h-3.5 w-3.5 text-[#06B6D4]" /><span className="text-sm font-medium">News Coverage</span><Badge variant="secondary" className="text-[10px] h-5">{extIntel.totalNews} articles</Badge>{parsedSignals.filter(s => s.source === "news").length > 0 && <Badge className="text-[10px] h-5 bg-[#06B6D4]/10 text-[#06B6D4] border-[#06B6D4]/30">{parsedSignals.filter(s => s.source === "news").length} with deal values</Badge>}</div><div className="flex flex-wrap gap-1.5">{extIntel.newsSources.map(([source, count]) => (<Badge key={source} variant="outline" className="text-xs px-2 py-0.5 border-[#06B6D4]/30">{source} ({count})</Badge>))}</div></CardContent></Card>
          )}
        </>
      )}

      {showExternal && extQuery.isFetching && (
        <Card><CardContent className="pt-6 pb-6"><div className="flex items-center justify-center gap-3"><Loader2 className="h-5 w-5 animate-spin text-[#F97316]" /><span className="text-sm text-muted-foreground">Loading external market intelligence...</span></div></CardContent></Card>
      )}

      {/* ─── UNIFIED DEAL TABLE ─── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">All Deals — Worldwide</CardTitle>
              <CardDescription>{unifiedDeals.length} deals{tableSearch ? ` matching "${tableSearch}"` : ""} from DB + public sources + parsed signals</CardDescription>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative w-[240px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search deals, companies, areas..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
                {tableSearch && (
                  <button onClick={() => setTableSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs">✕</button>
                )}
              </div>
              <Badge className={`text-[10px] h-5 ${sourceColor("database")}`}>DB: {filteredDeals.length}</Badge>
              <Badge className={`text-[10px] h-5 ${sourceColor("worldwide")}`}>WW: {wwBenchmarks.totalDeals}</Badge>
              {parsedSignals.filter(s => s.source === "news").length > 0 && <Badge className={`text-[10px] h-5 ${sourceColor("news")}`}>News: {parsedSignals.filter(s => s.source === "news").length}</Badge>}
              {parsedSignals.filter(s => s.source === "sec_edgar").length > 0 && <Badge className={`text-[10px] h-5 ${sourceColor("sec_edgar")}`}>SEC: {parsedSignals.filter(s => s.source === "sec_edgar").length}</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-8">Src</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("title")}><div className="flex items-center gap-1">Deal <ArrowUpDown className="h-3 w-3" /></div></TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("date")}><div className="flex items-center gap-1">Date <ArrowUpDown className="h-3 w-3" /></div></TableHead>
                <TableHead className="text-right cursor-pointer" onClick={() => handleSort("upfront")}><div className="flex items-center gap-1 justify-end">Upfront <ArrowUpDown className="h-3 w-3" /></div></TableHead>
                <TableHead className="text-right cursor-pointer" onClick={() => handleSort("total")}><div className="flex items-center gap-1 justify-end">Total Value <ArrowUpDown className="h-3 w-3" /></div></TableHead>
                <TableHead className="text-right cursor-pointer" onClick={() => handleSort("royalty")}><div className="flex items-center gap-1 justify-end">Royalty <ArrowUpDown className="h-3 w-3" /></div></TableHead>
                <TableHead>Company</TableHead>
                <TableHead className="text-center">Conf.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unifiedDeals.map((deal, i) => (
                <TableRow key={i} className="group/row">
                  <TableCell>
                    <Badge className={`text-[8px] h-4 px-1 ${sourceColor(deal.source)}`}>{sourceLabel(deal.source)}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[250px]">
                    {deal.source === "database" ? (
                      <Link href={deal.link} className="font-medium group-hover/row:text-[#F97316] transition-colors truncate block">{deal.title}</Link>
                    ) : (
                      <a href={deal.link} target="_blank" rel="noopener noreferrer" className="font-medium group-hover/row:text-[#3B82F6] transition-colors truncate block flex items-center gap-1">
                        {deal.title.length > 60 ? deal.title.slice(0, 60) + "..." : deal.title}
                        <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/30" />
                      </a>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{typeof deal.date === "string" ? deal.date.slice(0, 10) : "\u2014"}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(deal.upfront)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">{formatCurrency(deal.totalValue)}</TableCell>
                  <TableCell className="text-right text-sm">{deal.royaltyLow != null ? `${deal.royaltyLow}–${deal.royaltyHigh}%` : "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">{deal.company}</TableCell>
                  <TableCell className="text-center"><ConfidenceDot value={deal.confidence} /></TableCell>
                </TableRow>
              ))}
              {/* Summary row */}
              {unifiedDeals.length > 0 && (
                <TableRow className="bg-muted/30 hover:bg-muted/50 font-medium border-t-2 border-border">
                  <TableCell />
                  <TableCell className="text-sm">
                    <span className="text-[#F97316]">Median</span>
                    <span className="text-muted-foreground ml-2">(n={stats.upfront.count})</span>
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-right font-mono text-sm text-[#F97316]">{formatCurrency(stats.upfront.median)}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-[#F97316]">{formatCurrency(stats.total.median)}</TableCell>
                  <TableCell className="text-right text-sm text-[#F97316]">{stats.royalty.medianLow}–{stats.royalty.medianHigh}%</TableCell>
                  <TableCell />
                  <TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ─── Raw External Signals (collapsible) ─── */}
      {showExternal && totalExtResults > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <button onClick={() => setExtOpen((p) => !p)} className="flex w-full items-center gap-2 text-left">
              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${extOpen ? "rotate-90" : ""}`} />
              <Globe className="h-4 w-4 text-[#F97316]" />
              <span className="text-sm font-medium">Raw External Signals</span>
              <Badge variant="secondary" className="ml-2 text-[10px] h-5">{totalExtResults} results</Badge>
            </button>
            {extOpen && (
              <div className="mt-4 space-y-4">
                {extEdgar.length > 0 && (<div><p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><FileText className="h-3 w-3 text-[#3B82F6]" /> SEC EDGAR ({extEdgar.length})</p><div className="space-y-1 max-h-[300px] overflow-y-auto">{extEdgar.map((f: any, i: number) => (<a key={i} href={f.documentUrl || "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs hover:bg-muted/50 transition-colors group"><Building2 className="h-3 w-3 text-muted-foreground shrink-0" /><span className="flex-1 truncate group-hover:text-[#3B82F6]">{f.description || f.companyName}</span><Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">{f.form}</Badge><span className="text-muted-foreground shrink-0">{f.filingDate}</span><ExternalLink className="h-3 w-3 text-muted-foreground/30 shrink-0" /></a>))}</div>{nextTokens.sec_edgar && (<Button variant="outline" size="sm" className="mt-2 w-full text-xs" disabled={loadingMore.sec_edgar} onClick={() => handleLoadMore("sec_edgar")}>{loadingMore.sec_edgar ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Loading...</> : <>Load More SEC Filings (showing {extEdgar.length}{totalCounts.sec_edgar ? ` of ${totalCounts.sec_edgar}` : ""})</>}</Button>)}</div>)}
                {extTrials.length > 0 && (<div><p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><FlaskConical className="h-3 w-3 text-[#10B981]" /> Clinical Trials ({extTrials.length})</p><div className="space-y-1 max-h-[300px] overflow-y-auto">{extTrials.map((t: any, i: number) => (<a key={i} href={`https://clinicaltrials.gov/study/${t.nctId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs hover:bg-muted/50 transition-colors group"><span className="flex-1 truncate group-hover:text-[#10B981]">{t.title}</span><Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">{t.phase}</Badge><span className={`text-[10px] font-medium shrink-0 ${t.status === "RECRUITING" ? "text-[#10B981]" : "text-muted-foreground"}`}>{t.status}</span><ExternalLink className="h-3 w-3 text-muted-foreground/30 shrink-0" /></a>))}</div>{nextTokens.clinical_trials && (<Button variant="outline" size="sm" className="mt-2 w-full text-xs" disabled={loadingMore.clinical_trials} onClick={() => handleLoadMore("clinical_trials")}>{loadingMore.clinical_trials ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Loading...</> : <>Load More Trials (showing {extTrials.length}{totalCounts.clinical_trials ? ` of ${totalCounts.clinical_trials}` : ""})</>}</Button>)}</div>)}
                {extPatents.length > 0 && (<div><p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><Scale className="h-3 w-3 text-[#8B5CF6]" /> Patents ({extPatents.length})</p><div className="space-y-1 max-h-[300px] overflow-y-auto">{extPatents.map((p: any, i: number) => (<a key={i} href={p.patentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs hover:bg-muted/50 transition-colors group"><span className="flex-1 truncate group-hover:text-[#8B5CF6]">{p.title}</span><Badge variant="outline" className="text-[9px] h-4 px-1 font-mono shrink-0">US{p.patentNumber}</Badge>{p.assigneeOrganization && <span className="text-muted-foreground shrink-0 max-w-[120px] truncate">{p.assigneeOrganization}</span>}<ExternalLink className="h-3 w-3 text-muted-foreground/30 shrink-0" /></a>))}</div>{nextTokens.patents && (<Button variant="outline" size="sm" className="mt-2 w-full text-xs" disabled={loadingMore.patents} onClick={() => handleLoadMore("patents")}>{loadingMore.patents ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Loading...</> : <>Load More Patents (showing {extPatents.length}{totalCounts.patents ? ` of ${totalCounts.patents}` : ""})</>}</Button>)}</div>)}
                {extPubmed.length > 0 && (<div><p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><BookOpen className="h-3 w-3 text-[#EC4899]" /> Literature ({extPubmed.length})</p><div className="space-y-1 max-h-[300px] overflow-y-auto">{extPubmed.map((a: any, i: number) => (<a key={i} href={a.pubmedUrl || (a.doi ? `https://doi.org/${a.doi}` : "#")} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs hover:bg-muted/50 transition-colors group"><BookOpen className="h-3 w-3 text-muted-foreground shrink-0" /><span className="flex-1 truncate group-hover:text-[#EC4899]">{a.title}</span>{a.journal && <span className="text-muted-foreground shrink-0 max-w-[150px] truncate text-[10px]">{a.journal}</span>}<span className="text-muted-foreground shrink-0 text-[10px]">{a.publicationDate}</span><ExternalLink className="h-3 w-3 text-muted-foreground/30 shrink-0" /></a>))}</div>{nextTokens.pubmed && (<Button variant="outline" size="sm" className="mt-2 w-full text-xs" disabled={loadingMore.pubmed} onClick={() => handleLoadMore("pubmed")}>{loadingMore.pubmed ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Loading...</> : <>Load More Publications (showing {extPubmed.length}{totalCounts.pubmed ? ` of ${totalCounts.pubmed}` : ""})</>}</Button>)}</div>)}
                {extNews.length > 0 && (<div><p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><Newspaper className="h-3 w-3 text-[#06B6D4]" /> News ({extNews.length})</p><div className="space-y-1 max-h-[300px] overflow-y-auto">{extNews.map((n: any, i: number) => (<a key={i} href={n.link || "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs hover:bg-muted/50 transition-colors group"><Newspaper className="h-3 w-3 text-muted-foreground shrink-0" /><span className="flex-1 truncate group-hover:text-[#06B6D4]">{n.title}</span>{n.source && <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">{n.source}</Badge>}<span className="text-muted-foreground shrink-0 text-[10px]">{n.publishedDate}</span><ExternalLink className="h-3 w-3 text-muted-foreground/30 shrink-0" /></a>))}</div></div>)}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Components ───

function BigStatCard({ title, value, subtitle, detail, n, dbCount, extCount, wwCount, loading }: {
  title: string; value: string; subtitle: string; detail: string;
  n: number; dbCount?: number; extCount?: number; wwCount?: number; loading?: boolean;
}) {
  const parts: string[] = [];
  if (dbCount != null && dbCount > 0) parts.push(`${dbCount} DB`);
  if (wwCount != null && wwCount > 0) parts.push(`${wwCount} WW`);
  if (extCount != null && extCount > 0) parts.push(`${extCount} ext`);
  const breakdown = parts.length > 1 ? `: ${parts.join(" + ")}` : "";

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <div className="flex items-center gap-1">
            {loading && <Loader2 className="h-3 w-3 animate-spin text-[#F97316]" />}
            <Badge variant="secondary" className="text-[9px] h-4 px-1">
              n={n}{breakdown}
            </Badge>
          </div>
        </div>
        <p className="text-2xl font-bold font-mono text-[#F97316] tracking-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground mt-1.5">{subtitle}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{detail}</p>
      </CardContent>
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F97316]" style={{ opacity: 0.3 }} />
    </Card>
  );
}

function ConfidenceDot({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 90 ? "bg-[#10B981]" : pct >= 80 ? "bg-[#F59E0B]" : pct >= 50 ? "bg-[#3B82F6]" : "bg-[#94A3B8]";
  return (
    <div className="flex items-center justify-center gap-1.5">
      <div className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-xs font-mono text-muted-foreground">{pct}%</span>
    </div>
  );
}
