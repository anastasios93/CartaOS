"use client";

/**
 * The export control shared by every pillar.
 *
 * Three decisions, all visible at once: how deep, what goes in the appendix,
 * and what format. That is the whole flow — pick, then download.
 *
 * Depth is the one that matters most. A full off-patent run is 103 slides and
 * 62 pages, which is right for the file and wrong for the meeting; summary-only
 * is 9 slides and 5 pages carrying the verdict, the actions and the headline
 * numbers. The two include-toggles only bite when there is an appendix to put
 * things in, so they disable with it rather than sitting there lying.
 */

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, FileDown, Loader2, Presentation } from "lucide-react";
import type { ExportOptions } from "@/lib/exports";

export type ExportFormat = "pdf" | "pptx";

const TINY = "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70";

export interface ExportMenuProps {
  /** Runs the chosen export. Rejects on failure; the menu reports it. */
  onExport: (format: ExportFormat, options: ExportOptions) => Promise<void>;
  /** Hide the per-market toggle where the deliverable has no market sections. */
  showMarkets?: boolean;
  label?: string;
  /** Extra buttons (a CSV download, say) rendered beside this control. */
  children?: React.ReactNode;
}

export function ExportMenu({
  onExport,
  showMarkets = true,
  label = "Export",
  children,
}: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const [includeAppendix, setIncludeAppendix] = useState(true);
  const [includeMarkets, setIncludeMarkets] = useState(true);
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);

  // Click-away and Escape. A popover that traps the user is worse than no
  // popover, and this one sits next to the primary content.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const run = async (format: ExportFormat) => {
    setBusy(format);
    try {
      await onExport(format, { includeAppendix, includeMarkets, includeEvidence });
      setOpen(false);
    } catch (err) {
      toast.error("The export could not be produced", {
        description: err instanceof Error ? err.message : "Something went wrong building the file.",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="relative inline-flex items-center gap-2" ref={rootRef}>
      {children}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#F97316] px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-[#EA580C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Export options"
          className="absolute right-0 top-full z-40 mt-2 w-[300px] rounded-xl border border-border bg-white p-4 shadow-xl"
        >
          <p className={`${TINY} mb-2`}>Depth</p>
          <div className="space-y-1.5 mb-4">
            {[
              {
                on: true,
                title: "Executive summary + appendix",
                hint: "The decision up front, every supporting detail behind it.",
              },
              {
                on: false,
                title: "Executive summary only",
                hint: "Just the verdict, the actions and the headline numbers.",
              },
            ].map((choice) => (
              <label key={String(choice.on)} className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="export-depth"
                  checked={includeAppendix === choice.on}
                  onChange={() => setIncludeAppendix(choice.on)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#F97316]"
                />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-[#1A1A2E]">{choice.title}</span>
                  <span className="block text-[11px] text-muted-foreground leading-relaxed">{choice.hint}</span>
                </span>
              </label>
            ))}
          </div>

          <p className={`${TINY} mb-2`}>Include in the appendix</p>
          <div className={`space-y-2 mb-4 ${includeAppendix ? "" : "opacity-50"}`}>
            {showMarkets && (
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMarkets}
                  disabled={!includeAppendix}
                  onChange={(e) => setIncludeMarkets(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#F97316]"
                />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-[#1A1A2E]">Per-market detail</span>
                  <span className="block text-[11px] text-muted-foreground leading-relaxed">
                    Score, verdict and the read for every market assessed.
                  </span>
                </span>
              </label>
            )}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeEvidence}
                disabled={!includeAppendix}
                onChange={(e) => setIncludeEvidence(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#F97316]"
              />
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-[#1A1A2E]">Evidence and sources</span>
                <span className="block text-[11px] text-muted-foreground leading-relaxed">
                  The appendix that makes the document defensible in a review.
                </span>
              </span>
            </label>
          </div>

          <p className={`${TINY} mb-2`}>Download as</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void run("pdf")}
              disabled={busy !== null}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-[12px] font-semibold text-[#1A1A2E] transition hover:border-[#F97316] hover:text-[#C2410C] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
            >
              {busy === "pdf" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              PDF
            </button>
            <button
              type="button"
              onClick={() => void run("pptx")}
              disabled={busy !== null}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-[12px] font-semibold text-[#1A1A2E] transition hover:border-[#F97316] hover:text-[#C2410C] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
            >
              {busy === "pptx" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Presentation className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              PowerPoint
            </button>
          </div>

          <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
            Figures are taken from this run as it stands now. Anything the engine could not compute is stated as such
            rather than estimated.
          </p>
        </div>
      )}
    </div>
  );
}
