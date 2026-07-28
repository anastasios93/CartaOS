"use client";

/**
 * Pillar 3 — Execution results (§6, Option A: the workstream tracker).
 *
 * The same division of labour as Strategy: the agent proposed the workstreams,
 * the milestone titles, the owning roles and the dependency graph; every DATE on
 * this screen was computed by the pure engine
 * (server/services/execution/schedule.ts) from a single start date. Nothing here
 * invents a date — a milestone with no stored date says so.
 *
 * The roll-up (`progressOf`) is recomputed in the browser against today, so the
 * Overdue tile stays honest as the plan ages without anyone re-running the agent.
 * Status is the one thing a user owns: editing it writes straight back to the
 * Run through `run.updateMilestone`, optimistically, reverting if the write fails.
 */

import { useMemo, useState } from "react";
import { progressOf, type ScheduledMilestone } from "@/server/services/execution/schedule";
import {
  buildDataRoom,
  dataRoomMarkdown,
  readinessLabel,
  type ItemReadiness,
} from "@/server/services/execution/data-room";
import { routesFor } from "@/config/routes";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { Execution, Milestone } from "@/types/run";
import {
  AlertTriangle,
  CalendarDays,
  Download,
  Flag,
  FolderOpen,
  Link2Off,
  ListChecks,
  Rocket,
  ShieldAlert,
  StickyNote,
  Target,
} from "lucide-react";

export type ExecutionBranch = "off_patent" | "innovative";

const TINY = "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70";

/** The workstream bucket for anything the agent left unfiled — named, never hidden. */
const UNASSIGNED = "Unassigned";

/**
 * Untracked reads grey rather than red: it is an absence of information, not a
 * failure, and colouring it as a problem would overstate what is known.
 */
const READINESS_DOT: Record<ItemReadiness, string> = {
  ready: "bg-[#EA580C]",
  in_progress: "bg-[#F97316]/50",
  blocked: "bg-red-600",
  outstanding: "bg-muted-foreground/30",
  untracked: "bg-muted-foreground/20",
};

const READINESS_TEXT: Record<ItemReadiness, string> = {
  ready: "text-[#C2410C]",
  in_progress: "text-[#EA580C]",
  blocked: "text-red-700",
  outstanding: "text-muted-foreground",
  untracked: "text-muted-foreground/70",
};

type MilestoneStatus = Milestone["status"];

const STATUS_ORDER: MilestoneStatus[] = ["not_started", "in_progress", "blocked", "done"];

const STATUS_LABEL: Record<MilestoneStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
};

// ── Formatting (parse-only — no date is ever constructed here) ───────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-03-12" → "12 Mar 2026". Anything unparseable is echoed verbatim. */
function formatDate(iso: string | undefined): string {
  if (!iso) return "no date";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const month = MONTHS[Number(m[2]) - 1];
  if (!month) return iso;
  return `${Number(m[3])} ${month} ${m[1]}`;
}

/** The plan's real length, said the way people say it. */
function planLength(days: number | undefined): string {
  if (days == null || !Number.isFinite(days) || days <= 0) return "length not computed";
  if (days < 14) return `${days} day${days === 1 ? "" : "s"}`;
  const weeks = Math.round(days / 7);
  const months = days / 30.44;
  if (months < 2) return `${weeks} weeks`;
  return `${weeks} weeks (about ${Math.round(months)} month${Math.round(months) === 1 ? "" : "s"})`;
}

/** The engine marks the critical path on the milestone; treat it as optional. */
function isCritical(m: Milestone): boolean {
  return (m as Partial<ScheduledMilestone>).onCriticalPath === true;
}

