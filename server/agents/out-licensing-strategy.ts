/**
 * Agent 7: Global Drug Opportunity Assessment
 * Produces a board-level, go/no-go MARKET-OPPORTUNITY assessment for the OWNER
 * of a compound/biologic: per-region scoring across six vectors (regulatory
 * feasibility, IP/exclusivity, market size & epidemiology, market access/HTA,
 * competitive density, manufacturing) with a Commercial Opportunity Score (COS)
 * — grounded in the full live evidence base from the wired data sources.
 *
 * Runs after the core agents (alongside synthesis + execution plan). To keep it
 * fast, the heavy per-region analysis is fanned out across parallel Opus calls
 * (one per region shard) while the cross-market synthesis runs concurrently, then
 * the pieces are merged into a single report.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { HubIntakeForm, OutLicensingReport, AgentResult, RegionalAnalysis } from "@/types/hub";
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
  "archetype": {
    "mode": "Novel patented asset | LoE-timing play | Off-patent reformulation / hybrid | Off-patent commodity supply | Lifecycle management / repositioning | Cash-pay / consumer-health",
    "rationale": "Why the asset classifies here — the evidence (LoE distance, formulation/route, channel) that fixes the value-capture mode.",
    "rubricNote": "How scoring was adapted to the archetype — e.g. 'LoE >10y past: exclusivity/IP dimensions down-weighted; reformulation, channel and galenic/supply dimensions up-weighted.'"
  },
  "opportunityFraming": {
    "narrowVerdict": "The answer to the NARROW question — is there an off-patent in-license / origination TRADE? (often the weak one)",
    "broadVerdict": "The answer to the client's ACTUAL broad question — is there ANY real market value / business opportunity (reformulation, cash-pay, supplement, repositioning)?",
    "note": "One line reconciling the two so a flat narrow No-Go is never mistaken for 'no opportunity exists'."
  },
  "verdictConfidence": "High | Medium | Low",
  "whatWouldFlipIt": ["The SPECIFIC evidence that would change the verdict — falsifiable, e.g. 'German cash-pay procaine volume exceeds EUR Xm' or 'a 505(b)(2)/Article 10(3) route clears reference pricing'"],
  "consideredAndRejected": [
    { "opportunity": "A credible angle you steelmanned (e.g. 'DACH cash-pay procaine via IGeL/Neuraltherapie')", "reason": "Why it was ultimately excluded — concrete, not dismissive" }
  ],
  "executiveSummary": "2-3 flowing paragraphs in a CartaOS partner's voice: the off-patent opportunity, the lead compound x geography, the value-capture logic, and the decisive risks. Answer the BROAD question, not only the narrow trade.",
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
      {"label": "EU LoE / SPC expiry", "value": "2027", "source": "EPO INPADOC / patent register", "tier": "Tier 1", "basis": "evidence"},
      {"label": "Originator EU revenue", "value": "~EUR 1.2B", "source": "originator annual report", "tier": "Tier 2", "basis": "evidence"}
    ]
  },
  "regionalAnalysis": [
    {
      "region": "US",
      "regionLabel": "United States",
      "attractiveness": "Very High|High|Medium|Low",
      "attractivenessScore": 82,
      "cos": { "marketSize": 80, "regulatory": 78, "ip": 72, "marketAccess": 70, "competition": 55 },
      "market": { "sizeUSD": "post-LoE pool with the CHANNEL it measures stated (e.g. '$X retail Part D' vs '$Y hospital Part B / tender') — the figure must match the recommended go-to-market", "growthRate": "erosion curve assumed", "drivers": ["demand, tender, unmet supply"], "barriers": ["price/volume erosion, oversupply"], "unmetNeed": "TAM -> SAM -> SOM on CONSISTENT channel definitions" },
      "legal": { "regulatoryAuthority": "FDA", "pathway": "ANDA / 505(b)(2) / biosimilar (BPCIA)", "estimatedTimeline": "time-to-launch", "exclusivityOpportunities": ["window opens YYYY — LoE/SPC/data-exclusivity basis"], "barriers": ["paragraph IV / SPC litigation, comparability"] },
      "commercial": { "competitorActivity": "filer count & competitive intensity (ANDA / EU MA / biosimilar applicants)", "pricingDynamics": "erosion + tender/payer dynamics", "reimbursementLandscape": "channel access & tender mechanics", "keyPartnerCandidates": ["named API/CDMO/MAH/EU-buyer/supply-side partners"], "distributionChannels": "retail / hospital-tender / specialty" },
      "ip": { "patentStrength": "Strong|Moderate|Weak", "ftoStatus": "Clear|Some Risk|Significant Risk", "expirationRisks": ["secondary patents, SPC, formulation patents"], "opportunities": ["505(b)(2) / device / interchangeability angle"], "estimatedExclusivityYears": 8 },
      "manufacturing": { "complexity": "Low|Moderate|High", "notes": "API source & concentration risk, CDMO capability, comparability burden" },
      "provenanceFlags": ["Sanity-check flags for THIS market — contradictions surfaced not smoothed: a Tier-3 first-approval date conflicting with documented clinical history, an originator/holder conflict across sources, a channel mischaracterisation, or a regulatory-mechanism mismatch. Empty array if none."],
      "marketWorthiness": {
        "rating": "Highly Worthy | Worthy | Marginal | Not Worthy",
        "score": 76,
        "thesis": "One line: is THIS market commercially worth entering, and the single reason why.",
        "healthcareLandscape": "The CURRENT healthcare landscape that shapes uptake — the health-system / payer model (single-payer, statutory sickness funds, private+public mix, out-of-pocket), funding & budget pressure, infrastructure and prescriber/channel behaviour, and the demand backdrop. Ground it in the region's real system (e.g. Germany GKV/AMNOG, France Assurance Maladie/HAS, US commercial+Medicare/Medicaid+PBMs, Japan NHI, China NRDL/VBP, India largely out-of-pocket/trade).",
        "legalLandscape": "The CURRENT legal & regulatory commercial landscape relevant to ENTRY — market-shaping law beyond the approval pathway: pricing & procurement rules, tender/substitution law, IP-enforcement climate, data/market-exclusivity regime, and any litigation/policy shifts now in play.",
        "marketSizeVsCompetitors": "The addressable market size set explicitly AGAINST the competitive field — the pool vs the number/strength of incumbents and filers, so worthiness is size-per-competitor, not gross size.",
        "partnershipRoom": "Whether there is ROOM to establish partnerships here — is the partner field open or saturated, who the credible counterparties are (named MAH / distributor / CDMO / specialty-pharma / local champion), and how reachable they are.",
        "distributionChannels": "Which distribution channels are actually OPEN and reachable here (retail / hospital & tender / specialty / mail-order / trade / wholesale), and what it takes to access them.",
        "novelPaths": ["2-4 NOVEL or unconventional routes to capture this market — e.g. 505(b)(2) reformulation, device/interchangeability angle, tender-consortium entry, direct-to-payer, branded-generic in trade markets, authorised-generic, digital/telehealth channel"]
      },
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
  "commercialPlan": {
    "summary": "2-3 sentences: the business case in brief — the opportunity, the route to market that captures it, and the money.",
    "channels": [
      { "channel": "Hospital & tender | Retail pharmacy | Specialty pharmacy | Mail-order | Trade / branded generics | Wholesale distribution", "geographies": ["DE","FR","US"], "valueRole": "where the value sits in this channel and why it matters for THIS asset", "accessMechanics": "exactly how you win it — tender cycles, formulary/PBM, payer behaviour, AMNOG/HAS, NRDL/VBP, Japan NHI, India trade dynamics, grounded in the evidence", "keyPlayers": ["named wholesalers / tender consortia / PBMs / distributors where known"] }
    ],
    "howToProceed": [
      { "step": 1, "action": "the concrete move", "geography": "lead geo", "approach": "In-license | Originate | Co-develop | Build | Partner | Tender", "timing": "when, relative to the exclusivity window", "owner": "who runs it" }
    ]
  },
  "marketWorthinessSummary": "1-2 sentences: which geographies are commercially WORTH entering and why — purely on market grounds (legal + healthcare landscape, partnership room, channels, size-vs-competition, novel paths), naming the worthiest market(s) and the least worthy.",
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
10. For EVERY region, populate marketWorthiness — a PURELY commercial / market-facing read on whether the geography is worth entering, judged against its CURRENT legal AND healthcare landscape. This is distinct from businessCase (the investment thesis): here you (a) describe the live healthcare landscape (health-system / payer model, funding pressure, infrastructure, demand) and the live legal/commercial landscape (pricing & procurement law, tender/substitution rules, IP-enforcement climate, exclusivity regime); (b) judge whether there is ROOM to establish partnerships and name credible counterparties; (c) state which distribution channels are open and reachable; (d) size the market AGAINST the competitive field (worthiness = size-per-competitor, not gross size); and (e) surface 2-4 NOVEL paths to capture it. Set rating + a 0–100 score consistently. Then write marketWorthinessSummary naming the worthiest and least-worthy markets. Ground every landscape, partner, channel and sizing claim in the evidence base and the named real systems (AMNOG/HAS/AIFA/AEMPS, US PBM+Medicare/Medicaid, Japan NHI, China NRDL/VBP, India trade) — never generic.
11. Populate commercialPlan — the consolidated business case. Cover EVERY relevant commercial channel (retail pharmacy, hospital & tender, specialty, mail-order, trade / branded generics, wholesale distribution, AND the cash-pay / self-pay, supplement, hybrid/reformulation and compounding channels per the channel-completeness map) across the target geographies, stating where the value sits, the exact access mechanics (tender cycles, PBM/formulary, Festbeträge §35 + Rabattverträge §130a for off-patent DE, HAS, NRDL/VBP, Japan NHI, India trade) and named players where known. Then give a clear, sequenced "how to proceed" plan: step → action → geography → build/partner/in-license → timing vs the window → owner. Ground every channel, pricing and access claim in the evidence base — never generic.
12. ARCHETYPE FIRST (Priority 1). Classify the asset into the value-capture archetype BEFORE scoring and populate archetype. When LoE is more than ~10 years past, DOWN-WEIGHT exclusivity/IP dimensions and UP-WEIGHT reformulation, channel and galenic/supply dimensions — do not measure an empty dimension and then declare the opportunity dead. Map the verdict to the archetype.
13. ANSWER THE BROAD QUESTION (Priority 1 / framing). Populate opportunityFraming: never collapse the client's broad "is there ANY value here?" into the narrow "is there an off-patent in-license trade?". A long-off-patent portfolio is typically No-Go as an in-license but Conditional as a reformulation / cash-channel play — say that, don't emit a flat No-Go implying no opportunity exists.
14. PROVENANCE & SANITY (Priority 2). Tier load-bearing keyDataPoints (Tier 1/2/3) and mark basis evidence vs inference. Treat ChEMBL / Orange-Book "first approval" dates for legacy molecules as Tier 3 — never as fact (procaine/Novocain ~1905 not 1948; B12 clinical early-1950s not 1982). Cross-check approval history / originator / mechanism and surface contradictions in provenanceFlags rather than smoothing them. Mark prior-based inference explicitly in the prose; never launder reasoning-from-absence into sourced-sounding findings.
15. NO CATEGORY ERRORS (Priority 3). Type every regulatory/access mechanism correctly per drug class from the per-jurisdiction reference — for OFF-PATENT generics use Festbeträge §35 + Rabattverträge §130a (NOT AMNOG §35a, which governs new patented actives), 505(b)(2)/Article 10(3) for hybrids, NRDL+VBP for China. Actively check the cash-pay/IGeL, supplement, hybrid and compounding channels for every geography.
16. NUMBER-TO-THESIS (Priority 4). Every market-size figure states the channel it measures, and that channel must match the recommended go-to-market — never anchor a hospital-injectable thesis on a retail Part D figure. Keep TAM → SAM → SOM on consistent channels.
17. CALIBRATE + STEELMAN (Priorities 5 & 6). Set verdictConfidence honestly and list whatWouldFlipIt (specific, falsifiable). Populate consideredAndRejected — the strongest opportunity you steelmanned and why you excluded it. Where country sections are the same template reasoned from priors, say so once rather than implying independent assessments.

This is a CartaOS in-license / originate / pass decision. Be rigorous, honest, calibrated and client-ready — it must withstand inspection by the most experienced pharma BD executive.`;

// To keep the headline assessment fast, the per-region analysis is generated in
// parallel shards while the cross-market synthesis runs concurrently. These two
// directives partition the shared prompt above into the two call types.
const REGION_DIRECTIVE = `

OUTPUT MODE — REGIONAL ANALYSIS ONLY.
For THIS call you assess ONLY the geographies named in the user message. Return ONLY valid JSON of the form:
{ "regionalAnalysis": [ /* one entry per named geography, in the SAME order */ ] }
Each entry must be FULLY populated exactly as specified above — all six vectors, the cos sub-scores, manufacturing, provenanceFlags, marketWorthiness AND businessCase — using the exact region codes and labels given. Do NOT output verdict, opportunityThesis, archetype, opportunityFraming, verdictConfidence, whatWouldFlipIt, consideredAndRejected, executiveSummary, assetProfile, recommendations, portfolioRisks, commercialPlan, marketWorthinessSummary, dataConfidence or sourcesUsed in this call — those are produced separately. Apply every CRITICAL RULE that concerns a region: individual national markets; cos consistency; post-LoE pool arithmetic; REAL legacy dates (never a Tier-3 ChEMBL/Orange-Book "first approval" date presented as fact); CORRECT regulatory mechanisms per the per-jurisdiction reference (off-patent DE = Festbeträge §35 + Rabattverträge §130a, NOT AMNOG); the full channel-completeness check INCLUDING cash-pay/IGeL, supplement, hybrid (505(b)(2)/Article 10(3)) and compounding; market.sizeUSD stating its channel and matching the GTM; surfacing contradictions in provenanceFlags; and a populated businessCase AND marketWorthiness for every region.`;

const WRAPPER_DIRECTIVE = `

