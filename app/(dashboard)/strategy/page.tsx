"use client";

/**
 * Pillar 2 — Strategy, branch 2A (off-patent): §5.1.
 *
 * The run scaffolding (diagnosed-run picker, console, empty state, stored
 * strategies) lives once in StrategyShell; this page only names the branch.
 */

import { StrategyShell } from "@/components/run/strategy-shell";

export default function StrategyPage() {
  return (
    <StrategyShell
      branch="off_patent"
      title="Strategy — Off-patent"
      subtitle="How is the value realised? Every commercialisation and partnering route modelled from one assumption set — NPV, break-even and the dependency that would break the plan."
    />
  );
}
