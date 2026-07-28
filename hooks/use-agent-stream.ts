"use client";

import { useReducer, useCallback, useRef } from "react";
import type { HubIntakeForm, AgentId, AgentState, AgentsMap, SSEEvent } from "@/types/hub";

const AGENT_IDS: AgentId[] = ["benchmarking", "partner", "negotiation", "synthesis", "executionPlan", "outLicensingStrategy", "innovativeDiagnosis", "strategy"];

const initialAgentState: AgentState = {
  status: "idle",
  statusMessage: "",
  sources: [],
  result: null,
  error: null,
};

function initialState(): AgentsMap {
  return Object.fromEntries(AGENT_IDS.map(id => [id, { ...initialAgentState }])) as AgentsMap;
}

type Action =
  | { type: "reset" }
  | { type: "event"; event: SSEEvent };

function reducer(state: AgentsMap, action: Action): AgentsMap {
  if (action.type === "reset") return initialState();

  const { event } = action;
  const prev = state[event.agent];
  if (!prev) return state;

  let updated: AgentState;

  switch (event.type) {
    case "status":
      updated = { ...prev, status: event.status, statusMessage: event.message };
      break;
    case "sources":
      updated = { ...prev, sources: event.sources };
      break;
    case "result":
      updated = { ...prev, result: event.data };
      break;
    case "error":
      updated = { ...prev, error: event.error, status: "error" };
      break;
    default:
      return state;
  }

  return { ...state, [event.agent]: updated };
}

export function useAgentStream() {
  const [agents, dispatch] = useReducer(reducer, undefined, initialState);
  const isRunningRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // Strategy runs post to their own endpoint but stream the same event shape.
  const deploy = useCallback(async (form: HubIntakeForm, endpoint = "/api/orchestrator") => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    dispatch({ type: "reset" });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;

          try {
            const event = JSON.parse(json);
            if (event.type === "done") continue;
            dispatch({ type: "event", event });
          } catch {
            // Ignore malformed events
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        for (const id of AGENT_IDS) {
          dispatch({
            type: "event",
            event: { agent: id, type: "error", error: (err as Error).message },
          });
        }
      }
    } finally {
      isRunningRef.current = false;
      abortRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    isRunningRef.current = false;
    dispatch({ type: "reset" });
  }, []);

  const isRunning = AGENT_IDS.some(
    id => agents[id].status === "scraping" || agents[id].status === "analyzing"
  );

  const hasResults = AGENT_IDS.some(
    id => agents[id].status === "complete" || agents[id].status === "error"
  );

  return { agents, deploy, reset, isRunning, hasResults };
}
