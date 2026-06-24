"use client";

import { useState } from "react";
import type { HubIntakeForm } from "@/types/hub";
import { Sparkles } from "lucide-react";

export function CompactIntakeForm({
  onSubmit,
  isLoading,
}: {
  onSubmit: (form: HubIntakeForm) => void;
  isLoading: boolean;
}) {
  const [assetName, setAssetName] = useState("");
  const [context, setContext] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName.trim()) return;
    // Agents auto-detect therapeutic area, stage, etc. from public data sources.
    // We only require the asset/compound name.
    onSubmit({
      assetName: assetName.trim(),
      therapeuticArea: "",
      developmentStage: "",
      dealDirection: "Out-licensing",
      geographies: ["US", "EU", "JP", "CN", "ROW"],
      context: context.trim(),
    });
  };

  const isValid = assetName.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border/40 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-border/30 bg-gradient-to-br from-[#FFF7ED]/40 to-white">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#F97316] to-[#EA580C] shadow-sm">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1A1A2E]">Run Portfolio Diagnostic</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Just enter an asset, compound, brand, or company. The AI agents will pull data from 12+ global pharma databases and auto-detect everything else.
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* Single primary input */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
            Compound(s) — search one or several
          </label>
          <input
            type="text"
            value={assetName}
            onChange={e => setAssetName(e.target.value)}
            placeholder="e.g., pertuzumab, adalimumab, dimethyl fumarate — separate multiple with commas"
            autoFocus
            className="w-full px-4 py-3 rounded-lg bg-[#FAFAFA] border border-border text-[15px] text-[#1A1A2E] placeholder-muted-foreground/60 focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] focus:bg-white outline-none transition"
          />
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Search several compounds at once (comma-separated) — CartaOS classifies each and ranks the off-patent opportunity
          </p>
        </div>

        {/* Optional context (collapsible) */}
        {showAdvanced ? (
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
              Strategic Context (Optional)
            </label>
            <textarea
              value={context}
              onChange={e => setContext(e.target.value)}
              rows={2}
              placeholder="Specific questions, focus areas, or strategic context — e.g., 'Looking at out-licensing in EU only' or 'Comparing market potential vs. patent cliff exposure'"
              className="w-full px-4 py-2.5 rounded-lg bg-[#FAFAFA] border border-border text-[13px] text-[#1A1A2E] placeholder-muted-foreground/60 focus:border-[#F97316] focus:bg-white outline-none transition resize-none"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAdvanced(true)}
            className="text-[11px] font-medium text-muted-foreground hover:text-[#F97316] transition-colors"
          >
            + Add strategic context (optional)
          </button>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!isValid || isLoading}
          className="w-full h-11 rounded-lg font-semibold text-white text-[14px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ background: isValid && !isLoading ? "linear-gradient(135deg, #F97316, #EA580C)" : "#94A3B8" }}
        >
          {isLoading ? (
            <>
              <span className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Running Diagnostic...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Deploy AI Agents
            </>
          )}
        </button>

        <p className="text-[10px] text-center text-muted-foreground">
          The 4 core agents will scan SEC EDGAR · ClinicalTrials.gov · OpenFDA · Orange Book · DailyMed · ChEMBL · RxNorm · EMA · Health Canada · FAERS · PubMed · Patents · News, then a 6th agent will synthesize an execution plan
        </p>
      </div>
    </form>
  );
}
