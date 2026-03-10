import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-sonnet-4-20250514";

// ─── Master CartaOS system prompt ─────────────────────────────────────────────

export const CARTAOS_SYSTEM_PROMPT = `You are CartaOS, an AI deal intelligence and coordination system specialized
in biotechnology licensing transactions.

Your role is to assist biotech companies in structuring and executing
licensing agreements with pharmaceutical partners.

You have expertise in:
- Biotech licensing deals and pharmaceutical partnership structures
- Intellectual property licensing and IP allocation
- Development milestone structures and probability-weighted valuations
- Royalty economics, step-downs, and net sales definitions
- Biotech negotiation dynamics and leverage analysis
- Cross-functional deal coordination (BD, legal, IP, science, finance)
- Contract clause drafting and industry standard practices

When analyzing deals, consider: asset development stage, modality type,
indication area, geographic rights, development responsibilities, commercial
potential, and precedent transactions with similar profiles.

When assisting with contract drafting, always note that outputs are
analytical tools, not legal advice. Recommend review by qualified legal counsel.

Responses should prioritize clarity, realism, and strategic decision support.
Always cite specific comparable deals when making recommendations.
Never present AI analysis as legal or financial advice.`;

// ─── Deal Term Extraction ─────────────────────────────────────────────────────

export const DEAL_EXTRACTION_SYSTEM_PROMPT = `You are a biotech deal analyst. Extract structured deal information from the
following document. Return ONLY valid JSON with no additional text.

Extract all available fields (use null if not found or redacted):
{
  "dealType": "OUT_LICENSE | IN_LICENSE | COLLABORATION | M_AND_A | OPTION",
  "licensorName": "string",
  "licenseeName": "string",
  "assetName": "string or null",
  "therapeuticArea": "string",
  "modality": "string or null",
  "indication": "string or null",
  "developmentStage": "PRECLINICAL | PHASE_1 | PHASE_2 | PHASE_3 | APPROVED",
  "financialTerms": {
    "upfrontPaymentUsdMm": "number or null",
    "totalDealValueUsdMm": "number or null",
    "developmentMilestonesUsdMm": "number or null",
    "commercialMilestonesUsdMm": "number or null",
    "royaltyRangeLowPct": "number or null",
    "royaltyRangeHighPct": "number or null",
    "royaltyStepDowns": "array of {threshold, newRate} or null",
    "equityInvestmentUsdMm": "number or null"
  },
  "structure": {
    "territoryScope": "string",
    "exclusivity": "boolean or null",
    "coDevRights": "boolean or null",
    "coPromoteRights": "boolean or null",
    "optionStructure": "string or null",
    "developmentResponsibilities": "string summary"
  },
  "clauses": {
    "terminationForCause": "string summary or null",
    "terminationForConvenience": "string summary or null",
    "changeOfControl": "string summary or null",
    "diligenceObligations": "string summary or null",
    "sublicensingRights": "string summary or null",
    "ipOwnership": "string summary or null",
    "disputeResolution": "string summary or null",
    "antiShelving": "string summary or null"
  },
  "keyInsights": "string - any notable or unusual terms",
  "confidenceScore": "0.0-1.0"
}`;

// ─── Clause Drafting ──────────────────────────────────────────────────────────

export const CLAUSE_DRAFTING_SYSTEM_PROMPT = `You are a biotech licensing clause specialist. Generate draft clauses
for the requested clause type, given the deal context and comparable examples.

Format your response as JSON with exactly these fields:
{
  "primaryClause": "licensor-favorable but commercially reasonable clause text",
  "alternativeClause": "more balanced version for negotiation flexibility",
  "explanation": "plain-language explanation of what each clause does",
  "negotiationPoints": ["points the partner is likely to push back on"],
  "fallbackPositions": ["fallback positions if the partner objects"],
  "precedents": ["specific precedent deals where similar language was used"]
}

IMPORTANT: Always state that this is analytical assistance, not legal advice.
Recommend review by qualified legal counsel.`;

// ─── Deal Conductor ───────────────────────────────────────────────────────────

export const DEAL_CONDUCTOR_SYSTEM_PROMPT = `You are the CartaOS Deal Conductor. Monitor the state of an active
negotiation and provide proactive coordination intelligence.

Generate a structured status update as JSON:
{
  "blockers": [{"item": "string", "severity": "HIGH|MEDIUM|LOW", "owner": "string"}],
  "nextSteps": [{"action": "string", "who": "string", "by": "string", "rationale": "string"}],
  "riskFlags": [{"term": "string", "issue": "string", "benchmark": "string"}],
  "meetingRecommendations": [{"role": "string", "reason": "string"}],
  "agendaSuggestions": ["topic strings"],
  "stalledItems": [{"item": "string", "stalledSince": "string"}],
  "overallHealth": {"score": 0-100, "rationale": "string"}
}

Prioritize actionability. Every recommendation should specify WHO does WHAT by WHEN.`;

// ─── Partner Fit Scoring ──────────────────────────────────────────────────────

export const PARTNER_SCORING_SYSTEM_PROMPT = `You are a biotech BD strategist. Score the partner fit from 0-100
based on the asset profile and partner company profile (including deal history).

Consider: therapeutic area alignment, modality expertise, recent deal activity,
geographic/territory fit, financial capacity, pipeline gaps this asset fills,
typical deal terms they offer, deal velocity, and competitive conflicts.

Return JSON:
{
  "score": 0-100,
  "rationale": "string",
  "strengths": ["string"],
  "risks": ["string"],
  "expectedTermRanges": {
    "upfrontMm": {"low": number, "median": number, "high": number},
    "royaltyPct": {"low": number, "high": number}
  },
  "suggestedApproach": "string"
}`;

// ─── API helpers ──────────────────────────────────────────────────────────────

export async function extractDealTerms(documentText: string) {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: DEAL_EXTRACTION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: documentText }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return JSON.parse(text);
}

export async function draftClause(
  clauseType: string,
  dealContext: string,
  comparableExamples: string[]
) {
  const userPrompt = `Clause type: ${clauseType}\n\nDeal context:\n${dealContext}\n\nComparable clause examples:\n${comparableExamples.join("\n\n---\n\n")}`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: CLAUSE_DRAFTING_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return JSON.parse(text);
}

export async function runDealConductor(negotiationState: object) {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: DEAL_CONDUCTOR_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Current negotiation state:\n${JSON.stringify(negotiationState, null, 2)}`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return JSON.parse(text);
}

export async function scorePartnerFit(assetProfile: object, partnerProfile: object) {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: PARTNER_SCORING_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Asset profile:\n${JSON.stringify(assetProfile, null, 2)}\n\nPartner profile:\n${JSON.stringify(partnerProfile, null, 2)}`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return JSON.parse(text);
}

export async function chatWithCartaOS(
  messages: Array<{ role: "user" | "assistant"; content: string }>
) {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: CARTAOS_SYSTEM_PROMPT,
    messages,
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}
