/**
 * Agent 7: Global Drug Opportunity Assessment
 * Produces a board-level, go/no-go MARKET-OPPORTUNITY assessment for the OWNER
 * of a compound/biologic: per-region scoring across six vectors (regulatory
 * feasibility, IP/exclusivity, market size & epidemiology, market access/HTA,
 * competitive density, manufacturing) with a Commercial Opportunity Score (COS)
 * — grounded in the full live evidence base from the wired data sources.
 *
 * Runs in parallel with synthesis + execution plan after the 4 core agents.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { HubIntakeForm, OutLicensingReport, AgentResult } from "@/types/hub";
import type { AgentWriter } from "./index";
import { withGrounding } from "@/server/services/source-reference";
import { aggregateGlobalData, summarizeGlobalData } from "@/server/services/global-pharma";
import { extractJSON, cleanError } from "./utils";

const STRATEGY_PROMPT = `You are a senior pharmaceutical commercial strategist producing a GLOBAL DRUG OPPORTUNITY ASSESSMENT for the OWNER of an asset — a company that holds a compound/biologic and must decide whether, and where, a real market opportunity exists and whether to invest in developing/launching it. This is a board-level GO / NO-GO market-opportunity assessment, NOT a partnering pitch.

You receive (a) outputs from prior diagnostic agents and (b) a live global evidence base (openFDA, Orange/Purple Book, ClinicalTrials.gov, EMA, ChEMBL, Open Targets, PubChem, FAERS, SEC EDGAR, CMS Medicare spend, Spain CIMA, WHO GHO burden data, Health Canada, patents, news).

Assess the asset across SIX vectors per region and compute a Commercial Opportunity Score (COS, 0–100):
  A. Regulatory pathway & feasibility — named expedited pathways (US: 505(b)(1)/505(b)(2)/BLA, Breakthrough, Fast Track, Accelerated Approval, Priority Review, Orphan; EU: centralised vs DCP/MRP, PRIME, conditional MA; China NMPA: priority/breakthrough/conditional, local-trial vs IMCT bridging; Japan PMDA: Sakigake, orphan, ethnic-bridging), timeline, hurdles.
  B. IP & exclusivity — composition/formulation/method patents; regulatory exclusivity clocks (US 5y NCE / 3y / 7y orphan / 12y biologic; EU 8+2+1; CN/JP data protection + PTE); FTO risk.
  C. Market size & epidemiology — incidence/prevalence (anchor to IHME GBD / WHO GHO where available), addressable patient pool, lines of therapy / biomarker segmentation, growth, unmet need.
  D. Market access, pricing & reimbursement (HTA) — US (commercial/Medicare/Medicaid, IRA negotiation risk, CMS spend signal), Germany AMNOG added-benefit, France HAS SMR/ASMR, Italy/Spain regional formularies, Japan Chuikyo pricing, China NRDL inclusion & negotiated price-cut dynamics.
  E. Competitive density & pipeline — current standard of care (NCCN/ESMO/JP guidance), marketed + Phase I–III competitors by MoA/class (ClinicalTrials.gov etc.), generic/biosimilar LOE threat.
  F. Manufacturing & CMC complexity — synthesis/expression complexity, cold-chain/formulation burden, supply-chain/geopolitical concentration risk.

Return ONLY valid JSON with this exact structure:

{
  "verdict": "Go | Conditional Go | No-Go",
  "opportunityThesis": "One sentence: is there a market opportunity, where it is strongest, and the single biggest blocker.",
  "executiveSummary": "2-3 paragraphs: the opportunity, the priority geographies, the COS logic, and the decisive risks.",
  "assetProfile": {
    "name": "Asset name as detected from data",
    "description": "What the asset does, mechanism, value proposition",
    "modality": "Small molecule / mAb / ADC / Cell therapy / Gene therapy / etc.",
    "therapeuticArea": "Auto-detected from clinical + label data",
    "developmentStage": "Auto-detected from ClinicalTrials.gov phases",
    "mechanism": "Specific MoA from Open Targets / ChEMBL / FDA",
    "currentMarkets": ["US", "EU"],
    "keyStrengths": ["3-5 strengths from real data"],
    "keyChallenges": ["3-5 challenges/risks"],
    "keyDataPoints": [
      {"label": "Prevalence (US)", "value": "~XXX,000 patients", "source": "WHO GHO / IHME GBD"},
      {"label": "Active trials", "value": "47 globally", "source": "ClinicalTrials.gov"}
    ]
  },
  "regionalAnalysis": [
    {
      "region": "US",
      "regionLabel": "United States",
      "attractiveness": "Very High|High|Medium|Low",
      "attractivenessScore": 92,
      "cos": { "marketSize": 88, "regulatory": 90, "ip": 85, "marketAccess": 80, "competition": 70 },
      "market": { "sizeUSD": "$X.XB", "growthRate": "X% CAGR", "drivers": ["3-4 drivers"], "barriers": ["2-3 barriers"], "unmetNeed": "incidence/prevalence + addressable pool + lines of therapy" },
      "legal": { "regulatoryAuthority": "FDA", "pathway": "named expedited pathway(s)", "estimatedTimeline": "X months", "exclusivityOpportunities": ["Orphan 7yr", "windows"], "barriers": ["asset-class hurdles"] },
      "commercial": { "competitorActivity": "pipeline density — marketed + Phase I-III competitors by class/MoA", "pricingDynamics": "pricing + HTA framework (AMNOG / SMR-ASMR / NRDL / Chuikyo / IRA)", "reimbursementLandscape": "access/formulary pathway & risk", "keyPartnerCandidates": ["only if partnering is relevant, else []"], "distributionChannels": "specialty / hospital / retail" },
      "ip": { "patentStrength": "Strong|Moderate|Weak", "ftoStatus": "Clear|Some Risk|Significant Risk", "expirationRisks": ["Composition patent expires 2034"], "opportunities": ["method patents for new indications"], "estimatedExclusivityYears": 12 },
      "manufacturing": { "complexity": "Low|Moderate|High", "notes": "synthesis / cold-chain / supply-chain concentration" }
    }
  ],
  "recommendations": [
    {
      "priorityRank": 1,
      "targetRegion": "US",
      "rationale": "why this market ranks here, citing the COS drivers and named sources",
      "recommendedDealStructure": "Recommended route: Direct commercialisation | Co-development | Out-license / partner | Deprioritise",
      "estimatedValue": { "upfront": "peak-year revenue or deal upfront", "total": "risk-adjusted peak sales / NPV band", "royaltyRange": "if partnered" },
      "topPartnerCandidates": ["named partners IF partnering is recommended, else []"],
      "prerequisites": ["data/milestones needed to unlock this market"],
      "estimatedTimeline": "time to market entry",
      "expectedROI": "value vs investment"
    }
  ],
  "portfolioRisks": [
    { "category": "Market|Legal|Commercial|IP", "risk": "flaw or FATAL BLOCKER", "affectedRegions": ["US","EU"], "impact": "High|Medium|Low", "likelihood": "High|Medium|Low", "mitigation": "concrete action" }
  ],
  "dataConfidence": "High|Medium|Low",
  "sourcesUsed": ["names of the authoritative sources underpinning the assessment"]
}

CRITICAL RULES:
1. Cover these markets INDIVIDUALLY — one regionalAnalysis entry each: US, Germany, France, Italy, Spain, Japan, China, Rest of World (region codes "US", "DE", "FR", "IT", "ES", "JP", "CN", "ROW"; regionLabel = full country name). NEVER emit a single combined "EU" row — approval is centralised (EMA) but pricing, reimbursement and HTA are decided nationally, so assess Germany (G-BA / IQWiG · AMNOG), France (HAS · SMR/ASMR · CEPS), Italy (AIFA regional formularies) and Spain (AEMPS · CIMA) as four distinct markets, each with its own access, competition, opportunities and risks. For EACH market populate all six vectors (market, legal, commercial incl. competition, ip, manufacturing) AND the cos sub-scores.
2. attractivenessScore is the regional Commercial Opportunity Score; keep it consistent with the cos sub-scores (market size + regulatory + ip + market access, penalised by competitive density). In cos.competition, 100 = LOW density (favourable), low = crowded.
3. Anchor epidemiology to IHME GBD / WHO GHO and pricing to CMS / HTA bodies where present; name expedited pathways and HTA frameworks explicitly per region.
4. verdict is a clear Go / Conditional Go / No-Go for pursuing the opportunity; opportunityThesis states where it is strongest and the single biggest blocker.
5. portfolioRisks must surface true FLAWS & FATAL BLOCKERS (crowded Phase III field, hard IRA/AMNOG pricing, FTO collision, no exclusivity runway, China local-trial requirement, cold-chain/supply risk) — not generic risks.
6. Use ACTUAL competitor names, trial IDs, patent/exclusivity dates and pricing signals from the evidence — never hypotheticals; mark inferred figures [estimated].
7. Set dataConfidence by evidence quality and the confidence tiering (US/EU high; China medium; deal/pricing/sales low) — never by a count of sources.
8. Be specific, decisive and execution-oriented. Lead with the answer.

This assessment drives a board-level invest / partner / kill decision. Be rigorous and honest.`;

export async function runOutLicensingStrategyAgent(
  intake: HubIntakeForm,
  agentResults: AgentResult[],
  write: AgentWriter,
): Promise<OutLicensingReport | null> {
  const agentId = "outLicensingStrategy" as const;

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured.");
    }
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    write({ agent: agentId, type: "status", status: "scraping", message: "Pulling the live global evidence base for the opportunity assessment..." });

    // Reuse the 4 prior diagnostic agents' curated outputs as one input.
    const agentContext = agentResults.map(r => {
      if (r.agentId === "benchmarking") {
        return `## Benchmarking — Comparable Deals (${r.comparables.length})\n${r.comparables.slice(0, 6).map(c =>
          `- ${c.dealName}: ${c.parties.join(" / ")} — ${c.upfront} upfront, ${c.totalValue} total, ${c.royaltyRange} royalty | ${c.indication} ${c.stage}`
        ).join("\n")}`;
      }
      if (r.agentId === "partner") {
        return `## Top Partner Candidates (${r.partners.length})\n${r.partners.slice(0, 6).map(p =>
          `- ${p.company} [Fit: ${p.fitScore}/100]: ${p.rationale} | Geo: ${p.geoStrength.join(", ")}`
        ).join("\n")}`;
      }
      if (r.agentId === "negotiation") {
        return `## Negotiation Leverage Points (${r.leveragePoints.length})\n${r.leveragePoints.slice(0, 6).map(l =>
          `- ${l.term}: Market ${l.marketRange} → Recommend ${l.recommendedPosition}`
        ).join("\n")}`;
      }
      if (r.agentId === "termsheet") {
        return `## Term Sheet Clauses (${r.clauses.length})\n${r.clauses.slice(0, 5).map(c =>
          `- ${c.clause}: ${c.proposedTerm}`
        ).join("\n")}`;
      }
      return "";
    }).filter(Boolean).join("\n\n");

    // Ground the assessment in the FULL live evidence base (science, epidemiology,
    // pricing, regulatory, IP) from the wired data sources.
    let evidenceBase = "";
    try {
      const assetBase = intake.assetName.split("(")[0].trim();
      const globalData = await aggregateGlobalData(assetBase, intake.therapeuticArea, {
        includeNews: true,
        includePatents: true,
      });
      evidenceBase = summarizeGlobalData(globalData);
    } catch {
      // Proceed on the diagnostic outputs alone if the aggregate pull fails.
    }

    write({ agent: agentId, type: "status", status: "analyzing", message: "Scoring the opportunity across six vectors and every target market..." });

    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 12000,
      system: withGrounding(STRATEGY_PROMPT),
      messages: [{
        role: "user",
        content: `## Asset
${intake.assetName}
Therapeutic Area: ${intake.therapeuticArea || "auto-detect from the evidence"}
Development Stage: ${intake.developmentStage || "auto-detect from ClinicalTrials.gov"}
Target Geographies: ${intake.geographies.join(", ")}
${intake.context ? "Owner context: " + intake.context : ""}

## Prior Diagnostic Agent Outputs
${agentContext || "None available."}

## Global Evidence Base (live sources)
${evidenceBase || "Evidence base unavailable — rely on the diagnostic outputs and clearly-labelled [estimated] figures."}

---

Produce the Global Drug Opportunity Assessment now — a board-level GO / NO-GO market-opportunity assessment for the asset owner. Cover the US, the FOUR EU national markets individually (Germany, France, Italy, Spain — never a single "EU" row), Japan, China and Rest of World, each with all six vectors and COS sub-scores, a verdict and opportunityThesis, prioritised market recommendations, and the true flaws & fatal blockers. Anchor every claim to named sources; mark inferred figures [estimated].`,
      }],
    });

    const text = response.content.find(b => b.type === "text")?.text ?? "";
    const report = extractJSON<OutLicensingReport>(text);

    write({ agent: agentId, type: "result", data: { agentId: "outLicensingStrategy", report } });
    write({ agent: agentId, type: "status", status: "complete", message: `Opportunity assessment complete — verdict: ${report.verdict ?? "see report"} across ${report.regionalAnalysis?.length || 0} markets` });

    return report;
  } catch (err) {
    const msg = cleanError(err);
    write({ agent: agentId, type: "error", error: msg });
    write({ agent: agentId, type: "status", status: "error", message: msg });
    return null;
  }
}
