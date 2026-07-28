/**
 * Pillar 3 — Execution. Turns the chosen strategy route into a workstream plan
 * (§6, Option A).
 *
 * Division of labour, the same as everywhere else in the app: the model
 * proposes the SHAPE of the plan — which workstreams exist, what each milestone
 * is, who owns it by role, what it depends on, roughly how long it takes. It
 * does not get to state a date. Every date on the plan is computed by
 * server/services/execution/schedule.ts from the dependency graph, and
 * `mergeSchedule` overwrites anything the agent narrated.
 *
 * Owners are ROLES, never named people. The app has no roster, so a named owner
 * would be invention; a role is something the user can assign.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { HubIntakeForm } from "@/types/hub";
import type { AgentWriter } from "./index";
import type { Diagnosis, Execution, Strategy, StrategyRoute } from "@/types/run";
import { OFF_PATENT_ROUTES, INNOVATIVE_ROUTES } from "@/config/routes";
import { computeSchedule, type ProposedMilestone } from "@/server/services/execution/schedule";
import { withGrounding, withInnovativeGrounding } from "@/server/services/source-reference";
import { extractJSON, cleanError } from "./utils";
import { countryByCode } from "@/config/geographies";

const MODEL = "claude-opus-4-8";

/* eslint-disable @typescript-eslint/no-explicit-any */

const SHARED_OUTPUT = `Return ONLY valid JSON:
{
  "workstreams": ["the workstream names, in the order work starts"],
  "milestones": [
    { "id": "short-kebab-id", "title": "the deliverable, stated as something that can be finished", "workstream": "one of the workstream names above", "owner": "the ROLE accountable, e.g. Regulatory Affairs Lead", "durationDays": <integer>, "dependsOn": ["ids of milestones that must finish first"], "notes": "what makes this hard, or the decision it unblocks" }
  ],
  "firstMove": "the single thing to do in the next two weeks",
  "killCriteria": ["the signals that should stop this plan rather than slow it"],
  "note": "anything the plan will not show"
}

RULES THAT MATTER MOST
- Do NOT state a date, a deadline or a calendar quarter anywhere. Give durationDays only. Every date is computed from your dependency graph and will overwrite anything you write, so a narrated date can only contradict the plan.
- durationDays is elapsed working reality for that milestone once it can START — not cumulative from the plan start.
- dependsOn is what must genuinely FINISH first. Do not chain milestones that could run in parallel; a plan that is one long chain is almost always wrong and makes the timeline far too long.
- Every id referenced in dependsOn must be an id in this same list. Never depend on a milestone you did not define, and never create a cycle.
- Owners are ROLES, not names. You do not know who works here.
- Milestones are DELIVERABLES with a finish line ("Dossier filed with BfArM"), not activities ("work on regulatory"). If you cannot say what finishing looks like, it is not a milestone.
- Cover the whole route, including the unglamorous parts — quality, pharmacovigilance, supply, contracting, transfer pricing — not just the commercial highlights.
- 12 to 20 milestones. Fewer is not a plan; more is not tracked.
- Do not include commentary outside the JSON.`;

const OFF_PATENT_PROMPT = `You are planning the EXECUTION of a chosen commercialisation route for an already-approved, off-patent medicine. The decision is made: your job is the plan that gets it done, not another options review.

Think in the workstreams this route actually requires — regulatory and MA transfer, quality and pharmacovigilance, supply and CMC, pricing and reimbursement submission per market, channel and distribution contracting, launch readiness, and commercial operations. Which of those exist and how heavy each one is depends entirely on the route: owning the MA and distributing yourself is a very different plan from appointing a distributor or running a tender-agent model.

Sequence to the real gating items. In most European markets the reimbursement submission cannot start until the MA is in place, and stock cannot ship until QP release and serialisation are ready — those dependencies, not effort estimates, set the timeline.

${SHARED_OUTPUT}`;

