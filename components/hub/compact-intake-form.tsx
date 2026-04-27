"use client";

import { useState } from "react";
import type { HubIntakeForm, Geography } from "@/types/hub";
import { GEOGRAPHY_LABELS, GEOGRAPHY_COLORS } from "@/types/hub";
import { Sparkles } from "lucide-react";

const THERAPEUTIC_AREAS = [
  "Oncology", "Immunology", "Neuroscience", "Cardiovascular", "Rare Disease",
  "Infectious Disease", "Metabolic", "Respiratory", "Ophthalmology",
  "Dermatology", "Gene & Cell Therapy", "Other",
];

const STAGES = [
  "Preclinical", "Phase I", "Phase I/II", "Phase II", "Phase II/III", "Phase III", "Filed / Approved",
];

const DEAL_DIRECTIONS: HubIntakeForm["dealDirection"][] = [
  "Out-licensing", "In-licensing", "Co-development", "Option Agreement", "M&A / Acquisition",
];

const ALL_GEOS: Geography[] = ["US", "EU", "JP", "CN", "ROW"];

export function CompactIntakeForm({
  onSubmit,
  isLoading,
}: {
  onSubmit: (form: HubIntakeForm) => void;
  isLoading: boolean;
}) {
  const [assetName, setAssetName] = useState("");
  const [therapeuticArea, setTherapeuticArea] = useState("");
  const [developmentStage, setDevelopmentStage] = useState("");
  const [dealDirection, setDealDirection] = useState<HubIntakeForm["dealDirection"]>("Out-licensing");
  const [geographies, setGeographies] = useState<Geography[]>(["US", "EU"]);
  const [context, setContext] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const toggleGeo = (geo: Geography) => {
    setGeographies(prev => prev.includes(geo) ? prev.filter(g => g !== geo) : [...prev, geo]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName || !therapeuticArea || !developmentStage || geographies.length === 0) return;
    onSubmit({ assetName, therapeuticArea, developmentStage, dealDirection, geographies, context });
  };

  const isValid = assetName && therapeuticArea && developmentStage && geographies.length > 0;

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
              Provide an asset and our 4 AI agents will pull data from 12+ global pharma databases in real time
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* Row 1: Asset name */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
            Asset / Compound / Portfolio
          </label>
          <input
            type="text"
            value={assetName}
            onChange={e => setAssetName(e.target.value)}
            placeholder="e.g., Keytruda (pembrolizumab), CTX-4100, oncology portfolio"
            className="w-full px-4 py-2.5 rounded-lg bg-[#FAFAFA] border border-border text-[14px] text-[#1A1A2E] placeholder-muted-foreground/60 focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] focus:bg-white outline-none transition"
          />
        </div>

        {/* Row 2: TA, Stage, Direction */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
              Therapeutic Area
            </label>
            <select
              value={therapeuticArea}
              onChange={e => setTherapeuticArea(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-[#FAFAFA] border border-border text-[13px] text-[#1A1A2E] focus:border-[#F97316] focus:bg-white outline-none transition"
            >
              <option value="">Select...</option>
              {THERAPEUTIC_AREAS.map(ta => <option key={ta} value={ta}>{ta}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
              Development Stage
            </label>
            <select
              value={developmentStage}
              onChange={e => setDevelopmentStage(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-[#FAFAFA] border border-border text-[13px] text-[#1A1A2E] focus:border-[#F97316] focus:bg-white outline-none transition"
            >
              <option value="">Select...</option>
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
              Deal Direction
            </label>
            <select
              value={dealDirection}
              onChange={e => setDealDirection(e.target.value as HubIntakeForm["dealDirection"])}
              className="w-full px-3 py-2.5 rounded-lg bg-[#FAFAFA] border border-border text-[13px] text-[#1A1A2E] focus:border-[#F97316] focus:bg-white outline-none transition"
            >
              {DEAL_DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* Geographies */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
            Target Geographies
          </label>
          <div className="flex gap-2 flex-wrap">
            {ALL_GEOS.map(geo => {
              const selected = geographies.includes(geo);
              return (
                <button
                  key={geo}
                  type="button"
                  onClick={() => toggleGeo(geo)}
                  className="px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all"
                  style={{
                    backgroundColor: selected ? `${GEOGRAPHY_COLORS[geo]}15` : "#FAFAFA",
                    color: selected ? GEOGRAPHY_COLORS[geo] : "#64748B",
                    border: `1px solid ${selected ? GEOGRAPHY_COLORS[geo] : "#E2E8F0"}`,
                  }}
                >
                  {GEOGRAPHY_LABELS[geo]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Advanced toggle */}
        {showAdvanced ? (
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
              Strategic Context (Optional)
            </label>
            <textarea
              value={context}
              onChange={e => setContext(e.target.value)}
              rows={2}
              placeholder="What is the unrealized market potential? Any specific strategic questions?"
              className="w-full px-4 py-2.5 rounded-lg bg-[#FAFAFA] border border-border text-[13px] text-[#1A1A2E] placeholder-muted-foreground/60 focus:border-[#F97316] focus:bg-white outline-none transition resize-none"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAdvanced(true)}
            className="text-[11px] font-medium text-muted-foreground hover:text-[#F97316] transition-colors"
          >
            + Add strategic context
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
      </div>
    </form>
  );
}
