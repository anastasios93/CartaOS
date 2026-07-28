"use client";

/**
 * Pillar 1 — Diagnosis, branch 1B (innovative): market worthiness for a novel
 * asset, weighting science, IP and partnerability (§4.2).
 *
 * Same shell as 1A (§4 — implemented once), different dimension set, different
 * agent, different results view. The two branches share no dimensions, sources
 * or prompts (§7).
 */

import { DiagnosisShell } from "@/components/run/diagnosis-shell";
import { InnovativeResults } from "@/components/run/innovative-results";
import { INNOVATIVE_DIMENSIONS } from "@/config/dimensions";
import type { Diagnosis } from "@/types/run";
import { Microscope } from "lucide-react";

export default function InnovativeDiagnosisPage() {
  return (
    <DiagnosisShell
      branch="innovative"
      title="Diagnosis — Innovative"
      subtitle="Is this novel asset worth pursuing? Science, IP and partnerability weighted — scored per market, sourced, confidence-tagged."
      dimensions={INNOVATIVE_DIMENSIONS}
      agentId="innovativeDiagnosis"
      icon={Microscope}
      renderResults={(result) => {
        const diagnosis = (result as { diagnosis?: Diagnosis } | null)?.diagnosis;
        return diagnosis ? <InnovativeResults diagnosis={diagnosis} /> : null;
      }}
      renderRunViewer={({ diagnosis, error }) => {
        const d = diagnosis as Diagnosis | null;
        if (!d || !Array.isArray(d.dimensions)) {
          return (
            <p className="text-sm text-muted-foreground">
              This run has no stored assessment{error ? ` — ${error}` : ""}.
            </p>
          );
        }
        return <InnovativeResults diagnosis={d} />;
      }}
    />
  );
}
