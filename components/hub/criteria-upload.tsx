"use client";

/**
 * Search-criteria upload / paste.
 *
 * Lets anyone upload any text document — a brief, a target-product profile, a
 * parameters sheet — or paste text that contains their variables, parameters and
 * search criteria. The server extracts a structured SearchCriteria; the user
 * reviews and can retune the lever weights, then applies it to customise the
 * market-worthiness search and the asset value assessment.
 */

import { useRef, useState } from "react";
import type { SearchCriteria, ValueLeverType } from "@/types/hub";
import { Sliders, Upload, Loader2, FileText, ShieldCheck, Check, AlertTriangle } from "lucide-react";

const ALL_LEVERS: ValueLeverType[] = [
  "Geographic expansion",
  "Indication expansion / repurposing",
  "Distribution channels",
  "Formulary positioning",
  "Administration / formulation",
  "Reimbursement / pricing",
  "Sales-force effectiveness",
  "Lifecycle / IP defense",
  "Supply / COGS arbitrage",
  "Portfolio synergy",
];

export function CriteriaUpload({ onApply }: { onApply: (criteria: SearchCriteria) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<"model" | "heuristic" | null>(null);
  const [criteria, setCriteria] = useState<SearchCriteria | null>(null);
  const [applied, setApplied] = useState(false);

  function weightFor(lever: ValueLeverType): number {
    return criteria?.leverWeights?.find(w => w.lever === lever)?.weight ?? 0;
  }

  function setWeight(lever: ValueLeverType, weight: number) {
    setApplied(false);
    setCriteria(prev => {
      if (!prev) return prev;
      const others = (prev.leverWeights ?? []).filter(w => w.lever !== lever);
      return { ...prev, leverWeights: [...others, { lever, weight }].sort((a, b) => b.weight - a.weight) };
    });
  }

  async function extract(payload: { text?: string; file?: File }) {
    setBusy(true);
    setError(null);
    setCriteria(null);
    setMethod(null);
    setApplied(false);
    try {
      let res: Response;
      if (payload.file) {
        const body = new FormData();
        body.append("file", payload.file);
        res = await fetch("/api/criteria", { method: "POST", body });
      } else {
        res = await fetch("/api/criteria", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: payload.text ?? "" }),
        });
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Extraction failed.");
        return;
      }
      setCriteria(json.criteria as SearchCriteria);
      setMethod(json.method ?? null);
    } catch {
      setError("Could not reach the server. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-white p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF7ED] text-[#C2410C] shrink-0">
          <Sliders className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-[#1A1A2E]">Customise the search</h3>
          <p className="text-[13px] text-muted-foreground mt-0.5 leading-relaxed">
            Upload any document — a brief, a target-product profile, a screening rubric — or paste the
            variables, parameters and search criteria that define what matters to you. CartaOS extracts
            them and tailors the market-worthiness search and asset value assessment accordingly.
          </p>

          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            placeholder={`Paste your parameters, e.g.:\nAssets: metformin, atorvastatin\nMarkets: Germany, France, India\nWe care most about net pricing and geographic expansion; not reformulation.\nOnly markets with an addressable pool over $50M. 3-year horizon.`}
            className="w-full mt-3 px-4 py-3 rounded-lg bg-[#FAFAFA] border border-border text-[13px] text-[#1A1A2E] placeholder-muted-foreground/50 focus:border-[#F97316] focus:bg-white outline-none transition resize-none font-mono"
          />

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <button
              onClick={() => extract({ text })}
              disabled={busy || !text.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#F97316] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#EA580C] disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sliders className="h-4 w-4" />}
              Extract criteria
            </button>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-[13px] font-semibold text-[#1A1A2E] transition hover:bg-[#FAFAFA] disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              Upload a document
            </button>
            <span className="text-[11px] text-muted-foreground">.txt · .md · .csv · .json · or paste above</span>
            <input
              ref={inputRef}
              type="file"
              accept=".txt,.md,.markdown,.csv,.tsv,.json,.yaml,.yml,.text,.log"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) extract({ file: f });
                e.target.value = "";
              }}
            />
          </div>

          <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground/80 mt-2.5 leading-relaxed">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-px text-[#C2410C]" />
            Read in-session to extract your criteria only. Not stored, not sent to any third party. PDFs/Word:
            paste the text instead.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#141414]/15 bg-[#F7F6F4] p-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-[#141414]" />
          <p className="text-[12px] text-[#1A1A2E] leading-relaxed">{error}</p>
        </div>
      )}

      {criteria && (
        <div className="mt-5 space-y-4 border-t border-border/30 pt-4">
          {method === "heuristic" && (
            <p className="text-[11px] text-[#C2410C] bg-[#FFF7ED] rounded-lg px-3 py-2">
              Extracted by keyword fallback (AI extraction unavailable). Review the fields and weights below before applying.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Assets to assess" values={criteria.assets} empty="None found — will use the compound box above" />
            <Field label="Priority geographies" values={criteria.geographies} empty="None found — global default" />
          </div>
          {criteria.valueQuestion && (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">The question to answer</p>
              <p className="text-[13px] font-medium text-[#1A1A2E] leading-relaxed">{criteria.valueQuestion}</p>
            </div>
          )}
          {(criteria.constraints?.length ?? 0) > 0 && (
            <Field label="Constraints & must-haves" values={criteria.constraints ?? []} empty="" />
          )}
          {(criteria.thresholds?.length ?? 0) > 0 && (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">Go / no-go thresholds</p>
              <div className="flex flex-wrap gap-1.5">
                {criteria.thresholds!.map((t, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-md bg-[#F8F9FA] border border-border/40 text-[11px] text-[#1A1A2E]">
                    {t.metric} {t.operator} {t.value}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Lever weights — the core customization, editable */}
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
              Value-lever priorities — drag to retune what the worthiness score rewards
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
              {ALL_LEVERS.map(lever => {
                const w = weightFor(lever);
                return (
                  <div key={lever} className="flex items-center gap-3">
                    <span className="text-[11px] text-[#1A1A2E] w-44 shrink-0 truncate" title={lever}>{lever}</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={w}
                      onChange={e => setWeight(lever, Number(e.target.value))}
                      className="flex-1 accent-[#F97316]"
                    />
                    <span className="text-[11px] font-mono font-bold text-[#1A1A2E] w-7 text-right">{w}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground/70 mt-2">Levers left at 0 are excluded from the weighted score; weights are renormalised over the rest.</p>
          </div>

          <button
            onClick={() => { onApply(criteria); setApplied(true); }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#141414] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-black"
          >
            {applied ? <Check className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            {applied ? "Applied — run the assessment below" : "Apply these criteria to the assessment"}
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, values, empty }: { label: string; values: string[]; empty: string }) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">{label}</p>
      {values.length ? (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v, i) => (
            <span key={i} className="px-2 py-0.5 rounded-md bg-[#FFF7ED] border border-[#F97316]/20 text-[11px] font-medium text-[#9A3412]">{v}</span>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground italic">{empty}</p>
      )}
    </div>
  );
}
