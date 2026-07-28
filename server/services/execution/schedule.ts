/**
 * Pillar 3 — the deterministic scheduling engine (§6, Option A).
 *
 * The governing rule of the whole app applies here as it does to the strategy
 * economics: **agents propose, pure engines compute**. The execution agent
 * proposes what the workstreams are, what each milestone is called, who owns
 * it by role, what it depends on and roughly how long it takes. It does not
 * get to state a date. Dates come from this file — a start date, the
 * dependency graph, and each milestone's duration — so that two milestones
 * that depend on the same predecessor cannot be narrated into an impossible
 * order, and so that moving the start date moves the whole plan coherently.
 *
 * This module is PURE and client-safe: no imports from the server, no clock, no
 * randomness. Every function takes what it needs. That is what lets the tracker
 * re-run the schedule live in the browser when a user drags the start date or
 * changes a duration, exactly as the strategy page re-runs its economics.
 */

import type { Milestone } from "@/types/run";

const DAY_MS = 86_400_000;

/** A milestone as the agent proposes it — durations, never dates. */
export interface ProposedMilestone {
  id: string;
  title: string;
  workstream?: string;
  owner?: string;
  /** Working estimate of how long this takes once it can start. */
  durationDays?: number;
  dependsOn?: string[];
  notes?: string;
  status?: Milestone["status"];
}

export interface ScheduledMilestone extends Milestone {
  /** Days from the plan start on which this milestone can begin. */
  startOffsetDays: number;
  durationDays: number;
  /** True when slipping this milestone slips the whole plan. */
  onCriticalPath: boolean;
}

export interface Schedule {
  startDate: string;
  milestones: ScheduledMilestone[];
  /** Whole-plan duration in days — the longest dependency chain. */
  totalDays: number;
  /** Milestone ids forming the longest chain, in order. */
  criticalPath: string[];
  /**
   * Dependencies the agent named that do not exist, or that formed a cycle.
   * Surfaced rather than silently dropped: a plan quietly missing a dependency
   * is worse than one that says which link it could not honour.
   */
  droppedDependencies: { milestone: string; dependsOn: string; reason: "unknown" | "cycle" }[];
}

const DEFAULT_DURATION_DAYS = 14;

function normaliseDuration(d: unknown): number {
  const n = Number(d);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_DURATION_DAYS;
  return Math.min(Math.round(n), 365 * 5);
}

