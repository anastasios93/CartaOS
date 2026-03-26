"use client";

import { useState } from "react";
import { IntakeForm } from "@/components/hub/intake-form";
import { AgentGrid } from "@/components/hub/agent-grid";
import { useAgentStream } from "@/hooks/use-agent-stream";
import type { HubIntakeForm } from "@/types/hub";
import { Zap, RotateCcw } from "lucide-react";

export default function HubPage() {
  const { agents, deploy, reset, isRunning, hasResults } = useAgentStream();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (form: HubIntakeForm) => {
    setSubmitted(true);
    deploy(form);
  };

  const handleReset = () => {
    reset();
    setSubmitted(false);
  };

  return (
    <div className="hub-dark min-h-screen" style={{ backgroundColor: "#0a0b0e" }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3B82F6, #8B5CF6)" }}>
              <Zap size={20} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[#F1F5F9]" style={{ fontFamily: "var(--font-serif, serif)" }}>
              Deal Intelligence Hub
            </h1>
          </div>
          <p className="text-[#94A3B8] text-sm max-w-lg mx-auto">
            Describe your biotech asset and licensing opportunity. Four AI agents will scrape real public data sources and deliver actionable intelligence.
          </p>
        </div>

        {/* Intake form or Agent grid */}
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
                    Agents running...
                  </span>
                )}
                {!isRunning && hasResults && (
                  <span className="text-sm text-emerald-400">All agents complete</span>
                )}
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#94A3B8] bg-[#1E293B] hover:bg-[#334155] transition"
              >
                <RotateCcw size={12} />
                New Analysis
              </button>
            </div>

            {/* Agent Grid */}
            <AgentGrid agents={agents} />
          </div>
        )}
      </div>
    </div>
  );
}
