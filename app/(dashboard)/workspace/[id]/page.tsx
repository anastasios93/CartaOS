"use client";

/**
 * Deal Workspace — one Run, opened.
 *
 * `[id]` is a Run id, not a Negotiation id: the Run is the spine, and the three
 * pillars hang off it. This page shows the two pillars that have already been
 * run against it (Strategy, read-only; Execution, the live milestone tracker)
 * plus the Deal tab — the counterparty negotiation, which attaches to a Run
 * optionally via `Negotiation.runId`.
 *
 * Nothing here is mocked. Where a payload is absent the page says so and points
 * at the pillar that would produce it.
 */

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExecutionResults, type ExecutionBranch } from "@/components/run/execution-results";
import { countryByCode } from "@/config/geographies";
import { NEGOTIATION_STATUS_LABELS } from "@/lib/constants";
import type { Execution, StrategyRoute } from "@/types/run";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  GitBranch,
  Handshake,
  ListChecks,
  Mail,
  MessageSquare,
  Send,
  Target,
  Zap,
} from "lucide-react";

const TINY = "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70";

const ASSET_TYPE_LABEL: Record<string, string> = {
  off_patent: "Off-patent",
  innovative: "Innovative",
};

const RUN_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  diagnosis_running: "Diagnosis running",
  diagnosed: "Diagnosed",
  strategy_running: "Strategy running",
  strategized: "Awaiting plan",
  execution_running: "Planning",
  complete: "In execution",
  error: "Error",
};

const NEGOTIATION_STATUSES = [
  "INITIATED",
  "TERM_SHEET_DRAFTING",
  "TERM_SHEET_EXCHANGED",
  "DUE_DILIGENCE",
  "DEFINITIVE_AGREEMENT",
  "CLOSED",
  "DEAD",
] as const;
type NegotiationStatus = (typeof NEGOTIATION_STATUSES)[number];

function isNegotiationStatus(value: unknown): value is NegotiationStatus {
  return typeof value === "string" && (NEGOTIATION_STATUSES as readonly string[]).includes(value);
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  EMAIL: <Mail className="h-4 w-4" />,
  MEETING: <Calendar className="h-4 w-4" />,
  NOTE: <MessageSquare className="h-4 w-4" />,
  OFFER: <Send className="h-4 w-4" />,
  COUNTEROFFER: <Send className="h-4 w-4" />,
};

// ── Defensive readers (Run payloads are Json; agents may add extra keys) ──────

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.flatMap((v) => {
        const r = asRecord(v);
        return r ? [r] : [];
      })
    : [];
}

// ── Formatting ───────────────────────────────────────────────────────────────