OUTPUT MODE — SYNTHESIS ONLY (the per-region analysis is produced separately and merged in).
Return ONLY valid JSON with EXACTLY these top-level keys: "verdict", "opportunityThesis", "archetype", "opportunityFraming", "verdictConfidence", "whatWouldFlipIt", "consideredAndRejected", "executiveSummary", "assetProfile", "recommendations", "portfolioRisks", "commercialPlan", "marketWorthinessSummary", "dataConfidence", "sourcesUsed". DO NOT output a "regionalAnalysis" key at all. Your recommendations, risks, commercialPlan and summaries must span the FULL geography set named in the user message (refer to those markets by name). Apply every CRITICAL RULE that concerns the cross-market synthesis: classify the ARCHETYPE first and adapt the rubric (down-weight exclusivity when LoE >10y past); answer the BROAD question in opportunityFraming, not only the narrow trade; tier load-bearing keyDataPoints (Tier 1/2/3, basis evidence vs inference — legacy "first approval" dates are Tier 3); set verdictConfidence and list specific falsifiers in whatWouldFlipIt; populate consideredAndRejected (steelman); rank compounds; state kill criteria; correct regulatory mechanisms (no AMNOG on generics); real names/dates; McKinsey voice; no bracket tags.`;

// Deterministic expansion of the intake geographies into the individual national
// markets the assessment covers (EU → DE/FR/IT/ES; India corridor always added).
const REGION_EXPANSION: Record<string, { code: string; label: string }[]> = {
  US: [{ code: "US", label: "United States" }],
  EU: [
    { code: "DE", label: "Germany" },
    { code: "FR", label: "France" },
    { code: "IT", label: "Italy" },
    { code: "ES", label: "Spain" },
  ],
  JP: [{ code: "JP", label: "Japan" }],
  CN: [{ code: "CN", label: "China" }],
  ROW: [{ code: "ROW", label: "Rest of World" }],
};

function expandRegions(geos: string[]): { code: string; label: string }[] {
  const out: { code: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const g of geos) {
    for (const r of REGION_EXPANSION[g] ?? []) {
      if (!seen.has(r.code)) { seen.add(r.code); out.push(r); }
    }
  }
  // India is the in-license / origination corridor for the off-patent thesis.
  if (!seen.has("IN")) out.push({ code: "IN", label: "India" });
  if (out.length === 0) out.push({ code: "US", label: "United States" });
  return out;
}

// Round-robin split so shards stay balanced (and each call stays small & fast).
function shardRegions<T>(arr: T[], maxPerShard = 4): T[][] {
  const shardCount = Math.max(1, Math.ceil(arr.length / maxPerShard));
  const shards: T[][] = Array.from({ length: shardCount }, () => []);
  arr.forEach((item, i) => shards[i % shardCount].push(item));
  return shards;
}

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

    // Deterministic market set, sharded so the heavy per-region generation runs
    // in parallel instead of one long serial completion.
    const regions = expandRegions(intake.geographies);
    const regionList = regions.map(r => `${r.code} (${r.label})`).join(", ");
    const shards = shardRegions(regions, 4);

    write({ agent: agentId, type: "status", status: "analyzing", message: `Assessing ${regions.length} markets in parallel for ${compounds.length > 1 ? `${compounds.length} compounds` : "the compound"}...` });

    const compoundBlock = `## Compound(s) to assess
