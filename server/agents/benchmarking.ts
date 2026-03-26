/**
 * Agent 1: Deal Benchmarking
 * Sources: SEC EDGAR + ClinicalTrials.gov
 * Output: DealComparable[]
 */

import Anthropic from "@anthropic-ai/sdk";
import type { HubIntakeForm, SourceHit, DealComparable } from "@/types/hub";
import type { AgentWriter } from "./index";
import { searchEdgarForDeals } from "@/server/services/sec-edgar";
import { searchClinicalTrials } from "@/server/services/clinical-trials";
import { BENCHMARKING_AGENT_PROMPT } from "@/server/services/hub-prompts";
import { extractJSON, cleanError } from "./utils";

export async function runBenchmarkingAgent(
  intake: HubIntakeForm,
  write: AgentWriter,
): Promise<void> {
  const agentId = "benchmarking" as const;

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured. Please add your API key in environment variables.");
    }
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Step 1: Query data sources
    write({ agent: agentId, type: "status", status: "scraping", message: "Querying SEC EDGAR for licensing agreements..." });

    const edgarQuery = `"license agreement" AND "${intake.therapeuticArea}" AND "${intake.assetName.split("(")[0].trim()}"`;
    const ctQuery = `${intake.assetName} ${intake.therapeuticArea}`;

    const [edgarResult, ctResult] = await Promise.allSettled([
      searchEdgarForDeals(edgarQuery, ["8-K", "10-K", "6-K"], "2020-01-01", undefined, 15),
      searchClinicalTrials(ctQuery, undefined, 15),
    ]);

    const edgarHits = edgarResult.status === "fulfilled" ? edgarResult.value.results : [];
    const ctHits = ctResult.status === "fulfilled" ? ctResult.value.results : [];

    // Compile source hits for UI
    const sources: SourceHit[] = [
      ...edgarHits.map(h => ({ source: "SEC EDGAR", title: `${h.companyName} — ${h.form} (${h.filingDate})`, url: h.documentUrl, date: h.filingDate })),
      ...ctHits.map(h => ({ source: "ClinicalTrials.gov", title: h.title, url: `https://clinicaltrials.gov/study/${h.nctId}`, date: h.startDate })),
    ];

    write({ agent: agentId, type: "sources", sources });
    write({ agent: agentId, type: "status", status: "analyzing", message: `Analyzing ${edgarHits.length} SEC filings + ${ctHits.length} clinical trials with Claude...` });

    // Step 2: Build context for Claude
    const edgarContext = edgarHits.slice(0, 10).map(h =>
      `[${h.form}] ${h.companyName} (${h.filingDate}): ${h.description?.slice(0, 300) ?? "No description"} | Accession: ${h.accessionNumber}`
    ).join("\n");

    const ctContext = ctHits.slice(0, 10).map(h =>
      `[${h.nctId}] ${h.title} | Phase: ${h.phase} | Status: ${h.status} | Sponsor: ${h.sponsor} | Conditions: ${h.conditions.join(", ")}`
    ).join("\n");

    // Step 3: Call Claude
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: BENCHMARKING_AGENT_PROMPT,
      messages: [{
        role: "user",
        content: `## Asset Profile
Asset: ${intake.assetName}
Therapeutic Area: ${intake.therapeuticArea}
Development Stage: ${intake.developmentStage}
Deal Direction: ${intake.dealDirection}
Target Geographies: ${intake.geographies.join(", ")}
Context: ${intake.context || "None provided"}

## SEC EDGAR Filings (${edgarHits.length} found)
${edgarContext || "No relevant filings found."}

## Clinical Trials (${ctHits.length} found)
${ctContext || "No relevant trials found."}

Analyze these sources and return a JSON array of comparable deals ranked by relevance.`,
      }],
    });

    const text = response.content.find(b => b.type === "text")?.text ?? "";
    const comparables: DealComparable[] = extractJSON(text);

    write({ agent: agentId, type: "result", data: { agentId: "benchmarking", comparables } });
    write({ agent: agentId, type: "status", status: "complete", message: `Found ${comparables.length} comparable deals` });
  } catch (err) {
    const msg = cleanError(err);
    write({ agent: agentId, type: "error", error: msg });
    write({ agent: agentId, type: "status", status: "error", message: msg });
  }
}
