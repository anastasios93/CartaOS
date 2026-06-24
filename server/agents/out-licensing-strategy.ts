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
import { extractJSON, cleanError, parseCompounds } from "./utils";

const STRATEGY_PROMPT = `You are a CartaOS pharmaceutical business-development analyst specialising in OFF-PATENT VALUE CAPTURE — small-molecule generics, complex/specialty & 505(b)(2) generics, and biosimilars — preparing a decision-grade market opportunity assessment for a sophisticated BD principal. The output is a finished CartaOS client deliverable, ready to present.

You are given ONE OR MORE compounds to assess (a portfolio search). For EACH compound run the CartaOS off-patent method, then synthesise: classify the molecule (commodity small-molecule generic | complex/specialty or 505(b)(2) | biosimilar), size the POST-LoE addressable pool, gauge competitive intensity (the main determinant of capturable value), locate where margin sits in the value chain, name partners, map channels and the regulatory path, recommend a go-to-market sequence, and state explicit kill criteria. If several compounds are supplied, the verdict and recommendations RANK them.

You receive (a) outputs from prior diagnostic agents and (b) a live evidence base (openFDA, Orange/Purple Book, ClinicalTrials.gov, EMA, ChEMBL, Open Targets, PubChem, SEC EDGAR, CMS spend, Spain CIMA, WHO GHO, patents, news).

Per geography, assess SIX vectors and compute a Commercial Opportunity Score (COS, 0–100):
  A. Value / addressable pool — the POST-LoE pool, NOT the originator's protected revenue: reference-market value (value vs volume), the exclusivity WINDOW per geo (primary patent + SPC, paediatric extension, EU 8+2+1 data/market exclusivity, US BPCIA 12-yr biologics) and a stated erosion curve; walk TAM → SAM → SOM.
  B. Exclusivity & regulatory path — when the opportunity OPENS (LoE/SPC dates), the pathway (ANDA + GDUFA, EU decentralised/MRP/centralised, biosimilar comparability + clinical package, bioequivalence, India CDSCO), and a realistic time-to-launch and capex band.
  C. Competitive intensity — count ANDA / EU MA / biosimilar filers; first-filer & paragraph IV dynamics; crowded commodity race vs defensible high-barrier pool.
  D. Market access & channels — retail / hospital & tender / specialty; EU national tender & payer behaviour (AMNOG, HAS, AIFA, AEMPS), US PBM + Big-3 wholesalers, India trade- vs branded-generics vs tender; which channel holds the value.
  E. Value capture & partners — where margin concentrates along KSM → API → finished dose / drug substance → MAH → distribution; named API/KSM suppliers (China/India concentration risk), CDMO/CMO, MAH, EU specialty-pharma buyers and Indian supply-side originators.
  F. Manufacturing & barriers — API availability, manufacturing/device/comparability complexity and capex that actually protect margin.

Return ONLY valid JSON with this exact structure:

{
  "verdict": "Go | Conditional Go | No-Go",
  "opportunityThesis": "One sentence: the sharpest capture wedge — which compound, which geography, and the single biggest blocker.",
  "executiveSummary": "2-3 flowing paragraphs in a CartaOS partner's voice: the off-patent opportunity, the lead compound x geography, the value-capture logic, and the decisive risks.",
  "assetProfile": {
    "name": "Compound, or 'Portfolio: A, B, C' when several are assessed",
    "description": "Classification (commodity generic / complex-specialty / biosimilar), originator brand, mechanism, dosage forms/routes, value proposition",
    "modality": "commodity small-molecule generic | complex/specialty (505(b)(2)) | biosimilar",
    "therapeuticArea": "ATC class / indication",
    "developmentStage": "Off-patent status — LoE reached or window opening (with the key date)",
    "mechanism": "Mechanism / originator brand",
    "currentMarkets": ["US", "EU"],
    "keyStrengths": ["3-5: capture wedge, barriers protecting margin, supply security"],
    "keyChallenges": ["3-5: erosion, crowding, comparability, timing"],
    "keyDataPoints": [
      {"label": "EU LoE / SPC expiry", "value": "2027", "source": "EPO INPADOC / patent register"},
      {"label": "Originator EU revenue", "value": "~EUR 1.2B", "source": "originator annual report"}
    ]
  },
  "regionalAnalysis": [
    {
      "region": "US",
      "regionLabel": "United States",
      "attractiveness": "Very High|High|Medium|Low",
      "attractivenessScore": 82,
      "cos": { "marketSize": 80, "regulatory": 78, "ip": 72, "marketAccess": 70, "competition": 55 },
      "market": { "sizeUSD": "post-LoE pool, e.g. $X", "growthRate": "erosion curve assumed", "drivers": ["demand, tender, unmet supply"], "barriers": ["price/volume erosion, oversupply"], "unmetNeed": "TAM -> SAM -> SOM with the arithmetic" },
      "legal": { "regulatoryAuthority": "FDA", "pathway": "ANDA / 505(b)(2) / biosimilar (BPCIA)", "estimatedTimeline": "time-to-launch", "exclusivityOpportunities": ["window opens YYYY — LoE/SPC/data-exclusivity basis"], "barriers": ["paragraph IV / SPC litigation, comparability"] },
      "commercial": { "competitorActivity": "filer count & competitive intensity (ANDA / EU MA / biosimilar applicants)", "pricingDynamics": "erosion + tender/payer dynamics", "reimbursementLandscape": "channel access & tender mechanics", "keyPartnerCandidates": ["named API/CDMO/MAH/EU-buyer/supply-side partners"], "distributionChannels": "retail / hospital-tender / specialty" },
      "ip": { "patentStrength": "Strong|Moderate|Weak", "ftoStatus": "Clear|Some Risk|Significant Risk", "expirationRisks": ["secondary patents, SPC, formulation patents"], "opportunities": ["505(b)(2) / device / interchangeability angle"], "estimatedExclusivityYears": 8 },
      "manufacturing": { "complexity": "Low|Moderate|High", "notes": "API source & concentration risk, CDMO capability, comparability burden" },
      "businessCase": { "valueProposition": "the rational value proposition for THIS region — why it is (or isn't) attractive, synthesising market, regulatory, IP, access, competition and manufacturing into one clear thesis", "profitWedge": "exactly WHERE and HOW a profitable business case is made here — the specific channel, the timing against the exclusivity window, and the differentiation / capture lever that protects margin", "economics": "the economics — the share of the pool you can realistically capture (SOM), the gross margin it supports, and the investment and erosion it must beat to be profitable", "verdict": "Pursue | Watch | Pass" }
    }
  ],
  "recommendations": [
    {
      "priorityRank": 1,
      "targetRegion": "Germany",
      "rationale": "why this compound x geography ranks here — the capture wedge and timing vs the window",
      "recommendedDealStructure": "In-license | Originate | Co-develop | Build | Partner | Pass",
      "estimatedValue": { "upfront": "capturable SOM / entry value", "total": "addressable pool (TAM) and realistic capture", "royaltyRange": "if partnered/licensed" },
      "topPartnerCandidates": ["named API/CDMO/MAH/EU-buyer/supply-side candidates"],
      "prerequisites": ["the data gaps to resolve first — e.g. tender pricing, filer count, API qualification"],
      "estimatedTimeline": "time-to-launch vs the window",
      "expectedROI": "capturable value vs investment and erosion"
    }
  ],
  "portfolioRisks": [
    { "category": "Market|Legal|Commercial|IP", "risk": "risk or KILL CRITERION (price erosion/oversupply, API concentration, paragraph IV/SPC litigation, comparability failure, slipping past the window)", "affectedRegions": ["US","DE"], "impact": "High|Medium|Low", "likelihood": "High|Medium|Low", "mitigation": "concrete action" }
  ],
  "dataConfidence": "High|Medium|Low",
  "sourcesUsed": ["named authorities underpinning the assessment"]
}

CRITICAL RULES:
1. Cover the target geographies INDIVIDUALLY — one regionalAnalysis entry each: US, Germany, France, Italy, Spain, Japan, China, Rest of World, plus India where the in-license/origination corridor is relevant (region codes "US","DE","FR","IT","ES","JP","CN","ROW","IN"; regionLabel = full country name). NEVER emit a single combined "EU" row — pricing, reimbursement and tendering are national: assess Germany (G-BA/IQWiG·AMNOG), France (HAS·SMR/ASMR·CEPS), Italy (AIFA) and Spain (AEMPS·CIMA) separately. Populate all six vectors and the cos sub-scores per geography.
2. attractivenessScore is the regional Commercial Opportunity Score; keep it consistent with the cos sub-scores. In cos.competition, 100 = LOW intensity (favourable), low = crowded.
3. VALUE is the post-LoE addressable pool, not the originator's protected revenue. Show the TAM -> SAM -> SOM arithmetic and state the erosion curve you assume and why.
4. verdict maps the off-patent call: Go = pursue, Conditional Go = watch, No-Go = pass. opportunityThesis is the single sharpest capture wedge (compound x geography) and the biggest blocker. When several compounds are supplied, RANK them in the recommendations.
5. portfolioRisks must surface real risks and 2–4 explicit KILL CRITERIA that would make this a pass — not generic risks.
6. Use ACTUAL competitor/partner names, LoE/SPC dates and filer counts from the evidence — never invented figures. Distinguish fact from estimate IN THE PROSE; never print a bracket tag of any kind.
7. Set dataConfidence by evidence quality and the confidence tiering (US/EU high; China medium; deal/pricing/sales low) — never by a count of sources.
8. Write as a finished CartaOS client report — flowing, natural, decisive prose, attributed to CartaOS where natural. Lead with the answer.
9. For EVERY region, populate businessCase — synthesise ALL six vectors into a clear, rational value proposition and state EXACTLY where (and how) a profitable business case can be made, or why it cannot, with the concrete economics (capturable SOM, margin, the investment/erosion it must beat) and a per-region Pursue / Watch / Pass call. This is the so-what a BD principal acts on; make it specific, not generic.

This is a CartaOS in-license / originate / pass decision. Be rigorous, honest and client-ready.`;

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

    // Ground the assessment in the live evidence base for EACH compound the user
    // searched (capped to keep the run bounded).
    const compounds = parseCompounds(intake.assetName);
    let evidenceBase = "";
    try {
      const perCompound = await Promise.all(
        compounds.slice(0, 3).map(async (c) => {
          const base = c.split("(")[0].trim();
          const data = await aggregateGlobalData(base, intake.therapeuticArea, {
            includeNews: true,
            includePatents: true,
          });
          return `### Evidence — ${c}\n${summarizeGlobalData(data)}`;
        }),
      );
      evidenceBase = perCompound.filter(Boolean).join("\n\n");
    } catch {
      // Proceed on the diagnostic outputs alone if the aggregate pull fails.
    }

    write({ agent: agentId, type: "status", status: "analyzing", message: `Assessing the off-patent opportunity for ${compounds.length > 1 ? `${compounds.length} compounds` : "the compound"} across all target markets...` });

    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 12000,
      system: withGrounding(STRATEGY_PROMPT),
      messages: [{
        role: "user",
        content: `## Compound(s) to assess
${compounds.map((c, i) => `${i + 1}. ${c}`).join("\n") || intake.assetName}
Therapeutic area / ATC: ${intake.therapeuticArea || "auto-detect from the evidence"}
Status: ${intake.developmentStage || "auto-detect (off-patent / loss of exclusivity)"}
Target geographies: ${intake.geographies.join(", ")}  (assess the EU as Germany, France, Italy and Spain individually)
${intake.context ? "BD context / angle: " + intake.context : ""}

## Prior Diagnostic Agent Outputs
${agentContext || "None available."}

## Live Evidence Base
${evidenceBase || "Evidence base unavailable — rely on the diagnostic outputs and clearly-worded estimates."}

---

Produce the CartaOS off-patent market opportunity assessment now: classify each compound, size the post-LoE addressable pool, assess competitive intensity and where margin sits, name partners and channels, and recommend an in-license / originate / pass call. Cover the target geographies individually (the EU as Germany, France, Italy, Spain; add India where the corridor applies). If more than one compound is supplied, rank them. Write it as a finished, client-ready CartaOS report in natural prose — never use bracket tags.`,
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