// ── CSV ──────────────────────────────────────────────────────────────────────

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvRows(rows: unknown[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

function downloadBlob(content: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const safeName = (s: string) => s.replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "") || "execution";

// ── Small presentational parts ───────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  note,
  action,
  children,
}: {
  icon: typeof Target;
  title: string;
  note?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/40 bg-white p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <p className={`${TINY} flex items-center gap-1.5`}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {title}
        </p>
        {action}
      </div>
      {note && <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed max-w-3xl">{note}</p>}
      {children}
    </section>
  );
}

/**
 * Done and In progress are neutral; Blocked and Overdue go loud the moment they
 * are non-zero — those are the two numbers that should start a conversation.
 */
function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "alert";
}) {
  const loud = tone === "alert" && value > 0;
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        loud ? "border-[#C2410C]/50 bg-[#FFF7ED]" : "border-border/40 bg-white"
      }`}
    >
      <p className={`${TINY} ${loud ? "text-[#C2410C]" : ""} flex items-center gap-1`}>
        {loud && <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
        {label}
      </p>
      <p
        className={`font-mono text-2xl font-bold tabular-nums tracking-tight mt-0.5 ${
          loud ? "text-[#C2410C]" : "text-[#1A1A2E]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

// ── The view ─────────────────────────────────────────────────────────────────

export function ExecutionResults({
  execution,
  branch,
  assetName = "Asset",
  runId,
  onMilestoneChange,
}: {
  execution: Execution;
  branch: ExecutionBranch;
  /** Used for the export filename; optional so the stated contract holds. */
  assetName?: string;
  /** Present only when the plan is stored — without it the tracker is read-only. */
  runId?: string;
  onMilestoneChange?: () => void;
}) {
  const milestones = useMemo<Milestone[]>(
    () => (Array.isArray(execution.milestones) ? execution.milestones : []),
    [execution.milestones],
  );

  /**
   * The clock is read once, at mount, and then held. Overdue is a comparison
   * against a fixed cutoff, not a value that should wobble between renders.
   */
  const [today] = useState(() => new Date().toISOString().slice(0, 10));

  /**
   * Optimistic status layer: only the milestones the user has just touched, laid
   * over what is stored. Nothing is seeded, so there is nothing to re-seed when a
   * different plan arrives — the caller keys this component by run.
   */
  const [overrides, setOverrides] = useState<Record<string, MilestoneStatus>>({});

  const updateMilestone = trpc.run.updateMilestone.useMutation();

  const statusOf = (m: Milestone): MilestoneStatus => overrides[m.id] ?? m.status;

  const view = useMemo<Milestone[]>(
    () => milestones.map((m) => ({ ...m, status: overrides[m.id] ?? m.status })),
    [milestones, overrides],
  );

  const progress = useMemo(() => progressOf(view, today), [view, today]);

  const titleById = useMemo(
    () => new Map(milestones.map((m) => [m.id, m.title])),
    [milestones],
  );

  const routeLabel = useMemo(() => {
    const key = execution.sourceRoute;
    if (!key) return null;
    return routesFor(branch).find((r) => r.key === key)?.label ?? key;
  }, [execution.sourceRoute, branch]);

  /**
   * The data room is derived, never stored: it reads the live milestone
   * statuses, so ticking a milestone updates the index in the same render.
   */
  const dataRoom = useMemo(
    () => buildDataRoom(branch, view, execution.sourceRoute),
    [branch, view, execution.sourceRoute],
  );

  /**
   * The declared workstream order, then a trailing bucket for anything filed
   * under nothing — or under a workstream the plan never declared. A milestone
   * with no home is shown in one, not quietly dropped from the board.
   */
  const groups = useMemo<[string, Milestone[]][]>(() => {
    const declared =
      Array.isArray(execution.workstreams) && execution.workstreams.length > 0
        ? execution.workstreams
        : [...new Set(view.map((m) => m.workstream).filter((w): w is string => !!w))];
    const known = new Set(declared);
    const byStream = new Map<string, Milestone[]>(declared.map((name) => [name, []]));
    const unassigned: Milestone[] = [];
    for (const m of view) {
      if (m.workstream && known.has(m.workstream)) byStream.get(m.workstream)!.push(m);
      else unassigned.push(m);
    }
    const entries: [string, Milestone[]][] = [...byStream.entries()].filter(([, ms]) => ms.length > 0);
    if (unassigned.length > 0) entries.push([UNASSIGNED, unassigned]);
    return entries;
  }, [execution.workstreams, view]);

  const dropped = Array.isArray(execution.droppedDependencies) ? execution.droppedDependencies : [];
  const killCriteria = Array.isArray(execution.killCriteria) ? execution.killCriteria : [];

  const overdueIds = useMemo(
    () =>
      new Set(
        view
          .filter(
            (m) => m.status !== "done" && typeof m.dueDate === "string" && m.dueDate.slice(0, 10) < today,
          )
          .map((m) => m.id),
      ),
    [view, today],
  );

  // ── Status editing ─────────────────────────────────────────────────────────

  const changeStatus = (m: Milestone, next: MilestoneStatus) => {
    const previous = statusOf(m);
    if (next === previous) return;
    setOverrides((s) => ({ ...s, [m.id]: next }));
    if (!runId) return;
    updateMilestone.mutate(
      { runId, milestoneId: m.id, status: next },
      {
        onSuccess: () => onMilestoneChange?.(),
        onError: (err) => {
          setOverrides((s) => ({ ...s, [m.id]: previous }));
          toast.error(`Could not save "${m.title}"`, {
            description: `${err instanceof Error ? err.message : "The write failed"} — the status has been rolled back.`,
          });
        },
      },
    );
  };

  // ── Export ─────────────────────────────────────────────────────────────────

  const downloadCsv = () => {
    const lines: string[] = [];
    lines.push(
      csvRows([
        ["CartaOS execution plan", assetName, branch === "off_patent" ? "Off-patent" : "Innovative"],
        ["route", routeLabel ?? ""],
        ["start date", execution.startDate ?? ""],
        ["plan length (days)", execution.totalDays ?? ""],
      ]),
    );
    lines.push("");
    lines.push("MILESTONES");
    lines.push(
      csvRows([
        ["workstream", "title", "owner", "due_date", "status", "depends_on", "critical_path", "notes"],
        ...groups.flatMap(([stream, ms]) =>
          ms.map((m) => [
            stream,
            m.title,
            m.owner ?? "",
            m.dueDate ?? "",
            STATUS_LABEL[statusOf(m)],
            (m.dependsOn ?? []).map((id) => titleById.get(id) ?? id).join("; "),
            isCritical(m) ? "yes" : "no",
            m.notes ?? "",
          ]),
        ),
      ]),
    );
    if (dropped.length > 0) {
      lines.push("");
      lines.push("DROPPED DEPENDENCIES");
      lines.push(
        csvRows([
          ["milestone", "depends_on", "reason"],
          ...dropped.map((d) => [
            titleById.get(d.milestone) ?? d.milestone,
            titleById.get(d.dependsOn) ?? d.dependsOn,
            d.reason,
          ]),
        ]),
      );
    }
    if (killCriteria.length > 0) {
      lines.push("");
      lines.push("KILL CRITERIA");
      lines.push(csvRows(killCriteria.map((k) => [k])));
    }
    downloadBlob(lines.join("\n"), `${safeName(assetName)}_execution_plan.csv`, "text/csv;charset=utf-8;");
  };

  const downloadDataRoom = () => {
    downloadBlob(
      dataRoomMarkdown(dataRoom, assetName, routeLabel ?? undefined),
      `${safeName(assetName)}_data_room_index.md`,
      "text/markdown;charset=utf-8;",
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header — what is being executed, how long it runs, where it stands */}
      <section className="rounded-2xl border-2 border-[#F97316]/40 bg-gradient-to-br from-[#FFF7ED] to-white p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className={`${TINY} mb-2 flex items-center gap-1.5 text-[#C2410C]`}>
              <Target className="h-3.5 w-3.5" aria-hidden="true" /> Plan for the chosen route
            </p>
            <p className="text-[18px] font-semibold text-[#1A1A2E] leading-snug">
              {routeLabel ?? "No route recorded on this plan"}
            </p>
            <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed max-w-3xl">
              {planLength(execution.totalDays)} from{" "}
              {execution.startDate ? formatDate(execution.startDate) : "an unrecorded start date"} — the longest
              dependency chain, not the sum of the work. Every milestone date below was computed from that start
              date.
            </p>
          </div>
          <div className="shrink-0">
            <p className={TINY}>Complete</p>
            <p className="text-3xl font-bold font-mono tracking-tight text-[#C2410C]">
              {progress.percentComplete}%
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {progress.done}/{progress.total} done
            </p>
          </div>
        </div>

        <div
          className="h-2 w-full rounded-full bg-white border border-[#F97316]/30 overflow-hidden mt-4"
          role="img"
          aria-label={`${progress.done} of ${progress.total} milestones done, ${progress.percentComplete} percent complete`}
        >
          <div
            className="h-full rounded-full bg-[#F97316] transition-all"
            style={{ width: `${progress.percentComplete}%` }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <StatTile label="Done" value={progress.done} tone="neutral" />
          <StatTile label="In progress" value={progress.inProgress} tone="neutral" />
          <StatTile label="Blocked" value={progress.blocked} tone="alert" />
          <StatTile label="Overdue" value={progress.overdue} tone="alert" />
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-[#F97316]/20">
          <button
            type="button"
            onClick={downloadCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-[12px] font-semibold text-[#1A1A2E] transition hover:border-[#F97316] hover:text-[#C2410C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Download plan (CSV)
          </button>
          <span className="text-[11px] text-muted-foreground">
            {runId
              ? "Status changes save to the run as you make them."
              : "This plan is not stored — status changes stay in this view only."}
          </span>
        </div>
      </section>

      {/* The first move — the one thing to do in the next two weeks */}
      {execution.firstMove && (
        <section className="rounded-2xl border-2 border-[#1A1A2E] bg-[#1A1A2E] p-6">
          <p className={`${TINY} mb-2 flex items-center gap-1.5 text-white/70`}>
            <Rocket className="h-3.5 w-3.5" aria-hidden="true" /> First move — the next two weeks
          </p>
          <p className="text-[17px] font-semibold text-white leading-relaxed max-w-3xl">{execution.firstMove}</p>
        </section>
      )}

      {/* Milestone board */}
      <SectionCard
        icon={ListChecks}
        title="Milestones by workstream"
        note="Owners are roles, not names. Dates are computed from the plan start and the dependency graph — to move them, re-plan from a different start date rather than editing a date here."
      >
        {view.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">This plan contains no milestones.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[52rem]">
              <caption className="sr-only">
                Every milestone in the plan, grouped by workstream, with its owning role, computed due date,
                dependencies and current status
              </caption>
              <thead>
                <tr className="border-b border-border/40">
                  <th scope="col" className={`${TINY} py-1.5 pr-3`}>
                    Milestone
                  </th>
                  <th scope="col" className={`${TINY} py-1.5 pr-3`}>
                    Owner
                  </th>
                  <th scope="col" className={`${TINY} py-1.5 pr-3`}>
                    Due
                  </th>
                  <th scope="col" className={`${TINY} py-1.5 pr-3`}>
                    Depends on
                  </th>
                  <th scope="col" className={`${TINY} py-1.5 w-[10rem]`}>
                    Status
                  </th>
                </tr>
              </thead>
              {groups.map(([stream, ms]) => (
                <tbody key={stream}>
                  <tr className="bg-[#FAFAFA]">
                    <th
                      scope="colgroup"
                      colSpan={5}
                      className="py-2 px-1 text-left text-[12px] font-bold text-[#1A1A2E] border-y border-border/30"
                    >
                      {stream}
                      <span className="ml-2 font-normal text-muted-foreground font-mono text-[11px]">
                        {ms.length}
                      </span>
                    </th>
                  </tr>
                  {ms.map((m) => {
                    const overdue = overdueIds.has(m.id);
                    const deps = (m.dependsOn ?? []).map((id) => titleById.get(id) ?? id);
                    const selectId = `milestone-status-${m.id}`;
                    return (
                      <tr key={m.id} className="border-b border-border/20 align-top">
                        <th scope="row" className="py-2.5 pr-3 text-left font-medium">
                          <span className="block text-[13px] text-[#1A1A2E] leading-snug">{m.title}</span>
                          {isCritical(m) && (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-[#1A1A2E] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white">
                              <Flag className="h-2.5 w-2.5" aria-hidden="true" />
                              Critical path
                            </span>
                          )}
                          {m.notes && (
                            <span className="block text-[11px] text-muted-foreground font-normal mt-1 leading-relaxed max-w-md">
                              {m.notes}
                            </span>
                          )}
                        </th>
                        <td className="py-2.5 pr-3 text-[12px] text-[#1A1A2E] whitespace-nowrap">
                          {m.owner || <span className="text-muted-foreground">unassigned</span>}
                        </td>
                        <td className="py-2.5 pr-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 font-mono text-[12px] tabular-nums ${
                              overdue ? "font-bold text-[#C2410C]" : "text-[#1A1A2E]"
                            }`}
                          >
                            <CalendarDays className="h-3 w-3 opacity-60" aria-hidden="true" />
                            {formatDate(m.dueDate)}
                          </span>
                          {overdue && (
                            <span className="block text-[10px] font-semibold uppercase tracking-widest text-[#C2410C]">
                              Overdue
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 text-[12px] text-muted-foreground leading-relaxed min-w-[12rem]">
                          {deps.length > 0 ? deps.join(", ") : <span className="opacity-60">nothing</span>}
                        </td>
                        <td className="py-2.5">
                          <label htmlFor={selectId} className="sr-only">
                            Status for {m.title}
                          </label>
                          <select
                            id={selectId}
                            value={statusOf(m)}
                            disabled={!runId}
                            onChange={(e) => changeStatus(m, e.target.value as MilestoneStatus)}
                            className={`w-full rounded-lg border px-2 py-1.5 text-[12px] font-medium outline-none transition focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] disabled:cursor-default disabled:opacity-80 ${
                              statusOf(m) === "blocked"
                                ? "border-[#C2410C]/60 bg-[#FFF7ED] text-[#C2410C]"
                                : statusOf(m) === "done"
                                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                  : "border-border bg-[#FAFAFA] text-[#1A1A2E]"
                            }`}
                          >
                            {STATUS_ORDER.map((s) => (
                              <option key={s} value={s}>
                                {STATUS_LABEL[s]}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              ))}
            </table>
          </div>
        )}
      </SectionCard>

      {/* Broken dependency links — stated, never quietly dropped */}
      {dropped.length > 0 && (
        <section className="rounded-xl border-2 border-dashed border-[#F97316]/50 bg-[#FFF7ED] p-5">
          <p className={`${TINY} flex items-center gap-1.5 text-[#C2410C] mb-2`}>
            <Link2Off className="h-3.5 w-3.5" aria-hidden="true" /> Dependencies the plan could not honour
          </p>
          <p className="text-[12px] text-[#1A1A2E] leading-relaxed max-w-3xl mb-2.5">
            These links were proposed but not scheduled, so the milestones below may start earlier than they really
            can. Worth reading before the dates are treated as commitments.
          </p>
          <ul className="space-y-1.5">
            {dropped.map((d, i) => (
              <li key={`${d.milestone}-${d.dependsOn}-${i}`} className="text-[12px] text-[#1A1A2E] leading-relaxed">
                <span className="font-semibold">{titleById.get(d.milestone) ?? d.milestone}</span> depends on{" "}
                <span className="font-semibold">{titleById.get(d.dependsOn) ?? d.dependsOn}</span>,{" "}
                {d.reason === "cycle"
                  ? "which would create a cycle."
                  : "which the plan does not define."}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Data room — the counterparty's request list, scored off this plan */}
      <SectionCard
        icon={FolderOpen}
        title="Data room index"
        note="What a counterparty will ask for on this route. Readiness is read off the milestones above — nothing here is asserted independently, so ticking a milestone moves the index."
      >
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-baseline justify-between mb-1">
              <span className={TINY}>Documents ready</span>
              <span className="font-mono text-[12px] font-semibold text-[#1A1A2E] tabular-nums">
                {dataRoom.ready}/{dataRoom.total}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-[#F97316] transition-all"
                style={{ width: `${dataRoom.percentReady}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={downloadDataRoom}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-[12px] font-semibold text-[#1A1A2E] transition hover:border-[#F97316] hover:text-[#C2410C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Download index (Markdown)
          </button>
        </div>

        {dataRoom.uncoveredWorkstreams.length > 0 && (
          <p className="text-[12px] text-[#C2410C] leading-relaxed max-w-3xl mb-4 font-medium">
            No workstream in this plan covers {dataRoom.uncoveredWorkstreams.join(", ")}. The documents under those
            headings are marked not tracked — their status is unknown, not complete.
          </p>
        )}

        <div className="space-y-5">
          {dataRoom.sections
            .filter((s) => s.items.length > 0)
            .map((section) => (
              <div key={section.key}>
                <p className="text-[13px] font-semibold text-[#1A1A2E]">{section.label}</p>
                <p className="text-[12px] text-muted-foreground leading-relaxed mb-2">{section.description}</p>
                <ul className="space-y-1.5">
                  {section.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start gap-2.5 rounded-lg border border-border/70 bg-white px-3 py-2"
                    >
                      <span
                        className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${READINESS_DOT[item.readiness]}`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <span className="text-[13px] font-medium text-[#1A1A2E]">{item.title}</span>
                          <span className={`text-[11px] font-semibold ${READINESS_TEXT[item.readiness]}`}>
                            {readinessLabel(item.readiness)}
                          </span>
                        </div>
                        <p className="text-[12px] text-muted-foreground leading-relaxed">{item.purpose}</p>
                        {item.evidence.length > 0 && (
                          <p className="text-[11px] text-muted-foreground/80 leading-relaxed mt-0.5">
                            Tracked by: {item.evidence.join("; ")}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      </SectionCard>

      {/* Kill criteria */}
      {killCriteria.length > 0 && (
        <SectionCard
          icon={ShieldAlert}
          title="Kill criteria"
          note="The signals that should stop this plan rather than trigger another push. Agreed now, they are far cheaper to act on later."
        >
          <ul className="space-y-2">
            {killCriteria.map((k, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="shrink-0 mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1A1A2E] font-mono text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-[13px] text-[#1A1A2E] leading-relaxed">{k}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Anything the agent wanted on the record */}
      {execution.note && (
        <SectionCard icon={StickyNote} title="Note">
          <p className="text-[13px] text-[#1A1A2E] leading-relaxed max-w-3xl">{execution.note}</p>
        </SectionCard>
      )}
    </div>
  );
}
