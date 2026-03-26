"use client";

import type { AgentResult, NegotiationLeverage } from "@/types/hub";

const LEVERAGE_COLORS: Record<string, string> = {
  Strong: "#10B981",
  Moderate: "#F59E0B",
  Weak: "#EF4444",
};

export function NegotiationResults({ data }: { data: Extract<AgentResult, { agentId: "negotiation" }> }) {
  const { leveragePoints } = data;
  if (!leveragePoints.length) return <p className="text-xs text-[#64748B]">No leverage analysis available.</p>;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-[#94A3B8]">{leveragePoints.length} deal terms analyzed</p>
      <div className="space-y-2">
        {leveragePoints.map((lp: NegotiationLeverage, i: number) => (
          <div key={i} className="rounded-lg bg-[#1E293B]/50 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#F1F5F9]">{lp.term}</span>
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
            <div className="text-[11px] text-[#94A3B8]">
              <span className="text-[#64748B]">Market range:</span> <span className="font-mono">{lp.marketRange}</span>
            </div>
            <div className="text-[11px] text-[#F1F5F9]">{lp.recommendedPosition}</div>
            {Object.keys(lp.geoVariance).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(lp.geoVariance).map(([geo, note]) => (
                  <span key={geo} className="text-[10px] px-1.5 py-0.5 rounded bg-[#0F172A] text-[#64748B]">
                    {geo}: {note}
                  </span>
                ))}
              </div>
            )}
            <div className="text-[10px] text-[#475569] italic">{lp.precedentSource}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
