/**
 * Agent 1: Deal Benchmarking & Market Potential
 * Sources: SEC EDGAR, ClinicalTrials.gov, OpenFDA, Orange Book, DailyMed, ChEMBL, EMA, Health Canada
 * Output: DealComparable[]
 */

import Anthropic from "@anthropic-ai/sdk";
import type { HubIntakeForm, SourceHit, DealComparable } from "@/types/hub";
import type { AgentWriter } from "./index";
import { searchEdgarForDeals } from "@/server/services/sec-edgar";
import { searchClinicalTrials } from "@/server/services/clinical-trials";
import { searchDrugApplications } from "@/server/services/openfda";
import { searchOrangeBook } from "@/server/services/orange-book";
import { searchDailyMed } from "@/server/services/dailymed";
import { searchMolecules } from "@/server/services/chembl";
import { searchEmaProducts } from "@/server/services/ema";
import { searchByBrandName as searchHealthCanada } from "@/server/services/health-canada";
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

    // Step 1: Query ALL data sources in parallel
    write({ agent: agentId, type: "status", status: "scraping", message: "Querying 8 global databases: SEC EDGAR, ClinicalTrials, FDA, Orange Book, DailyMed, ChEMBL, EMA, Health Canada..." });

    const assetBase = intake.assetName.split("(")[0].trim();
    // If no TA provided, agents will auto-detect from public data
    const taQualifier = intake.therapeuticArea ? ` AND "${intake.therapeuticArea}"` : "";
    const edgarQuery = `"license agreement"${taQualifier} AND "${assetBase}"`;
    const ctQuery = `${intake.assetName}${intake.therapeuticArea ? " " + intake.therapeuticArea : ""}`;

    const [edgarResult, ctResult, fdaResult, obResult, dmResult, chemblResult, emaResult, hcResult] = await Promise.allSettled([
      searchEdgarForDeals(edgarQuery, ["8-K", "10-K", "6-K"], "2020-01-01", undefined, 15),
      searchClinicalTrials(ctQuery, undefined, 15),
      searchDrugApplications(assetBase, 10),
      searchOrangeBook(assetBase, 10),
      searchDailyMed(assetBase, 10),
      searchMolecules(assetBase, 10),
      searchEmaProducts(assetBase, 10),
      searchHealthCanada(assetBase, 10),
    ]);

    const edgarHits = edgarResult.status === "fulfilled" ? edgarResult.value.results : [];
    const ctHits = ctResult.status === "fulfilled" ? ctResult.value.results : [];
    const fdaHits = fdaResult.status === "fulfilled" ? fdaResult.value.results : [];
    const obHits = obResult.status === "fulfilled" ? obResult.value.results : [];
    const dmHits = dmResult.status === "fulfilled" ? dmResult.value.results : [];
    const chemblHits: any[] = chemblResult.status === "fulfilled" ? chemblResult.value : [];
    const emaHits: any[] = emaResult.status === "fulfilled" ? emaResult.value : [];
    const hcHits = hcResult.status === "fulfilled" ? hcResult.value.results : [];

    const totalSources = edgarHits.length + ctHits.length + fdaHits.length + obHits.length + dmHits.length + chemblHits.length + emaHits.length + hcHits.length;

    // Compile source hits for UI
    const sources: SourceHit[] = [
      ...edgarHits.map(h => ({ source: "SEC EDGAR", title: `${h.companyName} — ${h.form} (${h.filingDate})`, url: h.documentUrl, date: h.filingDate })),
      ...ctHits.map(h => ({ source: "ClinicalTrials.gov", title: h.title, url: `https://clinicaltrials.gov/study/${h.nctId}`, date: h.startDate })),
      ...fdaHits.map(h => ({ source: "OpenFDA", title: `${h.brandName || h.genericName} (${h.applicationNumber})`, url: `https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=${h.applicationNumber?.replace(/\D/g, "")}` })),
      ...obHits.map(h => ({ source: "Orange Book", title: `${h.proprietaryName || h.ingredientName} — Patents: ${h.patents?.length || 0}` })),
      ...dmHits.map(h => ({ source: "DailyMed", title: h.title, url: `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${h.setId}` })),
      ...chemblHits.map(h => ({ source: "ChEMBL", title: `${h.prefName || h.chemblId} (Phase ${h.maxPhase})`, url: `https://www.ebi.ac.uk/chembl/compound_report_card/${h.chemblId}/` })),
      ...emaHits.map(h => ({ source: "EMA", title: h.title || h.productNames?.[0] || "Unknown" })),
      ...hcHits.map(h => ({ source: "Health Canada", title: `${h.brandName} (DIN: ${h.drugIdentificationNumber})` })),
    ];

    write({ agent: agentId, type: "sources", sources });
    write({ agent: agentId, type: "status", status: "analyzing", message: `Analyzing ${totalSources} records from 8 databases with Claude...` });

    // Step 2: Build rich context for Claude
    const edgarContext = edgarHits.slice(0, 10).map(h =>
      `[SEC ${h.form}] ${h.companyName} (${h.filingDate}): ${h.description?.slice(0, 300) ?? "No description"} | Accession: ${h.accessionNumber}`
    ).join("\n");

    const ctContext = ctHits.slice(0, 10).map(h =>
      `[${h.nctId}] ${h.title} | Phase: ${h.phase} | Status: ${h.status} | Sponsor: ${h.sponsor} | Conditions: ${h.conditions.join(", ")}`
    ).join("\n");

    const fdaContext = fdaHits.slice(0, 8).map((h: any) =>
      `[FDA ${h.applicationNumber}] ${h.brandName || h.genericName} by ${h.sponsorName} — Approved: ${h.approvalDate ?? "N/A"} | Type: ${h.productType} | Substance: ${h.substanceName ?? "N/A"}`
    ).join("\n");

    const obContext = obHits.slice(0, 5).map(h => {
      const patents = h.patents?.map((p: any) => `Patent ${p.patentNumber} expires ${p.patentExpireDate}`).join("; ") || "No patents";
      return `[Orange Book] ${h.proprietaryName || h.ingredientName} (${h.applicationNumber}) by ${h.applicant} — ${patents}`;
    }).join("\n");

    const chemblContext = chemblHits.slice(0, 5).map(h =>
      `[ChEMBL ${h.chemblId}] ${h.prefName} | Max Phase: ${h.maxPhase} | Type: ${h.moleculeType} | First Approval: ${h.firstApproval || "N/A"} | Indication: ${h.indication || "N/A"}`
    ).join("\n");

    const emaContext = emaHits.slice(0, 5).map(h =>
      `[EMA] ${h.title || h.productNames?.join(", ")} | Substances: ${h.activeSubstances?.join(", ") || "N/A"}`
    ).join("\n");

    const hcContext = hcHits.slice(0, 5).map(h =>
      `[Health Canada] ${h.brandName} (DIN: ${h.drugIdentificationNumber}) by ${h.companyName} | Status: ${h.status} | Route: ${h.route}`
    ).join("\n");

    // Step 3: Call Claude with ALL data
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      system: BENCHMARKING_AGENT_PROMPT,
      messages: [{
        role: "user",
        content: `## Asset Profile
Asset: ${intake.assetName}
Therapeutic Area: ${intake.therapeuticArea || "AUTO-DETECT from data sources below"}
Development Stage: ${intake.developmentStage || "AUTO-DETECT from clinical trials data"}
Deal Direction: ${intake.dealDirection}
Target Geographies: ${intake.geographies.join(", ")}
Context: ${intake.context || "None provided — analyze the asset comprehensively"}

## SEC EDGAR Filings (${edgarHits.length} found)
${edgarContext || "No relevant filings found."}

## Clinical Trials (${ctHits.length} found)
${ctContext || "No relevant trials found."}

## FDA Approved Products (${fdaHits.length} found)
${fdaContext || "No FDA approvals found."}

## Orange Book Patent & Exclusivity Data (${obHits.length} products)
${obContext || "No Orange Book data found."}

## ChEMBL Drug Intelligence (${chemblHits.length} molecules)
${chemblContext || "No ChEMBL data found."}

## EMA European Authorizations (${emaHits.length} found)
${emaContext || "No EMA data found."}

## Health Canada Approvals (${hcHits.length} found)
${hcContext || "No Health Canada data found."}

Analyze ALL sources across US, EU, and Canadian markets. Return a JSON array of comparable deals ranked by relevance, including market potential analysis and patent cliff exposure where applicable.`,
      }],
    });

    const text = response.content.find(b => b.type === "text")?.text ?? "";
    const comparables: DealComparable[] = extractJSON(text);

    write({ agent: agentId, type: "result", data: { agentId: "benchmarking", comparables } });
    write({ agent: agentId, type: "status", status: "complete", message: `Found ${comparables.length} comparable deals from ${totalSources} global sources` });
  } catch (err) {
    const msg = cleanError(err);
    write({ agent: agentId, type: "error", error: msg });
    write({ agent: agentId, type: "status", status: "error", message: msg });
  }
}