${compounds.map((c, i) => `${i + 1}. ${c}`).join("\n") || intake.assetName}
Therapeutic area / ATC: ${intake.therapeuticArea || "auto-detect from the evidence"}
Status: ${intake.developmentStage || "auto-detect (off-patent / loss of exclusivity)"}
${intake.context ? "BD context / angle: " + intake.context : ""}`;

    const evidenceBlock = evidenceBase || "Evidence base unavailable — rely on the diagnostic outputs and clearly-worded estimates.";

    // One Opus call per region shard — each returns only its regionalAnalysis
    // entries. Failures degrade to an empty shard rather than killing the run.
    const regionCalls = shards.map(shard =>
      anthropic.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 9000,
        system: withGrounding(STRATEGY_PROMPT + REGION_DIRECTIVE),
        messages: [{
          role: "user",
          content: `${compoundBlock}

## Geographies to assess in THIS call (assess ONLY these, in this exact order)
${shard.map(r => `- ${r.code} — ${r.label}`).join("\n")}

## Live Evidence Base
${evidenceBlock}

---

Return ONLY {"regionalAnalysis":[...]} for the geographies above — one fully-populated entry each (all six vectors, cos sub-scores, manufacturing, marketWorthiness and businessCase). For every market give the market-worthiness read against its current legal and healthcare landscape, partnership room, open distribution channels, market size vs competitors and novel paths. Natural, client-ready prose in every field; never use bracket tags.`,
        }],
      }).then(res => {
        const text = res.content.find(b => b.type === "text")?.text ?? "";
        try {
          return extractJSON<{ regionalAnalysis: RegionalAnalysis[] }>(text).regionalAnalysis ?? [];
        } catch {
          return [] as RegionalAnalysis[];
        }
      }),
    );

    // Cross-market synthesis runs concurrently with the region shards. It keeps
    // the prior diagnostic-agent context so recommendations stay grounded.
    const wrapperCall = anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 9000,
      system: withGrounding(STRATEGY_PROMPT + WRAPPER_DIRECTIVE),
      messages: [{
        role: "user",
        content: `${compoundBlock}
