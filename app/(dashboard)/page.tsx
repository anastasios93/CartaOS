"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDeals, useCompanies, useNegotiations } from "@/hooks/use-data";
import {
  Microscope,
  Network,
  Rocket,
  TrendingUp,
  BarChart3,
  Users,
  Lightbulb,
  RotateCcw,
  ArrowRight,
  DollarSign,
  Gem,
  AlertTriangle,
  Activity,
  FileSignature,
  ClipboardCheck,
  Database,
  Brain,
  Globe,
} from "lucide-react";
import { CompactIntakeForm } from "@/components/hub/compact-intake-form";
import { PillarCard } from "@/components/pillar-card";
import { useAgentStream } from "@/hooks/use-agent-stream";
import type { HubIntakeForm, AgentResult } from "@/types/hub";
import { BenchmarkingResults } from "@/components/hub/results/benchmarking-results";
import { PartnerResults } from "@/components/hub/results/partner-results";
import { NegotiationResults } from "@/components/hub/results/negotiation-results";
import { TermSheetResults } from "@/components/hub/results/termsheet-results";
import { ContractResults } from "@/components/hub/results/contract-results";
import { DiligenceResults } from "@/components/hub/results/diligence-results";
import { DataPackageResults } from "@/components/hub/results/datapackage-results";
import { IntelligenceResults } from "@/components/hub/results/intelligence-results";
import { ExecutionPlanResults } from "@/components/hub/results/execution-plan-results";

