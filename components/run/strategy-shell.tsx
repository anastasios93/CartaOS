"use client";

/**
 * Pillar 2 — the shared Strategy shell (§5).
 *
 * Both branches (2A off-patent, 2B innovative) mount this component, the same
 * way both diagnosis branches mount DiagnosisShell. The input model is
 * different, though, and deliberately so: **Strategy cannot be entered cold
 * (§2)**. There is no asset box here. You pick a Run that already carries a
 * completed diagnosis, and the strategy is written back onto that same Run — one
 * Run stays the spine.
 *
 * The escape hatch is the deterministic engine itself: the route economics need
 * assumptions, not an agent, so a user with their own numbers can open the
 * assumptions panel and model every route by hand. That path is deliberately
 * secondary — it produces economics, not evidence.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RunConsole } from "@/components/run/run-console";
import { StrategyResults, buildBlankStrategy, type StrategyBranch } from "@/components/run/strategy-results";
import { CriteriaRefinementSummary } from "@/components/run/criteria-refinement";
import { useAgentStream } from "@/hooks/use-agent-stream";
import { useRunLog } from "@/hooks/use-run-log";
import { trpc } from "@/lib/trpc";
import { countryByCode } from "@/config/geographies";
import type { Strategy } from "@/types/run";
import type { HubIntakeForm } from "@/types/hub";
import {
  ArrowRight,
  GitBranch,
  History,
  PencilLine,
  Stethoscope,
  CheckCircle2,
} from "lucide-react";

// ── Branch routing (configuration, not copy-paste) ───────────────────────────

const BRANCHES: Record<StrategyBranch, { label: string; href: string; diagnosisHref: string }> = {
  off_patent: { label: "Off-patent", href: "/strategy", diagnosisHref: "/diagnosis" },
  innovative: { label: "Innovative", href: "/strategy/innovative", diagnosisHref: "/diagnosis/innovative" },
};

const BRANCH_ORDER: StrategyBranch[] = ["off_patent", "innovative"];

/** A run may be strategised only once it has been diagnosed. */
const STRATEGISABLE = new Set(["diagnosed", "strategized"]);

const TINY = "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70";

export interface StrategyShellProps {
  branch: StrategyBranch;
  title: string;
  subtitle: string;
}

function geoLine(codes: string[]): string {
  const shown = codes.slice(0, 5).map((c) => countryByCode(c)?.flag ?? c);
  return `${shown.join(" ")}${codes.length > 5 ? ` +${codes.length - 5}` : ""}`;
}

