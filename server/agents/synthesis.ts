/**
 * Agent 5: Synthesis — runs AFTER the 4 main agents complete.
 * Generates: contract draft, due diligence questions, data package, smart intelligence.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { HubIntakeForm, AgentResult } from "@/types/hub";
import type { AgentWriter } from "./index";
import { extractJSON, cleanError } from "./utils";

export interface SynthesisOutput {
  contract: string;           // Full contract draft in markdown
  dueDiligence: DDSection[];  // Due diligence questions grouped by category
  dataPackage: DataPackageItem[]; // Data room checklist
  intelligence: IntelSection[];   // Smart intelligence summary from all 4 agents
}

export interface DDSection {
  category: string;
  questions: { question: string; priority: "Critical" | "High" | "Medium"; rationale: string }[];
}

export interface DataPackageItem {
  category: string;
  items: { document: string; status: "Required" | "Recommended" | "Optional"; notes: string }[];
}

export interface IntelSection {
  title: string;
  insight: string;
  confidence: "High" | "Medium" | "Low";
  action: string;
  sources: string[];
}

const SYNTHESIS_PROMPT = `You are a senior pharmaceutical deal advisor synthesizing intelligence from four specialized agents that have already analyzed a biotech licensing opportunity. Using their outputs, generate a comprehensive deal package.

Return ONLY valid JSON with this structure:
{
  "contract": "# LICENSE AGREEMENT\\n\\nThis License Agreement (\\"Agreement\\")...",
  "dueDiligence": [
    {
      "category": "Scientific & Clinical",
      "questions": [
        { "question": "...", "priority": "Critical", "rationale": "..." }
      ]
    }
  ],
  "dataPackage": [
    {
      "category": "Corporate & Legal",
      "items": [
        { "document": "Certificate of Incorporation", "status": "Required", "notes": "..." }
      ]
    }
  ],
  "intelligence": [
    {
      "title": "Key Finding Title",
      "insight": "Detailed insight paragraph...",
      "confidence": "High",
      "action": "Recommended next step",
      "sources": ["Agent: Benchmarking", "SEC EDGAR filing"]
    }
  ]
}

CONTRACT rules:
- Draft a complete, professional licensing agreement (not a term sheet — a full contract)
- Include standard biopharma sections: Definitions, License Grant, Development Plan, Milestones, Payments, Royalties, IP, Confidentiality, Reps & Warranties, Indemnification, Term & Termination, Governing Law
- Use specific dollar amounts from benchmarking data and term sheet clauses
- Mark placeholders with [PARTY A] and [PARTY B]
- Follow best practices from comparable deal precedents
- Include geography-specific provisions where relevant

DUE DILIGENCE rules:
- 6-8 categories: Scientific/Clinical, Regulatory, IP/Patent, Commercial, Financial, Legal, Manufacturing, Organizational
- 3-6 questions per category, prioritized Critical/High/Medium
- Each question should be specific and actionable, not generic
- Rationale should reference specific findings from the agent analysis

DATA PACKAGE rules:
- Organize as a virtual data room checklist
- Categories: Corporate/Legal, Scientific/Clinical, Regulatory, IP, Financial, Commercial, Manufacturing
- 4-8 items per category
- Status indicates how essential the document is for the deal

INTELLIGENCE rules:
- 8-12 key insights synthesized across all agent outputs
- Each insight should connect findings from multiple agents
- Confidence reflects how well-supported the insight is by data
- Action should be a concrete next step
- Sources should cite which agent(s) and data contributed`;

export async function runSynthesisAgent(
  intake: HubIntakeForm,
  agentResults: AgentResult[],
  write: AgentWriter,
): Promise<SynthesisOutput | null> {
  const agentId = "synthesis" as const;

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured.");
    }
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    write({ agent: agentId, type: "status", status: "scraping", message: "Collecting outputs from all agents..." });

    // Serialize agent results for Claude
    const resultsContext = agentResults.map(r => {
      if (r.agentId === "benchmarking") {
        return `## Benchmarking Agent Results\n${r.comparables.map(c =>
          `- ${c.dealName}: ${c.parties.join(" / ")} (${c.date}) — Upfront: ${c.upfront}, Total: ${c.totalValue}, Royalties: ${c.royaltyRange} | ${c.stage}, ${c.indication} | Source: ${c.source}`
        ).join("\n")}`;
      }
      if (r.agentId === "partner") {
        return `## Partner Agent Results\n${r.partners.map(p =>
          `- ${p.company} (Score: ${p.fitScore}/100): ${p.rationale} | Gap: ${p.pipelineGapLevel}, Propensity: ${p.dealPropensity}, Geo: ${p.geoStrength.join(", ")}`
        ).join("\n")}`;
      }
      if (r.agentId === "negotiation") {
        return `## Negotiation Agent Results\n${r.leveragePoints.map(l =>
          `- ${l.term}: Market ${l.marketRange} | Recommend: ${l.recommendedPosition} | Leverage: ${l.leverageLevel} | Precedent: ${l.precedentSource}`
        ).join("\n")}`;
      }
      if (r.agentId === "termsheet") {
        return `## Term Sheet Agent Results\nClauses: ${r.clauses.map(c =>
          `- ${c.clause}: ${c.proposedTerm} (${c.flag}) | Benchmark: ${c.marketBenchmark}`
        ).join("\n")}\n\nFull Term Sheet:\n${r.termSheet}`;
      }
      return "";
    }).join("\n\n");

    write({ agent: agentId, type: "status", status: "analyzing", message: "Generating contract, due diligence, data package & intelligence..." });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16384,
      system: SYNTHESIS_PROMPT,
      messages: [{
        role: "user",
        content: `## Asset Profile
Asset: ${intake.assetName}
Therapeutic Area: ${intake.therapeuticArea}
Stage: ${intake.developmentStage}
Deal Direction: ${intake.dealDirection}
Target Geographies: ${intake.geographies.join(", ")}
Context: ${intake.context || "None"}

## Agent Intelligence Outputs
${resultsContext || "No agent results available — generate based on best practices for this asset profile."}

Generate the complete deal package: contract, due diligence questions, data room checklist, and synthesized intelligence.`,
      }],
    });

    const text = response.content.find(b => b.type === "text")?.text ?? "";
    const output = extractJSON<SynthesisOutput>(text);

    write({ agent: agentId, type: "result", data: { agentId: "synthesis", ...output } });
    write({ agent: agentId, type: "status", status: "complete", message: "Deal package generated" });

    return output;
  } catch (err) {
    const msg = cleanError(err);
    write({ agent: agentId, type: "error", error: msg });
    write({ agent: agentId, type: "status", status: "error", message: msg });
    return null;
  }
}