const INNOVATIVE_PROMPT = `You are planning the EXECUTION of a chosen transaction route for a novel, still-developing asset. The decision is made: your job is the plan that gets the deal done and the asset ready to be handed over or advanced.

Think in the workstreams a transaction of this shape actually requires — data room and diligence readiness, CMC and technical package, regulatory strategy documentation, IP and freedom-to-operate substantiation, partner identification and outreach, term sheet and definitive agreement negotiation, and transition or co-development governance. A NewCo spin-out and an outright asset sale need very different plans; an option-to-license front-loads the data package because the option only converts on the data.

Sequence to the real gating items. Diligence cannot open before the data room is defensible, and no term sheet survives an IP position that has not been substantiated — those dependencies set the timeline, not effort.

${SHARED_OUTPUT}`;

// ── Deterministic merge ─────────────────────────────────────────────────────

const MAX_MILESTONES = 24;

function slug(v: unknown, fallback: string): string {
  const s = String(v ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return s.slice(0, 60) || fallback;
}

/**
 * Take the agent's proposal, keep only what it is allowed to decide, and hand
 * the rest to the engine. Anything date-shaped it emitted is dropped here
 * rather than downstream — the merge is the boundary the governing rule lives
 * on, so it has to be the thing that cannot be bypassed.
 */
export function mergeSchedule(parsed: any, sourceRoute: string, startDate: string): Execution {
  const rawMilestones: any[] = Array.isArray(parsed?.milestones) ? parsed.milestones : [];

  const seen = new Set<string>();
  const proposed: ProposedMilestone[] = rawMilestones.slice(0, MAX_MILESTONES).flatMap((m, i) => {
    const title = String(m?.title ?? "").trim();
    if (!title) return [];
    let id = slug(m?.id, `milestone-${i + 1}`);
    while (seen.has(id)) id = `${id}-${i + 1}`;
    seen.add(id);
    return [
      {
        id,
        title: title.slice(0, 200),
        workstream: m?.workstream ? String(m.workstream).slice(0, 80) : undefined,
        owner: m?.owner ? String(m.owner).slice(0, 80) : undefined,
        durationDays: Number(m?.durationDays),
        dependsOn: Array.isArray(m?.dependsOn) ? m.dependsOn.map((d: unknown) => slug(d, "")) : [],
        notes: m?.notes ? String(m.notes).slice(0, 600) : undefined,
      },
    ];
  });

  const schedule = computeSchedule(proposed, startDate);

  // Workstreams the agent named, plus any it used on a milestone but forgot to
  // declare — the board must never silently drop a column.
  const declared: string[] = Array.isArray(parsed?.workstreams)
    ? parsed.workstreams.map((w: unknown) => String(w).slice(0, 80)).filter(Boolean)
    : [];
  const used = schedule.milestones.map((m) => m.workstream).filter((w): w is string => !!w);
  const workstreams = [...new Set([...declared, ...used])];

  return {
    sourceRoute,
    workstreams,
    milestones: schedule.milestones,
    startDate: schedule.startDate,
    totalDays: schedule.totalDays,
    criticalPath: schedule.criticalPath,
    droppedDependencies: schedule.droppedDependencies,
    firstMove: parsed?.firstMove ? String(parsed.firstMove).slice(0, 400) : undefined,
    killCriteria: Array.isArray(parsed?.killCriteria)
      ? parsed.killCriteria.slice(0, 6).map((k: unknown) => String(k).slice(0, 300))
      : [],
    note: parsed?.note ? String(parsed.note).slice(0, 800) : undefined,
    completedAt: new Date().toISOString(),
  } as Execution;
}

/** The route the plan is built for: the user's pick, else what strategy recommended. */
export function chosenRoute(strategy: Strategy, requested?: string): StrategyRoute | null {
  const routes = Array.isArray(strategy.routes) ? strategy.routes : [];
  if (!routes.length) return null;
  const wanted = requested || strategy.recommendedRoute;
  return routes.find((r) => r.key === wanted) ?? routes[0];
}

function renderContext(strategy: Strategy, route: StrategyRoute, diagnosis?: Diagnosis): string {
  const def =
    OFF_PATENT_ROUTES.find((r) => r.key === route.key) ?? INNOVATIVE_ROUTES.find((r) => r.key === route.key);
  const econ = (route.model as any)?.economics ?? route.model;
  const lines = [
    `## CHOSEN ROUTE\n${route.label} (${route.key})`,
    def?.description ? `${def.description}` : "",
    route.keyDependency ? `Key dependency: ${route.keyDependency}` : "",
    econ?.npv != null ? `Modelled NPV: ${econ.npv}. This is context, not something to restate.` : "",
    Array.isArray(strategy.approachSequence) && strategy.approachSequence.length
      ? `\n## APPROACH SEQUENCE THE STRATEGY SET\n${(strategy.approachSequence as string[]).map((s) => `- ${s}`).join("\n")}`
      : "",
    Array.isArray(strategy.partnerShortlist) && strategy.partnerShortlist.length
      ? `\n## PARTNER SHORTLIST\n${strategy.partnerShortlist
          .slice(0, 6)
          .map((p: any) => `- ${p.name}${p.kind ? ` (${p.kind})` : ""}`)
          .join("\n")}`
      : "",
    diagnosis?.verdict ? `\n## DIAGNOSIS VERDICT\n${diagnosis.verdict}` : "",
  ];
  return lines.filter(Boolean).join("\n");
}

export async function runExecutionAgent(
  intake: HubIntakeForm & {
    strategy: Strategy;
    diagnosis?: Diagnosis;
    routeKey?: string;
    startDate?: string;
  },
  write: AgentWriter,
): Promise<void> {
  const agentId = "execution" as const;
  const branch = intake.strategy.branch === "innovative" ? "innovative" : "off_patent";

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured. Please add your API key in environment variables.");
    }

    const route = chosenRoute(intake.strategy, intake.routeKey);
    if (!route) throw new Error("This strategy has no routes to build a plan from.");

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const isOffPatent = branch === "off_patent";
    const geographies = (intake.geographies ?? []).map((g) => g.toUpperCase()).filter((g) => countryByCode(g));
    const marketBrief = geographies.length
      ? geographies.map((g) => `${g} (${countryByCode(g)!.name})`).join(", ")
      : "no markets selected";

    write({
      agent: agentId,
      type: "status",
      status: "analyzing",
      message: `Building the workstream plan for ${route.label}…`,
    });

    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 12000,
      thinking: { type: "adaptive" },
      system: (isOffPatent ? withGrounding : withInnovativeGrounding)(
        isOffPatent ? OFF_PATENT_PROMPT : INNOVATIVE_PROMPT,
      ),
      messages: [
        {
          role: "user",
          content: `## ASSET\n${intake.assetName}${intake.context ? `\nContext: ${intake.context}` : ""}\n\n## MARKETS\n${marketBrief}\n\n${renderContext(intake.strategy, route, intake.diagnosis)}\n\nProduce the workstreams and milestones as JSON.`,
        },
      ],
    });

    if (res.stop_reason === "refusal") throw new Error("The execution plan request was declined by safety classifiers.");
    const parsed = extractJSON<any>(res.content.find((b) => b.type === "text")?.text ?? "");

    // ── Deterministic layer: the engine dates the plan, not the model ──
    const startDate = (intake.startDate ?? new Date().toISOString()).slice(0, 10);
    const execution = mergeSchedule(parsed, route.key, startDate);

    if (!execution.milestones.length) throw new Error("The plan came back with no milestones.");

    write({ agent: agentId, type: "result", data: { agentId, execution } as any });
    write({
      agent: agentId,
      type: "status",
      status: "complete",
      message: `${execution.milestones.length} milestones across ${execution.workstreams.length} workstreams.`,
    });
  } catch (err) {
    write({ agent: agentId, type: "error", error: cleanError(err) });
    write({ agent: agentId, type: "status", status: "error", message: "Plan could not be built" });
  }
}
