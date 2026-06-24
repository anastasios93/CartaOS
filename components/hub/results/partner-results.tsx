"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { AgentResult, PartnerScore } from "@/types/hub";

export function PartnerResults({ data }: { data: Extract<AgentResult, { agentId: "partner" }> }) {
  const { partners } = data;
  if (!partners.length) return <p className="text-xs text-muted-foreground">No potential partners identified.</p>;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{partners.length} partners ranked</p>
      <div className="space-y-2">
        {partners.map((p: PartnerScore, i: number) => (
          <div key={i} className="rounded-lg bg-[#F8F9FA] border border-border/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#1A1A2E]">{p.company}</span>
              <span className="text-xs font-mono font-bold" style={{ color: p.fitScore >= 75 ? "#10B981" : p.fitScore >= 50 ? "#F59E0B" : "#EF4444" }}>
                {p.fitScore}/100
              </span>
            </div>
            {/* Score bar */}
            <div className="w-full h-1.5 rounded-full bg-[#FAFAFA] border border-border/40">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${p.fitScore}%`,
                  backgroundColor: p.fitScore >= 75 ? "#10B981" : p.fitScore >= 50 ? "#F59E0B" : "#EF4444",
                }}
              />
            </div>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              <span className="px-1.5 py-0.5 rounded bg-[#FAFAFA] border border-border/40 text-muted-foreground">Gap: {p.pipelineGapLevel}</span>
              <span className="px-1.5 py-0.5 rounded bg-[#FAFAFA] border border-border/40 text-muted-foreground">Propensity: {p.dealPropensity}</span>
              <span className="px-1.5 py-0.5 rounded bg-[#FAFAFA] border border-border/40 text-muted-foreground">{p.recentDeals} deals</span>
              <span className="px-1.5 py-0.5 rounded bg-[#FAFAFA] border border-border/40 text-muted-foreground">{p.trialFootprint} trials</span>
              {p.geoStrength.map(g => (
                <span key={g} className="px-1.5 py-0.5 rounded bg-[#3B82F6]/10 text-[#60A5FA]">{g}</span>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{p.rationale}</p>
          </div>
        ))}
      </div>
      <Link
        href={`/partners`}
        className="flex items-center justify-center gap-2 mt-3 px-4 py-2 rounded-lg bg-[#10B981]/10 text-[#34D399] text-xs font-medium hover:bg-[#10B981]/20 transition-colors"
      >
        Explore All Partners
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
