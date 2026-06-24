"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAgentStream } from "@/hooks/use-agent-stream";
import { trpc } from "@/lib/trpc";
import { CompactIntakeForm } from "@/components/hub/compact-intake-form";
import { ExecutionPlanResults } from "@/components/hub/results/execution-plan-results";
import { OutLicensingStrategyResults } from "@/components/hub/results/out-licensing-strategy-results";
import type { HubIntakeForm, AgentResult } from "@/types/hub";
import {
  exportStrategyReportPDF,
  exportExecutionPlanPDF,
  exportClientDeck,
} from "@/lib/exports";
import {
  Rocket,
  Globe,
  RotateCcw,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileDown,
  FileText,
  Presentation,
  History,
  ChevronRight,
  Clock,
} from "lucide-react";

const PILLAR_COLORS = {
  diagnosis: "#141414",
  strategy: "#C2410C",
  execution: "#F97316",
};

type View = "strategy" | "execution";

export default function SimulatedPlanPage() {
  const { agents, deploy, reset, isRunning, hasResults } = useAgentStream();
  const [submitted, setSubmitted] = useState(false);
  const [view, setView] = useState<View>("strategy");
  const [assetName, setAssetName] = useState<string>("");
  const [exporting, setExporting] = useState<null | "strategy-pdf" | "execution-pdf" | "deck">(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  // Past requests history (persisted per-user by the orchestrator).
  const history = trpc.hub.list.useQuery(undefined, { refetchOnWindowFocus: false });

  // Refresh history once a fresh run finishes so the new request appears.
  const wasRunning = useRef(false);
  useEffect(() => {
    if (wasRunning.current && !isRunning) history.refetch();
    wasRunning.current = isRunning;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  const handleSubmit = (form: HubIntakeForm) => {
    setSubmitted(true);
    setAssetName(form.assetName);
    deploy(form);
  };

  const handleReset = () => {
    reset();
    setSubmitted(false);
    setAssetName("");
  };

  // Viewing a saved report from history replaces the live flow.
  if (viewingId) {
    return <SavedReportView requestId={viewingId} onBack={() => setViewingId(null)} />;
  }

  const executionPlanResult = agents.executionPlan?.result as Extract<AgentResult, { agentId: "executionPlan" }> | null;
  const executionPlanComplete = agents.executionPlan?.status === "complete" && !!executionPlanResult;
  const executionPlanError = agents.executionPlan?.status === "error";

  const strategyResult = agents.outLicensingStrategy?.result as Extract<AgentResult, { agentId: "outLicensingStrategy" }> | null;
  const strategyComplete = agents.outLicensingStrategy?.status === "complete" && !!strategyResult;
  const strategyError = agents.outLicensingStrategy?.status === "error";

  const upstream = [
    { id: "benchmarking" as const, label: "Diagnosis: Comparable Deals", color: PILLAR_COLORS.diagnosis },
    { id: "partner" as const, label: "Strategy: Partners & Synergies", color: PILLAR_COLORS.strategy },
    { id: "negotiation" as const, label: "Strategy: Negotiation Leverage", color: PILLAR_COLORS.strategy },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-[#F97316] transition-colors mb-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Portfolio Overview
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E] flex items-center gap-2">
            <Globe className="h-6 w-6 text-[#F97316]" />
            Market Opportunity Assessment
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Live go/no-go opportunity assessment per geography — regulatory, IP, market & epidemiology, access, competition & manufacturing, with a Commercial Opportunity Score
          </p>
        </div>
        {submitted && (
          <Button variant="outline" size="sm" onClick={handleReset} className="h-9 text-xs gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            New Report
          </Button>
        )}
      </div>

      {/* Pre-submission: explainer + intake */}
      {!submitted && (
        <>
          <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-[#F97316]/10 via-white to-[#FFF7ED]/40 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white shrink-0 shadow-md">
                <Globe className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1A1A2E]">How the Market Opportunity Assessment works</h3>
                <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                  Provide an asset, compound, or company and the AI agents pull live data from authoritative global regulatory,
                  clinical, IP and commercial sources (openFDA · ClinicalTrials.gov · Orange &amp; Purple Book · EMA · CTIS · NMPA/CDE · PMDA · Health Canada · SEC EDGAR · The Lens · WHO ICTRP),
                  then score each major market on regulatory feasibility, IP &amp; exclusivity, market size &amp; epidemiology, access &amp; pricing, competitive density and manufacturing — producing a Commercial Opportunity Score and a board-level go/no-go verdict.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                  <DimensionPreview emoji="📈" label="Market & Epi" desc="Size, growth, incidence/prevalence, unmet need" color="#141414" />
                  <DimensionPreview emoji="⚖️" label="Regulatory" desc="Expedited pathways, exclusivity clocks, hurdles" color="#6B6B6B" />
                  <DimensionPreview emoji="🏢" label="Access & Comp." desc="HTA/pricing, reimbursement, competitive density" color="#C2410C" />
                  <DimensionPreview emoji="🛡️" label="IP" desc="Patent strength, FTO, expiration, opportunities" color="#F97316" />
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mt-3">
                  {[
                    { flag: "🇺🇸", label: "US" },
                    { flag: "🇩🇪", label: "Germany" },
                    { flag: "🇫🇷", label: "France" },
                    { flag: "🇮🇹", label: "Italy" },
                    { flag: "🇪🇸", label: "Spain" },
                    { flag: "🇯🇵", label: "Japan" },
                    { flag: "🇨🇳", label: "China" },
                    { flag: "🌍", label: "ROW" },
                  ].map(r => (
                    <div key={r.label} className="rounded-lg bg-white border border-border/40 p-2.5 text-center">
                      <span className="text-xl">{r.flag}</span>
                      <p className="text-[11px] font-semibold text-[#1A1A2E] mt-1">{r.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <CompactIntakeForm onSubmit={handleSubmit} isLoading={isRunning} />

          <RequestHistoryPanel
            items={history.data ?? []}
            isLoading={history.isLoading}
            onOpen={setViewingId}
          />
        </>
      )}

      {/* Pipeline status (post-submission) */}
      {submitted && (
        <Card className="border-border/40 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              {isRunning ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F97316] opacity-60" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#F97316]" />
                  </span>
                  <p className="text-sm font-semibold text-[#1A1A2E]">Scoring the market opportunity & building the plan...</p>
                </>
              ) : (strategyComplete || executionPlanComplete) ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-[#F97316]" />
                  <p className="text-sm font-semibold text-[#1A1A2E]">Reports ready</p>
                </>
              ) : (strategyError || executionPlanError) ? (
                <>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <p className="text-sm font-semibold text-red-700">Report generation failed</p>
                </>
              ) : null}
            </div>

            <div className="space-y-2 pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Pipeline</p>
              <div className="space-y-1.5">
                {upstream.map(u => {
                  const state = agents[u.id];
                  return (
                    <PipelineRow
                      key={u.id}
                      label={u.label}
                      color={u.color}
                      status={state?.status ?? "idle"}
                      message={state?.statusMessage}
                      sources={state?.sources?.length ?? 0}
                    />
                  );
                })}
                <div className="pt-1.5 mt-1.5 border-t border-dashed border-border/50">
                  <PipelineRow
                    label="Market Opportunity Assessment (six-vector COS per region)"
                    color="#F97316"
                    status={agents.outLicensingStrategy?.status ?? "idle"}
                    message={agents.outLicensingStrategy?.statusMessage}
                    sources={0}
                    isFinal
                  />
                  <PipelineRow
                    label="Execution Plan (timeline, stakeholders, dependencies)"
                    color={PILLAR_COLORS.execution}
                    status={agents.executionPlan?.status ?? "idle"}
                    message={agents.executionPlan?.statusMessage}
                    sources={0}
                    isFinal
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export bar + view toggle — only once a real report is ready */}
      {(strategyComplete || executionPlanComplete) && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2 p-1 bg-[#F1F5F9] rounded-xl w-fit">
            <button
              onClick={() => setView("strategy")}
              className="flex items-center gap-2 px-4 py-2 text-[12px] font-semibold rounded-lg transition"
              style={{
                backgroundColor: view === "strategy" ? "#FFFFFF" : "transparent",
                color: view === "strategy" ? "#F97316" : "#64748B",
                boxShadow: view === "strategy" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
              }}
            >
              <Globe className="h-3.5 w-3.5" />
              Opportunity Assessment
            </button>
            <button
              onClick={() => setView("execution")}
              className="flex items-center gap-2 px-4 py-2 text-[12px] font-semibold rounded-lg transition"
              style={{
                backgroundColor: view === "execution" ? "#FFFFFF" : "transparent",
                color: view === "execution" ? "#F97316" : "#64748B",
                boxShadow: view === "execution" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
              }}
            >
              <Rocket className="h-3.5 w-3.5" />
              Execution Plan
            </button>
          </div>

          {/* Export buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 mr-1">
              <FileDown className="inline h-3 w-3 mr-1" />
              Export
            </span>
            <button
              onClick={async () => {
                if (!strategyResult) return;
                setExporting("strategy-pdf");
                try {
                  await exportStrategyReportPDF(strategyResult.report, assetName || "Asset");
                } finally {
                  setExporting(null);
                }
              }}
              disabled={!strategyComplete || exporting !== null}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#F97316] text-white text-[12px] font-semibold hover:bg-[#EA580C] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting === "strategy-pdf" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="h-3.5 w-3.5" />
              )}
              Assessment PDF
            </button>
            <button
              onClick={async () => {
                if (!executionPlanResult) return;
                setExporting("execution-pdf");
                try {
                  await exportExecutionPlanPDF(executionPlanResult.plan, assetName || "Asset");
                } finally {
                  setExporting(null);
                }
              }}
              disabled={!executionPlanComplete || exporting !== null}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#F97316] text-white text-[12px] font-semibold hover:bg-[#EA580C] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting === "execution-pdf" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Rocket className="h-3.5 w-3.5" />
              )}
              Execution PDF
            </button>
            <button
              onClick={async () => {
                setExporting("deck");
                try {
                  await exportClientDeck(
                    assetName || "Asset",
                    strategyResult?.report ?? null,
                    executionPlanResult?.plan ?? null,
                  );
                } finally {
                  setExporting(null);
                }
              }}
              disabled={(!strategyComplete && !executionPlanComplete) || exporting !== null}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-gradient-to-r from-[#1A1A2E] to-[#0F0F1B] text-white text-[12px] font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting === "deck" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Presentation className="h-3.5 w-3.5" />
              )}
              Client Deck (PPTX)
            </button>
          </div>
        </div>
      )}

      {/* (legacy view toggle removed — merged above) */}
      {false && (
        <div className="flex gap-2 p-1 bg-[#F1F5F9] rounded-xl w-fit">
          <button
            onClick={() => setView("strategy")}
            className="flex items-center gap-2 px-4 py-2 text-[12px] font-semibold rounded-lg transition"
            style={{
              backgroundColor: view === "strategy" ? "#FFFFFF" : "transparent",
              color: view === "strategy" ? "#F97316" : "#64748B",
              boxShadow: view === "strategy" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
            }}
          >
            <Globe className="h-3.5 w-3.5" />
            Strategy Report
          </button>
          <button
            onClick={() => setView("execution")}
            className="flex items-center gap-2 px-4 py-2 text-[12px] font-semibold rounded-lg transition"
            style={{
              backgroundColor: view === "execution" ? "#FFFFFF" : "transparent",
              color: view === "execution" ? "#F97316" : "#64748B",
              boxShadow: view === "execution" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
            }}
          >
            <Rocket className="h-3.5 w-3.5" />
            Execution Plan
          </button>
        </div>
      )}

      {/* Error block */}
      {(strategyError || executionPlanError) && !strategyComplete && !executionPlanComplete && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Report generation failed</p>
              <p className="text-xs text-red-600 mt-1 leading-relaxed">
                {agents.outLicensingStrategy?.error || agents.executionPlan?.error || "Unknown error"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STRATEGY VIEW */}
      {view === "strategy" && strategyComplete && strategyResult && (
        <OutLicensingStrategyResults data={strategyResult} />
      )}

      {/* EXECUTION VIEW */}
      {view === "execution" && executionPlanComplete && executionPlanResult && (
        <ExecutionPlanResults data={executionPlanResult} />
      )}

      {/* Loading state */}
      {submitted && !strategyComplete && !executionPlanComplete && !strategyError && !executionPlanError && (
        <LoadingBlock label="Pulling global data and generating your regional strategy report..." />
      )}
    </div>
  );
}

function DimensionPreview({ emoji, label, desc, color }: { emoji: string; label: string; desc: string; color: string }) {
  return (
    <div className="rounded-lg bg-white border border-border/40 p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-base">{emoji}</span>
        <span className="text-[12px] font-bold" style={{ color }}>{label}</span>
      </div>
      <p className="text-[10px] text-muted-foreground leading-tight">{desc}</p>
    </div>
  );
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-[#FAFAFA] p-12 text-center">
      <div className="inline-flex items-center gap-2.5 text-[13px] text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-[#F97316]" />
        {label}
      </div>
    </div>
  );
}

function PipelineRow({
  label,
  color,
  status,
  message,
  sources,
  isFinal,
}: {
  label: string;
  color: string;
  status: string;
  message?: string;
  sources: number;
  isFinal?: boolean;
}) {
  const isActive = status === "scraping" || status === "analyzing";
  const isDone = status === "complete";
  const isError = status === "error";
  return (
    <div className="flex items-center gap-3">
      <div className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">
        {isActive && <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color }} />}
        {isDone && <CheckCircle2 className="h-3.5 w-3.5" style={{ color }} />}
        {isError && <AlertCircle className="h-3.5 w-3.5 text-red-500" />}
        {!isActive && !isDone && !isError && <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />}
      </div>
      <span className={`text-[12px] flex-1 truncate ${isFinal ? "font-bold text-[#1A1A2E]" : "text-[#475569]"}`}>{label}</span>
      {isActive && message && (
        <span className="text-[10px] text-muted-foreground truncate max-w-[280px]">{message}</span>
      )}
    </div>
  );
}

// ─── Past Requests history ──────────────────────────────────────────────────

type HistoryItem = {
  id: string;
  assetName: string;
  therapeuticArea: string;
  stage: string;
  dealDirection: string;
  geographies: string[];
  status: string;
  createdAt: Date | string;
  completedAt: Date | string | null;
  _count: { results: number };
};

function formatWhen(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    complete: { bg: "#C2410C15", text: "#C2410C", label: "Complete" },
    running: { bg: "#F9731615", text: "#F97316", label: "Running" },
    error: { bg: "#EF444415", text: "#EF4444", label: "Failed" },
  };
  const s = map[status] ?? { bg: "#64748B15", text: "#64748B", label: status };
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: s.bg, color: s.text }}>
      {s.label}
    </span>
  );
}

function RequestHistoryPanel({
  items,
  isLoading,
  onOpen,
}: {
  items: HistoryItem[];
  isLoading: boolean;
  onOpen: (id: string) => void;
}) {
  return (
    <Card className="border-border/40 shadow-sm">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-[#F97316]" />
          <h3 className="text-sm font-bold text-[#1A1A2E]">Past Requests</h3>
          {items.length > 0 && (
            <span className="text-[11px] text-muted-foreground">({items.length})</span>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground py-4">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading your past requests...
          </div>
        ) : items.length === 0 ? (
          <p className="text-[12px] text-muted-foreground py-3">
            No requests yet. Submit an asset above and it will be saved here so you can reopen the report later.
          </p>
        ) : (
          <div className="space-y-1.5">
            {items.map(item => {
              const reopenable = item.status === "complete" && item._count.results > 0;
              return (
                <button
                  key={item.id}
                  onClick={() => reopenable && onOpen(item.id)}
                  disabled={!reopenable}
                  className="w-full flex items-center gap-3 rounded-lg border border-border/40 bg-[#FAFAFA] hover:bg-[#F1F5F9] transition px-3 py-2.5 text-left disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-[#1A1A2E] truncate">{item.assetName}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatWhen(item.createdAt)}</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span>{item.dealDirection}</span>
                      {item.geographies?.length > 0 && (
                        <>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="truncate">{item.geographies.join(", ")}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {reopenable && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Saved report viewer ────────────────────────────────────────────────────

function SavedReportView({ requestId, onBack }: { requestId: string; onBack: () => void }) {
  const detail = trpc.hub.getById.useQuery(requestId);
  const [view, setView] = useState<View>("strategy");
  const [exporting, setExporting] = useState<null | "strategy-pdf" | "execution-pdf" | "deck">(null);

  const BackBar = (
    <Button variant="outline" size="sm" onClick={onBack} className="h-9 text-xs gap-1.5">
      <ArrowLeft className="h-3.5 w-3.5" />
      Back to requests
    </Button>
  );

  if (detail.isLoading) {
    return (
      <div className="space-y-6">
        {BackBar}
        <LoadingBlock label="Loading saved report..." />
      </div>
    );
  }

  if (detail.error || !detail.data) {
    return (
      <div className="space-y-6">
        {BackBar}
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-red-700">Could not load this saved report.</p>
        </div>
      </div>
    );
  }

  const { assetName, createdAt, results } = detail.data;
  const strategyResult =
    (results.find(r => r.agentId === "outLicensingStrategy")?.result as Extract<AgentResult, { agentId: "outLicensingStrategy" }> | undefined) ?? null;
  const executionPlanResult =
    (results.find(r => r.agentId === "executionPlan")?.result as Extract<AgentResult, { agentId: "executionPlan" }> | undefined) ?? null;

  // Fall back to whichever report exists so the toggle never shows a blank pane.
  const effectiveView: View =
    view === "execution" && executionPlanResult
      ? "execution"
      : strategyResult
        ? "strategy"
        : executionPlanResult
          ? "execution"
          : "strategy";

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-[#F97316] transition-colors mb-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to requests
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E] flex items-center gap-2">
            <History className="h-6 w-6 text-[#F97316]" />
            {assetName}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Saved report · {formatWhen(createdAt)}
          </p>
        </div>
      </div>

      {!strategyResult && !executionPlanResult ? (
        <div className="rounded-xl border border-border/40 bg-[#FAFAFA] p-8 text-center text-[13px] text-muted-foreground">
          This request did not produce a saved strategy or execution report.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-2 p-1 bg-[#F1F5F9] rounded-xl w-fit">
              <button
                onClick={() => setView("strategy")}
                disabled={!strategyResult}
                className="flex items-center gap-2 px-4 py-2 text-[12px] font-semibold rounded-lg transition disabled:opacity-40"
                style={{
                  backgroundColor: effectiveView === "strategy" ? "#FFFFFF" : "transparent",
                  color: effectiveView === "strategy" ? "#F97316" : "#64748B",
                  boxShadow: effectiveView === "strategy" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                }}
              >
                <Globe className="h-3.5 w-3.5" />
                Opportunity Assessment
              </button>
              <button
                onClick={() => setView("execution")}
                disabled={!executionPlanResult}
                className="flex items-center gap-2 px-4 py-2 text-[12px] font-semibold rounded-lg transition disabled:opacity-40"
                style={{
                  backgroundColor: effectiveView === "execution" ? "#FFFFFF" : "transparent",
                  color: effectiveView === "execution" ? "#F97316" : "#64748B",
                  boxShadow: effectiveView === "execution" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                }}
              >
                <Rocket className="h-3.5 w-3.5" />
                Execution Plan
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 mr-1">
                <FileDown className="inline h-3 w-3 mr-1" />
                Export
              </span>
              <button
                onClick={async () => {
                  if (!strategyResult) return;
                  setExporting("strategy-pdf");
                  try {
                    await exportStrategyReportPDF(strategyResult.report, assetName || "Asset");
                  } finally {
                    setExporting(null);
                  }
                }}
                disabled={!strategyResult || exporting !== null}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#F97316] text-white text-[12px] font-semibold hover:bg-[#EA580C] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting === "strategy-pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                Assessment PDF
              </button>
              <button
                onClick={async () => {
                  if (!executionPlanResult) return;
                  setExporting("execution-pdf");
                  try {
                    await exportExecutionPlanPDF(executionPlanResult.plan, assetName || "Asset");
                  } finally {
                    setExporting(null);
                  }
                }}
                disabled={!executionPlanResult || exporting !== null}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#F97316] text-white text-[12px] font-semibold hover:bg-[#EA580C] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting === "execution-pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                Execution PDF
              </button>
              <button
                onClick={async () => {
                  setExporting("deck");
                  try {
                    await exportClientDeck(assetName || "Asset", strategyResult?.report ?? null, executionPlanResult?.plan ?? null);
                  } finally {
                    setExporting(null);
                  }
                }}
                disabled={(!strategyResult && !executionPlanResult) || exporting !== null}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-gradient-to-r from-[#1A1A2E] to-[#0F0F1B] text-white text-[12px] font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting === "deck" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Presentation className="h-3.5 w-3.5" />}
                Client Deck (PPTX)
              </button>
            </div>
          </div>

          {effectiveView === "strategy" && strategyResult && <OutLicensingStrategyResults data={strategyResult} />}
          {effectiveView === "execution" && executionPlanResult && <ExecutionPlanResults data={executionPlanResult} />}
        </>
      )}
    </div>
  );
}
