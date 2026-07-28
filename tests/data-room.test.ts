import { describe, expect, it } from "vitest";
import { buildDataRoom, dataRoomMarkdown } from "../server/services/execution/data-room";
import { OFF_PATENT_DATA_ROOM, INNOVATIVE_DATA_ROOM, dataRoomFor } from "../config/data-room";
import type { Milestone } from "../types/run";

const ms = (workstream: string, status: Milestone["status"], title = `${workstream} work`): Milestone => ({
  id: `${workstream}-${status}-${title}`.replace(/\s+/g, "-"),
  title,
  workstream,
  status,
  dependsOn: [],
});

const findItem = (idx: ReturnType<typeof buildDataRoom>, id: string) =>
  idx.sections.flatMap((s) => s.items).find((i) => i.id === id)!;

describe("data-room config", () => {
  it("has unique item ids within each branch", () => {
    for (const template of [OFF_PATENT_DATA_ROOM, INNOVATIVE_DATA_ROOM]) {
      const ids = template.flatMap((s) => s.items.map((i) => i.id));
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("gives the two branches genuinely different indexes", () => {
    const off = new Set(OFF_PATENT_DATA_ROOM.flatMap((s) => s.items.map((i) => i.id)));
    const inn = new Set(INNOVATIVE_DATA_ROOM.flatMap((s) => s.items.map((i) => i.id)));
    const shared = [...off].filter((id) => inn.has(id));
    expect(shared).toEqual([]);
  });

  it("routes every branch to its own template", () => {
    expect(dataRoomFor("off_patent")).toBe(OFF_PATENT_DATA_ROOM);
    expect(dataRoomFor("innovative")).toBe(INNOVATIVE_DATA_ROOM);
  });
});

describe("buildDataRoom — readiness comes from the tracker", () => {
  it("marks an item ready only when every matching milestone is done", () => {
    const done = buildDataRoom("off_patent", [ms("Regulatory", "done"), ms("Regulatory", "done", "second")]);
    expect(findItem(done, "ma-certificates").readiness).toBe("ready");

    const partial = buildDataRoom("off_patent", [ms("Regulatory", "done"), ms("Regulatory", "not_started", "second")]);
    expect(findItem(partial, "ma-certificates").readiness).toBe("in_progress");
  });

  it("treats one blocked milestone as blocking the whole item", () => {
    const idx = buildDataRoom("off_patent", [ms("Regulatory", "done"), ms("Regulatory", "blocked", "second")]);
    expect(findItem(idx, "ma-certificates").readiness).toBe("blocked");
  });

  it("reports an uncovered category as untracked, never as ready", () => {
    const idx = buildDataRoom("off_patent", [ms("Regulatory", "done")]);
    const supply = findItem(idx, "cmc-dossier");
    expect(supply.readiness).toBe("untracked");
    expect(supply.evidence).toEqual([]);
    expect(idx.uncoveredWorkstreams).toContain("Supply");
  });

  it("never counts untracked items towards ready", () => {
    const idx = buildDataRoom("off_patent", []);
    expect(idx.ready).toBe(0);
    expect(idx.percentReady).toBe(0);
    expect(idx.untracked).toBe(idx.total);
  });

  it("matches a workstream name that merely contains the category", () => {
    const idx = buildDataRoom("off_patent", [ms("Regulatory affairs & submissions", "done")]);
    expect(findItem(idx, "ma-certificates").readiness).toBe("ready");
  });

  it("does not match unrelated workstreams", () => {
    const idx = buildDataRoom("off_patent", [ms("Supply", "done")]);
    expect(findItem(idx, "ma-certificates").readiness).toBe("untracked");
  });

  it("carries the milestone titles it derived readiness from", () => {
    const idx = buildDataRoom("off_patent", [ms("Regulatory", "done", "File the dossier")]);
    expect(findItem(idx, "ma-certificates").evidence).toContain("File the dossier");
  });
});

describe("buildDataRoom — route filtering", () => {
  it("drops documents that belong to other routes", () => {
    const idx = buildDataRoom("off_patent", [], "tender_agent");
    const ids = idx.sections.flatMap((s) => s.items.map((i) => i.id));
    expect(ids).toContain("tender-history");
    // MA transfer is meaningless when appointing a tender agent.
    expect(ids).not.toContain("ma-transfer-pack");
  });

  it("keeps route-agnostic documents on every route", () => {
    for (const route of ["tender_agent", "asset_sale", "own_ma_own_distribution"]) {
      const ids = buildDataRoom("off_patent", [], route).sections.flatMap((s) => s.items.map((i) => i.id));
      expect(ids).toContain("ma-certificates");
    }
  });

  it("keeps everything when the route is unknown rather than guessing", () => {
    const all = buildDataRoom("off_patent", []).total;
    const filtered = buildDataRoom("off_patent", [], "tender_agent").total;
    expect(all).toBeGreaterThan(filtered);
  });

  it("filters the innovative template on its own route keys", () => {
    const spinout = buildDataRoom("innovative", [], "newco_spinout").sections.flatMap((s) => s.items.map((i) => i.id));
    const outLicense = buildDataRoom("innovative", [], "out_license_global").sections.flatMap((s) =>
      s.items.map((i) => i.id),
    );
    expect(spinout).toContain("cap-table");
    expect(outLicense).not.toContain("cap-table");
  });
});

describe("dataRoomMarkdown", () => {
  const idx = buildDataRoom("off_patent", [ms("Regulatory", "done")], "asset_sale");

  it("ticks only the ready items", () => {
    const md = dataRoomMarkdown(idx, "atorvastatin", "Outright asset sale");
    expect(md).toContain("- [x] **Marketing authorisation certificates per market**");
    expect(md).toContain("- [ ] **CMC section of the dossier**");
  });

  it("states the asset and the route it was prepared for", () => {
    const md = dataRoomMarkdown(idx, "atorvastatin", "Outright asset sale");
    expect(md).toContain("# Data room index — atorvastatin");
    expect(md).toContain("Outright asset sale");
  });

  it("spells out that untracked does not mean complete", () => {
    const md = dataRoomMarkdown(idx, "atorvastatin");
    expect(md).toContain("not complete");
    expect(md).toContain("## Gaps in coverage");
  });

  it("omits the gaps section when the plan covers everything", () => {
    const full = buildDataRoom("off_patent", [
      ms("Regulatory", "done"),
      ms("Quality", "done"),
      ms("Supply", "done"),
      ms("Commercial", "done"),
      ms("Pricing", "done"),
      ms("Channel", "done"),
      ms("Legal", "done"),
    ]);
    expect(full.uncoveredWorkstreams).toEqual([]);
    expect(dataRoomMarkdown(full, "atorvastatin")).not.toContain("## Gaps in coverage");
    expect(full.percentReady).toBe(100);
  });
});
