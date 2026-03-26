/**
 * Hub Agent orchestration — barrel exports and shared types.
 */

import type { HubIntakeForm, SSEEvent, AgentId } from "@/types/hub";

export type AgentWriter = (event: SSEEvent) => void;

export type AgentRunner = (
  intake: HubIntakeForm,
  write: AgentWriter,
) => Promise<void>;

export { runBenchmarkingAgent } from "./benchmarking";
export { runPartnerAgent } from "./partner";
export { runNegotiationAgent } from "./negotiation";
export { runTermSheetAgent } from "./termsheet";

export const ALL_AGENTS: { id: AgentId; run: AgentRunner }[] = [];

// Lazy-load to avoid circular imports
export async function loadAgents(): Promise<{ id: AgentId; run: AgentRunner }[]> {
  const [bench, partner, nego, term] = await Promise.all([
    import("./benchmarking"),
    import("./partner"),
    import("./negotiation"),
    import("./termsheet"),
  ]);
  return [
    { id: "benchmarking", run: bench.runBenchmarkingAgent },
    { id: "partner", run: partner.runPartnerAgent },
    { id: "negotiation", run: nego.runNegotiationAgent },
    { id: "termsheet", run: term.runTermSheetAgent },
  ];
}