/** Compact USD — the stored economics are plain numbers. */
function usd(n: number | null): string {
  if (n == null) return "—";
  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(abs >= 1e10 ? 0 : 1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function pct(n: number | null): string {
  return n == null ? "—" : `${n.toFixed(1)}%`;
}

/** Negotiation key terms are stored in millions of USD. */
function terms(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value.toFixed(0)}M`;
}

function geoLine(codes: string[]): string {
  const shown = codes.slice(0, 6).map((c) => countryByCode(c)?.flag ?? c);
  return `${shown.join(" ")}${codes.length > 6 ? ` +${codes.length - 6}` : ""}`;
}

/** The economics the strategy stored on the route, when it stored any. */
function storedEconomics(route: StrategyRoute): Record<string, unknown> | null {
  const econ = asRecord(asRecord(route.model)?.economics);
  return econ && econ.computable === true ? econ : null;
}

// ── Shared bits ──────────────────────────────────────────────────────────────

function EmptyPanel({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: typeof Target;
  title: string;
  body: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border-2 border-dashed border-border/60 bg-[#FAFAFA] px-5 py-6">
      <p className={`${TINY} flex items-center gap-1.5 mb-2`}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {title}
      </p>
      <div className="text-[14px] text-[#1A1A2E] leading-relaxed max-w-2xl">{body}</div>
      {action && <div className="mt-4 flex flex-wrap items-center gap-3">{action}</div>}
    </div>
  );
}

function TermField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className={TINY}>{label}</p>
      <p className="text-sm font-medium text-[#1A1A2E] mt-0.5">{value}</p>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const utils = trpc.useUtils();

  const runQuery = trpc.run.getById.useQuery(id);

  /**
   * There is no by-runId lookup on the negotiation router yet, so the link is
   * resolved client-side from the owner-scoped list. Nothing else reads a
   * negotiation the current user cannot already see.
   */
  const negotiationsQuery = trpc.negotiation.list.useQuery({ limit: 50 });
  const linkedId =
    (negotiationsQuery.data?.items ?? []).find((n) => n.runId === id)?.id ?? null;

  const dealQuery = trpc.negotiation.getById.useQuery(linkedId ?? "", {
    enabled: !!linkedId,
  });

  const [newActivity, setNewActivity] = useState({
    type: "NOTE",
    title: "",
    description: "",
  });

  const runConductor = trpc.negotiation.runConductor.useMutation({
    onSuccess: () => {
      toast.success("Deal Conductor analysis complete");
      if (linkedId) void utils.negotiation.getById.invalidate(linkedId);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateStatus = trpc.negotiation.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      if (linkedId) void utils.negotiation.getById.invalidate(linkedId);
      void utils.negotiation.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const addActivity = trpc.negotiation.addActivity.useMutation({
    onSuccess: () => {
      toast.success("Activity added");
      if (linkedId) void utils.negotiation.getById.invalidate(linkedId);
      setNewActivity({ type: "NOTE", title: "", description: "" });
    },
    onError: (err) => toast.error(err.message),
  });

  const run = runQuery.data;

  const execution = useMemo(
    () => (run ? asRecord(run.execution) : null),
    [run],
  );
  const strategy = useMemo(() => (run ? asRecord(run.strategy) : null), [run]);

  if (runQuery.isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-8 w-96" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (runQuery.error || !run) {
    return (
      <div className="flex flex-col items-center py-16">
        <p className="text-sm text-muted-foreground">Workspace not found</p>
        <p className="text-xs text-muted-foreground mt-1">
          {runQuery.error?.message ?? "This run does not exist, or is not yours."}
        </p>
        <Button size="sm" className="mt-3" asChild>
          <Link href="/workspace">Back to workspaces</Link>
        </Button>
      </div>
    );
  }

  const branch: ExecutionBranch = run.assetType === "innovative" ? "innovative" : "off_patent";
  const executionHref = branch === "innovative" ? "/execution/innovative" : "/execution";
  const strategyHref = branch === "innovative" ? "/strategy/innovative" : "/strategy";

  /**
   * A milestone array is the only shape this workspace can track. The old
   * orchestrator wrote `{ legacy: { agent: "executionPlan", result: … } }` onto
   * the same column — that is a real payload, just not a trackable plan, so it
   * is named rather than treated as an empty slot.
   */
  const hasPlan = Array.isArray(execution?.milestones);
  const isLegacyPlan = !hasPlan && !!execution && "legacy" in execution;

  const routes: StrategyRoute[] = Array.isArray(strategy?.routes)
    ? (strategy.routes as StrategyRoute[])
    : [];
  const recommendedKey = text(strategy?.recommendedRoute);
  const recommendedRoute = routes.find((r) => r.key === recommendedKey);

  const deal = dealQuery.data;
  const blockers = deal ? records(deal.currentBlockers) : [];
  const nextSteps = deal ? records(deal.nextSteps) : [];
  const riskFlags = deal ? records(deal.riskFlags) : [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/workspace" aria-label="Back to workspaces">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E] truncate">
            {run.assetQuery}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-border/60 bg-[#FAFAFA] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#1A1A2E]">
              {ASSET_TYPE_LABEL[run.assetType] ?? run.assetType}
            </span>
            <span
              className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                run.status === "complete"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : run.status === "error"
                    ? "border-red-300 bg-red-50 text-red-700"
                    : "border-[#F97316]/50 bg-[#FFF7ED] text-[#C2410C]"
              }`}
            >
              {RUN_STATUS_LABEL[run.status] ?? run.status}
            </span>
            <span className="text-[13px] text-[#1A1A2E]">{geoLine(run.geographies)}</span>
          </div>
        </div>
      </div>

      {run.error && (
        <p className="text-[13px] font-medium text-red-700">{run.error}</p>
      )}

      <Tabs defaultValue="execution">
        <TabsList>
          <TabsTrigger value="execution">Execution</TabsTrigger>
          <TabsTrigger value="strategy">Strategy</TabsTrigger>
          <TabsTrigger value="deal">Deal</TabsTrigger>
        </TabsList>

        {/* ===== EXECUTION ===== */}
        <TabsContent value="execution" className="space-y-4 pt-4">
          {hasPlan ? (
            <ExecutionResults
              /* Keyed by run so the optimistic status layer never leaks across plans. */
              key={run.id}
              execution={execution as unknown as Execution}
              branch={branch}
              assetName={run.assetQuery}
              runId={run.id}
              onMilestoneChange={() => void utils.run.getById.invalidate(id)}
            />
          ) : (
            <EmptyPanel
              icon={ListChecks}
              title="No trackable plan on this run"
              body={
                isLegacyPlan ? (
                  <>
                    An older-format plan is stored for this run — it predates the milestone tracker,
                    so there are no milestones, owners or computed dates to follow. Rebuild the plan
                    to track it here.
                  </>
                ) : (
                  <>
                    No execution plan has been built for this run yet. Execution schedules one chosen
                    route from the strategy — pick the route, set a start date, and every milestone
                    date is computed from there.
                  </>
                )
              }
              action={
                <Link
                  href={executionHref}
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-[14px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
                >
                  {isLegacyPlan ? "Rebuild the plan" : "Build a plan"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              }
            />
          )}
        </TabsContent>

        {/* ===== STRATEGY (read-only) ===== */}
        <TabsContent value="strategy" className="space-y-4 pt-4">
          {routes.length > 0 ? (
            <>
              <section className="rounded-2xl border-2 border-[#F97316]/40 bg-gradient-to-br from-[#FFF7ED] to-white p-6">
                <p className={`${TINY} mb-2 flex items-center gap-1.5 text-[#C2410C]`}>
                  <Target className="h-3.5 w-3.5" aria-hidden="true" /> Recommended route
                </p>
                <p className="text-[18px] font-semibold text-[#1A1A2E] leading-snug">
                  {recommendedRoute?.label ?? recommendedKey ?? "No route was recommended"}
                </p>
                {recommendedRoute?.keyDependency && (
                  <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed max-w-3xl">
                    <span className={TINY}>Key dependency</span> {recommendedRoute.keyDependency}
                  </p>
                )}
                <div className="mt-5 pt-4 border-t border-[#F97316]/20">
                  <Link
                    href={strategyHref}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-[12px] font-semibold text-[#1A1A2E] transition hover:border-[#F97316] hover:text-[#C2410C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
                  >
                    <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
                    Revisit the strategy
                  </Link>
                </div>
              </section>

              <section className="rounded-xl border border-border/40 bg-white p-5">
                <p className={`${TINY} flex items-center gap-1.5 mb-3`}>
                  <GitBranch className="h-3.5 w-3.5" aria-hidden="true" /> Route comparison
                </p>
                <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed max-w-3xl">
                  The figures as they were modelled and stored on this run. To change an assumption
                  and see the whole model re-derive, open Strategy — this view does not recompute.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[46rem]">
                    <caption className="sr-only">
                      Stored economics for each route considered in this run&apos;s strategy
                    </caption>
                    <thead>
                      <tr className="border-b border-border/40">
                        <th scope="col" className={`${TINY} py-1.5 pr-3`}>
                          Route
                        </th>
                        <th scope="col" className={`${TINY} py-1.5 pr-3`}>
                          Score
                        </th>
                        <th scope="col" className={`${TINY} py-1.5 pr-3`}>
                          NPV
                        </th>
                        <th scope="col" className={`${TINY} py-1.5 pr-3`}>
                          IRR
                        </th>
                        <th scope="col" className={`${TINY} py-1.5 pr-3`}>
                          Break-even
                        </th>
                        <th scope="col" className={`${TINY} py-1.5 pr-3`}>
                          Peak revenue
                        </th>
                        <th scope="col" className={`${TINY} py-1.5`}>
                          Key dependency
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {routes.map((route) => {
                        const econ = storedEconomics(route);
                        const breakEven = econ ? num(econ.breakEvenYear) : null;
                        return (
                          <tr
                            key={route.key}
                            className={`border-b border-border/20 align-top ${
                              route.key === recommendedKey ? "bg-[#FFF7ED]" : ""
                            }`}
                          >
                            <th
                              scope="row"
                              className="py-2.5 pr-3 text-left text-[13px] font-medium text-[#1A1A2E]"
                            >
                              {route.label}
                              {route.key === recommendedKey && (
                                <span className="ml-1.5 align-middle text-[9px] font-bold uppercase tracking-widest text-[#C2410C]">
                                  recommended
                                </span>
                              )}
                            </th>
                            <td className="py-2.5 pr-3 font-mono text-[12px] tabular-nums text-[#1A1A2E]">
                              {route.score ?? "—"}
                            </td>
                            <td className="py-2.5 pr-3 font-mono text-[13px] font-bold tabular-nums text-[#1A1A2E] whitespace-nowrap">
                              {usd(econ ? num(econ.npv) : null)}
                            </td>
                            <td className="py-2.5 pr-3 font-mono text-[12px] tabular-nums text-[#1A1A2E] whitespace-nowrap">
                              {pct(econ ? num(econ.irr) : null)}
                            </td>
                            <td className="py-2.5 pr-3 text-[12px] text-[#1A1A2E] whitespace-nowrap">
                              {econ == null ? "—" : breakEven == null ? "never" : `year ${breakEven}`}
                            </td>
                            <td className="py-2.5 pr-3 font-mono text-[12px] tabular-nums text-[#1A1A2E] whitespace-nowrap">
                              {usd(econ ? num(econ.peakRevenue) : null)}
                            </td>
                            <td className="py-2.5 text-[12px] text-muted-foreground leading-relaxed min-w-[12rem]">
                              {route.keyDependency ?? "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3">
                  A dash means the run stored no modelled economics for that route.
                </p>
              </section>
            </>
          ) : (
            <EmptyPanel
              icon={GitBranch}
              title="No strategy on this run"
              body={
                <>
                  This run carries no modelled routes, so there is nothing to summarise here.
                  Strategy compares the routes open to the asset and recommends one — execution
                  plans whichever route you commit to.
                </>
              }
              action={
                <Link
                  href={strategyHref}
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-[14px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
                >
                  Model a strategy
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              }
            />
          )}
        </TabsContent>

        {/* ===== DEAL (the linked counterparty negotiation) ===== */}
        <TabsContent value="deal" className="space-y-4 pt-4">
          {negotiationsQuery.isLoading || (linkedId && dealQuery.isLoading) ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : !linkedId ? (
            <EmptyPanel
              icon={Handshake}
              title="No negotiation attached"
              body={
                <>
                  No counterparty negotiation is attached to this run yet. A negotiation links to a
                  run one-to-one, and none of yours points at this one — so there are no terms,
                  activity or Deal Conductor output to show.
                </>
              }
            />
          ) : dealQuery.error || !deal ? (
            <EmptyPanel
              icon={AlertTriangle}
              title="Could not load the negotiation"
              body={<>{dealQuery.error?.message ?? "The linked negotiation could not be read."}</>}
            />
          ) : (
            <>
              {/* Negotiation header: identity, status, conductor */}
              <Card className="border-border/40 shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className={TINY}>Counterparty negotiation</p>
                      <p className="text-[16px] font-semibold text-[#1A1A2E] mt-0.5">{deal.title}</p>
                      <Link
                        href={`/companies/${deal.company.id}`}
                        className="text-[13px] text-[#C2410C] hover:underline"
                      >
                        {deal.company.name}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Select
                        value={deal.status}
                        onValueChange={(v) => {
                          if (isNegotiationStatus(v)) {
                            updateStatus.mutate({ id: deal.id, status: v });
                          }
                        }}
                      >
                        <SelectTrigger className="w-[200px] h-9 border-border/40 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {NEGOTIATION_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {NEGOTIATION_STATUS_LABELS[s] ?? s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => runConductor.mutate(deal.id)}
                        disabled={runConductor.isPending}
                        className="h-9 bg-[#F97316] hover:bg-[#EA580C] text-white gap-2"
                      >
                        <Zap className="h-4 w-4" aria-hidden="true" />
                        {runConductor.isPending ? "Analyzing…" : "Run Deal Conductor"}
                      </Button>
                    </div>
                  </div>

                  {/* Key terms */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 pt-4 border-t border-border/30">
                    <TermField label="Upfront" value={terms(deal.proposedUpfront)} />
                    <TermField label="Milestones" value={terms(deal.proposedMilestones)} />
                    <TermField
                      label="Royalties"
                      value={
                        deal.proposedRoyaltyLow != null
                          ? `${deal.proposedRoyaltyLow}% – ${deal.proposedRoyaltyHigh ?? "?"}%`
                          : "—"
                      }
                    />
                    <TermField label="Territory" value={deal.proposedTerritory ?? "—"} />
                    <TermField
                      label="Target close"
                      value={
                        deal.targetCloseDate
                          ? new Date(deal.targetCloseDate).toLocaleDateString()
                          : "—"
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Deal Conductor output */}
              {blockers.length === 0 && nextSteps.length === 0 && riskFlags.length === 0 ? (
                <Card className="border-border/40 shadow-sm">
                  <CardContent className="flex flex-col items-center py-10 text-center">
                    <Zap className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
                    <p className="mt-3 text-sm text-muted-foreground">
                      The Deal Conductor has not been run against this negotiation yet.
                    </p>
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={() => runConductor.mutate(deal.id)}
                      disabled={runConductor.isPending}
                    >
                      {runConductor.isPending ? "Analyzing…" : "Analyze now"}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {blockers.length > 0 && (
                    <Card className="border-border/40 shadow-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <AlertTriangle className="h-4 w-4 text-red-500" aria-hidden="true" />
                          Blockers
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {blockers.map((b, i) => {
                          const severity = text(b.severity);
                          return (
                            <div
                              key={i}
                              className="flex items-start gap-3 rounded-lg border border-border/40 p-3"
                            >
                              {severity && (
                                <Badge
                                  variant={
                                    severity === "HIGH"
                                      ? "destructive"
                                      : severity === "MEDIUM"
                                        ? "default"
                                        : "secondary"
                                  }
                                  className="text-xs shrink-0"
                                >
                                  {severity}
                                </Badge>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm text-[#1A1A2E]">{text(b.item) ?? "—"}</p>
                                {text(b.owner) && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Owner: {text(b.owner)}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  )}

                  {nextSteps.length > 0 && (
                    <Card className="border-border/40 shadow-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
                          Next steps
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {nextSteps.map((s, i) => (
                          <div key={i} className="rounded-lg border border-border/40 p-3">
                            <p className="text-sm font-medium text-[#1A1A2E]">
                              {text(s.action) ?? "—"}
                            </p>
                            <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                              {text(s.who) && <span>Who: {text(s.who)}</span>}
                              {text(s.by) && <span>By: {text(s.by)}</span>}
                            </div>
                            {text(s.rationale) && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {text(s.rationale)}
                              </p>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {riskFlags.length > 0 && (
                    <Card className="border-border/40 shadow-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" aria-hidden="true" />
                          Risk flags
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {riskFlags.map((r, i) => (
                          <div key={i} className="rounded-lg border border-border/40 p-3">
                            <p className="text-sm font-medium text-[#1A1A2E]">
                              {text(r.term) ?? "—"}
                            </p>
                            {text(r.issue) && (
                              <p className="mt-1 text-xs text-muted-foreground">{text(r.issue)}</p>
                            )}
                            {text(r.benchmark) && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Benchmark: {text(r.benchmark)}
                              </p>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Log activity */}
              <Card className="border-border/40 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Log activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-3">
                    <Select
                      value={newActivity.type}
                      onValueChange={(v) => {
                        if (typeof v === "string") {
                          setNewActivity((a) => ({ ...a, type: v }));
                        }
                      }}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NOTE">Note</SelectItem>
                        <SelectItem value="EMAIL">Email</SelectItem>
                        <SelectItem value="MEETING">Meeting</SelectItem>
                        <SelectItem value="OFFER">Offer</SelectItem>
                        <SelectItem value="COUNTEROFFER">Counter-offer</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Activity title..."
                      value={newActivity.title}
                      onChange={(e) =>
                        setNewActivity((a) => ({ ...a, title: e.target.value }))
                      }
                      className="flex-1"
                      aria-label="Activity title"
                    />
                  </div>
                  <Textarea
                    placeholder="Description (optional)..."
                    value={newActivity.description}
                    onChange={(e) =>
                      setNewActivity((a) => ({ ...a, description: e.target.value }))
                    }
                    rows={2}
                    aria-label="Activity description"
                  />
                  <Button
                    size="sm"
                    disabled={!newActivity.title || addActivity.isPending}
                    onClick={() =>
                      addActivity.mutate({
                        negotiationId: deal.id,
                        type: newActivity.type,
                        title: newActivity.title,
                        description: newActivity.description || undefined,
                      })
                    }
                  >
                    {addActivity.isPending ? "Adding…" : "Add activity"}
                  </Button>
                </CardContent>
              </Card>

              {/* Activity timeline */}
              <section className="space-y-2">
                <p className={`${TINY} flex items-center gap-1.5`}>
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" /> Activity (
                  {deal.activities.length})
                </p>
                {deal.activities.length > 0 ? (
                  <div className="space-y-2">
                    {deal.activities.map((activity) => (
                      <Card key={activity.id} className="border-border/40 shadow-sm">
                        <CardContent className="flex items-start gap-3 p-4">
                          <div className="mt-0.5 text-muted-foreground">
                            {ACTIVITY_ICONS[activity.type] ?? <MessageSquare className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-[#1A1A2E]">{activity.title}</p>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {activity.type}
                              </Badge>
                            </div>
                            {activity.description && (
                              <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                                {activity.description}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-muted-foreground">
                              {new Date(activity.occurredAt).toLocaleString()}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border-border/40 shadow-sm">
                    <CardContent className="py-8 text-center">
                      <p className="text-sm text-muted-foreground">No activity logged yet</p>
                    </CardContent>
                  </Card>
                )}
              </section>

              {/* Action items */}
              <section className="space-y-2">
                <p className={`${TINY} flex items-center gap-1.5`}>
                  <ListChecks className="h-3.5 w-3.5" aria-hidden="true" /> Action items (
                  {deal.actionItems.length})
                </p>
                {deal.actionItems.length > 0 ? (
                  <div className="space-y-2">
                    {deal.actionItems.map((item) => (
                      <Card key={item.id} className="border-border/40 shadow-sm">
                        <CardContent className="flex items-center gap-3 p-3">
                          <div
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              item.status === "COMPLETED"
                                ? "bg-green-500"
                                : item.status === "OVERDUE"
                                  ? "bg-red-500"
                                  : item.status === "IN_PROGRESS"
                                    ? "bg-yellow-500"
                                    : "bg-blue-500"
                            }`}
                            aria-hidden="true"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1A1A2E]">{item.title}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground">{item.description}</p>
                            )}
                          </div>
                          <div className="text-right text-xs text-muted-foreground shrink-0">
                            {item.assignedTo && <p>{item.assignedTo}</p>}
                            {item.dueDate && <p>{new Date(item.dueDate).toLocaleDateString()}</p>}
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {item.status}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border-border/40 shadow-sm">
                    <CardContent className="py-8 text-center">
                      <p className="text-sm text-muted-foreground">No action items</p>
                    </CardContent>
                  </Card>
                )}
              </section>

              {/* Benchmark deals */}
              {deal.benchmarkDeals.length > 0 && (
                <section className="space-y-2">
                  <p className={`${TINY} flex items-center gap-1.5`}>
                    <Target className="h-3.5 w-3.5" aria-hidden="true" /> Benchmark deals (
                    {deal.benchmarkDeals.length})
                  </p>
                  <div className="space-y-2">
                    {deal.benchmarkDeals.map((comp) => (
                      <Card key={comp.id} className="border-border/40 shadow-sm">
                        <CardContent className="flex items-center justify-between gap-3 p-3">
                          <div className="min-w-0">
                            <Link
                              href={`/deals/${comp.deal.id}`}
                              className="text-sm font-medium text-[#1A1A2E] hover:underline"
                            >
                              {comp.deal.title}
                            </Link>
                            {comp.notes && (
                              <p className="text-xs text-muted-foreground">{comp.notes}</p>
                            )}
                          </div>
                          {comp.relevanceScore != null && (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {(comp.relevanceScore * 100).toFixed(0)}% relevant
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
