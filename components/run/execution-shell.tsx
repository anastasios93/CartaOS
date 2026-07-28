"use client";

/**
 * Pillar 3 — the shared Execution shell (§6).
 *
 * Both branches mount this component, exactly as both strategy branches mount
 * StrategyShell. The gate is one step further along the spine: **Execution is
 * never entered cold either (§2)**. You pick a Run that already carries a
 * modelled strategy, and the plan is written back onto that same Run.
 *
 * The one extra input over Strategy is the choice that actually matters here:
 * WHICH route to plan. Strategy recommends one; a plan is only useful once
 * somebody has committed to a route, so the picker defaults to the recommendation
 * and lets it be overridden. The start date is the second input — the engine
 * derives every milestone date from it, so it is stated rather than assumed.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RunConsole } from "@/components/run/run-console";
import { ExecutionResults, type ExecutionBranch } from "@/components/run/execution-results";
import { useAgentStream } from "@/hooks/use-agent-stream";
import { useRunLog } from "@/hooks/use-run-log";
import { trpc } from "@/lib/trpc";
import { countryByCode } from "@/config/geographies";
import type { Execution, Strategy } from "@/types/run";
import type { HubIntakeForm } from "@/types/hub";
import { ArrowRight, CheckCircle2, GitBranch, History, ListChecks } from "lucide-react";

// ── Branch routing (configuration, not copy-paste) ───────────────────────────

const BRANCHES: Record<ExecutionBranch, { label: string; href: string; strategyHref: string }> = {
  off_patent: { label: "Off-patent", href: "/execution", strategyHref: "/strategy" },
  innovative: { label: "Innovative", href: "/execution/innovative", strategyHref: "/strategy/innovative" },
};

const BRANCH_ORDER: ExecutionBranch[] = ["off_patent", "innovative"];

/** A run may be planned only once it has a strategy to plan against. */
const PLANNABLE = new Set(["strategized", "complete"]);

const TINY = "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70";

export interface ExecutionShellProps {
  branch: ExecutionBranch;
  title: string;
  subtitle: string;
}

function geoLine(codes: string[]): string {
  const shown = codes.slice(0, 5).map((c) => countryByCode(c)?.flag ?? c);
  return `${shown.join(" ")}${codes.length > 5 ? ` +${codes.length - 5}` : ""}`;
}

