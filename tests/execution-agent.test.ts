import { describe, expect, it } from "vitest";
import { mergeSchedule, chosenRoute } from "../server/agents/execution";
import type { Strategy } from "../types/run";

const START = "2026-01-01";

const strategy = (over: Partial<Strategy> = {}) =>
  ({
    branch: "off_patent",
    routes: [
      { key: "own_ma_own_distribution", label: "Own MA", evidence: [] },
      { key: "out_license_ma", label: "Out-license", evidence: [] },
    ],
    recommendedRoute: "out_license_ma",
    assumptions: [],
    sensitivity: [],
    partnerShortlist: [],
    ...over,
  }) as unknown as Strategy;

describe("mergeSchedule — the deterministic layer owns the plan", () => {
  it("discards any date the agent narrated", () => {
    const e = mergeSchedule(
      {
        milestones: [
          { id: "a", title: "File dossier", durationDays: 30, dueDate: "2099-01-01" },
          { id: "b", title: "Launch", durationDays: 10, dependsOn: ["a"], dueDate: "1999-01-01" },
        ],
      },
      "own_ma_own_distribution",
      START,
    );
    expect(e.milestones.map((m) => m.dueDate)).toEqual(["2026-01-31", "2026-02-10"]);
  });

  it("records the route the plan was built for", () => {
    expect(mergeSchedule({ milestones: [{ id: "a", title: "A" }] }, "out_license_ma", START).sourceRoute).toBe(
      "out_license_ma",
    );
  });

  it("keeps a workstream used on a milestone but never declared", () => {
    const e = mergeSchedule(
      {
        workstreams: ["Regulatory"],
        milestones: [
          { id: "a", title: "A", workstream: "Regulatory" },
          { id: "b", title: "B", workstream: "Supply" },
        ],
      },
      "r",
      START,
    );
    expect(e.workstreams).toEqual(["Regulatory", "Supply"]);
  });

  it("drops milestones with no title rather than emitting blank rows", () => {
    const e = mergeSchedule(
      { milestones: [{ id: "a", title: "Real" }, { id: "b", title: "   " }, { id: "c" }] },
      "r",
      START,
    );
    expect(e.milestones).toHaveLength(1);
    expect(e.milestones[0].title).toBe("Real");
  });

  it("de-duplicates ids so two milestones cannot collide", () => {
    const e = mergeSchedule(
      { milestones: [{ id: "same", title: "First" }, { id: "same", title: "Second" }] },
      "r",
      START,
    );
    expect(new Set(e.milestones.map((m) => m.id)).size).toBe(2);
  });

  it("slugs a messy id and still resolves dependencies against it", () => {
    const e = mergeSchedule(
      {
        milestones: [
          { id: "File Dossier!", title: "A", durationDays: 10 },
          { id: "b", title: "B", durationDays: 5, dependsOn: ["File Dossier!"] },
        ],
      },
      "r",
      START,
    );
    expect(e.milestones[0].id).toBe("file-dossier");
    expect(e.milestones[1].dependsOn).toEqual(["file-dossier"]);
    expect(e.milestones[1].dueDate).toBe("2026-01-16");
  });

  it("caps the plan at a trackable size", () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ id: `m${i}`, title: `M${i}` }));
    expect(mergeSchedule({ milestones: many }, "r", START).milestones.length).toBeLessThanOrEqual(24);
  });

  it("returns an empty plan rather than throwing on junk", () => {
    for (const junk of [null, undefined, {}, { milestones: "nope" }, { milestones: [] }]) {
      const e = mergeSchedule(junk, "r", START);
      expect(e.milestones).toEqual([]);
      expect(e.workstreams).toEqual([]);
    }
  });

  it("surfaces a dependency it could not honour", () => {
    const e = mergeSchedule({ milestones: [{ id: "a", title: "A", dependsOn: ["ghost"] }] }, "r", START);
    expect(e.droppedDependencies).toEqual([{ milestone: "a", dependsOn: "ghost", reason: "unknown" }]);
  });

  it("carries the narrative fields the agent is allowed to set", () => {
    const e = mergeSchedule(
      {
        milestones: [{ id: "a", title: "A" }],
        firstMove: "Call the regulator",
        killCriteria: ["No partner by Q3", "Tender price below COGS"],
        note: "Timeline assumes no clock stop",
      },
      "r",
      START,
    );
    expect(e.firstMove).toBe("Call the regulator");
    expect(e.killCriteria).toHaveLength(2);
    expect(e.note).toBe("Timeline assumes no clock stop");
  });
});

describe("chosenRoute", () => {
  it("defaults to the route strategy recommended", () => {
    expect(chosenRoute(strategy())!.key).toBe("out_license_ma");
  });

  it("honours an explicit pick over the recommendation", () => {
    expect(chosenRoute(strategy(), "own_ma_own_distribution")!.key).toBe("own_ma_own_distribution");
  });

  it("falls back to the first route when the pick is unknown", () => {
    expect(chosenRoute(strategy(), "does-not-exist")!.key).toBe("own_ma_own_distribution");
  });

  it("falls back to the first route when nothing was recommended", () => {
    expect(chosenRoute(strategy({ recommendedRoute: undefined }))!.key).toBe("own_ma_own_distribution");
  });

  it("is null when there are no routes at all", () => {
    expect(chosenRoute(strategy({ routes: [] }))).toBeNull();
  });
});
