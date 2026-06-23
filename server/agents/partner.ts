/**
 * Agent 2: Partner Identification & Strategic Fit
 * Sources: ClinicalTrials.gov, SEC EDGAR, OpenFDA, PubMed, ChEMBL, EMA, Health Canada, FAERS
 * Output: PartnerScore[]
 */

import Anthropic from "@anthropic-ai/sdk";
import type { HubIntakeForm, SourceHit, PartnerScore } from "@/types/hub";
import type { AgentWriter } from "./index";
import { searchClinicalTrials } from "@/server/services/clinical-trials";
import { searchEdgarForDeals } from "@/server/services/sec-edgar";
import { searchDrugApplications } from "@/server/services/openfda";
import { searchLiterature } from "@/server/services/pubmed";
import { searchMolecules, searchTargets } from "@/server/services/chembl";
import { searchEmaProducts } from "@/server/services/ema";
import { searchByBrandName as searchHealthCanada } from "@/server/services/health-canada";
import { getTopAdverseReactions } from "@/server/services/fda-adverse-events";
import { PARTNER_AGENT_PROMPT } from "@/server/services/hub-prompts";
import { extractJSON, cleanError } from "./utils";

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

    write({ agent: agentId, type: "status", status: "scraping", message: "Scanning 8 global databases for potential partners..." });

    const assetBase = intake.assetName.split("(")[0].trim();
    const indication = intake.context?.split(" ").slice(0, 3).join(" ") || intake.therapeuticArea;
    // If TA missing, query by asset name
    const ctQuery = intake.therapeuticArea ? `${intake.therapeuticArea} ${indication}` : assetBase;
    const edgarQuery = intake.therapeuticArea
      ? `"collaboration agreement" AND "${intake.therapeuticArea}"`
      : `"collaboration agreement" AND "${assetBase}"`;

    const [ctResult, edgarResult, fdaResult, pubmedResult, chemblResult, chemblTargets, emaResult, hcResult, faersResult] = await Promise.allSettled([
      searchClinicalTrials(ctQuery, "RECRUITING", 30),
      searchEdgarForDeals(edgarQuery, ["8-K"], "2022-01-01", undefined, 15),
      searchDrugApplications(intake.therapeuticArea || assetBase, 20),
      searchLiterature(`${intake.therapeuticArea || assetBase} licensing partnership pharmaceutical`, 10),
      searchMolecules(assetBase, 10),
      searchTargets(intake.therapeuticArea || assetBase, 15),
      searchEmaProducts(assetBase, 10),
      searchHealthCanada(assetBase, 10),
      getTopAdverseReactions(assetBase, 5),
    ]);

    const ctHits = ctResult.status === "fulfilled" ? ctResult.value.results : [];
    const edgarHits = edgarResult.status === "fulfilled" ? edgarResult.value.results : [];
    const fdaHits = fdaResult.status === "fulfilled" ? fdaResult.value.results : [];
    const pubmedHits = pubmedResult.status === "fulfilled" ? pubmedResult.value.results : [];
    const chemblHits: any[] = chemblResult.status === "fulfilled" ? chemblResult.value : [];
    const targetHits: any[] = chemblTargets.status === "fulfilled" ? chemblTargets.value : [];
    const emaHits: any[] = emaResult.status === "fulfilled" ? emaResult.value : [];
    const hcHits = hcResult.status === "fulfilled" ? hcResult.value.results : [];
    const faersHits: any[] = faersResult.status === "fulfilled" ? faersResult.value : [];

    const totalSources = ctHits.length + edgarHits.length + fdaHits.length + pubmedHits.length + chemblHits.length + targetHits.length + emaHits.length + hcHits.length;

    const sources: SourceHit[] = [
      ...ctHits.slice(0, 5).map(h => ({ source: "ClinicalTrials.gov", title: `${h.sponsor}: ${h.title}`, url: `https://clinicaltrials.gov/study/${h.nctId}` })),
      ...edgarHits.slice(0, 5).map(h => ({ source: "SEC EDGAR", title: `${h.companyName} — ${h.form}`, url: h.documentUrl, date: h.filingDate })),
      ...fdaHits.slice(0, 3).map(h => ({ source: "OpenFDA", title: `${h.sponsorName}: ${h.brandName || h.genericName}` })),
      ...pubmedHits.slice(0, 3).map(h => ({ source: "PubMed", title: h.title, url: h.pubmedUrl })),
      ...chemblHits.slice(0, 3).map(h => ({ source: "ChEMBL", title: `${h.prefName || h.chemblId} (Phase ${h.maxPhase})` })),
      ...emaHits.slice(0, 3).map(h => ({ source: "EMA", title: h.title || h.productNames?.[0] || "" })),
      ...hcHits.slice(0, 2).map(h => ({ source: "Health Canada", title: `${h.brandName} by ${h.companyName}` })),
    ];

    write({ agent: agentId, type: "sources", sources });
    write({ agent: agentId, type: "status", status: "analyzing", message: `Scoring partners from ${totalSources} records across US, EU, Canada...` });

    // Build context
    const ctContext = ctHits.slice(0, 15).map(h =>
      `Sponsor: ${h.sponsor} | ${h.title} | Phase: ${h.phase} | Status: ${h.status} | Conditions: ${h.conditions.join(", ")}`
    ).join("\n");

    const edgarContext = edgarHits.slice(0, 10).map(h =>
      `${h.companyName} (${h.filingDate}): ${h.description?.slice(0, 200) ?? ""}`
    ).join("\n");

    const fdaContext = fdaHits.slice(0, 10).map(h =>
      `${h.sponsorName}: ${h.brandName} (${h.genericName}) | Approved: ${h.approvalDate ?? "N/A"} | Substance: ${h.substanceName ?? "N/A"}`
    ).join("\n");

    const chemblContext = chemblHits.slice(0, 5).map(h =>
      `${h.prefName || h.chemblId} | Phase: ${h.maxPhase} | Type: ${h.moleculeType} | Indication: ${h.indication || "N/A"}`
    ).join("\n");

    const targetContext = targetHits.slice(0, 8).map(t =>
      `Target: ${t.prefName} (${t.targetType}) | Organism: ${t.organism}`
    ).join("\n");

    const emaContext = emaHits.slice(0, 5).map(h =>
      `[EMA] ${h.title || h.productNames?.join(", ")} | Substances: ${h.activeSubstances?.join(", ") || "N/A"}`
    ).join("\n");

    const hcContext = hcHits.slice(0, 5).map(h =>
      `[Canada] ${h.brandName} by ${h.companyName} | DIN: ${h.drugIdentificationNumber} | Status: ${h.status}`
    ).join("\n");

    const faersContext = faersHits.length > 0
      ? `Safety Profile - Top adverse reactions: ${faersHits.map(r => `${r.term} (${r.count} reports)`).join(", ")}`
      : "";

    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      system: PARTNER_AGENT_PROMPT,
      messages: [{
        role: "user",
        content: `## Asset Profile
Asset: ${intake.assetName}
Therapeutic Area: ${intake.therapeuticArea || "AUTO-DETECT from sources below"}
Stage: ${intake.developmentStage || "AUTO-DETECT from clinical trials data"}
Deal Direction: ${intake.dealDirection}
Target Geographies: ${intake.geographies.join(", ")}
Context: ${intake.context || "None — identify global partners with appropriate scale and TA fit"}

## Clinical Trials — Active Sponsors (${ctHits.length} trials)
${ctContext || "No trials found."}

## SEC EDGAR — Recent Deal Activity (${edgarHits.length} filings)
${edgarContext || "No filings found."}

## FDA — Approved Products (${fdaHits.length} records)
${fdaContext || "No FDA records found."}

## ChEMBL — Drug Molecules & Mechanisms (${chemblHits.length} molecules)
${chemblContext || "No ChEMBL data."}

## ChEMBL — Drug Targets in ${intake.therapeuticArea} (${targetHits.length} targets)
${targetContext || "No target data."}

## EMA — European Authorized Products (${emaHits.length} found)
${emaContext || "No EMA data."}

## Health Canada — Canadian Approvals (${hcHits.length} found)
${hcContext || "No Canadian data."}

${faersContext ? `## Safety Intelligence (FAERS)\n${faersContext}` : ""}

Identify and score the top potential licensing partners across ALL geographies. Consider global regulatory footprint, pipeline strength, and market presence in US, EU, Japan, China, and Canada.`,
      }],
    });

    const text = response.content.find(b => b.type === "text")?.text ?? "";
    const partners: PartnerScore[] = extractJSON(text);

    write({ agent: agentId, type: "result", data: { agentId: "partner", partners } });
    write({ agent: agentId, type: "status", status: "complete", message: `Identified ${partners.length} partners from ${totalSources} global sources` });
  } catch (err) {
    const msg = cleanError(err);
    write({ agent: agentId, type: "error", error: msg });
    write({ agent: agentId, type: "status", status: "error", message: msg });
  }
}
