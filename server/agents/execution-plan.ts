/**
 * Agent 6: Execution Plan
 * Combines Pillar 1 (Diagnosis) + Pillar 2 (Strategy) outputs to generate a
 * concrete outcome execution plan with timeline, stakeholders, deliverables,
 * and dependencies.
 *
 * Runs AFTER the 4 core agents complete (parallel with synthesis).
 */

import Anthropic from "@anthropic-ai/sdk";
import type { HubIntakeForm, AgentResult, ExecutionPlanOutput } from "@/types/hub";
import type { AgentWriter } from "./index";
import { extractJSON, cleanError } from "./utils";

const EXECUTION_PLAN_PROMPT = `You are a senior pharmaceutical deal execution strategist. You receive outputs from four AI agents that have completed Pillar 1 (Diagnosis: market & comparable deals) and Pillar 2 (Strategy: partners & commercial maximization). Your job is to synthesize these into a concrete, executable plan.

Return ONLY valid JSON with this exact structure:
{
  "overview": "2-3 sentence executive summary of the recommended execution path.",
  "totalDurationWeeks": 36,
  "phases": [
    {
      "id": "p1",
      "name": "Pre-Outreach Preparation",
      "pillar": "Diagnosis",
      "description": "What happens in this phase",
      "startWeek": 0,
      "endWeek": 3,
      "owner": "BD Lead",
      "contributors": ["Legal Counsel", "Clinical Lead"],
      "deliverables": ["Executive summary", "Non-confidential teaser", "Data room prep"],
      "dependsOn": [],
      "successCriteria": "Materials approved by exec committee"
    }
  ],
  "stakeholders": [
    {
      "role": "BD Lead",
      "involvement": "Lead",
      "internalOrExternal": "Internal",
      "responsibilities": ["Drive overall deal process", "Manage partner relationship"],
      "phaseIds": ["p1", "p2", "p3"]
    }
  ],
  "criticalMilestones": [
    {
      "week": 4,
      "milestone": "Partner shortlist finalized",
      "owner": "BD Lead",
      "deliverable": "Top 5 partners with fit scores"
    }
  ],
  "risks": [
    {
      "risk": "Competing offers from larger pharmas",
      "impact": "High",
      "likelihood": "Medium",
      "mitigation": "Run parallel outreach to create competitive tension",
      "owner": "BD Lead"
    }
  ],
  "connections": [
    {
      "from": "p1",
      "to": "p2",
      "type": "Sequential",
      "description": "Outreach materials must be ready before partner contact"
    }
  ]
}

PHASES rules:
- 6-9 phases covering full deal lifecycle
- Each phase tagged with which pillar drove it (Diagnosis/Strategy/Execution)
- Realistic startWeek/endWeek values from 0 to totalDurationWeeks
- Phases should overlap where parallel work makes sense
- Owner must be a role that exists in the stakeholders array
- Contributors = supporting roles
- Deliverables = concrete outputs (3-5 per phase)
- DependsOn = phase IDs that must finish first
- Success criteria = measurable completion

STAKEHOLDERS rules:
- 6-10 distinct roles (Internal: BD, Legal, Clinical, Regulatory, Finance, Commercial, Manufacturing, Exec Sponsor)
- (External: Outside Counsel, Strategy Advisor, Diligence Provider, Investment Banker, Partner BD)
- Involvement: Lead (drives), Contributor (executes), Reviewer (gives input), Approver (signs off)
- Responsibilities = 2-4 specific actions
- phaseIds = which phases they're involved in

CRITICAL MILESTONES rules:
- 5-8 key milestones across the timeline
- Tied to specific weeks
- Each has a clear deliverable

RISKS rules:
- 5-7 deal-specific risks (not generic)
- Reference findings from the actual agent outputs (e.g., competitive landscape from Pillar 1, partner gaps from Pillar 2)
- Concrete mitigation actions

CONNECTIONS rules:
- Show how phases relate (Sequential/Parallel/Triggers/Blocks)
- Explain WHY the dependency exists

Use the actual deal context from the agent outputs — reference specific partners, deal precedents, leverage points, and term ranges from the data provided.`;

