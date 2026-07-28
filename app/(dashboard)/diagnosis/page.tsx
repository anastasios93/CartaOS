"use client";

/**
 * Pillar 1 — Diagnosis, branch 1A (off-patent): is this asset worth pursuing?
 *
 * One run configuration card (asset + type + worldwide geography + criteria
 * upload), a live run console (§3.4 — no opaque spinners), a decisive verdict
 * with progressive disclosure into the full assessment (§8), and reopenable
 * past runs. Asset type is chosen here once and propagates (§2).
 */

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GeographySelector } from "@/components/run/geography-selector";
import { CriteriaChips } from "@/components/run/criteria-chips";
import { RunFileUpload } from "@/components/run/file-upload";
import { RunConsole } from "@/components/run/run-console";
import { OutLicensingStrategyResults } from "@/components/hub/results/out-licensing-strategy-results";
import { ExecutionPlanResults } from "@/components/hub/results/execution-plan-results";
import { useAgentStream } from "@/hooks/use-agent-stream";
import { trpc } from "@/lib/trpc";
import { DEFAULT_GEOGRAPHIES } from "@/config/geographies";
import { OFF_PATENT_DIMENSIONS } from "@/config/dimensions";
import type { Criterion, RunFile, RunLogEvent } from "@/types/run";
import type { OutLicensingReport, AgentsMap } from "@/types/hub";
import { criteriaToSearchCriteria } from "@/lib/criteria-bridge";
import { Stethoscope, ArrowRight, History, FlaskConical } from "lucide-react";

const VERDICT_STYLE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  GO: { bg: "#DCFCE7", text: "#15803D", border: "#16A34A", label: "GO" },
  CONDITIONAL: { bg: "#FEF3C7", text: "#B45309", border: "#F59E0B", label: "CONDITIONAL GO" },
  NO_GO: { bg: "#FEE2E2", text: "#B91C1C", border: "#EF4444", label: "NO-GO" },
};

/** Accumulates agent-stream state changes into run-console events. */
function useRunLog(agents: AgentsMap): RunLogEvent[] {
  const [events, setEvents] = useState<RunLogEvent[]>([]);
  const prevRef = useRef<Record<string, { msg?: string; sources?: number; done?: boolean; error?: string }>>({});

  useEffect(() => {
    const next: RunLogEvent[] = [];
    const at = new Date().toISOString();
    for (const [id, state] of Object.entries(agents)) {
      const prev = (prevRef.current[id] ??= {});
      if (state.statusMessage && state.statusMessage !== prev.msg) {
        prev.msg = state.statusMessage;
        next.push({ at, kind: "status", message: state.statusMessage, source: id, phase: id });
      }
      if (state.sources.length && state.sources.length !== prev.sources) {
        prev.sources = state.sources.length;
        next.push({ at, kind: "source_hit", message: `${state.sources.length} sources consulted`, source: id, phase: id });
      }
      if (state.result && !prev.done) {
        prev.done = true;
        next.push({ at, kind: "result", message: "completed", source: id, phase: id });
      }
      if (state.error && state.error !== prev.error) {
        prev.error = state.error;
        next.push({ at, kind: "error", message: state.error, source: id, phase: id });
      }
    }
    if (next.length) setEvents((e) => [...e, ...next]);
  }, [agents]);

  const reset = useCallback(() => {
    prevRef.current = {};
    setEvents([]);
  }, []);
  return useMemo(() => Object.assign(events, { reset }), [events, reset]) as RunLogEvent[] & { reset: () => void };
}