export function StrategyShell({ branch, title, subtitle }: StrategyShellProps) {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [context, setContext] = useState("");
  const [manual, setManual] = useState(false);
  const [viewingRunId, setViewingRunId] = useState<string | null>(null);

  const { agents, deploy, reset, isRunning } = useAgentStream();
  const log = useRunLog(agents);

  const runsQuery = trpc.run.list.useQuery({ assetType: branch }, { refetchOnWindowFocus: false });
  const viewingRun = trpc.run.getById.useQuery(viewingRunId!, { enabled: !!viewingRunId });
  const utils = trpc.useUtils();

  const candidates = useMemo(
    () => (runsQuery.data ?? []).filter((r) => STRATEGISABLE.has(r.status)),
    [runsQuery.data],
  );

  const selected = candidates.find((r) => r.id === selectedRunId) ?? null;
  const liveResult = agents.strategy.result;
  const liveStrategy = liveResult?.agentId === "strategy" ? liveResult.strategy : null;
  const streamError = agents.strategy.error;
  const hadRun = isRunning || !!liveStrategy || !!streamError;

  const manualStrategy = useMemo(() => buildBlankStrategy(branch), [branch]);

  useEffect(() => {
    // Refresh the run list when a live run finishes — its status is now strategized.
    if (!isRunning && liveStrategy) void utils.run.list.invalidate();
  }, [isRunning, liveStrategy, utils]);

  const startRun = () => {
    if (!selected || isRunning) return;
    setManual(false);
    setViewingRunId(null);
    log.reset();
    // The endpoint's Zod schema reads only { runId, context }; deploy posts the
    // whole form, and the extra intake fields are ignored server-side.
    const form: HubIntakeForm & { runId: string } = {
      assetName: selected.assetQuery,
      therapeuticArea: "",
      developmentStage: "",
      dealDirection: "Out-licensing",
      geographies: selected.geographies,
      exactGeographies: true,
      assetType: branch,
      context,
      runId: selected.id,
    };
    void deploy(form, "/api/run/strategy");
  };

  // ── Reopened stored strategy ───────────────────────────────────────────────
  if (viewingRunId && viewingRun.data) {
    const stored = viewingRun.data.strategy as unknown as Strategy | null;
    return (
      <div className="space-y-6">
        <button
          onClick={() => setViewingRunId(null)}
          className="text-[12px] text-muted-foreground hover:text-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50 rounded"
        >
          ← Back to Strategy
        </button>
        {stored && Array.isArray(stored.routes) ? (
          <>
            <StrategyResults strategy={stored} branch={branch} assetName={viewingRun.data.assetQuery} />
            {branch === "off_patent" && (
              <CriteriaRefinementSummary
                text={
                  typeof ((viewingRun.data.notes ?? {}) as Record<string, unknown>).strategy === "string"
                    ? (((viewingRun.data.notes ?? {}) as Record<string, unknown>).strategy as string)
                    : ""
                }
              />
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            This run has no stored strategy{viewingRun.data.error ? ` — ${viewingRun.data.error}` : ""}.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E] flex items-center gap-2">
          <GitBranch className="h-6 w-6 text-[#F97316]" aria-hidden="true" />
          {title}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
      </div>

      <Card className="border-border/40 shadow-sm">
        <CardContent className="p-5 space-y-5">
          <div>
            <span id="strategy-branch-label" className={`block ${TINY} mb-1.5`}>
              Asset type
            </span>
            {/* Both branches exist — the other segment navigates, it is not a dead control. */}
            <div
              className="flex rounded-lg border border-border overflow-hidden max-w-sm"
              role="group"
              aria-labelledby="strategy-branch-label"
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
              <fieldset disabled={isRunning} className="min-w-0">
                <legend className={`${TINY} mb-1.5`}>
                  Diagnosed run to strategise{" "}
                  <span className="normal-case tracking-normal font-normal">
                    (strategy consumes a diagnosis — it is never entered cold)
                  </span>
                </legend>
                <ul className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {candidates.map((run) => {
                    const id = `strategy-run-${run.id}`;
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
                            name="strategy-run"
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
                              {geoLine(run.geographies)} · diagnosed{" "}
                              {new Date(run.createdAt).toLocaleDateString()}
                            </span>
                          </span>
                          {run.status === "strategized" && (
                            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                              strategised
                            </span>
                          )}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>

              <div>
                <label htmlFor="strategy-context" className={`block ${TINY} mb-1.5`}>
                  Additional search criteria{" "}
                  <span className="normal-case tracking-normal font-normal">
                    (optional — capital available, appetite for risk, must-keep rights)
                  </span>
                </label>
                <p className="text-[12px] text-muted-foreground leading-relaxed mb-2 max-w-3xl">
                  Free text that steers which routes and partners the engine takes seriously. It is read as part of
                  the brief.{" "}
                  <span className="font-medium text-[#1A1A2E]">It is never printed in the PDF or the PowerPoint.</span>
                </p>
                <textarea
                  id="strategy-context"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={2}
                  maxLength={4000}
                  disabled={isRunning}
                  placeholder="e.g. no appetite to fund a launch; want to keep EU rights"
                  className="w-full px-4 py-3 rounded-lg bg-[#FAFAFA] border border-border text-[14px] text-[#1A1A2E] placeholder-muted-foreground/60 focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] focus:bg-white outline-none transition resize-y"
                />
              </div>

              <div className="flex items-center justify-between gap-3 flex-wrap pt-1 border-t border-border/30">
                <p className="text-[11px] text-muted-foreground">
                  {selected
                    ? `${selected.assetQuery} · ${selected.geographies.length} market${selected.geographies.length === 1 ? "" : "s"} · every route modelled from the same assumption set.`
                    : "To run: pick the diagnosed run this strategy should build on."}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  {selected?.status === "strategized" && (
                    <button
                      type="button"
                      onClick={() => setViewingRunId(selected.id)}
                      className="h-10 rounded-lg border border-border px-3 text-[12px] font-semibold text-[#1A1A2E] transition hover:border-[#F97316] hover:text-[#C2410C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
                    >
                      Open stored strategy
                    </button>
                  )}
                  <Button
                    onClick={startRun}
                    disabled={!selected || isRunning}
                    className="h-10 px-5 bg-[#F97316] hover:bg-[#EA580C] text-white gap-2"
                  >
                    {isRunning ? "Modelling…" : "Model strategy"}
                    {!isRunning && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* Empty state: the single primary action is to go and diagnose. */
            <div className="rounded-xl border-2 border-dashed border-border/60 bg-[#FAFAFA] px-5 py-6">
              <p className={`${TINY} flex items-center gap-1.5 mb-2`}>
                <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" /> A diagnosis has to exist first
              </p>
              <p className="text-[14px] text-[#1A1A2E] leading-relaxed max-w-2xl">
                Strategy answers <em>how</em> to realise value once <em>whether</em> has been settled. It reads the
                verdict, the per-market scores and the swing factors from a completed{" "}
                {BRANCHES[branch].label.toLowerCase()} diagnosis — so there is nothing to compare routes against until
                one exists.
              </p>
              <p className="text-[12px] text-muted-foreground mt-1.5">
                {runsQuery.isLoading
                  ? "Checking for diagnosed runs…"
                  : `No diagnosed ${BRANCHES[branch].label.toLowerCase()} run yet.`}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <Link
                  href={BRANCHES[branch].diagnosisHref}
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-[14px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
                >
                  Run a diagnosis first
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <button
                  type="button"
                  onClick={() => setManual(true)}
                  aria-expanded={manual}
                  aria-controls="strategy-manual"
                  className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground underline underline-offset-4 decoration-border hover:text-[#C2410C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50 rounded"
                >
                  <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
                  or enter assumptions manually
                </button>
              </div>
              {manual && (
                <p className="text-[11px] text-muted-foreground mt-3 max-w-2xl leading-relaxed">
                  Manual mode models the economics only. The engine is deterministic, so hand-entered assumptions give
                  you real NPVs, scenarios and sensitivity — but no evidence, no partner shortlist and no diagnosis
                  behind the numbers.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live run console (§3.4 — no opaque spinners) */}
      {hadRun && <RunConsole events={log.events} running={isRunning} onCancel={reset} title="Strategy run" />}

      {streamError && !isRunning && (
        <p className="text-[13px] text-red-700 font-medium">{streamError}</p>
      )}

      {/* Live results */}
      {liveStrategy && (
        <>
          <StrategyResults strategy={liveStrategy} branch={branch} assetName={selected?.assetQuery ?? "Asset"} />
        </>
      )}

      {/* Manual escape hatch — the deterministic engine with no agent behind it */}
      {manual && !liveStrategy && !hadRun && (
        <div id="strategy-manual">
          <StrategyResults strategy={manualStrategy} branch={branch} assetName="Manual model" />
        </div>
      )}

      {/* Past strategies, always reopenable */}
      {!hadRun && !manual && candidates.some((r) => r.status === "strategized") && (
        <div className="rounded-xl border border-border/40 bg-white p-5">
          <p className={`${TINY} mb-3 flex items-center gap-1.5`}>
            <History className="h-3.5 w-3.5" aria-hidden="true" /> Stored strategies
          </p>
          <ul className="space-y-1">
            {candidates
              .filter((r) => r.status === "strategized")
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
