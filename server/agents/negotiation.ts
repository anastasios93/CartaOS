/**
 * Agent 3: Negotiation Intelligence & Market Positioning
 * Sources: SEC EDGAR, ClinicalTrials.gov, OpenFDA, Orange Book, FAERS, PubMed, DailyMed
 * Output: NegotiationLeverage[]
 */

import Anthropic from "@anthropic-ai/sdk";
import type { HubIntakeForm, SourceHit, NegotiationLeverage } from "@/types/hub";
import type { AgentWriter } from "./index";
import { searchEdgarForDeals } from "@/server/services/sec-edgar";
import { searchClinicalTrials } from "@/server/services/clinical-trials";
import { searchDrugApplications } from "@/server/services/openfda";
import { searchOrangeBook } from "@/server/services/orange-book";
import { getTopAdverseReactions, getAdverseEventTotal } from "@/server/services/fda-adverse-events";
import { searchLiterature } from "@/server/services/pubmed";
import { searchDailyMed } from "@/server/services/dailymed";
import { NEGOTIATION_AGENT_PROMPT } from "@/server/services/hub-prompts";
import { extractJSON, cleanError } from "./utils";

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

    write({ agent: agentId, type: "status", status: "scraping", message: "Querying 7 databases for deal precedents, patents, safety, and competitive intel..." });

    const assetBase = intake.assetName.split("(")[0].trim();
    const taQualifier = intake.therapeuticArea ? `AND "${intake.therapeuticArea}" ` : "";
    const edgarQuery = `"upfront payment" OR "milestone payment" OR "royalt" ${taQualifier}AND "license"`;
    const ctQuery = `${intake.assetName}${intake.therapeuticArea ? " " + intake.therapeuticArea : ""}`;

    const [edgarResult, ctResult, fdaResult, obResult, faersTotal, faersTop, pubmedResult, dmResult] = await Promise.allSettled([
      searchEdgarForDeals(edgarQuery, ["8-K", "10-K", "6-K"], "2021-01-01", undefined, 20),
      searchClinicalTrials(ctQuery, undefined, 20),
      searchDrugApplications(assetBase, 10),
      searchOrangeBook(assetBase, 10),
      getAdverseEventTotal(assetBase),
      getTopAdverseReactions(assetBase, 10),
      searchLiterature(`${intake.therapeuticArea || assetBase} deal terms upfront milestones royalties`, 10),
      searchDailyMed(assetBase, 5),
    ]);

    const edgarHits = edgarResult.status === "fulfilled" ? edgarResult.value.results : [];
    const ctHits = ctResult.status === "fulfilled" ? ctResult.value.results : [];
    const fdaHits = fdaResult.status === "fulfilled" ? fdaResult.value.results : [];
    const obHits = obResult.status === "fulfilled" ? obResult.value.results : [];
    const aeTotal = faersTotal.status === "fulfilled" ? faersTotal.value : 0;
    const aeTop = faersTop.status === "fulfilled" ? faersTop.value : [];
    const pubmedHits = pubmedResult.status === "fulfilled" ? pubmedResult.value.results : [];
    const dmHits = dmResult.status === "fulfilled" ? dmResult.value.results : [];

    const totalSources = edgarHits.length + ctHits.length + fdaHits.length + obHits.length + pubmedHits.length + dmHits.length;

    const sources: SourceHit[] = [
      ...edgarHits.slice(0, 8).map(h => ({ source: "SEC EDGAR", title: `${h.companyName} — ${h.form} (${h.filingDate})`, url: h.documentUrl, date: h.filingDate })),
      ...ctHits.slice(0, 5).map(h => ({ source: "ClinicalTrials.gov", title: h.title, url: `https://clinicaltrials.gov/study/${h.nctId}` })),
      ...fdaHits.slice(0, 3).map(h => ({ source: "OpenFDA", title: `${h.brandName || h.genericName} (${h.applicationNumber})` })),
      ...obHits.slice(0, 3).map(h => ({ source: "Orange Book", title: `${h.proprietaryName} — ${h.patents?.length || 0} patents` })),
      ...pubmedHits.slice(0, 3).map(h => ({ source: "PubMed", title: h.title, url: h.pubmedUrl })),
    ];

    write({ agent: agentId, type: "sources", sources });
    write({ agent: agentId, type: "status", status: "analyzing", message: `Analyzing leverage from ${totalSources} records + safety data (${aeTotal.toLocaleString()} FAERS reports)...` });

    const edgarContext = edgarHits.slice(0, 12).map(h =>
      `[${h.form}] ${h.companyName} (${h.filingDate}): ${h.description?.slice(0, 400) ?? ""} | Accession: ${h.accessionNumber}`
    ).join("\n");

    const ctContext = ctHits.slice(0, 10).map(h =>
      `[${h.nctId}] ${h.title} | Phase: ${h.phase} | Status: ${h.status} | Sponsor: ${h.sponsor}`
    ).join("\n");

    const fdaContext = fdaHits.slice(0, 5).map((h: any) =>
      `[FDA] ${h.brandName || h.genericName} by ${h.sponsorName} — ${h.productType} | Approved: ${h.approvalDate || "N/A"} | Substance: ${h.substanceName ?? "N/A"}`
    ).join("\n");

    const obContext = obHits.slice(0, 5).map(h => {
      const patents = h.patents?.map((p: any) => `Patent ${p.patentNumber} expires ${p.patentExpireDate}`).join("; ") || "No patents";
      const exclusivities = h.exclusivities?.map((e: any) => `${e.exclusivityCode} until ${e.exclusivityDate}`).join("; ") || "None";
      return `[Orange Book] ${h.proprietaryName || h.ingredientName} by ${h.applicant} — Patents: ${patents} | Exclusivity: ${exclusivities}`;
    }).join("\n");

    const safetyContext = aeTotal > 0
      ? `Total FAERS adverse event reports: ${aeTotal.toLocaleString()}\nTop reactions: ${aeTop.map(r => `${r.term} (${r.count})`).join(", ")}`
      : "No adverse event data available.";

    const uniqueSponsors = new Set(ctHits.map(h => h.sponsor));

    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      system: NEGOTIATION_AGENT_PROMPT,
      messages: [{
        role: "user",
        content: `## Asset Profile
Asset: ${intake.assetName}
Therapeutic Area: ${intake.therapeuticArea || "AUTO-DETECT from data"}
Stage: ${intake.developmentStage || "AUTO-DETECT from clinical trials"}
Deal Direction: ${intake.dealDirection}
Target Geographies: ${intake.geographies.join(", ")}
Context: ${intake.context || "None — assess negotiating leverage holistically"}

## Competitive Landscape
Active competitors: ${uniqueSponsors.size} unique sponsors with active trials

## SEC EDGAR — Deal Term Precedents (${edgarHits.length} filings)
${edgarContext || "No relevant filings found."}

## Clinical Trials — Competitive Intelligence (${ctHits.length} trials)
${ctContext || "No relevant trials found."}

## FDA Regulatory Status (${fdaHits.length} approved products)
${fdaContext || "No FDA records found."}

## Patent & Exclusivity Landscape (Orange Book)
${obContext || "No Orange Book data found."}

## Safety Intelligence (FAERS)
${safetyContext}

Analyze the negotiating position considering regulatory status, patent landscape, safety profile, and competitive dynamics. Produce leverage assessment for key deal terms with specific dollar ranges from precedent transactions.`,
      }],
    });

    const text = response.content.find(b => b.type === "text")?.text ?? "";
    const leveragePoints: NegotiationLeverage[] = extractJSON(text);

    write({ agent: agentId, type: "result", data: { agentId: "negotiation", leveragePoints } });
    write({ agent: agentId, type: "status", status: "complete", message: `Assessed leverage on ${leveragePoints.length} deal terms from ${totalSources} sources` });
  } catch (err) {
    const msg = cleanError(err);
    write({ agent: agentId, type: "error", error: msg });
    write({ agent: agentId, type: "status", status: "error", message: msg });
  }
}
