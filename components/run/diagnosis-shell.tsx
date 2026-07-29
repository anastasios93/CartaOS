"use client";

/**
 * Pillar 1 — the shared Diagnosis shell (§4: "implement the shared shell once;
 * make the dimension set and source routing configuration-driven, not
 * copy-pasted").
 *
 * Both branches (1A off-patent, 1B innovative) mount this component. It owns the
 * whole run scaffolding — one run-configuration card (asset + type + geography +
 * criteria upload), a live run console (§3.4 — no opaque spinners), the empty
 * state, and reopenable past runs — and delegates only the branch-specific
 * results rendering back to the caller. The dimension set arrives as a prop from
 * config/dimensions.ts; the branch decides which agent's result is watched.
 */

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GeographySelector } from "@/components/run/geography-selector";
import { CriteriaChips } from "@/components/run/criteria-chips";
import { RunFileUpload } from "@/components/run/file-upload";
import { RunConsole } from "@/components/run/run-console";
import { useAgentStream } from "@/hooks/use-agent-stream";
import { useRunLog } from "@/hooks/use-run-log";
import { ExportMenu, type ExportFormat } from "@/components/run/export-menu";
import { CriteriaRefinementInput, CriteriaRefinementSummary } from "@/components/run/criteria-refinement";
import { exportDiagnosisPDF, exportDiagnosisPPTX, type ExportOptions } from "@/lib/exports";
import { mapReportToDiagnosis } from "@/server/services/run-mapper";
import { trpc } from "@/lib/trpc";
import { DEFAULT_GEOGRAPHIES } from "@/config/geographies";
import { criteriaToSearchCriteria } from "@/lib/criteria-bridge";
import type { AssetType, Criterion, Diagnosis, RunFile } from "@/types/run";
import type { AgentsMap } from "@/types/hub";
import { ArrowRight, History, FlaskConical, Stethoscope, type LucideIcon } from "lucide-react";

// ── Branch routing (configuration, not copy-paste) ───────────────────────────

interface BranchDef {
  label: string;
  href: string;
}

const BRANCHES: Record<AssetType, BranchDef> = {
  off_patent: { label: "Off-patent", href: "/diagnosis" },
  innovative: { label: "Innovative", href: "/diagnosis/innovative" },
};

const BRANCH_ORDER: AssetType[] = ["off_patent", "innovative"];

/** Which agent's stream result carries this branch's diagnosis. */
export type DiagnosisAgentId = "outLicensingStrategy" | "innovativeDiagnosis";

/** The minimum a dimension must expose for the empty state — the full def lives in config/dimensions.ts. */
export interface ShellDimension {
  key: string;
  label: string;
  question: string;
}

/** The stored-run shape a reopened run hands to the branch viewer. */
export interface SavedRunView {
  diagnosis: unknown;
  assetQuery: string;
  error: string | null;
}

/** Extra live context a branch may need beyond its own agent result. */
export interface LiveResultContext {
  agents: AgentsMap;
  assetQuery: string;
}

export interface DiagnosisShellProps {
  branch: AssetType;
  title: string;
  subtitle: string;
  /** Drives the "what this engine scores" empty state — pass the branch's config set. */
  dimensions: ShellDimension[];
  agentId: DiagnosisAgentId;
  /** Branch-specific live results. The second argument is optional context. */
  renderResults: (result: unknown, ctx: LiveResultContext) => ReactNode;
  /** Branch-specific reopened-run view. */
  renderRunViewer: (run: SavedRunView) => ReactNode;
  /** Header icon; defaults to the stethoscope used by 1A. */
  icon?: LucideIcon;
}

/**
 * The exportable Diagnosis, whatever the source.
 *
 * The innovative agent emits the envelope directly. The off-patent agent emits
 * its own richer report, which the server maps on persist — that mapper is pure,
 * so the same mapping runs here and a live off-patent run is exportable without
 * waiting for a round-trip. A reopened run already carries the stored envelope.
 */
function toDiagnosis(value: unknown): Diagnosis | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  if (rec.diagnosis && typeof rec.diagnosis === "object") return rec.diagnosis as Diagnosis;
  if (rec.verdict && Array.isArray(rec.dimensions)) return rec as unknown as Diagnosis;
  if (rec.report && typeof rec.report === "object") {
    try {
      return mapReportToDiagnosis(rec.report as Parameters<typeof mapReportToDiagnosis>[0]);
    } catch {
      return null;
    }
  }
  return null;
}

/** The lead clause of a dimension question — enough to orient, never a wall of text. */
function firstClause(question: string): string {
  const head = question.split("—")[0].split(";")[0].trim();
  if (head.length <= 96) return head.replace(/[.,]$/, "");
  const cut = head.slice(0, 96);
  const lastComma = cut.lastIndexOf(",");
  return `${(lastComma > 40 ? cut.slice(0, lastComma) : cut).trim()}…`;
}

