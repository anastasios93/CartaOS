"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAgentStream } from "@/hooks/use-agent-stream";
import { CompactIntakeForm } from "@/components/hub/compact-intake-form";
import { ExecutionPlanResults } from "@/components/hub/results/execution-plan-results";
import { OutLicensingStrategyResults } from "@/components/hub/results/out-licensing-strategy-results";
import type { HubIntakeForm, AgentResult } from "@/types/hub";
import { SAMPLE_EXECUTION_PLAN } from "@/lib/sample-execution-plan";
import { SAMPLE_OUT_LICENSING_REPORT } from "@/lib/sample-out-licensing-report";
import {
  Rocket,
  Globe,
  RotateCcw,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";

const PILLAR_COLORS = {
  diagnosis: "#3B82F6",
  strategy: "#10B981",
  execution: "#F97316",
};

type View = "strategy" | "execution";

export default function SimulatedPlanPage() {
  const { agents, deploy, reset, isRunning, hasResults } = useAgentStream();
  const [submitted, setSubmitted] = useState(false);
  const [showSample, setShowSample] = useState(true);
  const [view, setView] = useState<View>("strategy");

  const handleSubmit = (form: HubIntakeForm) => {
    setSubmitted(true);
    setShowSample(false);
    deploy(form);
  };

  const handleReset = () => {
    reset();
    setSubmitted(false);
    setShowSample(true);
  };

  const executionPlanResult = agents.executionPlan?.result as Extract<AgentResult, { agentId: "executionPlan" }> | null;
  const executionPlanComplete = agents.executionPlan?.status === "complete" && !!executionPlanResult;
  const executionPlanError = agents.executionPlan?.status === "error";

  const strategyResult = agents.outLicensingStrategy?.result as Extract<AgentResult, { agentId: "outLicensingStrategy" }> | null;
  const strategyComplete = agents.outLicensingStrategy?.status === "complete" && !!strategyResult;
  const strategyError = agents.outLicensingStrategy?.status === "error";

  // Status of upstream agents
  const upstream = [
    { id: "benchmarking" as const, label: "Diagnosis: Comparable Deals", color: PILLAR_COLORS.diagnosis },
    { id: "partner" as const, label: "Strategy: Partners & Synergies", color: PILLAR_COLORS.strategy },
    { id: "negotiation" as const, label: "Strategy: Negotiation Leverage", color: PILLAR_COLORS.strategy },
    { id: "termsheet" as const, label: "Strategy: Term Sheet", color: PILLAR_COLORS.strategy },
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
            <Globe className="h-6 w-6 text-[#0EA5E9]" />
            Out-Licensing Strategy & Execution
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Live regional report covering market, legal, commercial & IP assessment per geography — with executable plan
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(submitted || showSample) && !strategyComplete && !executionPlanComplete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSample(!showSample)}
              className="h-9 text-xs gap-1.5"
            >
              {showSample ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showSample ? "Hide Sample" : "Preview Sample"}
            </Button>
          )}
          {submitted && (
            <Button variant="outline" size="sm" onClick={handleReset} className="h-9 text-xs gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              New Report
            </Button>
          )}
        </div>
      </div>

      {/* Pre-submission: explainer + intake */}
      {!submitted && (
        <>
          <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-[#0EA5E9]/10 via-white to-[#FFF7ED]/40 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#0EA5E9] to-[#0284C7] text-white shrink-0 shadow-md">
                <Globe className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1A1A2E]">How the Out-Licensing Strategy works</h3>
                <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                  Provide an asset, compound, or company and the AI agents will pull live data from 12+ global pharma databases
                  (SEC EDGAR · ClinicalTrials.gov · FDA · Orange Book · FAERS · DailyMed · ChEMBL · RxNorm · EMA · Health Canada · PubMed · Patents · News),
                  then generate a comprehensive regional report covering each major market with full Market, Legal, Commercial & IP assessment.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                  <DimensionPreview emoji="📈" label="Market" desc="TAM, growth, drivers, barriers, unmet need" color="#3B82F6" />
                  <DimensionPreview emoji="⚖️" label="Legal" desc="Regulatory pathway, exclusivity, barriers" color="#A855F7" />
                  <DimensionPreview emoji="🏢" label="Commercial" desc="Competitors, pricing, reimbursement, partners" color="#10B981" />
                  <DimensionPreview emoji="🛡️" label="IP" desc="Patent strength, FTO, expiration, opportunities" color="#F97316" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
                  {[
                    { flag: "🇺🇸", label: "US" },
                    { flag: "🇪🇺", label: "EU" },
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
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0EA5E9] opacity-60" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0EA5E9]" />
                  </span>
                  <p className="text-sm font-semibold text-[#1A1A2E]">Building strategy & execution plan...</p>
                </>
              ) : (strategyComplete || executionPlanComplete) ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
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
                    label="Out-Licensing Strategy Report (Market/Legal/Commercial/IP per region)"
                    color="#0EA5E9"
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

      {/* View toggle */}
      {(strategyComplete || executionPlanComplete || showSample) && (
        <div className="flex gap-2 p-1 bg-[#F1F5F9] rounded-xl w-fit">
          <button
            onClick={() => setView("strategy")}
            className="flex items-center gap-2 px-4 py-2 text-[12px] font-semibold rounded-lg transition"
            style={{
              backgroundColor: view === "strategy" ? "#FFFFFF" : "transparent",
              color: view === "strategy" ? "#0EA5E9" : "#64748B",
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

      {/* Error blocks */}
      {(strategyError || executionPlanError) && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 space-y-2">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Report generation failed</p>
              <p className="text-xs text-red-600 mt-1 leading-relaxed">
                {agents.outLicensingStrategy?.error || agents.executionPlan?.error || "Unknown error"}
              </p>
              <p className="text-xs text-red-500 mt-2">
                Showing sample report below so you can preview the UI.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STRATEGY VIEW (default) */}
      {view === "strategy" && (
        <>
          {strategyComplete && strategyResult && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live AI Strategy Report
                </span>
              </div>
              <OutLicensingStrategyResults data={strategyResult} />
            </div>
          )}
          {!strategyComplete && showSample && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFF7ED] text-[#F97316] text-[11px] font-semibold">
                  <Eye className="h-3 w-3" />
                  Sample Report Preview
                </span>
                <p className="text-[11px] text-muted-foreground">
                  {submitted
                    ? "Showing illustrative example while agents run."
                    : "Illustrative example — Phase II oncology asset across 5 regions with Market/Legal/Commercial/IP."}
                </p>
              </div>
              <OutLicensingStrategyResults
                data={{ agentId: "outLicensingStrategy", report: SAMPLE_OUT_LICENSING_REPORT }}
              />
            </div>
          )}
          {submitted && !strategyComplete && !showSample && !strategyError && (
            <LoadingBlock label="Building regional Market/Legal/Commercial/IP assessment..." />
          )}
        </>
      )}

      {/* EXECUTION VIEW */}
      {view === "execution" && (
        <>
          {executionPlanComplete && executionPlanResult && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live AI Execution Plan
                </span>
              </div>
              <ExecutionPlanResults data={executionPlanResult} />
            </div>
          )}
          {!executionPlanComplete && showSample && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFF7ED] text-[#F97316] text-[11px] font-semibold">
                  <Eye className="h-3 w-3" />
                  Sample Plan Preview
                </span>
              </div>
              <ExecutionPlanResults
                data={{ agentId: "executionPlan", plan: SAMPLE_EXECUTION_PLAN }}
              />
            </div>
          )}
          {submitted && !executionPlanComplete && !showSample && !executionPlanError && (
            <LoadingBlock label="Building execution plan with timeline & stakeholders..." />
          )}
        </>
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
        <Loader2 className="h-4 w-4 animate-spin text-[#0EA5E9]" />
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
      {sources > 0 && (
        <span className="text-[10px] font-medium text-muted-foreground bg-[#F8F9FA] px-1.5 py-0.5 rounded">
          {sources} sources
        </span>
      )}
    </div>
  );
}
