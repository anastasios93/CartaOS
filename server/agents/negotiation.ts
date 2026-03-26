/**
 * Agent 3: Negotiation Intelligence
 * Sources: SEC EDGAR + ClinicalTrials.gov
 * Output: NegotiationLeverage[]
 */

import Anthropic from "@anthropic-ai/sdk";
import type { HubIntakeForm, SourceHit, NegotiationLeverage } from "@/types/hub";
import type { AgentWriter } from "./index";
import { searchEdgarForDeals } from "@/server/services/sec-edgar";
import { searchClinicalTrials } from "@/server/services/clinical-trials";
import { NEGOTIATION_AGENT_PROMPT } from "@/server/services/hub-prompts";
import { extractJSON } from "./utils";

export async function runNegotiationAgent(
  intake: HubIntakeForm,
  write: AgentWriter,
): Promise<void> {
  const agentId = "negotiation" as const;

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured. Please add your API key in environment variables.");
    }
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    write({ agent: agentId, type: "status", status: "scraping", message: "Searching SEC EDGAR for deal term precedents..." });

    const edgarQuery = `"upfront payment" OR "milestone payment" OR "royalt" AND "${intake.therapeuticArea}" AND "license"`;
    const ctQuery = `${intake.assetName} ${intake.therapeuticArea}`;

    const [edgarResult, ctResult] = await Promise.allSettled([
      searchEdgarForDeals(edgarQuery, ["8-K", "10-K", "6-K"], "2021-01-01", undefined, 20),
      searchClinicalTrials(ctQuery, undefined, 20),
    ]);

    const edgarHits = edgarResult.status === "fulfilled" ? edgarResult.value.results : [];
    const ctHits = ctResult.status === "fulfilled" ? ctResult.value.results : [];

    const sources: SourceHit[] = [
      ...edgarHits.slice(0, 8).map(h => ({ source: "SEC EDGAR", title: `${h.companyName} — ${h.form} (${h.filingDate})`, url: h.documentUrl, date: h.filingDate })),
      ...ctHits.slice(0, 5).map(h => ({ source: "ClinicalTrials.gov", title: h.title, url: `https://clinicaltrials.gov/study/${h.nctId}` })),
    ];

    write({ agent: agentId, type: "sources", sources });
    write({ agent: agentId, type: "status", status: "analyzing", message: `Analyzing leverage from ${edgarHits.length} deal precedents + ${ctHits.length} competitive trials...` });

    const edgarContext = edgarHits.slice(0, 12).map(h =>
      `[${h.form}] ${h.companyName} (${h.filingDate}): ${h.description?.slice(0, 400) ?? ""} | Accession: ${h.accessionNumber}`
    ).join("\n");

    const ctContext = ctHits.slice(0, 10).map(h =>
      `[${h.nctId}] ${h.title} | Phase: ${h.phase} | Status: ${h.status} | Sponsor: ${h.sponsor}`
    ).join("\n");

    const uniqueSponsors = new Set(ctHits.map(h => h.sponsor));
    const competitorCount = uniqueSponsors.size;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: NEGOTIATION_AGENT_PROMPT,
      messages: [{
        role: "user",
        content: `## Asset Profile
Asset: ${intake.assetName}
Therapeutic Area: ${intake.therapeuticArea}
Stage: ${intake.developmentStage}
Deal Direction: ${intake.dealDirection}
Target Geographies: ${intake.geographies.join(", ")}
Context: ${intake.context || "None"}

## Competitive Landscape
Active competitors in this space: ${competitorCount} unique sponsors with active trials

## SEC EDGAR — Deal Term Precedents (${edgarHits.length} filings)
${edgarContext || "No relevant filings found."}

## Clinical Trials — Competitive Intelligence (${ctHits.length} trials)
${ctContext || "No relevant trials found."}

Analyze the negotiating position and produce leverage assessment for key deal terms.`,
      }],
    });

    const text = response.content.find(b => b.type === "text")?.text ?? "";
    const leveragePoints: NegotiationLeverage[] = extractJSON(text);

    write({ agent: agentId, type: "result", data: { agentId: "negotiation", leveragePoints } });
    write({ agent: agentId, type: "status", status: "complete", message: `Assessed leverage on ${leveragePoints.length} deal terms` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    write({ agent: agentId, type: "error", error: msg });
    write({ agent: agentId, type: "status", status: "error", message: msg });
  }
}
