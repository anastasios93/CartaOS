"use client";

/**
 * Accumulates agent-stream state changes into run-console events (§3.4).
 *
 * Every pillar shell drives the same RunConsole from the same agent stream, so
 * this lives here rather than being copied per shell. It diffs each agent's
 * latest state against what it last emitted, so a status message that repeats
 * across renders is logged once.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RunLogEvent } from "@/types/run";
import type { AgentsMap } from "@/types/hub";

export interface RunLog {
  events: RunLogEvent[];
  reset: () => void;
}

export function useRunLog(agents: AgentsMap): RunLog {
  const [events, setEvents] = useState<RunLogEvent[]>([]);
  const prevRef = useRef<Record<string, { msg?: string; sources?: number; done?: boolean; error?: string }>>({});

  useEffect(() => {
    const next: RunLogEvent[] = [];
    const at = new Date().toISOString();
    for (const [id, state] of Object.entries(agents)) {
      const prev = (prevRef.current[id] ??= {});
      if (state.statusMessage && state.statusMessage !== prev.msg) {
        prev.msg = state.statusMessage;
        next.push({ at, kind: "status", message: state.statusMessage, source: id, phase: id });
      }
      if (state.sources.length && state.sources.length !== prev.sources) {
        prev.sources = state.sources.length;
        next.push({ at, kind: "source_hit", message: `${state.sources.length} sources consulted`, source: id, phase: id });
      }
      if (state.result && !prev.done) {
        prev.done = true;
        next.push({ at, kind: "result", message: "completed", source: id, phase: id });
      }
      if (state.error && state.error !== prev.error) {
        prev.error = state.error;
        next.push({ at, kind: "error", message: state.error, source: id, phase: id });
      }
    }
    if (next.length) setEvents((e) => [...e, ...next]);
  }, [agents]);

  const reset = useCallback(() => {
    prevRef.current = {};
    setEvents([]);
  }, []);

  return useMemo(() => ({ events, reset }), [events, reset]);
}
