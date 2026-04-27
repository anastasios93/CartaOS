"use client";

import { useState } from "react";
import type { AgentResult, ExecutionPhase, ExecutionStakeholder, ExecutionRisk, CriticalMilestone, ExecutionConnection } from "@/types/hub";
import {
  Calendar,
  Users,
  AlertTriangle,
  Flag,
  Network,
  ChevronDown,
  ChevronRight,
  Clock,
  Target,
} from "lucide-react";

const PILLAR_COLORS = {
  Diagnosis: "#3B82F6",
  Strategy: "#10B981",
  Execution: "#F97316",
};

const IMPACT_COLORS: Record<string, { bg: string; text: string }> = {
  High: { bg: "#FEE2E2", text: "#DC2626" },
  Medium: { bg: "#FEF3C7", text: "#D97706" },
  Low: { bg: "#DCFCE7", text: "#16A34A" },
};

const INVOLVEMENT_COLORS: Record<string, string> = {
  Lead: "#F97316",
  Contributor: "#3B82F6",
  Reviewer: "#94A3B8",
  Approver: "#10B981",
};

export function ExecutionPlanResults({
  data,
}: {
  data: Extract<AgentResult, { agentId: "executionPlan" }>;
}) {
  const { plan } = data;
  const [view, setView] = useState<"timeline" | "stakeholders" | "milestones" | "risks" | "connections">("timeline");

  if (!plan) {
    return <p className="text-sm text-muted-foreground">No execution plan generated.</p>;
  }

  return (
    <div className="space-y-5">
      {/* Overview */}
      <div className="rounded-xl border border-border/40 bg-gradient-to-br from-[#FFF7ED]/40 to-white p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white shrink-0">
            <Target className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1.5">
              <h4 className="text-sm font-bold text-[#1A1A2E]">Execution Plan</h4>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F97316]/10 text-[#F97316] text-[11px] font-semibold">
                <Clock className="h-3 w-3" />
                {plan.totalDurationWeeks} weeks
              </span>
            </div>
            <p className="text-[13px] text-[#475569] leading-relaxed">{plan.overview}</p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-border/30">
          <Stat label="Phases" value={plan.phases?.length || 0} />
          <Stat label="Stakeholders" value={plan.stakeholders?.length || 0} />
          <Stat label="Milestones" value={plan.criticalMilestones?.length || 0} />
          <Stat label="Risks" value={plan.risks?.length || 0} />
        </div>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 p-1 bg-[#F8F9FA] rounded-lg overflow-x-auto">
        <ViewTab id="timeline" active={view} icon={Calendar} label="Timeline" onClick={setView} />
        <ViewTab id="stakeholders" active={view} icon={Users} label="Stakeholders" onClick={setView} />
        <ViewTab id="milestones" active={view} icon={Flag} label="Milestones" onClick={setView} />
        <ViewTab id="risks" active={view} icon={AlertTriangle} label="Risks" onClick={setView} />
        <ViewTab id="connections" active={view} icon={Network} label="Connections" onClick={setView} />
      </div>

      {/* Content */}
      {view === "timeline" && <TimelineView phases={plan.phases || []} totalWeeks={plan.totalDurationWeeks} />}
      {view === "stakeholders" && <StakeholdersView stakeholders={plan.stakeholders || []} phases={plan.phases || []} />}
      {view === "milestones" && <MilestonesView milestones={plan.criticalMilestones || []} totalWeeks={plan.totalDurationWeeks} />}
      {view === "risks" && <RisksView risks={plan.risks || []} />}
      {view === "connections" && <ConnectionsView connections={plan.connections || []} phases={plan.phases || []} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-2xl font-bold font-mono tracking-tight text-[#1A1A2E]">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</p>
    </div>
  );
}

function ViewTab({
  id,
  active,
  icon: Icon,
  label,
  onClick,
}: {
  id: any;
  active: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: (id: any) => void;
}) {
  const isActive = active === id;
  return (
    <button
      onClick={() => onClick(id)}
      className="flex items-center gap-2 px-3.5 py-2 text-[12px] font-medium rounded-md transition whitespace-nowrap"
      style={{
        backgroundColor: isActive ? "#FFFFFF" : "transparent",
        color: isActive ? "#1A1A2E" : "#64748B",
        boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
      }}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

// ─── Timeline View ──────────────────────────────────────────────────────────

function TimelineView({ phases, totalWeeks }: { phases: ExecutionPhase[]; totalWeeks: number }) {
  const [expandedId, setExpandedId] = useState<string | null>(phases[0]?.id ?? null);
  const safeTotal = totalWeeks || Math.max(...phases.map(p => p.endWeek), 1);

  return (
    <div className="space-y-4">
      {/* Gantt header */}
      <div className="rounded-xl border border-border/40 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-sm font-bold text-[#1A1A2E]">Phase Timeline</h5>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <LegendDot color={PILLAR_COLORS.Diagnosis} label="Diagnosis" />
            <LegendDot color={PILLAR_COLORS.Strategy} label="Strategy" />
            <LegendDot color={PILLAR_COLORS.Execution} label="Execution" />
          </div>
        </div>

        {/* Week scale */}
        <div className="relative pl-44 pr-4 mb-2">
          <div className="flex justify-between text-[10px] text-muted-foreground/60 font-mono">
            {[0, 0.25, 0.5, 0.75, 1].map(p => (
              <span key={p}>W{Math.round(safeTotal * p)}</span>
            ))}
          </div>
        </div>

        {/* Phase bars */}
        <div className="space-y-2">
          {phases.map((phase, i) => {
            const left = (phase.startWeek / safeTotal) * 100;
            const width = ((phase.endWeek - phase.startWeek) / safeTotal) * 100;
            const color = PILLAR_COLORS[phase.pillar] ?? "#64748B";
            const isExpanded = expandedId === phase.id;
            return (
              <div key={phase.id}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : phase.id)}
                  className="w-full flex items-center gap-2 hover:bg-[#FAFAFA] rounded-lg p-1.5 transition group"
                >
                  <div className="w-40 flex items-center gap-1.5 shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                    )}
                    <span className="text-[11px] font-mono text-muted-foreground/60">{(i + 1).toString().padStart(2, "0")}</span>
                    <span className="text-[12px] font-medium text-[#1A1A2E] truncate group-hover:text-[#F97316]">{phase.name}</span>
                  </div>
                  <div className="flex-1 relative h-7 bg-[#F8F9FA] rounded-md overflow-hidden">
                    <div
                      className="absolute h-full rounded-md flex items-center px-2"
                      style={{
                        left: `${left}%`,
                        width: `${Math.max(width, 4)}%`,
                        backgroundColor: color,
                      }}
                    >
                      <span className="text-[10px] font-semibold text-white truncate">
                        W{phase.startWeek}–{phase.endWeek}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="ml-44 mr-1 mt-2 mb-3 p-4 rounded-lg bg-[#FAFAFA] border border-border/30 space-y-3">
                    <p className="text-[12px] text-[#475569] leading-relaxed">{phase.description}</p>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">Owner</p>
                        <span
                          className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold text-white"
                          style={{ backgroundColor: color }}
                        >
                          {phase.owner}
                        </span>
                      </div>
                      {phase.contributors?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">Contributors</p>
                          <div className="flex flex-wrap gap-1">
                            {phase.contributors.map(c => (
                              <span key={c} className="px-2 py-0.5 rounded-md text-[11px] bg-white border border-border/40 text-[#475569]">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {phase.deliverables?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">Deliverables</p>
                        <ul className="space-y-1">
                          {phase.deliverables.map((d, j) => (
                            <li key={j} className="flex items-start gap-2 text-[12px] text-[#1A1A2E]">
                              <span className="mt-1.5 h-1 w-1 rounded-full shrink-0" style={{ backgroundColor: color }} />
                              {d}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {phase.dependsOn?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">Depends on</p>
                        <div className="flex flex-wrap gap-1">
                          {phase.dependsOn.map(d => {
                            const depPhase = phases.find(p => p.id === d);
                            return (
                              <span key={d} className="px-2 py-0.5 rounded-md text-[11px] bg-white border border-border/40 text-[#475569]">
                                {depPhase?.name ?? d}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {phase.successCriteria && (
                      <div className="pt-2 border-t border-border/30">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">Success Criteria</p>
                        <p className="text-[12px] text-[#1A1A2E]">{phase.successCriteria}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}

// ─── Stakeholders View ──────────────────────────────────────────────────────

function StakeholdersView({
  stakeholders,
  phases,
}: {
  stakeholders: ExecutionStakeholder[];
  phases: ExecutionPhase[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {stakeholders.map((sh, i) => (
        <div key={i} className="rounded-xl border border-border/40 bg-white p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-bold text-[#1A1A2E]">{sh.role}</p>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F8F9FA] text-muted-foreground">
                {sh.internalOrExternal}
              </span>
            </div>
            <span
              className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-white shrink-0"
              style={{ backgroundColor: INVOLVEMENT_COLORS[sh.involvement] ?? "#94A3B8" }}
            >
              {sh.involvement}
            </span>
          </div>

          {sh.responsibilities?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">Responsibilities</p>
              <ul className="space-y-1">
                {sh.responsibilities.map((r, j) => (
                  <li key={j} className="text-[12px] text-[#475569] leading-relaxed flex items-start gap-1.5">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground/40 shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sh.phaseIds?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">
                Active in {sh.phaseIds.length} phases
              </p>
              <div className="flex flex-wrap gap-1">
                {sh.phaseIds.slice(0, 5).map(pid => {
                  const phase = phases.find(p => p.id === pid);
                  return (
                    <span key={pid} className="px-2 py-0.5 rounded-md text-[10px] bg-[#F8F9FA] text-[#475569]">
                      {phase?.name ?? pid}
                    </span>
                  );
                })}
                {sh.phaseIds.length > 5 && (
                  <span className="text-[10px] text-muted-foreground">+{sh.phaseIds.length - 5} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Milestones View ────────────────────────────────────────────────────────

function MilestonesView({ milestones, totalWeeks }: { milestones: CriticalMilestone[]; totalWeeks: number }) {
  const sorted = [...milestones].sort((a, b) => a.week - b.week);
  return (
    <div className="rounded-xl border border-border/40 bg-white p-5">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border" />

        <div className="space-y-4">
          {sorted.map((m, i) => (
            <div key={i} className="relative pl-12">
              {/* Dot */}
              <div className="absolute left-1.5 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#F97316] text-white">
                <Flag className="h-3 w-3" />
              </div>

              <div className="rounded-lg bg-[#FAFAFA] p-3 border border-border/30">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <p className="text-[13px] font-bold text-[#1A1A2E]">{m.milestone}</p>
                  <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F97316] text-white">
                    Week {m.week}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span><span className="font-semibold text-[#475569]">Owner:</span> {m.owner}</span>
                  <span className="h-3 w-px bg-border" />
                  <span><span className="font-semibold text-[#475569]">Deliverable:</span> {m.deliverable}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Risks View ─────────────────────────────────────────────────────────────

function RisksView({ risks }: { risks: ExecutionRisk[] }) {
  return (
    <div className="space-y-2">
      {risks.map((risk, i) => {
        const impact = IMPACT_COLORS[risk.impact] ?? IMPACT_COLORS.Medium;
        const likelihood = IMPACT_COLORS[risk.likelihood] ?? IMPACT_COLORS.Medium;
        return (
          <div key={i} className="rounded-xl border border-border/40 bg-white p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[13px] font-semibold text-[#1A1A2E] leading-tight flex-1">{risk.risk}</p>
              <div className="flex items-center gap-1 shrink-0">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ backgroundColor: impact.bg, color: impact.text }}>
                  {risk.impact} Impact
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ backgroundColor: likelihood.bg, color: likelihood.text }}>
                  {risk.likelihood} Likely
                </span>
              </div>
            </div>
            <div className="rounded-lg bg-[#F8F9FA] p-3 space-y-1.5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Mitigation</p>
                <p className="text-[12px] text-[#1A1A2E] leading-relaxed">{risk.mitigation}</p>
              </div>
              <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                <span className="font-semibold">Owner:</span> {risk.owner}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Connections View ───────────────────────────────────────────────────────

function ConnectionsView({
  connections,
  phases,
}: {
  connections: ExecutionConnection[];
  phases: ExecutionPhase[];
}) {
  const typeColors: Record<string, { bg: string; text: string }> = {
    Sequential: { bg: "#DBEAFE", text: "#2563EB" },
    Parallel: { bg: "#DCFCE7", text: "#16A34A" },
    Triggers: { bg: "#FEF3C7", text: "#D97706" },
    Blocks: { bg: "#FEE2E2", text: "#DC2626" },
  };

  return (
    <div className="space-y-2">
      {connections.map((conn, i) => {
        const fromPhase = phases.find(p => p.id === conn.from);
        const toPhase = phases.find(p => p.id === conn.to);
        const tc = typeColors[conn.type] ?? typeColors.Sequential;
        return (
          <div key={i} className="rounded-xl border border-border/40 bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-md text-[12px] font-medium bg-[#F8F9FA] text-[#1A1A2E] border border-border/40">
                {fromPhase?.name ?? conn.from}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">→</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ backgroundColor: tc.bg, color: tc.text }}>
                  {conn.type}
                </span>
                <span className="text-muted-foreground">→</span>
              </div>
              <span className="px-2.5 py-1 rounded-md text-[12px] font-medium bg-[#F8F9FA] text-[#1A1A2E] border border-border/40">
                {toPhase?.name ?? conn.to}
              </span>
            </div>
            <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed">{conn.description}</p>
          </div>
        );
      })}
    </div>
  );
}
