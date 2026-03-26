/**
 * Agent 2: Partner Identification
 * Sources: ClinicalTrials.gov + SEC EDGAR + OpenFDA + PubMed
 * Output: PartnerScore[]
 */

import Anthropic from "@anthropic-ai/sdk";
import type { HubIntakeForm, SourceHit, PartnerScore } from "@/types/hub";
import type { AgentWriter } from "./index";
import { searchClinicalTrials } from "@/server/services/clinical-trials";
import { searchEdgarForDeals } from "@/server/services/sec-edgar";
import { searchDrugApplications } from "@/server/services/openfda";
import { searchLiterature } from "@/server/services/pubmed";
import { PARTNER_AGENT_PROMPT } from "@/server/services/hub-prompts";
import { extractJSON } from "./utils";

export async function runPartnerAgent(
  intake: HubIntakeForm,
  write: AgentWriter,
): Promise<void> {
  const agentId = "partner" as const;

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured. Please add your API key in environment variables.");
    }
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    write({ agent: agentId, type: "status", status: "scraping", message: "Scanning ClinicalTrials.gov for active sponsors..." });

    const indication = intake.context?.split(" ").slice(0, 3).join(" ") || intake.therapeuticArea;
    const ctQuery = `${intake.therapeuticArea} ${indication}`;
    const edgarQuery = `"collaboration agreement" AND "${intake.therapeuticArea}"`;
    const fdaQuery = intake.therapeuticArea;
    const pubmedQuery = `${intake.therapeuticArea} licensing partnership pharmaceutical`;

    const [ctResult, edgarResult, fdaResult, pubmedResult] = await Promise.allSettled([
      searchClinicalTrials(ctQuery, "RECRUITING", 30),
      searchEdgarForDeals(edgarQuery, ["8-K"], "2022-01-01", undefined, 15),
      searchDrugApplications(fdaQuery, 20),
      searchLiterature(pubmedQuery, 10),
    ]);

    const ctHits = ctResult.status === "fulfilled" ? ctResult.value.results : [];
    const edgarHits = edgarResult.status === "fulfilled" ? edgarResult.value.results : [];
    const fdaHits = fdaResult.status === "fulfilled" ? fdaResult.value.results : [];
    const pubmedHits = pubmedResult.status === "fulfilled" ? pubmedResult.value.results : [];

    const sources: SourceHit[] = [
      ...ctHits.slice(0, 5).map(h => ({ source: "ClinicalTrials.gov", title: `${h.sponsor}: ${h.title}`, url: `https://clinicaltrials.gov/study/${h.nctId}` })),
      ...edgarHits.slice(0, 5).map(h => ({ source: "SEC EDGAR", title: `${h.companyName} — ${h.form}`, url: h.documentUrl, date: h.filingDate })),
      ...fdaHits.slice(0, 3).map(h => ({ source: "OpenFDA", title: `${h.sponsorName}: ${h.brandName || h.genericName}` })),
      ...pubmedHits.slice(0, 3).map(h => ({ source: "PubMed", title: h.title, url: h.pubmedUrl, date: h.publicationDate })),
    ];

    write({ agent: agentId, type: "sources", sources });
    write({ agent: agentId, type: "status", status: "analyzing", message: `Scoring partners from ${ctHits.length} trials + ${edgarHits.length} filings + ${fdaHits.length} FDA records...` });

    // Build context
    const ctContext = ctHits.slice(0, 15).map(h =>
      `Sponsor: ${h.sponsor} | ${h.title} | Phase: ${h.phase} | Status: ${h.status} | Conditions: ${h.conditions.join(", ")}`
    ).join("\n");

    const edgarContext = edgarHits.slice(0, 10).map(h =>
      `${h.companyName} (${h.filingDate}): ${h.description?.slice(0, 200) ?? ""}`
    ).join("\n");

    const fdaContext = fdaHits.slice(0, 10).map(h =>
      `${h.sponsorName}: ${h.brandName} (${h.genericName}) | Approved: ${h.approvalDate ?? "N/A"}`
    ).join("\n");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: PARTNER_AGENT_PROMPT,
      messages: [{
        role: "user",
        content: `## Asset Profile
Asset: ${intake.assetName}
Therapeutic Area: ${intake.therapeuticArea}
Stage: ${intake.developmentStage}
Deal Direction: ${intake.dealDirection}
Target Geographies: ${intake.geographies.join(", ")}
Context: ${intake.context || "None"}

## Clinical Trials — Active Sponsors (${ctHits.length} trials)
${ctContext || "No trials found."}

## SEC EDGAR — Recent Deal Activity (${edgarHits.length} filings)
${edgarContext || "No filings found."}

## OpenFDA — Approved Products (${fdaHits.length} records)
${fdaContext || "No FDA records found."}

Identify and score the top potential licensing partners.`,
      }],
    });

    const text = response.content.find(b => b.type === "text")?.text ?? "";
    const partners: PartnerScore[] = extractJSON(text);

    write({ agent: agentId, type: "result", data: { agentId: "partner", partners } });
    write({ agent: agentId, type: "status", status: "complete", message: `Identified ${partners.length} potential partners` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    write({ agent: agentId, type: "error", error: msg });
    write({ agent: agentId, type: "status", status: "error", message: msg });
  }
}
