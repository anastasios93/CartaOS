import { describe, expect, it } from "vitest";
import { applyLeverWeights } from "../server/services/ingest/criteria";

import type { ValueLever } from "../types/hub";

const levers: Pick<ValueLever, "lever" | "score" | "notComputable" | "computed">[] = [
  { lever: "Geographic expansion", score: 80, computed: true },
  { lever: "Reimbursement / pricing", score: 40, computed: true },
  { lever: "Portfolio synergy", score: 60, computed: false },
];

describe("applyLeverWeights (deterministic — the model never sets this number)", () => {
  it("equal-weights when no client weights are supplied", () => {
    const r = applyLeverWeights(levers, []);
    expect(r.score).toBe(60); // (80+40+60)/3
    expect(r.method).toMatch(/Equal-weighted/);
  });

  it("renormalises client weights over scored levers", () => {
    const r = applyLeverWeights(levers, [
      { lever: "Geographic expansion", weight: 75 },
      { lever: "Reimbursement / pricing", weight: 25 },
    ]);
    // (80*75 + 40*25) / 100 = 70; unweighted lever contributes 0 weight
    expect(r.score).toBe(70);
  });

  it("excludes not-computable levers instead of counting them as zero", () => {
    const r = applyLeverWeights(
      [...levers, { lever: "Supply / COGS arbitrage", score: 0, notComputable: true }],
      []
    );
    expect(r.score).toBe(60);
    expect(r.byLever).toHaveLength(3);
  });

  it("survives an all-not-computable input without fabricating a number", () => {
    const r = applyLeverWeights(
      [{ lever: "Portfolio synergy", score: 0, notComputable: true }],
      []
    );
    expect(r.score).toBe(0);
    expect(r.byLever).toHaveLength(0);
  });
});