export async function runExecutionPlanAgent(
  intake: HubIntakeForm,
  agentResults: AgentResult[],
  write: AgentWriter,
): Promise<ExecutionPlanOutput | null> {
  const agentId = "executionPlan" as const;

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured.");
    }
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    write({ agent: agentId, type: "status", status: "scraping", message: "Combining diagnosis + strategy outputs..." });

    // Serialize the diagnosis (benchmarking) and strategy (partner + negotiation + termsheet) results
    const resultsContext = agentResults.map(r => {
      if (r.agentId === "benchmarking") {
        return `## PILLAR 1 — Diagnosis: Comparable Deals (${r.comparables.length})\n${r.comparables.slice(0, 8).map(c =>
          `- ${c.dealName}: ${c.parties.join(" / ")} (${c.date}) — Upfront ${c.upfront}, Total ${c.totalValue}, Royalties ${c.royaltyRange} | ${c.stage}, ${c.indication}`
        ).join("\n")}`;
      }
      if (r.agentId === "partner") {
        return `## PILLAR 2a — Strategy: Top Partners (${r.partners.length})\n${r.partners.slice(0, 6).map(p =>
          `- ${p.company} [Fit: ${p.fitScore}/100, Propensity: ${p.dealPropensity}] — ${p.rationale} | Geo: ${p.geoStrength.join(", ")}`
        ).join("\n")}`;
      }
      if (r.agentId === "negotiation") {
        return `## PILLAR 2b — Strategy: Leverage Points (${r.leveragePoints.length})\n${r.leveragePoints.slice(0, 6).map(l =>
          `- ${l.term}: Market ${l.marketRange} → Recommend ${l.recommendedPosition} | Leverage: ${l.leverageLevel}`
        ).join("\n")}`;
      }
      if (r.agentId === "termsheet") {
        return `## PILLAR 2c — Strategy: Term Sheet Clauses (${r.clauses.length})\n${r.clauses.slice(0, 6).map(c =>
          `- ${c.clause}: ${c.proposedTerm} (${c.flag})`
        ).join("\n")}`;
      }
      return "";
    }).filter(Boolean).join("\n\n");

    write({ agent: agentId, type: "status", status: "analyzing", message: "Building execution plan with timeline, stakeholders & dependencies..." });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: EXECUTION_PLAN_PROMPT,
      messages: [{
        role: "user",
        content: `## Deal Context
Asset: ${intake.assetName}
Therapeutic Area: ${intake.therapeuticArea}
Stage: ${intake.developmentStage}
Deal Direction: ${intake.dealDirection}
Geographies: ${intake.geographies.join(", ")}
Strategic Context: ${intake.context || "None provided"}

## Pillar 1 & Pillar 2 Outputs (from completed AI agents)

${resultsContext || "No agent results — generate based on best practices for this deal profile."}

Generate a comprehensive execution plan that synthesizes the diagnosis + strategy findings into a concrete outcome roadmap with timeline, stakeholders, deliverables, dependencies, milestones, and risks.`,
      }],
    });

    const text = response.content.find(b => b.type === "text")?.text ?? "";
    const plan = extractJSON<ExecutionPlanOutput>(text);

    write({ agent: agentId, type: "result", data: { agentId: "executionPlan", plan } });
    write({ agent: agentId, type: "status", status: "complete", message: `Plan: ${plan.phases?.length || 0} phases, ${plan.stakeholders?.length || 0} stakeholders, ${plan.totalDurationWeeks || 0} weeks` });

    return plan;
  } catch (err) {
    const msg = cleanError(err);
    write({ agent: agentId, type: "error", error: msg });
    write({ agent: agentId, type: "status", status: "error", message: msg });
    return null;
  }
}
