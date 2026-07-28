import { describe, expect, it } from "vitest";
import {
  RunSchema,
  RunIntakeSchema,
  EvidenceItemSchema,
  DimensionScoreSchema,
  CriterionSchema,
} from "../types/run";

const intake = {
  asset: { query: "atorvastatin" },
  assetType: "off_patent" as const,
  geographies: ["DE", "US"],
  criteria: [],
  files: [],
};

describe("Run schemas", () => {
  it("accepts a minimal intake", () => {
    const parsed = RunIntakeSchema.parse(intake);
    expect(parsed.asset.query).toBe("atorvastatin");
  });

  it("rejects an empty geography selection — geography is required in every module", () => {
    expect(() => RunIntakeSchema.parse({ ...intake, geographies: [] })).toThrow();
  });

  it("rejects an unknown asset type", () => {
    expect(() => RunIntakeSchema.parse({ ...intake, assetType: "biotech" })).toThrow();
  });

  it("parses a full run with defaults applied", () => {
    const run = RunSchema.parse({
      id: "r1",
      userId: "u1",
      ...intake,
    });
    expect(run.status).toBe("draft");
    expect(run.log).toEqual([]);
  });

  it("evidence items must declare evidence vs estimate (§3.3)", () => {
    expect(() => EvidenceItemSchema.parse({ claim: "x" })).toThrow();
    const ev = EvidenceItemSchema.parse({ claim: "x", kind: "estimate" });
    expect(ev.kind).toBe("estimate");
  });

  it("dimension scores allow null score only alongside branch payload flexibility", () => {
    const d = DimensionScoreSchema.parse({
      key: "price_erosion",
      score: null,
      notComputable: "No NADAC series for this molecule",
      extraBranchField: 42,
    });
    expect(d.score).toBeNull();
    expect(d.computed).toBe(false);
    expect((d as Record<string, unknown>).extraBranchField).toBe(42);
  });

  it("criterion weight is bounded 0–100", () => {
    expect(() =>
      CriterionSchema.parse({ id: "c1", category: "compound", value: "x", weight: 150 })
    ).toThrow();
  });
});