const PILLAR_COLORS = {
  diagnosis: "#3B82F6",
  strategy: "#10B981",
  execution: "#F97316",
};

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value.toFixed(0)}M`;
}

export default function PortfolioOverview() {
  const { data: session } = useSession();
  const { deals } = useDeals();
  const { companies } = useCompanies();
  const { negotiations } = useNegotiations();
  const { agents, deploy, reset, isRunning, hasResults } = useAgentStream();

  const [submitted, setSubmitted] = useState(false);
  const [activeView, setActiveView] = useState<"diagnosis" | "strategy" | "execution">("diagnosis");

  const totalPortfolioValue = useMemo(() => {
    const values = deals.filter(d => d.totalDealValue != null).map(d => d.totalDealValue!);
    return values.length ? values.reduce((a, b) => a + b, 0) : 0;
  }, [deals]);

  const activeNegotiations = negotiations.filter(n => n.status !== "CLOSED" && n.status !== "DEAD").length;

  const handleSubmit = (form: HubIntakeForm) => {
    setSubmitted(true);
    deploy(form);
  };

  const handleReset = () => {
    reset();
    setSubmitted(false);
  };

  // Synthesis result for the Execution pillar
  const synthesisResult = agents.synthesis?.result as Extract<AgentResult, { agentId: "synthesis" }> | null;
  const synthesisComplete = agents.synthesis?.status === "complete" && synthesisResult;

  const executionPlanResult = agents.executionPlan?.result as Extract<AgentResult, { agentId: "executionPlan" }> | null;
  const executionPlanComplete = agents.executionPlan?.status === "complete" && executionPlanResult;

  const benchmarkResult = agents.benchmarking?.result as Extract<AgentResult, { agentId: "benchmarking" }> | null;
  const partnerResult = agents.partner?.result as Extract<AgentResult, { agentId: "partner" }> | null;
  const negotiationResult = agents.negotiation?.result as Extract<AgentResult, { agentId: "negotiation" }> | null;
  const termSheetResult = agents.termsheet?.result as Extract<AgentResult, { agentId: "termsheet" }> | null;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E]">
            Portfolio Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome back, {session?.user?.name?.split(" ")[0] || "there"} — diagnose, strategize and execute deals across your portfolio
          </p>
        </div>
        {submitted && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-8 text-xs gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            New Diagnostic
          </Button>
        )}
      </div>

      {/* Top metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Portfolio Value"
          value={formatCurrency(totalPortfolioValue)}
          sub={`${deals.length} active deals`}
          icon={<DollarSign className="h-4 w-4" />}
          color="#F97316"
        />
        <MetricCard
          label="Unrealized Value"
          value={formatCurrency(Math.round(totalPortfolioValue * 0.22))}
          sub="22% untapped potential"
          icon={<Gem className="h-4 w-4" />}
          color="#10B981"
        />
        <MetricCard
          label="LOE Exposure"
          value={formatCurrency(Math.round(totalPortfolioValue * 0.15))}
          sub={`${Math.round(deals.length * 0.15)} assets at risk by 2030`}
          icon={<AlertTriangle className="h-4 w-4" />}
          color="#EF4444"
        />
        <MetricCard
          label="Active Negotiations"
          value={activeNegotiations.toString()}
          sub={`${companies.length} partners tracked`}
          icon={<Activity className="h-4 w-4" />}
          color="#3B82F6"
        />
      </div>

      {/* Intake form (if not submitted) or status bar */}
      {!submitted ? (
        <CompactIntakeForm onSubmit={handleSubmit} isLoading={isRunning} />
      ) : (
        <div className="rounded-xl border border-border/40 bg-white px-5 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            {isRunning ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F97316] opacity-60" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#F97316]" />
                </span>
                <p className="text-[13px] font-medium text-[#1A1A2E]">
                  Agents pulling data from 12+ global pharma databases...
                </p>
              </>
            ) : hasResults ? (
              <>
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <p className="text-[13px] font-medium text-[#1A1A2E]">
                  Diagnostic complete. Review results across the three pillars below.
                </p>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* THREE PILLARS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* PILLAR 1: DIAGNOSIS */}
        <PillarCard
          number={1}
          title="Diagnosis"
          subtitle="Market potential & comparable deals"
          color={PILLAR_COLORS.diagnosis}
          icon={Microscope}
          items={[
            {
              label: "Patent Arbitrage",
              description: "Cross-border patent asymmetries scored by AIR",
            },
            {
              label: "Market Trends",
              description: "Patent cliff, therapeutic area dynamics, FDA/EMA activity",
            },
            {
              label: "Comparable Deals",
              description: submitted ? "AI-driven benchmarking across SEC EDGAR + global APIs" : "Benchmark against 156+ precedent transactions",
              agentState: agents.benchmarking,
            },
          ]}
        >
          <div className="flex gap-2">
            <Link
              href="/arbitrage"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#0EA5E9]/8 text-[#0EA5E9] text-[12px] font-semibold hover:bg-[#0EA5E9]/15 transition"
            >
              <Globe className="h-3.5 w-3.5" />
              Arbitrage
            </Link>
            <Link
              href="/trends"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#3B82F6]/8 text-[#3B82F6] text-[12px] font-semibold hover:bg-[#3B82F6]/15 transition"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Trends
            </Link>
            <Link
              href="/benchmarks"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#3B82F6]/8 text-[#3B82F6] text-[12px] font-semibold hover:bg-[#3B82F6]/15 transition"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Comps
            </Link>
          </div>
        </PillarCard>

        {/* PILLAR 2: STRATEGY */}
        <PillarCard
          number={2}
          title="Strategy"
          subtitle="Synergies, partners & commercial maximization"
          color={PILLAR_COLORS.strategy}
          icon={Network}
          items={[
            {
              label: "Synergies & Partners",
              description: submitted ? "AI-scored partner fit from clinical & SEC data" : "Identify ideal licensing & co-development partners",
              agentState: agents.partner,
            },
            {
              label: "Commercial Maximization",
              description: submitted ? "Deal term leverage from precedent transactions" : "Optimize positioning & deal structure",
              agentState: agents.negotiation,
            },
          ]}
        >
          <div className="flex gap-2">
            <Link
              href="/partners"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#10B981]/8 text-[#10B981] text-[12px] font-semibold hover:bg-[#10B981]/15 transition"
            >
              <Users className="h-3.5 w-3.5" />
              Partners
            </Link>
            <Link
              href="/insights"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#10B981]/8 text-[#10B981] text-[12px] font-semibold hover:bg-[#10B981]/15 transition"
            >
              <Lightbulb className="h-3.5 w-3.5" />
              Insights
            </Link>
          </div>
        </PillarCard>

        {/* PILLAR 3: EXECUTION */}
        <PillarCard
          number={3}
          title="Execution"
          subtitle="Simulated plan, term sheet & contracts"
          color={PILLAR_COLORS.execution}
          icon={Rocket}
          items={[
            {
              label: "Simulated Execution Plan",
              description: submitted ? "Timeline, stakeholders & dependencies from Pillars 1 & 2" : "Outcome roadmap with phases, owners & milestones",
              agentState: agents.executionPlan,
            },
            {
              label: "Term Sheet & Contract",
              description: submitted ? "Draft agreement from comparable deals" : "AI-drafted from precedents & best practices",
              agentState: agents.termsheet,
            },
            {
              label: "Due Diligence & Data Room",
              description: submitted ? "Synthesized package from all agents" : "Question prep, data package, smart intelligence",
              agentState: agents.synthesis,
            },
          ]}
        >
          <div className="flex gap-2">
            <Link
              href="/simulated-plan"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#F97316]/8 text-[#F97316] text-[12px] font-semibold hover:bg-[#F97316]/15 transition"
            >
              <Rocket className="h-3.5 w-3.5" />
              Simulated Plan
            </Link>
            <Link
              href="/workspace"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#F97316]/8 text-[#F97316] text-[12px] font-semibold hover:bg-[#F97316]/15 transition"
            >
              <FileSignature className="h-3.5 w-3.5" />
              Workspace
            </Link>
          </div>
        </PillarCard>
      </div>

      {/* Detailed results — appears when agents complete */}
      {submitted && hasResults && (
        <Card className="border-border/40 shadow-sm">
          <div className="border-b border-border/30 px-6 pt-5">
            <h3 className="text-base font-bold text-[#1A1A2E]">Detailed Findings</h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Drill down by pillar to inspect agent outputs
            </p>
            {/* Pillar tabs */}
            <div className="flex gap-1 mt-4 -mb-px">
              <PillarTab
                label="Pillar 1: Diagnosis"
                active={activeView === "diagnosis"}
                color={PILLAR_COLORS.diagnosis}
                onClick={() => setActiveView("diagnosis")}
              />
              <PillarTab
                label="Pillar 2: Strategy"
                active={activeView === "strategy"}
                color={PILLAR_COLORS.strategy}
                onClick={() => setActiveView("strategy")}
              />
              <PillarTab
                label="Pillar 3: Execution"
                active={activeView === "execution"}
                color={PILLAR_COLORS.execution}
                onClick={() => setActiveView("execution")}
              />
            </div>
          </div>

          <CardContent className="p-6">
            {activeView === "diagnosis" && (
              <div className="space-y-6">
                <SectionHeader icon={<BarChart3 className="h-4 w-4" />} title="Comparable Deals" color={PILLAR_COLORS.diagnosis} />
                {benchmarkResult ? (
                  <BenchmarkingResults data={benchmarkResult} />
                ) : agents.benchmarking?.status === "error" ? (
                  <ErrorBlock message={agents.benchmarking.error} />
                ) : (
                  <SkeletonBlock label="Benchmarking agent running..." />
                )}
              </div>
            )}

            {activeView === "strategy" && (
              <div className="space-y-8">
                <div>
                  <SectionHeader icon={<Users className="h-4 w-4" />} title="Synergies & Partners" color={PILLAR_COLORS.strategy} />
                  {partnerResult ? (
                    <PartnerResults data={partnerResult} />
                  ) : agents.partner?.status === "error" ? (
                    <ErrorBlock message={agents.partner.error} />
                  ) : (
                    <SkeletonBlock label="Partner agent running..." />
                  )}
                </div>
                <div>
                  <SectionHeader icon={<Lightbulb className="h-4 w-4" />} title="Commercial Maximization" color={PILLAR_COLORS.strategy} />
                  {negotiationResult ? (
                    <NegotiationResults data={negotiationResult} />
                  ) : agents.negotiation?.status === "error" ? (
                    <ErrorBlock message={agents.negotiation.error} />
                  ) : (
                    <SkeletonBlock label="Negotiation agent running..." />
                  )}
                </div>
              </div>
            )}

            {activeView === "execution" && (
              <div className="space-y-8">
                <div>
                  <SectionHeader icon={<Rocket className="h-4 w-4" />} title="Simulated Execution Plan" color={PILLAR_COLORS.execution} />
                  {executionPlanComplete && executionPlanResult ? (
                    <ExecutionPlanResults data={executionPlanResult} />
                  ) : agents.executionPlan?.status === "error" ? (
                    <ErrorBlock message={agents.executionPlan.error} />
                  ) : (
                    <SkeletonBlock label="Execution plan agent generating timeline & stakeholders..." />
                  )}
                </div>
                <div>
                  <SectionHeader icon={<FileSignature className="h-4 w-4" />} title="Term Sheet & Clauses" color={PILLAR_COLORS.execution} />
                  {termSheetResult ? (
                    <TermSheetResults data={termSheetResult} />
                  ) : agents.termsheet?.status === "error" ? (
                    <ErrorBlock message={agents.termsheet.error} />
                  ) : (
                    <SkeletonBlock label="Term sheet agent running..." />
                  )}
                </div>
                {synthesisComplete && (
                  <>
                    <div>
                      <SectionHeader icon={<FileSignature className="h-4 w-4" />} title="Full Contract Draft" color={PILLAR_COLORS.execution} />
                      <ContractResults data={synthesisResult} />
                    </div>
                    <div>
                      <SectionHeader icon={<ClipboardCheck className="h-4 w-4" />} title="Due Diligence Questions" color={PILLAR_COLORS.execution} />
                      <DiligenceResults data={synthesisResult} />
                    </div>
                    <div>
                      <SectionHeader icon={<Database className="h-4 w-4" />} title="Data Room Checklist" color={PILLAR_COLORS.execution} />
                      <DataPackageResults data={synthesisResult} />
                    </div>
                    <div>
                      <SectionHeader icon={<Brain className="h-4 w-4" />} title="Smart Intelligence" color={PILLAR_COLORS.execution} />
                      <IntelligenceResults data={synthesisResult} />
                    </div>
                  </>
                )}
                {!synthesisComplete && agents.synthesis?.status === "error" && (
                  <ErrorBlock message={agents.synthesis.error} />
                )}
                {!synthesisComplete && agents.synthesis?.status !== "error" && (
                  <SkeletonBlock label="Synthesis agent generating contract & data package..." />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card className="relative overflow-hidden border-border/40 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              {label}
            </p>
            <p className="text-2xl font-bold font-mono tracking-tight mt-2 text-[#1A1A2E]">
              {value}
            </p>
            <p className="text-[11px] mt-1.5 font-medium text-muted-foreground">
              {sub}
            </p>
          </div>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${color}10`, color }}
          >
            {icon}
          </div>
        </div>
      </CardContent>
      <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ backgroundColor: color, opacity: 0.4 }} />
    </Card>
  );
}

