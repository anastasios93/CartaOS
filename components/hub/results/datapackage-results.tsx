"use client";

import type { AgentResult, DataPackageItem } from "@/types/hub";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Required: { bg: "#EF444415", text: "#EF4444" },
  Recommended: { bg: "#F59E0B15", text: "#F59E0B" },
  Optional: { bg: "#3B82F615", text: "#3B82F6" },
};

export function DataPackageResults({ data }: { data: Extract<AgentResult, { agentId: "synthesis" }> }) {
  const { dataPackage } = data;

  if (!dataPackage.length) return <p className="text-xs text-[#64748B]">No data package generated.</p>;

  const totalItems = dataPackage.reduce((sum, s) => sum + s.items.length, 0);
  const requiredCount = dataPackage.reduce((sum, s) => sum + s.items.filter(i => i.status === "Required").length, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h3 className="text-sm font-semibold text-[#F1F5F9]">Data Room Checklist</h3>
        <span className="text-xs text-[#64748B]">{totalItems} documents</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#EF444415", color: "#EF4444" }}>
          {requiredCount} Required
        </span>
      </div>

      <div className="space-y-3">
        {dataPackage.map((section: DataPackageItem) => (
          <div key={section.category} className="rounded-lg bg-[#1E293B]/50 p-4 space-y-3">
            <h4 className="text-xs font-semibold text-[#F1F5F9] tracking-wide">{section.category}</h4>
            <div className="space-y-1.5">
              {section.items.map((item, i) => {
                const sColor = STATUS_COLORS[item.status] ?? STATUS_COLORS.Optional;
                return (
                  <div key={i} className="flex items-start gap-3 py-1.5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: sColor.text }} />
                      <span className="text-xs text-[#F1F5F9] truncate">{item.document}</span>
                    </div>
                    <span
                      className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: sColor.bg, color: sColor.text }}
                    >
                      {item.status}
                    </span>
                  </div>
                );
              })}
            </div>
            {section.items.some(i => i.notes) && (
              <div className="border-t border-[#1E293B] pt-2 space-y-1">
                {section.items.filter(i => i.notes).map((item, i) => (
                  <p key={i} className="text-[10px] text-[#475569]">
                    <span className="text-[#64748B] font-medium">{item.document}:</span> {item.notes}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