export default function DiagnosisPage() {
  const [asset, setAsset] = useState("");
  const [geographies, setGeographies] = useState<string[]>(DEFAULT_GEOGRAPHIES);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [files, setFiles] = useState<RunFile[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [viewingRunId, setViewingRunId] = useState<string | null>(null);

  const { agents, deploy, reset, isRunning } = useAgentStream();
  const log = useRunLog(agents) as RunLogEvent[] & { reset: () => void };

  const runsQuery = trpc.run.list.useQuery({ assetType: "off_patent" }, { refetchOnWindowFocus: false });
  const viewingRun = trpc.run.getById.useQuery(viewingRunId!, { enabled: !!viewingRunId });
  const utils = trpc.useUtils();

  const liveReport = (agents.outLicensingStrategy.result as { report?: OutLicensingReport } | null)?.report;
  const liveExecution = (agents.executionPlan.result as { plan?: unknown } | null)?.plan;
  const hadRun = isRunning || !!liveReport || Object.values(agents).some((a) => a.error);

  const missing: string[] = [];
  if (!asset.trim()) missing.push("name the asset");
  if (geographies.length === 0) missing.push("select at least one market");

  const uploadFiles = async (picked: File[]) => {
    setExtracting(true);
    setFiles((f) => [
      ...f,
      ...picked.map((p) => ({ id: p.name, name: p.name, size: p.size, extractionStatus: "pending" as const })),
    ]);
    try {
      const form = new FormData();
      for (const p of picked) form.append("files", p);
      const res = await fetch("/api/run/criteria", { method: "POST", body: form });
      const data = await res.json();
      const statusByName = new Map<string, { status: "extracted" | "failed"; error?: string }>(
        (data.files ?? []).map((f: { name: string; status: "extracted" | "failed"; error?: string }) => [
          f.name.split("/")[0],
          { status: f.status, error: f.error },
        ]),
      );
      setFiles((prev) =>
        prev.map((f) =>
          statusByName.has(f.name)
            ? { ...f, extractionStatus: statusByName.get(f.name)!.status, extractionError: statusByName.get(f.name)!.error }
            : f,
        ),
      );
      if (Array.isArray(data.criteria) && data.criteria.length) {
        setCriteria((c) => [...c, ...data.criteria]);
        const extractedGeos = (data.criteria as Criterion[])
          .filter((c) => c.category === "geography")
          .flatMap((c) => c.value.length === 2 ? [c.value.toUpperCase()] : []);
        if (extractedGeos.length) setGeographies((g) => [...new Set([...g, ...extractedGeos])]);
        const firstCompound = (data.criteria as Criterion[]).find((c) => c.category === "compound");
        if (firstCompound && !asset.trim()) setAsset(firstCompound.value);
      }
    } catch {
      setFiles((prev) =>
        prev.map((f) =>
          f.extractionStatus === "pending"
            ? { ...f, extractionStatus: "failed" as const, extractionError: "Upload failed — check your connection and retry." }
            : f,
        ),
      );
    } finally {
      setExtracting(false);
    }
  };

  const startRun = () => {
    if (missing.length || isRunning) return;
    setViewingRunId(null);
    log.reset();
    void deploy({
      assetName: asset.trim(),
      therapeuticArea: "",
      developmentStage: "",
      dealDirection: "Out-licensing",
      geographies,
      exactGeographies: true,
      assetType: "off_patent",
      context: "",
      criteria: criteria.length ? criteriaToSearchCriteria(criteria) : undefined,
    });
  };

  useEffect(() => {
    // Refresh the run list when a live run finishes.
    if (!isRunning && liveReport) void utils.run.list.invalidate();
  }, [isRunning, liveReport, utils]);

  // ── Reopened run view ──────────────────────────────────────────────────────
  if (viewingRunId && viewingRun.data) {
    const d = viewingRun.data.diagnosis as {
      verdict?: string;
      worthinessScore?: number | null;
      thesis?: string;
      report?: OutLicensingReport;
      legacy?: { result?: { report?: OutLicensingReport } };
    } | null;
    const report = d?.report ?? d?.legacy?.result?.report;
    return (
      <div className="space-y-6">
        <button onClick={() => setViewingRunId(null)} className="text-[12px] text-muted-foreground hover:text-[#F97316]">
          ← Back to Diagnosis
        </button>
        {d?.verdict && <VerdictHeader verdict={d.verdict} score={d.worthinessScore ?? null} thesis={d.thesis} asset={viewingRun.data.assetQuery} />}
        {report ? (
          <OutLicensingStrategyResults data={{ agentId: "outLicensingStrategy", report }} />
        ) : (
          <p className="text-sm text-muted-foreground">This run has no stored assessment{viewingRun.data.error ? ` — ${viewingRun.data.error}` : ""}.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E] flex items-center gap-2">
          <Stethoscope className="h-6 w-6 text-[#F97316]" />
          Diagnosis — Off-patent
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Is this asset worth pursuing? A decisive GO / Conditional / No-Go verdict per market — scored, sourced, confidence-tagged.
        </p>
      </div>

      {/* Run configuration (§2: one Run object; type chosen here, propagates) */}
      <Card className="border-border/40 shadow-sm">
        <CardContent className="p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4">
            <div>
              <label htmlFor="diag-asset" className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
                Asset / Compound(s)
              </label>
              <input
                id="diag-asset"
                type="text"
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                placeholder="e.g. atorvastatin — or several, comma-separated"
                className="w-full px-4 py-3 rounded-lg bg-[#FAFAFA] border border-border text-[15px] text-[#1A1A2E] placeholder-muted-foreground/60 focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] focus:bg-white outline-none transition"
                disabled={isRunning}
              />
            </div>
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">Asset type</span>
              <div className="flex rounded-lg border border-border overflow-hidden" role="radiogroup" aria-label="Asset type">
                <button role="radio" aria-checked="true" className="flex-1 px-3 py-3 text-[13px] font-semibold bg-[#1A1A2E] text-white">
                  Off-patent
                </button>
                <button
                  role="radio"
                  aria-checked="false"
                  disabled
                  title="The innovative branch ships in the next phase — different dimensions, sources and prompts."
                  className="flex-1 px-3 py-3 text-[13px] text-muted-foreground/50 bg-[#FAFAFA] cursor-not-allowed"
                >
                  Innovative
                </button>
              </div>
            </div>
          </div>

          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">Markets</span>
            <GeographySelector value={geographies} onChange={setGeographies} disabled={isRunning} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
                Criteria documents <span className="normal-case tracking-normal font-normal">(optional — any brief, TPP or parameters sheet)</span>
              </span>
              <RunFileUpload files={files} onFiles={uploadFiles} disabled={isRunning || extracting} />
            </div>
            <div>
              {criteria.length > 0 && (
                <CriteriaChips criteria={criteria} onChange={setCriteria} disabled={isRunning} />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/30">
            {/* A disabled primary action always states the unmet condition. */}
            <p className="text-[11px] text-muted-foreground">
              {missing.length
                ? `To run: ${missing.join(" and ")}.`
                : `${geographies.length} market${geographies.length === 1 ? "" : "s"} · ${criteria.length ? `${criteria.length} criteria applied` : "no custom criteria"} · evaluated per market — the EU is never a single market.`}
            </p>
            <Button
              onClick={startRun}
              disabled={missing.length > 0 || isRunning}
              className="h-10 px-5 bg-[#F97316] hover:bg-[#EA580C] text-white gap-2 shrink-0"
            >
              {isRunning ? "Diagnosing…" : "Run diagnosis"}
              {!isRunning && <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live run console */}
      {hadRun && <RunConsole events={log} running={isRunning} onCancel={reset} title="Diagnosis run" />}

      {/* Live results — verdict first, detail on scroll (§8 progressive disclosure) */}
      {liveReport && (
        <>
          {liveReport.verdict && (
            <VerdictHeader
              verdict={liveReport.verdict === "Go" ? "GO" : liveReport.verdict === "No-Go" ? "NO_GO" : "CONDITIONAL"}
              score={liveReport.weightedWorthiness?.score ?? null}
              thesis={liveReport.opportunityThesis}
              asset={asset}
            />
          )}
          <OutLicensingStrategyResults data={{ agentId: "outLicensingStrategy", report: liveReport }} />
          {liveExecution != null && <ExecutionPlanResults data={{ agentId: "executionPlan", plan: liveExecution } as never} />}
        </>
      )}

      {/* Empty state: what this engine evaluates + recent runs (never a blank page) */}
      {!hadRun && !viewingRunId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border/40 bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3 flex items-center gap-1.5">
              <FlaskConical className="h-3.5 w-3.5" /> What this engine scores
            </p>
            <ul className="space-y-2">
              {OFF_PATENT_DIMENSIONS.map((d) => (
                <li key={d.key} className="text-[13px] text-[#1A1A2E] leading-snug">
                  <span className="font-medium">{d.label}</span>
                  <span className="text-muted-foreground"> — {d.question.split("—")[0].split(";")[0]}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border/40 bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3 flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" /> Recent runs
            </p>
            {runsQuery.data?.length ? (
              <ul className="space-y-1">
                {runsQuery.data.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => setViewingRunId(r.id)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#FAFAFA] transition-colors flex items-center justify-between gap-2"
                    >
                      <span className="text-[13px] font-medium text-[#1A1A2E] truncate">{r.assetQuery}</span>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {r.geographies.slice(0, 4).join(" ")}{r.geographies.length > 4 ? " +" : ""} · {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-muted-foreground">
                {runsQuery.isLoading ? "Loading…" : "No runs yet — your first diagnosis will appear here, reopenable any time."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function VerdictHeader({ verdict, score, thesis, asset }: { verdict: string; score: number | null; thesis?: string; asset: string }) {
  const v = VERDICT_STYLE[verdict] ?? VERDICT_STYLE.CONDITIONAL;
  return (
    <div className="rounded-2xl border-2 bg-white p-6" style={{ borderColor: v.border }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full" style={{ backgroundColor: v.bg, color: v.text }}>
              {v.label}
            </span>
            <span className="text-[12px] text-muted-foreground">{asset || "Asset"}</span>
          </div>
          {thesis && <p className="text-[14px] text-[#1A1A2E] leading-relaxed max-w-3xl mt-2">{thesis}</p>}
        </div>
        {score != null && (
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Worthiness</p>
            <p className="text-4xl font-bold font-mono tracking-tight" style={{ color: v.text }}>{score}</p>
          </div>
        )}
      </div>
    </div>
  );
}
