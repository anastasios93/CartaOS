/**
 * Agent 4: Term Sheet Drafting
 * Sources: All (SEC EDGAR, ClinicalTrials, PubMed, OpenFDA)
 * Output: { clauses: TermSheetClause[], termSheet: string }
 */

import Anthropic from "@anthropic-ai/sdk";
import type { HubIntakeForm, SourceHit, TermSheetClause } from "@/types/hub";
import type { AgentWriter } from "./index";
import { searchEdgarForDeals } from "@/server/services/sec-edgar";
import { searchClinicalTrials } from "@/server/services/clinical-trials";
import { searchLiterature } from "@/server/services/pubmed";
import { searchDrugApplications } from "@/server/services/openfda";
import { TERMSHEET_AGENT_PROMPT } from "@/server/services/hub-prompts";
import { extractJSON } from "./utils";

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

    write({ agent: agentId, type: "status", status: "scraping", message: "Gathering data from all sources for term sheet drafting..." });

    const edgarQuery = `"license agreement" AND "${intake.therapeuticArea}" AND ("upfront" OR "milestone" OR "royalt")`;
    const ctQuery = `${intake.assetName} ${intake.therapeuticArea}`;

    const [edgarResult, ctResult, pubmedResult, fdaResult] = await Promise.allSettled([
      searchEdgarForDeals(edgarQuery, ["8-K", "10-K"], "2021-01-01", undefined, 15),
      searchClinicalTrials(ctQuery, undefined, 10),
      searchLiterature(`${intake.therapeuticArea} deal structure licensing terms`, 5),
      searchDrugApplications(intake.therapeuticArea, 10),
    ]);

    const edgarHits = edgarResult.status === "fulfilled" ? edgarResult.value.results : [];
    const ctHits = ctResult.status === "fulfilled" ? ctResult.value.results : [];
    const pubmedHits = pubmedResult.status === "fulfilled" ? pubmedResult.value.results : [];
    const fdaHits = fdaResult.status === "fulfilled" ? fdaResult.value.results : [];

    const sources: SourceHit[] = [
      ...edgarHits.slice(0, 5).map(h => ({ source: "SEC EDGAR", title: `${h.companyName} — ${h.form}`, url: h.documentUrl, date: h.filingDate })),
      ...ctHits.slice(0, 3).map(h => ({ source: "ClinicalTrials.gov", title: h.title, url: `https://clinicaltrials.gov/study/${h.nctId}` })),
      ...pubmedHits.slice(0, 2).map(h => ({ source: "PubMed", title: h.title, url: h.pubmedUrl })),
      ...fdaHits.slice(0, 2).map(h => ({ source: "OpenFDA", title: `${h.sponsorName}: ${h.brandName}` })),
    ];

    write({ agent: agentId, type: "sources", sources });
    write({ agent: agentId, type: "status", status: "analyzing", message: "Drafting term sheet with Claude AI..." });

    const edgarContext = edgarHits.slice(0, 10).map(h =>
      `[${h.form}] ${h.companyName} (${h.filingDate}): ${h.description?.slice(0, 400) ?? ""}`
    ).join("\n");

    const ctContext = ctHits.slice(0, 8).map(h =>
      `[${h.nctId}] ${h.title} | Phase: ${h.phase} | Sponsor: ${h.sponsor}`
    ).join("\n");

    const fdaContext = fdaHits.slice(0, 5).map(h =>
      `${h.sponsorName}: ${h.brandName} (${h.genericName}) | Approved: ${h.approvalDate ?? "N/A"}`
    ).join("\n");

    const geoStr = intake.geographies.join(", ");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: TERMSHEET_AGENT_PROMPT,
      messages: [{
        role: "user",
        content: `## Asset Profile
Asset: ${intake.assetName}
Therapeutic Area: ${intake.therapeuticArea}
Stage: ${intake.developmentStage}
Deal Direction: ${intake.dealDirection}
Target Geographies: ${geoStr}
Context: ${intake.context || "None"}

## SEC EDGAR — Deal Precedents (${edgarHits.length} filings)
${edgarContext || "No filings found."}

## Clinical Trials (${ctHits.length} trials)
${ctContext || "No trials found."}

## FDA Approved Products (${fdaHits.length} records)
${fdaContext || "No records found."}

Draft a complete term sheet for a ${intake.dealDirection} transaction covering ${geoStr}.
Include specific dollar amounts based on comparable deals and flag any non-standard terms.`,
      }],
    });

    const text = response.content.find(b => b.type === "text")?.text ?? "";
    const parsed = extractJSON<{ clauses: TermSheetClause[]; termSheet: string }>(text);

    write({ agent: agentId, type: "result", data: { agentId: "termsheet", clauses: parsed.clauses, termSheet: parsed.termSheet } });
    write({ agent: agentId, type: "status", status: "complete", message: `Drafted ${parsed.clauses.length} term sheet clauses` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    write({ agent: agentId, type: "error", error: msg });
    write({ agent: agentId, type: "status", status: "error", message: msg });
  }
}
