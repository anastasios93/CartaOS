"use client";

import type { AgentResult, IntelSection } from "@/types/hub";

const CONFIDENCE_COLORS: Record<string, { bg: string; text: string }> = {
  High: { bg: "#10B98115", text: "#10B981" },
  Medium: { bg: "#F59E0B15", text: "#F59E0B" },
  Low: { bg: "#EF444415", text: "#EF4444" },
};

export function IntelligenceResults({ data }: { data: Extract<AgentResult, { agentId: "synthesis" }> }) {
  const { intelligence } = data;

  if (!intelligence.length) return <p className="text-xs text-muted-foreground">No intelligence generated.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h3 className="text-sm font-semibold text-[#1A1A2E]">Smart Intelligence</h3>
        <span className="text-xs text-muted-foreground">{intelligence.length} key insights from all 4 agents</span>
      </div>

      <div className="space-y-3">
        {intelligence.map((intel: IntelSection, i: number) => {
          const cColor = CONFIDENCE_COLORS[intel.confidence] ?? CONFIDENCE_COLORS.Medium;
          return (
            <div key={i} className="rounded-lg bg-[#F8F9FA] border border-border/40 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-sm font-semibold text-[#1A1A2E]">{intel.title}</h4>
                <span
                  className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: cColor.bg, color: cColor.text }}
                >
                  {intel.confidence} Confidence
                </span>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">{intel.insight}</p>

              <div className="rounded-lg bg-[#FAFAFA] border border-border/40 p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Recommended Action</p>
                <p className="text-xs text-[#1A1A2E]">{intel.action}</p>
              </div>

              {intel.sources.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {intel.sources.map((src, j) => (
                    <span key={j} className="px-2 py-0.5 rounded text-[10px] bg-[#FAFAFA] border border-border/40 text-muted-foreground">
                      {src}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