function PillarTab({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2.5 text-[12px] font-semibold transition-all relative"
      style={{
        color: active ? color : "#94A3B8",
        borderBottom: active ? `2px solid ${color}` : "2px solid transparent",
      }}
    >
      {label}
    </button>
  );
}

function SectionHeader({
  icon,
  title,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div
        className="flex h-7 w-7 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${color}15`, color }}
      >
        {icon}
      </div>
      <h4 className="text-sm font-bold text-[#1A1A2E]">{title}</h4>
    </div>
  );
}

function SkeletonBlock({ label }: { label: string }) {
  return (
    <div className="rounded-lg bg-[#FAFAFA] border border-border/40 p-8 text-center">
      <div className="inline-flex items-center gap-2.5 text-[13px] text-muted-foreground">
        <span className="inline-block w-3 h-3 rounded-full border-2 border-muted-foreground/30 border-t-[#F97316] animate-spin" />
        {label}
      </div>
    </div>
  );
}

function ErrorBlock({ message }: { message?: string | null }) {
  return (
    <div className="rounded-lg bg-red-50 border border-red-200 p-4">
      <p className="text-[13px] font-semibold text-red-700">Agent error</p>
      <p className="text-[12px] text-red-600 mt-1 leading-relaxed">{message || "Unknown error"}</p>
    </div>
  );
}