function addDays(iso: string, days: number): string {
  const base = Date.parse(iso);
  if (!Number.isFinite(base)) return iso;
  return new Date(base + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Order milestones so every milestone follows its dependencies, dropping edges
 * that point at nothing or that would close a cycle.
 *
 * Kahn's algorithm. When it stalls, the remaining nodes are in a cycle: the
 * earliest-declared one is released with its unmet edges recorded, and the
 * sweep continues. An agent that emits "A waits for B, B waits for A" gets a
 * plan with a stated broken link rather than an empty schedule.
 */
function topoOrder(
  ms: ProposedMilestone[],
): { order: string[]; deps: Map<string, string[]>; dropped: Schedule["droppedDependencies"] } {
  const ids = new Set(ms.map((m) => m.id));
  const dropped: Schedule["droppedDependencies"] = [];

  const deps = new Map<string, string[]>();
  for (const m of ms) {
    const kept: string[] = [];
    for (const d of m.dependsOn ?? []) {
      if (d === m.id) {
        dropped.push({ milestone: m.id, dependsOn: d, reason: "cycle" });
      } else if (!ids.has(d)) {
        dropped.push({ milestone: m.id, dependsOn: d, reason: "unknown" });
      } else {
        kept.push(d);
      }
    }
    deps.set(m.id, kept);
  }

  const order: string[] = [];
  const placed = new Set<string>();
  const remaining = [...ms];

  while (remaining.length) {
    const readyIdx = remaining.findIndex((m) => deps.get(m.id)!.every((d) => placed.has(d)));

    if (readyIdx === -1) {
      // Everything left is in a cycle. Release the first and record the edges
      // that could not be honoured, then continue.
      const stuck = remaining.shift()!;
      for (const d of deps.get(stuck.id)!) {
        if (!placed.has(d)) dropped.push({ milestone: stuck.id, dependsOn: d, reason: "cycle" });
      }
      deps.set(stuck.id, deps.get(stuck.id)!.filter((d) => placed.has(d)));
      order.push(stuck.id);
      placed.add(stuck.id);
      continue;
    }

    const [ready] = remaining.splice(readyIdx, 1);
    order.push(ready.id);
    placed.add(ready.id);
  }

  return { order, deps, dropped };
}

/**
 * Compute the dated plan.
 *
 * A milestone starts when its last dependency finishes, so the plan length is
 * the longest chain rather than the sum of every task. `startDate` is the only
 * clock input — callers pass one in rather than this module reading `now`, so
 * the same inputs always give the same plan.
 */
export function computeSchedule(proposed: ProposedMilestone[], startDate: string): Schedule {
  const day = startDate.slice(0, 10);
  if (!proposed.length) {
    return { startDate: day, milestones: [], totalDays: 0, criticalPath: [], droppedDependencies: [] };
  }

  const { order, deps, dropped } = topoOrder(proposed);
  const byId = new Map(proposed.map((m) => [m.id, m]));

  const finish = new Map<string, number>();
  const start = new Map<string, number>();
  /** Which dependency actually set this milestone's start — the chain backlink. */
  const via = new Map<string, string | null>();

  for (const id of order) {
    const m = byId.get(id)!;
    const duration = normaliseDuration(m.durationDays);
    let startOffset = 0;
    let driver: string | null = null;
    for (const d of deps.get(id)!) {
      const f = finish.get(d) ?? 0;
      if (f > startOffset) {
        startOffset = f;
        driver = d;
      }
    }
    start.set(id, startOffset);
    finish.set(id, startOffset + duration);
    via.set(id, driver);
  }

  const totalDays = Math.max(0, ...finish.values());

  // Walk back from the latest-finishing milestone along the drivers.
  const criticalPath: string[] = [];
  let cursor: string | null =
    order.reduce<string | null>((last, id) => (last == null || finish.get(id)! > finish.get(last)! ? id : last), null);
  while (cursor) {
    criticalPath.unshift(cursor);
    cursor = via.get(cursor) ?? null;
  }
  const onPath = new Set(criticalPath);

  const milestones: ScheduledMilestone[] = order.map((id) => {
    const m = byId.get(id)!;
    const startOffsetDays = start.get(id)!;
    const durationDays = normaliseDuration(m.durationDays);
    return {
      id,
      title: m.title,
      workstream: m.workstream,
      owner: m.owner,
      // The engine owns this: whatever the agent narrated is replaced.
      dueDate: addDays(day, startOffsetDays + durationDays),
      status: m.status ?? "not_started",
      dependsOn: deps.get(id)!,
      notes: m.notes,
      startOffsetDays,
      durationDays,
      onCriticalPath: onPath.has(id),
    };
  });

  return { startDate: day, milestones, totalDays, criticalPath, droppedDependencies: dropped };
}

/**
 * Roll-up used by the tracker header. `blocked` counts explicitly blocked work;
 * `overdue` counts anything past its computed date that is not done, which is
 * the number that actually prompts a conversation.
 */
export function progressOf(milestones: Milestone[], today: string): {
  total: number;
  done: number;
  inProgress: number;
  blocked: number;
  overdue: number;
  percentComplete: number;
} {
  const total = milestones.length;
  const done = milestones.filter((m) => m.status === "done").length;
  const inProgress = milestones.filter((m) => m.status === "in_progress").length;
  const blocked = milestones.filter((m) => m.status === "blocked").length;
  const cutoff = today.slice(0, 10);
  const overdue = milestones.filter(
    (m) => m.status !== "done" && typeof m.dueDate === "string" && m.dueDate.slice(0, 10) < cutoff,
  ).length;
  return {
    total,
    done,
    inProgress,
    blocked,
    overdue,
    percentComplete: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}