export function ExecutionShell({ branch, title, subtitle }: ExecutionShellProps) {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  /** null until the user overrides the strategy's recommendation. */
  const [routeChoice, setRouteChoice] = useState<string | null>(null);
  /** The clock is read once, at mount — the plan start is an input, not a ticking value. */
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [context, setContext] = useState("");
  const [viewingRunId, setViewingRunId] = useState<string | null>(null);

  const { agents, deploy, reset, isRunning } = useAgentStream();
  const log = useRunLog(agents);

  const runsQuery = trpc.run.list.useQuery({ assetType: branch }, { refetchOnWindowFocus: false });
  const selectedRun = trpc.run.getById.useQuery(selectedRunId!, { enabled: !!selectedRunId });
  const viewingRun = trpc.run.getById.useQuery(viewingRunId!, { enabled: !!viewingRunId });
  const utils = trpc.useUtils();

  const candidates = useMemo(
    () => (runsQuery.data ?? []).filter((r) => PLANNABLE.has(r.status)),
    [runsQuery.data],
  );

  const selected = candidates.find((r) => r.id === selectedRunId) ?? null;

  /** The strategy behind the selected run — the routes this plan may choose from. */
  const strategy = (selectedRun.data?.strategy as unknown as Strategy | null) ?? null;
  const routes = useMemo(
    () => (strategy && Array.isArray(strategy.routes) ? strategy.routes : []),
    [strategy],
  );

  const liveResult = agents.execution.result;
  const liveExecution = liveResult?.agentId === "execution" ? liveResult.execution : null;
  const streamError = agents.execution.error;
  const hadRun = isRunning || !!liveExecution || !!streamError;

  /**
   * The route to plan is DERIVED, not stored: strategy's recommendation unless the
   * user has picked something else that this run actually offers. Selecting a
   * different run therefore falls straight back to that run's recommendation
   * rather than carrying a stale key across.
   */
  const recommendedKey = strategy?.recommendedRoute;
  const routeKey =
    routeChoice && routes.some((r) => r.key === routeChoice)
      ? routeChoice
      : recommendedKey && routes.some((r) => r.key === recommendedKey)
        ? recommendedKey
        : (routes[0]?.key ?? "");

  useEffect(() => {
    // Refresh the run list when a live run finishes — its status is now complete.
    if (!isRunning && liveExecution) void utils.run.list.invalidate();
  }, [isRunning, liveExecution, utils]);

  const startRun = () => {
    if (!selected || !routeKey || !startDate || isRunning) return;
    setViewingRunId(null);
    log.reset();
    // The endpoint's Zod schema reads only { runId, routeKey, startDate, context };
    // deploy posts the whole form, and the extra intake fields are ignored server-side.
    const form: HubIntakeForm & { runId: string; routeKey: string; startDate: string } = {
      assetName: selected.assetQuery,
      therapeuticArea: "",
      developmentStage: "",
      dealDirection: "Out-licensing",
      geographies: selected.geographies,
      exactGeographies: true,
      assetType: branch,
      context,
      runId: selected.id,
      routeKey,
      startDate,
    };
    void deploy(form, "/api/run/execution");
  };

  // ── Reopened stored plan ───────────────────────────────────────────────────
  if (viewingRunId && viewingRun.data) {
    const stored = viewingRun.data.execution as unknown as Execution | null;
    return (
      <div className="space-y-6">
        <button
          onClick={() => setViewingRunId(null)}
          className="text-[12px] text-muted-foreground hover:text-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50 rounded"
        >
          ← Back to Execution
        </button>
        {stored && Array.isArray(stored.milestones) ? (
          <ExecutionResults
            /* Keyed by run so a different plan starts with a clean status layer. */
            key={viewingRun.data.id}
            execution={stored}
            branch={branch}
            assetName={viewingRun.data.assetQuery}
            runId={viewingRun.data.id}
            onMilestoneChange={() => void utils.run.getById.invalidate(viewingRunId)}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            This run has no stored plan{viewingRun.data.error ? ` — ${viewingRun.data.error}` : ""}.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E] flex items-center gap-2">
          <ListChecks className="h-6 w-6 text-[#F97316]" aria-hidden="true" />
          {title}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
      </div>

      <Card className="border-border/40 shadow-sm">
        <CardContent className="p-5 space-y-5">
          <div>
            <span id="execution-branch-label" className={`block ${TINY} mb-1.5`}>
              Asset type
            </span>
            {/* Both branches exist — the other segment navigates, it is not a dead control. */}
            <div
              className="flex rounded-lg border border-border overflow-hidden max-w-sm"
              role="group"
              aria-labelledby="execution-branch-label"
            >
              {BRANCH_ORDER.map((key) =>
                key === branch ? (
                  <span
                    key={key}
                    aria-current="page"
                    className="flex-1 px-3 py-3 text-[13px] font-semibold bg-[#1A1A2E] text-white text-center"
                  >
                    {BRANCHES[key].label}
                  </span>
                ) : (
                  <Link
                    key={key}
                    href={BRANCHES[key].href}
                    className="flex-1 px-3 py-3 text-[13px] text-muted-foreground bg-[#FAFAFA] text-center transition-colors hover:bg-white hover:text-[#1A1A2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#F97316]/50"
                  >
                    {BRANCHES[key].label}
                  </Link>
                ),
              )}
            </div>
          </div>

          {candidates.length > 0 ? (
            <>
              <fieldset disabled={isRunning} className="min-w-0 space-y-5">
                <legend className={`${TINY} mb-1.5`}>
                  Strategised run to plan{" "}
                  <span className="normal-case tracking-normal font-normal">
                    (execution consumes a strategy — it is never entered cold)
                  </span>
                </legend>
                <div>
                  <ul className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {candidates.map((run) => {
                      const id = `execution-run-${run.id}`;
                      return (
                        <li key={run.id}>
                          <label
                            htmlFor={id}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                              selectedRunId === run.id
                                ? "border-[#F97316] bg-[#FFF7ED]"
                                : "border-border/40 bg-white hover:bg-[#FAFAFA]"
                            }`}
                          >
                            <input
                              id={id}
                              type="radio"
                              name="execution-run"
                              value={run.id}
                              checked={selectedRunId === run.id}
                              onChange={() => setSelectedRunId(run.id)}
                              className="accent-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block text-[13px] font-medium text-[#1A1A2E] truncate">
                                {run.assetQuery}
                              </span>
                              <span className="block text-[11px] text-muted-foreground">
                                {geoLine(run.geographies)} · strategised{" "}
                                {new Date(run.createdAt).toLocaleDateString()}
                              </span>
                            </span>
                            {run.status === "complete" && (
                              <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
                                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                                planned
                              </span>
                            )}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* The key extra input over Strategy: which route is actually being taken. */}
                {selected && (
                  <div>
                    <label htmlFor="execution-route" className={`block ${TINY} mb-1.5`}>
                      Route to plan{" "}
                      <span className="normal-case tracking-normal font-normal">
                        (a plan is only useful once a route has been committed to)
                      </span>
                    </label>
                    {routes.length > 0 ? (
                      <>
                        <select
                          id="execution-route"
                          value={routeKey}
                          onChange={(e) => setRouteChoice(e.target.value)}
                          className="w-full max-w-xl px-4 py-3 rounded-lg bg-[#FAFAFA] border border-border text-[14px] text-[#1A1A2E] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] focus:bg-white outline-none transition"
                        >
                          {routes.map((r) => (
                            <option key={r.key} value={r.key}>
                              {r.label}
                              {r.score == null ? "" : ` — scored ${r.score}/100`}
                              {r.key === strategy?.recommendedRoute ? " (recommended)" : ""}
                            </option>
                          ))}
                        </select>
                        {strategy?.recommendedRoute && routeKey !== strategy.recommendedRoute && (
                          <p className="text-[11px] font-medium text-[#C2410C] mt-1.5">
                            Strategy recommended{" "}
                            {routes.find((r) => r.key === strategy.recommendedRoute)?.label ??
                              strategy.recommendedRoute}
                            . Planning a different route is fine — just deliberate.
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-[12px] text-muted-foreground">
                        {selectedRun.isLoading
                          ? "Loading the strategy behind this run…"
                          : "This run's strategy returned no routes to plan against."}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label htmlFor="execution-start" className={`block ${TINY} mb-1.5`}>
                    Plan start date
                  </label>
                  <input
                    id="execution-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-4 py-3 rounded-lg bg-[#FAFAFA] border border-border text-[14px] font-mono text-[#1A1A2E] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] focus:bg-white outline-none transition"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Every milestone date is computed from this date and the dependency chain — move it and the whole
                    plan moves coherently.
                  </p>
                </div>

                <div>
                  <label htmlFor="execution-context" className={`block ${TINY} mb-1.5`}>
                    Constraints & context{" "}
                    <span className="normal-case tracking-normal font-normal">
                      (optional — team size, board dates, anything already under way)
                    </span>
                  </label>
                  <textarea
                    id="execution-context"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    rows={2}
                    maxLength={4000}
                    placeholder="e.g. regulatory lead starts in March; board wants a signed term sheet before Q4"
                    className="w-full px-4 py-3 rounded-lg bg-[#FAFAFA] border border-border text-[14px] text-[#1A1A2E] placeholder-muted-foreground/60 focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] focus:bg-white outline-none transition resize-y"
                  />
                </div>
              </fieldset>

              <div className="flex items-center justify-between gap-3 flex-wrap pt-1 border-t border-border/30">
                <p className="text-[11px] text-muted-foreground">
                  {selected
                    ? `${selected.assetQuery} · ${routes.find((r) => r.key === routeKey)?.label ?? "no route chosen"} · dates derive from the start date, not from the agent.`
                    : "To run: pick the strategised run this plan should build on."}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  {selected?.status === "complete" && (
                    <button
                      type="button"
                      onClick={() => setViewingRunId(selected.id)}
                      className="h-10 rounded-lg border border-border px-3 text-[12px] font-semibold text-[#1A1A2E] transition hover:border-[#F97316] hover:text-[#C2410C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
                    >
                      Open stored plan
                    </button>
                  )}
                  <Button
                    onClick={startRun}
                    disabled={!selected || !routeKey || !startDate || isRunning}
                    className="h-10 px-5 bg-[#F97316] hover:bg-[#EA580C] text-white gap-2"
                  >
                    {isRunning ? "Planning…" : "Build plan"}
                    {!isRunning && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* Empty state: the single primary action is to go and model a strategy. */
            <div className="rounded-xl border-2 border-dashed border-border/60 bg-[#FAFAFA] px-5 py-6">
              <p className={`${TINY} flex items-center gap-1.5 mb-2`}>
                <GitBranch className="h-3.5 w-3.5" aria-hidden="true" /> A strategy has to exist first
              </p>
              <p className="text-[14px] text-[#1A1A2E] leading-relaxed max-w-2xl">
                Execution answers <em>who does what, by when</em> once <em>which route</em> has been settled. It plans
                one chosen route from a completed {BRANCHES[branch].label.toLowerCase()} strategy — so there is nothing
                to schedule until one exists.
              </p>
              <p className="text-[12px] text-muted-foreground mt-1.5">
                {runsQuery.isLoading
                  ? "Checking for strategised runs…"
                  : `No strategised ${BRANCHES[branch].label.toLowerCase()} run yet.`}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <Link
                  href={BRANCHES[branch].strategyHref}
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-[14px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
                >
                  Model a strategy first
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live run console (§3.4 — no opaque spinners) */}
      {hadRun && <RunConsole events={log.events} running={isRunning} onCancel={reset} title="Execution plan" />}

      {streamError && !isRunning && <p className="text-[13px] text-red-700 font-medium">{streamError}</p>}

      {/* Live results — runId is passed so status edits persist onto the run */}
      {liveExecution && (
        <ExecutionResults
          key={selected?.id ?? "live"}
          execution={liveExecution}
          branch={branch}
          assetName={selected?.assetQuery ?? "Asset"}
          runId={selected?.id}
          onMilestoneChange={() => void utils.run.list.invalidate()}
        />
      )}

      {/* Past plans, always reopenable */}
      {!hadRun && candidates.some((r) => r.status === "complete") && (
        <div className="rounded-xl border border-border/40 bg-white p-5">
          <p className={`${TINY} mb-3 flex items-center gap-1.5`}>
            <History className="h-3.5 w-3.5" aria-hidden="true" /> Stored plans
          </p>
          <ul className="space-y-1">
            {candidates
              .filter((r) => r.status === "complete")
              .map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => setViewingRunId(r.id)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#FAFAFA] transition-colors flex items-center justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
                  >
                    <span className="text-[13px] font-medium text-[#1A1A2E] truncate">{r.assetQuery}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {geoLine(r.geographies)} · {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
