"use client";

import { useState } from "react";
import { IntakeForm } from "@/components/hub/intake-form";
import { AgentGrid } from "@/components/hub/agent-grid";
import { useAgentStream } from "@/hooks/use-agent-stream";
import type { HubIntakeForm, AgentResult } from "@/types/hub";
import { ContractResults } from "@/components/hub/results/contract-results";
import { DiligenceResults } from "@/components/hub/results/diligence-results";
import { DataPackageResults } from "@/components/hub/results/datapackage-results";
import { IntelligenceResults } from "@/components/hub/results/intelligence-results";
import { Zap, RotateCcw, BarChart3, FileSignature, ClipboardCheck, Database, Brain, Target } from "lucide-react";

type Tab = "agents" | "contract" | "diligence" | "datapackage" | "intelligence";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "agents", label: "Agent Grid", icon: BarChart3 },
  { id: "contract", label: "Contract", icon: FileSignature },
  { id: "diligence", label: "Due Diligence", icon: ClipboardCheck },
  { id: "datapackage", label: "Data Package", icon: Database },
  { id: "intelligence", label: "Smart Intel", icon: Brain },
];

export default function HubPage() {
  const { agents, deploy, reset, isRunning, hasResults } = useAgentStream();
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("agents");

  const handleSubmit = (form: HubIntakeForm) => {
    setSubmitted(true);
    setActiveTab("agents");
    deploy(form);
  };

  const handleReset = () => {
    reset();
    setSubmitted(false);
    setActiveTab("agents");
  };

  // Check if synthesis agent has completed
  const synthesisResult = agents.synthesis?.result as Extract<AgentResult, { agentId: "synthesis" }> | null;
  const synthesisComplete = agents.synthesis?.status === "complete" && synthesisResult;

  // Core agents (the 4 that run in parallel)
  const coreAgentsDone = (["benchmarking", "partner", "negotiation", "termsheet"] as const).every(
    id => agents[id].status === "complete" || agents[id].status === "error"
  );

  return (
    <div className="hub-dark min-h-screen" style={{ backgroundColor: "#0a0b0e" }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          {/* Phase indicator */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3B82F6] text-[10px] font-bold text-white">1</span>
            <span className="text-[10px] font-semibold tracking-widest uppercase text-[#3B82F6]">Portfolio Diagnostic</span>
          </div>

          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3B82F6, #8B5CF6)" }}>
              <Zap size={20} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[#F1F5F9]" style={{ fontFamily: "var(--font-serif, serif)" }}>
              Portfolio Intelligence Hub
            </h1>
          </div>
          <p className="text-[#94A3B8] text-sm max-w-2xl mx-auto leading-relaxed">
            Describe an asset or portfolio opportunity. Four AI agents will analyze market potential, identify hidden value, benchmark against precedent deals, and generate a complete optimization package — from comparable analytics to draft contracts.
          </p>

          {/* Eskopeo-style P-I-V cycle */}
          <div className="flex items-center justify-center gap-6 mt-6">
            {[
              { label: "Purpose", desc: "Clinical potential & patient demand", color: "#3B82F6" },
              { label: "Impact", desc: "Measurable patient outcomes", color: "#10B981" },
              { label: "Value", desc: "Commercial returns to sustain innovation", color: "#F97316" },
            ].map((item, i) => (
              <div key={item.label} className="flex items-center gap-2">
                {i > 0 && <span className="text-[#334155] mr-2">&rarr;</span>}
                <div className="text-center">
                  <span className="text-[11px] font-bold" style={{ color: item.color }}>{item.label}</span>
                  <p className="text-[10px] text-[#475569] max-w-[140px]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Intake form or Results */}
        {!submitted ? (
          <IntakeForm onSubmit={handleSubmit} isLoading={isRunning} />
        ) : (
          <div className="space-y-6">
            {/* Control bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isRunning && (
                  <span className="flex items-center gap-2 text-sm text-[#94A3B8]">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
                    </span>
                    {!coreAgentsDone ? "Agents analyzing portfolio..." : "Generating deal package..."}
                  </span>
                )}
                {!isRunning && hasResults && (
                  <span className="text-sm text-emerald-400">Portfolio diagnostic complete</span>
                )}
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#94A3B8] bg-[#1E293B] hover:bg-[#334155] transition"
              >
                <RotateCcw size={12} />
                New Diagnostic
              </button>
            </div>

            {/* Tabs — show once core agents start producing results */}
            {hasResults && (
              <div className="flex gap-1 p-1 bg-[#0F172A] rounded-xl overflow-x-auto">
                {TABS.map(tab => {
                  const isSynthesisTab = tab.id !== "agents";
                  const disabled = isSynthesisTab && !synthesisComplete;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => !disabled && setActiveTab(tab.id)}
                      disabled={disabled}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition whitespace-nowrap"
                      style={{
                        backgroundColor: activeTab === tab.id ? "#1E293B" : "transparent",
                        color: disabled ? "#334155" : activeTab === tab.id ? "#F1F5F9" : "#64748B",
                        cursor: disabled ? "not-allowed" : "pointer",
                      }}
                    >
                      <Icon size={14} />
                      {tab.label}
                      {isSynthesisTab && !synthesisComplete && agents.synthesis?.status === "analyzing" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Tab content */}
            {activeTab === "agents" && <AgentGrid agents={agents} />}

            {activeTab === "contract" && synthesisComplete && (
              <ContractResults data={synthesisResult} />
            )}

            {activeTab === "diligence" && synthesisComplete && (
              <DiligenceResults data={synthesisResult} />
            )}

            {activeTab === "datapackage" && synthesisComplete && (
              <DataPackageResults data={synthesisResult} />
            )}

            {activeTab === "intelligence" && synthesisComplete && (
              <IntelligenceResults data={synthesisResult} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
