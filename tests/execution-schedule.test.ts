import { describe, expect, it } from "vitest";
import { computeSchedule, progressOf, type ProposedMilestone } from "../server/services/execution/schedule";

const START = "2026-01-01";
const at = (id: string, s: ReturnType<typeof computeSchedule>) => s.milestones.find((m) => m.id === id)!;

describe("computeSchedule", () => {
  it("dates a linear chain by accumulated duration", () => {
    const s = computeSchedule(
      [
        { id: "a", title: "A", durationDays: 10 },
        { id: "b", title: "B", durationDays: 5, dependsOn: ["a"] },
        { id: "c", title: "C", durationDays: 5, dependsOn: ["b"] },
      ],
      START,
    );
    expect(at("a", s).dueDate).toBe("2026-01-11");
    expect(at("b", s).dueDate).toBe("2026-01-16");
    expect(at("c", s).dueDate).toBe("2026-01-21");
    expect(s.totalDays).toBe(20);
  });

  it("runs independent milestones in parallel rather than summing them", () => {
    const s = computeSchedule(
      [
        { id: "a", title: "A", durationDays: 30 },
        { id: "b", title: "B", durationDays: 20 },
      ],
      START,
    );
    expect(at("a", s).startOffsetDays).toBe(0);
    expect(at("b", s).startOffsetDays).toBe(0);
    // Plan length is the longest chain, not 50 days.
    expect(s.totalDays).toBe(30);
  });

  it("starts a milestone only when its LAST dependency finishes", () => {
    const s = computeSchedule(
      [
        { id: "fast", title: "Fast", durationDays: 5 },
        { id: "slow", title: "Slow", durationDays: 40 },
        { id: "join", title: "Join", durationDays: 10, dependsOn: ["fast", "slow"] },
      ],
      START,
    );
    expect(at("join", s).startOffsetDays).toBe(40);
    expect(at("join", s).dueDate).toBe("2026-02-20");
  });

  it("overwrites any date the agent narrated", () => {
    const proposed = [
      { id: "a", title: "A", durationDays: 10, dueDate: "2030-12-25" },
    ] as unknown as ProposedMilestone[];
    expect(at("a", computeSchedule(proposed, START)).dueDate).toBe("2026-01-11");
  });

  it("identifies the critical path and marks only those milestones", () => {
    const s = computeSchedule(
      [
        { id: "a", title: "A", durationDays: 10 },
        { id: "side", title: "Side", durationDays: 2 },
        { id: "b", title: "B", durationDays: 30, dependsOn: ["a"] },
      ],
      START,
    );
    expect(s.criticalPath).toEqual(["a", "b"]);
    expect(at("side", s).onCriticalPath).toBe(false);
    expect(at("b", s).onCriticalPath).toBe(true);
  });

  it("drops a dependency on a milestone that does not exist and says so", () => {
    const s = computeSchedule([{ id: "a", title: "A", durationDays: 5, dependsOn: ["ghost"] }], START);
    expect(at("a", s).dependsOn).toEqual([]);
    expect(s.droppedDependencies).toEqual([{ milestone: "a", dependsOn: "ghost", reason: "unknown" }]);
    expect(at("a", s).dueDate).toBe("2026-01-06");
  });

  it("still produces a plan when the agent emits a dependency cycle", () => {
    const s = computeSchedule(
      [
        { id: "a", title: "A", durationDays: 5, dependsOn: ["b"] },
        { id: "b", title: "B", durationDays: 5, dependsOn: ["a"] },
      ],
      START,
    );
    expect(s.milestones).toHaveLength(2);
    expect(s.droppedDependencies.some((d) => d.reason === "cycle")).toBe(true);
    for (const m of s.milestones) expect(m.dueDate).toBeTruthy();
  });

  it("treats a self-dependency as a cycle rather than deadlocking", () => {
    const s = computeSchedule([{ id: "a", title: "A", durationDays: 5, dependsOn: ["a"] }], START);
    expect(at("a", s).dependsOn).toEqual([]);
    expect(s.droppedDependencies).toEqual([{ milestone: "a", dependsOn: "a", reason: "cycle" }]);
  });

  it("substitutes a default for a missing, zero or negative duration", () => {
    const s = computeSchedule(
      [
        { id: "none", title: "None" },
        { id: "zero", title: "Zero", durationDays: 0 },
        { id: "neg", title: "Neg", durationDays: -5 },
      ],
      START,
    );
    for (const id of ["none", "zero", "neg"]) expect(at(id, s).durationDays).toBe(14);
  });

  it("is deterministic — same inputs, same plan", () => {
    const input: ProposedMilestone[] = [
      { id: "a", title: "A", durationDays: 7 },
      { id: "b", title: "B", durationDays: 3, dependsOn: ["a"] },
    ];
    expect(computeSchedule(input, START)).toEqual(computeSchedule(input, START));
  });

  it("moves the whole plan when the start date moves", () => {
    const input: ProposedMilestone[] = [{ id: "a", title: "A", durationDays: 10 }];
    expect(at("a", computeSchedule(input, "2026-03-01")).dueDate).toBe("2026-03-11");
  });

  it("returns an empty plan rather than throwing on no milestones", () => {
    const s = computeSchedule([], START);
    expect(s.milestones).toEqual([]);
    expect(s.totalDays).toBe(0);
    expect(s.criticalPath).toEqual([]);
  });

  it("defaults status to not_started but keeps one the agent set", () => {
    const s = computeSchedule(
      [
        { id: "a", title: "A" },
        { id: "b", title: "B", status: "in_progress" },
      ],
      START,
    );
    expect(at("a", s).status).toBe("not_started");
    expect(at("b", s).status).toBe("in_progress");
  });
});

describe("progressOf", () => {
  const ms = [
    { id: "1", title: "done", status: "done" as const, dependsOn: [], dueDate: "2026-01-05" },
    { id: "2", title: "late", status: "in_progress" as const, dependsOn: [], dueDate: "2026-01-05" },
    { id: "3", title: "blocked", status: "blocked" as const, dependsOn: [], dueDate: "2026-06-01" },
    { id: "4", title: "todo", status: "not_started" as const, dependsOn: [], dueDate: "2026-06-01" },
  ];

  it("counts states and completion", () => {
    const p = progressOf(ms, "2026-02-01");
    expect(p).toMatchObject({ total: 4, done: 1, inProgress: 1, blocked: 1, percentComplete: 25 });
  });

  it("counts overdue as past-due and not done", () => {
    expect(progressOf(ms, "2026-02-01").overdue).toBe(1);
    expect(progressOf(ms, "2026-01-01").overdue).toBe(0);
  });

  it("never counts a completed milestone as overdue", () => {
    expect(progressOf(ms, "2027-01-01").overdue).toBe(3);
  });

  it("reports 0% rather than dividing by zero on an empty plan", () => {
    expect(progressOf([], "2026-01-01")).toMatchObject({ total: 0, percentComplete: 0 });
  });
});
