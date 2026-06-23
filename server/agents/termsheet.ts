/**
 * Agent 4: Term Sheet & Contract Drafting
 * Sources: ALL — SEC EDGAR, ClinicalTrials, PubMed, OpenFDA, Orange Book, FAERS, DailyMed, RxNorm, EMA, Health Canada, ChEMBL, Patents, News
 * Output: { clauses: TermSheetClause[], termSheet: string }
 */

import Anthropic from "@anthropic-ai/sdk";
import type { HubIntakeForm, SourceHit, TermSheetClause } from "@/types/hub";
import type { AgentWriter } from "./index";
import { aggregateGlobalData, summarizeGlobalData } from "@/server/services/global-pharma";
import { TERMSHEET_AGENT_PROMPT } from "@/server/services/hub-prompts";
import { extractJSON, cleanError } from "./utils";

export async function runTermSheetAgent(
  intake: HubIntakeForm,
  write: AgentWriter,
): Promise<void> {
  const agentId = "termsheet" as const;

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured. Please add your API key in environment variables.");
    }
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    write({ agent: agentId, type: "status", status: "scraping", message: "Querying ALL 12+ global databases: FDA, EMA, Health Canada, FAERS, Orange Book, DailyMed, ChEMBL, RxNorm, ClinicalTrials, PubMed, SEC EDGAR, Patents, News..." });

    // Use the global aggregator to pull from EVERY source
    const assetBase = intake.assetName.split("(")[0].trim();
    const globalData = await aggregateGlobalData(assetBase, intake.therapeuticArea, {
      includeNews: true,
      includePatents: true,
      maxPerSource: 12,
    });

    // Build source hits for UI from every source that returned data
    const sources: SourceHit[] = [];
    for (const s of globalData.sources) {
      if (s.count > 0) {
        sources.push({ source: s.name, title: `${s.count} records found` });
      }
    }
    // Add specific entries
    globalData.fdaApprovals.slice(0, 3).forEach(h => sources.push({
      source: "OpenFDA", title: `${h.brandName || h.genericName} (${h.applicationNumber})`
    }));
    globalData.clinicalTrials.slice(0, 3).forEach(h => sources.push({
      source: "ClinicalTrials.gov", title: h.title, url: `https://clinicaltrials.gov/study/${h.nctId}`
    }));
    globalData.secFilings.slice(0, 3).forEach(h => sources.push({
      source: "SEC EDGAR", title: `${h.companyName} — ${h.formType}`, url: h.documentUrl
    }));

    write({ agent: agentId, type: "sources", sources });

    const successCount = globalData.sources.filter(s => s.status === "success").length;
    const totalRecords = globalData.sources.reduce((sum, s) => sum + s.count, 0);
    write({ agent: agentId, type: "status", status: "analyzing", message: `Drafting term sheet from ${totalRecords} records across ${successCount} databases worldwide...` });

    // Generate the comprehensive text summary for Claude
    const fullContext = summarizeGlobalData(globalData);
    const geoStr = intake.geographies.join(", ");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: TERMSHEET_AGENT_PROMPT,
      messages: [{
        role: "user",
        content: `## Asset Profile
Asset: ${intake.assetName}
Therapeutic Area: ${intake.therapeuticArea || "AUTO-DETECT from global sources"}
Stage: ${intake.developmentStage || "AUTO-DETECT from clinical trials"}
Deal Direction: ${intake.dealDirection}
Target Geographies: ${geoStr}
Context: ${intake.context || "None — generate a comprehensive market-aligned term sheet"}

## GLOBAL INTELLIGENCE (from ${successCount} databases, ${totalRecords} records)

${fullContext}

Draft a comprehensive term sheet for a ${intake.dealDirection} transaction covering ${geoStr}.
Use SPECIFIC dollar amounts from comparable deals found in SEC EDGAR and FDA data.
Include patent cliff considerations from Orange Book data.
Include safety profile considerations from FAERS adverse event data.
Include regulatory pathway considerations for each target geography (US FDA, EU EMA, Canada Health Canada).
Flag any non-standard terms vs. market benchmarks.`,
      }],
    });

    const text = response.content.find(b => b.type === "text")?.text ?? "";
    const parsed = extractJSON<{ clauses: TermSheetClause[]; termSheet: string }>(text);

    write({ agent: agentId, type: "result", data: { agentId: "termsheet", clauses: parsed.clauses, termSheet: parsed.termSheet } });
    write({ agent: agentId, type: "status", status: "complete", message: `Drafted ${parsed.clauses.length} clauses from ${totalRecords} global records` });
  } catch (err) {
    const msg = cleanError(err);
    write({ agent: agentId, type: "error", error: msg });
    write({ agent: agentId, type: "status", status: "error", message: msg });
  }
}
