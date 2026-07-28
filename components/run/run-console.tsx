"use client";

/**
 * Run console (§3.4): no opaque spinners. The collapsed header always shows the
 * latest event line; expanded shows the full phase-grouped event log with
 * timestamps and sources, and Cancel is available for as long as it runs.
 */

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Search,
  Database,
  FileText,
  Check,
  AlertTriangle,
  ChevronDown,
  X,
} from "lucide-react";
import type { RunLogEvent } from "@/types/run";

interface RunConsoleProps {
  events: RunLogEvent[];
  running: boolean;
  onCancel?: () => void;
  title?: string;
}

const KIND_ICONS: Record<RunLogEvent["kind"], typeof Activity> = {
  status: Activity,
  query: Search,
  source_hit: Database,
  extraction: FileText,
  result: Check,
  error: AlertTriangle,
};

function formatTime(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function RunConsole({ events, running, onCancel, title = "Run console" }: RunConsoleProps) {
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const latest = events.length > 0 ? events[events.length - 1] : null;
  const errored = !running && latest?.kind === "error";

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events.length, expanded]);

  return (
    <div className="rounded-xl border border-border/40 bg-white overflow-hidden">
      {/* Collapsed header — always shows the latest event line */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
          {running && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F97316] opacity-60" />
          )}
          <span
            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
              running ? "bg-[#F97316]" : errored ? "bg-red-500" : "bg-emerald-500"
            }`}
          />
        </span>
        <span className="sr-only">
          {running ? "Running" : errored ? "Finished with an error" : "Done"}
        </span>

        <span className="text-[13px] font-bold text-[#1A1A2E] shrink-0">{title}</span>

        <span
          className="flex-1 min-w-0 truncate text-[12px] text-muted-foreground"
          aria-live="polite"
        >
          {latest ? latest.message : "Waiting for the first event…"}
        </span>

        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 font-mono">
          {events.length} step{events.length === 1 ? "" : "s"}
        </span>

        {running && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 shrink-0 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-[#1A1A2E] transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            Cancel
          </button>
        )}

        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          aria-expanded={expanded}
          aria-controls="run-console-log"
          aria-label={expanded ? "Collapse run log" : "Expand run log"}
          className="shrink-0 rounded-lg p-1 text-muted-foreground transition hover:bg-[#FAFAFA] hover:text-[#1A1A2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Expanded event log, grouped by phase */}
      {expanded && (
        <div
          id="run-console-log"
          ref={scrollRef}
          role="log"
          aria-label={`${title} event log`}
          className="max-h-64 overflow-y-auto border-t border-border/30 bg-[#FAFAFA] px-4 py-2"
        >
          {events.length === 0 && (
            <p className="py-2 text-[12px] text-muted-foreground italic">No events yet.</p>
          )}
          {events.map((event, i) => {
            const Icon = KIND_ICONS[event.kind];
            const newPhase =
              event.phase !== undefined && (i === 0 || events[i - 1].phase !== event.phase);
            return (
              <div key={i}>
                {newPhase && (
                  <p className="mt-2 mb-1 first:mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                    {event.phase}
                  </p>
                )}
                <div className="flex items-start gap-2 py-1">
                  <span className="shrink-0 w-[4.5rem] text-[10px] font-mono text-muted-foreground/60 pt-0.5">
                    {formatTime(event.at)}
                  </span>
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${
                      event.kind === "error"
                        ? "text-red-600"
                        : event.kind === "result"
                          ? "text-emerald-600"
                          : event.kind === "source_hit"
                            ? "text-[#C2410C]"
                            : "text-muted-foreground/70"
                    }`}
                    aria-hidden="true"
                  />
                  <p
                    className={`flex-1 min-w-0 text-[12px] leading-snug ${
                      event.kind === "error" ? "text-red-700 font-medium" : "text-[#1A1A2E]"
                    }`}
                  >
                    {event.message}
                    {event.source && (
                      <span className="ml-1.5 px-1.5 py-px rounded bg-white border border-border/40 text-[10px] font-mono text-muted-foreground align-middle">
                        {event.source}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
