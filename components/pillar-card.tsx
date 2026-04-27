"use client";

import { CheckCircle2, Loader2, AlertCircle, Circle } from "lucide-react";
import type { AgentState } from "@/types/hub";

export interface PillarItem {
  label: string;
  agentState?: AgentState;
  description: string;
}

export function PillarCard({
  number,
  title,
  subtitle,
  color,
  icon: Icon,
  items,
  children,
}: {
  number: number;
  title: string;
  subtitle: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  items: PillarItem[];
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border/40 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border/30" style={{ background: `linear-gradient(135deg, ${color}08, ${color}03)` }}>
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm shrink-0"
            style={{ backgroundColor: color }}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color }}>
                Pillar {number}
              </span>
            </div>
            <h3 className="text-base font-bold text-[#1A1A2E] leading-tight">{title}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 px-6 py-5 space-y-3">
        {items.map((item, i) => {
          const status = item.agentState?.status ?? "idle";
          return (
            <div key={i} className="flex items-start gap-3">
              <StatusIcon status={status} color={color} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[#1A1A2E] leading-tight">{item.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  {status === "scraping" || status === "analyzing"
                    ? item.agentState?.statusMessage || item.description
                    : status === "complete"
                    ? "Complete"
                    : status === "error"
                    ? item.agentState?.error || "Error"
                    : item.description}
                </p>
                {/* Sources badge for live state */}
                {item.agentState?.sources && item.agentState.sources.length > 0 && status !== "idle" && (
                  <div className="mt-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F8F9FA] text-[10px] font-medium text-muted-foreground">
                      {item.agentState.sources.length} sources
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Optional children (results, button, etc.) */}
      {children && (
        <div className="px-6 pb-5 pt-1 border-t border-border/30">
          {children}
        </div>
      )}

      {/* Bottom accent */}
      <div className="h-1" style={{ backgroundColor: color, opacity: 0.6 }} />
    </div>
  );
}

function StatusIcon({ status, color }: { status: string; color: string }) {
  if (status === "complete") {
    return <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color }} />;
  }
  if (status === "error") {
    return <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />;
  }
  if (status === "scraping" || status === "analyzing") {
    return <Loader2 className="h-4 w-4 shrink-0 mt-0.5 animate-spin" style={{ color }} />;
  }
  return <Circle className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground/30" />;
}