export function DiagnosisShell({
  branch,
  title,
  subtitle,
  dimensions,
  agentId,
  renderResults,
  renderRunViewer,
  icon: Icon = Stethoscope,
}: DiagnosisShellProps) {
  const [asset, setAsset] = useState("");
  const [geographies, setGeographies] = useState<string[]>(DEFAULT_GEOGRAPHIES);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [files, setFiles] = useState<RunFile[]>([]);
  const [extracting, setExtracting] = useState(false);
  /** Free text passed to the agents as part of the brief (§ refines the search). */
  const [refinement, setRefinement] = useState("");
  const [viewingRunId, setViewingRunId] = useState<string | null>(null);

  const { agents, deploy, reset, isRunning } = useAgentStream();
  const log = useRunLog(agents);

  const runsQuery = trpc.run.list.useQuery({ assetType: branch }, { refetchOnWindowFocus: false });
  const viewingRun = trpc.run.getById.useQuery(viewingRunId!, { enabled: !!viewingRunId });
  const utils = trpc.useUtils();

  const liveResult = agents[agentId].result as unknown;
  const hadRun = isRunning || !!liveResult || Object.values(agents).some((a) => a.error);

  /** Whichever diagnosis is on screen — the reopened one wins while it is open. */
  const exportable = viewingRunId
    ? toDiagnosis(viewingRun.data?.diagnosis)
    : toDiagnosis(liveResult);
  const exportName = viewingRunId ? (viewingRun.data?.assetQuery ?? "asset") : asset || "asset";

  /** What a reopened run was asked, so the brief travels with the result. */
  const storedRefinement = (() => {
    const n = (viewingRun.data?.notes ?? {}) as Record<string, unknown>;
    return typeof n.diagnosis === "string" ? n.diagnosis : "";
  })();

  const runExport = async (format: ExportFormat, options: ExportOptions) => {
    if (!exportable) throw new Error("This run has no diagnosis to export yet.");
    if (format === "pptx") await exportDiagnosisPPTX(exportable, branch, exportName, options);
    else await exportDiagnosisPDF(exportable, branch, exportName, options);
  };

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
          .flatMap((c) => (c.value.length === 2 ? [c.value.toUpperCase()] : []));
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
      assetType: branch,
      context: refinement.trim(),
      criteria: criteria.length ? criteriaToSearchCriteria(criteria) : undefined,
    });
  };

  useEffect(() => {
    // Refresh the run list when a live run finishes.
    if (!isRunning && liveResult) void utils.run.list.invalidate();
  }, [isRunning, liveResult, utils]);

  // ── Reopened run view ──────────────────────────────────────────────────────
  if (viewingRunId && viewingRun.data) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setViewingRunId(null)}
            className="text-[12px] text-muted-foreground hover:text-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50 rounded"
          >
            ← Back to Diagnosis
          </button>
          {exportable && <ExportMenu onExport={runExport} label="Export diagnosis" />}
        </div>
        {renderRunViewer({
          diagnosis: viewingRun.data.diagnosis as unknown,
          assetQuery: viewingRun.data.assetQuery,
          error: viewingRun.data.error ?? null,
        })}
        {branch === "off_patent" && <CriteriaRefinementSummary text={storedRefinement} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E] flex items-center gap-2">
          <Icon className="h-6 w-6 text-[#F97316]" aria-hidden="true" />
          {title}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
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
              <span id="diag-asset-type-label" className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
                Asset type
              </span>
              {/* Both branches exist — the other segment navigates, it is not a dead control. */}
              <div className="flex rounded-lg border border-border overflow-hidden" role="group" aria-labelledby="diag-asset-type-label">
                {BRANCH_ORDER.map((key) => {
                  const def = BRANCHES[key];
                  return key === branch ? (
                    <span
                      key={key}
                      aria-current="page"
                      className="flex-1 px-3 py-3 text-[13px] font-semibold bg-[#1A1A2E] text-white text-center"
                    >
                      {def.label}
                    </span>
                  ) : (
                    <Link
                      key={key}
                      href={def.href}
                      className="flex-1 px-3 py-3 text-[13px] text-muted-foreground bg-[#FAFAFA] text-center transition-colors hover:bg-white hover:text-[#1A1A2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#F97316]/50"
                    >
                      {def.label}
                    </Link>
                  );
                })}
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
              {criteria.length > 0 && <CriteriaChips criteria={criteria} onChange={setCriteria} disabled={isRunning} />}
            </div>
          </div>

          {branch === "off_patent" && (
            <CriteriaRefinementInput value={refinement} onChange={setRefinement} disabled={isRunning} />
          )}

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
      {hadRun && <RunConsole events={log.events} running={isRunning} onCancel={reset} title="Diagnosis run" />}

      {/* Live results — verdict first, detail on expand (§8 progressive disclosure) */}
      {!!liveResult && (
        <>
          {exportable && !isRunning && (
            <div className="flex justify-end">
              <ExportMenu onExport={runExport} label="Export diagnosis" />
            </div>
          )}
          {renderResults(liveResult, { agents, assetQuery: asset })}
        </>
      )}

      {/* Empty state: what this engine evaluates + recent runs (never a blank page) */}
      {!hadRun && !viewingRunId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border/40 bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3 flex items-center gap-1.5">
              <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" /> What this engine scores
            </p>
            <ul className="space-y-2">
              {dimensions.map((d) => (
                <li key={d.key} className="text-[13px] text-[#1A1A2E] leading-snug">
                  <span className="font-medium">{d.label}</span>
                  <span className="text-muted-foreground"> — {firstClause(d.question)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border/40 bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3 flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" aria-hidden="true" /> Recent runs
            </p>
            {runsQuery.data?.length ? (
              <ul className="space-y-1">
                {runsQuery.data.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => setViewingRunId(r.id)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#FAFAFA] transition-colors flex items-center justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
                    >
                      <span className="text-[13px] font-medium text-[#1A1A2E] truncate">{r.assetQuery}</span>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {r.geographies.slice(0, 4).join(" ")}
                        {r.geographies.length > 4 ? " +" : ""} · {new Date(r.createdAt).toLocaleDateString()}
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
