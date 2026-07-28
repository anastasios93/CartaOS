import { describe, expect, it } from "vitest";
import { mapReportToDiagnosis } from "../server/services/run-mapper";
import { expandRegions, MAX_MARKETS } from "../server/agents/out-licensing-strategy";
import type { OutLicensingReport } from "../types/hub";

describe("expandRegions", () => {
  it("expands legacy region keys and injects the India corridor", () => {
    const r = expandRegions(["EU", "US"]);
    expect(r.map((x) => x.code)).toEqual(["DE", "FR", "IT", "ES", "US", "IN"]);
  });

  it("respects an exact ISO selection verbatim — no India injection (§3.1)", () => {
    const r = expandRegions(["US", "GB", "BR"], true);
    expect(r.map((x) => x.code)).toEqual(["US", "GB", "BR"]);
  });

  it("skips unknown tokens instead of guessing", () => {
    const r = expandRegions(["US", "ATLANTIS"], true);
    expect(r.map((x) => x.code)).toEqual(["US"]);
  });

  it("caps the market fan-out", () => {
    const many = ["US", "CA", "GB", "DE", "FR", "IT", "ES", "JP", "CN", "KR", "IN", "BR", "MX", "AR"];
    expect(expandRegions(many, true)).toHaveLength(MAX_MARKETS);
  });

  it("falls back to US when nothing resolves", () => {
    expect(expandRegions([], true).map((x) => x.code)).toEqual(["US"]);
  });
});

describe("mapReportToDiagnosis", () => {
  const report = {
    verdict: "Conditional Go",
    verdictConfidence: "Medium",
    opportunityThesis: "Strongest wedge is DE reformulation.",
    executiveSummary: "Summary.",
    assetProfile: {},
    regionalAnalysis: [
      {
        region: "DE",
        regionLabel: "Germany",
        attractiveness: "High",
        attractivenessScore: 72,
        marketWorthiness: { rating: "Worthy", score: 70, thesis: "Rebate-contract entry viable." },
      },
      {
        region: "IN",
        regionLabel: "India",
        attractiveness: "Low",
        attractivenessScore: 30,
        marketWorthiness: { rating: "Not Worthy", score: 25, thesis: "Crowded." },
      },
    ],
    recommendations: [],
    portfolioRisks: [
      { category: "Market", risk: "Price erosion accelerates", affectedRegions: ["DE"], impact: "High", likelihood: "High", mitigation: "" },
    ],
    whatWouldFlipIt: ["A supply shortage in DE"],
    weightedWorthiness: { score: 61, method: "", byLever: [], note: "" },
    valueLevers: [
      {
        lever: "Reimbursement / pricing",
        score: 55,
        confidence: "High",
        computed: true,
        evidence: [{ finding: "NADAC floored", source: "CMS NADAC" }],
        recommendedActions: ["Hold price"],
        estValueRange: "",
      },
      {
        lever: "Supply / COGS arbitrage",
        score: 0,
        confidence: "Low",
        notComputable: true,
        dataGap: "No API sourcing data",
        evidence: [],
        recommendedActions: [],
        estValueRange: "",
      },
    ],
  } as unknown as OutLicensingReport;

  it("maps verdict, score, markets and levers into the Diagnosis envelope", () => {
    const d = mapReportToDiagnosis(report);
    expect(d.verdict).toBe("CONDITIONAL");
    expect(d.verdictConfidence).toBe("medium");
    expect(d.worthinessScore).toBe(61);
    expect(d.perMarket[0]).toMatchObject({ country: "DE", rank: 1, verdict: "GO" });
    expect(d.perMarket[1]).toMatchObject({ country: "IN", rank: 2, verdict: "NO_GO" });
    expect(d.topRisks).toEqual(["Price erosion accelerates"]);
    expect(d.swingFactors).toEqual(["A supply shortage in DE"]);
  });

  it("computed levers are evidence; reasoned levers are estimates; not-computable stays null", () => {
    const d = mapReportToDiagnosis(report);
    const priced = d.dimensions.find((x) => x.key === "Reimbursement / pricing")!;
    expect(priced.computed).toBe(true);
    expect(priced.score).toBe(55);
    expect(priced.evidence[0]).toMatchObject({ kind: "evidence", source: "CMS NADAC" });
    const supply = d.dimensions.find((x) => x.key === "Supply / COGS arbitrage")!;
    expect(supply.score).toBeNull();
    expect(supply.notComputable).toBe("No API sourcing data");
  });

  it("keeps the full report attached for the rich results view", () => {
    const d = mapReportToDiagnosis(report) as unknown as { report: unknown };
    expect(d.report).toBe(report);
  });
});
