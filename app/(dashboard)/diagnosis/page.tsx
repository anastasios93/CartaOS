"use client";

/**
 * Pillar 1 — Diagnosis, branch 1A (off-patent): is this asset worth pursuing?
 *
 * The run scaffolding (configuration card, console, empty state, past runs)
 * lives once in DiagnosisShell (§4); this page only supplies the branch config
 * and the off-patent results rendering.
 */

import { DiagnosisShell } from "@/components/run/diagnosis-shell";
import { OutLicensingStrategyResults } from "@/components/hub/results/out-licensing-strategy-results";
import { OFF_PATENT_DIMENSIONS } from "@/config/dimensions";
import type { OutLicensingReport } from "@/types/hub";
import { Stethoscope } from "lucide-react";

const VERDICT_STYLE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  GO: { bg: "#DCFCE7", text: "#15803D", border: "#16A34A", label: "GO" },
  CONDITIONAL: { bg: "#FEF3C7", text: "#B45309", border: "#F59E0B", label: "CONDITIONAL GO" },
  NO_GO: { bg: "#FEE2E2", text: "#B91C1C", border: "#EF4444", label: "NO-GO" },
};

export default function DiagnosisPage() {
  return (
    <DiagnosisShell
      branch="off_patent"
      title="Diagnosis — Off-patent"
      subtitle="Is this asset worth pursuing? A decisive GO / Conditional / No-Go verdict per market — scored, sourced, confidence-tagged."
      dimensions={OFF_PATENT_DIMENSIONS}
      agentId="outLicensingStrategy"
      icon={Stethoscope}
      renderResults={(result, { assetQuery }) => {
        const report = (result as { report?: OutLicensingReport } | null)?.report;
        if (!report) return null;
        return (
          <>
            {report.verdict && (
              <VerdictHeader
                verdict={report.verdict === "Go" ? "GO" : report.verdict === "No-Go" ? "NO_GO" : "CONDITIONAL"}
                score={report.weightedWorthiness?.score ?? null}
                thesis={report.opportunityThesis}
                asset={assetQuery}
              />
            )}
            <OutLicensingStrategyResults data={{ agentId: "outLicensingStrategy", report }} />
          </>
        );
      }}
      renderRunViewer={({ diagnosis, assetQuery, error }) => {
        const d = diagnosis as {
          verdict?: string;
          worthinessScore?: number | null;
          thesis?: string;
          report?: OutLicensingReport;
          legacy?: { result?: { report?: OutLicensingReport } };
        } | null;
        const report = d?.report ?? d?.legacy?.result?.report;
        return (
          <>
            {d?.verdict && (
              <VerdictHeader verdict={d.verdict} score={d.worthinessScore ?? null} thesis={d.thesis} asset={assetQuery} />
            )}
            {report ? (
              <OutLicensingStrategyResults data={{ agentId: "outLicensingStrategy", report }} />
            ) : (
              <p className="text-sm text-muted-foreground">
                This run has no stored assessment{error ? ` — ${error}` : ""}.
              </p>
            )}
          </>
        );
      }}
    />
  );
}

function VerdictHeader({ verdict, score, thesis, asset }: { verdict: string; score: number | null; thesis?: string; asset: string }) {
  const v = VERDICT_STYLE[verdict] ?? VERDICT_STYLE.CONDITIONAL;
  return (
    <div className="rounded-2xl border-2 bg-white p-6" style={{ borderColor: v.border }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full" style={{ backgroundColor: v.bg, color: v.text }}>
              {v.label}
            </span>
            <span className="text-[12px] text-muted-foreground">{asset || "Asset"}</span>
          </div>
          {thesis && <p className="text-[14px] text-[#1A1A2E] leading-relaxed max-w-3xl mt-2">{thesis}</p>}
        </div>
        {score != null && (
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Worthiness</p>
            <p className="text-4xl font-bold font-mono tracking-tight" style={{ color: v.text }}>{score}</p>
          </div>
        )}
      </div>
    </div>
  );
}
