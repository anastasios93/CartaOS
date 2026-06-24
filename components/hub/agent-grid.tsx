"use client";

import type { AgentsMap, AgentId } from "@/types/hub";
import { AgentCard } from "./agent-card";

const AGENT_IDS: AgentId[] = ["benchmarking", "partner", "negotiation"];

export function AgentGrid({ agents }: { agents: AgentsMap }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {AGENT_IDS.map(id => (
        <AgentCard key={id} agentId={id} state={agents[id]} />
      ))}
    </div>
  );
}
