"use client";

/**
 * Pillar 3 — Execution, branch 3B (innovative): §6.
 *
 * Same shell as 3A (implemented once), different route set and therefore a
 * different plan shape — the config decides, not a copy-pasted page.
 */

import { ExecutionShell } from "@/components/run/execution-shell";

export default function InnovativeExecutionPage() {
  return (
    <ExecutionShell
      branch="innovative"
      title="Execution — Innovative"
      subtitle="What has to happen to get the deal done? The chosen transaction route turned into dated workstreams — data room, diligence, IP substantiation and negotiation, sequenced on their real dependencies."
    />
  );
}
