"use client";

import { useState } from "react";
import type { AgentResult, DDSection } from "@/types/hub";

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  Critical: { bg: "#EF444420", text: "#EF4444" },
  High: { bg: "#F59E0B20", text: "#F59E0B" },
  Medium: { bg: "#3B82F620", text: "#3B82F6" },
};

export function DiligenceResults({ data }: { data: Extract<AgentResult, { agentId: "synthesis" }> }) {
  const { dueDiligence } = data;
  const [expandedCategory, setExpandedCategory] = useState<string | null>(dueDiligence[0]?.category ?? null);

  if (!dueDiligence.length) return <p className="text-xs text-[#64748B]">No due diligence questions generated.</p>;

  const totalQuestions = dueDiligence.reduce((sum, s) => sum + s.questions.length, 0);
  const criticalCount = dueDiligence.reduce((sum, s) => sum + s.questions.filter(q => q.priority === "Critical").length, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h3 className="text-sm font-semibold text-[#F1F5F9]">Due Diligence Questions</h3>
        <span className="text-xs text-[#64748B]">{totalQuestions} questions</span>
        {criticalCount > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#EF444420", color: "#EF4444" }}>
            {criticalCount} Critical
          </span>
        )}
      </div>

      <div className="space-y-2">
        {dueDiligence.map((section: DDSection) => (
          <div key={section.category} className="rounded-lg bg-[#1E293B]/50 overflow-hidden">
            <button
              onClick={() => setExpandedCategory(expandedCategory === section.category ? null : section.category)}
              className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-[#1E293B]/80 transition"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-[#F1F5F9]">{section.category}</span>
                <span className="text-[10px] text-[#64748B]">{section.questions.length} questions</span>
              </div>
              <span className="text-[#64748B] text-xs">{expandedCategory === section.category ? "−" : "+"}</span>
            </button>

            {expandedCategory === section.category && (
              <div className="px-4 pb-3 space-y-3">
                {section.questions.map((q, i) => {
                  const pColor = PRIORITY_COLORS[q.priority] ?? PRIORITY_COLORS.Medium;
                  return (
                    <div key={i} className="rounded-lg bg-[#0F172A] p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-[#F1F5F9] leading-relaxed">{q.question}</p>
                        <span
                          className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: pColor.bg, color: pColor.text }}
                        >
                          {q.priority}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B] leading-relaxed">{q.rationale}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
