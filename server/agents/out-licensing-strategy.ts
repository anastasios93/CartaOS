/**
 * Agent 7: Out-Licensing Strategy Report
 * Generates a comprehensive regional out-licensing assessment using REAL data
 * from 12+ global pharma databases. Per-region analysis covering Market,
 * Legal, Commercial, and IP dimensions.
 *
 * Runs in parallel with synthesis + execution plan after the 4 core agents.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { HubIntakeForm, OutLicensingReport, AgentResult } from "@/types/hub";
import type { AgentWriter } from "./index";
import { aggregateGlobalData, summarizeGlobalData } from "@/server/services/global-pharma";
import { extractJSON, cleanError } from "./utils";

const STRATEGY_PROMPT = `You are a senior pharmaceutical out-licensing strategist preparing a comprehensive regional opportunity assessment. You have access to outputs from 4 prior agents (benchmarking, partner identification, negotiation intelligence, term sheet) AND raw data from 12+ global public pharma databases (SEC EDGAR, ClinicalTrials.gov, OpenFDA, Orange Book, FAERS, DailyMed, RxNorm, EMA, Health Canada, ChEMBL, PubMed, Patents, News).

Your task: Produce a comprehensive Out-Licensing Strategy Report with real, evidence-grounded assessments per region.

Return ONLY valid JSON with this exact structure:

{
  "executiveSummary": "2-3 paragraph executive summary explaining the asset, the strategic opportunity, and the highest-priority regional recommendations.",
  "assetProfile": {
    "name": "Asset name as detected from data",
    "description": "What the asset does, mechanism, value proposition",
    "modality": "Small molecule / mAb / ADC / Cell therapy / Gene therapy / etc.",
    "therapeuticArea": "Auto-detected from clinical trial data and FDA labels",
    "developmentStage": "Auto-detected from ClinicalTrials.gov phases",
    "mechanism": "Specific mechanism of action from ChEMBL/FDA data",
    "currentMarkets": ["US", "EU"],
    "keyStrengths": ["3-5 strengths from real data"],
    "keyChallenges": ["3-5 challenges/risks identified"],
    "keyDataPoints": [
      {"label": "FDA approval date", "value": "2014-09-04", "source": "OpenFDA"},
      {"label": "Active trials", "value": "47 globally", "source": "ClinicalTrials.gov"}
    ]
  },
  "regionalAnalysis": [
    {
      "region": "US",
      "regionLabel": "United States",
      "attractiveness": "Very High",
      "attractivenessScore": 92,
      "market": {
        "sizeUSD": "$X.XB",
        "growthRate": "X% CAGR",
        "drivers": ["3-4 specific drivers from real data"],
        "barriers": ["2-3 barriers"],
        "unmetNeed": "Specific unmet need with patient numbers if available"
      },
      "legal": {
        "regulatoryAuthority": "FDA",
        "pathway": "BLA / NDA / 505(b)(2) / etc.",
        "estimatedTimeline": "X months from filing to approval",
        "exclusivityOpportunities": ["Orphan Drug exclusivity (7yr)", "Specific exclusivity windows"],
        "barriers": ["Specific regulatory hurdles for this asset class"]
      },
      "commercial": {
        "competitorActivity": "Description of key competitors with names and stages",
        "pricingDynamics": "Reference drug pricing, payer dynamics",
        "reimbursementLandscape": "Coverage decisions, ICER, formulary positioning",
        "keyPartnerCandidates": ["3-5 specific company names with rationale"],
        "distributionChannels": "Specialty pharmacy / retail / hospital channels"
      },
      "ip": {
        "patentStrength": "Strong",
        "ftoStatus": "Clear",
        "expirationRisks": ["Composition patent expires 2034", "Specific risks"],
        "opportunities": ["Method patents available for new indications"],
        "estimatedExclusivityYears": 12
      }
    }
  ],
  "recommendations": [
    {
      "priorityRank": 1,
      "targetRegion": "US",
      "rationale": "Detailed reasoning citing specific data points from sources",
      "recommendedDealStructure": "Out-licensing with regional option | Co-development | Asset acquisition",
      "estimatedValue": {
        "upfront": "$XXXm",
        "total": "$X.XB",
        "royaltyRange": "12-18%"
      },
      "topPartnerCandidates": ["Pfizer", "Roche", "BMS"],
      "prerequisites": ["Specific data/milestones required first"],
      "estimatedTimeline": "9-12 months to signing",
      "expectedROI": "3-5x at peak sales vs. internal commercialization"
    }
  ],
  "portfolioRisks": [
    {
      "category": "IP",
      "risk": "Specific IP risk with detail",
      "affectedRegions": ["US", "EU"],
      "impact": "High",
      "likelihood": "Medium",
      "mitigation": "Concrete mitigation action"
    }
  ],
  "dataConfidence": "High",
  "sourcesUsed": ["List of databases that provided data"]
}

CRITICAL RULES:

1. Generate 5 regional analyses: US, EU, JP, CN, ROW (rest of world)
2. ALL assessments must reference SPECIFIC data points from the provided sources
3. For each region, include ALL FOUR dimensions (Market, Legal, Commercial, IP)
4. Generate 3-7 prioritized recommendations
5. Generate 5-8 portfolio risks across the 4 categories
6. attractivenessScore: 0-100 numerical rating
7. Use ACTUAL company names, ACTUAL deal precedents, ACTUAL partner candidates from the data — not hypothetical
8. Estimate market sizes based on competitor revenue data when available
9. For IP assessments, cite Orange Book patent data and ChEMBL when available
10. For legal/regulatory, reference FDA/EMA/Health Canada specifics
11. Set dataConfidence based on data coverage:
    - "High" = ≥7 sources returned data
    - "Medium" = 4-6 sources
    - "Low" = <4 sources
12. Be SPECIFIC and ACTIONABLE. No generic platitudes. Every claim needs a data anchor.

This report informs C-suite decisions on hundreds of millions in deal value. Be rigorous.`;

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

    write({ agent: agentId, type: "status", status: "scraping", message: "Aggregating global pharma data for regional assessment..." });

    // Pull comprehensive real data
    const assetBase = intake.assetName.split("(")[0].trim();
    const globalData = await aggregateGlobalData(assetBase, intake.therapeuticArea, {
      includeNews: true,
      includePatents: true,
      maxPerSource: 15,
    });

    const successCount = globalData.sources.filter(s => s.status === "success").length;
    const totalRecords = globalData.sources.reduce((sum, s) => sum + s.count, 0);

    write({ agent: agentId, type: "status", status: "analyzing", message: `Generating regional report from ${totalRecords} records across ${successCount} databases...` });

    // Build agent context summary
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

    const globalDataSummary = summarizeGlobalData(globalData);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      system: STRATEGY_PROMPT,
      messages: [{
        role: "user",
        content: `## Asset / Portfolio
${intake.assetName}
${intake.context ? "Strategic Context: " + intake.context : ""}

## Prior Agent Outputs
${agentContext || "No prior agent outputs available."}

## RAW GLOBAL DATA FROM 12+ PUBLIC DATABASES

${globalDataSummary}

---

Generate the comprehensive Out-Licensing Strategy Report now. Use the REAL data above. Do not fabricate. If a data point isn't in the sources, mark it as "Not in sources" or use a clearly labeled industry estimate.

Cover all 5 regions (US, EU, JP, CN, ROW) with full Market/Legal/Commercial/IP assessment per region.`,
      }],
    });

    const text = response.content.find(b => b.type === "text")?.text ?? "";
    const report = extractJSON<OutLicensingReport>(text);

    write({ agent: agentId, type: "result", data: { agentId: "outLicensingStrategy", report } });
    write({ agent: agentId, type: "status", status: "complete", message: `Strategy report: ${report.regionalAnalysis?.length || 0} regions, ${report.recommendations?.length || 0} recommendations, ${report.portfolioRisks?.length || 0} risks` });

    return report;
  } catch (err) {
    const msg = cleanError(err);
    write({ agent: agentId, type: "error", error: msg });
    write({ agent: agentId, type: "status", status: "error", message: msg });
    return null;
  }
}