Target geographies (full set, assessed individually): ${regionList}

## Prior Diagnostic Agent Outputs
${agentContext || "None available."}

## Live Evidence Base
${evidenceBlock}

---

Produce the SYNTHESIS ONLY (NO regionalAnalysis key): classify the archetype and adapt the rubric; the verdict mapped to it with verdictConfidence and falsifiable whatWouldFlipIt; opportunityThesis; opportunityFraming answering BOTH the narrow off-patent-trade question and the client's broad "is there any value here?" question; the adversarial consideredAndRejected steelman; executive summary; asset profile with tiered keyDataPoints (evidence vs inference); prioritised recommendations across the full geography set above; kill-criteria portfolioRisks; the consolidated commercialPlan (covering cash-pay/hybrid/supplement/compounding channels with correctly-typed mechanisms — no AMNOG on generics); the marketWorthinessSummary; dataConfidence and sourcesUsed. If more than one compound is supplied, rank them. Write it as a finished, client-ready CartaOS report in natural prose — never use bracket tags.`,
      }],
    }).then(res => {
      const text = res.content.find(b => b.type === "text")?.text ?? "";
      try {
        return extractJSON<Omit<OutLicensingReport, "regionalAnalysis">>(text);
      } catch {
        return null;
      }
    });

    const [wrapper, regionResults] = await Promise.all([wrapperCall, Promise.all(regionCalls)]);
    const regionalAnalysis = regionResults.flat();

    if (!wrapper && regionalAnalysis.length === 0) {
      throw new Error("The opportunity assessment produced no usable content.");
    }

    // Merge the parallel pieces into one report; fall back gracefully if the
    // synthesis call failed but regions succeeded.
    const report: OutLicensingReport = {
      verdict: wrapper?.verdict,
      opportunityThesis: wrapper?.opportunityThesis,
      archetype: wrapper?.archetype,
      opportunityFraming: wrapper?.opportunityFraming,
      verdictConfidence: wrapper?.verdictConfidence,
      whatWouldFlipIt: wrapper?.whatWouldFlipIt,
      consideredAndRejected: wrapper?.consideredAndRejected,
      executiveSummary: wrapper?.executiveSummary ?? "",
      assetProfile: wrapper?.assetProfile ?? {
        name: compounds.join(", ") || intake.assetName,
        description: "",
        modality: "",
        therapeuticArea: intake.therapeuticArea || "",
        developmentStage: intake.developmentStage || "",
        mechanism: "",
        currentMarkets: [],
        keyStrengths: [],
        keyChallenges: [],
        keyDataPoints: [],
      },
      regionalAnalysis,
      recommendations: wrapper?.recommendations ?? [],
      portfolioRisks: wrapper?.portfolioRisks ?? [],
      commercialPlan: wrapper?.commercialPlan,
      marketWorthinessSummary: wrapper?.marketWorthinessSummary,
      dataConfidence: wrapper?.dataConfidence ?? "Low",
      sourcesUsed: wrapper?.sourcesUsed ?? [],
    };

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
