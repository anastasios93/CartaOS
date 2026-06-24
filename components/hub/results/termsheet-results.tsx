"use client";

import { useState } from "react";
import type { AgentResult, TermSheetClause } from "@/types/hub";

const FLAG_COLORS: Record<string, { bg: string; text: string }> = {
  Aligned: { bg: "#10B98115", text: "#10B981" },
  "Upper Range": { bg: "#3B82F615", text: "#3B82F6" },
  "Below Market": { bg: "#EF444415", text: "#EF4444" },
  Negotiate: { bg: "#F59E0B15", text: "#F59E0B" },
  "Non-Standard": { bg: "#A855F715", text: "#A855F7" },
};

export function TermSheetResults({ data }: { data: Extract<AgentResult, { agentId: "termsheet" }> }) {
  const [view, setView] = useState<"clauses" | "termsheet">("clauses");
  const { clauses, termSheet } = data;

  return (
    <div className="space-y-3">
      {/* Tab toggle */}
      <div className="flex gap-1 p-0.5 bg-[#FAFAFA] border border-border/40 rounded-lg w-fit">
        <button
          onClick={() => setView("clauses")}
          className="px-3 py-1 text-xs font-medium rounded-md transition"
          style={{
            backgroundColor: view === "clauses" ? "#1E293B" : "transparent",
            color: view === "clauses" ? "#F1F5F9" : "#64748B",
          }}
        >
          Clauses ({clauses.length})
        </button>
        <button
          onClick={() => setView("termsheet")}
          className="px-3 py-1 text-xs font-medium rounded-md transition"
          style={{
            backgroundColor: view === "termsheet" ? "#1E293B" : "transparent",
            color: view === "termsheet" ? "#F1F5F9" : "#64748B",
          }}
        >
          Full Term Sheet
        </button>
      </div>

      {view === "clauses" ? (
        <div className="space-y-2">
          {clauses.map((c: TermSheetClause, i: number) => {
            const flagStyle = FLAG_COLORS[c.flag] ?? FLAG_COLORS.Aligned;
            return (
              <div key={i} className="rounded-lg bg-[#F8F9FA] border border-border/40 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1A1A2E]">{c.clause}</span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: flagStyle.bg, color: flagStyle.text }}
                  >
                    {c.flag}
                  </span>
                </div>
                <div className="text-[11px] text-[#1A1A2E]">{c.proposedTerm}</div>
                <div className="text-[10px] text-muted-foreground">Benchmark: {c.marketBenchmark}</div>
                {c.geoNotes && <div className="text-[10px] text-muted-foreground italic">{c.geoNotes}</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#FAFAFA] border border-border/40 rounded-lg p-4 max-h-[350px] overflow-auto">
          <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap leading-relaxed">{termSheet}</pre>
        </div>
      )}
    </div>
  );
}
