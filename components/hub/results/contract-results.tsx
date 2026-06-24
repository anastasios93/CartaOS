"use client";

import type { AgentResult } from "@/types/hub";

export function ContractResults({ data }: { data: Extract<AgentResult, { agentId: "synthesis" }> }) {
  const { contract } = data;

  if (!contract) return <p className="text-xs text-muted-foreground">No contract generated.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1A1A2E]">Draft License Agreement</h3>
        <button
          onClick={() => {
            const blob = new Blob([contract], { type: "text/markdown" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "license-agreement-draft.md";
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#A855F7]/10 text-[#C084FC] hover:bg-[#A855F7]/20 transition-colors"
        >
          Download .md
        </button>
      </div>
      <div className="bg-[#FAFAFA] border border-border/40 rounded-lg p-5 max-h-[600px] overflow-auto">
        <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap leading-relaxed">{contract}</pre>
      </div>
    </div>
  );
}
