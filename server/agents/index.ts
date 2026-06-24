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
export { runSynthesisAgent } from "./synthesis";
export { runExecutionPlanAgent } from "./execution-plan";
export { runOutLicensingStrategyAgent } from "./out-licensing-strategy";
