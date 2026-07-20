"use client";

/**
 * Client-portfolio upload → computed synergies.
 *
 * The file is posted to /api/portfolio, parsed in-session, joined to open data
 * through the RxNorm backbone, and returned as deterministic synergies. Nothing
 * is persisted and nothing is sent to a third party — that promise is surfaced
 * to the user here, not just kept in the backend.
 */

import { useRef, useState } from "react";
import { Upload, Loader2, FileSpreadsheet, AlertTriangle, Link2, ShieldCheck } from "lucide-react";

interface Synergy {
  kind: string;
  molecule: string;
  headline: string;
  detail: string;
  matchedSources: string[];
  revenueAtRisk?: number;
  severity: "High" | "Medium" | "Low";
}

interface Match {
  molecule: string;
  rxcui: string | null;
  atc: string[];
  ndcsOnFile: number;
  ndcsWithPriceHistory: number;
  priceRegime?: string;
  modelSmape?: number;
}

interface UploadResult {
  filename: string;
  rowCount: number;
  moleculesAnalysed: number;
  moleculesResolved: number;
  geographies: string[];
  totalRevenue?: number;
  synergies: Synergy[];
  matches: Match[];
  mappings: { header: string; field: string; confidence: number }[];
  unmappedHeaders: string[];
  disclaimer: string;
}

const SEVERITY: Record<string, { bg: string; text: string }> = {
  High: { bg: "#9A341218", text: "#9A3412" },
  Medium: { bg: "#F9731618", text: "#C2410C" },
  Low: { bg: "#6B6B6B18", text: "#6B6B6B" },
};

export function PortfolioUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/portfolio", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Upload failed.");
        return;
      }
      setResult(json as UploadResult);
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
          <FileSpreadsheet className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-[#1A1A2E]">Upload your portfolio</h3>
          <p className="text-[13px] text-muted-foreground mt-0.5 leading-relaxed">
            Drop a CSV or TSV export of your products, sales or portfolio list. CartaOS resolves each
            molecule through RxNorm, joins it to live CMS acquisition-cost data, and computes synergies
            against your own book — deterministically, not by inference.
          </p>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-[#F97316] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#EA580C] disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {busy ? "Analysing…" : "Choose file"}
            </button>
            <span className="text-[11px] text-muted-foreground">CSV or TSV · up to 8 MB</span>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </div>

          <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground/80 mt-2.5 leading-relaxed">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-px text-[#C2410C]" />
            Processed in-session and not stored. Only molecule names and NDCs are used for public
            reference lookups — revenue and customer columns never leave the server.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#141414]/15 bg-[#F7F6F4] p-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-[#141414]" />
          <p className="text-[12px] text-[#1A1A2E] leading-relaxed">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-5 space-y-4 border-t border-border/30 pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Rows parsed" value={result.rowCount} />
            <Stat label="Molecules resolved" value={`${result.moleculesResolved}/${result.moleculesAnalysed}`} />
            <Stat label="Geographies" value={result.geographies.length || "—"} />
            <Stat
              label="Revenue on file"
              value={result.totalRevenue ? formatMoney(result.totalRevenue) : "—"}
            />
          </div>

          {result.matches.length > 0 && (
            <div className="rounded-xl border border-border/40 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border/30 flex items-center gap-2 bg-[#FAFAFA]">
                <Link2 className="h-3.5 w-3.5 text-[#C2410C]" />
                <h5 className="text-[13px] font-bold text-[#1A1A2E]">Identifier resolution</h5>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-muted-foreground/70">
                      <th className="px-4 py-2 font-semibold">Molecule</th>
                      <th className="px-4 py-2 font-semibold">RxCUI</th>
                      <th className="px-4 py-2 font-semibold">ATC</th>
                      <th className="px-4 py-2 font-semibold text-right">NDCs</th>
                      <th className="px-4 py-2 font-semibold text-right">Priced</th>
                      <th className="px-4 py-2 font-semibold">Price regime</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {result.matches.map((m, i) => (
                      <tr key={i} className={m.rxcui ? "" : "opacity-60"}>
                        <td className="px-4 py-2 font-medium text-[#1A1A2E]">{m.molecule}</td>
                        <td className="px-4 py-2 font-mono text-muted-foreground">{m.rxcui ?? "unresolved"}</td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {m.atc[0]?.split(" ")[0] ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">{m.ndcsOnFile}</td>
                        <td className="px-4 py-2 text-right font-mono">{m.ndcsWithPriceHistory}</td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {m.priceRegime ?? "—"}
                          {m.modelSmape !== undefined && (
                            <span className="text-muted-foreground/70"> · sMAPE {m.modelSmape}%</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.synergies.length > 0 && (
            <div className="space-y-2.5">
              <h5 className="text-[13px] font-bold text-[#1A1A2E]">Computed synergies</h5>
              {result.synergies.map((s, i) => {
                const c = SEVERITY[s.severity] ?? SEVERITY.Low;
                return (
                  <div key={i} className="rounded-xl border border-border/40 bg-white p-4">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <p className="text-[13px] font-bold text-[#1A1A2E] leading-snug">{s.headline}</p>
                      <span
                        className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ backgroundColor: c.bg, color: c.text }}
                      >
                        {s.severity}
                      </span>
                    </div>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">{s.detail}</p>
                    <div className="flex flex-wrap items-center gap-1 mt-2">
                      {s.matchedSources.map((src, j) => (
                        <span
                          key={j}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-[#F8F9FA] border border-border/40 text-muted-foreground"
                        >
                          {src}
                        </span>
                      ))}
                      {s.revenueAtRisk !== undefined && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FFF7ED] text-[#C2410C]">
                          {formatMoney(s.revenueAtRisk)} at stake
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {result.unmappedHeaders.length > 0 && (
            <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
              Columns not recognised and therefore ignored: {result.unmappedHeaders.join(", ")}.
            </p>
          )}

          <p className="text-[10px] text-muted-foreground/70 leading-relaxed border-t border-border/30 pt-3">
            {result.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xl font-bold font-mono tracking-tight text-[#1A1A2E]">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</p>
    </div>
  );
}

function formatMoney(v: number): string {
  if (!Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toFixed(0);
}
