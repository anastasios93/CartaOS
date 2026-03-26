"use client";

import type { AgentId, AgentState } from "@/types/hub";
import { AGENT_META } from "@/types/hub";
import { BarChart3, Users, Scale, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { BenchmarkingResults } from "./results/benchmarking-results";
import { PartnerResults } from "./results/partner-results";
import { NegotiationResults } from "./results/negotiation-results";
import { TermSheetResults } from "./results/termsheet-results";

const ICONS: Record<AgentId, React.ElementType> = {
  benchmarking: BarChart3,
  partner: Users,
  negotiation: Scale,
  termsheet: FileText,
};

export function AgentCard({ agentId, state }: { agentId: AgentId; state: AgentState }) {
  const meta = AGENT_META[agentId];
  const Icon = ICONS[agentId];
  const isActive = state.status === "scraping" || state.status === "analyzing";
  const isDone = state.status === "complete";
  const isError = state.status === "error";

  return (
    <div
      className="rounded-xl border p-5 flex flex-col gap-3 transition-all min-h-[200px]"
      style={{
        backgroundColor: "#161821",
        borderColor: isActive ? meta.color : "rgba(255,255,255,0.06)",
        boxShadow: isActive ? `0 0 20px ${meta.color}15` : "none",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${meta.color}15` }}
        >
          <Icon size={18} style={{ color: meta.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[#F1F5F9] truncate">{meta.label}</h3>
          <p className="text-xs text-[#64748B] truncate">{meta.description}</p>
        </div>
        {/* Status indicator */}
        {isActive && <Loader2 size={16} className="animate-spin" style={{ color: meta.color }} />}
        {isDone && <CheckCircle2 size={16} className="text-emerald-400" />}
        {isError && <AlertCircle size={16} className="text-red-400" />}
      </div>

      {/* Progress / Status message */}
      {state.statusMessage && (
        <p className={`text-xs font-mono ${isError ? "text-red-400" : "text-[#94A3B8]"}`}>
          {state.statusMessage}
        </p>
      )}

      {/* Source count badge */}
      {state.sources.length > 0 && !isDone && (
        <div className="flex items-center gap-2 text-xs text-[#64748B]">
          <span className="px-2 py-0.5 rounded-full bg-[#1E293B]">
            {state.sources.length} sources found
          </span>
        </div>
      )}

      {/* Loading animation */}
      {isActive && (
        <div className="flex-1 flex items-center">
          <div className="w-full h-1 rounded-full bg-[#1E293B] overflow-hidden">
            <div
              className="h-full rounded-full animate-pulse"
              style={{
                width: state.status === "analyzing" ? "70%" : "35%",
                backgroundColor: meta.color,
                transition: "width 0.5s ease",
              }}
            />
          </div>
        </div>
      )}

      {/* Results */}
      {isDone && state.result && (
        <div className="flex-1 overflow-auto max-h-[400px] mt-1">
          {state.result.agentId === "benchmarking" && <BenchmarkingResults data={state.result} />}
          {state.result.agentId === "partner" && <PartnerResults data={state.result} />}
          {state.result.agentId === "negotiation" && <NegotiationResults data={state.result} />}
          {state.result.agentId === "termsheet" && <TermSheetResults data={state.result} />}
        </div>
      )}

      {/* Error */}
      {isError && state.error && (
        <div className="text-xs text-red-400 bg-red-400/10 rounded-lg p-3 font-mono">
          {state.error}
        </div>
      )}

      {/* Source list (shown on complete) */}
      {isDone && state.sources.length > 0 && (
        <details className="text-xs text-[#64748B] mt-auto">
          <summary className="cursor-pointer hover:text-[#94A3B8] transition">
            {state.sources.length} sources referenced
          </summary>
          <ul className="mt-2 space-y-1 max-h-[120px] overflow-auto">
            {state.sources.map((s, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#1E293B]">{s.source}</span>
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noopener" className="truncate hover:text-[#3B82F6] transition">{s.title}</a>
                ) : (
                  <span className="truncate">{s.title}</span>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
