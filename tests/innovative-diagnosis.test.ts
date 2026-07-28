import { describe, expect, it } from "vitest";
import {
  coverageFor,
  normaliseDimensions,
  normaliseMarkets,
} from "../server/agents/innovative-diagnosis";
import { INNOVATIVE_DIMENSIONS, OFF_PATENT_DIMENSIONS } from "../config/dimensions";
import {
  withGrounding,
  withInnovativeGrounding,
  BASE_LENS,
  VALUE_LEVER_TAXONOMY,
  INNOVATIVE_LENS,
} from "../server/services/source-reference";

describe("branch separation (§7: no shared prompt or source set)", () => {
  it("the innovative prompt carries none of the off-patent lens or lever taxonomy", () => {
    const innovative = withInnovativeGrounding("BASE");
    expect(innovative).toContain(INNOVATIVE_LENS);
    expect(innovative).not.toContain(BASE_LENS);
    expect(innovative).not.toContain(VALUE_LEVER_TAXONOMY);
  });

  it("the off-patent prompt is unchanged by the split — still carries its lens and taxonomy", () => {
    const offPatent = withGrounding("BASE");
    expect(offPatent).toContain(BASE_LENS);
    expect(offPatent).toContain(VALUE_LEVER_TAXONOMY);
    expect(offPatent).not.toContain(INNOVATIVE_LENS);
  });

  it("both branches keep the shared epistemic, compliance and voice standards", () => {
    for (const p of [withGrounding("B"), withInnovativeGrounding("B")]) {
      expect(p).toContain("PROVENANCE TIER ON LOAD-BEARING FACTS");
      expect(p).toContain("EVIDENCE vs INFERENCE");
      expect(p).toContain("STEELMAN BEFORE THE VERDICT");
    }
  });

  it("each branch asks its own first question", () => {
    expect(withGrounding("B")).toContain("off-patent in-license trade");
    expect(withInnovativeGrounding("B")).toContain("de-risked value");
  });

  it("the two dimension sets are disjoint", () => {
    const off = new Set(OFF_PATENT_DIMENSIONS.map((d) => d.key));
    for (const d of INNOVATIVE_DIMENSIONS) expect(off.has(d.key)).toBe(false);
  });
});

describe("coverageFor (§7 source routing + gap disclosure)", () => {
  it("routes geography-scoped sources per dimension", () => {
    const cov = coverageFor(["US", "DE"]);
    expect(cov).toHaveLength(INNOVATIVE_DIMENSIONS.length);
    const fto = cov.find((c) => c.key === "fto")!;
    // Only the generic patent client is wired; the gated patent sources are gone.
    expect(fto.consulted).toContain("Patent search (generic)");
  });

  it("reports applicable-but-unconnected sources as an explicit gap, never silence", () => {
    const cov = coverageFor(["US"]);
    const access = cov.find((c) => c.key === "market_access")!;
    // CMS pricing/Part D apply to the US but this agent wires neither.
    expect(access.unwired.length).toBeGreaterThan(0);
    expect(access.consulted.length + access.unwired.length).toBeGreaterThan(0);
  });

  it("drops sources that do not cover the selected markets", () => {
    const usOnly = coverageFor(["US"]).find((c) => c.key === "market_access")!;
    const gbOnly = coverageFor(["GB"]).find((c) => c.key === "market_access")!;
    const all = (c: typeof usOnly) => [...c.consulted, ...c.unwired];
    expect(all(usOnly)).not.toEqual(all(gbOnly));
  });
});

describe("normaliseDimensions", () => {
  const cov = coverageFor(["US"]);

  it("config is the source of truth — a dropped dimension becomes an explicit gap", () => {
    const out = normaliseDimensions([{ key: "unmet_need", score: 70, confidence: "high" }], cov);
    expect(out).toHaveLength(INNOVATIVE_DIMENSIONS.length);
    expect(out.map((d) => d.key)).toEqual(INNOVATIVE_DIMENSIONS.map((d) => d.key));
    const dropped = out.find((d) => d.key === "fto")!;
    expect(dropped.score).toBeNull();
    expect(dropped.notComputable).toBeTruthy();
  });

  it("ignores keys the model invented", () => {
    const out = normaliseDimensions([{ key: "made_up_dimension", score: 99 }], cov);
    expect(out.some((d) => d.key === "made_up_dimension")).toBe(false);
  });

  it("null score keeps the stated gap rather than coercing to zero", () => {
    const out = normaliseDimensions(
      [{ key: "unmet_need", score: null, notComputable: "No epidemiology source connected" }],
      cov,
    );
    const d = out.find((x) => x.key === "unmet_need")!;
    expect(d.score).toBeNull();
    expect(d.notComputable).toBe("No epidemiology source connected");
  });

  it("clamps scores and defaults an unrecognised evidence kind to estimate", () => {
    const out = normaliseDimensions(
      [
        {
          key: "ip_position",
          score: 250,
          evidence: [
            { claim: "Composition-of-matter granted in US/EP", kind: "evidence", source: "Patent search" },
            { claim: "Likely extendable", kind: "sourced" },
            { claim: "no kind given" },
          ],
        },
      ],
      cov,
    );
    const d = out.find((x) => x.key === "ip_position")!;
    expect(d.score).toBe(100);
    expect(d.evidence.map((e) => e.kind)).toEqual(["evidence", "estimate", "estimate"]);
  });

  it("carries the per-dimension source-coverage list through", () => {
    const out = normaliseDimensions([], cov);
    const fto = out.find((d) => d.key === "fto")!;
    expect(fto.sourcesConsulted).toEqual(cov.find((c) => c.key === "fto")!.consulted);
  });

  it("survives a non-array payload", () => {
    expect(normaliseDimensions(null, cov)).toHaveLength(INNOVATIVE_DIMENSIONS.length);
  });
});

describe("normaliseMarkets", () => {
  it("scores every requested market, ranked, even when the model skipped one", () => {
    const out = normaliseMarkets(
      [
        { country: "DE", score: 55, verdict: "CONDITIONAL", summary: "AMNOG benefit assessment gates price." },
        { country: "US", score: 88, verdict: "GO", summary: "PBM coverage precedent exists for the class." },
      ],
      ["US", "DE", "JP"],
    );
    expect(out.map((m) => m.country)).toEqual(["US", "DE", "JP"]);
    expect(out.map((m) => m.rank)).toEqual([1, 2, 3]);
    const jp = out.find((m) => m.country === "JP")!;
    expect(jp.score).toBeNull();
    expect(jp.verdict).toBeUndefined();
  });

  it("matches country codes case-insensitively and rejects invalid verdicts", () => {
    const out = normaliseMarkets([{ country: "us", score: 40, verdict: "MAYBE" }], ["US"]);
    expect(out[0].score).toBe(40);
    expect(out[0].verdict).toBeUndefined();
  });
});
