"use client";

import { useState } from "react";
import type { HubIntakeForm, Geography } from "@/types/hub";
import { GEOGRAPHY_LABELS, GEOGRAPHY_COLORS } from "@/types/hub";

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

export function IntakeForm({ onSubmit, isLoading }: { onSubmit: (form: HubIntakeForm) => void; isLoading: boolean }) {
  const [assetName, setAssetName] = useState("");
  const [therapeuticArea, setTherapeuticArea] = useState("");
  const [developmentStage, setDevelopmentStage] = useState("");
  const [dealDirection, setDealDirection] = useState<HubIntakeForm["dealDirection"]>("Out-licensing");
  const [geographies, setGeographies] = useState<Geography[]>(["US", "EU"]);
  const [context, setContext] = useState("");

  const toggleGeo = (geo: Geography) => {
    setGeographies(prev =>
      prev.includes(geo) ? prev.filter(g => g !== geo) : [...prev, geo]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName || !therapeuticArea || !developmentStage || geographies.length === 0) return;
    onSubmit({ assetName, therapeuticArea, developmentStage, dealDirection, geographies, context });
  };

  const isValid = assetName && therapeuticArea && developmentStage && geographies.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      {/* Asset Name */}
      <div>
        <label className="block text-sm font-medium text-[#94A3B8] mb-1.5">Asset / Compound Name</label>
        <input
          type="text"
          value={assetName}
          onChange={e => setAssetName(e.target.value)}
          placeholder="e.g., CTX-4100 (anti-CD47 mAb)"
          className="w-full px-4 py-2.5 rounded-lg bg-[#1E293B] border border-[#334155] text-[#F1F5F9] placeholder-[#64748B] focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] outline-none transition"
        />
      </div>

      {/* Row: TA + Stage */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#94A3B8] mb-1.5">Therapeutic Area</label>
          <select
            value={therapeuticArea}
            onChange={e => setTherapeuticArea(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-[#1E293B] border border-[#334155] text-[#F1F5F9] focus:border-[#3B82F6] outline-none transition"
          >
            <option value="">Select...</option>
            {THERAPEUTIC_AREAS.map(ta => <option key={ta} value={ta}>{ta}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#94A3B8] mb-1.5">Development Stage</label>
          <select
            value={developmentStage}
            onChange={e => setDevelopmentStage(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-[#1E293B] border border-[#334155] text-[#F1F5F9] focus:border-[#3B82F6] outline-none transition"
          >
            <option value="">Select...</option>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Deal Direction */}
      <div>
        <label className="block text-sm font-medium text-[#94A3B8] mb-1.5">Deal Direction</label>
        <select
          value={dealDirection}
          onChange={e => setDealDirection(e.target.value as HubIntakeForm["dealDirection"])}
          className="w-full px-4 py-2.5 rounded-lg bg-[#1E293B] border border-[#334155] text-[#F1F5F9] focus:border-[#3B82F6] outline-none transition"
        >
          {DEAL_DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Geography Pills */}
      <div>
        <label className="block text-sm font-medium text-[#94A3B8] mb-2">Target Geographies</label>
        <div className="flex gap-2 flex-wrap">
          {ALL_GEOS.map(geo => {
            const selected = geographies.includes(geo);
            return (
              <button
                key={geo}
                type="button"
                onClick={() => toggleGeo(geo)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={{
                  backgroundColor: selected ? `${GEOGRAPHY_COLORS[geo]}20` : "#1E293B",
                  color: selected ? GEOGRAPHY_COLORS[geo] : "#64748B",
                  border: `1px solid ${selected ? GEOGRAPHY_COLORS[geo] : "#334155"}`,
                }}
              >
                {GEOGRAPHY_LABELS[geo]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Context */}
      <div>
        <label className="block text-sm font-medium text-[#94A3B8] mb-1.5">Deal Context / Questions</label>
        <textarea
          value={context}
          onChange={e => setContext(e.target.value)}
          rows={3}
          placeholder="Describe the opportunity, key questions, or specific areas of focus..."
          className="w-full px-4 py-2.5 rounded-lg bg-[#1E293B] border border-[#334155] text-[#F1F5F9] placeholder-[#64748B] focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] outline-none transition resize-none"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!isValid || isLoading}
        className="w-full py-3 rounded-lg font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: isValid && !isLoading ? "linear-gradient(135deg, #3B82F6, #8B5CF6)" : "#334155" }}
      >
        {isLoading ? "Deploying Agents..." : "Deploy 4 AI Agents"}
      </button>
    </form>
  );
}
