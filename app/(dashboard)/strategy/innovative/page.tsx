"use client";

/**
 * Pillar 2 — Strategy, branch 2B (innovative): §5.2.
 *
 * Same shell as 2A (implemented once), different route set and different
 * assumption drivers — the config decides, not a copy-pasted page.
 */

import { StrategyShell } from "@/components/run/strategy-shell";

export default function InnovativeStrategyPage() {
  return (
    <StrategyShell
      branch="innovative"
      title="Strategy — Innovative"
      subtitle="Which transaction structure and timing captures the most risk-adjusted value? Out-licence, co-develop, spin out, sell or advance alone — modelled side by side."
    />
  );
}
