"use client";

/**
 * Pillar 3 — Execution, branch 3A (off-patent): §6.
 *
 * The run scaffolding (strategised-run picker, route picker, console, stored
 * plans) lives once in ExecutionShell; this page only names the branch.
 */

import { ExecutionShell } from "@/components/run/execution-shell";

export default function ExecutionPage() {
  return (
    <ExecutionShell
      branch="off_patent"
      title="Execution — Off-patent"
      subtitle="What has to happen, in what order, and who owns it? The chosen commercialisation route turned into dated workstreams — every date computed from the dependencies, not guessed."
    />
  );
}
