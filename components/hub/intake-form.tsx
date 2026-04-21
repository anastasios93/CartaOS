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

const ANALYSIS_GOALS = [
  { id: "hidden-value", label: "Find Hidden Value", desc: "Identify underexploited assets with untapped market potential" },
  { id: "patent-cliff", label: "Patent Cliff Strategy", desc: "Prepare for LOE with reformulation & in-licensing" },
  { id: "portfolio-opt", label: "Portfolio Optimization", desc: "Prune underperformers, strengthen positioning" },
  { id: "market-entry", label: "Market Potential", desc: "Assess go-to-market opportunity for new geographies" },
  { id: "deal-ready", label: "Deal-Ready Package", desc: "Full diagnostic for an imminent licensing opportunity" },
];

export function IntakeForm({ onSubmit, isLoading }: { onSubmit: (form: HubIntakeForm) => void; isLoading: boolean }) {
  const [assetName, setAssetName] = useState("");
  const [therapeuticArea, setTherapeuticArea] = useState("");
  const [developmentStage, setDevelopmentStage] = useState("");
  const [dealDirection, setDealDirection] = useState<HubIntakeForm["dealDirection"]>("Out-licensing");
  const [geographies, setGeographies] = useState<Geography[]>(["US", "EU"]);
  const [context, setContext] = useState("");
  const [selectedGoals, setSelectedGoals] = useState<string[]>(["deal-ready"]);

  const toggleGeo = (geo: Geography) => {
    setGeographies(prev =>
      prev.includes(geo) ? prev.filter(g => g !== geo) : [...prev, geo]
    );
  };

  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev =>
      prev.includes(goalId) ? prev.filter(g => g !== goalId) : [...prev, goalId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName || !therapeuticArea || !developmentStage || geographies.length === 0) return;

    // Include analysis goals in context
    const goalLabels = ANALYSIS_GOALS.filter(g => selectedGoals.includes(g.id)).map(g => g.label);
    const enrichedContext = [
      goalLabels.length > 0 ? `Analysis Goals: ${goalLabels.join(", ")}` : "",
      context,
    ].filter(Boolean).join("\n\n");

    onSubmit({ assetName, therapeuticArea, developmentStage, dealDirection, geographies, context: enrichedContext });
  };

  const isValid = assetName && therapeuticArea && developmentStage && geographies.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      {/* Analysis Goals */}
      <div>
        <label className="block text-sm font-medium text-[#94A3B8] mb-2">Analysis Goal</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ANALYSIS_GOALS.map(goal => {
            const selected = selectedGoals.includes(goal.id);
            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => toggleGoal(goal.id)}
                className="flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-lg text-left transition-all"
                style={{
                  backgroundColor: selected ? "#1E3A5F" : "#1E293B",
                  border: `1px solid ${selected ? "#3B82F6" : "#334155"}`,
                }}
              >
                <span className="text-xs font-semibold" style={{ color: selected ? "#60A5FA" : "#94A3B8" }}>
                  {goal.label}
                </span>
                <span className="text-[10px] text-[#64748B] leading-tight">{goal.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Asset Name */}
      <div>
        <label className="block text-sm font-medium text-[#94A3B8] mb-1.5">Asset / Compound / Portfolio Name</label>
        <input
          type="text"
          value={assetName}
          onChange={e => setAssetName(e.target.value)}
          placeholder="e.g., Keytruda (pembrolizumab), Eliquis portfolio, CTX-4100"
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
        <label className="block text-sm font-medium text-[#94A3B8] mb-1.5">Portfolio Context / Strategic Questions</label>
        <textarea
          value={context}
          onChange={e => setContext(e.target.value)}
          rows={3}
          placeholder="E.g., What is the unrealized market potential for this asset? Are there hidden champion indications? What's the patent cliff exposure and reformulation strategy?"
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
        {isLoading ? "Running Portfolio Diagnostic..." : "Deploy 4 AI Agents"}
      </button>

      {/* What you get */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        {[
          { label: "Deal Benchmarking", desc: "Comparable deals & market potential from SEC EDGAR + ClinicalTrials.gov" },
          { label: "Partner Intelligence", desc: "Strategic partner fit scores from multi-source analysis" },
          { label: "Negotiation Strategy", desc: "Leverage analysis & term positioning from precedent deals" },
          { label: "Full Deal Package", desc: "Draft contract, due diligence, data room & synthesized intelligence" },
        ].map(item => (
          <div key={item.label} className="px-3 py-2 rounded-lg bg-[#0F172A] border border-[#1E293B]">
            <p className="text-[11px] font-semibold text-[#64748B]">{item.label}</p>
            <p className="text-[10px] text-[#475569] mt-0.5 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </form>
  );
}
