"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAgentStream } from "@/hooks/use-agent-stream";
import { CompactIntakeForm } from "@/components/hub/compact-intake-form";
import { ExecutionPlanResults } from "@/components/hub/results/execution-plan-results";
import type { HubIntakeForm, AgentResult } from "@/types/hub";
import { SAMPLE_EXECUTION_PLAN } from "@/lib/sample-execution-plan";
import {
  Rocket,
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

export default function SimulatedPlanPage() {
  const { agents, deploy, reset, isRunning, hasResults } = useAgentStream();
  const [submitted, setSubmitted] = useState(false);
  const [showSample, setShowSample] = useState(true);

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

  // Status of upstream agents
  const upstream = [
    { id: "benchmarking" as const, label: "Diagnosis: Comparable Deals", color: PILLAR_COLORS.diagnosis },
    { id: "partner" as const, label: "Strategy: Partners & Synergies", color: PILLAR_COLORS.strategy },
    { id: "negotiation" as const, label: "Strategy: Negotiation Leverage", color: PILLAR_COLORS.strategy },
    { id: "termsheet" as const, label: "Strategy: Term Sheet", color: PILLAR_COLORS.strategy },
  ];

  // Determine which plan to show
  const showRealPlan = executionPlanComplete && executionPlanResult;
  const showLivePlanData: Extract<AgentResult, { agentId: "executionPlan" }> | null = showRealPlan ? executionPlanResult : null;

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
            <Rocket className="h-6 w-6 text-[#F97316]" />
            Simulated Execution Plan
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Combine diagnosis + strategy outputs into a concrete outcome roadmap with timeline, stakeholders, and dependencies
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(submitted || showSample) && !showRealPlan && (
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
              New Plan
            </Button>
          )}
        </div>
      </div>

      {/* Pre-submission: explainer + intake form */}
      {!submitted && (
        <>
          <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-[#FFF7ED]/40 to-white p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white shrink-0">
                <Rocket className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1A1A2E]">How the Simulated Plan works</h3>
                <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                  Provide an asset and our 4 core AI agents will scan 12+ global pharma databases (SEC EDGAR, ClinicalTrials.gov,
                  OpenFDA, Orange Book, EMA, ChEMBL, RxNorm, and more). Then a 6th agent synthesizes the diagnosis (comparable
                  deals) and strategy (partners + leverage + term sheet) outputs into a concrete execution roadmap.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                  <FeatureBlock
                    step="1"
                    title="Phased Timeline"
                    description="6-9 phases with weekly Gantt chart and pillar tagging"
                  />
                  <FeatureBlock
                    step="2"
                    title="Stakeholder Matrix"
                    description="6-10 roles with involvement levels (Lead/Contributor/Reviewer/Approver)"
                  />
                  <FeatureBlock
                    step="3"
                    title="Risks & Connections"
                    description="Critical milestones, deal-specific risks, and phase dependencies"
                  />
                </div>
              </div>
            </div>
          </div>

          <CompactIntakeForm onSubmit={handleSubmit} isLoading={isRunning} />
        </>
      )}

      {/* Post-submission: pipeline status */}
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
                  <p className="text-sm font-semibold text-[#1A1A2E]">Building execution plan...</p>
                </>
              ) : executionPlanComplete ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <p className="text-sm font-semibold text-[#1A1A2E]">Execution plan ready</p>
                </>
              ) : executionPlanError ? (
                <>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <p className="text-sm font-semibold text-red-700">Plan generation failed</p>
                </>
              ) : null}
            </div>

            {/* Upstream pipeline status */}
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
                    label="Execution: Simulated Plan (combines all upstream outputs)"
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

      {/* Error block */}
      {executionPlanError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700">Plan generation failed</p>
              <p className="text-xs text-red-600 mt-1 leading-relaxed">
                {agents.executionPlan?.error || "Unknown error"}
              </p>
              <p className="text-xs text-red-500 mt-2">
                Showing the sample plan below so you can preview the UI.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Real plan (highest priority) */}
      {showRealPlan && showLivePlanData && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live AI-Generated Plan
            </span>
          </div>
          <ExecutionPlanResults data={showLivePlanData} />
        </div>
      )}

      {/* Sample plan — always available unless real plan ready */}
      {!showRealPlan && showSample && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFF7ED] text-[#F97316] text-[11px] font-semibold">
              <Eye className="h-3 w-3" />
              Sample Plan Preview
            </span>
            <p className="text-[11px] text-muted-foreground">
              {submitted
                ? "Showing illustrative example while agents run. Will be replaced by AI output when ready."
                : "Illustrative example of what the execution plan looks like. Run the AI agents above to generate one for your asset."}
            </p>
          </div>
          <ExecutionPlanResults
            data={{ agentId: "executionPlan", plan: SAMPLE_EXECUTION_PLAN }}
          />
        </div>
      )}

      {/* Loading state when neither sample shown nor real plan ready */}
      {submitted && !showRealPlan && !showSample && !executionPlanError && (
        <div className="rounded-xl border border-border/40 bg-[#FAFAFA] p-12 text-center">
          <div className="inline-flex items-center gap-2.5 text-[13px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-[#F97316]" />
            Synthesizing diagnosis + strategy into executable plan...
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureBlock({ step, title, description }: { step: string; title: string; description: string }) {
  return (
    <div className="rounded-lg bg-white border border-border/40 p-3.5">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F97316]/15 text-[10px] font-bold text-[#F97316]">
          {step}
        </span>
        <span className="text-[12px] font-semibold text-[#1A1A2E]">{title}</span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>
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
