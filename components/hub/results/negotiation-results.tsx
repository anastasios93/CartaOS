"use client";

import type { AgentResult, NegotiationLeverage } from "@/types/hub";

const LEVERAGE_COLORS: Record<string, string> = {
  Strong: "#10B981",
  Moderate: "#F59E0B",
  Weak: "#EF4444",
};

export function NegotiationResults({ data }: { data: Extract<AgentResult, { agentId: "negotiation" }> }) {
  const { leveragePoints } = data;
  if (!leveragePoints.length) return <p className="text-xs text-muted-foreground">No leverage analysis available.</p>;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{leveragePoints.length} deal terms analyzed</p>
      <div className="space-y-2">
        {leveragePoints.map((lp: NegotiationLeverage, i: number) => (
          <div key={i} className="rounded-lg bg-[#F8F9FA] border border-border/40 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1A1A2E]">{lp.term}</span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  color: LEVERAGE_COLORS[lp.leverageLevel] ?? "#94A3B8",
                  backgroundColor: `${LEVERAGE_COLORS[lp.leverageLevel] ?? "#94A3B8"}15`,
                }}
              >
                {lp.leverageLevel}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              <span className="text-muted-foreground">Market range:</span> <span className="font-mono">{lp.marketRange}</span>
            </div>
            <div className="text-[11px] text-[#1A1A2E]">{lp.recommendedPosition}</div>
            {Object.keys(lp.geoVariance).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(lp.geoVariance).map(([geo, note]) => (
                  <span key={geo} className="text-[10px] px-1.5 py-0.5 rounded bg-[#FAFAFA] border border-border/40 text-muted-foreground">
                    {geo}: {note}
                  </span>
                ))}
              </div>
            )}
            <div className="text-[10px] text-muted-foreground italic">{lp.precedentSource}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
